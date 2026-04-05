/** 动画配置钩子模块 */

import { useMemo } from "react";
import { useSettingsStore } from "@/stores/settings";

/** 动画配置接口 */
interface AnimationConfig {
  enabled: boolean; // 是否启用动画
  duration: number; // 动画时长
  prefersReduced: boolean; // 是否偏好减少动画
}

/**
 * 获取基于系统和低配设置的动画配置
 * @returns 动画配置对象
 */
export function useAnimationConfig(): AnimationConfig {
  const isLowSpec = useSettingsStore((s) => s.isLowSpec);

  return useMemo(() => {
    // 检查系统是否开启了“减少动画”设置
    const prefersReduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    return {
      // 尊重系统的减少动画偏好，低配模式仅影响时长
      enabled: !prefersReduced,
      duration: isLowSpec ? 0.5 : 1, // 低配模式下缩短时长
      prefersReduced,
    };
  }, [isLowSpec]);
}
