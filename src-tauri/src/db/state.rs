use std::sync::Mutex;

use rusqlite::Connection;

/// 由 Tauri 管理的数据库状态
pub struct DbState(pub Mutex<Connection>);
