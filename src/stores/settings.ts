/** 应用设置状态管理模块 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

/** 阅读模式：单页、双页、垂直滚动 */
export type ReadingMode = "single" | "double" | "scroll";

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
  webdav: WebDavConfig;
  toggleSidebar: () => void;
  setReadingMode: (mode: ReadingMode) => void;
  setReadingDirection: (dir: ReadingDirection) => void;
  setFitMode: (mode: FitMode) => void;
  setTheme: (theme: ThemeMode) => void;
  setReaderNightMode: (on: boolean) => void;
  setImageEnhance: (options: Partial<ImageEnhanceOptions>) => void;
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
      imageEnhance: { sharpen: false, contrastBoost: false, textEnhance: false },
      webdav: { url: "", username: "", password: "" },
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setReadingMode: (mode) => set({ readingMode: mode }),
      setReadingDirection: (dir) => set({ readingDirection: dir }),
      setFitMode: (mode) => set({ fitMode: mode }),
      setTheme: (theme) => set({ theme }),
      setReaderNightMode: (on) => set({ readerNightMode: on }),
      setImageEnhance: (options) => set((s) => ({ imageEnhance: { ...s.imageEnhance, ...options } })),
      setWebDav: (config) => set((s) => ({ webdav: { ...s.webdav, ...config } })),
    }),
    {
      name: "yomu-settings",
      version: 4,
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
            state.imageEnhance = { sharpen: false, contrastBoost: false, textEnhance: false };
          }
        }
        return state as unknown as SettingsState;
      },
    }
  )
);
