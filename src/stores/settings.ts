/** 应用设置状态管理模块 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

/** 阅读模式：单页、双页、垂直滚动、仿真翻页 */
export type ReadingMode = "single" | "double" | "scroll" | "flip";

/** 翻页方向：从左到右（西方漫画）/ 从右到左（日本漫画） */
export type ReadingDirection = "ltr" | "rtl";

/** 图片适配模式：适高 / 适宽 / 适应（完整包含） */
export type FitMode = "height" | "width" | "contain";

/** 界面主题 */
export type ThemeMode = "dark" | "light" | "system";

/** 图像增强选项 */
export interface ImageEnhanceOptions {
  sharpen: boolean;
  contrastBoost: boolean;
  textEnhance: boolean;
  trimWhiteBorders: boolean;
}

/** WebDAV 配置 */
export interface WebDavConfig {
  url: string;
  username: string;
  password: string;
}

/** 设置状态接口 */
interface SettingsState {
  sidebarCollapsed: boolean;
  readingMode: ReadingMode;
  readingDirection: ReadingDirection;
  fitMode: FitMode;
  theme: ThemeMode;
  readerNightMode: boolean;
  imageEnhance: ImageEnhanceOptions;
  autoLoadNext: boolean;
  readerBgColor: string;
  webdav: WebDavConfig;
  toggleSidebar: () => void;
  setReadingMode: (mode: ReadingMode) => void;
  setReadingDirection: (dir: ReadingDirection) => void;
  setFitMode: (mode: FitMode) => void;
  setTheme: (theme: ThemeMode) => void;
  setReaderNightMode: (on: boolean) => void;
  setImageEnhance: (options: Partial<ImageEnhanceOptions>) => void;
  setAutoLoadNext: (on: boolean) => void;
  setReaderBgColor: (color: string) => void;
  setWebDav: (config: Partial<WebDavConfig>) => void;
}

/**
 * 设置状态持久化存储
 */
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      sidebarCollapsed: false,
      readingMode: "single",
      readingDirection: "ltr",
      fitMode: "height",
      theme: "dark",
      readerNightMode: false,
      imageEnhance: { sharpen: false, contrastBoost: false, textEnhance: false, trimWhiteBorders: false },
      autoLoadNext: true,
      readerBgColor: "#000000",
      webdav: { url: "", username: "", password: "" },
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setReadingMode: (mode) => set({ readingMode: mode }),
      setReadingDirection: (dir) => set({ readingDirection: dir }),
      setFitMode: (mode) => set({ fitMode: mode }),
      setTheme: (theme) => set({ theme }),
      setReaderNightMode: (on) => set({ readerNightMode: on }),
      setImageEnhance: (options) => set((s) => ({ imageEnhance: { ...s.imageEnhance, ...options } })),
      setAutoLoadNext: (on) => set({ autoLoadNext: on }),
      setReaderBgColor: (color) => set({ readerBgColor: color }),
      setWebDav: (config) => set((s) => ({ webdav: { ...s.webdav, ...config } })),
    }),
    {
      name: "yomu-settings",
      version: 6,
      migrate: (persisted: unknown, version: number) => {
        const state = persisted as Record<string, unknown>;
        if (version === 0 && state.fitMode === "original") {
          state.fitMode = "contain";
        }
        if (version < 2 && !state.webdav) {
          state.webdav = { url: "", username: "", password: "" };
        }
        if (version < 3) {
          if (!state.theme) state.theme = "dark";
          if (state.readerNightMode === undefined) state.readerNightMode = false;
        }
        if (version < 4) {
          if (!state.imageEnhance) {
            state.imageEnhance = { sharpen: false, contrastBoost: false, textEnhance: false, trimWhiteBorders: false };
          }
        }
        if (version < 5) {
          // v5: 新增 flip 阅读模式，无需迁移数据，仅占位确保版本号递增
        }
        if (version < 6) {
          // v6: 新增白边裁剪、自动载入下一个文件、自定义背景色
          const enhance = state.imageEnhance as Record<string, unknown> | undefined;
          if (enhance && enhance.trimWhiteBorders === undefined) {
            enhance.trimWhiteBorders = false;
          }
          if (state.autoLoadNext === undefined) state.autoLoadNext = true;
          if (state.readerBgColor === undefined) state.readerBgColor = "#000000";
        }
        return state as unknown as SettingsState;
      },
    }
  )
);
