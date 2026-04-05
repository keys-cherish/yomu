/** 性能配置钩子模块 */

import { useMemo } from "react";
import { useSettingsStore } from "@/stores/settings";

/** 性能配置接口 */
export interface PerformanceConfig {
  isLowSpec: boolean; // 是否启用低配模式
  scrollBehavior: "auto" | "smooth"; // 滚动行为
  preloadAhead: number; // 向后预加载页数
  preloadBehind: number; // 向前预加载页数
  imageMaxHeight: number; // 图片最大高度（0 表示原始高度）
  enableTransitions: boolean; // 是否启用过渡效果
}

/**
 * 获取基于低配模式的性能优化配置
 * @returns 性能配置对象
 */
export function usePerformanceConfig(): PerformanceConfig {
  const isLowSpec = useSettingsStore((s) => s.isLowSpec);

  return useMemo(
    () =>
      isLowSpec
        ? {
            // 低配模式配置：牺牲部分视觉效果以换取更稳定的渲染性能
            isLowSpec: true,
            scrollBehavior: "auto" as const,
            preloadAhead: 3,
            preloadBehind: 1,
            imageMaxHeight: 1200,
            enableTransitions: false,
          }
        : {
            // 标准模式配置：优先保证动画与预加载体验
            isLowSpec: false,
            scrollBehavior: "smooth" as const,
            preloadAhead: 6,
            preloadBehind: 3,
            imageMaxHeight: 0,
            enableTransitions: true,
          },
    [isLowSpec]
  );
}
