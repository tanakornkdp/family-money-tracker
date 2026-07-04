"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { TransactionTitle, TransactionType, Category, FinancialGoal } from "@/types";
import { updateTitle, deleteTitle } from "@/services/transactionTitles";
import { getCategories, getCategoryIconMap, createCategory, renameCategory } from "@/services/categories";
import { getGoals } from "@/services/goals";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { TITLE_ICONS } from "@/lib/constants/titleIcons";
import Modal from "@/components/ui/Modal";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { Pencil, ChevronDown } from "lucide-react";

export default function EditTitleModal({
  titleItem,
  open,
  onClose,
  onUpdated,
  onDeleted,
  onIconChanged,
}: {
  titleItem: TransactionTitle;
  open: boolean;
  onClose: () => void;
  onUpdated: (updated: TransactionTitle) => void;
  onDeleted: (id: string) => void;
  onIconChanged?: (categoryName: string, icon: string) => void;
}) {
  const router = useRouter();
  const supabase = createClient();
  const { t } = useLanguage();

  const [name, setName] = useState(titleItem.name);
  const [type, setType] = useState<TransactionType>(titleItem.type);
  const [category, setCategory] = useState(titleItem.category);
  const [goalId, setGoalId] = useState(titleItem.goal_id ?? "");
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryIconMap, setCategoryIconMap] = useState<Record<string, string>>({});
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [loading, setLoading] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  const [showNewCategoryModal, setShowNewCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState("💰");
  const [savingNewCategory, setSavingNewCategory] = useState(false);

  const [showEditCategoryModal, setShowEditCategoryModal] = useState(false);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [editCategoryIcon, setEditCategoryIcon] = useState("💰");
  const [savingEditCategory, setSavingEditCategory] = useState(false);

  async function loadOptions() {
    try {
      const catData = await getCategories(supabase);
      const iconMap = await getCategoryIconMap(supabase);
      const goalData = await getGoals(supabase);

      setCategories(catData);
      setCategoryIconMap(iconMap);
      setGoals(goalData.filter((g) => g.status === "active"));
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    if (!open) return;
    Promise.resolve().then(() => {
      setName(titleItem.name);
      setType(titleItem.type);
      setCategory(titleItem.category);
      setGoalId(titleItem.goal_id ?? "");
      setConfirmDelete(false);
      loadOptions();
    });
  }, [open, titleItem]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target as Node)) {
        setCategoryDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const openCreateCategoryModal = () => {
    setNewCategoryName("");
    setNewCategoryIcon("💰");
    setShowNewCategoryModal(true);
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    setSavingNewCategory(true);
    setError(null);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) throw new Error("Not authenticated");

      const newCat = await createCategory(
        supabase,
        userData.user.id,
        newCategoryName.trim(),
        "both",
        newCategoryIcon
      );

      setCategories((prev) => [...prev, newCat].sort((a, b) => a.name.localeCompare(b.name)));
      setCategoryIconMap((prev) => ({ ...prev, [newCat.name]: newCat.icon }));
      setCategory(newCat.name);
      onIconChanged?.(newCat.name, newCat.icon);

      setShowNewCategoryModal(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSavingNewCategory(false);
    }
  };

  const handleSaveEditCategory = async () => {
    if (!editCategoryName.trim()) return;
    setSavingEditCategory(true);
    setError(null);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) throw new Error("Not authenticated");

      const oldName = editCategoryName === category ? category : category;
      const targetOldName = categoryIconMap[editCategoryName] !== undefined ? editCategoryName : category;

      await renameCategory(supabase, userData.user.id, category, editCategoryName.trim(), editCategoryIcon);

      const oldCategoryName = category;
      const newCategoryNameValue = editCategoryName.trim();

      setCategoryIconMap((prev) => {
        const next = { ...prev };
        delete next[oldCategoryName];
        next[newCategoryNameValue] = editCategoryIcon;
        return next;
      });
      setCategories((prev) =>
        prev
          .map((c) =>
            c.name === oldCategoryName ? { ...c, name: newCategoryNameValue, icon: editCategoryIcon } : c
          )
          .sort((a, b) => a.name.localeCompare(b.name))
      );
      setCategory(newCategoryNameValue);
      onIconChanged?.(newCategoryNameValue, editCategoryIcon);

      setShowEditCategoryModal(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSavingEditCategory(false);
    }
  };

  const handleSave = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const updated = await updateTitle(supabase, titleItem.id, {
        name: name.trim(),
        type: type,
        category: category,
        goal_id: goalId || null,
      });

      onUpdated(updated);
      onClose();
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    setError(null);

    try {
      await deleteTitle(supabase, titleItem.id);
      onDeleted(titleItem.id);
      onClose();
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Modal open={open} onClose={onClose} title={t.transactions.editTitle}>
        <div className="space-y-4">
          <Input label={t.transactions.formTitle} value={name} onChange={(e) => setName(e.target.value)} />

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {t.transactions.formCategory}
            </label>
            <div className="relative" ref={categoryDropdownRef}>
              <button
                type="button"
                onClick={() => setCategoryDropdownOpen((prev) => !prev)}
                className="w-full flex items-center justify-between rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <span className="flex items-center gap-2">
                  <span>{categoryIconMap[category] ?? "💰"}</span>
                  <span>{category}</span>
                </span>
                <ChevronDown size={16} className="text-slate-400" />
              </button>

              {categoryDropdownOpen && (
                <div className="absolute z-20 mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg max-h-64 overflow-y-auto">
                  {categories.map((c) => (
                    <div
                      key={c.id}
                      className="flex items-center justify-between px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700"
                    >
                      <button
                        type="button"
                        onClick={() => {
                          setCategory(c.name);
                          setCategoryDropdownOpen(false);
                        }}
                        className="flex items-center gap-2 flex-1 text-left text-sm text-slate-900 dark:text-slate-100"
                      >
                        <span>{categoryIconMap[c.name] ?? "💰"}</span>
                        <span>{c.name}</span>
                      </button>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCategory(c.name);
                          setEditCategoryName(c.name);
                          setEditCategoryIcon(c.icon);
                          setShowEditCategoryModal(true);
                          setCategoryDropdownOpen(false);
                        }}
                        className="text-slate-400 hover:text-primary-600 p-1"
                      >
                        <Pencil size={14} />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => {
                      openCreateCategoryModal();
                      setCategoryDropdownOpen(false);
                    }}
                    className="w-full text-left px-3 py-2 text-sm font-semibold text-primary-600 hover:bg-slate-50 dark:hover:bg-slate-700 border-t border-slate-100 dark:border-slate-700"
                  >
                    {t.transactions.addNewCategory}
                  </button>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              {t.transactions.formType}
            </label>
            <div className="flex rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700">
              <button
                type="button"
                onClick={() => setType("income")}
                className={`flex-1 py-2.5 text-sm font-semibold transition-all ${
                  type === "income"
                    ? "bg-emerald-500 text-white"
                    : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                }`}
              >
                {t.transactions.income}
              </button>
              <button
                type="button"
                onClick={() => setType("expense")}
                className={`flex-1 py-2.5 text-sm font-semibold transition-all ${
                  type === "expense"
                    ? "bg-rose-500 text-white"
                    : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                }`}
              >
                {t.transactions.expense}
              </button>
            </div>
          </div>

          {goals.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {t.transactions.linkToGoal}
              </label>
              <select
                value={goalId}
                onChange={(e) => setGoalId(e.target.value)}
                className="rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="">{t.transactions.noGoalLink}</option>
                {goals.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          {confirmDelete ? (
            <div className="rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 p-3">
              <p className="text-sm text-red-700 dark:text-red-400 mb-2">
                {t.transactions.deleteTitleConfirm}
              </p>
              <div className="flex gap-2">
                <Button variant="danger" onClick={handleDelete} disabled={loading}>
                  {t.goals.delete}
                </Button>
                <Button variant="secondary" onClick={() => setConfirmDelete(false)} disabled={loading}>
                  {t.goals.cancel}
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <Button onClick={handleSave} disabled={loading || !name.trim()}>
                {t.transactions.saveChanges}
              </Button>
              <button
                onClick={() => setConfirmDelete(true)}
                className="text-xs text-red-600 hover:text-red-700"
              >
                {t.goals.delete}
              </button>
            </div>
          )}
        </div>
      </Modal>

      {showNewCategoryModal && (
        <Modal
          open={showNewCategoryModal}
          onClose={() => setShowNewCategoryModal(false)}
          title={t.categories.createCategory}
        >
          <div className="space-y-4">
            <Input
              label={t.categories.categoryName}
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
            />

            <div>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Icon</p>
              <div className="grid grid-cols-8 gap-2">
                {TITLE_ICONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setNewCategoryIcon(icon)}
                    className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition ${
                      newCategoryIcon === icon
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
              <Button
                type="button"
                onClick={handleCreateCategory}
                disabled={savingNewCategory || !newCategoryName.trim()}
              >
                {t.categories.create}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowNewCategoryModal(false)}
              >
                {t.categories.cancel}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {showEditCategoryModal && (
        <Modal
          open={showEditCategoryModal}
          onClose={() => setShowEditCategoryModal(false)}
          title={t.categories.edit}
        >
          <div className="space-y-4">
            <Input
              label={t.categories.categoryName}
              value={editCategoryName}
              onChange={(e) => setEditCategoryName(e.target.value)}
            />

            <div>
              <p className="text-xs font-medium text-slate-600 dark:text-slate-400 mb-1.5">Icon</p>
              <div className="grid grid-cols-8 gap-2">
                {TITLE_ICONS.map((icon) => (
                  <button
                    key={icon}
                    type="button"
                    onClick={() => setEditCategoryIcon(icon)}
                    className={`w-9 h-9 rounded-lg flex items-center justify-center text-lg transition ${
                      editCategoryIcon === icon
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
              <Button
                type="button"
                onClick={handleSaveEditCategory}
                disabled={savingEditCategory || !editCategoryName.trim()}
              >
                {t.categories.saveChanges}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowEditCategoryModal(false)}
              >
                {t.categories.cancel}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}