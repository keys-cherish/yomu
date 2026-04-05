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
    <aside className="flex flex-col w-[220px] min-w-[220px] h-full bg-bg-surface border-r border-border shrink-0">
      {/* 导航菜单 */}
      <nav className="flex-1 py-4">
        <div className="space-y-0.5">
          {navItems.map((item) => (
            <Link
              key={item.label}
              to={item.to}
              search={item.search}
              className="flex items-center gap-[10px] px-5 py-2 text-sm text-text-secondary hover:bg-bg-hover transition-colors duration-150"
              activeProps={{
                className: "!text-accent !font-semibold !bg-accent-light/20",
              }}
            >
              <item.icon size={18} className="opacity-70 shrink-0" />
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>

      {/* 分割线 */}
      <div className="mx-5 border-t border-border" />

      {/* 底部功能项 */}
      <div className="py-4 space-y-0.5">
        {bottomItems.map((item) => (
          <Link
            key={item.label}
            to={item.to}
            className="flex items-center gap-[10px] px-5 py-2 text-sm text-text-secondary hover:bg-bg-hover transition-colors duration-150"
            activeProps={{
              className: "!text-accent !font-semibold !bg-accent-light/20",
            }}
          >
            <item.icon size={18} className="opacity-70 shrink-0" />
            <span>{item.label}</span>
          </Link>
        ))}
      </div>
    </aside>
  );
}
