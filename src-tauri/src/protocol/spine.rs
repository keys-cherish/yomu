use std::collections::VecDeque;
use std::path::PathBuf;
use std::sync::Mutex;

/// 缓存上限：最多保留最近 32 本 EPUB 的 spine 数据
const MAX_SPINE_CACHE_ENTRIES: usize = 32;

/// 简单的 LRU spine 缓存（修 P1-3：旧版无上限，连续打开 EPUB 会累积内存）
struct SpineCache {
    /// 按插入/访问顺序排列，最近使用的在尾部
    order: VecDeque<String>,
    data: std::collections::HashMap<String, Vec<String>>,
}

impl SpineCache {
    fn new() -> Self {
        Self {
            order: VecDeque::new(),
            data: std::collections::HashMap::new(),
        }
    }

    fn get(&mut self, key: &str) -> Option<&Vec<String>> {
        if self.data.contains_key(key) {
            // 移到尾部（最近使用）
            self.order.retain(|k| k != key);
            self.order.push_back(key.to_string());
            self.data.get(key)
        } else {
            None
        }
    }

    fn insert(&mut self, key: String, value: Vec<String>) {
        if self.data.contains_key(&key) {
            self.order.retain(|k| k != &key);
        } else if self.order.len() >= MAX_SPINE_CACHE_ENTRIES {
            // 淘汰最久未使用的
            if let Some(oldest) = self.order.pop_front() {
                self.data.remove(&oldest);
            }
        }
        self.order.push_back(key.clone());
        self.data.insert(key, value);
    }
}

static SPINE_CACHE: std::sync::LazyLock<Mutex<SpineCache>> =
    std::sync::LazyLock::new(|| Mutex::new(SpineCache::new()));

/// 获取 EPUB 脊柱图像
pub(crate) fn get_epub_spine_image(path: &PathBuf, book_hash: &str, page_index: usize) -> Result<String, Box<dyn std::error::Error>> {
    {
        let mut cache = SPINE_CACHE.lock().map_err(|e| format!("Cache lock: {}", e))?;
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
        let mut cache = SPINE_CACHE.lock().map_err(|e| format!("Cache lock: {}", e))?;
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
