import {readFile,readdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
export const root=new URL('../../',import.meta.url);
export const migrationDir=new URL('supabase/migrations/',root);
export const USER='11111111-1111-4111-8111-111111111111';
let PGlite;
export let unavailable;
if(typeof WebAssembly==='undefined') unavailable='PGlite unavailable: WebAssembly is not provided by this Node runtime';
else {
  try {({PGlite}=await import('@electric-sql/pglite'));}
  catch(error){if(error.code==='ERR_MODULE_NOT_FOUND'&&error.message.includes('@electric-sql/pglite'))unavailable='PGlite unavailable: install pinned devDependencies with npm ci';else throw error;}
}
export const sqlOptions={skip:unavailable||false};
export const databaseInfo=new WeakMap();
export async function migrationFiles(){return(await readdir(migrationDir)).filter(name=>name.endsWith('.sql')).sort();}
export async function applyMigration(db,name,source){
  const text=source??await readFile(new URL(name,migrationDir),'utf8');
  try {await db.exec('begin;');await db.exec(text);await db.exec('commit;');}
  catch(error){await db.exec('rollback;');const safe=new Error('Migration '+name+': '+error.message);safe.code=error.code;throw safe;}
}
export async function openDatabase(){
  if(unavailable)throw new Error(unavailable);
  const db=new PGlite();
  try {
    await db.waitReady;
    await db.exec(await readFile(new URL('baseline-stub.sql',import.meta.url),'utf8'));
    const baseline=(await db.query("select p.oid from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','private','auth')")).rows.map(r=>Number(r.oid));
    const applied=await migrationFiles();for(const name of applied)await applyMigration(db,name);
    databaseInfo.set(db,{baseline,applied});return db;
  }catch(error){await db.close();throw error;}
}
export async function isolated(db,run){await db.exec('begin;');try{return await run();}finally{await db.exec('rollback;');}}
export async function expectSqlError(db,run,code,message){
  await db.exec('savepoint expected_failure;');let failure;
  try{await run();}catch(error){failure=error;}
  finally{await db.exec('rollback to savepoint expected_failure; release savepoint expected_failure;');}
  assert(failure,'statement must be rejected by real PostgreSQL');assert.equal(failure.code,code);assert.match(failure.message,message);
}
export async function card(db,{type='credit',limit=100,id=randomUUID()}={}){
  await db.query('insert into public.credit_cards(id,user_id,name,card_type,credit_limit) values($1,$2,$3,$4,$5)',[id,USER,'SQL fixture',type,limit]);return id;
}
export async function transaction(db,{id=randomUUID(),cardId=null,type='expense',category='Other',amount=10,title='SQL fixture'}={},upsert=false){
  await db.query('insert into public.transactions(id,user_id,card_id,type,category,amount,title,date,payment_method) values($1,$2,$3,$4,$5,$6,$7,$8,$9)'+(upsert?' on conflict(id) do update set amount=excluded.amount,card_id=excluded.card_id,type=excluded.type,category=excluded.category,title=excluded.title':''),[id,USER,cardId,type,category,amount,title,'2026-11-15','cash']);return id;
}
export async function legacyExpense(db,cardId,amount=150){
  // Test-fixture setup only: never change/relax the actual migration or trigger.
  await db.exec('alter table public.transactions disable trigger enforce_card_expense_limit;');
  try{return await transaction(db,{cardId,amount});}finally{await db.exec('alter table public.transactions enable trigger enforce_card_expense_limit;');}
}
