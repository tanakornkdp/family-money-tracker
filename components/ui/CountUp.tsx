"use client";
import { useEffect, useState } from "react";

export default function CountUp({ value }: { value: string }) {
  const match = value.match(/([\d,]+(?:\.\d+)?)/);
  const target = match ? Number(match[1].replace(/,/g, "")) : 0;
  const prefix = match ? value.slice(0, match.index) : "";
  const suffix = match ? value.slice((match.index ?? 0) + match[0].length) : value;
  const decimals = match?.[1].includes(".") ? match[1].split(".")[1].length : 0;
  const [current, setCurrent] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { const timer = window.setTimeout(() => setCurrent(target), 0); return () => window.clearTimeout(timer); }
    const start = performance.now();
    let frame = 0;
    const tick = (now: number) => { const progress = Math.min(1, (now - start) / 1100); const eased = 1 - Math.pow(1 - progress, 3); setCurrent(target * eased); if (progress < 1) frame = requestAnimationFrame(tick); };
    frame = requestAnimationFrame(tick); return () => cancelAnimationFrame(frame);
  }, [target]);
  return <>{prefix}{current.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}{suffix}</>;
}
