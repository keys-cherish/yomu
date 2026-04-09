use tauri::Manager;

use crate::{db, protocol};

/// 启动函数
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .register_uri_scheme_protocol("comic", protocol::handle_comic_protocol)
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            let db_path = db::get_db_path(app.handle())?;
            let connection = db::init_db(&db_path)
                .map_err(|e| format!("DB init failed: {}", e))?;
            app.manage(db::DbState(std::sync::Mutex::new(connection)));

            log::info!("Yomu started, DB at {:?}", db_path);

            // 启动时后台自动重扫所有已保存的书库，以发现外部新增/删除的漫画
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                auto_rescan_libraries(&handle).await;
            });

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            crate::commands::books::get_books,
            crate::commands::books::get_book_by_hash,
            crate::commands::books::save_reading_progress,
            crate::commands::cache::warm_cache,
            crate::commands::cache::cleanup_cache,
            crate::commands::libraries::add_library,
            crate::commands::libraries::remove_library,
            crate::commands::books::get_libraries,
            crate::commands::libraries::scan_library,
            crate::commands::backup::test_webdav,
            crate::commands::backup::backup_to_webdav,
            crate::commands::backup::restore_from_webdav,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

/// 启动时静默重扫所有已保存的书库
async fn auto_rescan_libraries(app: &tauri::AppHandle) {
    let libraries = {
        let db_state: Option<tauri::State<db::DbState>> = app.try_state();
        let Some(db_state) = db_state else { return; };
        let Ok(db) = db_state.0.lock() else { return; };
        db::get_all_libraries(&db).unwrap_or_default()
    };

    if libraries.is_empty() {
        return;
    }

    log::info!("Auto-rescan: found {} libraries, scanning in background...", libraries.len());

    for lib in &libraries {
        let dir = std::path::PathBuf::from(&lib.path);
        if !dir.exists() {
            log::warn!("Auto-rescan: library path {:?} no longer exists, skipping", dir);
            continue;
        }

        let db_state: Option<tauri::State<db::DbState>> = app.try_state();
        let Some(db_state) = db_state else { return; };

        match crate::commands::libraries::scan_library_inner(app, &db_state, lib.id, &lib.path).await {
            Ok(count) => log::info!("Auto-rescan: {:?} → {} books", lib.path, count),
            Err(e) => log::warn!("Auto-rescan: failed to scan {:?}: {}", lib.path, e),
        }
    }
}
