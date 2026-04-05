use serde::Serialize;

/// 书籍模型
#[derive(Debug, Serialize, Clone)]
pub struct Book {
    pub id: i64,
    pub library_id: Option<i64>,
    pub hash: String,
    pub title: String,
    pub path: String,
    pub file_size: Option<i64>,
    pub page_count: Option<i64>,
    pub cover_path: Option<String>,
    pub format: String,
    pub read_progress: i64,
    pub is_favorite: bool,
    pub added_at: i64,
}

/// 库模型
#[derive(Debug, Serialize, Clone)]
pub struct Library {
    pub id: i64,
    pub path: String,
    pub name: Option<String>,
    pub created_at: i64,
    pub last_scan: Option<i64>,
}
