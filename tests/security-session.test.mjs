import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { loadTsModule } from './loadTsModule.mjs';
const require=createRequire(import.meta.url);
function mockEnvironment(t) {
  const oldUrl=process.env.NEXT_PUBLIC_SUPABASE_URL, oldKey=process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  process.env.NEXT_PUBLIC_SUPABASE_URL='https://example.supabase.co';process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY='dummy';
  t.after(()=>{if(oldUrl===undefined)delete process.env.NEXT_PUBLIC_SUPABASE_URL;else process.env.NEXT_PUBLIC_SUPABASE_URL=oldUrl;if(oldKey===undefined)delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;else process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY=oldKey;});
}
const { NextRequest }=require('next/server');
const schemas=loadTsModule('lib/validation/aiSchemas.ts');
const errors=loadTsModule('lib/api/errors.ts');
const auth=async()=>({data:{user:{id:'user'}}});
const report={summary:'Summary',insights:[],warnings:[],tips:[],score:70};
const input={kpis:{totalIncome:10,totalExpense:2,balance:8,transactionCount:1},topCategories:[],period:'November'};
test('financial analysis validates output and quota rejection never calls AI',async()=>{
  for(const [text,status] of [[JSON.stringify(report),200],['{}',500],[JSON.stringify({...report,score:101}),500]]){
    const { POST }=loadTsModule('app/api/ai/analyze/route.ts',{
      '@/lib/supabase/server':{createClient:async()=>({auth:{getUser:auth}})},
      '@/lib/api/rateLimit':{enforceApiRateLimit:async()=>null},
      '@/lib/validation/aiSchemas':schemas,
      '@/lib/ai/freeRouter':{FreeAIUnavailableError:class extends Error{},completeFreeAI:async()=>({text})},
    });
    const response=await POST(new Request('https://example.test',{method:'POST',body:JSON.stringify(input)}));
    assert.equal(response.status,status);assert.deepEqual(await response.json(),status===200?report:{error:'AI service unavailable',code:'AI_ERROR'});
  }
  const {POST}=loadTsModule('app/api/ai/analyze/route.ts',{
    '@/lib/supabase/server':{createClient:async()=>({auth:{getUser:auth}})},'@/lib/api/rateLimit':{enforceApiRateLimit:async()=>new Response('{}',{status:429})},'@/lib/validation/aiSchemas':schemas,'@/lib/ai/freeRouter':{FreeAIUnavailableError:class extends Error{},completeFreeAI:async()=>assert.fail('AI called')},
  });
  assert.equal((await POST(new Request('https://example.test',{method:'POST',body:JSON.stringify(input)}))).status,429);
});
test('chat and OCR stop on quota rejection before expensive data/provider/storage work',async()=>{
  const guard={enforceApiRateLimit:async()=>new Response('{}',{status:429})};
  const chat=loadTsModule('app/api/ai/route.ts',{'@/lib/supabase/server':{createClient:async()=>({auth:{getUser:auth}})},'@/lib/api/rateLimit':guard,'@/lib/utils/dateHelpers':{},'@/services/transactions':{getTransactions:async()=>assert.fail('data requested')},'@/lib/ai/freeRouter':{FreeAIUnavailableError:class extends Error{},completeFreeAI:async()=>assert.fail('AI called')}});
  assert.equal((await chat.POST(new Request('https://example.test',{method:'POST',body:JSON.stringify({messages:[{role:'user',content:'Hello'}]})}))).status,429);
  const client={auth:{getUser:auth},from(){return{select(){return this;},eq(){return this;},single:async()=>({data:{id:'receipt',file_path:'user/photo.jpg'}})}},storage:{from:()=>assert.fail('storage called')}};
  const ocr=loadTsModule('app/api/ocr/route.ts',{'@/lib/supabase/server':{createClient:async()=>client},'@/lib/api/rateLimit':guard,'@/lib/api/errors':errors,'@/ocr/analyzeReceiptImage':{analyzeReceiptImage:async()=>assert.fail('OCR called')}});
  assert.equal((await ocr.POST(new Request('https://example.test',{method:'POST',body:JSON.stringify({receiptId:'receipt',filePath:'user/photo.jpg'})}))).status,429);
});
test('session refresh uses getAll/setAll and preserves multiple cookie batches and cache headers on redirects',async t=>{
  mockEnvironment(t);
  for(const loggedIn of [true,false]){
    const request=new NextRequest('https://example.test/reports?view=all',{headers:{cookie:'old=value'}});
    const { updateSession }=loadTsModule('lib/supabase/middleware.ts',{'@supabase/ssr':{createServerClient:(_url,_key,{cookies})=>({auth:{getUser:async()=>{
      assert.deepEqual(cookies.getAll(),[{name:'old',value:'value'}]);
      cookies.setAll([{name:'auth.0',value:'first',options:{httpOnly:true,path:'/',sameSite:'lax'}}],{'Cache-Control':'private, no-store','Pragma':'no-cache'});
      cookies.setAll([{name:'auth.1',value:'second',options:{path:'/',maxAge:0}}],{'Expires':'0'});
      return{data:{user:loggedIn?{id:'user'}:null},error:null};
    }}})}});
    const response=await updateSession(request);
    assert.equal(response.status,loggedIn?200:307);
    assert.equal(response.cookies.get('auth.0').value,'first');assert.equal(response.cookies.get('auth.0').httpOnly,true);
    assert.equal(response.cookies.get('auth.1').maxAge,0);
    assert.equal(request.cookies.get('auth.0').value,'first');
    assert.equal(response.headers.get('Cache-Control'),'private, no-store');assert.equal(response.headers.get('Pragma'),'no-cache');assert.equal(response.headers.get('Expires'),'0');
    if(!loggedIn)assert.equal(new URL(response.headers.get('location')).searchParams.get('next'),'/reports?view=all');
  }
});
test('money plans and reports are protected at exact path boundaries; preview stays a public redirect',async t=>{
  mockEnvironment(t);
  const {updateSession}=loadTsModule('lib/supabase/middleware.ts',{'@supabase/ssr':{createServerClient:()=>({auth:{getUser:async()=>({data:{user:null},error:null})}})}});
  for(const path of ['/reports','/reports/month','/money-plans','/money-plans/id'])assert.equal((await updateSession(new NextRequest('https://example.test'+path))).status,307);
  for(const path of ['/reports-public','/money-plans-public','/preview'])assert.equal((await updateSession(new NextRequest('https://example.test'+path))).status,200);
});
