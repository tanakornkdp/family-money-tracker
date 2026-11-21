import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase,sqlOptions,unavailable} from './sql/helpers.mjs';
import {A,visibleRows,readGoldens} from './dashboardTotalsFixtures.mjs';
let db;before(async()=>{
 if(unavailable)return;db=await openDatabase();
 // Visible rows ONLY: fixture-excluded rows model hidden data; this is NOT RLS proof.
 const rows=visibleRows();await db.query('insert into public.transactions select * from pg_catalog.jsonb_populate_recordset(null::public.transactions,$1::jsonb)',[JSON.stringify(rows)]);
 await db.query("select pg_catalog.set_config('request.jwt.claim.sub',$1,false)",[A]);
});after(async()=>{await db?.close();});
function close(actual,expected,label,tolerance=0.005){assert(Number.isFinite(Number(actual)),label);assert(Math.abs(Number(actual)-expected)<=tolerance,label+': '+actual+' != '+expected);}
for(const c of readGoldens())test('PGlite dashboard golden: '+c.name,sqlOptions,async()=>{
 const o=c.options,e=c.expected;const {rows:[r]}=await db.query('select * from public.get_dashboard_totals($1,$2,$3,$4,$5,$6)',[o.householdId??null,o.personalOnly??false,o.userIds?.length?o.userIds:null,o.dateFrom||null,o.dateTo||null,true]);
 for(const [key,expected] of Object.entries({cash_balance:e.cashBalance,range_cash_balance:e.rangeCashBalance,personal_cash_balance:e.personalCashBalance,total_income:e.kpis.totalIncome,total_expense:e.kpis.totalExpense,balance:e.kpis.balance,account_cash_balance:e.accountCashBalance,bank_balance:e.bankBalance}))close(r[key],expected,key);
 for(const [key,expected] of Object.entries({transaction_count:e.kpis.transactionCount,income_count:e.incomeCount,expense_count:e.expenseCount}))assert.equal(Number(r[key]),expected,key);
 const actual=r.top_categories;assert.equal(actual.length,e.topCategories.length);
 actual.forEach((value,i)=>{assert.equal(value.category,e.topCategories[i].category);const expected=e.topCategories[i].amount;close(value.amount,expected,'category amount',Math.abs(expected)*1e-9);});
});
