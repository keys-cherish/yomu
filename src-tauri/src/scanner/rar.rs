use std::path::Path;

use super::image::{is_image_filename, resize_to_webp};

/// 获取 RAR 内部的图像文件名列表，按自然排序
pub fn list_rar_images(path: &Path) -> Result<Vec<String>, Box<dyn std::error::Error>> {
    let archive = unrar::Archive::new(path)
        .open_for_listing()
        .map_err(|e| format!("Failed to open RAR for listing: {:?}", e))?;

    let mut images: Vec<String> = Vec::new();
    for entry_result in archive {
        let entry = entry_result.map_err(|e| format!("RAR list error: {:?}", e))?;
        let name = entry.filename.to_string_lossy().to_string();
        if entry.is_file()
            && !name.starts_with("__MACOSX")
            && !name.starts_with('.')
            && is_image_filename(&name)
        {
            images.push(name);
        }
    }

    images.sort_by(|a, b| natord::compare(a, b));
    Ok(images)
}

/// 从 RAR 存档中提取特定文件并返回字节流
pub fn extract_file_from_rar(rar_path: &Path, filename: &str) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    let mut archive_state = Some(
        unrar::Archive::new(rar_path)
            .open_for_processing()
            .map_err(|e| format!("Failed to open RAR for processing: {:?}", e))?
    );

    while let Some(archive) = archive_state.take() {
        let header_opt = archive.read_header()
            .map_err(|e| format!("RAR header error: {:?}", e))?;

        match header_opt {
            None => break,
            Some(header) => {
                let name = header.entry().filename.to_string_lossy().to_string();
                if name == filename {
                    let (data, _) = header.read().map_err(|e| format!("RAR read error: {:?}", e))?;
                    return Ok(data);
                }
                archive_state = Some(header.skip().map_err(|e| format!("RAR skip error: {:?}", e))?);
            }
        }
    }

    Err(format!("File '{}' not found in RAR archive", filename).into())
}

/// 从 CBR 提取封面：存档中的第一张图像
pub(crate) fn extract_cbr_cover(path: &Path, max_height: u32) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    let images = list_rar_images(path)?;
    let first_image = images.first()
        .ok_or("No images found in CBR/RAR archive")?;

    let raw_bytes = extract_file_from_rar(path, first_image)?;
    resize_to_webp(&raw_bytes, max_height)
}
