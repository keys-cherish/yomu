/** 根布局路由说明 */
import { createRootRoute, Outlet, useRouterState } from "@tanstack/react-router";
import { AppShell } from "@/components/layout/AppShell";

export const Route = createRootRoute({
  component: RootLayout,
});

/**
 * 根布局组件
 * @returns 渲染根布局或阅读器
 */
function RootLayout() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isReader = pathname.startsWith("/reader/");

  // 阅读器使用独立的全屏布局（无侧边栏/标题栏）
  if (isReader) {
    return <Outlet />;
  }

  // AppShell 内部渲染了 AnimatedOutlet
  return <AppShell />;
}
