use tauri::Manager;

use crate::backup::webdav;
use crate::db;

const REMOTE_DIR: &str = "yomu-backup";
const DB_FILENAME: &str = "library.db";

/// 测试 WebDAV 连接
#[tauri::command]
pub async fn test_webdav(
    url: String,
    username: String,
    password: String,
) -> Result<String, String> {
    webdav::test_connection(&url, &username, &password).await
}

/// 备份数据库到 WebDAV
/// 流程：关闭当前 DB WAL → 复制 DB 文件到临时位置 → 上传到 WebDAV
#[tauri::command]
pub async fn backup_to_webdav(
    app: tauri::AppHandle,
    url: String,
    username: String,
    password: String,
) -> Result<String, String> {
    let db_path = db::get_db_path(&app).map_err(|e| e.to_string())?;

    if !db_path.exists() {
        return Err("Database file not found".to_string());
    }

    // 先让 SQLite checkpoint WAL 到主文件，确保备份完整
    {
        let db_state: tauri::State<db::DbState> = app.state();
        let conn = db_state.0.lock().map_err(|e| e.to_string())?;
        conn.execute_batch("PRAGMA wal_checkpoint(TRUNCATE);")
            .map_err(|e| format!("WAL checkpoint failed: {}", e))?;
    }

    // 复制到临时文件避免锁冲突
    let tmp_path = db_path.with_extension("db.backup");
    std::fs::copy(&db_path, &tmp_path)
        .map_err(|e| format!("Failed to copy DB: {}", e))?;

    let result = webdav::upload_file(&url, &username, &password, REMOTE_DIR, DB_FILENAME, &tmp_path).await;

    // 清理临时文件
    let _ = std::fs::remove_file(&tmp_path);

    match result {
        Ok(size) => {
            let mb = size as f64 / 1024.0 / 1024.0;
            Ok(format!("Backup complete ({:.1} MB)", mb))
        }
        Err(e) => Err(e),
    }
}

/// 从 WebDAV 恢复数据库
/// 流程：下载到临时位置 → 验证是有效 SQLite → 替换本地 DB → 重新初始化连接
#[tauri::command]
pub async fn restore_from_webdav(
    app: tauri::AppHandle,
    state: tauri::State<'_, db::DbState>,
    url: String,
    username: String,
    password: String,
) -> Result<String, String> {
    let db_path = db::get_db_path(&app).map_err(|e| e.to_string())?;
    let tmp_path = db_path.with_extension("db.restore");

    // 下载
    let size = webdav::download_file(&url, &username, &password, REMOTE_DIR, DB_FILENAME, &tmp_path).await?;

    // 验证下载的文件是有效的 SQLite 数据库
    {
        let test_conn = rusqlite::Connection::open(&tmp_path)
            .map_err(|e| { let _ = std::fs::remove_file(&tmp_path); format!("Downloaded file is not a valid SQLite database: {}", e) })?;
        let table_count: i64 = test_conn
            .query_row("SELECT COUNT(*) FROM sqlite_master WHERE type='table'", [], |r| r.get(0))
            .map_err(|e| { let _ = std::fs::remove_file(&tmp_path); format!("Database validation failed: {}", e) })?;
        if table_count == 0 {
            let _ = std::fs::remove_file(&tmp_path);
            return Err("Downloaded database is empty (no tables)".to_string());
        }
    }

    // 替换本地数据库
    // 先关闭当前连接（通过替换 mutex 内的连接），写入新文件
    {
        let mut conn = state.0.lock().map_err(|e| e.to_string())?;

        // 关闭旧连接，用临时文件覆盖
        std::fs::copy(&tmp_path, &db_path)
            .map_err(|e| { let _ = std::fs::remove_file(&tmp_path); format!("Failed to replace database: {}", e) })?;

        // 重新打开连接
        let new_conn = db::init_db(&db_path)
            .map_err(|e| format!("Failed to reinitialize database: {}", e))?;
        *conn = new_conn;
    }

    let _ = std::fs::remove_file(&tmp_path);

    let mb = size as f64 / 1024.0 / 1024.0;
    Ok(format!("Restore complete ({:.1} MB)", mb))
}
