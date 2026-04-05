/** 通用设置路由说明 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/settings/general")({
  component: GeneralSettings,
});

/**
 * 通用设置组件
 * @returns 渲染通用设置项
 */
function GeneralSettings() {
  return (
    <div>
      <h2 className="text-lg font-semibold text-text-primary mb-4">通用设置</h2>
      <p className="text-sm text-text-secondary">通用设置内容将在后续阶段实现。</p>
    </div>
  );
}
