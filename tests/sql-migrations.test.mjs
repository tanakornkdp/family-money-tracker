import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {openDatabase,applyMigration,migrationFiles,migrationDir,databaseInfo,sqlOptions,unavailable} from './sql/helpers.mjs';
let db;before(async()=>{if(!unavailable)db=await openDatabase();});after(async()=>{await db?.close();});
test('PGlite: EVERY migration applies in filename order to a fresh stub baseline',sqlOptions,async()=>{assert.deepEqual(databaseInfo.get(db).applied,await migrationFiles());assert(databaseInfo.get(db).applied.length>=7);});
test('PGlite: re-runnable migrations apply twice; one-shot history is explicitly reported',sqlOptions,async t=>{
 const oneShot=new Map([['20261119090000_future_money_plans.sql','42P07'],['20261119093000_future_plan_validation.sql','42710']]);
 for(const name of await migrationFiles()){
  if(oneShot.has(name)){
   await assert.rejects(applyMigration(db,name),error=>{assert.equal(error.code,oneShot.get(name));assert(error.message.includes(name));t.diagnostic('NOT RE-RUNNABLE (expected): '+error.message);return true;});
  }else{await applyMigration(db,name);await applyMigration(db,name);t.diagnostic('RE-RUNNABLE twice: '+name);}
 }
});
const signatures=['public.get_card_balances(uuid)','public.get_card_balance(uuid,uuid)','public.get_dashboard_totals(uuid,boolean,uuid[],date,date,boolean)','public.check_rate_limit(text,integer,integer)'];
test('PGlite: expected RPC signatures and authenticated-only EXECUTE grants',sqlOptions,async()=>{
 for(const signature of signatures){
  const {rows:[r]}=await db.query(`select pg_catalog.to_regprocedure($1)::text as signature,
   pg_catalog.has_function_privilege('anon',$1,'EXECUTE') as anon,
   pg_catalog.has_function_privilege('authenticated',$1,'EXECUTE') as authenticated,
   exists(select 1 from pg_catalog.pg_proc p, lateral pg_catalog.aclexplode(coalesce(p.proacl,pg_catalog.acldefault('f',p.proowner))) a where p.oid=pg_catalog.to_regprocedure($1) and a.grantee=0 and a.privilege_type='EXECUTE') as public_execute`,[signature]);
  assert(r.signature);assert.equal(r.anon,false,signature);assert.equal(r.public_execute,false,signature);assert.equal(r.authenticated,true,signature);
 }
});
test('PGlite: every migration-created function has empty search_path; limit trigger is invoker',sqlOptions,async()=>{
 const baseline=databaseInfo.get(db).baseline;const {rows}=await db.query("select p.oid,p.proname,p.prosecdef,p.proconfig from pg_catalog.pg_proc p join pg_catalog.pg_namespace n on n.oid=p.pronamespace where n.nspname in ('public','private','auth')");
 const created=rows.filter(p=>!baseline.includes(Number(p.oid)));assert(created.length>=8);
 for(const p of created)assert(p.proconfig?.includes('search_path=""'),p.proname+' must have empty search_path');
 assert.equal(created.find(p=>p.proname==='enforce_card_expense_limit').prosecdef,false);
});
test('PGlite NEGATIVE CONTROL: original broken scoped CTE fails creating totals function',sqlOptions,async t=>{
 const name='20261120130000_dashboard_totals.sql',source=await readFile(new URL(name,migrationDir),'utf8');
 // Small embedded ORIGINAL broken select variant: payment_method was omitted.
 const fixed='t.date, t.created_at, t.payment_method,',broken='t.date, t.created_at,';
 assert(source.includes(fixed));const originalBroken=source.replace(fixed,broken);assert.notEqual(originalBroken,source);
 await assert.rejects(applyMigration(db,name,originalBroken),error=>{assert.equal(error.code,'42703');assert.match(error.message,/payment_method/);t.diagnostic('EXPECTED SQL FAILURE: '+error.message);return true;});
});
