/** 阅读器预加载钩子模块 */

import { useEffect, useRef } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getPageUrl } from "@/lib/comic-url";
import { usePerformanceConfig } from "./usePerformanceConfig";

/**
 * 阅读器方向感知预加载钩子
 * 根据阅读方向预加载前后页面。
 * 使用浏览器原生的 Image 对象进行预加载，支持零拷贝。
 * 同时在后台预热 Rust 磁盘缓存。
 * @param bookHash 漫画哈希值
 * @param currentPage 当前页码
 * @param totalPages 总页数
 */
export function usePreloader(
  bookHash: string,
  currentPage: number,
  totalPages: number
) {
  const prevPage = useRef(currentPage);
  const perfConfig = usePerformanceConfig();
  const preloadedSet = useRef(new Set<string>());

  useEffect(() => {
    if (totalPages === 0) return;

    // 判断阅读方向
    const direction =
      currentPage >= prevPage.current ? "forward" : "backward";
    prevPage.current = currentPage;

    const AHEAD = perfConfig.preloadAhead;
    const BEHIND = perfConfig.preloadBehind;
    const quality: "high" | "low" = perfConfig.isLowSpec ? "low" : "high";

    const pagesToPreload: number[] = [];
    const range =
      direction === "forward"
        ? { ahead: AHEAD, behind: BEHIND }
        : { ahead: BEHIND, behind: AHEAD };

    // 预加载前进方向的页面
    for (let i = 1; i <= range.ahead; i++) {
      const target =
        direction === "forward" ? currentPage + i : currentPage - i;
      if (target >= 0 && target < totalPages) pagesToPreload.push(target);
    }
    // 预加载后退方向的页面
    for (let i = 1; i <= range.behind; i++) {
      const target =
        direction === "forward" ? currentPage - i : currentPage + i;
      if (target >= 0 && target < totalPages) pagesToPreload.push(target);
    }

    // 使用 Image 对象进行浏览器原生预加载
    for (const page of pagesToPreload) {
      const url = getPageUrl(bookHash, page, quality);
      if (preloadedSet.current.has(url)) continue;
      const img = new Image();
      img.src = url;
      preloadedSet.current.add(url);
    }

    // 后台预热 Rust 磁盘缓存
    invoke("warm_cache", {
      bookHash,
      pageIndices: pagesToPreload,
      maxHeight: perfConfig.imageMaxHeight,
    }).catch(() => {
      // 静默忽略错误 — 缓存预热为最佳实践，非强制要求
    });
  }, [bookHash, currentPage, totalPages, perfConfig]);

  // 当书籍更换时重置预加载集合
  useEffect(() => {
    preloadedSet.current.clear();
  }, [bookHash]);
}
