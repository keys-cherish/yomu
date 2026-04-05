use std::path::PathBuf;

use crate::scanner;

use super::book::BookInfo;
use super::spine::get_epub_spine_image;

/// 从存档中提取原始字节。仅在需要调整大小或浏览器不支持该格式时进行转码。
pub(crate) fn extract_and_maybe_transcode(
    book_info: &BookInfo,
    book_hash: &str,
    page_index: usize,
    cache_dir: &PathBuf,
) -> Result<(Vec<u8>, String), Box<dyn std::error::Error + Send + Sync>> {
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

    let (final_bytes, final_mime) = if browser_native {
        (raw_bytes, source_mime)
    } else {
        let img = image::load_from_memory(&raw_bytes)
            .map_err(|e| -> Box<dyn std::error::Error + Send + Sync> { format!("{}", e).into() })?;
        encode_webp(&img, 85.0)?
    };

    let _ = std::fs::create_dir_all(cache_dir);
    let ext = mime_to_ext(&final_mime);
    let cache_name = format!("page_{}.{}", page_index, ext);
    let _ = std::fs::write(cache_dir.join(&cache_name), &final_bytes);

    Ok((final_bytes, final_mime))
}

fn extract_cbz_page(path: &PathBuf, page_index: usize) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    let images = scanner::list_zip_images(path)?;
    let image_name = images.get(page_index).ok_or("Page index out of range")?;
    scanner::extract_file_from_zip(path, image_name)
}

fn extract_epub_page(path: &PathBuf, book_hash: &str, page_index: usize) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    let image_name = get_epub_spine_image(path, book_hash, page_index)?;
    let file = std::fs::File::open(path)?;
    let mut archive = zip::ZipArchive::new(file)?;
    let mut entry = archive.by_name(&image_name)?;
    let mut buffer = Vec::with_capacity(entry.size() as usize);
    std::io::Read::read_to_end(&mut entry, &mut buffer)?;
    Ok(buffer)
}

fn extract_mobi_page(path: &PathBuf, page_index: usize) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    let book = mobi::Mobi::from_path(path)?;
    let images = book.image_records();
    let record = images.get(page_index).ok_or("Page index out of range")?;
    Ok(record.content.to_vec())
}

fn encode_webp(img: &image::DynamicImage, quality: f32) -> Result<(Vec<u8>, String), Box<dyn std::error::Error + Send + Sync>> {
    let rgba = img.to_rgba8();
    let (w, h) = (rgba.width(), rgba.height());
    let encoder = webp::Encoder::from_rgba(&rgba, w, h);
    let webp_data = encoder.encode(quality);
    Ok((webp_data.to_vec(), "image/webp".to_string()))
}

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

fn mime_to_ext(mime: &str) -> &str {
    match mime {
        "image/jpeg" => "jpg",
        "image/png" => "png",
        "image/webp" => "webp",
        "image/gif" => "gif",
        _ => "webp",
    }
}

pub(crate) fn ext_to_mime(ext: &str) -> String {
    match ext {
        "jpg" | "jpeg" => "image/jpeg",
        "png" => "image/png",
        "webp" => "image/webp",
        "gif" => "image/gif",
        _ => "application/octet-stream",
    }.to_string()
}
