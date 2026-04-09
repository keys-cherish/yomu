/** 设置布局路由说明 */
import { createFileRoute, Outlet, Link } from "@tanstack/react-router";
import { Settings, Library, Monitor, CloudUpload } from "lucide-react";

export const Route = createFileRoute("/settings")({
  component: SettingsLayout,
});

/**
 * 设置页布局组件
 * @returns 渲染设置导航和子页面
 */
function SettingsLayout() {
  return (
    <div className="grid h-full gap-6 lg:grid-cols-[260px_minmax(0,1fr)]">
      <aside className="panel-frame h-fit rounded-[var(--radius-lg)] p-4 lg:p-5">
        <div className="section-rule pb-4">
          <div className="data-label mb-3">Control Room</div>
          <h1 className="text-2xl font-semibold uppercase tracking-[0.08em] text-text-primary">
            设置
          </h1>
          <p className="mt-3 text-sm leading-7 text-text-secondary">
            管理阅读行为、书库索引与界面显示策略。
          </p>
        </div>

        <nav className="pt-4 space-y-1.5">
          <Link
            to="/settings/general"
            className="flex items-center gap-3 border border-transparent px-3 py-3 text-sm text-text-secondary transition-all duration-150 hover:border-border hover:bg-bg-hover hover:text-text-primary"
            activeProps={{ className: "!border-[var(--color-accent-border)] !bg-accent-light !text-text-primary" }}
          >
            <Settings size={16} />
            通用
          </Link>
          <Link
            to="/settings/library"
            className="flex items-center gap-3 border border-transparent px-3 py-3 text-sm text-text-secondary transition-all duration-150 hover:border-border hover:bg-bg-hover hover:text-text-primary"
            activeProps={{ className: "!border-[var(--color-accent-border)] !bg-accent-light !text-text-primary" }}
          >
            <Library size={16} />
            书库管理
          </Link>
          <Link
            to="/settings/display"
            className="flex items-center gap-3 border border-transparent px-3 py-3 text-sm text-text-secondary transition-all duration-150 hover:border-border hover:bg-bg-hover hover:text-text-primary"
            activeProps={{ className: "!border-[var(--color-accent-border)] !bg-accent-light !text-text-primary" }}
          >
            <Monitor size={16} />
            显示与性能
          </Link>
          <Link
            to="/settings/backup"
            className="flex items-center gap-3 border border-transparent px-3 py-3 text-sm text-text-secondary transition-all duration-150 hover:border-border hover:bg-bg-hover hover:text-text-primary"
            activeProps={{ className: "!border-[var(--color-accent-border)] !bg-accent-light !text-text-primary" }}
          >
            <CloudUpload size={16} />
            WebDAV 备份
          </Link>
        </nav>
      </aside>

      <main className="panel-frame min-h-[420px] rounded-[var(--radius-lg)] p-5 lg:p-7 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  );
}
