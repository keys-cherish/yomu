use std::path::{Path, PathBuf};

use walkdir::WalkDir;

use super::types::BookFormat;

/// 检测文件格式
pub(crate) fn detect_format(path: &Path) -> Option<BookFormat> {
    path.extension()
        .and_then(|ext| ext.to_str())
        .and_then(BookFormat::from_extension)
}

/// 递归扫描目录以查找支持的书籍文件
pub fn scan_directory(dir: &Path) -> Vec<PathBuf> {
    WalkDir::new(dir)
        .follow_links(true)
        .into_iter()
        .filter_map(|e| e.ok())
        .filter(|e| e.file_type().is_file() && detect_format(e.path()).is_some())
        .map(|e| e.into_path())
        .collect()
}
