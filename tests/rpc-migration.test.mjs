import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './loadTsModule.mjs';
const migration='20261120090000_card_balances_and_expense_limits';
const message='Database migration '+migration+' has not been applied';
const {getCardBalances}=loadTsModule('services/creditCards.ts');
function fakeClient(error) {
  return {from(){assert.fail('must never fall back to transaction rows');},rpc(name){assert.equal(name,'get_card_balances');return{in(){return this;},order(){return this;},range:async()=>({data:null,error})};}};
}
for(const code of ['PGRST202','42883'])test('missing balance RPC '+code+' fails closed with a safe migration diagnostic',async t=>{
  const logs=[];t.mock.method(console,'error',(...args)=>logs.push(args));
  await assert.rejects(getCardBalances(fakeClient({code,message:'private upstream payload',details:'private receipt text'}),[{id:'card'}]),error=>{
    assert(error instanceof Error);assert.equal(error.name,'DatabaseMigrationRequiredError');assert.equal(error.message,message);assert.equal(error.cause,undefined);return true;
  });assert.deepEqual(logs,[[message]]);
});
test('same request client logs one diagnostic even when several callers fail and API catches it',async t=>{
  const logs=[];t.mock.method(console,'error',(...args)=>logs.push(args));const client=fakeClient({code:'PGRST202',message:'private upstream payload'});
  const results=await Promise.allSettled([getCardBalances(client,[{id:'a'}]),getCardBalances(client,[{id:'b'}])]);
  const {apiError}=loadTsModule('lib/api/errors.ts');
  for(const result of results){assert.equal(result.status,'rejected');assert.equal(result.reason.message,message);const response=apiError(new Error('wrapped',{cause:result.reason}));assert.equal(response.status,500);assert.deepEqual(await response.json(),{error:'Internal server error'});}
  assert.deepEqual(logs,[[message]]);
});
test('fresh request clients are not silenced by a prior request',async t=>{
  const logs=[];t.mock.method(console,'error',(...args)=>logs.push(args));
  for(let i=0;i<2;i++)await assert.rejects(getCardBalances(fakeClient({code:'42883',message:'private'}),[{id:'card'}]),{message});
  assert.deepEqual(logs,[[message],[message]]);
});
test('unrelated database failures retain their error and do not produce a migration warning',async t=>{
  const logs=[];t.mock.method(console,'error',(...args)=>logs.push(args));
  for(const code of ['42501','42P01','PGRST301','08006'])await assert.rejects(getCardBalances(fakeClient({code,message:'ordinary failure'}),[{id:'card'}]),error=>{assert.equal(error.message,'ordinary failure');assert.equal(error.cause.code,code);return true;});
  assert.deepEqual(logs,[]);
});
test('browser callers get the clear error without server diagnostics in their console',async t=>{
  const old=globalThis.window;globalThis.window={};t.after(()=>{if(old===undefined)delete globalThis.window;else globalThis.window=old;});
  const logs=[];t.mock.method(console,'error',(...args)=>logs.push(args));await assert.rejects(getCardBalances(fakeClient({code:'PGRST202',message:'private'}),[{id:'card'}]),{message});assert.deepEqual(logs,[]);
});
test('RSC request scope deduplicates different client instances and resets between requests',t=>{
  let set;const logs=[];t.mock.method(console,'error',(...args)=>logs.push(args));
  const helper=loadTsModule('lib/api/rpcMigration.mjs',{react:{cache:factory=>()=>set??=factory()}});
  for(let request=0;request<2;request++) {set=undefined;for(let client=0;client<2;client++)assert.throws(()=>helper.throwIfMissingRpcMigration({code:'42883'},helper.CARD_BALANCES_RPC,{}),{message});}
  assert.deepEqual(logs,[[message],[message]]);
});
test('diagnostic detector handles wrapped errors and is reusable for future RPC metadata',t=>{
  const logs=[];t.mock.method(console,'error',(...args)=>logs.push(args));
  const helper=loadTsModule('lib/api/rpcMigration.mjs');
  assert(helper.isMissingRpcError(new Error('wrapped',{cause:{code:'PGRST202'}})));assert(!helper.isMissingRpcError(null));assert(!helper.isMissingRpcError({message:'function not found'}));
  assert.throws(()=>helper.throwIfMissingRpcMigration({code:'42883'},{name:'example_future_rpc',migration:'example_future_migration'},{}),{message:'Database migration example_future_migration has not been applied'});
  assert.deepEqual(logs,[['Database migration example_future_migration has not been applied']]);
});
