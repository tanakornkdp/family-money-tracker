"use client";

import { useEffect } from "react";
import { isStandaloneApp } from "@/lib/utils/standalone";

export default function PwaRegister() {
  useEffect(() => {
    const { pathname } = window.location;
    if (isStandaloneApp() && ["/", "/dashboard", "/desktop"].includes(pathname)) {
      window.location.replace("/mobile/dashboard");
      return;
    }

    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => {
        // Registration is optional; the web app remains fully usable without it.
      });
    };

    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });

    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
