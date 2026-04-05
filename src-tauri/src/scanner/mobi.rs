use std::path::Path;

use super::image::resize_to_webp;

/// 从 MOBI 文件中提取封面图像
pub(crate) fn extract_mobi_cover(path: &Path, max_height: u32) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    let book = mobi::Mobi::from_path(path)?;
    let images = book.image_records();

    let cover_record = images
        .first()
        .ok_or("No images found in MOBI file")?;

    resize_to_webp(cover_record.content, max_height)
}

/// 统计 MOBI 文件中的图像记录数（近似“页数”）
pub(crate) fn count_mobi_images(path: &Path) -> Result<i64, Box<dyn std::error::Error>> {
    let book = mobi::Mobi::from_path(path)?;
    let count = book.image_records().len();
    Ok(count.max(1) as i64)
}
