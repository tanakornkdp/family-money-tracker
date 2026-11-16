import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import Providers from "@/components/providers/Providers";
import PwaRegister from "@/components/pwa/PwaRegister";
import { Locale } from "@/lib/i18n/translations";
import { AppTheme } from "@/types";
import { initializeThemeScript, themeColorMetadata } from "@/lib/utils/themeColors";

export const metadata: Metadata = {
  title: "Family Money Tracker",
  description: "ติดตามรายรับ รายจ่าย และเป้าหมายการเงินของครอบครัว",
  applicationName: "Family Money Tracker",
  appleWebApp: {
    capable: true,
    title: "Family Money",
    statusBarStyle: "default",
  },
};

export const viewport: Viewport = {
  themeColor: themeColorMetadata,
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get("app_locale")?.value as Locale | undefined;
  const initialLocale: Locale = localeCookie === "en" ? "en" : "th";
  const storedTheme = cookieStore.get("app_theme")?.value;
  const initialTheme: AppTheme = storedTheme === "light" || storedTheme === "dark" ? storedTheme : "system";
  const isInitiallyDark = initialTheme === "dark";

  return (
    <html lang={initialLocale} className={isInitiallyDark ? "dark" : undefined} data-theme={isInitiallyDark ? "dark" : "light"} data-theme-preference={initialTheme} suppressHydrationWarning>
      <body>
        <script dangerouslySetInnerHTML={{ __html: initializeThemeScript }} />
        <Providers initialLocale={initialLocale} initialTheme={initialTheme}>
          <PwaRegister />
          {children}
        </Providers>
      </body>
    </html>
  );
}
