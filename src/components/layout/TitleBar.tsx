/** 标题栏组件 */
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, PanelLeftClose, PanelLeftOpen, Square, X } from "lucide-react";
import { useSettingsStore } from "@/stores/settings";

// 获取当前窗口实例，避免每次渲染时重复创建句柄
const appWindow = getCurrentWindow();

/**
 * 标题栏组件
 * 提供窗口拖拽区域、侧边栏折叠按钮和窗口控制按钮
 */
export function TitleBar() {
  const collapsed = useSettingsStore((s) => s.sidebarCollapsed);
  const toggle = useSettingsStore((s) => s.toggleSidebar);

  return (
    <div
      className="drag-region section-rule flex h-12 shrink-0 items-center justify-between border-b border-[var(--color-border-strong)]/80 bg-[#0a0a0a]/92 px-4 select-none backdrop-blur-md"
    >
      {/* 左侧：侧边栏折叠 + 应用标题 */}
      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          className="no-drag inline-flex h-8 w-8 items-center justify-center transition-colors duration-[var(--duration-fast)] hover:bg-bg-hover"
          aria-label={collapsed ? "展开侧边栏" : "折叠侧边栏"}
        >
          {collapsed ? (
            <PanelLeftOpen size={15} className="text-text-secondary" />
          ) : (
            <PanelLeftClose size={15} className="text-text-secondary" />
          )}
        </button>
        <span className="text-[11px] font-medium uppercase tracking-[0.28em] text-text-tertiary">
          Archive Reader
        </span>
        <span className="text-sm font-semibold tracking-[0.18em] text-text-primary uppercase">
          Yomu
        </span>
      </div>

      {/* 窗口控制按钮 */}
      <div className="no-drag flex items-center border-l border-border pl-2">
        <button
          onClick={() => appWindow.minimize()}
          className="inline-flex h-8 w-11 items-center justify-center transition-colors duration-[var(--duration-fast)] hover:bg-bg-hover"
          aria-label="最小化"
        >
          <Minus size={14} className="text-text-secondary" />
        </button>
        <button
          onClick={() => appWindow.toggleMaximize()}
          className="inline-flex h-8 w-11 items-center justify-center transition-colors duration-[var(--duration-fast)] hover:bg-bg-hover"
          aria-label="最大化"
        >
          <Square size={12} className="text-text-secondary" />
        </button>
        <button
          onClick={() => appWindow.close()}
          className="group inline-flex h-8 w-11 items-center justify-center transition-colors duration-[var(--duration-fast)] hover:bg-[#4a1f1f]"
          aria-label="关闭"
        >
          <X size={14} className="text-text-secondary group-hover:text-[#ffb4a8]" />
        </button>
      </div>
    </div>
  );
}
