/** 书籍详情页说明 */
import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Route } from "@/routes/book.$bookId";
import { ArrowLeft, BookOpen } from "lucide-react";
import { useNavigate } from "@tanstack/react-router";
import { getCoverUrl } from "@/lib/comic-url";

interface Book {
  id: number;
  hash: string;
  title: string;
  path: string;
  file_size: number | null;
  page_count: number | null;
  format: string;
  read_progress: number;
  is_favorite: boolean;
  added_at: number;
  series_name: string | null;
}

/**
 * 书籍详情页组件
 * 展示封面图、元数据信息和继续阅读入口
 */
export function BookDetailPage() {
  const { bookId } = Route.useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState<Book | null>(null);
  const [coverLoaded, setCoverLoaded] = useState(false);

  useEffect(() => {
    invoke<Book>("get_book_by_hash", { hash: bookId })
      .then(setBook)
      .catch((e) => console.error("Failed to load book:", e));
  }, [bookId]);

  if (!book) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="text-text-secondary text-sm">加载中...</div>
      </div>
    );
  }

  const progress =
    book.page_count && book.page_count > 0
      ? Math.round((book.read_progress / book.page_count) * 100)
      : 0;

  const fileSizeMB =
    book.file_size != null ? (book.file_size / 1024 / 1024).toFixed(1) : null;

  const FORMAT_LABELS: Record<string, string> = {
    cbz: "CBZ",
    epub: "EPUB",
    mobi: "MOBI",
  };

  return (
    <div className="space-y-8">
      <button
        onClick={() => navigate({ to: "/library" })}
        className="inline-flex items-center gap-2 border border-transparent px-3 py-2 text-sm text-text-secondary transition-colors hover:border-border hover:bg-bg-hover hover:text-text-primary"
      >
        <ArrowLeft size={16} />
        返回书架
      </button>

      <div className="grid gap-8 xl:grid-cols-[240px_minmax(0,1fr)]">
        {/* 左侧：封面 */}
        <div className="flex flex-col items-center gap-4">
          <div className="w-[240px] aspect-[2/3] rounded-[var(--radius-md)] overflow-hidden bg-bg-skeleton relative">
            <img
              src={getCoverUrl(book.hash)}
              alt={book.title}
              className={`w-full h-full object-cover transition-opacity duration-200 ${coverLoaded ? "opacity-100" : "opacity-0"}`}
              onLoad={() => setCoverLoaded(true)}
              draggable={false}
            />
            {!coverLoaded && <div className="absolute inset-0 skeleton" />}
          </div>
          <button
            onClick={() =>
              navigate({
                to: "/reader/$bookId",
                params: { bookId: book.hash },
                search: { page: book.read_progress, zoom: 1 },
              })
            }
            className="w-[240px] inline-flex items-center justify-center gap-2 border border-accent-border bg-accent-light py-3 text-sm font-medium text-text-primary transition-colors hover:bg-accent/20"
          >
            <BookOpen size={16} />
            {book.read_progress > 0 ? "继续阅读" : "开始阅读"}
          </button>
        </div>

        {/* 右侧：元数据 */}
        <div className="space-y-6">
          <div className="section-rule pb-5">
            <div className="data-label mb-3">Record</div>
            <h1 className="text-3xl font-semibold text-text-primary break-all">
              {book.title}
            </h1>
            {book.series_name && (
              <div className="mt-2 text-sm text-accent">
                系列: {book.series_name}
              </div>
            )}
          </div>

          <div className="grid gap-px overflow-hidden border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
            <MetaCell label="Format" value={FORMAT_LABELS[book.format] ?? book.format.toUpperCase()} />
            <MetaCell label="Pages" value={book.page_count != null ? `${book.page_count} 页` : "未知"} />
            <MetaCell label="Progress" value={`${progress}%（第 ${book.read_progress + 1} 页）`} />
            <MetaCell label="File Size" value={fileSizeMB != null ? `${fileSizeMB} MB` : "未知"} />
            <MetaCell label="Added" value={new Date(book.added_at * 1000).toLocaleDateString()} />
            <MetaCell label="Hash" value={book.hash.slice(0, 16) + "…"} mono />
          </div>

          {/* 文件路径 */}
          <div className="panel-frame rounded-[var(--radius-sm)] p-4">
            <div className="data-label mb-2">File Path</div>
            <p className="break-all font-mono text-xs leading-6 text-text-secondary">
              {book.path}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function MetaCell({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="bg-bg-surface-2 p-4">
      <div className="data-label">{label}</div>
      <div className={`mt-2 text-sm font-medium text-text-primary ${mono ? "font-mono" : ""}`}>
        {value}
      </div>
    </div>
  );
}
