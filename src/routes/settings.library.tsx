/** 书库设置路由说明 */
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/settings/library")({
  component: LibrarySettings,
});

/**
 * 书库设置组件
 * @returns 渲染书库管理相关的设置项
 */
function LibrarySettings() {
  return (
    <div>
      <h2 className="text-lg font-semibold text-text-primary mb-4">书库管理</h2>
      <p className="text-sm text-text-secondary">书库管理将在后续阶段实现。</p>
    </div>
  );
}
