/**
 * 全局 Debug 面板
 *
 * 快捷键 Ctrl+Shift+D 唤出/隐藏。
 * 展示：
 * - 应用版本、构建模式、OS、架构
 * - 数据库路径、大小、书数量
 * - 日志文件路径
 * - 实时前端日志流（来自 logger.ts 内存缓冲区）
 * - 导出日志按钮（从 Rust 后端拉取完整文件日志）
 */
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { invoke } from "@tauri-apps/api/core";
import { logger, type LogEntry } from "@/lib/logger";
import { Bug, Copy, Download, X } from "lucide-react";

interface DebugInfo {
  version: string;
  build_mode: string;
  os: string;
  arch: string;
  db_path: string;
  log_path: string;
  cache_path: string;
  covers_path: string;
  db_size_bytes: number;
  book_count: number;
  library_count: number;
}

export function DebugPanel() {
  const [open, setOpen] = useState(false);
  const [info, setInfo] = useState<DebugInfo | null>(null);
  const [exporting, setExporting] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  // 订阅 logger 的更新
  const entries = useSyncExternalStore(
    logger.subscribe,
    logger.getEntries,
    logger.getEntries,
  );

  // 快捷键 Ctrl+Shift+D
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "D") {
        e.preventDefault();
        setOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // 打开时加载调试信息
  useEffect(() => {
    if (!open) return;
    invoke<DebugInfo>("get_debug_info").then(setInfo).catch((e) => {
      logger.error("Failed to load debug info", e);
    });
  }, [open]);

  // 日志自动滚到底
  useEffect(() => {
    if (open) logEndRef.current?.scrollIntoView({ behavior: "auto" });
  }, [entries.length, open]);

  const handleExportRust = useCallback(async () => {
    setExporting(true);
    try {
      const logs = await invoke<string>("export_logs");
      await navigator.clipboard.writeText(logs);
      logger.info("Rust logs copied to clipboard");
    } catch (e) {
      logger.error("Failed to export Rust logs", e);
    } finally {
      setExporting(false);
    }
  }, []);

  const handleCopyFrontend = useCallback(() => {
    const text = logger.exportText();
    navigator.clipboard.writeText(text).then(() => {
      logger.info("Frontend logs copied to clipboard");
    });
  }, []);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-end justify-end pointer-events-none">
      <div className="pointer-events-auto w-[560px] max-h-[80vh] m-4 flex flex-col border border-white/10 bg-[#0e0d0c]/98 backdrop-blur-lg shadow-2xl shadow-black/60 text-[12px] font-mono">
        {/* 标题栏 */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-white/[0.06] bg-white/[0.02]">
          <div className="flex items-center gap-2 text-accent">
            <Bug size={14} />
            <span className="text-[11px] uppercase tracking-[0.2em]">Debug Console</span>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={handleCopyFrontend}
              className="px-2 py-1 text-white/40 hover:text-white/80 transition-colors"
              title="复制前端日志"
            >
              <Copy size={12} />
            </button>
            <button
              onClick={handleExportRust}
              disabled={exporting}
              className="px-2 py-1 text-white/40 hover:text-white/80 transition-colors disabled:opacity-30"
              title="复制 Rust 后端日志"
            >
              <Download size={12} />
            </button>
            <button
              onClick={() => setOpen(false)}
              className="px-2 py-1 text-white/40 hover:text-white/80 transition-colors"
            >
              <X size={12} />
            </button>
          </div>
        </div>

        {/* 系统信息 */}
        {info && (
          <div className="px-3 py-2 border-b border-white/[0.06] grid grid-cols-3 gap-x-4 gap-y-1 text-[11px]">
            <InfoCell label="Version" value={`v${info.version} (${info.build_mode})`} />
            <InfoCell label="OS" value={`${info.os} / ${info.arch}`} />
            <InfoCell label="DB Size" value={formatBytes(info.db_size_bytes)} />
            <InfoCell label="Books" value={String(info.book_count)} />
            <InfoCell label="Libraries" value={String(info.library_count)} />
            <InfoCell label="Logs" value={info.log_path.split(/[/\\]/).pop() ?? ""} />
          </div>
        )}

        {/* 日志流 */}
        <div className="flex-1 min-h-0 overflow-y-auto px-1 py-1">
          {(entries as LogEntry[]).map((entry, i) => (
            <LogLine key={i} entry={entry} />
          ))}
          <div ref={logEndRef} />
          {entries.length === 0 && (
            <div className="text-center text-white/20 py-8">暂无日志</div>
          )}
        </div>

        {/* 底部状态 */}
        <div className="px-3 py-1.5 border-t border-white/[0.06] text-white/25 flex justify-between">
          <span>{entries.length} entries</span>
          <span>Ctrl+Shift+D to toggle</span>
        </div>
      </div>
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-white/30">{label}: </span>
      <span className="text-white/70">{value}</span>
    </div>
  );
}

const LEVEL_COLORS: Record<string, string> = {
  debug: "text-white/30",
  info: "text-blue-400/80",
  warn: "text-yellow-400/80",
  error: "text-red-400/90",
};

function LogLine({ entry }: { entry: LogEntry }) {
  const time = new Date(entry.timestamp).toLocaleTimeString("en-GB", { hour12: false, fractionalSecondDigits: 3 });
  const color = LEVEL_COLORS[entry.level] ?? "text-white/50";
  return (
    <div className="flex gap-2 px-2 py-[2px] hover:bg-white/[0.02] leading-[18px]">
      <span className="text-white/20 shrink-0">{time}</span>
      <span className={`shrink-0 w-[38px] uppercase ${color}`}>{entry.level}</span>
      <span className="text-white/70 break-all">{entry.message}</span>
      {entry.data !== undefined && (
        <span className="text-white/30 break-all">{typeof entry.data === "string" ? entry.data : JSON.stringify(entry.data)}</span>
      )}
    </div>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
