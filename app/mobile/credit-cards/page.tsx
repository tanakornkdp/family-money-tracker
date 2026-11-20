import { getCachedUserSettings } from "@/lib/auth/requestSettings";
import { requireUser } from "@/lib/auth/getUser";
import { createClient } from "@/lib/supabase/server";
import { getCardsWithBalance } from "@/services/creditCards";

import { formatCurrency } from "@/lib/utils/formatCurrency";
import CreditCardsManager from "@/components/credit-cards/CreditCardsManager";
import Link from "next/link";
import { getRequestLocale } from "@/lib/i18n/server";
import { translations } from "@/lib/i18n/translations";
import { getTransactions } from "@/services/transactions";
import { getReconciliationAccounts } from "@/services/accountBalances";
import AccountReconciliation from "@/components/credit-cards/AccountReconciliation";

export default async function MobileCardsPage(){
 const user=await requireUser(); const supabase=await createClient(); const [settings,transactions,cards]=await Promise.all([getCachedUserSettings(user.id),getTransactions(supabase),getCardsWithBalance(supabase)]); const currency=settings?.currency??"THB"; const locale=await getRequestLocale(settings?.language); const t=translations[locale]; const accounts=getReconciliationAccounts(user.id,transactions,cards);
 return <div className="space-y-4"><header><p className="text-xs font-medium text-slate-500">{t.mobile.wallet}</p><h1 className="text-2xl font-bold tracking-tight">{t.creditCards.title}</h1><p className="mt-1 text-sm text-slate-500">{t.creditCards.subtitle}</p></header><Link href="/mobile/budget" className="flex items-center justify-between rounded-2xl bg-mobile-surface px-4 py-3 shadow-sm"><span className="font-medium">{t.nav.budget}</span><span className="text-slate-400">›</span></Link><div className="rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 p-4 text-white shadow-sm"><div className="grid grid-cols-2 gap-3"><div><p className="text-xs text-white/65">{t.creditCards.balance}</p><p className="mt-1 text-xl font-bold">{formatCurrency(cards.filter((card)=>card.card_type==="credit").reduce((sum,card)=>sum+card.balance,0),currency)}</p></div><div><p className="text-xs text-white/65">{t.creditCards.available}</p><p className="mt-1 text-xl font-bold">{formatCurrency(cards.filter((card)=>card.card_type==="credit").reduce((sum,card)=>sum+card.available,0),currency)}</p></div></div><p className="mt-2 text-xs text-white/60">{cards.length} {locale==="th"?"ใบ":"cards"}</p></div><AccountReconciliation accounts={accounts} currency={currency} locale={locale}/><CreditCardsManager initialCards={cards} currency={currency} compact/></div>
}
