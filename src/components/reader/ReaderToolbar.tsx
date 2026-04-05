import { useEffect, useRef } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeft,
  Maximize,
  Minimize,
  Minus,
  Square,
  X,
} from "lucide-react";
import type {
  ReaderDirectionOption,
  ReaderFitOption,
  ReaderModeOption,
  ReaderOption,
} from "./types";
import type { ReadingDirection, ReadingMode, FitMode } from "@/stores/settings";

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
              className={`flex items-center justify-between px-4 py-3 bg-gradient-to-b from-black/60 to-transparent ${!isFullscreen ? "drag-region" : ""}`}
            >
              <div className="no-drag flex items-center gap-3 min-w-0">
                <button
                  onClick={onBack}
                  className="shrink-0 inline-flex items-center justify-center w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 transition-colors"
                  aria-label="返回书架"
                >
                  <ArrowLeft size={24} className="text-white" />
                </button>
              </div>
              <div className="no-drag flex items-center gap-1">
                <button
                  onClick={onToggleFullscreen}
                  className="inline-flex items-center justify-center w-12 h-12 text-white/70 hover:text-white bg-white/10 hover:bg-white/20 rounded-full transition-colors"
                  aria-label={isFullscreen ? "退出全屏" : "全屏"}
                >
                  {isFullscreen ? <Minimize size={22} /> : <Maximize size={22} />}
                </button>
                <button
                  onClick={() => getCurrentWindow().minimize()}
                  className="inline-flex items-center justify-center w-12 h-12 text-white/70 hover:text-white hover:bg-white/15 rounded-full transition-colors"
                  aria-label="最小化"
                >
                  <Minus size={22} />
                </button>
                <button
                  onClick={() => getCurrentWindow().toggleMaximize()}
                  className="inline-flex items-center justify-center w-12 h-12 text-white/70 hover:text-white hover:bg-white/15 rounded-full transition-colors"
                  aria-label="最大化"
                >
                  <Square size={16} />
                </button>
                <button
                  onClick={() => getCurrentWindow().close()}
                  className="inline-flex items-center justify-center w-12 h-12 text-white/70 hover:text-red-400 hover:bg-red-500/20 rounded-full transition-colors"
                  aria-label="关闭"
                >
                  <X size={22} />
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
            <div className="reader-bottom-panel mx-4 mb-4 rounded-2xl bg-[#2a2a2c]/95 backdrop-blur-sm border border-white/[0.06]">
              <div className="flex items-center justify-between px-4 pt-3 pb-2">
                <span className="text-[13px] text-white/80 truncate max-w-[60%] font-medium">
                  {bookTitle}
                </span>
                <span className="text-[13px] text-white/50 tabular-nums font-medium">
                  {displayPage + 1}/{totalPages}
                </span>
              </div>

              <div className="mx-4 border-t border-white/[0.06]" />

              <div className="flex items-center justify-around px-2 py-2.5 relative">
                <ToolbarDropdown
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
                <ToolbarDropdown
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
                <ToolbarDropdown
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
                />
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

interface ToolbarDropdownProps<T extends string> {
  icon: ReaderOption<T>["icon"];
  label: string;
  options: ReaderOption<T>[];
  value: string;
  onChange: (value: string) => void;
  open: boolean;
  onToggle: () => void;
  disabled?: boolean;
}

/** 底部面板下拉选择按钮 */
function ToolbarDropdown<T extends string>({
  icon: Icon,
  label,
  options,
  value,
  onChange,
  open,
  onToggle,
  disabled,
}: ToolbarDropdownProps<T>) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onToggle();
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open, onToggle]);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={disabled ? undefined : onToggle}
        disabled={disabled}
        className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-lg transition-colors min-w-[56px] ${
          disabled
            ? "text-white/20 cursor-not-allowed"
            : open
              ? "text-blue-400 bg-white/[0.08]"
              : "text-white/60 hover:text-white/90 hover:bg-white/[0.06]"
        }`}
      >
        <Icon size={18} strokeWidth={1.5} />
        <span className="text-[10px] leading-none">{label}</span>
      </button>

      <AnimatePresence>
        {open && !disabled && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.95 }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 min-w-[120px] py-1 rounded-xl bg-[#3a3a3c] border border-white/[0.08] shadow-lg shadow-black/40 overflow-hidden z-[60]"
          >
            {options.map((opt) => {
              const OptIcon = opt.icon;
              const isActive = opt.value === value;
              return (
                <button
                  key={opt.value}
                  onClick={() => onChange(opt.value)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] transition-colors ${
                    isActive
                      ? "text-blue-400 bg-white/[0.06]"
                      : "text-white/70 hover:text-white hover:bg-white/[0.06]"
                  }`}
                >
                  <OptIcon size={16} strokeWidth={1.5} />
                  <span>{opt.label}</span>
                  {isActive && <span className="ml-auto text-blue-400 text-xs">✓</span>}
                </button>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
