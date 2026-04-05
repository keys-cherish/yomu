use std::path::PathBuf;

/// 扫描期间发现的书籍文件信息
#[derive(Debug)]
pub struct ScannedBook {
    pub path: PathBuf,
    pub title: String,
    pub file_size: i64,
    pub hash: String,
    pub page_count: i64,
    pub format: BookFormat,
}

/// 支持的书籍格式
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum BookFormat {
    Cbz,
    Epub,
    Mobi,
}

impl BookFormat {
    /// 转换为字符串
    pub fn as_str(&self) -> &'static str {
        match self {
            BookFormat::Cbz => "cbz",
            BookFormat::Epub => "epub",
            BookFormat::Mobi => "mobi",
        }
    }

    /// 从扩展名解析格式
    pub fn from_extension(ext: &str) -> Option<BookFormat> {
        match ext.to_lowercase().as_str() {
            "cbz" | "zip" => Some(BookFormat::Cbz),
            "epub" => Some(BookFormat::Epub),
            "mobi" => Some(BookFormat::Mobi),
            _ => None,
        }
    }
}
