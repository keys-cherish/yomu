/** 设置布局路由说明 */
import { createFileRoute, Outlet, Link } from "@tanstack/react-router";
import { Settings, Library, Monitor } from "lucide-react";

export const Route = createFileRoute("/settings")({
  component: SettingsLayout,
});

/**
 * 设置页布局组件
 * @returns 渲染设置导航和子页面
 */
function SettingsLayout() {
  return (
    <div className="flex h-full">
      <nav className="w-48 border-r border-border p-4 space-y-1">
        <Link
          to="/settings/general"
          className="flex items-center gap-2 px-3 py-2 text-sm rounded-[var(--radius-sm)] text-text-secondary hover:bg-bg-hover transition-colors"
          activeProps={{ className: "!text-accent !font-semibold !bg-accent-light/30" }}
        >
          <Settings size={16} />
          通用
        </Link>
        <Link
          to="/settings/library"
          className="flex items-center gap-2 px-3 py-2 text-sm rounded-[var(--radius-sm)] text-text-secondary hover:bg-bg-hover transition-colors"
          activeProps={{ className: "!text-accent !font-semibold !bg-accent-light/30" }}
        >
          <Library size={16} />
          书库管理
        </Link>
        <Link
          to="/settings/display"
          className="flex items-center gap-2 px-3 py-2 text-sm rounded-[var(--radius-sm)] text-text-secondary hover:bg-bg-hover transition-colors"
          activeProps={{ className: "!text-accent !font-semibold !bg-accent-light/30" }}
        >
          <Monitor size={16} />
          显示与性能
        </Link>
      </nav>
      <main className="flex-1 p-6 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
