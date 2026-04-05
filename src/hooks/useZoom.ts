/** 阅读器缩放控制钩子模块 */

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

/** 缩放状态接口 */
interface ZoomState {
  scale: number; // 当前缩放比例
  isZoomed: boolean; // 是否处于缩放状态
}

/**
 * useZoom — 为阅读器提供双指捏合缩放和双击缩放功能
 *
 * - 双指捏合：连续缩放 (1x–5x)
 * - 双击：在 1x 和 2x 之间切换
 * - 缩放时：禁用 scroll-snap 以防止意外切换页面
 * - 重置缩放 (≤1.05x)：恢复 scroll-snap
 * @param containerRef 容器 DOM 引用
 * @returns 缩放状态对象
 */
export function useZoom(containerRef: RefObject<HTMLDivElement | null>): ZoomState {
  const [scale, setScale] = useState(1);
  const isZoomed = scale > 1;

  // 捏合缩放追踪
  const initialDistRef = useRef(0);
  const initialScaleRef = useRef(1);

  // 双击追踪
  const lastTapRef = useRef(0);

  // 根据缩放状态开启/关闭滚动吸附 (scroll-snap)
  const setSnap = useCallback(
    (enabled: boolean) => {
      const el = containerRef.current;
      if (!el) return;
      if (enabled) {
        el.style.overflowX = "auto";
        el.style.scrollSnapType = "x mandatory";
      } else {
        el.style.overflowX = "hidden";
        el.style.scrollSnapType = "none";
      }
    },
    [containerRef]
  );

  // 为当前可见页面的图片应用变换
  const applyTransform = useCallback(
    (newScale: number) => {
      const el = containerRef.current;
      if (!el) return;
      // 查找当前处于吸附范围内的子元素
      const children = el.querySelectorAll<HTMLElement>("[data-page-index]");
      for (const child of children) {
        const rect = child.getBoundingClientRect();
        const containerRect = el.getBoundingClientRect();
        // 检查子元素是否在大致可见范围内
        if (
          rect.left < containerRect.right &&
          rect.right > containerRect.left
        ) {
          const img = child.querySelector("img");
          if (img) {
            img.style.transform =
              newScale > 1 ? `scale(${newScale})` : "";
            img.style.transformOrigin = "center center";
          }
        }
      }
    },
    [containerRef]
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const onTouchStart = (e: TouchEvent) => {
      // 双击检测
      if (e.touches.length === 1) {
        const now = Date.now();
        if (now - lastTapRef.current < 300) {
          // 双击：在 1x 和 2x 之间切换
          e.preventDefault();
          const newScale = scale > 1 ? 1 : 2;
          setScale(newScale);
          applyTransform(newScale);
          if (newScale > 1) {
            setSnap(false);
          } else {
            // 重置所有图片变换
            el.querySelectorAll("img").forEach((img) => {
              img.style.transform = "";
            });
            setSnap(true);
          }
        }
        lastTapRef.current = now;
      }

      // 捏合缩放开始
      if (e.touches.length === 2) {
        e.preventDefault();
        setSnap(false);
        const t0 = e.touches[0]!;
        const t1 = e.touches[1]!;
        initialDistRef.current = Math.hypot(
          t0.clientX - t1.clientX,
          t0.clientY - t1.clientY
        );
        initialScaleRef.current = scale;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length === 2) {
        e.preventDefault();
        const t0 = e.touches[0]!;
        const t1 = e.touches[1]!;
        const dist = Math.hypot(
          t0.clientX - t1.clientX,
          t0.clientY - t1.clientY
        );
        const newScale = Math.min(
          5,
          Math.max(1, initialScaleRef.current * (dist / initialDistRef.current))
        );
        setScale(newScale);
        applyTransform(newScale);
      }
    };

    const onTouchEnd = () => {
      if (scale <= 1.05) {
        setScale(1);
        // 重置所有图片变换
        el.querySelectorAll("img").forEach((img) => {
          img.style.transform = "";
        });
        setSnap(true);
      }
    };

    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd);

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [containerRef, scale, setSnap, applyTransform]);

  return { scale, isZoomed };
}
