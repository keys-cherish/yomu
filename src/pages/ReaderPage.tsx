/** 阅读器页面 — 支持单页/双页/卷轴模式，含底部功能面板 */
import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useNavigate } from "@tanstack/react-router";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  ArrowLeftRight,
  ArrowRightLeft,
  ChevronLeft,
  ChevronRight,
  Columns2,
  FileText,
  Fullscreen,
  RectangleHorizontal,
  RectangleVertical,
  Scroll,
} from "lucide-react";
import { GestureLayer } from "@/components/GestureLayer";
import { ReaderToolbar } from "@/components/reader/ReaderToolbar";
import { ReaderPagedView, ReaderScrollView } from "@/components/reader/ReaderViews";
import type {
  BookInfo,
  ReaderDirectionOption,
  ReaderFitOption,
  ReaderModeOption,
} from "@/components/reader/types";
import { useOrientation } from "@/hooks/useOrientation";
import { usePreloader } from "@/hooks/usePreloader";
import { useZoom } from "@/hooks/useZoom";
import { Route } from "@/routes/reader.$bookId";
import {
  useSettingsStore,
} from "@/stores/settings";

/** 如果跳转距离超过此值，使用即时切换而非滑动动画 */
const SLIDE_THRESHOLD = 3;

/** 阅读器页面组件 */
export function ReaderPage() {
  const { bookId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();

  const [book, setBook] = useState<BookInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(search.page);
  const [previewPage, setPreviewPage] = useState<number | null>(null);
  const [slideDirection, setSlideDirection] = useState<"left" | "right" | "none">("none");
  const [scrollRequestId, setScrollRequestId] = useState(0);
  const [showToolbar, setShowToolbar] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [openMenu, setOpenMenu] = useState<"mode" | "dir" | "fit" | null>(null);

  const isDraggingSlider = useRef(false);
  const sliderCommitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isExternalNavRef = useRef(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const currentPageRef = useRef(search.page);
  const wheelCooldown = useRef(false);

  const mode = useSettingsStore((s) => s.readingMode);
  const setMode = useSettingsStore((s) => s.setReadingMode);
  const direction = useSettingsStore((s) => s.readingDirection);
  const setDirection = useSettingsStore((s) => s.setReadingDirection);
  const fitMode = useSettingsStore((s) => s.fitMode);
  const setFitMode = useSettingsStore((s) => s.setFitMode);

  const totalPages = book?.page_count ?? 0;
  const isRTL = direction === "rtl";
  const isWidthFit = fitMode === "width" && mode !== "scroll";
  const displayPage = previewPage ?? currentPage;
  const progressPercent = totalPages > 1 ? (displayPage / (totalPages - 1)) * 100 : 0;

  const modeOptions: ReaderModeOption[] = [
    { value: "single", icon: FileText, label: "单页" },
    { value: "double", icon: Columns2, label: "双页" },
    { value: "scroll", icon: Scroll, label: "卷轴" },
  ];
  const dirOptions: ReaderDirectionOption[] = [
    { value: "ltr", icon: ArrowLeftRight, label: "左到右" },
    { value: "rtl", icon: ArrowRightLeft, label: "右到左" },
  ];
  const fitOptions: ReaderFitOption[] = [
    { value: "height", icon: RectangleVertical, label: "适高" },
    { value: "width", icon: RectangleHorizontal, label: "适宽" },
    { value: "contain", icon: Fullscreen, label: "适应" },
  ];

  useOrientation(mode === "scroll");
  usePreloader(bookId, currentPage, totalPages);
  const { isZoomed } = useZoom(containerRef);

  useEffect(() => {
    invoke<BookInfo>("get_book_by_hash", { hash: bookId })
      .then(setBook)
      .catch((e) => {
        console.error("Failed to load book info:", e);
        setLoadError(String(e));
      });
  }, [bookId]);

  const lastSavedPageRef = useRef(search.page);
  const saveProgress = useCallback(
    (page: number) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        if (page !== lastSavedPageRef.current) {
          invoke("save_reading_progress", { hash: bookId, pageIndex: page }).catch((e) =>
            console.error("Failed to save reading progress:", e)
          );
          lastSavedPageRef.current = page;
        }
      }, 500);
    },
    [bookId]
  );

  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      invoke("save_reading_progress", {
        hash: bookId,
        pageIndex: currentPageRef.current,
      }).catch(() => {});
    };
  }, [bookId]);

  useEffect(() => {
    currentPageRef.current = currentPage;
  }, [currentPage]);

  const navigateToPage = useCallback(
    (targetPage: number, source: "button" | "slider" | "keyboard" = "button") => {
      if (targetPage < 0 || targetPage >= totalPages) return;
      const distance = Math.abs(targetPage - currentPage);
      if (distance === 0) return;

      if (source === "slider" || distance > SLIDE_THRESHOLD) {
        setSlideDirection("none");
      } else {
        const visualDir = targetPage > currentPage ? "left" : "right";
        setSlideDirection(isRTL ? (visualDir === "left" ? "right" : "left") : visualDir);
      }

      setCurrentPage(targetPage);
      saveProgress(targetPage);
      if (mode === "scroll") {
        isExternalNavRef.current = true;
        setScrollRequestId((id) => id + 1);
      }
    },
    [totalPages, currentPage, isRTL, mode, saveProgress]
  );

  const goNext = useCallback(() => {
    if (mode === "double") {
      const aligned = currentPage % 2 === 0 ? currentPage : currentPage - 1;
      navigateToPage(Math.min(aligned + 2, totalPages - 1), "button");
    } else {
      navigateToPage(currentPage + 1, "button");
    }
  }, [currentPage, totalPages, mode, navigateToPage]);

  const goPrev = useCallback(() => {
    if (mode === "double") {
      const aligned = currentPage % 2 === 0 ? currentPage : currentPage - 1;
      navigateToPage(Math.max(aligned - 2, 0), "button");
    } else {
      navigateToPage(currentPage - 1, "button");
    }
  }, [currentPage, mode, navigateToPage]);

  const handleSliderInput = useCallback(
    (e: React.FormEvent<HTMLInputElement>) => {
      const value = Number((e.target as HTMLInputElement).value);
      setPreviewPage(value);
      if (sliderCommitTimer.current) clearTimeout(sliderCommitTimer.current);
      sliderCommitTimer.current = setTimeout(() => {
        if (isDraggingSlider.current) navigateToPage(value, "slider");
      }, 200);
    },
    [navigateToPage]
  );

  const handleSliderMouseDown = useCallback(() => {
    isDraggingSlider.current = true;
  }, []);

  const handleSliderMouseUp = useCallback(
    (e: React.MouseEvent<HTMLInputElement> | React.TouchEvent<HTMLInputElement>) => {
      isDraggingSlider.current = false;
      if (sliderCommitTimer.current) clearTimeout(sliderCommitTimer.current);
      const value = Number((e.target as HTMLInputElement).value);
      setPreviewPage(null);
      navigateToPage(value, "slider");
    },
    [navigateToPage]
  );

  const handleSliderChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (!isDraggingSlider.current) {
        const value = Number(e.target.value);
        setPreviewPage(null);
        navigateToPage(value, "slider");
      }
    },
    [navigateToPage]
  );

  useEffect(() => {
    if (mode !== "scroll" || !containerRef.current || totalPages === 0) return;

    const container = containerRef.current;
    let rafId: number;

    const handleScroll = () => {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => {
        if (isExternalNavRef.current) return;
        const scrollTop = container.scrollTop;
        const children = container.children;
        let closestPage = 0;
        let minDistance = Infinity;

        for (let i = 0; i < children.length; i++) {
          const child = children[i] as HTMLElement;
          const pageIdx = Number(child.dataset.pageIndex);
          if (isNaN(pageIdx)) continue;
          const distance = Math.abs(child.offsetTop - scrollTop - container.clientHeight / 3);
          if (distance < minDistance) {
            minDistance = distance;
            closestPage = pageIdx;
          }
        }

        if (closestPage !== currentPageRef.current) {
          currentPageRef.current = closestPage;
          setCurrentPage(closestPage);
          saveProgress(closestPage);
        }
      });
    };

    const handleScrollEnd = () => {
      if (isExternalNavRef.current) isExternalNavRef.current = false;
    };

    const handleUserGesture = () => {
      if (isExternalNavRef.current) {
        container.scrollTop = container.scrollTop;
        isExternalNavRef.current = false;
      }
    };

    container.addEventListener("scroll", handleScroll, { passive: true });
    container.addEventListener("scrollend", handleScrollEnd);
    container.addEventListener("wheel", handleUserGesture, { passive: true });
    container.addEventListener("touchstart", handleUserGesture, { passive: true });
    return () => {
      container.removeEventListener("scroll", handleScroll);
      container.removeEventListener("scrollend", handleScrollEnd);
      container.removeEventListener("wheel", handleUserGesture);
      container.removeEventListener("touchstart", handleUserGesture);
      cancelAnimationFrame(rafId);
    };
  }, [mode, totalPages, saveProgress]);

  useEffect(() => {
    if (mode === "scroll") return;
    const handleWheel = (e: WheelEvent) => {
      if (wheelCooldown.current) return;
      if (e.deltaY > 0) goNext();
      else if (e.deltaY < 0) goPrev();
      else return;
      wheelCooldown.current = true;
      setTimeout(() => {
        wheelCooldown.current = false;
      }, 250);
    };
    window.addEventListener("wheel", handleWheel, { passive: true });
    return () => window.removeEventListener("wheel", handleWheel);
  }, [mode, goNext, goPrev]);

  const handleTapLeft = useCallback(() => {
    if (showToolbar) {
      setShowToolbar(false);
      return;
    }
    if (mode === "scroll") return;
    isRTL ? goNext() : goPrev();
  }, [showToolbar, mode, isRTL, goNext, goPrev]);

  const handleTapRight = useCallback(() => {
    if (showToolbar) {
      setShowToolbar(false);
      return;
    }
    if (mode === "scroll") return;
    isRTL ? goPrev() : goNext();
  }, [showToolbar, mode, isRTL, goPrev, goNext]);

  const handleTapCenter = useCallback(() => {
    setShowToolbar((prev) => !prev);
  }, []);

  const toggleFullscreen = useCallback(async () => {
    const win = getCurrentWindow();
    const current = await win.isFullscreen();
    await win.setFullscreen(!current);
    setIsFullscreen(!current);
  }, []);

  useEffect(() => {
    getCurrentWindow().isFullscreen().then(setIsFullscreen).catch(() => {});
  }, []);

  useEffect(() => {
    return () => {
      const win = getCurrentWindow();
      win.isFullscreen()
        .then((fs) => {
          if (fs) win.setFullscreen(false).catch(() => {});
        })
        .catch(() => {});
    };
  }, []);

  const handleBack = useCallback(async () => {
    invoke("save_reading_progress", { hash: bookId, pageIndex: currentPage }).catch(() => {});
    const win = getCurrentWindow();
    const fs = await win.isFullscreen().catch(() => false);
    if (fs) await win.setFullscreen(false).catch(() => {});
    navigate({ to: "/library" });
  }, [bookId, currentPage, navigate]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowRight":
        case "d":
          e.preventDefault();
          isRTL ? goPrev() : goNext();
          break;
        case " ":
          if (isWidthFit) return;
          e.preventDefault();
          isRTL ? goPrev() : goNext();
          break;
        case "ArrowLeft":
        case "a":
          e.preventDefault();
          isRTL ? goNext() : goPrev();
          break;
        case "Escape":
          if (isFullscreen) toggleFullscreen();
          else handleBack();
          break;
        case "f":
        case "F11":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "Home":
          e.preventDefault();
          navigateToPage(0, "keyboard");
          break;
        case "End":
          e.preventDefault();
          navigateToPage(totalPages - 1, "keyboard");
          break;
        case "ArrowUp":
          if (mode === "scroll" || isWidthFit) return;
          e.preventDefault();
          goPrev();
          break;
        case "ArrowDown":
          if (mode === "scroll" || isWidthFit) return;
          e.preventDefault();
          goNext();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goNext, goPrev, navigateToPage, handleBack, toggleFullscreen, isFullscreen, mode, totalPages, isRTL, isWidthFit]);

  if (loadError) {
    return (
      <div className="reader-view fixed inset-0 flex items-center justify-center">
        <div className="text-center">
          <p className="text-white/60 text-sm mb-4">无法加载书籍: {loadError}</p>
          <button
            onClick={() => navigate({ to: "/library" })}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm text-white/80 hover:text-white bg-white/10 rounded-[var(--radius-sm)] transition-colors"
          >
            <ArrowLeft size={16} />
            返回书架
          </button>
        </div>
      </div>
    );
  }

  if (!book) {
    return (
      <div className="reader-view fixed inset-0 flex items-center justify-center">
        <div className="text-white/40 text-sm">加载中...</div>
      </div>
    );
  }

  return (
    <div className="reader-view fixed inset-0 flex flex-col select-none">
      <ReaderToolbar
        showToolbar={showToolbar}
        isFullscreen={isFullscreen}
        bookTitle={book.title}
        displayPage={displayPage}
        totalPages={totalPages}
        progressPercent={progressPercent}
        mode={mode}
        direction={direction}
        fitMode={fitMode}
        openMenu={openMenu}
        modeOptions={modeOptions}
        dirOptions={dirOptions}
        fitOptions={fitOptions}
        onBack={handleBack}
        onToggleFullscreen={toggleFullscreen}
        onSetMode={setMode}
        onSetDirection={setDirection}
        onSetFitMode={setFitMode}
        onSetOpenMenu={setOpenMenu}
        onSliderInput={handleSliderInput}
        onSliderChange={handleSliderChange}
        onSliderMouseDown={handleSliderMouseDown}
        onSliderMouseUp={handleSliderMouseUp}
      />

      <GestureLayer
        onTapLeft={handleTapLeft}
        onTapRight={handleTapRight}
        onTapCenter={handleTapCenter}
        onSwipeLeft={mode !== "scroll" ? (isRTL ? goPrev : goNext) : undefined}
        onSwipeRight={mode !== "scroll" ? (isRTL ? goNext : goPrev) : undefined}
        disabled={isZoomed}
        allowHorizontalPan={mode === "scroll"}
      >
        {mode === "scroll" ? (
          <ReaderScrollView
            ref={containerRef}
            bookHash={bookId}
            totalPages={totalPages}
            fitMode={fitMode}
            initialPage={currentPage}
            scrollToPage={currentPage}
            scrollRequestId={scrollRequestId}
          />
        ) : (
          <ReaderPagedView
            ref={containerRef}
            bookHash={bookId}
            currentPage={currentPage}
            totalPages={totalPages}
            mode={mode}
            direction={direction}
            fitMode={fitMode}
            slideDirection={slideDirection}
            onSlideComplete={() => setSlideDirection("none")}
          />
        )}
      </GestureLayer>

      <AnimatePresence>
        {previewPage !== null && (
          <motion.div
            key="page-preview"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 pointer-events-none"
          >
            <div className="px-6 py-4 rounded-2xl bg-[#2a2a2c]/90 backdrop-blur-md border border-white/[0.08] shadow-xl shadow-black/40">
              <span className="text-[28px] font-semibold text-white tabular-nums">{previewPage + 1}</span>
              <span className="text-[16px] text-white/40 ml-1">/ {totalPages}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {mode !== "scroll" && (
        <>
          {currentPage > 0 && (
            <button
              onClick={isRTL ? goNext : goPrev}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-40 w-10 h-10 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center transition-colors opacity-0 hover:opacity-100"
              aria-label={isRTL ? "下一页" : "上一页"}
            >
              <ChevronLeft size={20} className="text-white" />
            </button>
          )}
          {currentPage < totalPages - 1 && (
            <button
              onClick={isRTL ? goPrev : goNext}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-40 w-10 h-10 rounded-full bg-black/30 hover:bg-black/50 flex items-center justify-center transition-colors opacity-0 hover:opacity-100"
              aria-label={isRTL ? "上一页" : "下一页"}
            >
              <ChevronRight size={20} className="text-white" />
            </button>
          )}
        </>
      )}
    </div>
  );
}
