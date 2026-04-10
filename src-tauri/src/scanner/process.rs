use std::path::Path;

use super::discovery::detect_format;
use super::epub::count_epub_pages;
use super::hash::compute_file_hash;
use super::mobi::count_mobi_images;
use super::rar::list_rar_images;
use super::sevenz::list_7z_images;
use super::types::{BookFormat, ScannedBook};
use super::zip::list_zip_images;

/// 从任何支持的格式中提取封面缩略图
pub fn extract_cover(path: &Path, max_height: u32) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    let format = detect_format(path)
        .ok_or("Unsupported file format")?;

    match format {
        BookFormat::Cbz => super::zip::extract_cbz_cover(path, max_height),
        BookFormat::Cbr => super::rar::extract_cbr_cover(path, max_height),
        BookFormat::Cb7 => super::sevenz::extract_cb7_cover(path, max_height),
        BookFormat::Epub => super::epub::extract_epub_cover(path, max_height),
        BookFormat::Mobi => super::mobi::extract_mobi_cover(path, max_height),
    }
}

/// 处理单本书籍文件：哈希、统计页数、提取封面
/// 返回的结果会被上层扫描流程写入数据库，并用于生成书架缩略图。
/// 注意：`series_name` 字段此时为 None，会在批处理阶段根据兄弟文件情况统一回填。
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

    let metadata = std::fs::metadata(path)?;
    let file_size = metadata.len() as i64;
    let last_modified = metadata
        .modified()
        .ok()
        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
        .map(|d| d.as_secs() as i64);
    let hash = compute_file_hash(path)?;

    let page_count = match format {
        BookFormat::Cbz => list_zip_images(path)?.len() as i64,
        BookFormat::Cbr => list_rar_images(path)?.len() as i64,
        BookFormat::Cb7 => list_7z_images(path)?.len() as i64,
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
        last_modified,
        hash,
        page_count,
        format,
        series_name: None,
    })
}

/// 批量回填系列名。
///
/// 规则：
/// 1. 按父目录分组。
/// 2. 对每个父目录里的书籍，把其中文件名（stem）以目录名（大小写无关）开头的记为"冠名书"。
/// 3. 当某目录下"冠名书"不少于 2 本时，把这些书的 `series_name` 设为该父目录名。
/// 4. 单本书或冠名书不足 2 本的目录不做折叠——避免把普通独立书籍误分类成系列。
pub fn assign_series_names(books: &mut [ScannedBook]) {
    use std::collections::HashMap;

    // 先按父目录路径分组，保留每本书在原数组里的下标
    let mut groups: HashMap<String, Vec<usize>> = HashMap::new();
    for (idx, book) in books.iter().enumerate() {
        if let Some(parent) = book.path.parent() {
            let parent_str = parent.to_string_lossy().to_string();
            groups.entry(parent_str).or_default().push(idx);
        }
    }

    for (parent_path, indices) in groups {
        // 取父目录名作为候选系列名
        let parent_name = match std::path::Path::new(&parent_path)
            .file_name()
            .and_then(|n| n.to_str())
        {
            Some(name) if !name.is_empty() => name.to_string(),
            _ => continue,
        };
        let parent_lower = parent_name.to_lowercase();

        // 找到这组里所有文件名以父目录名开头的书（冠名书）
        let named_members: Vec<usize> = indices
            .into_iter()
            .filter(|&i| {
                let stem_lower = books[i]
                    .path
                    .file_stem()
                    .and_then(|s| s.to_str())
                    .map(|s| s.to_lowercase())
                    .unwrap_or_default();
                stem_lower.starts_with(&parent_lower)
            })
            .collect();

        // 少于 2 本不折叠
        if named_members.len() < 2 {
            continue;
        }

        for i in named_members {
            books[i].series_name = Some(parent_name.clone());
        }
    }
}
