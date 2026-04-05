/** 路由过渡动画组件 */
import { Outlet, useRouterState } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";

/**
 * 路由过渡动画组件
 * 实现路由切换时的淡入和滑动动画效果。
 * 注意：阅读器路由（/reader/）会跳过动画以保证瞬间全屏显示。
 */
export function AnimatedOutlet() {
  // 获取当前路由路径名
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  // 检查是否为阅读器相关路由
  const isReader = pathname.startsWith("/reader/");

  // 阅读器界面：不使用动画，直接渲染，避免翻页时额外闪动
  if (isReader) {
    return <Outlet />;
  }

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={pathname}
        initial={{ opacity: 0, y: 6 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -6 }}
        transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
      >
        <Outlet />
      </motion.div>
    </AnimatePresence>
  );
}
