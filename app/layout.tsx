import type { Metadata, Viewport } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import Providers from "@/components/providers/Providers";
import PwaRegister from "@/components/pwa/PwaRegister";
import { Locale } from "@/lib/i18n/translations";

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
  themeColor: "#0f766e",
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

  return (
    <html lang={initialLocale} suppressHydrationWarning>
      <body>
        <Providers initialLocale={initialLocale}>
          <PwaRegister />
          {children}
        </Providers>
      </body>
    </html>
  );
}
