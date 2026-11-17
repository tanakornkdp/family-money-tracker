"use client";

import Image from "next/image";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { createClient } from "@/lib/supabase/client";

export default function MobileAccountControls({ avatarUrl, name }: {
  avatarUrl?: string | null;
  name: string;
}) {
  const { locale, t } = useLanguage();
  const [failedAvatar, setFailedAvatar] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const profileLabel = locale === "th" ? "โปรไฟล์" : "Profile";

  async function logout() {
    setBusy(true);
    setError(false);
    try {
      const result = await createClient().auth.signOut();
      if (result.error) throw result.error;
      window.location.replace("/login?next=%2Fmobile%2Fdashboard");
    } catch {
      setError(true);
      setBusy(false);
    }
  }

  return <div className="relative flex shrink-0 items-center gap-1.5">
    <Link href="/mobile/settings?section=profile" aria-label={`${profileLabel}: ${name}`}
      className="grid size-11 shrink-0 place-items-center overflow-hidden rounded-full border border-mobile-border bg-mobile-surface-muted text-sm font-semibold text-mobile-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600">
      {avatarUrl && failedAvatar !== avatarUrl
        ? <Image src={avatarUrl} alt="" width={36} height={36} unoptimized className="size-9 object-cover" onError={() => setFailedAvatar(avatarUrl)} />
        : <span aria-hidden="true">{Array.from(name)[0]?.toUpperCase()}</span>}
    </Link>
    <button type="button" aria-label={t.common.logout} title={t.common.logout} onClick={logout} disabled={busy}
      className="grid size-11 shrink-0 place-items-center rounded-full border border-mobile-border bg-mobile-surface text-mobile-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 disabled:opacity-50">
      <LogOut size={18} aria-hidden="true" />
    </button>
    {error && <p role="alert" className="absolute right-0 top-full z-50 mt-1 w-48 rounded-xl border border-mobile-border bg-mobile-surface p-2 text-xs text-rose-700 dark:text-rose-300">
      {locale === "th" ? "ออกจากระบบไม่สำเร็จ ลองอีกครั้ง" : "Could not sign out. Try again."}
    </p>}
  </div>;
}
