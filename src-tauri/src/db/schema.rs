use std::path::PathBuf;

use rusqlite::Connection;
use tauri::Manager;

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
