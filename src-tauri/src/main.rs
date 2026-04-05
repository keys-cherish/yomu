//! 主入口模块

// 防止 Windows 发行版出现额外的控制台窗口，请勿删除！！
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

/// 程序入口点
/// 这里只负责跳转到库 crate 中的 `run`，避免主文件承担过多初始化逻辑。
fn main() {
    yomu_lib::run();
}
