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
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            crate::commands::books::get_books,
            crate::commands::books::get_book_by_hash,
            crate::commands::books::save_reading_progress,
            crate::commands::cache::warm_cache,
            crate::commands::cache::cleanup_cache,
            crate::commands::libraries::add_library,
            crate::commands::books::get_libraries,
            crate::commands::libraries::scan_library,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
