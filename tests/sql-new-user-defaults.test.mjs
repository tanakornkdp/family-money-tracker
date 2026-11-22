import {test,before,after} from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {openDatabase,isolated,sqlOptions,unavailable} from './sql/helpers.mjs';
let db;before(async()=>{if(!unavailable)db=await openDatabase();});after(async()=>{await db?.close();});
const defaults=JSON.parse(await readFile(new URL('../config/new-user-defaults.json',import.meta.url)));
test('PGlite: signup seeds the approved categories/icons and titles without financial history',sqlOptions,async()=>isolated(db,async()=>{
 const id='88888888-8888-4888-8888-888888888888';
 await db.query('insert into auth.users(id) values($1)',[id]);
 const categories=(await db.query('select name,type,icon from public.categories where user_id=$1 order by name',[id])).rows;
 const titles=(await db.query('select name,type,category,icon from public.transaction_titles where user_id=$1 order by name',[id])).rows;
 const sort=rows=>[...rows].sort((a,b)=>a.name.localeCompare(b.name));
 assert.deepEqual(sort(categories),sort(defaults.categories));assert.deepEqual(sort(titles),sort(defaults.titles));
 for(const title of titles)assert(categories.some(c=>c.name===title.category&&(c.type==='both'||c.type===title.type)));
 assert.equal((await db.query('select count(*)::int n from public.transactions where user_id=$1',[id])).rows[0].n,0);
}));
test('PGlite: new signup does not overwrite another user categories or templates',sqlOptions,async()=>isolated(db,async()=>{
 const old='99999999-9999-4999-8999-999999999999',fresh='77777777-7777-4777-8777-777777777777';
 await db.query("insert into public.categories(user_id,name,type,icon) values($1,'Custom','both','X')",[old]);
 await db.query('insert into auth.users(id) values($1)',[fresh]);
 assert.deepEqual((await db.query('select name,type,icon from public.categories where user_id=$1',[old])).rows,[{name:'Custom',type:'both',icon:'X'}]);
}));
