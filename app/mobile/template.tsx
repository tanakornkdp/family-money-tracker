"use client";

import { useLayoutEffect, useRef, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { animateDockWindow } from "@/lib/utils/dockWindowMotion";

export default function MobileRouteTemplate({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const assistant = pathname === "/mobile/assistant";
  const router = useRouter();
  const pageRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const page = pageRef.current;
    const dock = document.querySelector<HTMLElement>("[data-assistant-dock]");
    if (!assistant || !page || !dock) return;

    let motion = animateDockWindow(page, dock, true);
    const entrance = motion;
    let leaving = false;
    if (entrance) void entrance.finished.then(() => {
      if (!leaving) entrance.cancel();
    }, () => undefined);

    function leaveOnLink(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return;
      const link = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      if (!link || link.hasAttribute("download") || (link.target && link.target !== "_self")) return;
      const target = new URL(link.href);
      if (target.origin !== location.origin || !target.pathname.startsWith("/mobile/") || target.pathname === "/mobile/assistant") return;
      if (link.hasAttribute("data-mobile-home")) return;
      if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
      if (leaving) { event.preventDefault(); return; }

      if (motion?.playState === "running") motion.reverse();
      else {
        motion?.cancel();
        motion = animateDockWindow(page!, dock!, false);
      }
      if (!motion) return;
      event.preventDefault();
      leaving = true;
      void motion.finished.then(() => {
        router.push(target.pathname + target.search + target.hash);
      }, () => undefined);
    }

    document.addEventListener("click", leaveOnLink, true);
    return () => {
      document.removeEventListener("click", leaveOnLink, true);
      motion?.cancel();
    };
  }, [assistant, router]);

  return <div ref={pageRef} className={assistant || pathname === "/mobile/dashboard" ? undefined : "mobile-route-enter"} data-assistant-page={assistant || undefined}>{children}</div>;
}
