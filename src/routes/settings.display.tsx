/** 显示设置路由说明 */
import { useCallback, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { createFileRoute } from "@tanstack/react-router";
import { useSettingsStore, type ThemeMode } from "@/stores/settings";
import { Moon, Sun, Monitor } from "lucide-react";

export const Route = createFileRoute("/settings/display")({
  component: DisplaySettings,
});

const themeOptions: { value: ThemeMode; label: string; icon: typeof Sun }[] = [
  { value: "dark", label: "深色", icon: Moon },
  { value: "light", label: "浅色", icon: Sun },
  { value: "system", label: "跟随系统", icon: Monitor },
];

function DisplaySettings() {
  const theme = useSettingsStore((s) => s.theme);
  const setTheme = useSettingsStore((s) => s.setTheme);
  const nightMode = useSettingsStore((s) => s.readerNightMode);
  const setNightMode = useSettingsStore((s) => s.setReaderNightMode);
  const [cleaning, setCleaning] = useState(false);
  const [cleanResult, setCleanResult] = useState<string | null>(null);

  const handleCleanAll = useCallback(async () => {
    try {
      setCleaning(true);
      setCleanResult(null);
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
          管理界面主题、阅读器夜间模式和页面缓存。
        </p>
      </div>

      {/* 主题切换 */}
      <div className="space-y-4">
        <div className="data-label">Theme</div>
        <div className="panel-frame rounded-[var(--radius-sm)] p-5 space-y-4">
          <div>
            <div className="text-sm font-medium text-text-primary">界面主题</div>
            <p className="mt-1 text-[12px] text-text-tertiary leading-5">
              选择深色、浅色或跟随系统偏好自动切换。
            </p>
          </div>
          <div className="flex gap-3">
            {themeOptions.map((opt) => {
              const Icon = opt.icon;
              const active = theme === opt.value;
              return (
                <button
                  key={opt.value}
                  onClick={() => setTheme(opt.value)}
                  className={`flex items-center gap-2 px-4 py-2.5 border text-sm transition-colors ${
                    active
                      ? "border-accent-border bg-accent-light text-text-primary"
                      : "border-border text-text-secondary hover:border-accent-border hover:bg-bg-hover hover:text-text-primary"
                  }`}
                >
                  <Icon size={15} />
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* 阅读器夜间模式 */}
      <div className="space-y-4">
        <div className="data-label">Reader Night Mode</div>
        <div className="panel-frame rounded-[var(--radius-sm)] p-5">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium text-text-primary">阅读器夜间模式</div>
              <p className="mt-1 text-[12px] text-text-tertiary leading-5">
                在阅读器中叠加暖色调滤镜，减少蓝光刺激（独立于界面主题）。
              </p>
            </div>
            <button
              onClick={() => setNightMode(!nightMode)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                nightMode ? "bg-accent" : "bg-bg-active"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                  nightMode ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* 缓存管理 */}
      <div className="space-y-4">
        <div className="data-label">Cache Management</div>
        <div className="panel-frame rounded-[var(--radius-sm)] p-5 space-y-4">
          <div>
            <div className="text-sm font-medium text-text-primary">页面缓存</div>
            <p className="mt-1 text-[12px] text-text-tertiary leading-5">
              阅读器会将解码后的页面图片缓存到磁盘，加速翻页。
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
    </div>
  );
}
