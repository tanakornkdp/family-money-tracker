import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {openDatabase,sqlOptions,unavailable,isolated,expectSqlError,USER} from './sql/helpers.mjs';
let db;before(async()=>{if(!unavailable){db=await openDatabase();await db.query('insert into auth.users(id) values($1)',[USER]);await db.query("select pg_catalog.set_config('request.jwt.claim.sub',$1,false)",[USER]);}});after(async()=>{await db?.close();});
const scenario=(name,run)=>test('PGlite quota: '+name,sqlOptions,()=>isolated(db,run));
async function quota(key='ai-chat',limit=3,window=86400){return(await db.query('select * from public.check_rate_limit($1,$2,$3)',[key,limit,window])).rows[0];}
scenario('allows exactly limit calls; next denied with positive Retry-After; other key independent',async()=>{
 // Longest supported window avoids a normal minute/hour boundary during the test.
 for(let i=0;i<3;i++){const r=await quota();assert.equal(r.allowed,true);assert.equal(r.retry_after_seconds,0);}
 const denied=await quota();assert.equal(denied.allowed,false);assert(denied.retry_after_seconds>0);assert.equal((await quota('ai-analyze')).allowed,true);
});
scenario('invalid limits/windows are rejected',async()=>{for(const [limit,window] of [[0,3600],[-1,3600],[1001,3600],[null,3600],[3,0],[3,61],[3,null]])await expectSqlError(db,()=>quota('ai-chat',limit,window),'22023',/Invalid rate limit configuration/);});
scenario('authenticated may call quota but cannot directly read/write its table',async()=>{
 // Real PostgreSQL SET ROLE in PGlite; this tests supplied grants, not Supabase identity/RLS.
 await db.exec('set local role authenticated;');
 assert.equal((await quota()).allowed,true);
 await expectSqlError(db,()=>db.query('select * from public.api_rate_limits'),'42501',/permission denied/);
 await expectSqlError(db,()=>db.query('update public.api_rate_limits set request_count=1'),'42501',/permission denied/);
 await expectSqlError(db,()=>db.query('delete from public.api_rate_limits'),'42501',/permission denied/);
 await expectSqlError(db,()=>db.query("insert into public.api_rate_limits(user_id,key,window_seconds,window_start,request_count) values($1,'ocr',3600,now(),1)",[USER]),'42501',/permission denied/);
 const {rows:[p]}=await db.query("select has_table_privilege('authenticated','public.api_rate_limits','SELECT') as r,has_table_privilege('authenticated','public.api_rate_limits','INSERT') as i,has_table_privilege('authenticated','public.api_rate_limits','UPDATE') as u,has_table_privilege('authenticated','public.api_rate_limits','DELETE') as d");assert.deepEqual(p,{r:false,i:false,u:false,d:false});
});
