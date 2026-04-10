import { useCallback, useEffect, useMemo, useRef, forwardRef } from "react";
import { Virtuoso, type VirtuosoHandle } from "react-virtuoso";
import { AnimatePresence, motion } from "motion/react";
import type { ReadingDirection, FitMode } from "@/stores/settings";
import { getPageUrl } from "@/lib/comic-url";
import { ReaderPageImage } from "./ReaderPageImage";
import { ReaderDoublePageSpread } from "./ReaderDoublePageSpread";

const RENDER_BUFFER = 2;

interface ReaderScrollViewProps {
  bookHash: string;
  totalPages: number;
  fitMode: FitMode;
  initialPage: number;
  scrollToPage: number;
  scrollRequestId: number;
}

/** 卷轴模式视图：用 react-virtuoso 虚拟化渲染，只在视口附近创建 DOM 节点（修 P0-1） */
export const ReaderScrollView = forwardRef<HTMLDivElement, ReaderScrollViewProps>(
  function ReaderScrollView({ bookHash, totalPages, fitMode, initialPage, scrollToPage, scrollRequestId }, ref) {
    const virtuosoRef = useRef<VirtuosoHandle>(null);
    const scrollerRef = useRef<HTMLDivElement | null>(null);

    // 初始定位
    useEffect(() => {
      if (initialPage > 0 && virtuosoRef.current) {
        virtuosoRef.current.scrollToIndex({ index: initialPage, align: "start", behavior: "auto" });
      }
    }, [initialPage]);

    // 外部跳转请求（slider 等）
    useEffect(() => {
      if (scrollRequestId === 0) return;
      virtuosoRef.current?.scrollToIndex({ index: scrollToPage, align: "start", behavior: "smooth" });
    }, [scrollRequestId, scrollToPage]);

    return (
      <Virtuoso
        ref={virtuosoRef}
        totalCount={totalPages}
        overscan={800}
        scrollerRef={(el) => {
          if (el instanceof HTMLDivElement) {
            scrollerRef.current = el;
            if (typeof ref === "function") ref(el);
            else if (ref) ref.current = el;
          }
        }}
        className="flex-1 min-h-0"
        itemContent={(index) => (
          <div data-page-index={index} className="flex items-center justify-center">
            <ReaderPageImage bookHash={bookHash} pageIndex={index} mode="scroll" fitMode={fitMode} lazy />
          </div>
        )}
      />
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
    const leftPageIndex = isRTL ? currentSlot * 2 + 1 : currentSlot * 2;
    const rightPageIndex = isRTL ? currentSlot * 2 : currentSlot * 2 + 1;
    const needsScroll = fitMode === "width";
    const containerOverflow = needsScroll ? "overflow-y-auto overflow-x-hidden" : "overflow-hidden";

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
