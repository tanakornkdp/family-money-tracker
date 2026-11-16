"use client";

import {
  createContext,
  ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { AppTheme } from "@/types";
import { themeColors } from "@/lib/utils/themeColors";

type ThemeContextValue = {
  theme: AppTheme;
  isDark: boolean;
  mounted: boolean;
  setTheme: (theme: AppTheme) => void;
  toggle: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

function resolveDark(theme: AppTheme) {
  return theme === "dark" || (theme === "system" && window.matchMedia("(prefers-color-scheme: dark)").matches);
}

function applyTheme(theme: AppTheme) {
  const root = document.documentElement;
  const dark = resolveDark(theme);
  root.classList.toggle("dark", dark);
  root.dataset.theme = dark ? "dark" : "light";
  const color = dark ? themeColors.dark : themeColors.light;
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach(meta => {
    meta.content = color;
  });
  document.cookie = `app_theme=${theme}; path=/; max-age=31536000; samesite=lax`;
  try {
    localStorage.setItem("theme", theme);
  } catch {
    // The cookie and live DOM update still preserve the preference for this session.
  }
  return dark;
}

export function ThemeProvider({ children, initialTheme = "system" }: { children: ReactNode; initialTheme?: AppTheme }) {
  const [theme, setThemeState] = useState<AppTheme>(initialTheme);
  const [isDark, setIsDark] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.resolve().then(() => {
      if (!active) return;
      let preferredTheme = theme;
      if (!document.cookie.split("; ").some((cookie) => cookie.startsWith("app_theme="))) {
        try {
          const legacyTheme = localStorage.getItem("theme");
          if (legacyTheme === "light" || legacyTheme === "dark" || legacyTheme === "system") {
            preferredTheme = legacyTheme;
            setThemeState(legacyTheme);
          }
        } catch {
          // The server-provided preference remains the fallback.
        }
      }
      setIsDark(applyTheme(preferredTheme));
      setMounted(true);
    });
    return () => {
      active = false;
    };
  }, [theme]);

  useEffect(() => {
    if (theme !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const update = () => setIsDark(applyTheme("system"));
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, [theme]);

  const setTheme = useCallback((nextTheme: AppTheme) => {
    setThemeState(nextTheme);
    setIsDark(applyTheme(nextTheme));
  }, []);

  const toggle = useCallback(() => {
    setTheme(isDark ? "light" : "dark");
  }, [isDark, setTheme]);

  const value = useMemo(() => ({ theme, isDark, mounted, setTheme, toggle }), [theme, isDark, mounted, setTheme, toggle]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used within ThemeProvider");
  return context;
}
