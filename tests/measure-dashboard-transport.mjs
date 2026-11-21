import {fixtureRows,visibleRows,scopedRows,rangeRows,A,legacyTopCategories,cents} from './dashboardTotalsFixtures.mjs';
import {loadTsModule} from './loadTsModule.mjs';
const {calculateKpis,calculateCashBalance}=loadTsModule('services/transactions.ts',{'@/lib/utils/dateHelpers':{}});
const {getReconciliationAccounts}=loadTsModule('services/accountBalances.ts');
function aggregate(scope,range,includeCategories){const k=calculateKpis(range),accounts=getReconciliationAccounts(A,scope,[]);return[{cash_balance:cents(calculateCashBalance(scope)),range_cash_balance:cents(calculateCashBalance(range)),personal_cash_balance:cents(calculateCashBalance(scope.filter(t=>t.user_id===A&&!t.household_id))),total_income:cents(k.totalIncome),total_expense:cents(k.totalExpense),balance:cents(k.balance),transaction_count:k.transactionCount,income_count:range.filter(t=>t.type==='income'&&t.category!=='เติมเงินวอลเล็ต').length,expense_count:range.filter(t=>t.type==='expense'&&t.category!=='เติมเงินวอลเล็ต').length,account_cash_balance:cents(accounts[0].balance),bank_balance:cents(accounts[1].balance),top_categories:includeCategories?legacyTopCategories(scope):[]}];}
const bytes=value=>Buffer.byteLength(JSON.stringify(value));
const paidWindow=t=>t.recurring_occurrence_date>='2026-11-15'&&t.recurring_occurrence_date<='2026-11-30';
const forecast=rows=>rows.filter(t=>(t.date>='2026-11-01'&&t.date<='2026-11-15')||paidWindow(t));
const all=visibleRows(),personal=scopedRows(all,{personalOnly:true,userIds:[A]});
const ranged=rangeRows(all,{dateFrom:'2026-11-01',dateTo:'2026-11-15'});
const results=[['desktop',all,ranged,forecast(personal),aggregate(all,ranged,false)],['mobile',personal,personal.slice(0,5),forecast(personal),aggregate(personal,personal,true)]].map(([page,before,rows,needed,totals])=>({page,historyRows:before.length,selectedOrRecentRows:rows.length,forecastRows:needed.length,beforeBytes:bytes(before),afterBytes:bytes(rows)+bytes(needed)+bytes(totals),reductionPercent:Math.round((1-(bytes(rows)+bytes(needed)+bytes(totals))/bytes(before))*1000)/10}));
console.log(JSON.stringify({measurement:'synthetic fixture JSON only; not SQL/network latency or HTTP overhead',fixtureRows:fixtureRows().length,results},null,2));
