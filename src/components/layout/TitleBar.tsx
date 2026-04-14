/** 顶部工具栏组件（decorations=true 模式，不再做窗口控制） */
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useSettingsStore } from "@/stores/settings";

/**
 * 顶部工具栏
 * decorations=true 后，窗口标题栏由系统原生渲染，这里只负责应用内工具按钮。
 */
export function TitleBar() {
  const collapsed = useSettingsStore((s) => s.sidebarCollapsed);
  const toggle = useSettingsStore((s) => s.toggleSidebar);

  return (
    <div
      className="section-rule flex h-10 shrink-0 items-center border-b border-[var(--color-border-strong)]/80 bg-bg-surface/92 px-4 select-none backdrop-blur-md"
    >
      <div className="flex items-center gap-3">
        <button
          onClick={toggle}
          className="inline-flex h-7 w-7 items-center justify-center rounded transition-colors duration-[var(--duration-fast)] hover:bg-bg-hover"
          aria-label={collapsed ? "展开侧边栏" : "折叠侧边栏"}
        >
          {collapsed ? (
            <PanelLeftOpen size={14} className="text-text-secondary" />
          ) : (
            <PanelLeftClose size={14} className="text-text-secondary" />
          )}
        </button>
        <span className="text-[10px] font-medium uppercase tracking-[0.28em] text-text-tertiary">
          Archive Reader
        </span>
        <span className="text-xs font-semibold tracking-[0.18em] text-text-primary uppercase">
          Yomu
        </span>
      </div>
    </div>
  );
}
