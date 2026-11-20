import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './loadTsModule.mjs';
const errors=loadTsModule('lib/api/errors.ts');
const auth=async()=>({data:{user:{id:'user'}}});
test('money-plan internal errors omit detail and deliberate conflicts retain public codes',async t=>{
  t.mock.method(console,'error',()=>{});
  for(const error of [{message:'private database details'}, {code:'23505',message:'duplicate private data'}]){
    const client={auth:{getUser:auth},from:()=>({insert(){return this;},select(){return this;},single:async()=>({error})})};
    const {POST}=loadTsModule('app/api/money-plans/route.ts',{'@/lib/api/errors':errors,'@/lib/supabase/server':{createClient:async()=>client},'@/lib/validation/futureMoneyPlans':{}});
    const response=await POST({json:async()=>({action:'link',link:{plan_id:'550e8400-e29b-41d4-a716-446655440000',allocation_id:null,transaction_id:'550e8400-e29b-41d4-a716-446655440001',contribution_id:null}})});
    assert.equal(response.status,400);assert.deepEqual(await response.json(),{error:error.code?'already_linked':'link'});
  }
});
test('OCR unexpected failures respond generically and still mark the owned receipt failed',async t=>{
  const logged=[];t.mock.method(console,'error',message=>logged.push(message));let failed=false;
  const query={select(){return this;},eq(){return this;},single:async()=>({data:{id:'receipt',file_path:'user/photo.jpg'}}),update(value){failed=value.status==='failed';return this;}};
  const client={auth:{getUser:auth},from:()=>query,storage:{from:()=>({createSignedUrl:async()=>({error:{message:'Could not sign https://private.test/image?secret=yes'}})})}};
  const {POST}=loadTsModule('app/api/ocr/route.ts',{'@/lib/api/errors':errors,'@/lib/api/rateLimit':{enforceApiRateLimit:async()=>null},'@/lib/supabase/server':{createClient:async()=>client},'@/ocr/analyzeReceiptImage':{}});
  const response=await POST({headers:new Headers(),json:async()=>({receiptId:'receipt',filePath:'user/photo.jpg'})});
  assert.equal(response.status,500);assert.deepEqual(await response.json(),{error:'Internal server error'});assert(failed);assert.deepEqual(logged,['Could not sign [redacted URL]']);
});
