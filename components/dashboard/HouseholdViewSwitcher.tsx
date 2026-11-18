"use client";

import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { Check, ChevronDown } from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import type { Household } from "@/types";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { animateDockWindow } from "@/lib/utils/dockWindowMotion";

export default function HouseholdViewSwitcher({ households, selectedHouseholdId, personalLabel, label }: {
  households: Household[];
  selectedHouseholdId: string;
  personalLabel?: string;
  label?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [closing, setClosing] = useState(false);
  const trigger = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const root = useRef<HTMLDivElement>(null);
  const motion = useRef<Animation>(undefined);
  const id = useId();
  const options = [{ id: "", name: personalLabel ?? t.dashboard.viewAll }, ...households];
  const selected = options.find(item => item.id === selectedHouseholdId) ?? options[0];

  const close = useCallback((value?: string) => {
    if (closing) return;
    const finish = () => {
      setOpen(false);
      setClosing(false);
      if (value !== undefined && value !== selectedHouseholdId) {
        router.push(value ? `${pathname}?${new URLSearchParams({ household: value })}` : pathname);
      } else {
        trigger.current?.focus({ preventScroll: true });
      }
    };
    const existing = motion.current;
    let animation: Animation | undefined;
    if (existing?.playState === "running" && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      animation = existing;
      animation.reverse();
    } else {
      existing?.cancel();
      animation = panel.current && trigger.current ? animateDockWindow(panel.current, trigger.current, false) : undefined;
    }
    if (!animation) { finish(); return; }
    motion.current = animation;
    setClosing(true);
    void animation.finished.then(finish, () => undefined);
  }, [closing, pathname, router, selectedHouseholdId]);

  useLayoutEffect(() => {
    if (!open || !panel.current || !trigger.current) return;
    const animation = animateDockWindow(panel.current, trigger.current, true);
    motion.current = animation;
    if (animation) void animation.finished.then(() => {
      if (animation.playbackRate > 0) animation.cancel();
    }, () => undefined);
    panel.current.querySelector<HTMLElement>('[aria-checked="true"]')?.focus({ preventScroll: true });
    return () => motion.current?.cancel();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) close();
    };
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); close(); }
    };
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", escape);
    return () => {
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("keydown", escape);
    };
  }, [close, open]);

  if (!households.length) return null;
  return <div ref={root} className="relative w-fit max-w-full">
    <button ref={trigger} type="button" aria-label={label ?? t.household.viewMode} aria-haspopup="menu" aria-expanded={open}
      aria-controls={open ? id : undefined} onClick={() => open ? close() : setOpen(true)}
      className="flex min-h-11 max-w-full items-center gap-3 rounded-xl border border-mobile-border bg-mobile-surface px-3 py-2 text-sm text-mobile-ink focus-visible:outline-2 focus-visible:outline-primary-600">
      <span className="truncate">{selected.name}</span><ChevronDown size={18} aria-hidden="true" className="shrink-0 text-mobile-muted" />
    </button>
    {open && <div ref={panel} id={id} role="menu" aria-label={label ?? t.household.viewMode} inert={closing}
      className="absolute left-0 top-full z-40 mt-2 max-h-[60dvh] w-[min(19rem,calc(100vw-2rem))] overflow-y-auto rounded-2xl border border-mobile-border bg-mobile-surface p-1.5 text-mobile-ink shadow-xl"
      onBlur={event => { if (event.relatedTarget && !root.current?.contains(event.relatedTarget)) close(); }}
      onKeyDown={event => {
        if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
        event.preventDefault();
        const items = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('[role="menuitemradio"]'));
        const index = items.indexOf(document.activeElement as HTMLElement);
        items[event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : (index + (event.key === "ArrowUp" ? -1 : 1) + items.length) % items.length]?.focus();
      }}>
      {options.map(item => <button key={item.id} type="button" role="menuitemradio" aria-checked={item.id === selectedHouseholdId} onClick={() => close(item.id)}
        className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm hover:bg-mobile-surface-muted focus-visible:outline-2 focus-visible:outline-primary-600 aria-checked:bg-mobile-surface-muted">
        <span className="min-w-0 flex-1 break-words">{item.name}</span>
        {item.id === selectedHouseholdId && <Check size={18} aria-hidden="true" className="shrink-0 text-primary-600" />}
      </button>)}
    </div>}
  </div>;
}
