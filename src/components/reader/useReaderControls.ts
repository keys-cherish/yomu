import { useCallback, useEffect, useRef, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { getCurrentWindow } from "@tauri-apps/api/window";
import type { FitMode, ReadingDirection, ReadingMode } from "@/stores/settings";
import type { FlipControl } from "./ReaderFlipView";

interface UseReaderControlsParams {
  bookId: string;
  initialPage: number;
  totalPages: number;
  mode: ReadingMode;
  direction: ReadingDirection;
  fitMode: FitMode;
  autoLoadNext: boolean;
  navigate: (options: { to: string; params?: Record<string, string>; search?: Record<string, unknown> }) => void;
}

/**
 * 阅读器控制逻辑钩子
 * 统一管理页码跳转、进度保存、卷轴追踪、键盘/滚轮/手势与全屏状态。
 */
export function useReaderControls({
  bookId,
  initialPage,
  totalPages,
  mode,
  direction,
  fitMode,
  autoLoadNext,
  navigate,
}: UseReaderControlsParams) {
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [previewPage, setPreviewPage] = useState<number | null>(null);
  const [slideDirection, setSlideDirection] = useState<"left" | "right" | "none">("none");
  const [scrollRequestId, setScrollRequestId] = useState(0);
  const [showToolbar, setShowToolbar] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [openMenu, setOpenMenu] = useState<"mode" | "dir" | "fit" | null>(null);

  // 当 bookId 或 initialPage 变化时重置页码（修 P1-9：防深链跳转时 state 残留）
  useEffect(() => {
    setCurrentPage(initialPage);
    setPreviewPage(null);
    setSlideDirection("none");
  }, [bookId, initialPage]);

  const containerRef = useRef<HTMLDivElement>(null);
  const flipControlRef = useRef<FlipControl | null>(null);
  const currentPageRef = useRef(initialPage);
  const isDraggingSlider = useRef(false);
  const sliderCommitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedPageRef = useRef(initialPage);
  const wheelCooldown = useRef(false);
  const loadingNextBook = useRef(false);

  const isRTL = direction === "rtl";
  const isWidthFit = fitMode === "width" && mode !== "scroll";
  const displayPage = previewPage ?? currentPage;
  const progressPercent = totalPages > 1 ? (displayPage / (totalPages - 1)) * 100 : 0;

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

  const handleVisiblePageChange = useCallback(
    (page: number) => {
      if (page < 0 || page >= totalPages) return;
      if (page === currentPageRef.current) return;
      currentPageRef.current = page;
      setCurrentPage(page);
      saveProgress(page);
    },
    [totalPages, saveProgress]
  );

  useEffect(() => {
    if (mode === "scroll") {
      setScrollRequestId((id) => id + 1);
    }
  }, [mode]);

  const navigateToPage = useCallback(
    (targetPage: number, source: "button" | "slider" | "keyboard" = "button") => {
      if (targetPage < 0 || targetPage >= totalPages) return;
      const distance = Math.abs(targetPage - currentPage);
      if (distance === 0) return;

      // 仿真模式：委托 PageFlip 实例跳页
      if (mode === "flip") {
        flipControlRef.current?.turnToPage(targetPage);
        setCurrentPage(targetPage);
        currentPageRef.current = targetPage;
        saveProgress(targetPage);
        return;
      }

      if (source === "slider" || distance > 3) {
        setSlideDirection("none");
      } else {
        const visualDir = targetPage > currentPage ? "left" : "right";
        setSlideDirection(isRTL ? (visualDir === "left" ? "right" : "left") : visualDir);
      }

      setCurrentPage(targetPage);
      currentPageRef.current = targetPage;
      saveProgress(targetPage);
      if (mode === "scroll") {
        setScrollRequestId((id) => id + 1);
      }
    },
    [totalPages, currentPage, isRTL, mode, saveProgress]
  );

  /** 尝试加载同系列下一本书 */
  const tryLoadNextBook = useCallback(async () => {
    if (!autoLoadNext || loadingNextBook.current) return;
    loadingNextBook.current = true;
    try {
      const nextBook = await invoke<{ hash: string } | null>("get_next_book", { hash: bookId });
      if (nextBook) {
        navigate({ to: "/reader/$bookId", params: { bookId: nextBook.hash }, search: { page: 0 } });
      }
    } catch (e) {
      console.error("Failed to load next book:", e);
    } finally {
      loadingNextBook.current = false;
    }
  }, [autoLoadNext, bookId, navigate]);

  const goNext = useCallback(() => {
    if (mode === "flip") {
      // 仿真模式在最后一页时也尝试加载下一本
      if (currentPage >= totalPages - 1) {
        tryLoadNextBook();
        return;
      }
      flipControlRef.current?.flipNext();
      return;
    }
    if (mode === "double") {
      const aligned = currentPage % 2 === 0 ? currentPage : currentPage - 1;
      const nextPage = aligned + 2;
      if (nextPage >= totalPages) {
        tryLoadNextBook();
        return;
      }
      navigateToPage(Math.min(nextPage, totalPages - 1), "button");
    } else {
      if (currentPage >= totalPages - 1) {
        tryLoadNextBook();
        return;
      }
      navigateToPage(currentPage + 1, "button");
    }
  }, [currentPage, totalPages, mode, navigateToPage, tryLoadNextBook]);

  const goPrev = useCallback(() => {
    if (mode === "flip") {
      flipControlRef.current?.flipPrev();
      return;
    }
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
    if (mode === "scroll" || isWidthFit) return;
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
  }, [mode, isWidthFit, goNext, goPrev]);

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

  /**
   * 原生全屏切换（使用系统原生全屏 API，完全隐藏标题栏和边框）
   */
  const toggleFullscreen = useCallback(async () => {
    const win = getCurrentWindow();
    try {
      const fs = await win.isFullscreen();
      await win.setFullscreen(!fs);
      setIsFullscreen(!fs);
    } catch (e) {
      console.error("Failed to toggle fullscreen:", e);
    }
  }, []);

  useEffect(() => {
    // 自己跟踪全屏状态，不依赖 Tauri 的 isFullscreen()
  }, []);

  useEffect(() => {
    return () => {
      // 离开阅读器时退出全屏
      const win = getCurrentWindow();
      win.isFullscreen()
        .then((fs) => { if (fs) win.setFullscreen(false).catch(() => {}); })
        .catch(() => {});
    };
  }, []);

  const handleBack = useCallback(async () => {
    const win = getCurrentWindow();
    const fs = await win.isFullscreen().catch(() => false);
    if (fs) await win.setFullscreen(false).catch(() => {});
    navigate({ to: "/library" });
  }, [navigate]);

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

  return {
    containerRef,
    flipControlRef,
    currentPage,
    displayPage,
    handleBack,
    handleSliderChange,
    handleSliderInput,
    handleSliderMouseDown,
    handleSliderMouseUp,
    handleTapCenter,
    handleTapLeft,
    handleTapRight,
    isFullscreen,
    isRTL,
    navigateToPage,
    openMenu,
    previewPage,
    progressPercent,
    scrollRequestId,
    setOpenMenu,
    setSlideDirection,
    slideDirection,
    showToolbar,
    toggleFullscreen,
    goNext,
    goPrev,
    handleVisiblePageChange,
  };
}
