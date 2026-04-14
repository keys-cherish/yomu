use tauri::State;

use crate::db;

/// 获取所有书籍
#[tauri::command]
pub async fn get_books(state: State<'_, db::DbState>) -> Result<Vec<db::Book>, String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;
    db::get_all_books(&db).map_err(|e| e.to_string())
}

/// 获取所有库
#[tauri::command]
pub async fn get_libraries(state: State<'_, db::DbState>) -> Result<Vec<db::Library>, String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;
    db::get_all_libraries(&db).map_err(|e| e.to_string())
}

/// 根据哈希值获取书籍
#[tauri::command]
pub async fn get_book_by_hash(
    state: State<'_, db::DbState>,
    hash: String,
) -> Result<db::Book, String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;
    db::get_book_by_hash(&db, &hash).map_err(|e| e.to_string())
}

/// 保存阅读进度
#[tauri::command]
pub async fn save_reading_progress(
    state: State<'_, db::DbState>,
    hash: String,
    page_index: i64,
) -> Result<(), String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;
    let affected = db::save_progress(&db, &hash, page_index).map_err(|e| e.to_string())?;
    if affected == 0 {
        // 书不在库（可能已被重扫清理）——告诉前端保存未落库
        return Err("Book not found or removed".to_string());
    }
    Ok(())
}

/// 获取同系列中按标题排序的下一本书（用于连续阅读）
#[tauri::command]
pub async fn get_next_book(
    state: State<'_, db::DbState>,
    hash: String,
) -> Result<Option<db::Book>, String> {
    let db = state.0.lock().map_err(|e| e.to_string())?;
    db::get_next_book(&db, &hash).map_err(|e| e.to_string())
}
