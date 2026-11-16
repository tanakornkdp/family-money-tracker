"use client";

import { useEffect, useRef } from "react";
import ChatWindow from "@/components/assistant/ChatWindow";

export default function MobileAssistantScreen({
  title,
  subtitle,
}: {
  title: string;
  subtitle: string;
}) {
  const screenRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const shell = screenRef.current?.closest<HTMLElement>(".mobile-app-shell");
    const viewport = window.visualViewport;
    if (!shell || !viewport) return;

    const updateViewport = () => {
      // Pinch zoom should keep the browser's native pan and zoom behavior.
      if (Math.abs(viewport.scale - 1) > 0.01) {
        shell.style.removeProperty("--assistant-visible-height");
        shell.style.removeProperty("--assistant-visible-top");
        return;
      }
      const visibleHeight = Math.floor(Math.min(window.innerHeight, viewport.height));
      if (visibleHeight <= 0) return;
      shell.style.setProperty("--assistant-visible-height", `${visibleHeight}px`);
      shell.style.setProperty("--assistant-visible-top", `${Math.max(0, viewport.offsetTop)}px`);
    };

    updateViewport();
    viewport.addEventListener("resize", updateViewport);
    viewport.addEventListener("scroll", updateViewport);
    window.addEventListener("resize", updateViewport);

    return () => {
      viewport.removeEventListener("resize", updateViewport);
      viewport.removeEventListener("scroll", updateViewport);
      window.removeEventListener("resize", updateViewport);
      shell.style.removeProperty("--assistant-visible-height");
      shell.style.removeProperty("--assistant-visible-top");
    };
  }, []);

  return (
    <main ref={screenRef} className="mobile-assistant-screen flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
      <header className="shrink-0">
        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="mobile-assistant-subtitle text-sm text-slate-500">{subtitle}</p>
      </header>
      <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-3xl bg-mobile-surface px-3 shadow-sm">
        <ChatWindow mobileLayout />
      </section>
    </main>
  );
}
