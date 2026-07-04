"use client";

import { LanguageProvider } from "@/lib/i18n/LanguageProvider";
import { Locale } from "@/lib/i18n/translations";

export default function Providers({
  children,
  initialLocale,
}: {
  children: React.ReactNode;
  initialLocale: Locale;
}) {
  return (
    <LanguageProvider initialLocale={initialLocale}>
      {children}
    </LanguageProvider>
  );
}