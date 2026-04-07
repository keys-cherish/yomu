/** 阅读器页面 — 支持单页/双页/卷轴模式，含底部功能面板 */
import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useNavigate } from "@tanstack/react-router";
import {
  ArrowLeft,
  ArrowLeftRight,
  ArrowRightLeft,
  Columns2,
  FileText,
  Fullscreen,
  RectangleHorizontal,
  RectangleVertical,
  Scroll,
} from "lucide-react";
import { GestureLayer } from "@/components/GestureLayer";
import {
  ReaderOverlay,
  ReaderPagedView,
  ReaderScrollView,
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

  const totalPages = book?.page_count ?? 0;

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

  const controls = useReaderControls({
    bookId,
    initialPage: search.page,
    totalPages,
    mode,
    direction,
    fitMode,
    navigate,
  });

  useOrientation(mode === "scroll");
  usePreloader(bookId, controls.currentPage, totalPages);
  const { isZoomed } = useZoom(controls.containerRef);

  useEffect(() => {
    invoke<BookInfo>("get_book_by_hash", { hash: bookId })
      .then(setBook)
      .catch((e) => {
        console.error("Failed to load book info:", e);
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

  return (
    <div className="reader-view fixed inset-0 flex flex-col select-none">
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
      />

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
            onSlideComplete={() => controls.setSlideDirection("none")}
          />
        )}
      </GestureLayer>

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
