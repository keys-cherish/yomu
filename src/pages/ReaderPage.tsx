/** 阅读器页面 — 支持单页/双页/卷轴/仿真翻页模式，含底部功能面板 */
import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useNavigate } from "@tanstack/react-router";
import { logger } from "@/lib/logger";
import {
  ArrowLeft,
  ArrowLeftRight,
  ArrowRightLeft,
  BookOpen,
  Columns2,
  Crop,
  FileText,
  Fullscreen,
  RectangleHorizontal,
  RectangleVertical,
  Scroll,
  Sparkles,
  Contrast,
  Type,
} from "lucide-react";
import { GestureLayer } from "@/components/GestureLayer";
import {
  ReaderOverlay,
  ReaderPagedView,
  ReaderScrollView,
  ReaderFlipView,
  ReaderToolbar,
  useReaderControls,
  type BookInfo,
  type ReaderDirectionOption,
  type ReaderFitOption,
  type ReaderModeOption,
} from "@/components/reader";
import { useOrientation } from "@/hooks/useOrientation";
import { usePreloader } from "@/hooks/usePreloader";
import { useZoom } from "@/hooks/useZoom";
import { Route } from "@/routes/reader.$bookId";
import { useSettingsStore } from "@/stores/settings";

/** 阅读器页面组件 */
export function ReaderPage() {
  const { bookId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();

  const [book, setBook] = useState<BookInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const mode = useSettingsStore((s) => s.readingMode);
  const setMode = useSettingsStore((s) => s.setReadingMode);
  const direction = useSettingsStore((s) => s.readingDirection);
  const setDirection = useSettingsStore((s) => s.setReadingDirection);
  const fitMode = useSettingsStore((s) => s.fitMode);
  const setFitMode = useSettingsStore((s) => s.setFitMode);
  const imageEnhance = useSettingsStore((s) => s.imageEnhance);
  const setImageEnhance = useSettingsStore((s) => s.setImageEnhance);
  const autoLoadNext = useSettingsStore((s) => s.autoLoadNext);
  const readerBgColor = useSettingsStore((s) => s.readerBgColor);
  const setReaderBgColor = useSettingsStore((s) => s.setReaderBgColor);

  const totalPages = book?.page_count ?? 0;

  const modeOptions: ReaderModeOption[] = [
    { value: "single", icon: FileText, label: "单页" },
    { value: "double", icon: Columns2, label: "双页" },
    { value: "scroll", icon: Scroll, label: "卷轴" },
    { value: "flip", icon: BookOpen, label: "仿真" },
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

  const controls = useReaderControls({
    bookId,
    initialPage: search.page,
    totalPages,
    mode,
    direction,
    fitMode,
    autoLoadNext,
    navigate,
  });

  useOrientation(mode === "scroll");
  usePreloader(bookId, controls.currentPage, totalPages);
  const { isZoomed } = useZoom(controls.containerRef);

  useEffect(() => {
    invoke<BookInfo>("get_book_by_hash", { hash: bookId })
      .then(setBook)
      .catch((e) => {
        logger.error("Failed to load book info", e);
        setLoadError(String(e));
      });
  }, [bookId]);

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

  const enhanceButtons = [
    {
      key: "sharpen",
      icon: Sparkles,
      label: "锐化",
      active: imageEnhance.sharpen,
      onToggle: () => setImageEnhance({ sharpen: !imageEnhance.sharpen }),
    },
    {
      key: "contrast",
      icon: Contrast,
      label: "色彩增强",
      active: imageEnhance.contrastBoost,
      onToggle: () => setImageEnhance({ contrastBoost: !imageEnhance.contrastBoost }),
    },
    {
      key: "text",
      icon: Type,
      label: "文字增强",
      active: imageEnhance.textEnhance,
      onToggle: () => setImageEnhance({ textEnhance: !imageEnhance.textEnhance }),
    },
    {
      key: "trim",
      icon: Crop,
      label: "白边裁剪",
      active: imageEnhance.trimWhiteBorders,
      onToggle: () => setImageEnhance({ trimWhiteBorders: !imageEnhance.trimWhiteBorders }),
    },
  ];

  return (
    <div className="reader-view fixed inset-0 flex flex-col select-none" style={{ backgroundColor: readerBgColor }}>
      <ReaderToolbar
        showToolbar={controls.showToolbar}
        isFullscreen={controls.isFullscreen}
        bookTitle={book.title}
        displayPage={controls.displayPage}
        totalPages={totalPages}
        progressPercent={controls.progressPercent}
        mode={mode}
        direction={direction}
        fitMode={fitMode}
        openMenu={controls.openMenu}
        modeOptions={modeOptions}
        dirOptions={dirOptions}
        fitOptions={fitOptions}
        onBack={controls.handleBack}
        onToggleFullscreen={controls.toggleFullscreen}
        onSetMode={setMode}
        onSetDirection={setDirection}
        onSetFitMode={setFitMode}
        onSetOpenMenu={controls.setOpenMenu}
        onSliderInput={controls.handleSliderInput}
        onSliderChange={controls.handleSliderChange}
        onSliderMouseDown={controls.handleSliderMouseDown}
        onSliderMouseUp={controls.handleSliderMouseUp}
        enhanceButtons={enhanceButtons}
        readerBgColor={readerBgColor}
        onSetReaderBgColor={setReaderBgColor}
      />

      {mode === "flip" ? (
        <div className="flex-1 min-h-0 relative">
          <ReaderFlipView
            ref={controls.flipControlRef}
            bookHash={bookId}
            totalPages={totalPages}
            currentPage={controls.currentPage}
            imageEnhance={imageEnhance}
            onPageChange={controls.handleVisiblePageChange}
          />
          {/* 仿真模式的中央点击区域（用于切换工具栏） */}
          <div
            className="absolute inset-0 z-10"
            style={{ pointerEvents: "none" }}
          >
            <div
              className="absolute left-1/3 right-1/3 top-1/4 bottom-1/4"
              style={{ pointerEvents: "auto" }}
              onClick={controls.handleTapCenter}
            />
          </div>
        </div>
      ) : (
        <GestureLayer
          onTapLeft={controls.handleTapLeft}
          onTapRight={controls.handleTapRight}
          onTapCenter={controls.handleTapCenter}
          onSwipeLeft={mode !== "scroll" ? (controls.isRTL ? controls.goPrev : controls.goNext) : undefined}
          onSwipeRight={mode !== "scroll" ? (controls.isRTL ? controls.goNext : controls.goPrev) : undefined}
          disabled={isZoomed}
          allowHorizontalPan={mode === "scroll"}
          allowVerticalPan={mode !== "scroll" && fitMode === "width"}
        >
          {mode === "scroll" ? (
            <ReaderScrollView
              ref={controls.containerRef}
              bookHash={bookId}
              totalPages={totalPages}
              fitMode={fitMode}
              initialPage={controls.currentPage}
              scrollToPage={controls.currentPage}
              scrollRequestId={controls.scrollRequestId}
              imageEnhance={imageEnhance}
              onVisiblePageChange={controls.handleVisiblePageChange}
            />
          ) : (
            <ReaderPagedView
              ref={controls.containerRef}
              bookHash={bookId}
              currentPage={controls.currentPage}
              totalPages={totalPages}
              mode={mode}
              direction={direction}
              fitMode={fitMode}
              slideDirection={controls.slideDirection}
              imageEnhance={imageEnhance}
              onSlideComplete={() => controls.setSlideDirection("none")}
            />
          )}
        </GestureLayer>
      )}

      <ReaderOverlay
        mode={mode}
        isRTL={controls.isRTL}
        currentPage={controls.currentPage}
        totalPages={totalPages}
        previewPage={controls.previewPage}
        onPrev={controls.goPrev}
        onNext={controls.goNext}
      />
    </div>
  );
}
