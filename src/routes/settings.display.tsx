/** 显示设置路由说明 */
import { useCallback, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/settings/display")({
  component: DisplaySettings,
});

function DisplaySettings() {
  const [cleaning, setCleaning] = useState(false);
  const [cleanResult, setCleanResult] = useState<string | null>(null);

  const handleCleanAll = useCallback(async () => {
    try {
      setCleaning(true);
      setCleanResult(null);
      // maxBytes = 0 → 清除全部缓存
      const freed = await invoke<number>("cleanup_cache", { maxBytes: 0 });
      const mb = (freed / 1024 / 1024).toFixed(1);
      setCleanResult(`已清除 ${mb} MB 缓存`);
    } catch (e) {
      setCleanResult(`清理失败: ${String(e)}`);
    } finally {
      setCleaning(false);
    }
  }, []);

  const handleCleanPartial = useCallback(async () => {
    try {
      setCleaning(true);
      setCleanResult(null);
      // 保留最近 2GB
      const freed = await invoke<number>("cleanup_cache", {
        maxBytes: 2 * 1024 * 1024 * 1024,
      });
      const mb = (freed / 1024 / 1024).toFixed(1);
      setCleanResult(freed > 0 ? `已释放 ${mb} MB` : "缓存未超过 2GB，无需清理");
    } catch (e) {
      setCleanResult(`清理失败: ${String(e)}`);
    } finally {
      setCleaning(false);
    }
  }, []);

  return (
    <div className="space-y-8">
      <div className="section-rule pb-5">
        <div className="data-label mb-3">Display</div>
        <h2 className="text-3xl font-semibold uppercase tracking-[0.08em] text-text-primary">
          显示与性能
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-text-secondary">
          管理页面缓存和渲染相关设置。
        </p>
      </div>

      {/* 缓存管理 */}
      <div className="space-y-4">
        <div className="data-label">Cache Management</div>

        <div className="panel-frame rounded-[var(--radius-sm)] p-5 space-y-4">
          <div>
            <div className="text-sm font-medium text-text-primary">页面缓存</div>
            <p className="mt-1 text-[12px] text-text-tertiary leading-5">
              阅读器会将解码后的页面图片缓存到磁盘，加速翻页。缓存过多时可手动清理。
              应用启动时会自动清理超过 2GB 的部分。
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleCleanPartial}
              disabled={cleaning}
              className="inline-flex items-center gap-2 border border-border px-4 py-2.5 text-sm text-text-secondary transition-colors hover:border-accent-border hover:bg-bg-hover hover:text-text-primary disabled:opacity-40"
            >
              清理至 2GB 以内
            </button>
            <button
              onClick={handleCleanAll}
              disabled={cleaning}
              className="inline-flex items-center gap-2 border border-border px-4 py-2.5 text-sm text-text-secondary transition-colors hover:border-red-400/40 hover:bg-red-500/10 hover:text-red-300 disabled:opacity-40"
            >
              清除全部缓存
            </button>
          </div>

          {cleanResult && (
            <div className="text-[12px] text-accent">{cleanResult}</div>
          )}
        </div>
      </div>

      {/* 主题/动画预留 */}
      <div className="space-y-4">
        <div className="data-label">Theme & Motion</div>
        <div className="grid gap-4 md:grid-cols-2">
          <div className="panel-frame rounded-[var(--radius-sm)] p-5">
            <div className="text-sm font-medium text-text-primary">界面主题</div>
            <p className="mt-2 text-[12px] text-text-tertiary leading-5">
              当前为档案馆深色风格。多主题切换将在后续版本提供。
            </p>
          </div>
          <div className="panel-frame rounded-[var(--radius-sm)] p-5">
            <div className="text-sm font-medium text-text-primary">动画节奏</div>
            <p className="mt-2 text-[12px] text-text-tertiary leading-5">
              系统已支持 `prefers-reduced-motion` 媒体查询自动禁用动画。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
