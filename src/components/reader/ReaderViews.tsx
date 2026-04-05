import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  forwardRef,
} from "react";
import { AnimatePresence, motion } from "motion/react";
import { getPageUrl } from "@/lib/comic-url";
import type { ReadingDirection, ReadingMode, FitMode } from "@/stores/settings";

const RENDER_BUFFER = 2;

interface ReaderScrollViewProps {
  bookHash: string;
  totalPages: number;
  fitMode: FitMode;
  initialPage: number;
  scrollToPage: number;
  scrollRequestId: number;
}

/** 卷轴模式视图：按顺序渲染所有页面，并响应外部滚动定位请求 */
export const ReaderScrollView = forwardRef<HTMLDivElement, ReaderScrollViewProps>(
  function ReaderScrollView({ bookHash, totalPages, fitMode, initialPage, scrollToPage, scrollRequestId }, ref) {
    const internalRef = useRef<HTMLDivElement>(null);
    const didScrollRef = useRef(false);
    const scrollToPageRef = useRef(scrollToPage);
    scrollToPageRef.current = scrollToPage;

    const scrollToElement = useCallback((container: HTMLDivElement, pageIndex: number, instant: boolean) => {
      const target = container.querySelector(`[data-page-index="${pageIndex}"]`);
      if (target) {
        target.scrollIntoView({ behavior: instant ? ("instant" as ScrollBehavior) : "smooth" });
      }
    }, []);

    useEffect(() => {
      if (didScrollRef.current || initialPage <= 0) return;
      const container = internalRef.current;
      if (!container) return;
      const target = container.querySelector(`[data-page-index="${initialPage}"]`);
      if (target) {
        scrollToElement(container, initialPage, true);
        didScrollRef.current = true;
      } else {
        const timer = setTimeout(() => {
          if (internalRef.current) {
            scrollToElement(internalRef.current, initialPage, true);
          }
          didScrollRef.current = true;
        }, 100);
        return () => clearTimeout(timer);
      }
    }, [initialPage, scrollToElement]);

    useEffect(() => {
      if (scrollRequestId === 0) return;
      const container = internalRef.current;
      if (!container) return;
      scrollToElement(container, scrollToPageRef.current, false);
    }, [scrollRequestId, scrollToElement]);

    return (
      <div
        ref={(node) => {
          internalRef.current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) ref.current = node;
        }}
        className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden"
      >
        {Array.from({ length: totalPages }).map((_, i) => (
          <div key={i} data-page-index={i} className="flex items-center justify-center">
            <ReaderPageImage bookHash={bookHash} pageIndex={i} mode="scroll" fitMode={fitMode} lazy />
          </div>
        ))}
      </div>
    );
  }
);

interface ReaderPagedViewProps {
  bookHash: string;
  currentPage: number;
  totalPages: number;
  mode: "single" | "double";
  direction: ReadingDirection;
  fitMode: FitMode;
  slideDirection: "left" | "right" | "none";
  onSlideComplete: () => void;
}

/** 分页模式视图：负责单页/双页布局、翻页动画与邻页预渲染 */
export const ReaderPagedView = forwardRef<HTMLDivElement, ReaderPagedViewProps>(
  function ReaderPagedView(
    { bookHash, currentPage, totalPages, mode, direction, fitMode, slideDirection, onSlideComplete },
    ref
  ) {
    const isRTL = direction === "rtl";
    const internalRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      internalRef.current?.scrollTo(0, 0);
    }, [currentPage]);

    const pages = useMemo(() => {
      if (mode === "single") {
        const result: number[] = [];
        for (
          let i = Math.max(0, currentPage - RENDER_BUFFER);
          i <= Math.min(totalPages - 1, currentPage + RENDER_BUFFER);
          i++
        ) {
          result.push(i);
        }
        return result;
      }

      const currentSlot = Math.floor(currentPage / 2);
      const result: number[] = [];
      for (
        let slot = Math.max(0, currentSlot - RENDER_BUFFER);
        slot <= Math.min(Math.ceil(totalPages / 2) - 1, currentSlot + RENDER_BUFFER);
        slot++
      ) {
        result.push(slot * 2);
        if (slot * 2 + 1 < totalPages) {
          result.push(slot * 2 + 1);
        }
      }
      return result;
    }, [currentPage, totalPages, mode]);

    const currentSlot = mode === "double" ? Math.floor(currentPage / 2) : currentPage;

    const slideVariants = {
      enter: (dir: "left" | "right" | "none") => ({
        x: dir === "left" ? "100%" : dir === "right" ? "-100%" : 0,
        opacity: dir === "none" ? 0 : 1,
      }),
      center: { x: 0, opacity: 1 },
      exit: (dir: "left" | "right" | "none") => ({
        x: dir === "left" ? "-100%" : dir === "right" ? "100%" : 0,
        opacity: dir === "none" ? 0 : 1,
      }),
    };

    const leftPageIndex = isRTL ? currentSlot * 2 + 1 : currentSlot * 2;
    const rightPageIndex = isRTL ? currentSlot * 2 : currentSlot * 2 + 1;
    const needsScroll = fitMode === "width";
    const containerOverflow = needsScroll ? "overflow-y-auto overflow-x-hidden" : "overflow-hidden";

    return (
      <div
        ref={(node) => {
          internalRef.current = node;
          if (typeof ref === "function") ref(node);
          else if (ref) ref.current = node;
        }}
        className={`flex-1 min-h-0 relative ${containerOverflow}`}
      >
        <AnimatePresence initial={false} mode="popLayout" custom={slideDirection} onExitComplete={onSlideComplete}>
          <motion.div
            key={`page-${currentSlot}`}
            custom={slideDirection}
            variants={slideVariants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={
              slideDirection === "none"
                ? { duration: 0.15, ease: "easeOut" }
                : { duration: 0.25, ease: [0.32, 0.72, 0, 1] }
            }
            className={
              needsScroll
                ? mode === "double"
                  ? "flex items-start justify-center w-full"
                  : "flex items-start justify-center"
                : "absolute inset-0 flex items-center justify-center"
            }
          >
            {mode === "single" ? (
              <ReaderPageImage bookHash={bookHash} pageIndex={currentPage} mode="single" fitMode={fitMode} />
            ) : (
              <ReaderDoublePageSpread
                bookHash={bookHash}
                leftPageIndex={leftPageIndex}
                rightPageIndex={rightPageIndex}
                totalPages={totalPages}
                fitMode={fitMode}
              />
            )}
          </motion.div>
        </AnimatePresence>

        <div className="sr-only" aria-hidden="true">
          {pages
            .filter((p) => {
              if (mode === "single") return p !== currentPage;
              const slot = Math.floor(p / 2);
              return slot !== currentSlot;
            })
            .map((p) => (
              <img key={`prerender-${p}`} src={getPageUrl(bookHash, p)} alt="" />
            ))}
        </div>
      </div>
    );
  }
);

interface ReaderDoublePageSpreadProps {
  bookHash: string;
  leftPageIndex: number;
  rightPageIndex: number;
  totalPages: number;
  fitMode: FitMode;
}

function ReaderDoublePageSpread({
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

interface ReaderPageImageProps {
  bookHash: string;
  pageIndex: number;
  mode: ReadingMode;
  fitMode: FitMode;
  lazy?: boolean;
}

function getImageClasses(mode: ReadingMode, fitMode: FitMode, loaded: boolean): string {
  const opacityCls = `transition-opacity duration-150 ${loaded ? "opacity-100" : "opacity-0"}`;

  if (mode === "scroll") {
    return `w-full h-auto ${opacityCls}`;
  }

  switch (fitMode) {
    case "width":
      return `w-full h-auto ${opacityCls}`;
    case "contain":
      return `max-h-full max-w-full object-contain ${opacityCls}`;
    case "height":
    default:
      return `h-full w-auto ${opacityCls}`;
  }
}

function ReaderPageImage({ bookHash, pageIndex, mode, fitMode, lazy }: ReaderPageImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const url = getPageUrl(bookHash, pageIndex);
  const imgClasses = getImageClasses(mode, fitMode, loaded);

  if (error) {
    return (
      <div className="flex items-center justify-center w-[300px] h-[400px] bg-white/5 rounded-[var(--radius-sm)] text-white/30 text-sm">
        加载失败 · 第 {pageIndex + 1} 页
      </div>
    );
  }

  const loadingAttr = lazy ? "lazy" : "eager";
  const isWidthFit = fitMode === "width";
  const containerCls =
    mode === "scroll"
      ? "relative w-full flex items-center justify-center"
      : isWidthFit
        ? "relative w-full flex items-center justify-center"
        : "relative h-full w-full flex items-center justify-center";

  return (
    <div className={containerCls}>
      <img
        src={url}
        alt={`Page ${pageIndex + 1}`}
        loading={loadingAttr}
        className={imgClasses}
        onLoad={() => setLoaded(true)}
        onError={() => setError(true)}
        draggable={false}
      />
      {!loaded && (
        <div className={`absolute inset-0 flex items-center justify-center ${mode === "scroll" ? "min-h-[50vh]" : ""}`}>
          <div className="bg-white/5 rounded-[var(--radius-sm)] animate-pulse w-[200px] h-[300px]" />
        </div>
      )}
    </div>
  );
}
