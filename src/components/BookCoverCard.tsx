/** 书籍封面卡片组件 */
import { useState } from "react";
import { getCoverUrl } from "@/lib/comic-url";

/** 书籍封面卡片属性 */
interface BookCoverCardProps {
  /** 书籍哈希值 */
  hash: string;
  /** 书籍标题 */
  title: string;
  /** 文件格式 */
  format?: string;
  /** 总页数 */
  pageCount?: number | null;
  /** 阅读进度 */
  readProgress?: number;
  /** 点击事件 */
  onClick?: () => void;
}

// 格式标签显示映射
const FORMAT_LABELS: Record<string, string> = {
  cbz: "CBZ",
  epub: "EPUB",
  mobi: "MOBI",
};

/**
 * 书籍封面卡片组件
 * 用于在库列表中展示书籍的封面图片、标题及阅读状态
 */
export function BookCoverCard({
  hash,
  title,
  format,
  pageCount,
  readProgress = 0,
  onClick,
}: BookCoverCardProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  // 获取封面图片 URL
  const coverUrl = getCoverUrl(hash);
  // 计算已读进度百分比
  const progress = pageCount && pageCount > 0 ? readProgress / pageCount : 0;
  // 获取显示的格式文本
  const formatLabel = format ? FORMAT_LABELS[format] ?? format.toUpperCase() : null;

  return (
    <div
      className="w-[160px] cursor-pointer group"
      onClick={onClick}
    >
      {/* 封面图容器 */}
      <div className="w-full aspect-[2/3] rounded-[var(--radius-md)] overflow-hidden bg-bg-skeleton relative transition-transform duration-200 ease-out group-hover:scale-[1.03] group-active:scale-[0.98]">
        {!error ? (
          <img
            src={coverUrl}
            alt={title}
            className={`w-full h-full object-cover block transition-opacity duration-200 ${
              loaded ? "opacity-100" : "opacity-0"
            }`}
            onLoad={() => setLoaded(true)}
            onError={() => setError(true)}
            draggable={false}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-text-tertiary text-xs">
            无封面
          </div>
        )}

        {/* 加载骨架屏 */}
        {!loaded && !error && (
          <div className="absolute inset-0 skeleton" />
        )}

        {/* 格式标签 */}
        {formatLabel && (
          <div className="absolute top-[6px] right-[6px] px-[6px] py-[1px] rounded text-[10px] font-medium bg-black/50 text-white leading-[16px]">
            {formatLabel}
          </div>
        )}

        {/* 阅读进度条 */}
        {progress > 0 && progress < 1 && (
          <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-black/20">
            <div
              className="h-full bg-accent transition-[width] duration-300"
              style={{ width: `${progress * 100}%` }}
            />
          </div>
        )}
      </div>

      {/* 书籍信息 */}
      <div className="px-[2px] pt-2">
        <div className="text-[13px] font-medium text-text-primary truncate">
          {title}
        </div>
        {pageCount != null && (
          <div className="text-[11px] text-text-tertiary mt-[2px]">
            {pageCount} 页
            {readProgress > 0 && ` · 已读 ${readProgress}`}
          </div>
        )}
      </div>
    </div>
  );
}
