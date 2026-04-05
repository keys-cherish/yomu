/** 应用外壳组件 */
import { TitleBar } from "./TitleBar";
import { Sidebar } from "./Sidebar";
import { AnimatedOutlet } from "@/components/AnimatedOutlet";
import { useSettingsStore } from "@/stores/settings";

/**
 * 应用外壳组件
 * 负责应用的基础布局，包括标题栏、侧边栏和主内容显示区
 */
export function AppShell() {
  // 获取侧边栏折叠状态
  const sidebarCollapsed = useSettingsStore((s) => s.sidebarCollapsed);

  return (
    <div className="flex flex-col h-screen bg-bg-base overflow-hidden">
      {/* 顶部标题栏 */}
      <TitleBar />
      <div className="flex flex-1 overflow-hidden">
        {/* 侧边栏 */}
        <Sidebar collapsed={sidebarCollapsed} />
        
        {/* 主内容区域 */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="bg-bg-surface rounded-[var(--radius-lg)] shadow-[var(--shadow-md)] min-h-full p-6">
            {/* 路由内容出口（带过渡动画） */}
            <AnimatedOutlet />
          </div>
        </main>
      </div>
    </div>
  );
}
