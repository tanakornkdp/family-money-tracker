"use client";

import AnimatedSelect from "@/components/ui/AnimatedSelect";
import { toDateInputValue } from "@/lib/utils/dateHelpers";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import { TransactionType, Household, TransactionTitle, FinancialGoal, Category, TravelTrip } from "@/types";
import { useLanguage } from "@/lib/i18n/LanguageProvider";
import { getTitles, createTitle } from "@/services/transactionTitles";
import { getUserHouseholds } from "@/services/households";
import { getGoals } from "@/services/goals";
import { getCategories, getCategoryIconMap, createCategory, renameCategory } from "@/services/categories";
import EditTitleModal from "./EditTitleModal";
import { Pencil, ChevronDown } from "lucide-react";
import CategoryEditorDialog from "@/components/categories/CategoryEditorDialog";
import { getCreditCards } from "@/services/creditCards";
import { CreditCard, PaymentMethod } from "@/types";
import { CreditCard as CreditCardIcon, Banknote, Wallet } from "lucide-react";
import { formatCurrency } from "@/lib/utils/formatCurrency";

export default function TransactionForm({
  categoryIconMap: externalIconMap,
  onIconChanged,
  onSaved,
}: {
  categoryIconMap?: Record<string, string>;
  onIconChanged?: (categoryName: string, icon: string) => void;
  onSaved?: () => void;
} = {}) {
  const router = useRouter();
  const { t } = useLanguage();
  const supabase = createClient();

  const [titles, setTitles] = useState<TransactionTitle[]>([]);
  const [goals, setGoals] = useState<FinancialGoal[]>([]);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoryIconMap, setCategoryIconMap] = useState<Record<string, string>>(externalIconMap ?? {});

  const [selectedTitleId, setSelectedTitleId] = useState<string>("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(() => toDateInputValue());
  const [activeTrips, setActiveTrips] = useState<TravelTrip[]>([]);
  const [selectedTravelTripId, setSelectedTravelTripId] = useState("");
  const [travelRate, setTravelRate] = useState("");
  const [travelRateDate, setTravelRateDate] = useState("");
  const [householdId, setHouseholdId] = useState<string>("");

  const [showNewTitle, setShowNewTitle] = useState(false);
  const [newTitleName, setNewTitleName] = useState("");
  const [newTitleType, setNewTitleType] = useState<TransactionType>("expense");
  const [newTitleCategoryName, setNewTitleCategoryName] = useState("");
  const [newTitleGoalId, setNewTitleGoalId] = useState("");
  const [savingTitle, setSavingTitle] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [duplicateWarning, setDuplicateWarning] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [editingTitle, setEditingTitle] = useState<TransactionTitle | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [newCategoryIcon, setNewCategoryIcon] = useState("💰");
  const [savingCategory, setSavingCategory] = useState(false);

  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  const [showEditCategoryModal, setShowEditCategoryModal] = useState(false);
  const [editCategoryName, setEditCategoryName] = useState("");
  const [editCategoryIcon, setEditCategoryIcon] = useState("💰");
  const [savingEditCategory, setSavingEditCategory] = useState(false);
  const [editingOriginalName, setEditingOriginalName] = useState("");

  const [creditCards, setCreditCards] = useState<CreditCard[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [selectedCardId, setSelectedCardId] = useState<string>("");

  async function loadTitles() {
    try {
      const data = await getTitles(supabase);
      setTitles(data);
      if (data.length > 0 && !selectedTitleId) {
        setSelectedTitleId(data[0].id);
      }
    } catch {
      // ignore
    }
  }

  async function loadGoals() {
    try {
      const data = await getGoals(supabase);
      setGoals(data.filter((g) => g.status === "active"));
    } catch {
      // ignore
    }
  }

  async function loadHouseholds() {
    try {
      const data = await getUserHouseholds(supabase);
      setHouseholds(data);
    } catch {
      // ignore
    }
  }

  async function loadCategories() {
    try {
      const data = await getCategories(supabase);
      setCategories(data);
      if (data.length > 0 && !newTitleCategoryName) {
        setNewTitleCategoryName(data[0].name);
      }
      if (!externalIconMap) {
        const iconMap = await getCategoryIconMap(supabase);
        setCategoryIconMap(iconMap);
      }
    } catch {
      // ignore
    }
  }

  async function loadCreditCards() {
    try {
      const data = await getCreditCards(supabase);
      setCreditCards(data);
    } catch {
      // ignore
    }
  }

  useEffect(() => {
    Promise.resolve().then(() => {
      loadTitles();
      loadGoals();
      loadHouseholds();
      loadCategories();
      loadCreditCards();
    });
  // These loaders intentionally run once on mount; each loader handles its own current state.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/travel/active", { cache: "no-store" })
      .then(async (response) => response.ok ? response.json() : null)
      .then((data: { trips?: TravelTrip[] } | null) => {
        if (!cancelled && data?.trips) {
          setActiveTrips(data.trips);
          if (data.trips.length === 1) setSelectedTravelTripId(data.trips[0].id);
        }
      })
      .catch(() => undefined);
    return () => { cancelled = true; };
  }, []);

  const selectedTravelTrip = activeTrips.find((trip) => trip.id === selectedTravelTripId);

  useEffect(() => {
    if (!selectedTravelTrip) return;
    let cancelled = false;
    if (selectedTravelTrip.currency === "THB") return;
    fetch(`/api/travel/rate?currency=${selectedTravelTrip.currency}&date=${date}`, { cache: "no-store" })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        return data as { rate: number; date: string };
      })
      .then((data) => {
        if (!cancelled) {
          setTravelRate(String(data.rate));
          setTravelRateDate(data.date);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setTravelRate(String(selectedTravelTrip.exchange_rate_to_thb));
          setTravelRateDate("");
        }
      });
    return () => { cancelled = true; };
  }, [selectedTravelTrip, date]);

  const effectiveTravelRate = selectedTravelTrip?.currency === "THB" ? "1" : travelRate;

  useEffect(() => {
    if (externalIconMap) {
      Promise.resolve().then(() => {
        setCategoryIconMap(externalIconMap);
      });
    }
  }, [externalIconMap]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    function handleClickOutsideCategory(e: MouseEvent) {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(e.target as Node)) {
        setCategoryDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutsideCategory);
    return () => document.removeEventListener("mousedown", handleClickOutsideCategory);
  }, []);

  const selectedTitle = titles.find((ti) => ti.id === selectedTitleId);

  const handleAddTitle = async () => {
    if (!newTitleName.trim() || !newTitleCategoryName.trim()) return;
    setSavingTitle(true);
    setError(null);

    try {
      const { data: userData } = await supabase.auth.getUser();
      if (!userData?.user) throw new Error("Not authenticated");

      const newTitle = await createTitle(supabase, userData.user.id, {
        name: newTitleName.trim(),
        type: newTitleType,
        category: newTitleCategoryName.trim(),
        goal_id: newTitleGoalId || null,
      });

      setTitles((prev) => [...prev, newTitle].sort((a, b) => a.name.localeCompare(b.name)));
      setSelectedTitleId(newTitle.id);
      setNewTitleName("");
      setNewTitleGoalId("");
      setShowNewTitle(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSavingTitle(false);
    }
  };

  const handleCreateCategory = async () => {
    if (!newCategoryName.trim()) return;
    setSavingCategory(true);
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
      setNewTitleCategoryName(newCat.name);
      onIconChanged?.(newCat.name, newCat.icon);

      setNewCategoryName("");
      setNewCategoryIcon("💰");
      setShowCategoryModal(false);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSavingCategory(false);
    }
  };

  const handleSaveEditCategory = async () => {  
      if (!editCategoryName.trim()) return;
      setSavingEditCategory(true);
      setError(null);

      try {
        const { data: userData } = await supabase.auth.getUser();
        if (!userData?.user) throw new Error("Not authenticated");

        const newName = editCategoryName.trim();

        await renameCategory(supabase, userData.user.id, editingOriginalName, newName, editCategoryIcon);

        setCategoryIconMap((prev) => {
          const next = { ...prev };
          delete next[editingOriginalName];
          next[newName] = editCategoryIcon;
          return next;
        });
        setCategories((prev) =>
          prev
            .map((c) => (c.name === editingOriginalName ? { ...c, name: newName, icon: editCategoryIcon } : c))
            .sort((a, b) => a.name.localeCompare(b.name))
        );
        if (newTitleCategoryName === editingOriginalName) {
          setNewTitleCategoryName(newName);
        }
        onIconChanged?.(newName, editCategoryIcon);

        setShowEditCategoryModal(false);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setSavingEditCategory(false);
      }
  };

  const handleTitleUpdated = (updated: TransactionTitle) => {
    setTitles((prev) =>
      prev.map((ti) => (ti.id === updated.id ? updated : ti)).sort((a, b) => a.name.localeCompare(b.name))
    );
  };

  const handleTitleDeleted = (id: string) => {
    setTitles((prev) => prev.filter((ti) => ti.id !== id));
    if (selectedTitleId === id) {
      setSelectedTitleId("");
    }
  };

  const saveTransaction = async (allowPossibleDuplicate = false) => {
    if (!selectedTitle) {
      setError(t.transactions.selectTitle);
      return;
    }
    if (activeTrips.length > 1 && !selectedTravelTrip) {
      setError("เลือกทริปที่ต้องการผูกกับรายการนี้ก่อน");
      return;
    }
    if (selectedTravelTrip && (!Number.isFinite(Number(effectiveTravelRate)) || Number(effectiveTravelRate) <= 0)) {
      setError("กรุณารออัตราแลกเปลี่ยน หรือกรอกอัตราเอง");
      return;
    }

    setError(null);
    setDuplicateWarning(null);
    setLoading(true);

    const payload = {
        title: selectedTitle.name,
        title_id: selectedTitle.id,
        amount: parseFloat(amount),
        type: selectedTitle.type,
        category: selectedTitle.category,
        date,
        household_id: householdId || null,
        payment_method: paymentMethod,
        card_id: (paymentMethod === "credit_card" || paymentMethod === "debit_card") 
          ? (selectedCardId || null) 
          : null,
        ...(selectedTravelTrip ? {
          travel_trip_id: selectedTravelTrip.id,
          travel_original_amount: parseFloat(amount),
          travel_original_currency: selectedTravelTrip.currency,
          travel_exchange_rate_to_thb: Number(effectiveTravelRate),
          travel_exchange_rate_date: travelRateDate || date,
        } : {}),
      };

    try {
      if (!allowPossibleDuplicate) {
        const { data: authData } = await supabase.auth.getUser();
        if (!authData.user) throw new Error("กรุณาเข้าสู่ระบบใหม่ก่อนบันทึกรายการ");
        let duplicateQuery = supabase.from("transactions").select("id").eq("title", selectedTitle.name)
          .eq("amount", Number(amount)).eq("type", selectedTitle.type).eq("category", selectedTitle.category).eq("date", date).limit(3);
        duplicateQuery = householdId
          ? duplicateQuery.eq("household_id", householdId)
          : duplicateQuery.eq("user_id", authData.user.id).is("household_id", null);
        const { data: possibleDuplicates, error: duplicateError } = await duplicateQuery;
        if (duplicateError) throw new Error("ตรวจรายการซ้ำไม่สำเร็จ กรุณาลองอีกครั้ง หรือเลือกบันทึกต่อ");
        if (possibleDuplicates?.length) {
          setDuplicateWarning(`พบรายการชื่อเดียวกัน ยอด ${Number(amount).toLocaleString()} วันที่ ${date} อยู่แล้ว ต้องการตรวจดูหรือบันทึกซ้ำหรือไม่?`);
          return;
        }
      }
      const res = await fetch("/api/transactions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error ?? "Failed to add transaction");
      setAmount("");
      router.refresh();
      onSaved?.();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    void saveTransaction();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {t.transactions.formTitle}
        </label>

        {!showNewTitle ? (
          <div className="relative" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen((prev) => !prev)}
              className="w-full flex items-center justify-between rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <span className="flex items-center gap-2">
                {selectedTitle ? (
                  <>
                    <span>{categoryIconMap[selectedTitle.category] ?? "💰"}</span>
                    <span>{selectedTitle.name}</span>
                  </>
                ) : (
                  <span className="text-slate-400">{t.transactions.selectTitle}</span>
                )}
              </span>
              <ChevronDown size={16} className="text-slate-400" />
            </button>

            {dropdownOpen && (
              <div data-open={dropdownOpen} inert={!dropdownOpen} className="sliding-options absolute z-20 mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg max-h-64 overflow-y-auto">
                {titles.map((ti) => (
                  <div
                    key={ti.id}
                    className="flex items-center justify-between px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer"
                  >
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTitleId(ti.id);
                        setDropdownOpen(false);
                      }}
                      className="flex items-center gap-2 flex-1 text-left text-sm text-slate-900 dark:text-slate-100"
                    >
                      <span>{categoryIconMap[ti.category] ?? "💰"}</span>
                      <span>{ti.name}</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingTitle(ti);
                        setDropdownOpen(false);
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
                    setShowNewTitle(true);
                    setDropdownOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm font-semibold text-primary-600 hover:bg-slate-50 dark:hover:bg-slate-700 border-t border-slate-100 dark:border-slate-700"
                >
                  {t.transactions.addNewTitle}
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3 rounded-xl border border-primary-200 dark:border-primary-900 bg-primary-50 dark:bg-primary-950/20 p-3">
            <Input
              label={t.transactions.formTitle}
              value={newTitleName}
              onChange={(e) => setNewTitleName(e.target.value)}
              placeholder={t.transactions.newTitlePlaceholder}
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                {t.transactions.formType}
              </label>
              <div className="flex rounded-xl overflow-hidden border border-slate-300 dark:border-slate-700">
                <button
                  type="button"
                  onClick={() => setNewTitleType("income")}
                  className={`flex-1 py-2.5 text-sm font-semibold transition-all ${
                    newTitleType === "income"
                      ? "bg-emerald-500 text-white"
                      : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                  }`}
                >
                  {t.transactions.income}
                </button>
                <button
                  type="button"
                  onClick={() => setNewTitleType("expense")}
                  className={`flex-1 py-2.5 text-sm font-semibold transition-all ${
                    newTitleType === "expense"
                      ? "bg-rose-500 text-white"
                      : "bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700"
                  }`}
                >
                  {t.transactions.expense}
                </button>
              </div>
            </div>

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
                    {newTitleCategoryName ? (
                      <>
                        <span>{categoryIconMap[newTitleCategoryName] ?? "💰"}</span>
                        <span>{newTitleCategoryName}</span>
                      </>
                    ) : (
                      <span className="text-slate-400">{t.transactions.selectCategory}</span>
                    )}
                  </span>
                  <ChevronDown size={16} className="text-slate-400" />
                </button>

                {categoryDropdownOpen && (
                  <div data-open={categoryDropdownOpen} inert={!categoryDropdownOpen} className="sliding-options absolute z-20 mt-1 w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 shadow-lg max-h-64 overflow-y-auto">
                    {categories.map((c) => (
                      <div
                        key={c.id}
                        className="flex items-center justify-between px-3 py-2 hover:bg-slate-50 dark:hover:bg-slate-700"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setNewTitleCategoryName(c.name);
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
                            setEditingOriginalName(c.name);
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
                        setNewCategoryName("");
                        setNewCategoryIcon("💰");
                        setShowCategoryModal(true);
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

            {goals.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t.transactions.linkToGoal}
                </label>
                <AnimatedSelect
                  value={newTitleGoalId}
                  onChange={(e) => setNewTitleGoalId(e.target.value)}
                  className="rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">{t.transactions.noGoalLink}</option>
                  {goals.map((g) => (
                    <option key={g.id} value={g.id}>
                      {g.name}
                    </option>
                  ))}
                </AnimatedSelect>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                onClick={handleAddTitle}
                disabled={savingTitle || !newTitleName.trim() || !newTitleCategoryName.trim()}
              >
                {t.transactions.newCategoryConfirm}
              </Button>
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowNewTitle(false)}
              >
                {t.transactions.newCategoryCancel}
              </Button>
            </div>
          </div>
        )}
      </div>

      {selectedTitle && (
        <div className="rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3 text-sm text-slate-600 dark:text-slate-400 space-y-1">
          <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-200 dark:border-slate-700">
            <span className="text-2xl">{categoryIconMap[selectedTitle.category] ?? "💰"}</span>
            <span className="font-medium text-slate-900 dark:text-slate-100">{selectedTitle.name}</span>
          </div>
          <div className="flex justify-between">
            <span>{t.transactions.formType}</span>
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {selectedTitle.type === "income" ? t.transactions.income : t.transactions.expense}
            </span>
          </div>
          <div className="flex justify-between">
            <span>{t.transactions.formCategory}</span>
            <span className="font-medium text-slate-900 dark:text-slate-100">
              {selectedTitle.category}
            </span>
          </div>
          {selectedTitle.goal_id && (
            <div className="flex justify-between">
              <span>{t.goals.title}</span>
              <span className="font-medium text-primary-600">
                {goals.find((g) => g.id === selectedTitle.goal_id)?.name ?? "-"}
              </span>
            </div>
          )}
        </div>
      )}
            <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
          {t.creditCards.paymentMethod}
        </label>
        <div className="relative flex bg-white dark:bg-slate-800 p-1.5 rounded-2xl shadow-md border border-slate-200 dark:border-slate-700">
          <div
            className="absolute top-1.5 h-[calc(100%-12px)] rounded-xl bg-indigo-500 shadow-lg transition-all duration-300 ease-in-out"
            style={{
              width: "calc(33.33% - 4px)",
              transform: `translateX(${
                paymentMethod === "cash" ? "0%" :
                paymentMethod === "credit_card" ? "100%" :
                "200%"
              })`,
            }}
          />
          <button
            type="button"
            onClick={() => setPaymentMethod("cash")}
            className={`relative z-10 flex-1 flex flex-col items-center justify-center py-2.5 gap-1 rounded-xl transition-all duration-300 text-xs font-medium ${
              paymentMethod === "cash" ? "text-white" : "text-slate-400 dark:text-slate-500"
            }`}
          >
            <Banknote size={18} />
            <span>{t.creditCards.cash}</span>
          </button>
          <button
            type="button"
            onClick={() => setPaymentMethod("credit_card")}
            className={`relative z-10 flex-1 flex flex-col items-center justify-center py-2.5 gap-1 rounded-xl transition-all duration-300 text-xs font-medium ${
              paymentMethod === "credit_card" ? "text-white" : "text-slate-400 dark:text-slate-500"
            }`}
          >
            <CreditCardIcon size={18} />
            <span>{t.creditCards.credit}</span>
          </button>
          <button
            type="button"
            onClick={() => setPaymentMethod("debit_card")}
            className={`relative z-10 flex-1 flex flex-col items-center justify-center py-2.5 gap-1 rounded-xl transition-all duration-300 text-xs font-medium ${
              paymentMethod === "debit_card" ? "text-white" : "text-slate-400 dark:text-slate-500"
            }`}
          >
            <Wallet size={18} />
            <span>{t.creditCards.debit}</span>
          </button>
        </div>
      </div>
            {(paymentMethod === "credit_card" || paymentMethod === "debit_card") && creditCards.length > 0 && (
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  {t.creditCards.selectCard}
                </label>
                <AnimatedSelect
                  value={selectedCardId}
                  onChange={(e) => setSelectedCardId(e.target.value)}
                  className="rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">{t.creditCards.selectCard}</option>
                  {creditCards
                    .filter((card) =>
                      paymentMethod === "credit_card"
                        ? card.card_type === "credit"
                        : card.card_type === "debit"
                    )
                    .map((card) => (
                      <option key={card.id} value={card.id}>
                        {card.name}
                      </option>
                    ))}
                </AnimatedSelect>
              </div>
            )}
      {paymentMethod === "credit_card" && creditCards.length === 0 && (
        <div className="rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 p-3">
          <p className="text-xs text-amber-700 dark:text-amber-400">
            ยังไม่มีบัตรเครดิต —{" "}
            <a href="/credit-cards" className="underline font-medium">
              เพิ่มบัตรก่อน
            </a>
          </p>
        </div>
      )}

      <Input
        label={selectedTravelTrip ? `จำนวนเงิน (${selectedTravelTrip.currency})` : t.transactions.formAmount}
        type="number"
        step="0.01"
        min="0"
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        required
      />

      {activeTrips.length > 0 && (
        <section className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-3 dark:border-emerald-900 dark:bg-emerald-950/30">
          <div>
            <p className="text-sm font-semibold text-emerald-900 dark:text-emerald-200">รายการนี้อยู่ในทริป</p>
            <p className="mt-1 text-xs text-emerald-800/80 dark:text-emerald-300/80">บันทึกยอดเงินบาทและอัตราอ้างอิงไว้กับรายการ เพื่อสรุปย้อนหลังได้</p>
          </div>
          {activeTrips.length > 1 && (
            <AnimatedSelect
              aria-label="เลือกทริป"
              value={selectedTravelTripId}
              onChange={(event) => setSelectedTravelTripId(event.target.value)}
              className="w-full rounded-xl border border-emerald-200 bg-white px-3 py-3 text-base dark:border-emerald-800 dark:bg-slate-900"
            >
              <option value="">เลือกทริป</option>
              {activeTrips.map((trip) => <option key={trip.id} value={trip.id}>{trip.name} · {trip.destination}</option>)}
            </AnimatedSelect>
          )}
          {selectedTravelTrip && selectedTravelTrip.currency !== "THB" && (
            <div className="space-y-2">
              <label className="block text-xs font-medium text-emerald-900 dark:text-emerald-200" htmlFor="travel-fx-rate">อัตราอ้างอิง: 1 {selectedTravelTrip.currency} เป็นกี่บาท</label>
              <input
                id="travel-fx-rate"
                type="number"
                min="0.000001"
                step="0.000001"
                inputMode="decimal"
                value={effectiveTravelRate}
                onChange={(event) => setTravelRate(event.target.value)}
                className="min-h-11 w-full rounded-xl border border-emerald-200 bg-white px-3 text-base dark:border-emerald-800 dark:bg-slate-900"
              />
              <p className="text-xs text-emerald-800/80 dark:text-emerald-300/80">
                {travelRateDate ? `อัตราอ้างอิง ณ ${travelRateDate}` : "ใช้อัตราที่กำหนดไว้ในทริป · แก้ไขได้"}
                {Number(amount) > 0 && Number(effectiveTravelRate) > 0 ? ` · ประมาณ ${formatCurrency(Number(amount) * Number(effectiveTravelRate), "THB")}` : ""}
              </p>
            </div>
          )}
        </section>
      )}

      {households.length > 0 && (
        <div className="flex flex-col gap-1.5">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {t.household.title}
          </label>
          <AnimatedSelect
            value={householdId}
            onChange={(e) => setHouseholdId(e.target.value)}
            className="rounded-xl border border-slate-300 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="">{t.household.personalView}</option>
            {households.map((h) => (
              <option key={h.id} value={h.id}>
                {h.name}
              </option>
            ))}
          </AnimatedSelect>
        </div>
      )}

      <Input
        label={t.transactions.formDate}
        type="date"
        value={date}
        onChange={(e) => setDate(e.target.value)}
        required
      />

      {error && <p role="alert" className="text-sm text-red-600">{error}</p>}
      {duplicateWarning && <div role="alert" className="space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200"><p>{duplicateWarning}</p><div className="flex flex-wrap gap-2"><button type="button" className="min-h-10 rounded-lg bg-amber-700 px-3 font-semibold text-white" disabled={loading} onClick={() => void saveTransaction(true)}>บันทึกซ้ำต่อ</button><button type="button" className="min-h-10 rounded-lg border border-amber-400 px-3 font-medium" disabled={loading} onClick={() => setDuplicateWarning(null)}>กลับไปตรวจ</button></div></div>}

      <Button type="submit" className="w-full" disabled={loading || !selectedTitle}>
        {loading ? t.transactions.adding : t.transactions.add}
      </Button>

      {editingTitle && (
        <EditTitleModal
          titleItem={editingTitle}
          open={!!editingTitle}
          onClose={() => setEditingTitle(null)}
          onUpdated={handleTitleUpdated}
          onDeleted={handleTitleDeleted}
        />
      )}

      {showCategoryModal && <CategoryEditorDialog name={newCategoryName} icon={newCategoryIcon} busy={savingCategory} error={error}
        onName={setNewCategoryName} onIcon={setNewCategoryIcon} onSave={() => void handleCreateCategory()}
        onClose={() => setShowCategoryModal(false)} />}
      {showEditCategoryModal && <CategoryEditorDialog editing name={editCategoryName} icon={editCategoryIcon} busy={savingEditCategory} error={error}
        onName={setEditCategoryName} onIcon={setEditCategoryIcon} onSave={() => void handleSaveEditCategory()}
        onClose={() => setShowEditCategoryModal(false)} />}
    </form>
  );
}
