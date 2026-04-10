use serde::Serialize;
use tauri::Manager;

/// 调试信息结构
#[derive(Serialize)]
pub struct DebugInfo {
    pub version: String,
    pub build_mode: String,
    pub os: String,
    pub arch: String,
    pub db_path: String,
    pub log_path: String,
    pub cache_path: String,
    pub covers_path: String,
    pub db_size_bytes: u64,
    pub book_count: i64,
    pub library_count: i64,
}

/// 获取日志文件目录路径
#[tauri::command]
pub async fn get_log_path(app: tauri::AppHandle) -> Result<String, String> {
    let log_dir = app.path().app_log_dir().map_err(|e| e.to_string())?;
    Ok(log_dir.to_string_lossy().to_string())
}

/// 获取完整的调试信息
#[tauri::command]
pub async fn get_debug_info(
    app: tauri::AppHandle,
    state: tauri::State<'_, crate::db::DbState>,
) -> Result<DebugInfo, String> {
    let app_data = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let log_dir = app.path().app_log_dir().map_err(|e| e.to_string())?;
    let db_path = app_data.join("library.db");

    let db_size = std::fs::metadata(&db_path).map(|m| m.len()).unwrap_or(0);

    let (book_count, library_count) = {
        let db = state.0.lock().map_err(|e| e.to_string())?;
        let books: i64 = db.query_row(
            "SELECT COUNT(*) FROM books WHERE is_removed = 0", [], |r| r.get(0)
        ).unwrap_or(0);
        let libs: i64 = db.query_row(
            "SELECT COUNT(*) FROM libraries", [], |r| r.get(0)
        ).unwrap_or(0);
        (books, libs)
    };

    Ok(DebugInfo {
        version: env!("CARGO_PKG_VERSION").to_string(),
        build_mode: if cfg!(debug_assertions) { "debug" } else { "release" }.to_string(),
        os: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
        db_path: db_path.to_string_lossy().to_string(),
        log_path: log_dir.to_string_lossy().to_string(),
        cache_path: app_data.join("cache").to_string_lossy().to_string(),
        covers_path: app_data.join("covers").to_string_lossy().to_string(),
        db_size_bytes: db_size,
        book_count,
        library_count,
    })
}

/// 导出日志：把日志目录下的所有 .log 文件合并成一个字符串返回
/// 前端可以用这个做"复制到剪贴板"或"保存为文件"
#[tauri::command]
pub async fn export_logs(app: tauri::AppHandle) -> Result<String, String> {
    let log_dir = app.path().app_log_dir().map_err(|e| e.to_string())?;

    if !log_dir.exists() {
        return Ok("(no log files found)".to_string());
    }

    let mut entries: Vec<(String, std::time::SystemTime)> = Vec::new();
    let read_dir = std::fs::read_dir(&log_dir).map_err(|e| e.to_string())?;
    for entry in read_dir.flatten() {
        let path = entry.path();
        if path.extension().and_then(|e| e.to_str()) == Some("log")
            || path.file_name().and_then(|n| n.to_str()).map(|n| n.starts_with("yomu")).unwrap_or(false)
        {
            let modified = path.metadata()
                .and_then(|m| m.modified())
                .unwrap_or(std::time::SystemTime::UNIX_EPOCH);
            entries.push((path.to_string_lossy().to_string(), modified));
        }
    }

    entries.sort_by_key(|(_, t)| *t);

    let mut output = String::new();
    // 只取最近的日志文件，上限 500KB
    let max_bytes: usize = 512 * 1024;
    let mut total = 0usize;

    for (path, _) in entries.iter().rev() {
        if total >= max_bytes { break; }
        match std::fs::read_to_string(path) {
            Ok(content) => {
                if !output.is_empty() {
                    output.push_str(&format!("\n--- {} ---\n", path));
                }
                let take = content.len().min(max_bytes - total);
                output.push_str(&content[..take]);
                total += take;
            }
            Err(_) => continue,
        }
    }

    Ok(output)
}
