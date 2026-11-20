import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './loadTsModule.mjs';
const {selectDashboardTransactions,canDeriveDashboardRange}=loadTsModule('lib/utils/dashboardTransactions.ts');
const {calculateKpis,calculateCashBalance}=loadTsModule('services/transactions.ts',{'@/lib/utils/dateHelpers':{}});
const rows=[
{id:'latest',date:'2026-11-20',user_id:'b',household_id:'group',amount:0.2,type:'income',payment_method:'cash',category:'Salary'},
{id:'tie',date:'2026-11-20',user_id:'a',household_id:null,amount:0.1,type:'income',payment_method:null,category:'Salary'},
{id:'topup',date:'2026-11-15',user_id:'a',household_id:null,amount:40,type:'income',payment_method:'cash',category:'เติมเงินวอลเล็ต'},
{id:'card',date:'2026-11-15',user_id:'a',household_id:null,amount:200,type:'expense',payment_method:'credit_card',category:'Food'},
{id:'old',date:'2026-10-01',user_id:'a',household_id:null,amount:1000,type:'income',payment_method:'cash',category:'Salary'},
];
test('single-read dashboard selection preserves range, order and legacy cash behavior for every scope',()=>{
  for(const scope of [rows,rows.filter(row=>row.household_id==='group'),rows.filter(row=>row.user_id==='a'),rows.filter(row=>!row.household_id)])for(const [from,to,explicit] of [['2026-11-01','2026-11-20',false],['2026-11-15','2026-11-20',true],['','2026-11-20',true],['2026-12-01','2026-12-31',false]]){
    const before=structuredClone(scope);
    const legacy=scope.filter(row=>(!from||row.date>=from)&&(!to||row.date<=to));
    const selected=selectDashboardTransactions(scope,from,to,explicit);
    assert.deepEqual(selected.transactions,legacy);assert.deepEqual(calculateKpis(selected.transactions),calculateKpis(legacy));
    assert.equal(calculateCashBalance(selected.balanceTransactions),calculateCashBalance(explicit?scope:legacy));assert.deepEqual(scope,before);
  }
});
test('existing KPI and cash rules include null cash methods and top-up precedence',()=>{
  assert.deepEqual(calculateKpis(rows),{totalIncome:1000.3,totalExpense:200,balance:800.3,transactionCount:4});
  assert.equal(calculateCashBalance(rows),960.3);
});
test('numeric SQL sums cannot be substituted as exactly equivalent to current JS floating sums',()=>{
  const amounts=rows.slice(0,2);
  const exactDecimalCents=amounts.reduce((sum,row)=>sum+Math.round(row.amount*100),0)/100;
  assert.equal(exactDecimalCents,0.3);
  assert.equal(calculateKpis(amounts).totalIncome,0.30000000000000004);
  assert.notEqual(calculateKpis(amounts).totalIncome,exactDecimalCents);
  assert.notEqual(calculateCashBalance(amounts),exactDecimalCents);
});

test('only canonical valid date bounds may replace database date filtering in memory',()=>{
  for(const bounds of [['2026-11-01','2026-11-30'],['','2026-11-20'],['2024-02-29','']]) assert(canDeriveDashboardRange(...bounds));
  for(const bounds of [['2026-2-1','2026-11-30'],['2026-02-30','2026-11-30'],['invalid',''],['0000-01-01','2026-11-20']]) assert(!canDeriveDashboardRange(...bounds));
});
