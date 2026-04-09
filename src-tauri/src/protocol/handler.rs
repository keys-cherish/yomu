use tauri::http::{Request, Response};
use tauri::Manager;

use super::book::query_book_info;
use super::cache::read_cached_page;
use super::extract::extract_and_maybe_transcode;
use super::response::{build_image_response, error_response};

/// 处理对 comic:// 自定义协议的请求
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
        ["cover", book_hash] => {
            if !is_valid_hash(book_hash) { return error_response(400, "Invalid hash"); }
            handle_cover(app, book_hash)
        }
        ["page", book_hash, page_index_str] => {
            if !is_valid_hash(book_hash) { return error_response(400, "Invalid hash"); }
            match page_index_str.parse::<usize>() {
                Ok(page_index) => handle_page(app, book_hash, page_index),
                Err(_) => error_response(400, "Invalid page index"),
            }
        }
        _ => error_response(404, "Not Found"),
    }
}

/// 校验 book_hash 是否为合法的十六进制字符串（修 P2-6）
fn is_valid_hash(s: &str) -> bool {
    !s.is_empty() && s.len() <= 128 && s.chars().all(|c| c.is_ascii_hexdigit())
}

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

fn handle_page(app: &tauri::AppHandle, book_hash: &str, page_index: usize) -> Response<Vec<u8>> {
    let app_data = match app.path().app_data_dir() {
        Ok(dir) => dir,
        Err(_) => return error_response(500, "Cannot resolve app data dir"),
    };

    let cache_dir = app_data.join("cache").join(book_hash);

    if let Some((bytes, mime)) = read_cached_page(&cache_dir, page_index) {
        return build_image_response(bytes, &mime);
    }

    let book_info = match query_book_info(app, book_hash) {
        Some(info) => info,
        None => return error_response(404, "Book not found"),
    };

    let hash_owned = book_hash.to_string();
    // 直接在当前线程执行，用 catch_unwind 隔离 panic（替代之前每次 spawn+join 的开销）
    let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
        extract_and_maybe_transcode(&book_info, &hash_owned, page_index, &cache_dir)
    }));

    match result {
        Ok(Ok((bytes, mime))) => build_image_response(bytes, &mime),
        Ok(Err(e)) => {
            log::warn!("Failed to extract page {} from {}: {}", page_index, book_hash, e);
            error_response(500, "Failed to extract page")
        }
        Err(_) => error_response(500, "Extract panicked"),
    }
}
