use rusqlite::Connection;

use super::models::Library;

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

/// 更新库的最后扫描时间戳
pub fn update_library_scan_time(db: &Connection, library_id: i64) -> Result<(), Box<dyn std::error::Error>> {
    db.execute(
        "UPDATE libraries SET last_scan = unixepoch() WHERE id = ?1",
        rusqlite::params![library_id],
    )?;
    Ok(())
}
