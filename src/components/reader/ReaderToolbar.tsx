import { AnimatePresence, motion } from "motion/react";
import { ArrowLeft, Maximize, Minimize } from "lucide-react";
import { ReaderToolbarDropdown } from "./ReaderToolbarDropdown";
import type {
  ReaderDirectionOption,
  ReaderFitOption,
  ReaderModeOption,
} from "./types";
import type { ReadingDirection, ReadingMode, FitMode } from "@/stores/settings";

/** 背景色预设 */
const BG_COLOR_PRESETS = [
  { value: "#000000", label: "纯黑" },
  { value: "#1a1a1a", label: "深灰" },
  { value: "#2c2c2c", label: "中灰" },
  { value: "#f5f0e8", label: "暖纸" },
  { value: "#e8dcc8", label: "泛黄" },
  { value: "#ffffff", label: "纯白" },
] as const;

interface ReaderToolbarProps {
  showToolbar: boolean;
  isFullscreen: boolean;
  bookTitle: string;
  displayPage: number;
  totalPages: number;
  progressPercent: number;
  mode: ReadingMode;
  direction: ReadingDirection;
  fitMode: FitMode;
  openMenu: "mode" | "dir" | "fit" | null;
  modeOptions: ReaderModeOption[];
  dirOptions: ReaderDirectionOption[];
  fitOptions: ReaderFitOption[];
  onBack: () => void;
  onToggleFullscreen: () => void;
  onSetMode: (value: ReadingMode) => void;
  onSetDirection: (value: ReadingDirection) => void;
  onSetFitMode: (value: FitMode) => void;
  onSetOpenMenu: (value: "mode" | "dir" | "fit" | null) => void;
  onSliderInput: (e: React.FormEvent<HTMLInputElement>) => void;
  onSliderChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onSliderMouseDown: () => void;
  onSliderMouseUp: (e: React.MouseEvent<HTMLInputElement> | React.TouchEvent<HTMLInputElement>) => void;
  enhanceButtons: { key: string; icon: React.ComponentType<{ size?: number; strokeWidth?: number }>; label: string; active: boolean; onToggle: () => void }[];
  readerBgColor: string;
  onSetReaderBgColor: (color: string) => void;
}

/** 阅读器工具栏，负责顶部窗口控制和底部阅读设置面板 */
export function ReaderToolbar({
  showToolbar,
  isFullscreen,
  bookTitle,
  displayPage,
  totalPages,
  progressPercent,
  mode,
  direction,
  fitMode,
  openMenu,
  modeOptions,
  dirOptions,
  fitOptions,
  onBack,
  onToggleFullscreen,
  onSetMode,
  onSetDirection,
  onSetFitMode,
  onSetOpenMenu,
  onSliderInput,
  onSliderChange,
  onSliderMouseDown,
  onSliderMouseUp,
  enhanceButtons,
  readerBgColor,
  onSetReaderBgColor,
}: ReaderToolbarProps) {
  const currentModeOption = modeOptions.find((o) => o.value === mode) ?? modeOptions[0]!;
  const currentDirOption = dirOptions.find((o) => o.value === direction) ?? dirOptions[0]!;
  const currentFitOption = fitOptions.find((o) => o.value === fitMode) ?? fitOptions[0]!;

  return (
    <AnimatePresence>
      {showToolbar && (
        <>
          <motion.div
            key="toolbar-top"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="absolute top-0 left-0 right-0 z-50"
          >
            <div
              className="flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/60 to-transparent"
            >
              <div className="flex items-center gap-3 min-w-0">
                <button
                  onClick={onBack}
                  className="shrink-0 inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                  aria-label="返回书架"
                >
                  <ArrowLeft size={24} className="text-white" />
                </button>
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={onToggleFullscreen}
                  className="inline-flex items-center justify-center w-12 h-12 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                  aria-label={isFullscreen ? "退出全屏" : "全屏"}
                >
                  {isFullscreen ? <Minimize size={22} /> : <Maximize size={22} />}
                </button>
              </div>
            </div>
          </motion.div>

          <motion.div
            key="toolbar-bottom"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
            className="absolute bottom-0 left-0 right-0 z-50"
          >
            <div className="reader-bottom-panel mx-4 mb-4 border border-[var(--color-border-strong)]/70 bg-[#12100f]/96 backdrop-blur-md">
              <div className="flex items-center justify-between px-4 pt-3 pb-2">
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-[0.22em] text-white/35">
                    Reader Session
                  </div>
                  <span className="mt-1 block max-w-[60vw] truncate text-[13px] font-medium text-white/82">
                    {bookTitle}
                  </span>
                </div>
                <span className="font-mono text-[13px] text-white/50 tabular-nums">
                  {displayPage + 1}/{totalPages}
                </span>
              </div>

              <div className="mx-4 border-t border-white/[0.08]" />

              <div className="relative flex items-center justify-around px-2 py-2.5">
                <ReaderToolbarDropdown
                  icon={currentModeOption.icon}
                  label={currentModeOption.label}
                  options={modeOptions}
                  value={mode}
                  onChange={(v) => {
                    onSetMode(v as ReadingMode);
                    onSetOpenMenu(null);
                  }}
                  open={openMenu === "mode"}
                  onToggle={() => onSetOpenMenu(openMenu === "mode" ? null : "mode")}
                />
                <ReaderToolbarDropdown
                  icon={currentDirOption.icon}
                  label={currentDirOption.label}
                  options={dirOptions}
                  value={direction}
                  onChange={(v) => {
                    onSetDirection(v as ReadingDirection);
                    onSetOpenMenu(null);
                  }}
                  open={openMenu === "dir"}
                  onToggle={() => onSetOpenMenu(openMenu === "dir" ? null : "dir")}
                  disabled={mode === "scroll"}
                />
                <ReaderToolbarDropdown
                  icon={currentFitOption.icon}
                  label={currentFitOption.label}
                  options={fitOptions}
                  value={fitMode}
                  onChange={(v) => {
                    onSetFitMode(v as FitMode);
                    onSetOpenMenu(null);
                  }}
                  open={openMenu === "fit"}
                  onToggle={() => onSetOpenMenu(openMenu === "fit" ? null : "fit")}
                  disabled={mode === "flip"}
                />
              </div>

              <div className="mx-4 border-t border-white/[0.06]" />

              {/* 图像增强按钮 */}
              <div className="flex items-center justify-around px-2 py-2">
                {enhanceButtons.map((btn) => {
                  const Icon = btn.icon;
                  return (
                    <button
                      key={btn.key}
                      onClick={btn.onToggle}
                      className={`flex min-w-[60px] flex-col items-center gap-1 border px-3 py-2 transition-colors ${
                        btn.active
                          ? "border-[rgba(200,155,99,0.42)] bg-[rgba(200,155,99,0.12)] text-[#f0ddc5]"
                          : "border-transparent text-white/60 hover:border-white/[0.08] hover:text-white/90 hover:bg-white/[0.04]"
                      }`}
                    >
                      <Icon size={18} strokeWidth={1.5} />
                      <span className="text-[10px] leading-none">{btn.label}</span>
                    </button>
                  );
                })}
              </div>

              <div className="mx-4 border-t border-white/[0.06]" />

              {/* 背景色预设 */}
              <div className="flex items-center gap-2 px-4 py-2">
                <span className="text-[10px] text-white/35 shrink-0">背景</span>
                <div className="flex items-center gap-1.5 flex-1">
                  {BG_COLOR_PRESETS.map((preset) => (
                    <button
                      key={preset.value}
                      onClick={() => onSetReaderBgColor(preset.value)}
                      title={preset.label}
                      className={`w-6 h-6 rounded-full border-2 transition-all shrink-0 ${
                        readerBgColor === preset.value
                          ? "border-[rgba(200,155,99,0.7)] scale-110"
                          : "border-white/20 hover:border-white/40"
                      }`}
                      style={{ backgroundColor: preset.value }}
                    />
                  ))}
                  <div className="relative ml-auto shrink-0">
                    <input
                      type="color"
                      value={readerBgColor}
                      onChange={(e) => onSetReaderBgColor(e.target.value)}
                      className="absolute inset-0 w-6 h-6 opacity-0 cursor-pointer"
                      title="自定义颜色"
                    />
                    <div
                      className={`w-6 h-6 rounded-full border-2 transition-all ${
                        BG_COLOR_PRESETS.some((p) => p.value === readerBgColor)
                          ? "border-white/20"
                          : "border-[rgba(200,155,99,0.7)] scale-110"
                      }`}
                      style={{
                        background: `conic-gradient(#f00, #ff0, #0f0, #0ff, #00f, #f0f, #f00)`,
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="mx-4 border-t border-white/[0.06]" />

              <div className="px-4 pt-2.5 pb-3">
                <div className="flex items-center gap-3">
                  <span className="text-[11px] text-white/40 tabular-nums w-10 text-right shrink-0">
                    {displayPage + 1}
                  </span>
                  <input
                    type="range"
                    min={0}
                    max={Math.max(totalPages - 1, 0)}
                    value={displayPage}
                    onInput={onSliderInput}
                    onChange={onSliderChange}
                    onMouseDown={onSliderMouseDown}
                    onMouseUp={onSliderMouseUp}
                    onTouchStart={onSliderMouseDown}
                    onTouchEnd={onSliderMouseUp as unknown as React.TouchEventHandler}
                    className="flex-1"
                    style={{ ["--progress" as string]: `${progressPercent}%` }}
                  />
                  <span className="text-[11px] text-white/40 tabular-nums w-10 shrink-0">
                    {totalPages}
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
