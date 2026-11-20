"use client";

import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";
import { Upload } from "lucide-react";
import ReceiptScanResult from './ReceiptScanResult';
import { usePathname } from 'next/navigation';
import type { Receipt } from '@/types';

export default function ReceiptUploader({ initialFile }: { initialFile?: File | null }) {
  const { t } = useLanguage();
  const router = useRouter();
  const pathname = usePathname();
  const supabase = createClient();

  const [file, setFile] = useState<File | null>(initialFile ?? null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [scan, setScan] = useState<{ receipt: Receipt; warnings: string[]; currency: string | null } | null>(null);

  const handleUpload = async () => {
    if (!file) return;

    const supportedTypes = new Set(["image/jpeg", "image/png", "image/webp", "image/heic", "image/heif"]);
    if (!supportedTypes.has(file.type)) {
      setError("กรุณาเลือกไฟล์ภาพ JPEG, PNG, WebP หรือ HEIC");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError("ไฟล์ภาพต้องมีขนาดไม่เกิน 10 MB");
      return;
    }

    setLoading(true);
    setError(null);
    setScan(null);
    setStatus("กำลังอัปโหลดภาพ…");

    try {
      const { data: userData, error: authError } = await supabase.auth.getUser();
      if (authError || !userData.user) throw new Error("กรุณาเข้าสู่ระบบก่อนอัปโหลดใบเสร็จ");

      const extensionByType: Record<string, string> = {
        "image/jpeg": "jpg",
        "image/png": "png",
        "image/webp": "webp",
        "image/heic": "heic",
        "image/heif": "heif",
      };
      const filePath = `${userData.user.id}/${crypto.randomUUID()}.${extensionByType[file.type]}`;
      const { error: uploadError } = await supabase.storage.from("receipts").upload(filePath, file, {
        cacheControl: "3600",
        upsert: false,
        contentType: file.type,
      });
      if (uploadError) throw new Error(uploadError.message);

      const { data: receiptRecord, error: insertError } = await supabase
        .from("receipts")
        .insert({ user_id: userData.user.id, file_path: filePath, status: "pending" })
        .select("id")
        .single();

      if (insertError || !receiptRecord) {
        await supabase.storage.from("receipts").remove([filePath]);
        throw new Error(insertError?.message ?? "บันทึกข้อมูลใบเสร็จไม่สำเร็จ");
      }

      setStatus("กำลังให้ AI อ่านภาพและตรวจยอดกับ OCR…");
      const ocrResponse = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ receiptId: receiptRecord.id, filePath }),
      });
      const result = await ocrResponse.json().catch(() => null);
      if (!ocrResponse.ok) throw new Error(result?.error ?? "อ่านใบเสร็จไม่สำเร็จ กรุณาลองอีกครั้ง");

      setScan(result);
      setStatus("อ่านภาพแล้ว กรุณาตรวจข้อมูลก่อนสร้างรายการ");
      setFile(null);
      router.refresh();
    } catch (uploadError) {
      setStatus(null);
      setError(uploadError instanceof Error ? uploadError.message : "อัปโหลดไม่สำเร็จ กรุณาลองอีกครั้ง");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 p-8 text-center cursor-pointer hover:border-primary-400 transition">
        <Upload className="text-slate-400 mb-2" size={28} />
        <span className="text-sm text-slate-600">
          {file ? file.name : "เลือกภาพใบเสร็จ"}
        </span>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          disabled={loading}
          onChange={(e) => { setFile(e.target.files?.[0] ?? null); setScan(null); setStatus(null); }}
        />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {status && <p role="status" className="text-sm text-slate-500">{status}</p>}
      <p className="text-xs leading-relaxed text-slate-500 dark:text-slate-400">{t.receipts.privacyNotice}</p>
      {scan && <ReceiptScanResult scan={scan} href={pathname.startsWith('/mobile') ? '/mobile/receipts' : '/receipts'} />}

      <Button
        onClick={handleUpload}
        className="w-full"
        disabled={!file || loading}
      >
        {loading ? "กำลังอ่านภาพ…" : "อ่านใบเสร็จด้วย AI"}
      </Button>
    </div>
  );
}
