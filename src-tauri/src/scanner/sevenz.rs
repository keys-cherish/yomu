use std::path::Path;
use std::sync::Mutex;

use super::image::{is_image_filename, resize_to_webp};

/// 获取 7z 内部的图像文件名列表，按自然排序
pub fn list_7z_images(path: &Path) -> Result<Vec<String>, Box<dyn std::error::Error>> {
    let file = std::fs::File::open(path)?;
    let len = file.metadata()?.len();
    let reader = std::io::BufReader::new(file);
    let mut archive = sevenz_rust::SevenZReader::new(reader, len, sevenz_rust::Password::empty())?;

    let mut images: Vec<String> = Vec::new();
    for entry in archive.archive().files.iter() {
        if entry.has_stream() {
            let name = entry.name().to_string();
            if !name.starts_with("__MACOSX")
                && !name.starts_with('.')
                && is_image_filename(&name)
            {
                images.push(name);
            }
        }
    }

    images.sort_by(|a, b| natord::compare(a, b));
    Ok(images)
}

/// 从 7z 存档中提取特定文件并返回字节流
pub fn extract_file_from_7z(archive_path: &Path, filename: &str) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    let file = std::fs::File::open(archive_path)?;
    let len = file.metadata()?.len();
    let reader = std::io::BufReader::new(file);
    let mut archive = sevenz_rust::SevenZReader::new(reader, len, sevenz_rust::Password::empty())?;

    let result: Mutex<Option<Vec<u8>>> = Mutex::new(None);
    let target = filename.to_string();

    archive.for_each_entries(|entry, reader| {
        if entry.name() == target {
            let mut buf = Vec::with_capacity(entry.size() as usize);
            reader.read_to_end(&mut buf)?;
            *result.lock().unwrap() = Some(buf);
        }
        Ok(true)
    })?;

    result.into_inner().unwrap()
        .ok_or_else(|| format!("File '{}' not found in 7z archive", filename).into())
}

/// 从 CB7 提取封面：存档中的第一张图像
pub(crate) fn extract_cb7_cover(path: &Path, max_height: u32) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    let images = list_7z_images(path)?;
    let first_image = images.first()
        .ok_or("No images found in CB7/7z archive")?;

    let raw_bytes = extract_file_from_7z(path, first_image)?;
    resize_to_webp(&raw_bytes, max_height)
}
