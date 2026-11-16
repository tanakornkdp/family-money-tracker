"use client";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
export default function LockedScreen({ email, onUnlocked }: { email: string; onUnlocked?: () => void }) {
  const router = useRouter(); const [password, setPassword] = useState(""); const [error, setError] = useState(""); const [loading, setLoading] = useState(false);
  const submit = async (event: FormEvent) => { event.preventDefault(); setLoading(true); setError(""); try { const response = await fetch("/api/security/lock", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password }) }); const result = await response.json(); if (!response.ok) { setError(result.error ?? "ปลดล็อกไม่สำเร็จ"); return; } setPassword(""); onUnlocked?.(); router.refresh(); } catch { setError("เชื่อมต่อไม่สำเร็จ กรุณาลองอีกครั้ง"); } finally { setLoading(false); } };
  const { t } = useLanguage();

  return (
    <main className="fixed inset-0 z-[100] flex min-h-screen items-center justify-center bg-slate-50 px-5 dark:bg-slate-950">
      <form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <LockKeyhole className="mb-4 text-emerald-700" aria-hidden="true" />
        <h1 className="text-xl font-semibold">แอปถูกล็อก</h1>
        <p className="mt-1 break-words text-sm text-slate-500">ยืนยันรหัสผ่านบัญชี {email} เพื่อใช้งานต่อ</p>
        <label className="mt-5 block text-sm font-medium">
          รหัสผ่าน
          <input autoFocus type="password" autoComplete="current-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 min-h-11 w-full rounded-lg border border-slate-300 bg-transparent px-3 dark:border-slate-700" />
        </label>
        {error && <p role="alert" className="mt-3 text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={loading} className="mt-4 min-h-11 w-full rounded-lg bg-emerald-700 font-semibold text-white disabled:opacity-60">
          {loading ? "กำลังตรวจสอบ…" : "ปลดล็อก"}
        </button>
        <div className="mt-2 text-center">
          <Link href="/forgot-password" className="inline-flex min-h-11 items-center rounded-md text-sm font-medium text-emerald-700 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 dark:text-emerald-300">
            {t.auth.forgotPasswordTitle}
          </Link>
        </div>
      </form>
    </main>
  );
}
