"use client";
import { useEffect, useState } from "react";
import LockedScreen from "@/components/security/LockedScreen";
export default function IdleLockProvider({ children, email, timeoutMinutes }: { children: React.ReactNode; email: string; timeoutMinutes: number }) {
  const [locked, setLocked] = useState(false);
  useEffect(() => {
    if (timeoutMinutes <= 0 || locked) return;
    let timer: ReturnType<typeof setTimeout>; let locking = false; let lastActivity = Date.now();
    const lock = async () => { if (locking) return; locking = true; try { await fetch("/api/security/lock", { method: "POST", cache: "no-store" }); } finally { setLocked(true); } };
    const schedule = () => { clearTimeout(timer); timer = setTimeout(() => void lock(), timeoutMinutes * 60_000); };
    const onActivity = () => { lastActivity = Date.now(); schedule(); };
    const events: (keyof WindowEventMap)[] = ["pointerdown", "keydown", "touchstart"];
    events.forEach((event) => window.addEventListener(event, onActivity, { passive: true }));
    const onVisibility = () => { if (document.visibilityState === "visible") { if (Date.now() - lastActivity >= timeoutMinutes * 60_000) void lock(); else schedule(); } };
    document.addEventListener("visibilitychange", onVisibility); schedule();
    return () => { clearTimeout(timer); events.forEach((event) => window.removeEventListener(event, onActivity)); document.removeEventListener("visibilitychange", onVisibility); };
  }, [locked, timeoutMinutes]);
  return locked ? <LockedScreen email={email} onUnlocked={() => setLocked(false)}/> : <>{children}</>;
}
