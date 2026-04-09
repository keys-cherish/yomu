/** 备份设置路由 */
import { useCallback, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { createFileRoute } from "@tanstack/react-router";
import { CloudUpload, CloudDownload, Wifi } from "lucide-react";
import { useSettingsStore } from "@/stores/settings";

export const Route = createFileRoute("/settings/backup")({
  component: BackupSettings,
});

function BackupSettings() {
  const webdav = useSettingsStore((s) => s.webdav);
  const setWebDav = useSettingsStore((s) => s.setWebDav);
  const [status, setStatus] = useState<{ type: "info" | "ok" | "error"; text: string } | null>(null);
  const [busy, setBusy] = useState(false);

  const isConfigured = webdav.url.trim() !== "";

  const handleTest = useCallback(async () => {
    if (!isConfigured) return;
    setBusy(true);
    setStatus({ type: "info", text: "连接测试中..." });
    try {
      const msg = await invoke<string>("test_webdav", {
        url: webdav.url,
        username: webdav.username,
        password: webdav.password,
      });
      setStatus({ type: "ok", text: msg });
    } catch (e) {
      setStatus({ type: "error", text: String(e) });
    } finally {
      setBusy(false);
    }
  }, [webdav, isConfigured]);

  const handleBackup = useCallback(async () => {
    if (!isConfigured) return;
    setBusy(true);
    setStatus({ type: "info", text: "正在备份..." });
    try {
      const msg = await invoke<string>("backup_to_webdav", {
        url: webdav.url,
        username: webdav.username,
        password: webdav.password,
      });
      setStatus({ type: "ok", text: msg });
    } catch (e) {
      setStatus({ type: "error", text: String(e) });
    } finally {
      setBusy(false);
    }
  }, [webdav, isConfigured]);

  const handleRestore = useCallback(async () => {
    if (!isConfigured) return;
    const yes = window.confirm(
      "恢复备份将覆盖本地数据库（包括阅读进度和书库列表）。\n\n确定要继续吗？"
    );
    if (!yes) return;
    setBusy(true);
    setStatus({ type: "info", text: "正在恢复..." });
    try {
      const msg = await invoke<string>("restore_from_webdav", {
        url: webdav.url,
        username: webdav.username,
        password: webdav.password,
      });
      setStatus({ type: "ok", text: msg + "\n建议重启应用以确保数据一致。" });
    } catch (e) {
      setStatus({ type: "error", text: String(e) });
    } finally {
      setBusy(false);
    }
  }, [webdav, isConfigured]);

  return (
    <div className="space-y-8">
      <div className="section-rule pb-5">
        <div className="data-label mb-3">Sync</div>
        <h2 className="text-3xl font-semibold uppercase tracking-[0.08em] text-text-primary">
          WebDAV 备份
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-text-secondary">
          通过 WebDAV 协议将阅读进度和书库索引备份到你的私有网盘（坚果云 / Nextcloud / 自建 NAS 等）。
        </p>
      </div>

      {/* WebDAV 配置 */}
      <div className="space-y-4">
        <div className="data-label">Connection</div>
        <div className="panel-frame rounded-[var(--radius-sm)] p-5 space-y-4">
          <InputField
            label="WebDAV 地址"
            placeholder="https://dav.jianguoyun.com/dav/"
            value={webdav.url}
            onChange={(v) => setWebDav({ url: v })}
          />
          <InputField
            label="用户名"
            placeholder="your@email.com"
            value={webdav.username}
            onChange={(v) => setWebDav({ username: v })}
          />
          <InputField
            label="密码 / 应用专用密码"
            placeholder="••••••••"
            type="password"
            value={webdav.password}
            onChange={(v) => setWebDav({ password: v })}
          />
        </div>
      </div>

      {/* 操作按钮 */}
      <div className="space-y-4">
        <div className="data-label">Actions</div>
        <div className="flex flex-wrap gap-3">
          <ActionButton
            icon={Wifi}
            label="测试连接"
            onClick={handleTest}
            disabled={busy || !isConfigured}
          />
          <ActionButton
            icon={CloudUpload}
            label="备份到云端"
            onClick={handleBackup}
            disabled={busy || !isConfigured}
            accent
          />
          <ActionButton
            icon={CloudDownload}
            label="从云端恢复"
            onClick={handleRestore}
            disabled={busy || !isConfigured}
            danger
          />
        </div>

        {!isConfigured && (
          <p className="text-[12px] text-text-tertiary">
            请先填写 WebDAV 地址后再进行操作。
          </p>
        )}

        {status && (
          <div
            className={`panel-frame rounded-[var(--radius-sm)] px-4 py-3 text-sm ${
              status.type === "ok"
                ? "text-green-400"
                : status.type === "error"
                  ? "text-red-400"
                  : "text-text-secondary"
            }`}
          >
            {status.text}
          </div>
        )}
      </div>

      {/* 说明 */}
      <div className="space-y-4">
        <div className="data-label">Details</div>
        <div className="panel-frame rounded-[var(--radius-sm)] p-5">
          <div className="text-sm font-medium text-text-primary">备份内容</div>
          <ul className="mt-2 text-[12px] text-text-tertiary leading-6 list-disc list-inside space-y-1">
            <li>书库索引数据库（书籍记录、阅读进度、书库路径）</li>
            <li>远程路径：<code className="text-text-secondary">{`<WebDAV>/yomu-backup/library.db`}</code></li>
            <li>封面图片和页面缓存不备份（可从源文件重新生成）</li>
            <li>恢复后建议重启应用，以确保新数据库生效</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

function InputField({
  label,
  placeholder,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-[12px] text-text-tertiary mb-1.5">{label}</label>
      <input
        type={type}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full border border-border bg-[#0d0d0d] px-3 py-2.5 text-sm text-text-primary placeholder:text-text-muted focus:border-[var(--color-accent-border)] focus:outline-none"
      />
    </div>
  );
}

function ActionButton({
  icon: Icon,
  label,
  onClick,
  disabled,
  accent,
  danger,
}: {
  icon: React.ComponentType<{ size?: number }>;
  label: string;
  onClick: () => void;
  disabled?: boolean;
  accent?: boolean;
  danger?: boolean;
}) {
  const cls = accent
    ? "border-accent-border bg-accent-light hover:bg-accent/20"
    : danger
      ? "border-border hover:border-red-400/40 hover:bg-red-500/10 hover:text-red-300"
      : "border-border hover:border-accent-border hover:bg-bg-hover hover:text-text-primary";
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 border px-4 py-2.5 text-sm text-text-secondary transition-colors disabled:opacity-40 disabled:cursor-not-allowed ${cls}`}
    >
      <Icon size={16} />
      {label}
    </button>
  );
}
