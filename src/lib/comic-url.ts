/** 漫画资源协议 URL 构造模块 */

/**
 * Tauri v2 自定义协议 URL
 * Windows: http://comic.localhost/...
 * macOS/Linux: comic://localhost/...
 */
const IS_WINDOWS = navigator.userAgent.includes("Windows");
const PROTOCOL_BASE = IS_WINDOWS
  ? "http://comic.localhost"
  : "comic://localhost";

/**
 * 构造漫画页面图片 URL（Tauri 资源协议，零拷贝）
 * @param bookHash 漫画哈希值
 * @param pageIndex 页面索引
 * @param quality 图片质量
 * @returns 资源 URL
 */
export function getPageUrl(
  bookHash: string,
  pageIndex: number,
  quality: "high" | "low" = "high"
): string {
  // 低清参数用于低配模式下减少传输与解码压力
  const qualityParam = quality === "low" ? "?quality=low" : "";
  return `${PROTOCOL_BASE}/page/${bookHash}/${pageIndex}${qualityParam}`;
}

/**
 * 构造封面图片 URL
 * @param bookHash 漫画哈希值
 * @returns 封面 URL
 */
export function getCoverUrl(bookHash: string): string {
  return `${PROTOCOL_BASE}/cover/${bookHash}`;
}
