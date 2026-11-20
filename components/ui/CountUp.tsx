"use client";
import { useEffect, useRef } from "react";

export default function CountUp({ value }: { value: string }) {
  const visual = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    const element = visual.current;
    const match = value.match(/([\d,]+(?:\.\d+)?)/);
    const motion = matchMedia("(prefers-reduced-motion: reduce)");
    if (!element || !match || motion.matches) return;
    const target = Number(match[1].replace(/,/g, ""));
    const prefix = value.slice(0, match.index);
    const suffix = value.slice((match.index ?? 0) + match[0].length);
    const decimals = match[1].includes(".") ? match[1].split(".")[1].length : 0;
    let frame = 0;
    const start = performance.now();
    const stop = () => { cancelAnimationFrame(frame); element.textContent = value; };
    const tick = (now: number) => {
      const progress = Math.min(1, (now - start) / 180);
      const current = target * (1 - Math.pow(1 - progress, 3));
      element.textContent = progress === 1 ? value : prefix + current.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals }) + suffix;
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    motion.addEventListener("change", stop);
    return () => { motion.removeEventListener("change", stop); stop(); };
  }, [value]);
  // Server and reduced-motion renders already contain the final value.
  return <span><span ref={visual} aria-hidden="true">{value}</span><span className="sr-only">{value}</span></span>;
}
