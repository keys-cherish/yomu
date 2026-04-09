/** 根布局路由说明 */
import { createRootRoute, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";
import { DebugPanel } from "@/components/DebugPanel";
import { ArrowLeft } from "lucide-react";

export const Route = createRootRoute({
  component: RootLayout,
  errorComponent: RootError,
  notFoundComponent: NotFound,
});

/**
 * 根布局组件
 * @returns 渲染根布局或阅读器
 */
function RootLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isReader = pathname.startsWith("/reader/");

  return (
    <>
      {isReader ? <Outlet /> : <AppShell />}
      <DebugPanel />
    </>
  );
}

/** 全局错误边界（修 P1-8） */
function RootError({ error }: { error: unknown }) {
  const navigate = useNavigate();
  return (
    <div className="flex h-screen items-center justify-center bg-bg-base text-text-primary">
      <div className="max-w-lg text-center space-y-4 px-6">
        <div className="data-label">Error</div>
        <h1 className="text-2xl font-semibold">出了点问题</h1>
        <p className="text-sm text-text-secondary leading-7">
          {error instanceof Error ? error.message : String(error)}
        </p>
        <button
          onClick={() => navigate({ to: "/library" })}
          className="inline-flex items-center gap-2 border border-border px-4 py-2 text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={14} />
          返回书架
        </button>
      </div>
    </div>
  );
}

/** 404 页面（修 P1-8） */
function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="flex h-screen items-center justify-center bg-bg-base text-text-primary">
      <div className="text-center space-y-4">
        <div className="data-label">404</div>
        <h1 className="text-2xl font-semibold">页面不存在</h1>
        <button
          onClick={() => navigate({ to: "/library" })}
          className="inline-flex items-center gap-2 border border-border px-4 py-2 text-sm text-text-secondary hover:bg-bg-hover hover:text-text-primary transition-colors"
        >
          <ArrowLeft size={14} />
          返回书架
        </button>
      </div>
    </div>
  );
}
