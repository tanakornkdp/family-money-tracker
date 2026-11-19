"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  CalendarDays,
  CalendarClock,
  BarChart3,
  Camera,
  CreditCard,
  ImageUp,
  Keyboard,
  Menu,
  Mic,
  Plane,
  Plus,
  Receipt,
  ScanLine,
  Tag,
  Target,
  Users,
  Wallet,
  X,
  Bot,
  Home,
  ShieldCheck,
  Settings,
} from "lucide-react";
import TransactionForm from "@/components/transactions/TransactionForm";
import CameraEntry from "@/components/mobile/CameraEntry";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { animateDockWindow } from "@/lib/utils/dockWindowMotion";

type Panel = "wallet" | "menu" | "add" | "manual" | "voice" | "camera" | "upload" | null;

export default function MobileNavigation() {
  const [panel, setPanel] = useState<Panel>(null);
  const emphasized = panel === "wallet" || panel === "menu";
  const assistantOpen = usePathname() === "/mobile/assistant";
  const { locale, t } = useLanguage();
  const itemClass = "flex min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-1.5 text-[10px] font-medium text-mobile-ink focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600";
  const extras = [
    { href: "/mobile/settings", label: t.nav.settings, icon: Settings },
    { href: "/mobile/transactions", label: t.nav.transactions, icon: Receipt },
    { href: "/mobile/travel", label: t.mobile.travelLabel, icon: Plane },
    { href: "/mobile/categories", label: t.nav.categories, icon: Tag },
    { href: "/mobile/receipts", label: t.nav.receipts, icon: ScanLine },
    { href: "/mobile/household", label: t.nav.household, icon: Users },
    { href: "/mobile/goals", label: t.nav.goals, icon: Target },
    { href: "/mobile/money-plans", label: locale === "th" ? "แผนใช้เงินล่วงหน้า" : "Future money plans", icon: CalendarClock },
    { href: "/mobile/recurring-bills", label: t.nav.recurring, icon: CalendarDays },
    { href: "/mobile/reports", label: t.nav.reports, icon: BarChart3 },
    { href: "/mobile/review", label: t.mobile.reviewPage.title, icon: ShieldCheck },
  ];
  const title = panel === "wallet" ? t.mobile.wallet
    : panel === "menu" ? t.mobile.allMenu
      : panel === "manual" ? t.mobile.manualEntry
        : panel === "voice" ? t.mobile.voiceEntry
          : panel === "camera" ? t.mobile.cameraEntry
            : panel === "upload" ? t.mobile.uploadEntry
              : t.transactions.addTransaction;
  const dialogRef = useRef<HTMLElement>(null);
  const closeButtonRef = useRef<HTMLButtonElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const wasOpenRef = useRef(false);
  const motion = useRef<Animation>(undefined);
  const entering = useRef(false);
  const dismissing = useRef(false);
  const [closing, setClosing] = useState(false);

  const openPanel = (next: Exclude<Panel, null>, trigger: HTMLElement) => {
    if (!panel) {
      returnFocusRef.current = trigger;
      entering.current = true;
    }
    setPanel(next);
  };

  useLayoutEffect(() => {
    if (!panel || !entering.current) return;
    entering.current = false;
    const sheet = dialogRef.current;
    const trigger = returnFocusRef.current;
    if (!sheet || !trigger) return;
    const animation = animateDockWindow(sheet, trigger, true);
    motion.current = animation;
    if (animation) void animation.finished.then(() => {
      if (!dismissing.current) animation.cancel();
    }, () => undefined);
  }, [panel]);

  useEffect(() => () => motion.current?.cancel(), []);

  const closePanel = useCallback(() => {
    if (dismissing.current) return;
    dismissing.current = true;
    const finish = () => {
      dismissing.current = false;
      setPanel(null);
      setClosing(false);
    };
    const sheet = dialogRef.current;
    const trigger = returnFocusRef.current;
    const existing = motion.current;
    let animation: Animation | undefined;
    if (existing?.playState === "running" && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
      existing.reverse();
      animation = existing;
    } else {
      existing?.cancel();
      animation = sheet && trigger ? animateDockWindow(sheet, trigger, false) : undefined;
    }
    if (!animation) { finish(); return; }
    motion.current = animation;
    setClosing(true);
    void animation.finished.then(finish, finish);
  }, []);

  useEffect(() => {
    if (panel) {
      wasOpenRef.current = true;
      closeButtonRef.current?.focus();
      return;
    }
    if (wasOpenRef.current) {
      wasOpenRef.current = false;
      const trigger = returnFocusRef.current;
      returnFocusRef.current = null;
      window.requestAnimationFrame(() => trigger?.focus());
    }
  }, [panel]);

  useEffect(() => {
    if (!panel) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        closePanel();
        return;
      }
      if (event.key !== "Tab") return;
      const nodes = dialogRef.current?.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      const focusable = Array.from(nodes ?? []);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first || !last) {
        event.preventDefault();
        dialogRef.current?.focus();
      } else if (event.shiftKey && (document.activeElement === first || !dialogRef.current?.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialogRef.current?.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [panel, closePanel]);

  return (
    <>
      <nav aria-label={t.mobile.mainNavigation} className="mobile-app-nav fixed inset-x-2 z-40 mx-auto flex max-w-lg items-center justify-between rounded-full border border-mobile-border bg-mobile-surface/95 px-2 py-2 shadow-xl backdrop-blur-xl">
        <Link href="/mobile/dashboard" prefetch data-mobile-home className={itemClass}><Home size={20} />{t.mobile.home}</Link>
        <button type="button" onClick={(event) => openPanel("wallet", event.currentTarget)} aria-haspopup="dialog" aria-expanded={panel === "wallet"} className={itemClass}><Wallet size={20} />{t.mobile.wallet}</button>
        <button type="button" data-mobile-add onClick={(event) => openPanel("add", event.currentTarget)} aria-label={t.transactions.addTransaction} aria-haspopup="dialog" aria-expanded={panel === "add" || panel === "manual" || panel === "voice" || panel === "camera" || panel === "upload"} className="-mt-7 mx-1 flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary-700 text-white shadow-lg ring-4 ring-mobile-page"><Plus size={28} /></button>
        <Link data-assistant-dock href={assistantOpen ? "/mobile/dashboard" : "/mobile/assistant"}
          aria-label={assistantOpen ? `${t.mobile.close} ${t.nav.assistant}` : undefined} className={itemClass}><Bot size={20} />{t.nav.assistant}</Link>
        <button type="button" onClick={(event) => openPanel("menu", event.currentTarget)} aria-haspopup="dialog" aria-expanded={panel === "menu"} className={itemClass}><Menu size={20} />{t.mobile.menu}</button>
      </nav>
      {panel && (
        <div className={`fixed inset-0 z-50 flex items-center justify-center p-3 motion-safe:transition-colors motion-safe:duration-[460ms] ${closing ? "bg-transparent" : emphasized ? "bg-slate-950/65" : "bg-slate-950/35"}`} onClick={(event) => { if (event.target === event.currentTarget) closePanel(); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="mobile-sheet-title" data-state={closing ? "closing" : "open"} tabIndex={-1} ref={dialogRef} className={`max-h-[min(82dvh,calc(100dvh-2rem))] w-full max-w-lg overflow-y-auto overscroll-contain rounded-3xl p-5 text-mobile-ink outline-none data-[state=closing]:pointer-events-none ${emphasized ? "bg-slate-100 shadow-xl dark:bg-slate-950" : "bg-mobile-surface"}`}>
            <div className="mb-4 flex items-center justify-between">
              <div><div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-slate-300" /><h2 id="mobile-sheet-title" className="text-lg font-bold">{title}</h2></div>
              <button type="button" ref={closeButtonRef} aria-label={t.mobile.close} onClick={closePanel} className="rounded-full p-2 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"><X /></button>
            </div>
            {panel === "add" ? (
              <div className="grid grid-cols-2 gap-3">
                {[
                  { id: "manual", label: t.mobile.manualEntry, icon: Keyboard, detail: t.mobile.enterAmountCategory },
                  { id: "voice", label: t.mobile.voiceEntry, icon: Mic, detail: t.mobile.sayTransaction },
                  { id: "camera", label: t.mobile.cameraEntry, icon: Camera, detail: t.mobile.cameraAutoDetect },
                  { id: "upload", label: t.mobile.uploadEntry, icon: ImageUp, detail: t.mobile.chooseReceiptOrQr },
                ].map(({ id, label, icon: Icon, detail }) => (
                  <button type="button" key={id} onClick={() => setPanel(id as Panel)} className="flex min-h-32 flex-col items-start rounded-2xl bg-mobile-surface-muted p-4 text-left focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600">
                    <span className="rounded-xl bg-emerald-100 p-2 text-emerald-700"><Icon size={22} /></span><span className="mt-3 font-bold">{label}</span><span className="mt-1 text-xs text-mobile-muted">{detail}</span>
                  </button>
                ))}
              </div>
            ) : panel === "camera" ? <CameraEntry />
              : panel === "upload" ? <CameraEntry startWithUpload />
                : panel === "manual" ? <TransactionForm onSaved={() => setPanel(null)} />
                  : panel === "voice" ? <VoiceEntry locale={locale} onUseText={() => setPanel("manual")} />
                    : (
                      <div className="grid grid-cols-2 gap-2">
                        {(panel === "wallet"
                          ? [{ href: "/mobile/wallet", label: t.mobile.walletPage.title, icon: Wallet }, { href: "/mobile/budget", label: t.nav.budget, icon: CalendarDays }, { href: "/mobile/credit-cards", label: t.nav.creditCards, icon: CreditCard }]
                          : extras
                        ).map(({ href, label, icon: Icon }) => (
                          <Link key={href} href={href} onClick={() => setPanel(null)} className="flex min-h-14 items-center gap-3 rounded-2xl bg-mobile-surface p-4 hover:bg-white dark:bg-mobile-surface-muted dark:hover:bg-slate-700 font-semibold focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"><Icon size={20} />{label}<span className="ml-auto">›</span></Link>
                        ))}
                      </div>
                    )}
          </section>
        </div>
      )}
    </>
  );
}

function VoiceEntry({ locale, onUseText }: { locale: "th" | "en"; onUseText: () => void }) {
  type SpeechResult = { results: ArrayLike<ArrayLike<{ transcript: string }>> };
  type SpeechApi = { lang: string; onresult: ((event: SpeechResult) => void) | null; onend: (() => void) | null; onerror: (() => void) | null; start: () => void };
  type SpeechCtor = new () => SpeechApi;
  const { t } = useLanguage();
  const [transcript, setTranscript] = useState("");
  const [listening, setListening] = useState(false);
  const start = () => {
    const speechWindow = window as Window & { SpeechRecognition?: SpeechCtor; webkitSpeechRecognition?: SpeechCtor };
    const Speech = speechWindow.SpeechRecognition ?? speechWindow.webkitSpeechRecognition;
    if (!Speech) {
      setTranscript(t.mobile.cameraUnsupported);
      return;
    }
    const recognition = new Speech();
    recognition.lang = locale === "th" ? "th-TH" : "en-US";
    recognition.onresult = (event) => setTranscript(event.results[0][0].transcript);
    recognition.onend = () => setListening(false);
    recognition.onerror = () => setListening(false);
    setListening(true);
    recognition.start();
  };
  return (
    <div className="space-y-4 text-center">
      <button type="button" aria-label={t.mobile.voiceEntry} onClick={start} className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100 text-emerald-700"><Mic size={32} /></button>
      <p className="font-semibold">{listening ? t.mobile.listening : t.mobile.tapToSpeak}</p>
      {transcript && <div className="rounded-2xl bg-mobile-surface-muted p-4 text-left">{transcript}</div>}
      <button type="button" onClick={onUseText} className="w-full rounded-xl bg-emerald-600 py-3 font-bold text-white">{t.mobile.reviewTransaction}</button>
    </div>
  );
}

