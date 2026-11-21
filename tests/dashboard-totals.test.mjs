import {test} from 'node:test';
import assert from 'node:assert/strict';
import {loadTsModule} from './loadTsModule.mjs';
import {A,H,B,BILL,visibleRows,fixtureRows,scopedRows,rangeRows,cents,readGoldens,legacyTopCategories} from './dashboardTotalsFixtures.mjs';
const tx=loadTsModule('services/transactions.ts',{'@/lib/utils/dateHelpers':{}});
const {selectDashboardTransactions}=loadTsModule('lib/utils/dashboardTransactions.ts');
const {getReconciliationAccounts}=loadTsModule('services/accountBalances.ts');
const {getDashboardTotals,getForecastTransactions}=loadTsModule('services/dashboardTotals.ts',{'@/services/transactions':tx});
for(const c of readGoldens())test('original TS cents golden: '+c.name,()=>{
 const scope=scopedRows(visibleRows(),c.options),range=rangeRows(scope,c.options);
 const accounts=getReconciliationAccounts(A,scope,[]);
 assert.deepEqual({incomeCount:range.filter(t=>t.type==='income'&&t.category!=='เติมเงินวอลเล็ต').length,expenseCount:range.filter(t=>t.type==='expense'&&t.category!=='เติมเงินวอลเล็ต').length,accountCashBalance:cents(accounts[0].balance),bankBalance:cents(accounts[1].balance),topCategories:legacyTopCategories(scope),kpis:Object.fromEntries(Object.entries(tx.calculateKpis(range)).map(([k,v])=>[k,cents(v)])),cashBalance:cents(tx.calculateCashBalance(scope)),rangeCashBalance:cents(tx.calculateCashBalance(range)),personalCashBalance:cents(tx.calculateCashBalance(scope.filter(t=>t.user_id===A&&!t.household_id)))},c.expected);
 const legacy=selectDashboardTransactions(scope,c.options.dateFrom??'',c.options.dateTo??'',false);
 assert.equal(cents(tx.calculateCashBalance(legacy.balanceTransactions)),c.expected.rangeCashBalance);
 assert.equal(cents(tx.calculateCashBalance(selectDashboardTransactions(scope,c.options.dateFrom??'',c.options.dateTo??'',true).balanceTransactions)),c.expected.cashBalance);
});
test('fixture covers RLS isolation, >1000 rows, travel amount ignored and numeric cents',()=>{
 assert(fixtureRows().length>1000);assert(visibleRows().length<fixtureRows().length);
 assert.equal(cents(tx.calculateKpis([{type:'income',amount:0.1},{type:'income',amount:0.2}]).totalIncome),0.3);
 const travel=fixtureRows().find(t=>t.travel_trip_id);assert.equal(tx.calculateCashBalance([travel]),-7.1);assert.equal(travel.travel_amount_thb,999);
});
const rpcRow={account_cash_balance:'1033.9',bank_balance:'4',cash_balance:'1021.15',range_cash_balance:'73.20',personal_cash_balance:'929.90',total_income:'116.30',total_expense:'30.10',balance:'86.20',transaction_count:11,income_count:5,expense_count:6,top_categories:[{category:'Food',amount:12.25}]};
test('RPC service forwards scope/date/category options exactly and decodes numeric values',async()=>{
 const calls=[];const client={rpc:async(name,args)=>{calls.push({name,args});return{data:[rpcRow],error:null};},from(){assert.fail('no row fallback');}};
 const result=await getDashboardTotals(client,{householdId:H,personalOnly:true,userIds:[B],dateFrom:'2026-11-01',dateTo:'2026-11-15',includeCategories:true});
 assert.deepEqual(calls,[{name:'get_dashboard_totals',args:{p_household_id:H,p_personal_only:true,p_user_ids:[B],p_date_from:'2026-11-01',p_date_to:'2026-11-15',p_include_categories:true}}]);
 assert.deepEqual(result,{cashBalance:1021.15,rangeCashBalance:73.2,personalCashBalance:929.9,kpis:{totalIncome:116.3,totalExpense:30.1,balance:86.2,transactionCount:11},accountCashBalance:1033.9,bankBalance:4,incomeCount:5,expenseCount:6,topCategories:[{category:'Food',amount:12.25}]});
 await getDashboardTotals(client,{userIds:[],dateFrom:'',dateTo:''});assert.equal(calls[1].args.p_user_ids,null);assert.equal(calls[1].args.p_date_from,null);assert.equal(calls[1].args.p_date_to,null);
});
for(const code of ['PGRST202','42883'])test('new totals RPC '+code+' fails closed and logs once/request without payload',async t=>{
 const logs=[];t.mock.method(console,'error',(...args)=>logs.push(args));const client={rpc:async()=>({data:null,error:{code,message:'private payload'}}),from(){assert.fail('no history fallback');}};
 for(let i=0;i<2;i++)await assert.rejects(getDashboardTotals(client),{message:'Database migration 20261120130000_dashboard_totals has not been applied'});
 assert.deepEqual(logs,[['Database migration 20261120130000_dashboard_totals has not been applied']]);
});
test('malformed or missing aggregate rows never silently become zero',async()=>{
 for(const data of [[],null,[{...rpcRow,cash_balance:null}],[{...rpcRow,total_income:'NaN'}],[{...rpcRow,transaction_count:-1}],[{...rpcRow,top_categories:[{category:'Food',amount:null}]}]])await assert.rejects(getDashboardTotals({rpc:async()=>({data,error:null})}));
 await assert.rejects(getDashboardTotals({rpc:async()=>({error:{code:'42501',message:'denied'},data:null})}),e=>e.cause.code==='42501');
});
function fakeHistory(rows,operations){return{from(name){assert.equal(name,'transactions');let selected=rows,window;return{select(){return this;},order(){return this;},eq(k,v){selected=selected.filter(t=>t[k]===v);return this;},is(k,v){selected=selected.filter(t=>t[k]===v);return this;},in(k,v){selected=selected.filter(t=>v.includes(t[k]));return this;},or(value){operations.push(value);window=value;return this;},range:async(from,to)=>{assert(window,'forecast must be bounded');const filtered=selected.filter(t=>(t.date>='2026-11-01'&&t.date<='2026-11-15')||(t.recurring_occurrence_date>='2026-11-15'&&t.recurring_occurrence_date<='2026-11-30'));return{data:filtered.slice(from,to+1),error:null};}};}};}
const dateHelpers=loadTsModule('lib/utils/dateHelpers.ts');
const recurring=loadTsModule('services/recurringBills.ts',{'@/lib/utils/dateHelpers':dateHelpers});
const {calculateMonthEndForecast}=loadTsModule('services/cashForecast.ts',{'@/services/recurringBills':recurring});
test('bounded forecast is identical including arbitrarily old/future recorded paid occurrences',async()=>{
 for(const options of [{personalOnly:true,userIds:[A]},{householdId:H},{householdId:H,userIds:[B]},{}]){
  const scope=scopedRows(visibleRows(),options),ops=[];const bounded=await getForecastTransactions(fakeHistory(visibleRows(),ops),options,'2026-11-15');
  assert.equal(ops[0],'and(date.gte.2026-11-01,date.lte.2026-11-15),and(recurring_occurrence_date.gte.2026-11-15,recurring_occurrence_date.lte.2026-11-30)');
  const bills=[20,25,28].map((day,i)=>({id:BILL,name:'Bill',amount:10+i,type:'expense',frequency:'monthly',start_date:'2026-11-'+day,is_active:true,household_id:null}));
  const input={today:'2026-11-15',currentBalance:tx.calculateCashBalance(scope),recurringItems:bills,householdId:options.householdId};
  assert.deepEqual(calculateMonthEndForecast({...input,transactions:bounded}),calculateMonthEndForecast({...input,transactions:scope}));
  if(options.personalOnly){assert(bounded.some(t=>t.date==='2026-08-01'));assert(bounded.some(t=>t.date==='2026-12-15'));assert(bounded.length<scope.length);}
 }
});

test('forecast remains paged beyond 1000 recent rows and handles month edges',async()=>{
 const rows=Array.from({length:1005},(_,i)=>({...visibleRows()[0],id:String(i),date:'2026-11-10',recurring_occurrence_date:null})),ops=[];
 assert.equal((await getForecastTransactions(fakeHistory(rows,ops),{},'2026-11-15')).length,1005);assert.equal(ops.length,2);
 const scopes=[];await getForecastTransactions(fakeHistory([],scopes),{householdId:H},'2024-02-29');assert.equal(scopes[0],'and(date.gte.2024-02-01,date.lte.2024-02-29),and(recurring_occurrence_date.gte.2024-02-29,recurring_occurrence_date.lte.2024-02-29)');
 assert.throws(()=>getForecastTransactions({}, {},'2026-02-30'),/Invalid forecast date/);
});

test('human-run SQL embeds exactly the same fixtures and frozen expected values',async()=>{
 const {readFileSync}=await import('node:fs');const {renderDashboardStagingSql}=await import('./generate-dashboard-staging.mjs');
 assert.equal(readFileSync(new URL('../supabase/tests/dashboard_totals_staging.sql',import.meta.url),'utf8'),renderDashboardStagingSql());
});

test('SQL cent current balance preserves forecast results at required cent precision',()=>{
 const rounded=value=>Object.fromEntries(Object.entries(value).map(([k,v])=>[k,typeof v==='number'?cents(v):v]));
 for(const today of ['2026-11-01','2026-11-15','2026-11-18','2026-11-30'])for(const scope of [visibleRows(),scopedRows(visibleRows(),{personalOnly:true,userIds:[A]}),scopedRows(visibleRows(),{householdId:H})]){
  const currentBalance=tx.calculateCashBalance(scope),input={today,currentBalance,transactions:scope,recurringItems:[]};
  assert.deepEqual(rounded(calculateMonthEndForecast({...input,currentBalance:cents(currentBalance)})),rounded(calculateMonthEndForecast(input)));
 }
});
