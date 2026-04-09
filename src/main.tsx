/** 应用入口模块 */
import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { getCurrentWindow, currentMonitor, LogicalSize } from "@tauri-apps/api/window";
import "./styles/globals.css";

// 创建路由实例
const router = createRouter({ routeTree });

// 注册路由实例以实现类型安全
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

/**
 * 根据屏幕分辨率动态调整窗口大小（仅首次启动时执行）
 * - 窗口宽高取屏幕逻辑分辨率的 80%，不小于 minWidth/minHeight
 * - 居中显示
 */
async function adjustWindowSize() {
  // 防止 HMR 热更新重复执行
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const w = window as any;
  if (w.__YOMU_WINDOW_ADJUSTED__) return;
  w.__YOMU_WINDOW_ADJUSTED__ = true;

  try {
    const monitor = await currentMonitor();
    if (!monitor) return;

    const win = getCurrentWindow();
    const scale = monitor.scaleFactor ?? (await win.scaleFactor());
    // monitor.size 是物理像素，除以 scaleFactor 得到逻辑像素
    const screenW = monitor.size.width / scale;
    const screenH = monitor.size.height / scale;

    const minW = 1000;
    const minH = 700;
    const targetW = Math.max(minW, Math.round(screenW * 0.82));
    const targetH = Math.max(minH, Math.round(screenH * 0.86));

    await win.unmaximize();
    await win.setSize(new LogicalSize(targetW, targetH));
    await win.center();
  } catch (e) {
    console.error("Failed to adjust window size:", e);
  }
}

// 先调整窗口，再渲染应用
adjustWindowSize().finally(() => {
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <RouterProvider router={router} />
    </React.StrictMode>
  );
});
