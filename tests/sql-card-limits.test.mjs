import {loadTsModule} from './loadTsModule.mjs';
import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {openDatabase,sqlOptions,unavailable,isolated,expectSqlError,card,transaction,legacyExpense} from './sql/helpers.mjs';
let db;before(async()=>{if(!unavailable)db=await openDatabase();});after(async()=>{await db?.close();});
// One engine per file, pristine rolled-back fixture group per named case.
const scenario=(name,run)=>test('PGlite card: '+name,sqlOptions,()=>isolated(db,run));
const balance=async id=>Number((await db.query('select public.get_card_balance($1) as n',[id])).rows[0].n);
const topup=id=>transaction(db,{cardId:id,category:'เติมเงินวอลเล็ต',amount:100});
scenario('debit top-up passes',async()=>{const id=await card(db,{type:'debit'});await topup(id);assert.equal(await balance(id),100);});
scenario('debit expense over available is rejected',async()=>{const id=await card(db,{type:'debit'});await topup(id);await expectSqlError(db,()=>transaction(db,{cardId:id,amount:101}),'P1001',/CARD_DEBIT_INSUFFICIENT/);});
scenario('credit expense over limit is rejected',async()=>{const id=await card(db);await expectSqlError(db,()=>transaction(db,{cardId:id,amount:101}),'P1002',/CARD_CREDIT_INSUFFICIENT/);});
scenario('credit payment income passes',async()=>{const id=await card(db);await transaction(db,{cardId:id,type:'income',amount:40});assert.equal(await balance(id),-40);});
scenario('legacy over-limit title edit passes',async()=>{const id=await card(db),tx=await legacyExpense(db,id);await db.query("update public.transactions set title='Edited' where id=$1",[tx]);assert.equal(await balance(id),150);});
scenario('legacy over-limit amount reduction passes even while still over limit',async()=>{const id=await card(db),tx=await legacyExpense(db,id);await db.query('update public.transactions set amount=120 where id=$1',[tx]);assert.equal(await balance(id),120);});
scenario('legacy over-limit amount increase is rejected',async()=>{const id=await card(db),tx=await legacyExpense(db,id);await expectSqlError(db,()=>db.query('update public.transactions set amount=151 where id=$1',[tx]),'P1002',/CARD_CREDIT_INSUFFICIENT/);});
scenario('move expense to empty debit card is rejected',async()=>{const src=await card(db),dest=await card(db,{type:'debit'}),tx=await transaction(db,{cardId:src,amount:50});await expectSqlError(db,()=>db.query('update public.transactions set card_id=$1 where id=$2',[dest,tx]),'P1001',/CARD_DEBIT_INSUFFICIENT/);});
scenario('unknown card is rejected',async()=>{await expectSqlError(db,()=>transaction(db,{cardId:randomUUID()}),'P1003',/CARD_NOT_AVAILABLE/);});
scenario('upsert existing expense consuming entire debit balance passes',async()=>{const id=await card(db,{type:'debit'});await topup(id);const tx=await transaction(db,{cardId:id,amount:100});await transaction(db,{id:tx,cardId:id,amount:100},true);assert.equal(await balance(id),0);});
scenario('brand-new expense on fully used card is rejected',async()=>{const id=await card(db,{type:'debit'});await topup(id);await transaction(db,{cardId:id,amount:100});await expectSqlError(db,()=>transaction(db,{cardId:id,amount:1}),'P1001',/CARD_DEBIT_INSUFFICIENT/);});
scenario('single-card and multi-card balances match, including exclusion and ignored debit income',async()=>{
 const debit=await card(db,{type:'debit'}),credit=await card(db);await topup(debit);const excluded=await transaction(db,{cardId:debit,amount:25});await transaction(db,{cardId:debit,type:'income',amount:999});await transaction(db,{cardId:credit,amount:40});await transaction(db,{cardId:credit,type:'income',amount:15});
 for(const omit of [null,excluded])for(const row of (await db.query('select * from public.get_card_balances($1)',[omit])).rows){const n=(await db.query('select public.get_card_balance($1,$2) as n',[row.card_id,omit])).rows[0].n;assert.equal(Number(n),Number(row.balance));}
 assert.equal(await balance(debit),75);assert.equal(await balance(credit),25);
});
scenario('restore upsert of already over-limit legacy credit expense is rejected',async()=>{
 // BEFORE INSERT enforces even when ON CONFLICT would later be a no-op UPDATE.
 const id=await card(db),tx=await legacyExpense(db,id);await expectSqlError(db,()=>transaction(db,{id:tx,cardId:id,amount:150},true),'P1002',/CARD_CREDIT_INSUFFICIENT/);
});
scenario('wallet top-up category on CREDIT is ordinary credit expense',async()=>{const id=await card(db);await transaction(db,{cardId:id,category:'เติมเงินวอลเล็ต',amount:60});assert.equal(await balance(id),60);await expectSqlError(db,()=>transaction(db,{cardId:id,category:'เติมเงินวอลเล็ต',amount:41}),'P1002',/CARD_CREDIT_INSUFFICIENT/);});

scenario('NULL credit_limit is unlimited in SQL but app availability treats NULL as zero',async()=>{
 // Deliberate CURRENT behavior, not a new rule: NULL SQL comparison never raises.
 // Legacy/stub NULL is outside TS's declared number type; actual schema is unknown.
 const id=await card(db,{limit:null}),tx=await transaction(db,{cardId:id,amount:1000});
 await db.query('update public.transactions set amount=2000 where id=$1',[tx]);assert.equal(await balance(id),2000);
 const metadata=(await db.query('select * from public.credit_cards')).rows;
 const balances=(await db.query('select * from public.get_card_balances()')).rows;
 const builder=data=>({select(){return this;},order(){return this;},in(){return this;},range:async()=>({data,error:null})});
 const client={from(name){assert.equal(name,'credit_cards');return builder(metadata);},rpc(name){assert.equal(name,'get_card_balances');return builder(balances);}};
 const {getCardsWithBalance}=loadTsModule('services/creditCards.ts');
 const [appCard]=await getCardsWithBalance(client);assert.equal(appCard.credit_limit,null);assert.equal(appCard.available,-2000);
 // Actual POST/PATCH increasing-credit-exposure predicate: available < amount.
 assert.equal(appCard.available<1,true,'app would reject positive expense; DB accepted it');
});
