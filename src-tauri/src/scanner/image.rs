/// 判断是否为图像文件名
pub(crate) fn is_image_filename(name: &str) -> bool {
    let lower = name.to_lowercase();
    lower.ends_with(".jpg")
        || lower.ends_with(".jpeg")
        || lower.ends_with(".png")
        || lower.ends_with(".webp")
        || lower.ends_with(".gif")
        || lower.ends_with(".bmp")
}

/// 解码图像字节流 → 调整大小 → 编码为 WebP
pub(crate) fn resize_to_webp(raw_bytes: &[u8], max_height: u32) -> Result<Vec<u8>, Box<dyn std::error::Error>> {
    let img = image::load_from_memory(raw_bytes)
        .map_err(|e| format!("Failed to decode image: {}", e))?;

    let resized = if img.height() > max_height {
        img.resize(u32::MAX, max_height, image::imageops::FilterType::Lanczos3)
    } else {
        img
    };

    let rgba = resized.to_rgba8();
    let (w, h) = (rgba.width(), rgba.height());
    let encoder = webp::Encoder::from_rgba(&rgba, w, h);
    let webp_data = encoder.encode(80.0);
    Ok(webp_data.to_vec())
}
