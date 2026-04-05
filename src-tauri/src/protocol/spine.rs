use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Mutex;

// ─── 全局脊柱（spine）缓存 ───
static SPINE_CACHE: std::sync::LazyLock<Mutex<HashMap<String, Vec<String>>>> =
    std::sync::LazyLock::new(|| Mutex::new(HashMap::new()));

/// 获取 EPUB 脊柱图像
pub(crate) fn get_epub_spine_image(path: &PathBuf, book_hash: &str, page_index: usize) -> Result<String, Box<dyn std::error::Error>> {
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
    let images = crate::scanner::list_epub_images_by_spine(&mut archive)?;

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
    let images = crate::scanner::list_epub_images_by_spine(&mut archive)?;

    {
        let mut cache = SPINE_CACHE.lock().map_err(|e| format!("Cache lock: {}", e))?;
        cache.insert(book_hash.to_string(), images.clone());
    }

    Ok(images)
}
