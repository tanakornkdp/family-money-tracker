"use client";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { animateDockWindow } from "@/lib/utils/dockWindowMotion";

export function useFieldPopover(genie = false) {
  const anchor = useRef<HTMLButtonElement>(null);
  const panel = useRef<HTMLDivElement>(null);
  const animation = useRef<Animation | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const closing = useRef(false);
  const close = useCallback((restoreFocus = true) => {
    if (closing.current) return;
    closing.current = true;
    animation.current?.cancel();
    const finish = () => { setOpen(false); closing.current = false; if (restoreFocus) anchor.current?.focus({ preventScroll: true }); };
    const element = panel.current;
    if (!element || !anchor.current || matchMedia("(prefers-reduced-motion: reduce)").matches) { finish(); return; }
    const motion = genie ? animateDockWindow(element, anchor.current, false) : element.animate([{ opacity: 1, transform: "translateY(0)" }, { opacity: 0, transform: "translateY(-8px)" }], { duration: 180, easing: "ease-in", fill: "forwards" });
    animation.current = motion;
    if (motion) void motion.finished.then(finish, finish); else finish();
  }, [genie]);
  useLayoutEffect(() => {
    if (!open || !panel.current || !anchor.current) return;
    const element = panel.current;
    const box = anchor.current.getBoundingClientRect();
    element.style.width = `${genie ? Math.min(304, innerWidth - 24) : box.width}px`;
    element.style.left = `${Math.max(12, Math.min(box.left, innerWidth - (genie ? Math.min(304, innerWidth - 24) : box.width) - 12))}px`;
    element.style.top = `${box.bottom + 6}px`;
    element.showPopover();
    const available = innerHeight - box.bottom - 18;
    if (available < Math.min(element.scrollHeight, genie ? 320 : 180) && box.top > available) {
      element.style.top = `${Math.max(12, box.top - Math.min(element.scrollHeight, box.top - 18) - 6)}px`;
      element.style.maxHeight = `${box.top - 18}px`;
    } else element.style.maxHeight = `${Math.max(120, available)}px`;
    if (!matchMedia("(prefers-reduced-motion: reduce)").matches) animation.current = genie ? animateDockWindow(element, anchor.current, true) : element.animate([{ opacity: 0, transform: "translateY(-10px)" }, { opacity: 1, transform: "translateY(0)" }], { duration: 260, easing: "cubic-bezier(.2,.8,.2,1)" });
    element.querySelector<HTMLElement>('[aria-selected="true"], [aria-pressed="true"], button:not(:disabled)')?.focus({ preventScroll: true });
    return () => { animation.current?.cancel(); element.hidePopover(); };
  }, [open, genie]);
  useEffect(() => {
    if (!open) return;
    const outside = (event: PointerEvent) => { if (event.target instanceof Node && !panel.current?.contains(event.target) && !anchor.current?.contains(event.target)) close(false); };
    const key = (event: KeyboardEvent) => { if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(); } };
    const resize = () => close(false);
    document.addEventListener("pointerdown", outside);
    document.addEventListener("keydown", key, true);
    window.addEventListener("resize", resize);
    return () => { document.removeEventListener("pointerdown", outside); document.removeEventListener("keydown", key, true); window.removeEventListener("resize", resize); };
  }, [open, close]);
  return { anchor, panel, open, close, toggle: () => open ? close() : setOpen(true) };
}
