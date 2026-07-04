"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";
import { Upload } from "lucide-react";

export default function ReceiptUploader() {
  const router = useRouter();
  const supabase = createClient();

  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const handleUpload = async () => {
    if (!file) return;

    setLoading(true);
    setError(null);
    setStatus("Uploading...");

    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      setError("Not authenticated");
      setLoading(false);
      return;
    }

    const fileExt = file.name.split(".").pop();
    const filePath = `${userData.user.id}/${Date.now()}.${fileExt}`;

    const { error: uploadError } = await supabase.storage
      .from("receipts")
      .upload(filePath, file);

    if (uploadError) {
      setError(uploadError.message);
      setLoading(false);
      return;
    }

    const { data: receiptRecord, error: insertError } = await supabase
      .from("receipts")
      .insert({
        user_id: userData.user.id,
        file_path: filePath,
        status: "pending",
      })
      .select()
      .single();

    if (insertError) {
      setError(insertError.message);
      setLoading(false);
      return;
    }

    setStatus("Processing OCR...");

    const ocrRes = await fetch("/api/ocr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        receiptId: receiptRecord.id,
        filePath,
      }),
    });

    if (!ocrRes.ok) {
      const data = await ocrRes.json();
      setError(data.error ?? "OCR processing failed");
      setLoading(false);
      return;
    }

    setStatus("Done!");
    setLoading(false);
    setFile(null);
    router.refresh();
  };

  return (
    <div className="space-y-4">
      <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 p-8 text-center cursor-pointer hover:border-primary-400 transition">
        <Upload className="text-slate-400 mb-2" size={28} />
        <span className="text-sm text-slate-600">
          {file ? file.name : "Click to select a receipt image"}
        </span>
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => setFile(e.target.files?.[0] ?? null)}
        />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {status && <p className="text-sm text-slate-500">{status}</p>}

      <Button
        onClick={handleUpload}
        className="w-full"
        disabled={!file || loading}
      >
        {loading ? "Processing..." : "Upload & Scan"}
      </Button>
    </div>
  );
}