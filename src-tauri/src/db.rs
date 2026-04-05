//! 数据库模块，处理 SQLite 连接、模式初始化及 CRUD 操作

use rusqlite::Connection;
use serde::Serialize;
use std::path::PathBuf;
use std::sync::Mutex;
use tauri::Manager;

/// 由 Tauri 管理的数据库状态
pub struct DbState(pub Mutex<Connection>);

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

/// 获取数据库文件路径
pub fn get_db_path(app: &tauri::AppHandle) -> Result<PathBuf, Box<dyn std::error::Error>> {
    let app_data = app.path().app_data_dir()?;
    std::fs::create_dir_all(&app_data)?;
    Ok(app_data.join("library.db"))
}

/// 创建并初始化数据库连接
pub fn init_db(db_path: &PathBuf) -> Result<Connection, Box<dyn std::error::Error>> {
    let db = Connection::open(db_path)?;

    // 启用 WAL 模式以提高并发读取性能
    db.execute_batch("PRAGMA journal_mode=WAL;")?;

    db.execute_batch("
        CREATE TABLE IF NOT EXISTS libraries (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            path        TEXT NOT NULL UNIQUE,
            name        TEXT,
            created_at  INTEGER NOT NULL DEFAULT (unixepoch()),
            last_scan   INTEGER
        );

        CREATE TABLE IF NOT EXISTS books (
            id            INTEGER PRIMARY KEY AUTOINCREMENT,
            library_id    INTEGER REFERENCES libraries(id),
            hash          TEXT NOT NULL UNIQUE,
            title         TEXT NOT NULL,
            path          TEXT NOT NULL,
            file_size     INTEGER,
            last_modified INTEGER,
            page_count    INTEGER,
            cover_path    TEXT,
            format        TEXT NOT NULL DEFAULT 'cbz',
            read_progress INTEGER DEFAULT 0,
            is_favorite   INTEGER DEFAULT 0,
            is_removed    INTEGER DEFAULT 0,
            added_at      INTEGER NOT NULL DEFAULT (unixepoch()),
            updated_at    INTEGER NOT NULL DEFAULT (unixepoch())
        );

        CREATE TABLE IF NOT EXISTS tags (
            id   INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL UNIQUE
        );

        CREATE TABLE IF NOT EXISTS book_tags (
            book_id INTEGER REFERENCES books(id) ON DELETE CASCADE,
            tag_id  INTEGER REFERENCES tags(id) ON DELETE CASCADE,
            PRIMARY KEY (book_id, tag_id)
        );

        CREATE TABLE IF NOT EXISTS reading_sessions (
            id         INTEGER PRIMARY KEY AUTOINCREMENT,
            book_id    INTEGER REFERENCES books(id) ON DELETE CASCADE,
            started_at INTEGER NOT NULL,
            ended_at   INTEGER,
            start_page INTEGER,
            end_page   INTEGER
        );

        CREATE INDEX IF NOT EXISTS idx_books_hash ON books(hash);
        CREATE INDEX IF NOT EXISTS idx_books_title ON books(title);
        CREATE INDEX IF NOT EXISTS idx_books_library ON books(library_id);
        CREATE INDEX IF NOT EXISTS idx_reading_sessions_book ON reading_sessions(book_id);
    ")?;

    // 迁移：如果不存在则添加 format 列（针对 v0.2 之前创建的数据库）
    let has_format: bool = db
        .prepare("SELECT COUNT(*) FROM pragma_table_info('books') WHERE name = 'format'")?
        .query_row([], |row| row.get::<_, i64>(0))
        .map(|c| c > 0)
        .unwrap_or(false);

    if !has_format {
        db.execute_batch("ALTER TABLE books ADD COLUMN format TEXT NOT NULL DEFAULT 'cbz';")?;
        log::info!("Migration: added 'format' column to books table");
    }

    log::info!("Database initialized at {:?}", db_path);
    Ok(db)
}

/// 获取所有未被标记为删除的书籍
pub fn get_all_books(db: &Connection) -> Result<Vec<Book>, Box<dyn std::error::Error>> {
    let mut stmt = db.prepare(
        "SELECT id, library_id, hash, title, path, file_size, page_count, cover_path, format, read_progress, is_favorite, added_at
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
        })
    })?.collect::<Result<Vec<_>, _>>()?;

    Ok(books)
}

/// 添加一个新的库目录
pub fn add_library(db: &Connection, path: &str) -> Result<i64, Box<dyn std::error::Error>> {
    let name = std::path::Path::new(path)
        .file_name()
        .and_then(|n| n.to_str())
        .map(|s| s.to_string());

    db.execute(
        "INSERT OR IGNORE INTO libraries (path, name) VALUES (?1, ?2)",
        rusqlite::params![path, name],
    )?;

    // 无论刚插入还是已存在，都返回 ID
    let id: i64 = db.query_row(
        "SELECT id FROM libraries WHERE path = ?1",
        rusqlite::params![path],
        |row| row.get(0),
    )?;

    Ok(id)
}

/// 获取所有已注册的库
pub fn get_all_libraries(db: &Connection) -> Result<Vec<Library>, Box<dyn std::error::Error>> {
    let mut stmt = db.prepare(
        "SELECT id, path, name, created_at, last_scan FROM libraries ORDER BY created_at DESC"
    )?;

    let libraries = stmt.query_map([], |row| {
        Ok(Library {
            id: row.get(0)?,
            path: row.get(1)?,
            name: row.get(2)?,
            created_at: row.get(3)?,
            last_scan: row.get(4)?,
        })
    })?.collect::<Result<Vec<_>, _>>()?;

    Ok(libraries)
}

/// 插入或更新书籍记录。返回书籍 ID。
pub fn upsert_book(
    db: &Connection,
    library_id: i64,
    hash: &str,
    title: &str,
    path: &str,
    file_size: i64,
    page_count: i64,
    cover_path: &str,
    format: &str,
) -> Result<i64, Box<dyn std::error::Error>> {
    db.execute(
        "INSERT INTO books (library_id, hash, title, path, file_size, page_count, cover_path, format)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)
         ON CONFLICT(hash) DO UPDATE SET
            library_id = excluded.library_id,
            title = excluded.title,
            path = excluded.path,
            file_size = excluded.file_size,
            page_count = excluded.page_count,
            cover_path = excluded.cover_path,
            format = excluded.format,
            is_removed = 0,
            updated_at = unixepoch()",
        rusqlite::params![library_id, hash, title, path, file_size, page_count, cover_path, format],
    )?;

    let id: i64 = db.query_row(
        "SELECT id FROM books WHERE hash = ?1",
        rusqlite::params![hash],
        |row| row.get(0),
    )?;

    Ok(id)
}

/// 更新库的最后扫描时间戳
pub fn update_library_scan_time(db: &Connection, library_id: i64) -> Result<(), Box<dyn std::error::Error>> {
    db.execute(
        "UPDATE libraries SET last_scan = unixepoch() WHERE id = ?1",
        rusqlite::params![library_id],
    )?;
    Ok(())
}

/// 根据哈希值获取单本书籍
pub fn get_book_by_hash(db: &Connection, hash: &str) -> Result<Book, Box<dyn std::error::Error>> {
    let book = db.query_row(
        "SELECT id, library_id, hash, title, path, file_size, page_count, cover_path, format, read_progress, is_favorite, added_at
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
            })
        },
    )?;
    Ok(book)
}

/// 保存书籍的阅读进度
/// 同时刷新 `updated_at`，便于后续按最近活动排序或同步状态。
pub fn save_progress(db: &Connection, hash: &str, page_index: i64) -> Result<(), Box<dyn std::error::Error>> {
    db.execute(
        "UPDATE books SET read_progress = ?1, updated_at = unixepoch() WHERE hash = ?2 AND is_removed = 0",
        rusqlite::params![page_index, hash],
    )?;
    Ok(())
}
