/**
 * 统一日志模块
 *
 * 所有前端日志都通过此模块发出，同时写入：
 * 1. 浏览器 console（开发调试用）
 * 2. Rust 后端日志系统（通过 tauri-plugin-log 的 Webview target 自动桥接）
 * 3. 内存环形缓冲区（供 Debug Panel 实时展示）
 *
 * 使用方式：
 *   import { logger } from "@/lib/logger";
 *   logger.info("扫描完成", { count: 42 });
 *   logger.error("加载失败", error);
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  message: string;
  data?: unknown;
}

/** 内存中保留最近 500 条日志 */
const MAX_ENTRIES = 500;
const buffer: LogEntry[] = [];
const listeners: Set<() => void> = new Set();

function push(level: LogLevel, message: string, data?: unknown) {
  const entry: LogEntry = { timestamp: Date.now(), level, message, data };
  buffer.push(entry);
  if (buffer.length > MAX_ENTRIES) buffer.shift();

  // 通知监听者（Debug Panel）
  for (const fn of listeners) fn();

  // 同步到浏览器 console
  const consoleFn = level === "error" ? console.error
    : level === "warn" ? console.warn
    : level === "debug" ? console.debug
    : console.log;

  if (data !== undefined) {
    consoleFn(`[Yomu:${level}] ${message}`, data);
  } else {
    consoleFn(`[Yomu:${level}] ${message}`);
  }
}

export const logger = {
  debug: (msg: string, data?: unknown) => push("debug", msg, data),
  info: (msg: string, data?: unknown) => push("info", msg, data),
  warn: (msg: string, data?: unknown) => push("warn", msg, data),
  error: (msg: string, data?: unknown) => push("error", msg, data),

  /** 获取内存中的所有日志条目 */
  getEntries: (): readonly LogEntry[] => buffer,

  /** 订阅新日志到达事件（返回取消订阅函数） */
  subscribe: (fn: () => void): (() => void) => {
    listeners.add(fn);
    return () => listeners.delete(fn);
  },

  /** 清空内存缓冲 */
  clear: () => { buffer.length = 0; },

  /** 导出为纯文本（用于粘贴到 issue） */
  exportText: (): string => {
    return buffer.map((e) => {
      const time = new Date(e.timestamp).toISOString();
      const data = e.data !== undefined ? ` ${JSON.stringify(e.data)}` : "";
      return `[${time}] [${e.level.toUpperCase()}] ${e.message}${data}`;
    }).join("\n");
  },
};
