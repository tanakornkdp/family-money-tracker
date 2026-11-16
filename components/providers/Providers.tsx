"use client";

import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
import { Locale } from "@/lib/i18n/translations";
import { AppTheme } from "@/types";
import { ThemeProvider } from "@/components/providers/ThemeProvider";

export default function Providers({
  children,
  initialLocale,
  initialTheme,
}: {
  children: React.ReactNode;
  initialLocale: Locale;
  initialTheme: AppTheme;
}) {
  return (
    <LanguageProvider initialLocale={initialLocale}>
      <ThemeProvider initialTheme={initialTheme}>{children}</ThemeProvider>
    </LanguageProvider>
  );
}
