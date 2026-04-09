use std::path::PathBuf;

/// 扫描期间发现的书籍文件信息
#[derive(Debug)]
pub struct ScannedBook {
    pub path: PathBuf,
    pub title: String,
    pub file_size: i64,
    pub last_modified: Option<i64>,
    pub hash: String,
    pub page_count: i64,
    pub format: BookFormat,
    /// 系列名：若父文件夹有意义地"冠名"了这本书（文件名以父文件夹名为前缀），
    /// 则记录父文件夹名，用于前端折叠展示。
    /// 只有同一目录里至少有 2 本"冠名书"时才会被置为 Some，避免单本书被单独归为一个系列。
    pub series_name: Option<String>,
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
