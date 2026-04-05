use std::fs::File;
use std::io::Read;
use std::path::Path;

use super::image::{is_image_filename, resize_to_webp};

/// 获取 ZIP 内部的图像文件名列表，按自然排序
pub fn list_zip_images(path: &Path) -> Result<Vec<String>, Box<dyn std::error::Error>> {
    let file = File::open(path)?;
    let mut archive = zip::ZipArchive::new(file)?;

    let mut images: Vec<String> = Vec::new();
    for i in 0..archive.len() {
        let entry = archive.by_index(i)?;
        let name = entry.name().to_string();

        if entry.is_dir() || name.starts_with("__MACOSX") || name.starts_with('.') {
            continue;
        }

        if is_image_filename(&name) {
            images.push(name);
        }
    }

    images.sort_by(|a, b| natord::compare(a, b));
    Ok(images)
}

/// 从 ZIP 存档中提取特定文件并返回字节流
pub fn extract_file_from_zip(zip_path: &Path, filename: &str) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    let file = File::open(zip_path)?;
    let mut archive = zip::ZipArchive::new(file)?;
    let mut entry = archive.by_name(filename)?;

    let mut buffer = Vec::with_capacity(entry.size() as usize);
    entry.read_to_end(&mut buffer)?;
    Ok(buffer)
}

/// 从 CBZ 提取封面：存档中的第一张图像
pub(crate) fn extract_cbz_cover(path: &Path, max_height: u32) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    let images = list_zip_images(path)?;
    let first_image = images.first()
        .ok_or("No images found in CBZ archive")?;

    let raw_bytes = extract_file_from_zip(path, first_image)?;
    resize_to_webp(&raw_bytes, max_height)
}
