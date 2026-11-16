"use client";

import { useEffect } from "react";
import { useTheme } from "@/components/providers/ThemeProvider";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { AppLanguage, AppTheme } from "@/types";

export default function UserPreferencesSync({ language, theme }: { language?: AppLanguage | null; theme?: AppTheme | null }) {
  const { setTheme } = useTheme();
  const { locale, setLocale } = useLanguage();

  useEffect(() => {
    if (!theme) return;
    const timer = window.setTimeout(() => setTheme(theme), 0);
    return () => window.clearTimeout(timer);
  }, [setTheme, theme]);

  useEffect(() => {
    const browserLocale = document.cookie.match(/(?:^|; )app_locale=(th|en)(?:;|$)/)?.[1];
    if (!browserLocale && language && language !== locale) setLocale(language);
  }, [language, locale, setLocale]);

  return null;
}
