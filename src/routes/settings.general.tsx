/** 通用设置路由说明 */
import { createFileRoute } from "@tanstack/react-router";
import { useSettingsStore, type ReadingMode, type ReadingDirection, type FitMode } from "@/stores/settings";

export const Route = createFileRoute("/settings/general")({
  component: GeneralSettings,
});

const modeLabels: Record<ReadingMode, string> = { single: "单页", double: "双页", scroll: "卷轴" };
const dirLabels: Record<ReadingDirection, string> = { ltr: "左到右", rtl: "右到左" };
const fitLabels: Record<FitMode, string> = { height: "适高", width: "适宽", contain: "适应" };

function GeneralSettings() {
  const readingMode = useSettingsStore((s) => s.readingMode);
  const setReadingMode = useSettingsStore((s) => s.setReadingMode);
  const readingDirection = useSettingsStore((s) => s.readingDirection);
  const setReadingDirection = useSettingsStore((s) => s.setReadingDirection);
  const fitMode = useSettingsStore((s) => s.fitMode);
  const setFitMode = useSettingsStore((s) => s.setFitMode);
  const sidebarCollapsed = useSettingsStore((s) => s.sidebarCollapsed);
  const toggleSidebar = useSettingsStore((s) => s.toggleSidebar);

  return (
    <div className="space-y-8">
      <div className="section-rule pb-5">
        <div className="data-label mb-3">General</div>
        <h2 className="text-3xl font-semibold uppercase tracking-[0.08em] text-text-primary">
          通用设置
        </h2>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-text-secondary">
          配置阅读默认行为和界面偏好，所有修改实时生效并自动持久化。
        </p>
      </div>

      {/* 阅读默认值 */}
      <div className="space-y-4">
        <div className="data-label">Reading Defaults</div>

        <SettingRow label="默认阅读模式" description="打开新书时使用的阅读模式">
          <SelectButtons
            options={Object.entries(modeLabels).map(([v, l]) => ({ value: v, label: l }))}
            value={readingMode}
            onChange={(v) => setReadingMode(v as ReadingMode)}
          />
        </SettingRow>

        <SettingRow label="默认翻页方向" description="西方漫画从左到右，日本漫画从右到左">
          <SelectButtons
            options={Object.entries(dirLabels).map(([v, l]) => ({ value: v, label: l }))}
            value={readingDirection}
            onChange={(v) => setReadingDirection(v as ReadingDirection)}
          />
        </SettingRow>

        <SettingRow label="默认适配模式" description="图片在阅读器中的显示方式">
          <SelectButtons
            options={Object.entries(fitLabels).map(([v, l]) => ({ value: v, label: l }))}
            value={fitMode}
            onChange={(v) => setFitMode(v as FitMode)}
          />
        </SettingRow>
      </div>

      {/* 界面 */}
      <div className="space-y-4">
        <div className="data-label">Interface</div>

        <SettingRow label="侧边栏" description="控制左侧导航栏的默认展开/收起状态">
          <button
            onClick={toggleSidebar}
            className={`px-4 py-2 text-sm border transition-colors ${
              sidebarCollapsed
                ? "border-border text-text-secondary hover:border-accent-border"
                : "border-accent-border bg-accent-light text-text-primary"
            }`}
          >
            {sidebarCollapsed ? "已折叠" : "已展开"}
          </button>
        </SettingRow>
      </div>
    </div>
  );
}

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <div className="panel-frame flex flex-wrap items-center justify-between gap-4 rounded-[var(--radius-sm)] px-5 py-4">
      <div className="min-w-0">
        <div className="text-sm font-medium text-text-primary">{label}</div>
        <div className="mt-1 text-[12px] text-text-tertiary">{description}</div>
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  );
}

function SelectButtons({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[];
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="flex border border-border divide-x divide-border">
      {options.map((opt) => (
        <button
          key={opt.value}
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 text-[12px] transition-colors ${
            opt.value === value
              ? "bg-accent-light text-text-primary border-accent-border"
              : "text-text-secondary hover:bg-bg-hover hover:text-text-primary"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
