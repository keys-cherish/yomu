/** 图书馆页面说明 */
import { useCallback, useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { useNavigate } from "@tanstack/react-router";
import { Route } from "@/routes/library";
import { BookCoverCard } from "@/components/BookCoverCard";
import { AddLibraryCard } from "@/components/AddLibraryCard";

interface Book {
  id: number;
  library_id: number | null;
  hash: string;
  title: string;
  path: string;
  file_size: number | null;
  page_count: number | null;
  cover_path: string | null;
  format: string;
  read_progress: number;
  is_favorite: boolean;
  added_at: number;
}

/**
 * 图书馆页面组件
 * @returns 渲染书籍列表和添加书库入口
 */
export function LibraryPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [books, setBooks] = useState<Book[]>([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);

  /**
   * 加载书籍列表
   */
  const loadBooks = useCallback(async () => {
    try {
      const result = await invoke<Book[]>("get_books");
      setBooks(result);
    } catch (e) {
      console.error("Failed to load books:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBooks();
  }, [loadBooks]);

  /**
   * 处理添加书库逻辑
   */
  const handleAddLibrary = useCallback(async () => {
    try {
      const selected = await open({
        directory: true,
        multiple: false,
        title: "选择漫画文件夹",
      });

      if (!selected) return; // 用户取消选择

      setScanning(true);
      await invoke("add_library", { path: selected });
      await loadBooks();
    } catch (e) {
      console.error("Failed to add library:", e);
    } finally {
      setScanning(false);
    }
  }, [loadBooks]);

  // 根据搜索参数对书籍进行排序
  const sortedBooks = [...books].sort((a, b) => {
    switch (search.sort) {
      case "title":
        return a.title.localeCompare(b.title);
      case "added":
        return b.added_at - a.added_at;
      case "recent":
      default:
        return b.added_at - a.added_at;
    }
  });

  return (
    <div>
      {/* 头部区域 */}
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-text-primary">书架</h1>
        <div className="flex items-center gap-3 text-xs text-text-tertiary">
          {scanning && <span className="text-accent">扫描中...</span>}
          <span>{books.length} 本</span>
        </div>
      </div>

      {/* 书籍网格 */}
      {loading ? (
        // 骨架屏加载状态
        <div className="grid grid-cols-[repeat(auto-fill,160px)] gap-6">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="w-[160px]">
              <div className="w-full aspect-[2/3] skeleton rounded-[var(--radius-md)]" />
              <div className="mt-2 h-[14px] w-[80%] skeleton rounded" />
              <div className="mt-1 h-[12px] w-[50%] skeleton rounded" />
            </div>
          ))}
        </div>
      ) : sortedBooks.length === 0 ? (
        // 空状态
        <div className="flex flex-col items-center justify-center py-24 gap-6">
          <div className="text-text-tertiary text-sm">还没有添加任何书籍</div>
          <AddLibraryCard onClick={handleAddLibrary} disabled={scanning} />
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,160px)] gap-6">
          {sortedBooks.map((book) => (
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
          <AddLibraryCard onClick={handleAddLibrary} disabled={scanning} />
        </div>
      )}
    </div>
  );
}
