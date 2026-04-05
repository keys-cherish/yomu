/** 首页路由说明 */
import { createFileRoute, redirect } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  // 根路径统一重定向到书架页，避免出现空白首页
  beforeLoad: () => {
    throw redirect({ to: "/library" });
  },
});
