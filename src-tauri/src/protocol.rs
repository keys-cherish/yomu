//! 协议模块，实现自定义的 comic:// 协议用于资源加载

use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::http::{Request, Response};
use tauri::Manager;

use crate::scanner;

// ─── 全局脊柱（spine）缓存 ───
static SPINE_CACHE: std::sync::LazyLock<Mutex<HashMap<String, Vec<String>>>> =
    std::sync::LazyLock::new(|| Mutex::new(HashMap::new()));

/// 处理对 comic:// 自定义协议的请求
///
/// 路由：
///   comic://localhost/cover/{book_hash}            → 封面缩略图 (WebP)
///   comic://localhost/page/{book_hash}/{page_idx} → 页面图像（原始格式）
/// 查询参数：
///   ?quality=low → 以较低高度生成缓存，供低配模式复用
pub fn handle_comic_protocol(
    ctx: tauri::UriSchemeContext<'_, tauri::Wry>,
    request: Request<Vec<u8>>,
) -> Response<Vec<u8>> {
    let app = ctx.app_handle();
    let url = request.uri();
    let path = url.path();

    let segments: Vec<&str> = path
        .trim_start_matches('/')
        .split('/')
        .filter(|s: &&str| !s.is_empty())
        .collect();

    match segments.as_slice() {
        ["cover", book_hash] => handle_cover(app, book_hash),
        ["page", book_hash, page_index_str] => {
            match page_index_str.parse::<usize>() {
                Ok(page_index) => {
                    let query = url.query().unwrap_or("");
                    let max_height = if query.contains("quality=low") { 1200u32 } else { 0u32 };
                    handle_page(app, book_hash, page_index, max_height)
                }
                Err(_) => error_response(400, "Invalid page index"),
            }
        }
        _ => error_response(404, "Not Found"),
    }
}

/// 处理封面请求
fn handle_cover(app: &tauri::AppHandle, book_hash: &str) -> Response<Vec<u8>> {
    let covers_dir = match app.path().app_data_dir() {
        Ok(dir) => dir.join("covers"),
        Err(_) => return error_response(500, "Cannot resolve app data dir"),
    };

    let cover_path = covers_dir.join(format!("{}.webp", book_hash));
    if !cover_path.exists() {
        return error_response(404, "Cover not found");
    }

    match std::fs::read(&cover_path) {
        Ok(bytes) => Response::builder()
            .status(200)
            .header("Content-Type", "image/webp")
            .header("Cache-Control", "private, max-age=86400")
            .header("Access-Control-Allow-Origin", "*")
            .body(bytes)
            .unwrap_or_else(|_| error_response(500, "Failed to build response")),
        Err(_) => error_response(500, "Failed to read cover file"),
    }
}

/// 书籍信息
struct BookInfo {
    path: PathBuf,
    format: String,
}

/// 处理页面请求
fn handle_page(app: &tauri::AppHandle, book_hash: &str, page_index: usize, max_height: u32) -> Response<Vec<u8>> {
    let app_data = match app.path().app_data_dir() {
        Ok(dir) => dir,
        Err(_) => return error_response(500, "Cannot resolve app data dir"),
    };

    let cache_dir = app_data.join("cache").join(book_hash);

    // 检查磁盘缓存 —— 尝试任何缓存格式
    if let Some((bytes, mime)) = read_cached_page(&cache_dir, page_index, max_height) {
        return build_image_response(bytes, &mime);
    }

    // 查询数据库
    let book_info = match query_book_info(app, book_hash) {
        Some(info) => info,
        None => return error_response(404, "Book not found"),
    };

    // 将提取工作卸载到工作线程
    let hash_owned = book_hash.to_string();
    let result = std::thread::spawn(move || {
        extract_and_maybe_transcode(&book_info, &hash_owned, page_index, max_height, &cache_dir)
    })
    .join();

    match result {
        Ok(Ok((bytes, mime))) => build_image_response(bytes, &mime),
        Ok(Err(e)) => {
            log::warn!("Failed to extract page {} from {}: {}", page_index, book_hash, e);
            error_response(500, "Failed to extract page")
        }
        Err(_) => error_response(500, "Thread panicked"),
    }
}

/// 从存档中提取原始字节。仅在需要调整大小或浏览器不支持该格式时进行转码。
///
/// 这样可以在常见格式（JPEG/PNG/WebP/GIF）下尽量保持零转码路径，
/// 只在低配模式缩放或遇到浏览器不支持的格式时再做编码开销。
fn extract_and_maybe_transcode(
    book_info: &BookInfo,
    book_hash: &str,
    page_index: usize,
    max_height: u32,
    cache_dir: &PathBuf,
) -> Result<(Vec<u8>, String), Box<dyn std::error::Error + Send + Sync>> {
    // 提取原始字节
    let raw_bytes = match book_info.format.as_str() {
        "cbz" => extract_cbz_page(&book_info.path, page_index),
        "epub" => extract_epub_page(&book_info.path, book_hash, page_index),
        "mobi" => extract_mobi_page(&book_info.path, page_index),
        _ => Err(format!("Unsupported format: {}", book_info.format).into()),
    }
    .map_err(|e| -> Box<dyn std::error::Error + Send + Sync> {
        format!("{}", e).into()
    })?;

    let source_mime = detect_mime(&raw_bytes);
    let browser_native = matches!(source_mime.as_str(), "image/jpeg" | "image/png" | "image/webp" | "image/gif");

    let (final_bytes, final_mime) = if max_height > 0 {
        // 请求调整大小 → 必须解码 + 重新编码
        let img = image::load_from_memory(&raw_bytes)
            .map_err(|e| -> Box<dyn std::error::Error + Send + Sync> { format!("{}", e).into() })?;
        if img.height() > max_height {
            let resized = img.resize(u32::MAX, max_height, image::imageops::FilterType::Lanczos3);
            // 如果可能则编码为原始格式，否则编码为 WebP
            let (bytes, mime) = if source_mime == "image/jpeg" {
                encode_jpeg(&resized, 85)?
            } else {
                encode_webp(&resized, 85.0)?
            };
            (bytes, mime)
        } else if browser_native {
            // 低于最大高度，无需调整大小，直通
            (raw_bytes, source_mime)
        } else {
            // 不支持的格式，转换
            let img = image::load_from_memory(&raw_bytes)
                .map_err(|e| -> Box<dyn std::error::Error + Send + Sync> { format!("{}", e).into() })?;
            encode_webp(&img, 85.0)?
        }
    } else if browser_native {
        // 无需调整大小，浏览器原生支持格式 → 直接直通（零转码！）
        (raw_bytes, source_mime)
    } else {
        // BMP 或其他不支持格式 → 转换为 WebP
        let img = image::load_from_memory(&raw_bytes)
            .map_err(|e| -> Box<dyn std::error::Error + Send + Sync> { format!("{}", e).into() })?;
        encode_webp(&img, 85.0)?
    };

    // 缓存到磁盘
    let _ = std::fs::create_dir_all(cache_dir);
    let ext = mime_to_ext(&final_mime);
    let cache_name = if max_height > 0 {
        format!("page_{}_{max_height}p.{ext}", page_index)
    } else {
        format!("page_{page_index}.{ext}")
    };
    let _ = std::fs::write(cache_dir.join(&cache_name), &final_bytes);

    Ok((final_bytes, final_mime))
}

// ─── 缓存读取 ───

/// 读取已缓存的页面
/// 会按常见扩展名顺序尝试命中缓存，兼容不同转码结果。
fn read_cached_page(cache_dir: &PathBuf, page_index: usize, max_height: u32) -> Option<(Vec<u8>, String)> {
    let suffixes = ["jpg", "jpeg", "png", "webp", "gif"];
    for ext in &suffixes {
        let name = if max_height > 0 {
            format!("page_{}_{max_height}p.{ext}", page_index)
        } else {
            format!("page_{page_index}.{ext}")
        };
        let path = cache_dir.join(&name);
        if path.exists() {
            if let Ok(bytes) = std::fs::read(&path) {
                let mime = ext_to_mime(ext);
                return Some((bytes, mime));
            }
        }
    }
    None
}

/// 查询书籍信息
fn query_book_info(app: &tauri::AppHandle, book_hash: &str) -> Option<BookInfo> {
    let db_state: Option<tauri::State<crate::db::DbState>> = app.try_state();
    let db_state = db_state?;

    let db = db_state.0.lock().ok()?;
    db.query_row(
        "SELECT path, format FROM books WHERE hash = ?1 AND is_removed = 0",
        rusqlite::params![book_hash],
        |row| {
            Ok(BookInfo {
                path: PathBuf::from(row.get::<_, String>(0)?),
                format: row.get(1)?,
            })
        },
    )
    .ok()
}

// ─── 格式提取 ───

/// 提取 CBZ 页面
fn extract_cbz_page(path: &PathBuf, page_index: usize) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    let images = scanner::list_zip_images(path)?;
    let image_name = images.get(page_index).ok_or("Page index out of range")?;
    scanner::extract_file_from_zip(path, image_name)
}

/// 提取 EPUB 页面
fn extract_epub_page(path: &PathBuf, book_hash: &str, page_index: usize) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    let image_name = get_epub_spine_image(path, book_hash, page_index)?;
    let file = std::fs::File::open(path)?;
    let mut archive = zip::ZipArchive::new(file)?;
    let mut entry = archive.by_name(&image_name)?;
    let mut buffer = Vec::with_capacity(entry.size() as usize);
    std::io::Read::read_to_end(&mut entry, &mut buffer)?;
    Ok(buffer)
}

/// 提取 MOBI 页面
fn extract_mobi_page(path: &PathBuf, page_index: usize) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    let book = mobi::Mobi::from_path(path)?;
    let images = book.image_records();
    let record = images.get(page_index).ok_or("Page index out of range")?;
    Ok(record.content.to_vec())
}

// ─── 脊柱缓存 ───

/// 获取 EPUB 脊柱图像
fn get_epub_spine_image(path: &PathBuf, book_hash: &str, page_index: usize) -> Result<String, Box<dyn std::error::Error>> {
    {
        let cache = SPINE_CACHE.lock().map_err(|e| format!("Cache lock: {}", e))?;
        if let Some(images) = cache.get(book_hash) {
            return images.get(page_index)
                .cloned()
                .ok_or_else(|| format!("Page {} out of range (total {})", page_index, images.len()).into());
        }
    }

    let file = std::fs::File::open(path)?;
    let mut archive = zip::ZipArchive::new(file)?;
    let images = scanner::list_epub_images_by_spine(&mut archive)?;

    let result = images.get(page_index)
        .cloned()
        .ok_or_else(|| format!("Page {} out of range (total {})", page_index, images.len()));

    {
        let mut cache = SPINE_CACHE.lock().map_err(|e| format!("Cache lock: {}", e))?;
        cache.insert(book_hash.to_string(), images);
    }

    result.map_err(|e| e.into())
}

/// 确保 EPUB 的脊柱已缓存
pub fn ensure_spine_cached(path: &PathBuf, book_hash: &str) -> Result<Vec<String>, Box<dyn std::error::Error>> {
    {
        let cache = SPINE_CACHE.lock().map_err(|e| format!("Cache lock: {}", e))?;
        if let Some(images) = cache.get(book_hash) {
            return Ok(images.clone());
        }
    }

    let file = std::fs::File::open(path)?;
    let mut archive = zip::ZipArchive::new(file)?;
    let images = scanner::list_epub_images_by_spine(&mut archive)?;

    {
        let mut cache = SPINE_CACHE.lock().map_err(|e| format!("Cache lock: {}", e))?;
        cache.insert(book_hash.to_string(), images.clone());
    }

    Ok(images)
}

// ─── 编码辅助函数 ───

/// 编码为 JPEG
fn encode_jpeg(img: &image::DynamicImage, quality: u8) -> Result<(Vec<u8>, String), Box<dyn std::error::Error + Send + Sync>> {
    let rgb = img.to_rgb8();
    let mut buf = Vec::new();
    let mut encoder = image::codecs::jpeg::JpegEncoder::new_with_quality(&mut buf, quality);
    encoder.encode_image(&rgb)
        .map_err(|e| -> Box<dyn std::error::Error + Send + Sync> { format!("{}", e).into() })?;
    Ok((buf, "image/jpeg".to_string()))
}

/// 编码为 WebP
fn encode_webp(img: &image::DynamicImage, quality: f32) -> Result<(Vec<u8>, String), Box<dyn std::error::Error + Send + Sync>> {
    let rgba = img.to_rgba8();
    let (w, h) = (rgba.width(), rgba.height());
    let encoder = webp::Encoder::from_rgba(&rgba, w, h);
    let webp_data = encoder.encode(quality);
    Ok((webp_data.to_vec(), "image/webp".to_string()))
}

// ─── 格式检测 ───

/// 检测 MIME 类型
fn detect_mime(bytes: &[u8]) -> String {
    if bytes.len() < 4 {
        return "application/octet-stream".to_string();
    }
    if bytes[0] == 0xFF && bytes[1] == 0xD8 {
        "image/jpeg".to_string()
    } else if bytes[0] == 0x89 && &bytes[1..4] == b"PNG" {
        "image/png".to_string()
    } else if &bytes[0..4] == b"RIFF" && bytes.len() >= 12 && &bytes[8..12] == b"WEBP" {
        "image/webp".to_string()
    } else if &bytes[0..3] == b"GIF" {
        "image/gif".to_string()
    } else if &bytes[0..2] == b"BM" {
        "image/bmp".to_string()
    } else {
        "application/octet-stream".to_string()
    }
}

/// MIME 转扩展名
fn mime_to_ext(mime: &str) -> &str {
    match mime {
        "image/jpeg" => "jpg",
        "image/png" => "png",
        "image/webp" => "webp",
        "image/gif" => "gif",
        _ => "webp",
    }
}

/// 扩展名转 MIME
fn ext_to_mime(ext: &str) -> String {
    match ext {
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "webp" => "image/webp",
        "gif" => "image/gif",
        _ => "application/octet-stream",
    }.to_string()
}

// ─── 响应构建器 ───

/// 构建图像响应
fn build_image_response(bytes: Vec<u8>, mime: &str) -> Response<Vec<u8>> {
    Response::builder()
        .status(200)
        .header("Content-Type", mime)
        .header("Cache-Control", "private, max-age=31536000, immutable")
        .header("Access-Control-Allow-Origin", "*")
        .body(bytes)
        .unwrap_or_else(|_| error_response(500, "Response build failed"))
}

/// 构建错误响应
fn error_response(status: u16, msg: &str) -> Response<Vec<u8>> {
    Response::builder()
        .status(status)
        .header("Content-Type", "text/plain")
        .header("Access-Control-Allow-Origin", "*")
        .body(msg.as_bytes().to_vec())
        .unwrap()
}
