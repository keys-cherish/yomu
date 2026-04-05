import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getPageUrl } from "@/lib/comic-url";
import type { FitMode } from "@/stores/settings";

interface ReaderDoublePageSpreadProps {
  bookHash: string;
  leftPageIndex: number;
  rightPageIndex: number;
  totalPages: number;
  fitMode: FitMode;
}

/** 双页模式下的跨页布局组件 */
export function ReaderDoublePageSpread({
  bookHash,
  leftPageIndex,
  rightPageIndex,
  totalPages,
  fitMode,
}: ReaderDoublePageSpreadProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerSize, setContainerSize] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [pageSizes, setPageSizes] = useState<Record<number, { w: number; h: number }>>({});

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        setContainerSize({ w: width, h: height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const hasLeft = leftPageIndex >= 0 && leftPageIndex < totalPages;
  const hasRight = rightPageIndex >= 0 && rightPageIndex < totalPages;

  const handleLoad = useCallback((pageIndex: number, img: HTMLImageElement) => {
    setPageSizes((prev) => ({
      ...prev,
      [pageIndex]: { w: img.naturalWidth, h: img.naturalHeight },
    }));
  }, []);

  const currentPages = useMemo(() => {
    const set = new Set<number>();
    if (hasLeft) set.add(leftPageIndex);
    if (hasRight) set.add(rightPageIndex);
    return set;
  }, [leftPageIndex, rightPageIndex, hasLeft, hasRight]);

  const prevPagesRef = useRef(currentPages);
  useEffect(() => {
    if (prevPagesRef.current !== currentPages) {
      setPageSizes((prev) => {
        const next: Record<number, { w: number; h: number }> = {};
        for (const p of currentPages) {
          if (prev[p]) next[p] = prev[p];
        }
        return next;
      });
      prevPagesRef.current = currentPages;
    }
  }, [currentPages]);

  const leftSize = hasLeft ? pageSizes[leftPageIndex] ?? null : null;
  const rightSize = hasRight ? pageSizes[rightPageIndex] ?? null : null;
  const isSinglePage = (hasLeft && !hasRight) || (!hasLeft && hasRight);

  const layout = useMemo(() => {
    const leftRatio = leftSize ? leftSize.w / leftSize.h : null;
    const rightRatio = rightSize ? rightSize.w / rightSize.h : null;
    if ((hasLeft && !leftRatio) || (hasRight && !rightRatio)) return null;
    return { lr: leftRatio ?? 0, rr: rightRatio ?? 0 };
  }, [leftSize, rightSize, hasLeft, hasRight]);

  const isWidth = fitMode === "width";
  const isContain = fitMode === "contain";
  const wrapperCls = isWidth
    ? "flex w-full"
    : isContain
      ? "flex h-full w-full justify-around items-center"
      : "flex h-full justify-center items-center";

  const imgStyles = useMemo(() => {
    if (!layout || containerSize.w === 0) return { left: undefined, right: undefined };
    const { lr, rr } = layout;
    const cw = containerSize.w;
    const ch = containerSize.h;
    const singleR = lr || rr;

    if (isWidth) {
      if (isSinglePage) {
        const style = { width: cw, height: cw / singleR } as React.CSSProperties;
        return { left: lr ? style : undefined, right: rr ? style : undefined };
      }
      const h = cw / (lr + rr);
      return {
        left: { width: lr * h, height: h } as React.CSSProperties,
        right: { width: rr * h, height: h } as React.CSSProperties,
      };
    }

    if (isContain) {
      if (isSinglePage) {
        const h = Math.min(ch, cw / singleR);
        const style = { width: singleR * h, height: h } as React.CSSProperties;
        return { left: lr ? style : undefined, right: rr ? style : undefined };
      }
      const h = Math.min(ch, cw / (lr + rr));
      return {
        left: { width: lr * h, height: h } as React.CSSProperties,
        right: { width: rr * h, height: h } as React.CSSProperties,
      };
    }

    const h = ch;
    if (isSinglePage) {
      const style = { width: singleR * h, height: h } as React.CSSProperties;
      return { left: lr ? style : undefined, right: rr ? style : undefined };
    }
    return {
      left: { width: lr * h, height: h } as React.CSSProperties,
      right: { width: rr * h, height: h } as React.CSSProperties,
    };
  }, [layout, containerSize, isWidth, isContain, isSinglePage]);

  return (
    <div ref={containerRef} className={wrapperCls}>
      {hasLeft && (
        <ReaderDoublePageImage
          key={`dbl-${leftPageIndex}`}
          src={getPageUrl(bookHash, leftPageIndex)}
          alt={`Page ${leftPageIndex + 1}`}
          style={imgStyles.left}
          onNaturalSize={(img) => handleLoad(leftPageIndex, img)}
        />
      )}
      {hasRight && (
        <ReaderDoublePageImage
          key={`dbl-${rightPageIndex}`}
          src={getPageUrl(bookHash, rightPageIndex)}
          alt={`Page ${rightPageIndex + 1}`}
          style={imgStyles.right}
          onNaturalSize={(img) => handleLoad(rightPageIndex, img)}
        />
      )}
    </div>
  );
}

function ReaderDoublePageImage({
  src,
  alt,
  style,
  onNaturalSize,
}: {
  src: string;
  alt: string;
  style?: React.CSSProperties;
  onNaturalSize: (img: HTMLImageElement) => void;
}) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const handleLoad = useCallback(
    (e: React.SyntheticEvent<HTMLImageElement>) => {
      setLoaded(true);
      onNaturalSize(e.currentTarget);
    },
    [onNaturalSize]
  );

  if (error) {
    return (
      <div className="flex items-center justify-center w-[150px] h-[300px] bg-white/5 rounded-[var(--radius-sm)] text-white/30 text-sm">
        加载失败
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={`transition-opacity duration-150 block ${loaded ? "opacity-100" : "opacity-0"}`}
      style={style}
      onLoad={handleLoad}
      onError={() => setError(true)}
      draggable={false}
    />
  );
}
