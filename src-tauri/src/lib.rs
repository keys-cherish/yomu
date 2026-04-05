//! 核心库模块，包含 Tauri 命令处理和程序生命周期管理

use tauri::Manager;

mod db;
mod protocol;
mod scanner;

/// 获取所有书籍
#[tauri::command]
async fn get_books(state: tauri::State<'_, db::DbState>) -> Result<Vec<db::Book>, String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;
    db::get_all_books(&db).map_err(|e| e.to_string())
}

/// 添加库目录
#[tauri::command]
async fn add_library(
    app: tauri::AppHandle,
    state: tauri::State<'_, db::DbState>,
    path: String,
) -> Result<db::Library, String> {
    // 先把书库路径登记到数据库中，拿到内部 library_id
    let library_id = {
        let db = state.0.lock().map_err(|e| e.to_string())?;
        db::add_library(&db, &path).map_err(|e| e.to_string())?
    };

    // 扫描目录下的漫画文件，并把结果写回数据库
    scan_library_inner(&app, &state, library_id, &path).await?;

    // 返回库信息
    let db = state.0.lock().map_err(|e| e.to_string())?;
    let libraries = db::get_all_libraries(&db).map_err(|e| e.to_string())?;
    libraries
        .into_iter()
        .find(|l| l.id == library_id)
        .ok_or_else(|| "Library not found after creation".to_string())
}

/// 获取所有库
#[tauri::command]
async fn get_libraries(state: tauri::State<'_, db::DbState>) -> Result<Vec<db::Library>, String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;
    db::get_all_libraries(&db).map_err(|e| e.to_string())
}

/// 根据哈希值获取书籍
#[tauri::command]
async fn get_book_by_hash(
    state: tauri::State<'_, db::DbState>,
    hash: String,
) -> Result<db::Book, String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;
    db::get_book_by_hash(&db, &hash).map_err(|e| e.to_string())
}

/// 保存阅读进度
#[tauri::command]
async fn save_reading_progress(
    state: tauri::State<'_, db::DbState>,
    hash: String,
    page_index: i64,
) -> Result<(), String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;
    db::save_progress(&db, &hash, page_index).map_err(|e| e.to_string())
}

/// 预热缓存
#[tauri::command]
async fn warm_cache(
    app: tauri::AppHandle,
    state: tauri::State<'_, db::DbState>,
    book_hash: String,
    page_indices: Vec<usize>,
    max_height: u32,
) -> Result<(), String> {
    let app_data = app.path().app_data_dir().map_err(|e| e.to_string())?;

    // 从数据库获取书籍路径，用于后续读取原始资源
    let book_path = {
        let db = state.0.lock().map_err(|e| e.to_string())?;
        db.query_row(
            "SELECT path FROM books WHERE hash = ?1 AND is_removed = 0",
            rusqlite::params![book_hash],
            |row| row.get::<_, String>(0),
        ).map_err(|e| e.to_string())?
    };

    let cache_dir = app_data.join("cache").join(&book_hash);
    let _ = std::fs::create_dir_all(&cache_dir);

    let book_path_owned = book_path.clone();
    let book_hash_owned = book_hash.clone();
    let cache_dir_owned = cache_dir.clone();

    // 在单个阻塞任务中完成所有预热缓存工作，避免在 async 线程池里做重 CPU/IO 操作
    let _ = tokio::task::spawn_blocking(move || {
        let path = std::path::PathBuf::from(&book_path_owned);
        let ext = path.extension()
            .and_then(|e| e.to_str())
            .unwrap_or("")
            .to_lowercase();

        // EPUB 先构建脊柱缓存，减少逐页解析 OPF/XHTML 的重复开销
        let epub_images: Option<Vec<String>> = if ext == "epub" {
            crate::protocol::ensure_spine_cached(&path, &book_hash_owned).ok()
        } else {
            None
        };

        // CBZ/ZIP 先拿到图像列表，避免每页都重新遍历压缩包目录
        let cbz_images: Option<Vec<String>> = if ext == "cbz" || ext == "zip" {
            crate::scanner::list_zip_images(&path).ok()
        } else {
            None
        };

        // 对于 EPUB，在多页之间保持压缩包开启，避免每页重复打开
        let mut epub_archive = if ext == "epub" {
            std::fs::File::open(&path)
                .ok()
                .and_then(|f| zip::ZipArchive::new(f).ok())
        } else {
            None
        };

        for page_index in page_indices {
            // 检查是否已存在任何格式的缓存
            let already_cached = ["jpg", "png", "webp", "gif"].iter().any(|e| {
                let name = if max_height > 0 {
                    format!("page_{}_{}p.{}", page_index, max_height, e)
                } else {
                    format!("page_{}.{}", page_index, e)
                };
                cache_dir_owned.join(name).exists()
            });
            if already_cached { continue; }

            let raw_bytes: Option<Vec<u8>> = match ext.as_str() {
                "cbz" | "zip" => {
                    cbz_images.as_ref().and_then(|images| {
                        let image_name = images.get(page_index)?;
                        crate::scanner::extract_file_from_zip(&path, image_name).ok()
                    })
                }
                "epub" => {
                    epub_images.as_ref().and_then(|images| {
                        let image_name = images.get(page_index)?;
                        if let Some(ref mut archive) = epub_archive {
                            let mut entry = archive.by_name(image_name).ok()?;
                            let mut buffer = Vec::with_capacity(entry.size() as usize);
                            std::io::Read::read_to_end(&mut entry, &mut buffer).ok()?;
                            Some(buffer)
                        } else {
                            None
                        }
                    })
                }
                _ => None,
            };

            if let Some(raw_bytes) = raw_bytes {
                // 检测格式并决定：直通或转码
                let (final_bytes, final_ext) = if max_height > 0 {
                    // 需要调整大小 → 必须解码并重新编码
                    if let Ok(img) = image::load_from_memory(&raw_bytes) {
                        if img.height() > max_height {
                            let resized = img.resize(u32::MAX, max_height, image::imageops::FilterType::Lanczos3);
                            let rgba = resized.to_rgba8();
                            let (w, h) = (rgba.width(), rgba.height());
                            let encoder = webp::Encoder::from_rgba(&rgba, w, h);
                            let webp_data = encoder.encode(85.0);
                            (webp_data.to_vec(), "webp")
                        } else {
                            // 满足最大高度要求时直接沿用原始格式，避免无意义转码
                            let e = detect_ext(&raw_bytes);
                            (raw_bytes, e)
                        }
                    } else {
                        continue;
                    }
                } else {
                    // 无需调整大小 → 直接直通
                    let e = detect_ext(&raw_bytes);
                    (raw_bytes, e)
                };

                let cache_name = if max_height > 0 {
                    format!("page_{}_{}p.{}", page_index, max_height, final_ext)
                } else {
                    format!("page_{}.{}", page_index, final_ext)
                };
                let _ = std::fs::write(cache_dir_owned.join(cache_name), &final_bytes);
            }
        }
    }).await;

    Ok(())
}

/// 清理缓存
#[tauri::command]
async fn cleanup_cache(
    app: tauri::AppHandle,
    max_bytes: u64,
) -> Result<u64, String> {
    let app_data = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let cache_dir = app_data.join("cache");

    if !cache_dir.exists() {
        return Ok(0);
    }

    let result = tokio::task::spawn_blocking(move || -> Result<u64, String> {
        let mut entries: Vec<(std::path::PathBuf, u64, std::time::SystemTime)> = Vec::new();

        let read_dir = std::fs::read_dir(&cache_dir).map_err(|e| e.to_string())?;
        for entry in read_dir.flatten() {
            let path = entry.path();
            if path.is_dir() {
                let size = dir_size(&path);
                let accessed = path.metadata()
                    .and_then(|m| m.accessed())
                    .unwrap_or(std::time::SystemTime::UNIX_EPOCH);
                entries.push((path, size, accessed));
            }
        }

        // 按最近访问时间排序，优先删除最久未使用的缓存目录
        entries.sort_by_key(|(_, _, time)| *time);

        let total: u64 = entries.iter().map(|(_, s, _)| s).sum();
        let mut current = total;
        let mut freed = 0u64;

        for (path, size, _) in &entries {
            if current <= max_bytes { break; }
            if std::fs::remove_dir_all(path).is_ok() {
                current -= size;
                freed += size;
            }
        }

        Ok(freed)
    }).await.map_err(|e| e.to_string())?;

    result
}

/// 检测文件扩展名
fn detect_ext(bytes: &[u8]) -> &'static str {
    if bytes.len() >= 2 && bytes[0] == 0xFF && bytes[1] == 0xD8 { return "jpg"; }
    if bytes.len() >= 4 && bytes[0] == 0x89 && &bytes[1..4] == b"PNG" { return "png"; }
    if bytes.len() >= 12 && &bytes[0..4] == b"RIFF" && &bytes[8..12] == b"WEBP" { return "webp"; }
    if bytes.len() >= 3 && &bytes[0..3] == b"GIF" { return "gif"; }
    "webp" // 默认回退
}

/// 获取目录大小
fn dir_size(path: &std::path::Path) -> u64 {
    walkdir::WalkDir::new(path)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
        .map(|e| e.metadata().map(|m| m.len()).unwrap_or(0))
        .sum()
}

/// 扫描库目录
#[tauri::command]
async fn scan_library(
    app: tauri::AppHandle,
    state: tauri::State<'_, db::DbState>,
    library_id: i64,
    path: String,
) -> Result<usize, String> {
    scan_library_inner(&app, &state, library_id, &path).await
}

/// add_library 和 scan_library 命令共用的内部扫描逻辑
async fn scan_library_inner(
    app: &tauri::AppHandle,
    state: &tauri::State<'_, db::DbState>,
    library_id: i64,
    path: &str,
) -> Result<usize, String> {
    let dir_path = std::path::PathBuf::from(path);
    let covers_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?
        .join("covers");

    // 在阻塞线程中扫描，避免目录遍历和封面生成阻塞 UI 命令线程
    let scan_path = dir_path.clone();
    let covers = covers_dir.clone();
    let results = tokio::task::spawn_blocking(move || {
        let files = scanner::scan_directory(&scan_path);
        log::info!("Found {} book files in {:?}", files.len(), scan_path);

        let mut processed = Vec::new();
        for file in &files {
            match scanner::process_book(file, &covers) {
                Ok(book) => processed.push(book),
                Err(e) => log::warn!("Failed to process {:?}: {}", file, e),
            }
        }
        processed
    })
    .await
    .map_err(|e| e.to_string())?;

    let count = results.len();

    // 将扫描结果批量写入数据库，并更新最后扫描时间
    {
        let db = state.0.lock().map_err(|e| e.to_string())?;
        for book in &results {
            let cover_rel = format!("{}.webp", book.hash);
            if let Err(e) = db::upsert_book(
                &db,
                library_id,
                &book.hash,
                &book.title,
                &book.path.to_string_lossy(),
                book.file_size,
                book.page_count,
                &cover_rel,
                book.format.as_str(),
            ) {
                log::warn!("Failed to insert book '{}': {}", book.title, e);
            }
        }
        let _ = db::update_library_scan_time(&db, library_id);
    }

    log::info!("Scan complete: {} books imported from {:?}", count, path);
    Ok(count)
}

/// 启动函数
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .register_uri_scheme_protocol("comic", protocol::handle_comic_protocol)
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            // 初始化数据库并注册为全局状态，供各个 Tauri command 共享连接
            let db_path = db::get_db_path(app.handle())?;
            let connection = db::init_db(&db_path)
                .map_err(|e| format!("DB init failed: {}", e))?;
            app.manage(db::DbState(std::sync::Mutex::new(connection)));

            log::info!("Yomu started, DB at {:?}", db_path);
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_books,
            get_book_by_hash,
            save_reading_progress,
            warm_cache,
            cleanup_cache,
            add_library,
            get_libraries,
            scan_library,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
