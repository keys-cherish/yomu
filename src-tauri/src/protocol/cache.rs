use std::path::PathBuf;

/// 读取已缓存的页面
/// 会按常见扩展名顺序尝试命中缓存，兼容不同转码结果。
pub(crate) fn read_cached_page(cache_dir: &PathBuf, page_index: usize) -> Option<(Vec<u8>, String)> {
    let suffixes = ["jpg", "jpeg", "png", "webp", "gif"];
    for ext in &suffixes {
        let name = format!("page_{}.{}", page_index, ext);
        let path = cache_dir.join(&name);
        if path.exists() {
            if let Ok(bytes) = std::fs::read(&path) {
                let mime = super::extract::ext_to_mime(ext);
                return Some((bytes, mime));
            }
        }
    }
    None
}
