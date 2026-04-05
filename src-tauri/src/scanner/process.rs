use std::path::Path;

use super::discovery::detect_format;
use super::epub::count_epub_pages;
use super::hash::compute_file_hash;
use super::mobi::count_mobi_images;
use super::types::{BookFormat, ScannedBook};
use super::zip::list_zip_images;

/// 从任何支持的格式中提取封面缩略图
pub fn extract_cover(path: &Path, max_height: u32) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    let format = detect_format(path)
        .ok_or("Unsupported file format")?;

    match format {
        BookFormat::Cbz => super::zip::extract_cbz_cover(path, max_height),
        BookFormat::Epub => super::epub::extract_epub_cover(path, max_height),
        BookFormat::Mobi => super::mobi::extract_mobi_cover(path, max_height),
    }
}

/// 处理单本书籍文件：哈希、统计页数、提取封面
/// 返回的结果会被上层扫描流程写入数据库，并用于生成书架缩略图。
pub fn process_book(
    path: &Path,
    covers_dir: &Path,
) -> Result<ScannedBook, Box<dyn std::error::Error>> {
    let format = detect_format(path)
        .ok_or("Unsupported file format")?;

    let title = path
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or("Unknown")
        .to_string();

    let file_size = std::fs::metadata(path)?.len() as i64;
    let hash = compute_file_hash(path)?;

    let page_count = match format {
        BookFormat::Cbz => list_zip_images(path)?.len() as i64,
        BookFormat::Epub => count_epub_pages(path).unwrap_or(1),
        BookFormat::Mobi => count_mobi_images(path).unwrap_or(1),
    };

    let cover_filename = format!("{}.webp", hash);
    let cover_path = covers_dir.join(&cover_filename);

    if !cover_path.exists() {
        match extract_cover(path, 600) {
            Ok(webp_bytes) => {
                std::fs::create_dir_all(covers_dir)?;
                std::fs::write(&cover_path, webp_bytes)?;
                log::info!("Cover extracted: {} ({}) → {:?}", title, format.as_str(), cover_path);
            }
            Err(e) => {
                log::warn!("Failed to extract cover for '{}' ({}): {}", title, format.as_str(), e);
            }
        }
    }

    Ok(ScannedBook {
        path: path.to_path_buf(),
        title,
        file_size,
        hash,
        page_count,
        format,
    })
}
