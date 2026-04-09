/**
 * Tauri API 隔离层
 *
 * 所有 Tauri 平台 API 调用（invoke、window 操作等）都应通过此模块。
 * 好处：
 * - Tauri 版本升级时只改这一个文件
 * - 方便为 Web / 测试环境做 mock
 * - 集中的错误处理和日志
 */

import { invoke as tauriInvoke } from "@tauri-apps/api/core";
import {
  getCurrentWindow,
  currentMonitor as tauriCurrentMonitor,
  LogicalSize,
  LogicalPosition,
} from "@tauri-apps/api/window";
import { open as tauriOpen, type OpenDialogOptions } from "@tauri-apps/plugin-dialog";
import { logger } from "./logger";

// ─── IPC ────────────────────────────────────────────

/** 调用后端 Tauri command，自动记录错误日志 */
export async function command<T>(name: string, args?: Record<string, unknown>): Promise<T> {
  try {
    return await tauriInvoke<T>(name, args);
  } catch (e) {
    logger.error(`Command "${name}" failed`, e);
    throw e;
  }
}

// ─── Window ─────────────────────────────────────────

const win = getCurrentWindow();

export const appWindow = {
  minimize: () => win.minimize(),
  toggleMaximize: () => win.toggleMaximize(),
  close: () => win.close(),
  show: () => win.show(),
  setAlwaysOnTop: (v: boolean) => win.setAlwaysOnTop(v),
  setSize: (w: number, h: number) => win.setSize(new LogicalSize(w, h)),
  setPosition: (x: number, y: number) => win.setPosition(new LogicalPosition(x, y)),
  scaleFactor: () => win.scaleFactor(),
  outerPosition: () => win.outerPosition(),
  outerSize: () => win.outerSize(),
  isFullscreen: () => win.isFullscreen(),
  setFullscreen: (v: boolean) => win.setFullscreen(v),
  startDragging: () => win.startDragging(),
} as const;

export const monitor = {
  current: () => tauriCurrentMonitor(),
} as const;

// Re-export positioning types (consumers shouldn't import @tauri-apps directly)
export { LogicalSize, LogicalPosition };

// ─── Dialog ─────────────────────────────────────────

export async function openDirectoryDialog(title: string): Promise<string | null> {
  const selected = await tauriOpen({
    directory: true,
    multiple: false,
    title,
  } as OpenDialogOptions);
  return selected as string | null;
}
