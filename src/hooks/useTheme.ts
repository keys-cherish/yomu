/**
 * 主题管理 Hook
 * 监听 settings store 中的 theme 值，同步到 <html data-theme="...">
 */
import { useEffect } from "react";
import { useSettingsStore } from "@/stores/settings";

export function useTheme() {
  const theme = useSettingsStore((s) => s.theme);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return theme;
}
