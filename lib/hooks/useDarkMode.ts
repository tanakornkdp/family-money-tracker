"use client";

import { useTheme } from "@/components/providers/ThemeProvider";

export function useDarkMode() {
  const { isDark, toggle, mounted, theme, setTheme } = useTheme();
  return { isDark, toggle, mounted, theme, setTheme };
}
