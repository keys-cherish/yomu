use tauri::Manager;
use tauri::State;

use crate::db;

/// 预热缓存
#[tauri::command]
pub async fn warm_cache(
    app: tauri::AppHandle,
    state: State<'_, db::DbState>,
    book_hash: String,
    page_indices: Vec<usize>,
) -> Result<(), String> {
    let app_data = app.path().app_data_dir().map_err(|e| e.to_string())?;

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

    let _ = tokio::task::spawn_blocking(move || {
        let path = std::path::PathBuf::from(&book_path_owned);
        let ext = path.extension()
            .and_then(|e| e.to_str())
            .unwrap_or("")
            .to_lowercase();

        let epub_images: Option<Vec<String>> = if ext == "epub" {
            crate::protocol::ensure_spine_cached(&path, &book_hash_owned).ok()
        } else {
            None
        };

        let cbz_images: Option<Vec<String>> = if ext == "cbz" || ext == "zip" {
            crate::scanner::list_zip_images(&path).ok()
        } else {
            None
        };

        let mut epub_archive = if ext == "epub" {
            std::fs::File::open(&path)
                .ok()
                .and_then(|f| zip::ZipArchive::new(f).ok())
        } else {
            None
        };

        for page_index in page_indices {
            let already_cached = ["jpg", "png", "webp", "gif"].iter().any(|e| {
                let name = format!("page_{}.{}", page_index, e);
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
                let (final_bytes, final_ext) = {
                    let e = detect_ext(&raw_bytes);
                    (raw_bytes, e)
                };

                let cache_name = format!("page_{}.{}", page_index, final_ext);
                let _ = std::fs::write(cache_dir_owned.join(cache_name), &final_bytes);
            }
        }
    }).await;

    Ok(())
}

/// 清理缓存
#[tauri::command]
pub async fn cleanup_cache(
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

fn detect_ext(bytes: &[u8]) -> &'static str {
    if bytes.len() >= 2 && bytes[0] == 0xFF && bytes[1] == 0xD8 { return "jpg"; }
    if bytes.len() >= 4 && bytes[0] == 0x89 && &bytes[1..4] == b"PNG" { return "png"; }
    if bytes.len() >= 12 && &bytes[0..4] == b"RIFF" && &bytes[8..12] == b"WEBP" { return "webp"; }
    if bytes.len() >= 3 && &bytes[0..3] == b"GIF" { return "gif"; }
    "webp"
}

fn dir_size(path: &std::path::Path) -> u64 {
    walkdir::WalkDir::new(path)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file())
        .map(|e| e.metadata().map(|m| m.len()).unwrap_or(0))
        .sum()
}
