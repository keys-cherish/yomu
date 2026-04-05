use std::path::PathBuf;

use tauri::Manager;

/// 书籍信息
pub(crate) struct BookInfo {
    pub path: PathBuf,
    pub format: String,
}

/// 查询书籍信息
pub(crate) fn query_book_info(app: &tauri::AppHandle, book_hash: &str) -> Option<BookInfo> {
    let db_state: Option<tauri::State<crate::db::DbState>> = app.try_state();
    let db_state = db_state?;

    let db = db_state.0.lock().ok()?;
    db.query_row(
        "SELECT path, format FROM books WHERE hash = ?1 AND is_removed = 0",
        rusqlite::params![book_hash],
        |row| {
            Ok(BookInfo {
                path: PathBuf::from(row.get::<_, String>(0)?),
                format: row.get(1)?,
            })
        },
    )
    .ok()
}
