"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { createCategory, renameCategory } from "@/services/categories";
import CategoryEditorDialog from "@/components/categories/CategoryEditorDialog";
import type { Category, TransactionType } from "@/types";

export default function RecurringCategoryEditor({ userId, type, locale, original, categories, onSaved, onClose }: {
  userId: string;
  type: TransactionType;
  locale: "th" | "en";
  original?: Category;
  categories: Category[];
  onSaved: (category: Category) => void;
  onClose: () => void;
}) {
  const th = locale === "th";
  const [name, setName] = useState(original?.name ?? "");
  const [icon, setIcon] = useState(original?.icon ?? "💰");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    const trimmed = name.trim();
    if (!trimmed || busy) return;
    if (categories.some(item => item.id !== original?.id && item.name.toLowerCase() === trimmed.toLowerCase())) {
      setError(th ? "มีหมวดหมู่ชื่อนี้แล้ว" : "A category with this name already exists.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const supabase = createClient();
      if (original) {
        await renameCategory(supabase, userId, original.name, trimmed, icon);
        onSaved({ ...original, name: trimmed, icon });
      } else {
        onSaved(await createCategory(supabase, userId, trimmed, type, icon));
      }
    } catch {
      setError(th ? "บันทึกหมวดหมู่ไม่สำเร็จ กรุณาลองใหม่" : "Could not save the category. Try again.");
    } finally { setBusy(false); }
  }

  return <CategoryEditorDialog editing={Boolean(original)} name={name} icon={icon} busy={busy} error={error}
    onName={setName} onIcon={setIcon} onSave={() => void save()} onClose={onClose} />;
}
