"use client";

import Image from "next/image";
import Link from "next/link";
import { Languages, LogOut, Moon, Sun } from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { createClient } from "@/lib/supabase/client";
import NotificationCenter from "@/components/NotificationCenter";
import { useMobilePreferences } from "./MobilePreferencesControls";

const rowClass = "flex min-h-10 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm hover:bg-mobile-surface-muted focus-visible:outline-2 focus-visible:outline-primary-600 disabled:opacity-50";

export default function MobileAccountControls({ userId, email, avatarUrl, name }: {
  userId: string;
  email?: string;
  avatarUrl?: string | null;
  name: string;
}) {
  const { t } = useLanguage();
  const { locale, isDark, saving, error: preferenceError, changeLanguage, changeTheme } = useMobilePreferences(userId);
  const [open, setOpen] = useState<"profile" | "notifications" | null>(null);
  const [failedAvatar, setFailedAvatar] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const container = useRef<HTMLDivElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const profileTrigger = useRef<HTMLButtonElement>(null);
  const menuId = useId();
  const th = locale === "th";
  const profileLabel = th ? "โปรไฟล์" : "Profile";

  useEffect(() => {
    if (!open) return;
    if (open === "profile") menu.current?.querySelector<HTMLElement>('[role="menuitem"]')?.focus();
    const trigger = open === "profile" ? profileTrigger.current
      : container.current?.querySelector<HTMLButtonElement>('button[aria-expanded="true"]');
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !container.current?.contains(event.target)) setOpen(null);
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      setOpen(null);
      trigger?.focus();
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [open]);

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

  function avatar(size: number) {
    return avatarUrl && failedAvatar !== avatarUrl
      ? <Image src={avatarUrl} alt="" width={size} height={size} unoptimized className="size-full object-cover" onError={() => setFailedAvatar(avatarUrl)} />
      : <span aria-hidden="true">{Array.from(name)[0]?.toUpperCase()}</span>;
  }

  return <div ref={container} className="relative flex items-center gap-2">
    <NotificationCenter userId={userId} compact expanded={open === "notifications"}
      onExpandedChange={expanded => setOpen(expanded ? "notifications" : null)} />
    <button ref={profileTrigger} type="button" aria-label={`${profileLabel}: ${name}`} aria-haspopup="menu" aria-expanded={open === "profile"}
      aria-controls={open === "profile" ? menuId : undefined}
      onClick={() => setOpen(current => current === "profile" ? null : "profile")}
      className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-full border border-mobile-border bg-mobile-surface-muted text-sm font-semibold text-mobile-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600 aria-expanded:ring-2 aria-expanded:ring-primary-600">
      {avatar(40)}
    </button>
    {open === "profile" && <div ref={menu} id={menuId} role="menu" aria-label={profileLabel}
      className="absolute right-0 top-full z-[70] mt-2 w-[min(17rem,calc(100vw-2rem))] rounded-2xl border border-mobile-border bg-mobile-surface p-1.5 text-mobile-ink shadow-xl"
      onBlur={event => {
        if (event.relatedTarget && !container.current?.contains(event.relatedTarget)) setOpen(null);
      }}
      onKeyDown={event => {
        if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)'));
        const index = items.indexOf(document.activeElement as HTMLElement);
        const step = event.key === "ArrowUp" ? -1 : 1;
        items[event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : (index + step + items.length) % items.length]?.focus();
      }}>
      <Link role="menuitem" href="/mobile/settings?section=profile" onClick={() => setOpen(null)} className={rowClass}>
        <span className="grid size-8 shrink-0 place-items-center overflow-hidden rounded-full bg-mobile-surface-muted font-semibold">{avatar(32)}</span>
        <span className="min-w-0">
          <span className="block truncate font-semibold">{name}</span>
          {email && <span className="block truncate text-xs text-mobile-muted">{email}</span>}
        </span>
      </Link>
      <div role="separator" className="my-1 border-t border-mobile-border" />
      <button role="menuitem" type="button" onClick={changeTheme} disabled={saving === "theme"} className={rowClass}>
        {isDark ? <Moon size={17} aria-hidden="true" /> : <Sun size={17} aria-hidden="true" />}
        <span>{t.settings.theme}</span>
        <span className="ml-auto rounded-md bg-mobile-surface-muted px-2 py-0.5 text-xs text-mobile-muted">{isDark ? t.settings.dark : t.settings.light}</span>
      </button>
      <button role="menuitem" type="button" onClick={changeLanguage} disabled={saving === "language"} className={rowClass}>
        <Languages size={17} aria-hidden="true" /><span>{t.settings.language}</span>
        <span className="ml-auto rounded-md bg-mobile-surface-muted px-2 py-0.5 text-xs text-mobile-muted">{th ? "ไทย" : "EN"}</span>
      </button>
      {preferenceError && <p role="status" className="px-3 py-1 text-xs text-rose-700 dark:text-rose-400">{preferenceError}</p>}
      <div role="separator" className="my-1 border-t border-mobile-border" />
      <button role="menuitem" type="button" onClick={logout} disabled={busy} className={rowClass + " text-red-600 dark:text-red-400"}>
        <LogOut size={17} aria-hidden="true" />{t.common.logout}
      </button>
      {error && <p role="alert" className="px-3 py-1 text-xs text-red-600 dark:text-red-400">
        {th ? "ออกจากระบบไม่สำเร็จ ลองอีกครั้ง" : "Could not sign out. Try again."}
      </p>}
    </div>}
  </div>;
}
