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
import { TITLE_ICONS } from "@/lib/constants/titleIcons";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
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

  const [showAll, setShowAll] = useState(false);
  const displayedCategories = showAll ? categories : categories.slice(0, 9);

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
      {error && !editingCategory && (
        <div className="rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900 p-3 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      {!showCreate ? (
        <Button onClick={() => setShowCreate(true)}>{t.categories.createCategory}</Button>
      ) : (
        <Card>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-slate-100 mb-4">
            {t.categories.createCategory}
          </h2>
          <div className="space-y-3">
            <Input
              label={t.categories.categoryName}
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
            <div>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Icon</p>
              <div className="grid gap-2" style={{ gridTemplateColumns: "repeat(15, minmax(0, 1fr))" }}>
                {TITLE_ICONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setNewIcon(icon)}
                    className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition ${
                      newIcon === icon
                        ? "bg-primary-600 ring-2 ring-primary-600 ring-offset-1 ring-offset-white dark:ring-offset-slate-900"
                        : "bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600"
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={loading || !newName.trim()}>
                {t.categories.create}
              </Button>
              <Button variant="secondary" onClick={() => setShowCreate(false)} disabled={loading}>
                {t.categories.cancel}
              </Button>
            </div>
          </div>
        </Card>
      )}

      {categories.length === 0 ? (
        <Card>
          <p className="text-sm text-slate-500 dark:text-slate-400">{t.categories.noCategories}</p>
        </Card>
      ) : (
        <div className="grid grid-cols-4 gap-5 max-h-[480px] overflow-y-auto pr-1">
          {categories.map((cat) => (
            <Card key={cat.id} className="py-3">
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
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{cat.icon}</span>
                    <span className="font-medium text-slate-900 dark:text-slate-100">{cat.name}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openEditModal(cat)}
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

      {editingCategory && (
        <Modal
          open={!!editingCategory}
          onClose={() => setEditingCategory(null)}
          title={t.categories.edit}
        >
          <div className="space-y-4">
            <Input
              label={t.categories.categoryName}
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
            />

            <div>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Icon</p>
              <div className="grid grid-cols-8 gap-2">
                {TITLE_ICONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setEditIcon(icon)}
                    className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition ${
                      editIcon === icon
                        ? "bg-primary-600 ring-2 ring-primary-600 ring-offset-1 ring-offset-white dark:ring-offset-slate-900"
                        : "bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600"
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>

            {error && <p className="text-sm text-red-600">{error}</p>}

            <div className="flex gap-2">
              <Button onClick={handleSaveEdit} disabled={loading || !editName.trim()}>
                {t.categories.saveChanges}
              </Button>
              <Button variant="secondary" onClick={() => setEditingCategory(null)} disabled={loading}>
                {t.categories.cancel}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}