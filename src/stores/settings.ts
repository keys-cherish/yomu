/** 应用设置状态管理模块 */

import { create } from "zustand";
import { persist } from "zustand/middleware";

/** 阅读模式：单页、双页、垂直滚动 */
export type ReadingMode = "single" | "double" | "scroll";

/** 翻页方向：从左到右（西方漫画）/ 从右到左（日本漫画） */
export type ReadingDirection = "ltr" | "rtl";

/** 图片适配模式：适高 / 适宽 / 适应（完整包含） */
export type FitMode = "height" | "width" | "contain";

/** 设置状态接口 */
interface SettingsState {
  isLowSpec: boolean; // 是否开启低配模式
  sidebarCollapsed: boolean; // 侧边栏是否折叠
  readingMode: ReadingMode; // 当前阅读模式
  readingDirection: ReadingDirection; // 翻页方向
  fitMode: FitMode; // 图片适配模式
  toggleLowSpec: () => void;
  toggleSidebar: () => void;
  setReadingMode: (mode: ReadingMode) => void;
  setReadingDirection: (dir: ReadingDirection) => void;
  setFitMode: (mode: FitMode) => void;
}

/**
 * 设置状态持久化存储
 */
export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      isLowSpec: false,
      sidebarCollapsed: false,
      readingMode: "single",
      readingDirection: "ltr",
      fitMode: "height",
      toggleLowSpec: () => set((s) => ({ isLowSpec: !s.isLowSpec })),
      toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
      setReadingMode: (mode) => set({ readingMode: mode }),
      setReadingDirection: (dir) => set({ readingDirection: dir }),
      setFitMode: (mode) => set({ fitMode: mode }),
    }),
    {
      name: "yomu-settings",
      version: 1,
      // 迁移：v0 的 fitMode "original" → v1 的 "contain"
      migrate: (persisted: unknown, version: number) => {
        const state = persisted as Record<string, unknown>;
        if (version === 0 && state.fitMode === "original") {
          state.fitMode = "contain";
        }
        return state as unknown as SettingsState;
      },
    }
  )
);
