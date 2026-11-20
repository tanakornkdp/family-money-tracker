"use client";

import { useEffect, useRef } from "react";
import { createCurrencyFormatter, formatCurrency } from "@/lib/utils/formatCurrency";

const countDurationMs = 180;

export default function AnimatedCurrency({ amount, currency }: { amount: number; currency: string }) {
  const label = formatCurrency(amount, currency);
  const visual = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const element = visual.current;
    if (!element || !Number.isFinite(amount) || amount === 0) return;
    const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)");
    if (reducedMotion.matches) return;
    const format = createCurrencyFormatter(currency);
    let frame = 0;
    let observer: IntersectionObserver | undefined;
    const start = () => {
      observer?.disconnect();
      const startedAt = performance.now();
      element.textContent = format.format(0);
      const tick = (now: number) => {
        const progress = Math.min(1, (now - startedAt) / countDurationMs);
        const eased = progress * progress * (3 - 2 * progress);
        element.textContent = progress === 1 ? label : format.format(amount * eased);
        if (progress < 1) frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);
    };
    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver(entries => {
        if (entries.some(entry => entry.isIntersecting)) start();
      });
      observer.observe(element);
    } else {
      start();
    }
    const stop = () => {
      observer?.disconnect();
      cancelAnimationFrame(frame);
      element.textContent = label;
    };
    reducedMotion.addEventListener("change", stop);
    return () => {
      reducedMotion.removeEventListener("change", stop);
      stop();
    };
  }, [amount, currency, label]);

  return <span className="inline-grid tabular-nums">
    <span className="invisible col-start-1 row-start-1" aria-hidden="true">{label}</span>
    <span ref={visual} className="col-start-1 row-start-1" aria-hidden="true" data-animated-currency>{label}</span>
    <span className="sr-only">{label}</span>
  </span>;
}
