/** 显示设置路由说明 */
import { createFileRoute } from "@tanstack/react-router";
import { useSettingsStore } from "@/stores/settings";

export const Route = createFileRoute("/settings/display")({
  component: DisplaySettings,
});

/**
 * 显示设置组件
 * @returns 渲染显示与性能相关的设置项
 */
function DisplaySettings() {
  const { isLowSpec, toggleLowSpec } = useSettingsStore();

  return (
    <div>
      <h2 className="text-lg font-semibold text-text-primary mb-4">显示与性能</h2>
      <label className="flex items-center gap-3 cursor-pointer">
        <input
          type="checkbox"
          checked={isLowSpec}
          onChange={toggleLowSpec}
          className="w-4 h-4 accent-accent"
        />
        <span className="text-sm text-text-primary">低配模式（Surface Go 等设备推荐开启）</span>
      </label>
      <p className="text-xs text-text-tertiary mt-2">
        低配模式会降低图片分辨率、减少预加载数量、关闭动画效果以提升流畅度。
      </p>
    </div>
  );
}
