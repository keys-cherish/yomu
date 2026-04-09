/** 应用设置状态管理模块 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

/** 阅读模式：单页、双页、垂直滚动 */
export type ReadingMode = "single" | "double" | "scroll";

/** 翻页方向：从左到右（西方漫画）/ 从右到左（日本漫画） */
export type ReadingDirection = "ltr" | "rtl";

/** 图片适配模式：适高 / 适宽 / 适应（完整包含） */
export type FitMode = "height" | "width" | "contain";

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
  webdav: WebDavConfig;
  toggleSidebar: () => void;
  setReadingMode: (mode: ReadingMode) => void;
  setReadingDirection: (dir: ReadingDirection) => void;
  setFitMode: (mode: FitMode) => void;
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
      webdav: { url: "", username: "", password: "" },
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setReadingMode: (mode) => set({ readingMode: mode }),
      setReadingDirection: (dir) => set({ readingDirection: dir }),
      setFitMode: (mode) => set({ fitMode: mode }),
      setWebDav: (config) => set((s) => ({ webdav: { ...s.webdav, ...config } })),
    }),
    {
      name: "yomu-settings",
      version: 2,
      migrate: (persisted: unknown, version: number) => {
        const state = persisted as Record<string, unknown>;
        if (version === 0 && state.fitMode === "original") {
          state.fitMode = "contain";
        }
        if (version < 2 && !state.webdav) {
          state.webdav = { url: "", username: "", password: "" };
        }
        return state as unknown as SettingsState;
      },
    }
  )
);
