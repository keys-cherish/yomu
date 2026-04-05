/** 搜索页面说明 */
import { Route } from "@/routes/search";
import { Search as SearchIcon } from "lucide-react";

/**
 * 搜索页面组件
 * @returns 渲染搜索界面
 */
export function SearchPage() {
  const search = Route.useSearch();

  return (
    <div>
      <h1 className="text-xl font-semibold text-text-primary mb-4">搜索</h1>
      <div className="relative max-w-md">
        <SearchIcon
          size={16}
          className="absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary"
        />
        <input
          type="text"
          placeholder="搜索书籍..."
          defaultValue={search.q}
          className="w-full pl-9 pr-4 py-2 text-sm bg-bg-base border border-border rounded-[var(--radius-sm)] text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent transition-colors"
        />
      </div>
      <p className="text-sm text-text-tertiary mt-4">搜索功能将在后续阶段实现。</p>
    </div>
  );
}
