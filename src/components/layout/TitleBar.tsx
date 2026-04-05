/** 标题栏组件 */
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, Square, X } from "lucide-react";

// 获取当前窗口实例，避免每次渲染时重复创建句柄
const appWindow = getCurrentWindow();

/**
 * 标题栏组件
 * 提供窗口拖拽区域和窗口控制按钮（最小化、最大化、关闭）
 */
export function TitleBar() {
  return (
    <div
      className="drag-region flex items-center justify-between h-12 px-4 bg-bg-surface border-b border-border select-none shrink-0"
    >
      {/* 应用标题 */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-text-primary tracking-wide">
          Yomu
        </span>
      </div>

      {/* 窗口控制按钮 */}
      <div className="no-drag flex items-center">
        <button
          onClick={() => appWindow.minimize()}
          className="inline-flex items-center justify-center w-11 h-8 hover:bg-bg-hover transition-colors duration-[var(--duration-fast)]"
          aria-label="最小化"
        >
          <Minus size={14} className="text-text-secondary" />
        </button>
        <button
          onClick={() => appWindow.toggleMaximize()}
          className="inline-flex items-center justify-center w-11 h-8 hover:bg-bg-hover transition-colors duration-[var(--duration-fast)]"
          aria-label="最大化"
        >
          <Square size={12} className="text-text-secondary" />
        </button>
        <button
          onClick={() => appWindow.close()}
          className="inline-flex items-center justify-center w-11 h-8 hover:bg-red-500/10 transition-colors duration-[var(--duration-fast)] group"
          aria-label="关闭"
        >
          <X size={14} className="text-text-secondary group-hover:text-red-500" />
        </button>
      </div>
    </div>
  );
}
