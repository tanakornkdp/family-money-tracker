import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './loadTsModule.mjs';
const schemas = loadTsModule('lib/validation/aiSchemas.ts');
const policy = loadTsModule('lib/api/rateLimitPolicy.ts');
const bounded = loadTsModule('lib/api/readJson.ts');
const { enforceApiRateLimit } = loadTsModule('lib/api/rateLimit.ts', { './rateLimitPolicy': policy });
const errors = loadTsModule('lib/api/errors.ts');
const id = '550e8400-e29b-41d4-a716-446655440000';
const input = { ocrText: 'Receipt', categories: ['Food'], cards: [{ id, name: 'Visa', card_type: 'credit' }] };
const output = { title: 'Shop', category: 'Food', payment_method: 'credit_card', card_id: id };
const report = { summary: 'Summary', insights: ['Insight'], warnings: [], tips: [], score: 75 };
test('receipt input accepts bounded Unicode and defaults optional arrays', () => {
  assert(schemas.receiptAnalysisInputSchema.safeParse(input).success);
  assert.equal(schemas.receiptAnalysisInputSchema.parse({ ocrText: 'ก'.repeat(20000) }).cards.length, 0);
});
test('receipt input rejects malformed types and all length/count boundaries', () => {
  for (const change of [{ ocrText: ' ' }, { ocrText: 'x'.repeat(20001) }, { categories: Array(101).fill('Food') }, { categories: ['x'.repeat(101)] }, { categories: 'Food' }, { cards: Array(51).fill(input.cards[0]) }, { cards: [{ ...input.cards[0], id: 'invalid' }] }, { cards: [{ ...input.cards[0], name: 'x'.repeat(101) }] }, { cards: [{ ...input.cards[0], card_type: 'cash' }] }]) assert(!schemas.receiptAnalysisInputSchema.safeParse({ ...input, ...change }).success);
});
test('AI outputs enforce shapes, score and supplied card ownership', () => {
  assert(schemas.financialAnalysisOutputSchema.safeParse(report).success);
  for(const change of [{score:101},{score:-1},{score:1.1},{summary:[]},{summary:'x'.repeat(4001)},{tips:Array(21).fill('tip')},{insights:['x'.repeat(2001)]}]) assert(!schemas.financialAnalysisOutputSchema.safeParse({...report,...change}).success);
  const schema=schemas.receiptAnalysisOutputSchema(input.cards);
  assert(schema.safeParse(output).success);
  assert(schema.safeParse({...output,card_id:null}).success);
  for(const change of [{card_id:'550e8400-e29b-41d4-a716-446655440001'},{card_id:'invalid'},{payment_method:'wire'},{title:''}]) assert(!schema.safeParse({...output,...change}).success);
});
test('bounded JSON enforces actual UTF-8 bytes with missing or lying content length', async () => {
  for(const headers of [{},{'content-length':'1'}]) await assert.rejects(bounded.readJsonBounded(new Request('https://example.test',{method:'POST',headers,body:JSON.stringify({text:'ก'.repeat(20)})}),30),bounded.PayloadTooLargeError);
  assert.deepEqual(await bounded.readJsonBounded(new Request('https://example.test',{method:'POST',body:'{"x":1}'}),10),{x:1});
  await assert.rejects(bounded.readJsonBounded(new Request('https://example.test',{method:'POST',body:'no json'}),30),SyntaxError);
});
test('quota decisions reject malformed responses and preserve known denials', () => {
  assert.deepEqual(policy.parseRateLimitDecision([{allowed:false,retry_after_seconds:42}]),{allowed:false,retryAfter:42});
  for(const result of [null,[],[{}],[{allowed:'false',retry_after_seconds:10}],[{allowed:false,retry_after_seconds:0}],[{allowed:true,retry_after_seconds:-1}]]) assert.throws(()=>policy.parseRateLimitDecision(result));
});
test('all endpoint quotas use one configuration and return 429 with Retry-After', async () => {
  for(const [endpoint,config] of Object.entries(policy.RATE_LIMITS)) {
    const response=await enforceApiRateLimit({rpc:async(name,args)=>{assert.equal(name,'check_rate_limit');assert.deepEqual(args,{p_key:config.key,p_limit:config.limit,p_window_seconds:3600});return {data:[{allowed:false,retry_after_seconds:19}],error:null};}},endpoint);
    assert.equal(response.status,429);assert.equal(response.headers.get('Retry-After'),'19');assert.equal((await response.json()).code,'RATE_LIMITED');
  }
});
test('quota allows approved requests, fails open on call errors and fails closed on invalid decisions', async t => {
  const messages=[];t.mock.method(console,'error',message=>messages.push(message));
  assert.equal(await enforceApiRateLimit({rpc:async()=>({data:[{allowed:true,retry_after_seconds:0}],error:null})},'chat'),null);
  assert.equal(messages.length,0);
  for(const rpc of [async()=>({error:{message:'private payload'}}),async()=>{throw Error('secret');}]) assert.equal(await enforceApiRateLimit({rpc},'chat'),null);
  assert.deepEqual(messages,Array(2).fill('API rate-limit check failed'));
  assert.equal((await enforceApiRateLimit({rpc:async()=>({data:[],error:null})},'chat')).status,500);
  assert.equal(messages.at(-1),'API rate-limit decision invalid');
});
function receiptRoute({body=input,text=JSON.stringify(output),quota=null,user=true}={}) {
  let providerCalls=0;
  const route=loadTsModule('app/api/ai/receipt-analyze/route.ts',{
    '@/lib/supabase/server':{createClient:async()=>({auth:{getUser:async()=>({data:{user:user?{id}:null}})}})},
    '@/lib/api/rateLimit':{enforceApiRateLimit:async()=>quota},
    '@/lib/api/readJson':bounded,'@/lib/validation/aiSchemas':schemas,
    '@/lib/ai/freeRouter':{FreeAIUnavailableError:class extends Error{},completeFreeAI:async()=>{providerCalls++;return{text};}},
  });
  return {run:()=>route.POST(new Request('https://example.test',{method:'POST',body:typeof body==='string'?body:JSON.stringify(body)})),calls:()=>providerCalls};
}
test('receipt API rejects invalid input as 400 and oversized bytes as 413 without AI', async()=>{
  for(const [body,status] of [[{ocrText:1},400],['bad JSON',400],[{ocrText:'x'.repeat(200000)},413]]) {const route=receiptRoute({body});assert.equal((await route.run()).status,status);assert.equal(route.calls(),0);}
});
test('receipt API blocks unauthenticated and rate-limited calls before AI', async()=>{
  for(const options of [{user:false},{quota:new Response('{}',{status:429})}]){const route=receiptRoute(options);assert.equal((await route.run()).status,options.user===false?401:429);assert.equal(route.calls(),0);}
});
test('receipt API accepts valid AI JSON and rejects invalid or foreign card IDs with AI_ERROR',async()=>{
  assert.deepEqual(await (await receiptRoute().run()).json(),output);
  for(const text of ['bad JSON','{}',JSON.stringify({...output,card_id:'550e8400-e29b-41d4-a716-446655440001'})]){const response=await receiptRoute({text}).run();assert.equal(response.status,500);assert.equal((await response.json()).code,'AI_ERROR');}
});
test('error helper exposes only a public response and logs one redacted message',async t=>{
  const logged=[];t.mock.method(console,'error',(...args)=>logged.push(args));
  const response=errors.apiError(new Error('wrapped',{cause:{message:'Failure https://private.test/token Bearer secret\nbody text',details:'sensitive'}}));
  assert.deepEqual(await response.json(),{error:'Internal server error'});
  assert.deepEqual(logged,[['Failure [redacted URL] [redacted credential]']]);
});
test('backup GET and POST return JSON 401 without starting database work',async()=>{
  const route=loadTsModule('app/api/backup/route.ts',{'@/lib/auth/getUser':{getUser:async()=>null},'@/lib/supabase/server':{createClient:async()=>assert.fail('unauthorized DB work')}});
  for(const action of ['GET','POST']){const response=await route[action]({});assert.equal(response.status,401);assert.deepEqual(await response.json(),{error:'Unauthorized'});}
});
