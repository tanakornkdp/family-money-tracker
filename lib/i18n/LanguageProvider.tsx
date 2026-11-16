"use client";

import { createContext, useCallback, useContext, useMemo, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { translations, Locale, TranslationKeys } from "./translations";

interface LanguageContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: TranslationKeys;
}

const LanguageContext = createContext<LanguageContextValue | undefined>(undefined);

export function LanguageProvider({
  children,
  initialLocale = "th",
}: {
  children: ReactNode;
  initialLocale?: Locale;
}) {
  const [locale, setLocaleState] = useState<Locale>(initialLocale);
  const router = useRouter();

  const setLocale = useCallback((newLocale: Locale) => {
    if (newLocale === locale) return;
    setLocaleState(newLocale);
    if (typeof document !== "undefined") {
      document.cookie = `app_locale=${newLocale}; path=/; max-age=31536000; samesite=lax`;
      document.documentElement.lang = newLocale;
    }
    router.refresh();
  }, [locale, router]);

  const value = useMemo(() => ({ locale, setLocale, t: translations[locale] as TranslationKeys }), [locale, setLocale]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) {
    throw new Error("useLanguage must be used within LanguageProvider");
  }
  return ctx;
}
