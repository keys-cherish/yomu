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
    pub series_name: Option<String>,
}

/// 支持的书籍格式
#[derive(Debug, Clone, Copy, PartialEq)]
pub enum BookFormat {
    Cbz,   // ZIP-based (.cbz, .zip)
    Cbr,   // RAR-based (.cbr, .rar)
    Cb7,   // 7z-based (.cb7, .7z)
    Epub,
    Mobi,
}

impl BookFormat {
    pub fn as_str(&self) -> &'static str {
        match self {
            BookFormat::Cbz => "cbz",
            BookFormat::Cbr => "cbr",
            BookFormat::Cb7 => "cb7",
            BookFormat::Epub => "epub",
            BookFormat::Mobi => "mobi",
        }
    }

    pub fn from_extension(ext: &str) -> Option<BookFormat> {
        match ext.to_lowercase().as_str() {
            "cbz" | "zip" => Some(BookFormat::Cbz),
            "cbr" | "rar" => Some(BookFormat::Cbr),
            "cb7" | "7z" => Some(BookFormat::Cb7),
            "epub" => Some(BookFormat::Epub),
            "mobi" => Some(BookFormat::Mobi),
            _ => None,
        }
    }
}
