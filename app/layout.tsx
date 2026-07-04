import type { Metadata } from "next";
import { cookies } from "next/headers";
import "./globals.css";
import Providers from "@/components/providers/Providers";
import { Locale } from "@/lib/i18n/translations";

export const metadata: Metadata = {
  title: "Smart Finance AI",
  description: "AI-powered personal finance tracker",
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
        <Providers initialLocale={initialLocale}>{children}</Providers>
      </body>
    </html>
  );
}