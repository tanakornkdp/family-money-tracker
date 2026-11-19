"use client";
import { createContext, useContext, useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";
import { animateDockWindow } from "@/lib/utils/dockWindowMotion";

const CloseContext = createContext<() => void>(() => undefined);
export const useClosePlanDialog = () => useContext(CloseContext);
export default function PlanDialog({ title, anchor, onClose, children }: { title: string; anchor: HTMLElement | null; onClose: () => void; children: ReactNode }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const motion = useRef<Animation | undefined>(undefined);
  const [closing, setClosing] = useState(false);
  useLayoutEffect(() => {
    dialog.current?.showModal();
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    if (panel.current && anchor) motion.current = animateDockWindow(panel.current, anchor, true);
    return () => { motion.current?.cancel(); document.body.style.overflow = overflow; requestAnimationFrame(() => anchor?.focus()); };
  }, [anchor]);
  const close = () => {
    if (closing) return;
    setClosing(true);
    motion.current?.cancel();
    const animation = panel.current && anchor ? animateDockWindow(panel.current, anchor, false) : undefined;
    motion.current = animation;
    if (animation) void animation.finished.then(onClose, onClose); else onClose();
  };
  return <dialog ref={dialog} aria-label={title} className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none border-0 bg-transparent p-3 text-mobile-ink backdrop:bg-black/65" onCancel={event => { event.preventDefault(); close(); }}>
    <div className="flex min-h-full items-center justify-center" onClick={event => { if (event.target === event.currentTarget) close(); }}>
      <div ref={panel} inert={closing} className="w-full max-w-xl overflow-hidden rounded-3xl border border-mobile-border bg-mobile-surface shadow-xl">
        <header className="flex items-center justify-between gap-2 border-b border-mobile-border px-4 py-3"><h2 className="font-bold">{title}</h2><button type="button" onClick={close} aria-label="Close" className="grid size-11 shrink-0 place-items-center rounded-full focus-visible:outline-2 focus-visible:outline-primary-600"><X size={20}/></button></header>
        <CloseContext.Provider value={close}><div className="max-h-[calc(100dvh-7rem)] overflow-y-auto overscroll-contain p-4">{children}</div></CloseContext.Provider>
      </div>
    </div>
  </dialog>;
}
