/** 书库设置路由说明 */
import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { createFileRoute } from "@tanstack/react-router";
import { FolderOpen, Plus, RefreshCw, Trash2 } from "lucide-react";
import type { Library } from "@/lib/types";

export const Route = createFileRoute("/settings/library")({
  component: LibrarySettings,
});

function LibrarySettings() {
  const [libraries, setLibraries] = useState<Library[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState<number | null>(null);

  const loadLibraries = useCallback(async () => {
    try {
      const result = await invoke<Library[]>("get_libraries");
      setLibraries(result);
    } catch (e) {
      console.error("Failed to load libraries:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLibraries();
  }, [loadLibraries]);

  const handleAdd = useCallback(async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "选择漫画文件夹",
      });
      if (!selected) return;
      await invoke("add_library", { path: selected });
      await loadLibraries();
    } catch (e) {
      console.error("Failed to add library:", e);
    }
  }, [loadLibraries]);

  const handleRemove = useCallback(
    async (id: number) => {
      try {
        await invoke("remove_library", { libraryId: id });
        await loadLibraries();
      } catch (e) {
        console.error("Failed to remove library:", e);
      }
    },
    [loadLibraries]
  );

  const handleRescan = useCallback(
    async (lib: Library) => {
      try {
        setScanning(lib.id);
        await invoke("scan_library", { libraryId: lib.id, path: lib.path });
        await loadLibraries();
      } catch (e) {
        console.error("Failed to rescan library:", e);
      } finally {
        setScanning(null);
      }
    },
    [loadLibraries]
  );

  const handleCleanupCache = useCallback(async () => {
    try {
      const freed = await invoke<number>("cleanup_cache", {
        maxBytes: 2 * 1024 * 1024 * 1024,
      });
      const mb = (freed / 1024 / 1024).toFixed(1);
      alert(`缓存清理完成，释放了 ${mb} MB`);
    } catch (e) {
      console.error("Failed to cleanup cache:", e);
    }
  }, []);

  return (
    <div className="space-y-8">
      <div className="section-rule pb-5">
        <div className="data-label mb-3">Indexing</div>
        <h2 className="text-3xl font-semibold uppercase tracking-[0.08em] text-text-primary">
          书库管理
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-text-secondary">
          管理已添加的漫画目录，支持添加新目录、重新扫描与移除。
        </p>
      </div>

      {/* 添加按钮 */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleAdd}
          className="inline-flex items-center gap-2 border border-accent-border bg-accent-light px-4 py-2.5 text-sm font-medium text-text-primary transition-colors hover:bg-accent/20"
        >
          <Plus size={16} />
          添加书库目录
        </button>
        <button
          onClick={handleCleanupCache}
          className="inline-flex items-center gap-2 border border-border px-4 py-2.5 text-sm text-text-secondary transition-colors hover:border-accent-border hover:bg-bg-hover hover:text-text-primary"
        >
          清理缓存
        </button>
      </div>

      {/* 库列表 */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="skeleton h-[72px] rounded-[var(--radius-sm)]" />
          ))}
        </div>
      ) : libraries.length === 0 ? (
        <div className="panel-frame flex min-h-[200px] items-center justify-center rounded-[var(--radius-lg)] text-sm text-text-secondary">
          暂无书库目录，点击上方按钮添加
        </div>
      ) : (
        <div className="space-y-2">
          {libraries.map((lib) => (
            <div
              key={lib.id}
              className="panel-frame flex items-center gap-4 rounded-[var(--radius-sm)] px-5 py-4"
            >
              <FolderOpen size={20} className="shrink-0 text-accent" />
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-text-primary truncate">
                  {lib.name ?? lib.path}
                </div>
                <div className="mt-1 text-[11px] text-text-tertiary truncate">
                  {lib.path}
                  {lib.last_scan != null && (
                    <span className="ml-3">
                      上次扫描: {new Date(lib.last_scan * 1000).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleRescan(lib)}
                  disabled={scanning === lib.id}
                  className="inline-flex h-8 w-8 items-center justify-center text-text-secondary transition-colors hover:text-accent disabled:opacity-40"
                  title="重新扫描"
                >
                  <RefreshCw
                    size={15}
                    className={scanning === lib.id ? "animate-spin" : ""}
                  />
                </button>
                <button
                  onClick={() => handleRemove(lib.id)}
                  className="inline-flex h-8 w-8 items-center justify-center text-text-secondary transition-colors hover:text-red-400"
                  title="移除书库"
                >
                  <Trash2 size={15} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
