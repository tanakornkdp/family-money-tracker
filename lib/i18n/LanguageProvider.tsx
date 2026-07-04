"use client";

import { createContext, useContext, useState, ReactNode } from "react";
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

  function setLocale(newLocale: Locale) {
    setLocaleState(newLocale);
    if (typeof document !== "undefined") {
      document.cookie = `app_locale=${newLocale}; path=/; max-age=31536000`;
    }
    router.refresh();
  }

  return (
    <LanguageContext.Provider value={{ locale, setLocale, t: translations[locale] as TranslationKeys }}>
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