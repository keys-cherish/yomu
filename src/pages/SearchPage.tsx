/** 搜索页面说明 */
import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useNavigate } from "@tanstack/react-router";
import { Route } from "@/routes/search";
import { Search as SearchIcon, X } from "lucide-react";
import { BookCoverCard } from "@/components/BookCoverCard";

interface Book {
  id: number;
  hash: string;
  title: string;
  format: string;
  page_count: number | null;
  read_progress: number;
  series_name: string | null;
}

/**
 * 搜索页面组件
 * 标题模糊搜索（前端过滤，后续可换成后端 FTS）
 */
export function SearchPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [allBooks, setAllBooks] = useState<Book[]>([]);
  const [query, setQuery] = useState(search.q);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    invoke<Book[]>("get_books").then(setAllBooks).catch(() => {});
  }, []);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const results = query.trim()
    ? allBooks.filter((b) => b.title.toLowerCase().includes(query.trim().toLowerCase()))
    : [];

  const handleClear = useCallback(() => {
    setQuery("");
    inputRef.current?.focus();
  }, []);

  return (
    <div className="space-y-8">
      <div className="section-rule pb-6">
        <div className="data-label mb-3">Retrieval</div>
        <h1 className="text-4xl font-semibold uppercase tracking-[0.08em] text-text-primary">
          搜索
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-text-secondary">
          在书库中按标题搜索漫画与电子书。
        </p>
      </div>

      <div className="panel-frame max-w-3xl rounded-[var(--radius-lg)] p-5 md:p-6">
        <div className="data-label mb-4">Query</div>
        <div className="relative">
          <SearchIcon
            size={16}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-text-tertiary"
          />
          <input
            ref={inputRef}
            type="text"
            placeholder="搜索书籍标题…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full border border-border bg-[#0d0d0d] py-4 pl-12 pr-12 text-sm tracking-[0.03em] text-text-primary placeholder:text-text-muted focus:border-[var(--color-accent-border)] focus:outline-none"
          />
          {query && (
            <button
              onClick={handleClear}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* 搜索结果 */}
      {query.trim() && (
        <div className="space-y-4">
          <div className="text-sm text-text-secondary">
            {results.length > 0
              ? `找到 ${results.length} 个结果`
              : "没有找到匹配的书籍"}
          </div>
          {results.length > 0 && (
            <div className="grid grid-cols-[repeat(auto-fill,160px)] gap-6">
              {results.map((book) => (
                <BookCoverCard
                  key={book.id}
                  hash={book.hash}
                  title={book.title}
                  format={book.format}
                  pageCount={book.page_count}
                  readProgress={book.read_progress}
                  onClick={() => {
                    navigate({
                      to: "/reader/$bookId",
                      params: { bookId: book.hash },
                      search: { page: book.read_progress, zoom: 1 },
                    });
                  }}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
