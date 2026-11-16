"use client";

import { useRef, useState } from "react";
import { Download, Upload } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function BackupRestore() {
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createClient();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const download = async () => {
    setBusy(true); setMessage("");
    try { const response = await fetch("/api/backup"); if (!response.ok) throw new Error("ดาวน์โหลดข้อมูลสำรองไม่สำเร็จ"); const blob = await response.blob(); const url = URL.createObjectURL(blob); const link = document.createElement("a"); link.href = url; link.download = "family-money-backup.json"; link.click(); URL.revokeObjectURL(url); setMessage("ดาวน์โหลดข้อมูลสำรองแล้ว"); }
    catch (error) { setMessage((error as Error).message); } finally { setBusy(false); }
  };
  const restore = async (file?: File) => {
    if (!file) return;
    if (file.size > 45_000_000) { setMessage("ไฟล์ต้องมีขนาดไม่เกิน 45 MB"); return; }
    if (!window.confirm("กู้คืนแบบรวมข้อมูลเข้ากับบัญชีปัจจุบัน รายการเดิมจะไม่ถูกลบ ดำเนินการหรือไม่?")) { if (inputRef.current) inputRef.current.value = ""; return; }
    setBusy(true); setMessage("");
    const uploadedPaths: string[] = [];
    try {
      const payload = JSON.parse(await file.text());
      if (!payload || payload.format !== "family-money-backup" || !payload.data || typeof payload.data !== "object") throw new Error("ไฟล์สำรองไม่ถูกต้อง");
      const attachments: { receipt_id: string; content_type: string; base64: string }[] = Array.isArray(payload.receipt_files) ? payload.receipt_files : [];
      if (attachments.length) {
        const { data: auth } = await supabase.auth.getUser();
        if (!auth.user) throw new Error("กรุณาเข้าสู่ระบบใหม่ก่อนกู้คืนไฟล์ภาพ");
        const receiptRows = Array.isArray(payload.data.receipts) ? payload.data.receipts as Record<string, unknown>[] : [];
        for (const attachment of attachments) {
          if (typeof attachment.receipt_id !== "string" || typeof attachment.base64 !== "string" || !/^image\/(jpeg|png|webp|heic|heif)$/.test(attachment.content_type)) throw new Error("พบไฟล์ใบเสร็จที่ไม่รองรับในข้อมูลสำรอง");
          const receipt = receiptRows.find((row) => row.id === attachment.receipt_id);
          if (!receipt) continue;
          const bytes = Uint8Array.from(atob(attachment.base64), (character) => character.charCodeAt(0));
          if (bytes.byteLength > 10_000_000) throw new Error("ภาพใบเสร็จแต่ละไฟล์ต้องไม่เกิน 10 MB");
          const extension = ({ "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "image/heif": "heif" } as Record<string, string>)[attachment.content_type];
          const path = `${auth.user.id}/restore-${crypto.randomUUID()}.${extension}`;
          const { error: uploadError } = await supabase.storage.from("receipts").upload(path, new Blob([bytes], { type: attachment.content_type }), { upsert: false, contentType: attachment.content_type });
          if (uploadError) throw new Error(`อัปโหลดภาพใบเสร็จไม่สำเร็จ: ${uploadError.message}`);
          uploadedPaths.push(path);
          receipt.file_path = path;
        }
      }
      delete payload.receipt_files;
      const response = await fetch("/api/backup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "กู้คืนไม่สำเร็จ");
      setMessage("กู้คืนข้อมูลและภาพใบเสร็จแล้ว กรุณารีเฟรชหน้า");
    }
    catch (error) { if (uploadedPaths.length) await supabase.storage.from("receipts").remove(uploadedPaths); setMessage((error as Error).message); } finally { setBusy(false); if (inputRef.current) inputRef.current.value = ""; }
  };
  return <section className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900"><div><h2 className="font-semibold text-slate-900 dark:text-white">สำรองและกู้คืนข้อมูล</h2><p className="mt-1 text-sm text-slate-500">ดาวน์โหลดข้อมูลเป็น JSON รวมภาพใบเสร็จ หรือกู้คืนแบบผสานเข้ากับบัญชีปัจจุบันโดยไม่ลบข้อมูลเดิม (ไม่เกิน 45 MB)</p></div><div className="flex flex-wrap gap-2"><button type="button" disabled={busy} onClick={() => void download()} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-indigo-600 px-4 text-sm font-semibold text-white disabled:opacity-50"><Download size={16}/>ดาวน์โหลดสำรอง</button><button type="button" disabled={busy} onClick={() => inputRef.current?.click()} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-700 disabled:opacity-50 dark:border-slate-700 dark:text-slate-200"><Upload size={16}/>กู้คืนไฟล์</button><input ref={inputRef} type="file" accept="application/json,.json" className="hidden" onChange={(event) => void restore(event.target.files?.[0])}/></div>{message && <p role="status" className="text-sm text-slate-600 dark:text-slate-300">{message}</p>}</section>;
}
