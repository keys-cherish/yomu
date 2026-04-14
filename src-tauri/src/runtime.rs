use tauri::Manager;

use crate::{db, protocol};

/// 启动函数
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(
            // 日志系统：所有模式都启用（不再限制 debug_assertions）
            // - Debug 模式：Info 级别
            // - Release 模式：Warn 级别（减少磁盘 IO）
            // - 同时写入文件和标准输出
            // - 日志文件位于 appData/logs/，单文件上限 2MB，最多保留 5 个
            tauri_plugin_log::Builder::default()
                .level(if cfg!(debug_assertions) {
                    log::LevelFilter::Debug
                } else {
                    log::LevelFilter::Info
                })
                .max_file_size(2 * 1024 * 1024) // 2MB per file
                .rotation_strategy(tauri_plugin_log::RotationStrategy::KeepAll)
                .target(tauri_plugin_log::Target::new(
                    tauri_plugin_log::TargetKind::LogDir { file_name: Some("yomu".into()) },
                ))
                .target(tauri_plugin_log::Target::new(
                    tauri_plugin_log::TargetKind::Stdout,
                ))
                .target(tauri_plugin_log::Target::new(
                    tauri_plugin_log::TargetKind::Webview,
                ))
                .build(),
        )
        .register_uri_scheme_protocol("comic", protocol::handle_comic_protocol)
        .setup(|app| {
            let db_path = db::get_db_path(app.handle())?;
            let connection = db::init_db(&db_path)
                .map_err(|e| format!("DB init failed: {}", e))?;
            app.manage(db::DbState(std::sync::Mutex::new(connection)));

            // 记录启动环境信息
            log::info!("Yomu v{} started", env!("CARGO_PKG_VERSION"));
            log::info!("DB at {:?}", db_path);
            log::info!("Build mode: {}", if cfg!(debug_assertions) { "debug" } else { "release" });

            if let Ok(log_dir) = app.path().app_log_dir() {
                log::info!("Log directory: {:?}", log_dir);
            }

            // 启动时后台自动重扫所有已保存的书库
            let handle = app.handle().clone();
            tauri::async_runtime::spawn(async move {
                auto_rescan_libraries(&handle).await;
                // 重扫完成后启动文件监控
                crate::watcher::start_watcher(&handle);
            });
            
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            crate::commands::books::get_books,
            crate::commands::books::get_book_by_hash,
            crate::commands::books::get_next_book,
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
            crate::commands::debug::get_log_path,
            crate::commands::debug::get_debug_info,
            crate::commands::debug::export_logs,
            crate::commands::everything::check_everything_available,
            crate::commands::everything::search_everything,
            crate::commands::everything::import_from_everything,
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

        match crate::commands::libraries::scan_library_inner(app, &db_state, lib.id, &lib.path, &lib.scan_mode).await {
            Ok(count) => log::info!("Auto-rescan: {:?} → {} books", lib.path, count),
            Err(e) => log::warn!("Auto-rescan: failed to scan {:?}: {}", lib.path, e),
        }
    }
}
