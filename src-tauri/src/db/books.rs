use rusqlite::Connection;

use super::models::Book;

/// 获取所有未被标记为删除的书籍
pub fn get_all_books(db: &Connection) -> Result<Vec<Book>, Box<dyn std::error::Error>> {
    let mut stmt = db.prepare(
        "SELECT id, library_id, hash, title, path, file_size, page_count, cover_path, format, read_progress, is_favorite, added_at, series_name
         FROM books WHERE is_removed = 0 ORDER BY title ASC"
    )?;

    let books = stmt.query_map([], |row| {
        Ok(Book {
            id: row.get(0)?,
            library_id: row.get(1)?,
            hash: row.get(2)?,
            title: row.get(3)?,
            path: row.get(4)?,
            file_size: row.get(5)?,
            page_count: row.get(6)?,
            cover_path: row.get(7)?,
            format: row.get(8)?,
            read_progress: row.get(9)?,
            is_favorite: row.get::<_, i64>(10)? != 0,
            added_at: row.get(11)?,
            series_name: row.get(12)?,
        })
    })?.collect::<Result<Vec<_>, _>>()?;

    Ok(books)
}

/// 插入或更新书籍记录。返回书籍 ID。
#[allow(clippy::too_many_arguments)]
pub fn upsert_book(
    db: &Connection,
    library_id: i64,
    hash: &str,
    title: &str,
    path: &str,
    file_size: i64,
    last_modified: Option<i64>,
    page_count: i64,
    cover_path: &str,
    format: &str,
    series_name: Option<&str>,
) -> Result<i64, Box<dyn std::error::Error>> {
    db.execute(
        "INSERT INTO books (library_id, hash, title, path, file_size, last_modified, page_count, cover_path, format, series_name)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)
         ON CONFLICT(hash) DO UPDATE SET
            library_id = excluded.library_id,
            title = excluded.title,
            path = excluded.path,
            file_size = excluded.file_size,
            last_modified = excluded.last_modified,
            page_count = excluded.page_count,
            cover_path = excluded.cover_path,
            format = excluded.format,
            series_name = excluded.series_name,
            is_removed = 0,
            updated_at = unixepoch()",
        rusqlite::params![library_id, hash, title, path, file_size, last_modified, page_count, cover_path, format, series_name],
    )?;

    let id: i64 = db.query_row(
        "SELECT id FROM books WHERE hash = ?1",
        rusqlite::params![hash],
        |row| row.get(0),
    )?;

    Ok(id)
}

/// 根据哈希值获取单本书籍
pub fn get_book_by_hash(db: &Connection, hash: &str) -> Result<Book, Box<dyn std::error::Error>> {
    let book = db.query_row(
        "SELECT id, library_id, hash, title, path, file_size, page_count, cover_path, format, read_progress, is_favorite, added_at, series_name
         FROM books WHERE hash = ?1 AND is_removed = 0",
        rusqlite::params![hash],
        |row| {
            Ok(Book {
                id: row.get(0)?,
                library_id: row.get(1)?,
                hash: row.get(2)?,
                title: row.get(3)?,
                path: row.get(4)?,
                file_size: row.get(5)?,
                page_count: row.get(6)?,
                cover_path: row.get(7)?,
                format: row.get(8)?,
                read_progress: row.get(9)?,
                is_favorite: row.get::<_, i64>(10)? != 0,
                added_at: row.get(11)?,
                series_name: row.get(12)?,
            })
        },
    )?;
    Ok(book)
}

/// 保存书籍的阅读进度
/// 同时刷新 `updated_at`，便于后续按最近活动排序或同步状态。
/// 返回受影响行数；调用方可据此判断书是否还在库中。
pub fn save_progress(db: &Connection, hash: &str, page_index: i64) -> Result<usize, Box<dyn std::error::Error>> {
    let affected = db.execute(
        "UPDATE books SET read_progress = ?1, updated_at = unixepoch() WHERE hash = ?2 AND is_removed = 0",
        rusqlite::params![page_index, hash],
    )?;
    Ok(affected)
}
