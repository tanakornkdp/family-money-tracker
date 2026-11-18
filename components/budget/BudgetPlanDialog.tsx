"use client";

import { useLayoutEffect, useRef, useState, type RefObject } from "react";
import type { BudgetPlan, Household } from "@/types";
import BudgetPlanForm from "./BudgetPlanForm";
import { X } from "lucide-react";
import { animateDockWindow } from "@/lib/utils/dockWindowMotion";

export default function BudgetPlanDialog({ anchor, title, onClose, userId, households, onCreated }: {
  anchor: RefObject<HTMLDivElement | null>;
  title: string;
  onClose: () => void;
  userId: string;
  households: Household[];
  onCreated: (plan: BudgetPlan) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const motion = useRef<Animation | undefined>(undefined);
  const [closing, setClosing] = useState(false);
  useLayoutEffect(() => {
    dialog.current?.showModal();
    const previous = document.body.style.overflow;
    const trigger = anchor.current;
    document.body.style.overflow = "hidden";
    if (panel.current && anchor.current) motion.current = animateDockWindow(panel.current, anchor.current, true);
    return () => { motion.current?.cancel(); document.body.style.overflow = previous; requestAnimationFrame(() => trigger?.querySelector("button")?.focus()); };
  }, [anchor]);
  const close = () => {
    if (closing) return;
    setClosing(true);
    motion.current?.cancel();
    const animation = panel.current && anchor.current ? animateDockWindow(panel.current, anchor.current, false) : undefined;
    motion.current = animation;
    if (animation) void animation.finished.then(onClose, onClose);
    else onClose();
  };
  return <dialog ref={dialog} aria-label={title} onCancel={event => { event.preventDefault(); close(); }}
    onClick={event => { if (event.target === event.currentTarget) close(); }}
    className="fixed inset-0 m-0 h-dvh max-h-none w-screen max-w-none border-0 bg-transparent p-4 text-slate-900 backdrop:bg-black/65 dark:text-slate-100">
    <div className="flex min-h-full items-center justify-center" onClick={event => { if (event.target === event.currentTarget) close(); }}>
      <div ref={panel} inert={closing} className="pointer-events-auto relative w-full max-w-xl rounded-2xl bg-white shadow-xl dark:bg-slate-900">
        <button type="button" aria-label="Close" onClick={close} className="absolute right-2 top-2 z-10 flex size-11 items-center justify-center rounded-full text-slate-500 hover:bg-slate-100 focus-visible:outline-2 focus-visible:outline-primary-600 dark:hover:bg-slate-800"><X size={20} /></button>
        <div className="max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain rounded-2xl p-1"><BudgetPlanForm userId={userId} households={households} onCreated={plan => { onCreated(plan); close(); }} onCancel={close} /></div>
      </div>
    </div>
  </dialog>;
}
