/** 侧边栏组件 */
import { Link } from "@tanstack/react-router";
import {
  BookOpen,
  Clock,
  Heart,
  Tag,
  Search,
  Settings,
} from "lucide-react";

/** 侧边栏属性 */
interface SidebarProps {
  /** 是否折叠 */
  collapsed: boolean;
}

// 导航菜单配置，对应书架页的不同筛选视图
const navItems = [
  { to: "/library", icon: BookOpen, label: "全部", search: { sort: "recent" as const } },
  { to: "/library", icon: Clock, label: "最近阅读", search: { sort: "recent" as const, tag: "recent" } },
  { to: "/library", icon: Heart, label: "收藏", search: { sort: "recent" as const, tag: "favorite" } },
  { to: "/library", icon: Tag, label: "标签", search: { sort: "recent" as const, tag: "tags" } },
] as const;

// 底部操作项配置，集中放置全局功能入口
const bottomItems = [
  { to: "/search", icon: Search, label: "搜索" },
  { to: "/settings/general", icon: Settings, label: "设置" },
] as const;

/**
 * 侧边栏组件
 * 提供应用的主导航和底部功能入口
 */
export function Sidebar({ collapsed }: SidebarProps) {
  // 折叠状态下直接不渲染侧边栏，保持主内容区最大化
  if (collapsed) return null;

  return (
    <aside className="flex h-full min-w-[248px] w-[248px] shrink-0 flex-col border-r border-[var(--color-border-strong)]/80 bg-bg-surface-2">
      <div className="section-rule px-5 py-5">
        <div className="data-label mb-3">Library Index</div>
        <div className="text-[28px] font-semibold tracking-[0.08em] text-text-primary uppercase">
          Shelf
        </div>
        <p className="mt-2 max-w-[180px] text-sm leading-6 text-text-secondary">
          以更清晰的分区与目录感管理你的本地图书收藏。
        </p>
      </div>

      {/* 导航菜单 */}
      <nav className="flex-1 px-3 py-4">
        <div className="mb-3 px-2 text-[11px] uppercase tracking-[0.24em] text-text-tertiary">
          Sections
        </div>
        <div className="space-y-1.5">
          {navItems.map((item, index) => (
            <Link
              key={item.label}
              to={item.to}
              search={item.search}
              className="group flex items-center justify-between gap-3 border border-transparent px-3 py-3 text-sm text-text-secondary transition-all duration-150 hover:border-border hover:bg-bg-hover hover:text-text-primary"
              activeProps={{
                className: "!border-[var(--color-accent-border)] !bg-accent-light !text-text-primary",
              }}
            >
              <div className="flex items-center gap-3 min-w-0">
                <item.icon size={17} className="shrink-0 opacity-80" />
                <span>{item.label}</span>
              </div>
              <span className="font-mono text-[11px] text-text-tertiary group-hover:text-text-secondary">
                0{index + 1}
              </span>
            </Link>
          ))}
        </div>
      </nav>

      {/* 底部功能项 */}
      <div className="section-rule px-3 py-4">
        <div className="mb-3 px-2 text-[11px] uppercase tracking-[0.24em] text-text-tertiary">
          Utilities
        </div>
        <div className="space-y-1.5">
          {bottomItems.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              className="flex items-center gap-3 border border-transparent px-3 py-3 text-sm text-text-secondary transition-all duration-150 hover:border-border hover:bg-bg-hover hover:text-text-primary"
              activeProps={{
                className: "!border-[var(--color-accent-border)] !bg-accent-light !text-text-primary",
              }}
            >
              <item.icon size={17} className="shrink-0 opacity-80" />
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className="px-5 py-4 text-[11px] uppercase tracking-[0.2em] text-text-muted">
        Yomu / Local Archive
      </div>
    </aside>
  );
}
