/**
 * 屏幕方向监听钩子 — 平板模式下支持竖屏阅读
 *
 * 在滚动模式下启用：
 * - 监听 screen.orientation 的 change 事件
 * - 设备旋转为竖屏（portrait）时，将 Tauri 窗口尺寸调整为竖屏比例
 * - 设备旋转回横屏（landscape）时，恢复横屏比例
 * - 全屏模式下跟随系统方向自动适配
 */

import { useEffect, useRef } from "react";
import { getCurrentWindow, currentMonitor, LogicalSize, LogicalPosition } from "@tauri-apps/api/window";

/**
 * 监听屏幕方向变化并调整窗口
 * @param enabled 是否启用监听（仅在滚动模式下启用）
 */
export function useOrientation(enabled: boolean) {
  const prevOrientationRef = useRef<string>("");

  useEffect(() => {
    if (!enabled) return;

    const orientation = window.screen?.orientation;
    if (!orientation) return; // 不支持 Screen Orientation API

    const handleChange = async () => {
      const type = orientation.type; // e.g. "portrait-primary", "landscape-primary"
      const isPortrait = type.startsWith("portrait");
      const isLandscape = type.startsWith("landscape");

      // 避免重复处理同方向
      const dir = isPortrait ? "portrait" : "landscape";
      if (dir === prevOrientationRef.current) return;
      prevOrientationRef.current = dir;

      const win = getCurrentWindow();

      try {
        const isFullscreen = await win.isFullscreen();

        if (isFullscreen) {
          // 全屏模式下无需手动调整尺寸，系统会自动适配
          return;
        }

        const scaleFactor = await win.scaleFactor();
        const outerSize = await win.outerSize();
        // 转为逻辑像素
        const currentW = outerSize.width / scaleFactor;
        const currentH = outerSize.height / scaleFactor;

        if (isPortrait && currentW > currentH) {
          // 横屏 → 竖屏：交换宽高
          await win.setSize(new LogicalSize(currentH, currentW));
          // 居中显示
          const monitor1 = await currentMonitor();
          if (monitor1) {
            const mw = monitor1.size.width / scaleFactor;
            const mh = monitor1.size.height / scaleFactor;
            const x = Math.max(0, (mw - currentH) / 2);
            const y = Math.max(0, (mh - currentW) / 2);
            await win.setPosition(new LogicalPosition(x, y));
          }
        } else if (isLandscape && currentH > currentW) {
          // 竖屏 → 横屏：交换宽高
          await win.setSize(new LogicalSize(currentH, currentW));
          const monitor2 = await currentMonitor();
          if (monitor2) {
            const mw = monitor2.size.width / scaleFactor;
            const mh = monitor2.size.height / scaleFactor;
            const x = Math.max(0, (mw - currentH) / 2);
            const y = Math.max(0, (mh - currentW) / 2);
            await win.setPosition(new LogicalPosition(x, y));
          }
        }
      } catch (e) {
        console.error("Failed to adjust window for orientation change:", e);
      }
    };

    // 初始化当前方向
    prevOrientationRef.current = orientation.type.startsWith("portrait")
      ? "portrait"
      : "landscape";

    orientation.addEventListener("change", handleChange);
    return () => orientation.removeEventListener("change", handleChange);
  }, [enabled]);
}
