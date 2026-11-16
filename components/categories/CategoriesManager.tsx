"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Category } from "@/types";
import {
  createCategory,
  renameCategory,
  deleteCategory,
  countTitlesUsingCategory,
} from "@/services/categories";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import CategoryEditorDialog from "@/components/categories/CategoryEditorDialog";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Pencil, Trash2 } from "lucide-react";

export default function CategoriesManager({
  initialCategories,
  userId,
}: {
  initialCategories: Category[];
  userId: string;
}) {
  const router = useRouter();
  const supabase = createClient();
  const { t } = useLanguage();

  const [categories, setCategories] = useState<Category[]>(initialCategories);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("💰");

  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [editName, setEditName] = useState("");
  const [editIcon, setEditIcon] = useState("💰");

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [usageCounts, setUsageCounts] = useState<Record<string, number>>({});


  const handleCreate = async () => {
    if (!newName.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const newCat = await createCategory(supabase, userId, newName, "both", newIcon);
      setCategories((prev) => [...prev, newCat].sort((a, b) => a.name.localeCompare(b.name)));
      setNewName("");
      setNewIcon("💰");
      setShowCreate(false);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const openEditModal = (cat: Category) => {
    setEditingCategory(cat);
    setEditName(cat.name);
    setEditIcon(cat.icon);
    setError(null);
  };

  const handleSaveEdit = async () => {
    if (!editingCategory || !editName.trim()) return;
    setLoading(true);
    setError(null);

    try {
      await renameCategory(supabase, userId, editingCategory.name, editName.trim(), editIcon);
      setCategories((prev) =>
        prev
          .map((c) =>
            c.id === editingCategory.id ? { ...c, name: editName.trim(), icon: editIcon } : c
          )
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      setEditingCategory(null);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const startDelete = async (cat: Category) => {
    setConfirmDeleteId(cat.id);
    try {
      const count = await countTitlesUsingCategory(supabase, userId, cat.name);
      setUsageCounts((prev) => ({ ...prev, [cat.id]: count }));
    } catch {
      // ignore
    }
  };

  const handleDelete = async (cat: Category) => {
    setLoading(true);
    setError(null);

    try {
      await deleteCategory(supabase, cat.id);
      setCategories((prev) => prev.filter((c) => c.id !== cat.id));
      setConfirmDeleteId(null);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {error && !editingCategory && !showCreate && (
        <div className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 p-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <Button onClick={() => { setError(null); setShowCreate(true); }}>{t.categories.createCategory}</Button>
      {showCreate && <CategoryEditorDialog name={newName} icon={newIcon} busy={loading} error={error}
        onName={setNewName} onIcon={setNewIcon} onSave={() => void handleCreate()}
        onClose={() => setShowCreate(false)} />}

      {categories.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t.categories.noCategories}</p>
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-2 overflow-y-auto pr-1 sm:grid-cols-2 sm:gap-3 lg:max-h-[480px] lg:grid-cols-4 lg:gap-5">
          {categories.map((cat) => (
            <Card key={cat.id} className="min-w-0 py-3">
              {confirmDeleteId === cat.id ? (
                <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-3">
                  <p className="text-sm text-red-700 dark:text-red-400 mb-3">
                    {t.categories.deleteConfirm.replace(
                      "{count}",
                      String(usageCounts[cat.id] ?? 0)
                    )}
                  </p>
                  <div className="flex gap-2">
                    <Button variant="danger" onClick={() => handleDelete(cat)} disabled={loading}>
                      {t.categories.delete}
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={() => setConfirmDeleteId(null)}
                      disabled={loading}
                    >
                      {t.categories.cancel}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex min-w-0 items-center justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-3">
                    <span className="shrink-0 text-2xl">{cat.icon}</span>
                    <span className="min-w-0 break-words font-medium text-slate-900 dark:text-slate-100">{cat.name}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      onClick={() => openEditModal(cat)}
                      aria-label={`${t.categories.edit} ${cat.name}`}
                      className="text-slate-400 hover:text-primary-600 p-1"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => startDelete(cat)}
                      className="text-slate-400 hover:text-red-600 p-1"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              )}
            </Card>
          ))}
        </div>
        
      )}

      {editingCategory && <CategoryEditorDialog editing name={editName} icon={editIcon} busy={loading} error={error}
        onName={setEditName} onIcon={setEditIcon} onSave={() => void handleSaveEdit()}
        onClose={() => setEditingCategory(null)} />}
    </div>
  );
}
