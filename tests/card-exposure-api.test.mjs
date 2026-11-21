import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './loadTsModule.mjs';
import { validateTransactionInput } from '../lib/validation/transactionInput.ts';
import { cardBalanceErrorResponse } from '../lib/validation/cardBalanceError.ts';
const current = { title: 'Legacy expense', title_id: null, amount: 1500, type: 'expense', category: 'Food', date: '2026-11-20', household_id: null, payment_method: 'credit_card', card_id: 'card-a' };
const params = { params: Promise.resolve({ id: 'transaction' }) };
function patchRoute({ row=current, card={id:'card-a',card_type:'credit',credit_limit:1000}, balance=-200, available=-200, visible=true }={}) {
  const calls={metadata:0,balances:0,updates:0};
  const client={auth:{getUser:async()=>({data:{user:{id:'user'}}})},from(){return{select(){return this;},eq(){return this;},single:async()=>({data:row,error:null})};}};
  const {PATCH}=loadTsModule('app/api/transactions/[id]/route.ts',{
    '@/lib/api/errors':loadTsModule('lib/api/errors.ts'),
    '@/lib/validation/transactionInput':{validateTransactionInput},'@/lib/validation/cardBalanceError':{cardBalanceErrorResponse},
    '@/lib/validation/cardExposure':{increasesCardExposure:(...args)=>loadTsModule('lib/validation/cardExposure.ts').increasesCardExposure(...args)},
    '@/lib/supabase/server':{createClient:async()=>client},
    '@/services/creditCards':{getCreditCards:async()=>{calls.metadata++;return visible?[card]:[];},getCardsWithBalance:async(actual,excluded)=>{assert.strictEqual(actual,client);assert.equal(excluded,'transaction');calls.balances++;return visible?[{...card,balance,available}]:[];}},
    '@/services/transactions':{updateTransaction:async(actual,id,changes)=>{assert.strictEqual(actual,client);assert.equal(id,'transaction');calls.updates++;return{...row,...changes};}},
  });
  return {calls,patch:body=>PATCH({json:async()=>body},params)};
}
test('PATCH legacy over-limit metadata/equal/decreased expenses succeed without a balance read',async()=>{
  for(const changes of [{title:'Edited'},{date:'2026-11-21'},{travel_trip_id:'550e8400-e29b-41d4-a716-446655440000'},{category:'Travel'},{amount:1500},{amount:1200}]) {
    const route=patchRoute();const response=await route.patch(changes);assert.equal(response.status,200);assert.equal(route.calls.balances,0);assert.equal(route.calls.metadata,1);assert.equal(route.calls.updates,1);
    for(const [key,value] of Object.entries(changes))assert.equal((await response.clone().json()).transaction[key],value);
  }
});
test('PATCH amount reduction succeeds for a debit wallet that is already negative',async()=>{
  const route=patchRoute({row:{...current,payment_method:'debit_card'},card:{id:'card-a',card_type:'debit',credit_limit:0}});
  assert.equal((await route.patch({amount:1200})).status,200);assert.equal(route.calls.balances,0);
});
test('PATCH exposure increases retain friendly debit/credit failures and do not update',async()=>{
  for(const payment of ['credit_card','debit_card']) {
    const route=patchRoute({row:{...current,payment_method:payment},card:{id:'card-a',card_type:payment==='credit_card'?'credit':'debit',credit_limit:1000}});
    const response=await route.patch({amount:1600});assert.equal(response.status,400);assert.equal((await response.json()).error,payment==='credit_card'?'วงเงินบัตรเครดิตไม่เพียงพอ':'ยอดเงินในบัตรเดบิตไม่เพียงพอ');assert.equal(route.calls.balances,1);assert.equal(route.calls.updates,0);
  }
});
test('PATCH card move/type conversion/top-up removal enforce even with a lower amount',async()=>{
  for(const options of [
    {row:current,changes:{card_id:'card-b',payment_method:'credit_card',amount:100},card:{id:'card-b',card_type:'credit',credit_limit:1000}},
    {row:{...current,type:'income'},changes:{type:'expense',amount:100}},
    {row:{...current,payment_method:'debit_card',category:'เติมเงินวอลเล็ต'},changes:{category:'Food',amount:100},card:{id:'card-a',card_type:'debit',credit_limit:0}},
  ]){const route=patchRoute(options);assert.equal((await route.patch(options.changes)).status,400);assert.equal(route.calls.balances,1);assert.equal(route.calls.updates,0);}
});
test('PATCH non-increasing edits retain invalid-card and input validation',async()=>{
  const hidden=patchRoute({visible:false});const response=await hidden.patch({title:'Edit'});assert.equal(response.status,400);assert.equal((await response.json()).error,'บัตรที่เลือกไม่ถูกต้อง');assert.equal(hidden.calls.updates,0);
  const invalid=patchRoute();assert.equal((await invalid.patch({amount:-1})).status,400);assert.equal(invalid.calls.metadata,0);assert.equal(invalid.calls.balances,0);assert.equal(invalid.calls.updates,0);
});
