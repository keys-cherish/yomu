/** 应用入口模块 */
import React from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow, currentMonitor, LogicalSize, LogicalPosition } from "@tauri-apps/api/window";
import { logger } from "./lib/logger";
import "./styles/globals.css";

// 在 React 渲染前立即应用已持久化的主题（防止闪烁）
try {
  const stored = localStorage.getItem("yomu-settings");
  if (stored) {
    const parsed = JSON.parse(stored);
    const theme = parsed?.state?.theme ?? "dark";
    document.documentElement.setAttribute("data-theme", theme);
  }
} catch { /* ignore */ }

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

    await win.setSize(new LogicalSize(targetW, targetH));

    // 居中
    const x = Math.round((screenW - targetW) / 2);
    const y = Math.round((screenH - targetH) / 2);
    await win.setPosition(new LogicalPosition(Math.max(0, x), Math.max(0, y)));

    // 窗口初始 visible=false，调整完尺寸后再显示（修 P2-5 启动闪烁）
    await win.show();
  } catch (e) {
    console.error("Failed to adjust window size:", e);
    logger.error("Failed to adjust window size", e);
    // 即使调整失败也要显示窗口
    try { await getCurrentWindow().show(); } catch { /* ignore */ }
  }
}

/** 启动时清理磁盘缓存（上限 2GB），防止无限膨胀（修 P0-3） */
function cleanupCacheOnStartup() {
  invoke("cleanup_cache", { maxBytes: 2 * 1024 * 1024 * 1024 }).catch(() => {
    // 静默忽略 — 缓存清理非阻塞性操作
  });
}

// 先调整窗口，再渲染应用
adjustWindowSize().finally(() => {
  cleanupCacheOnStartup();
  ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
      <RouterProvider router={router} />
    </React.StrictMode>
  );
});
