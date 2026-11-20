import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './loadTsModule.mjs';
function requestCache(){const caches=[];return{cache(fn){const values=new Map();caches.push(values);return(...args)=>{const key=JSON.stringify(args);if(!values.has(key))values.set(key,fn(...args));return values.get(key);};},nextRequest(){for(const values of caches)values.clear();}};}
test('auth helpers reuse one verified user per request and never across requests',async()=>{
  const react=requestCache();let calls=0;
  const auth=loadTsModule('lib/auth/getUser.ts',{'react':react,'@/lib/supabase/server':{createClient:async()=>({auth:{getUser:async()=>{calls++;return{data:{user:{id:'user'+calls}},error:null};}}})},'next/navigation':{redirect:()=>assert.fail('redirect')}});
  const [a,b,c]=await Promise.all([auth.getUser(),auth.requireUser(),auth.getUser()]);assert.equal(calls,1);assert.strictEqual(a,b);assert.strictEqual(b,c);
  react.nextRequest();assert.equal((await auth.getUser()).id,'user2');assert.equal(calls,2);
});
test('settings cache uses primitive user keys and creates its own request client',async()=>{
  const react=requestCache();let clients=0,calls=0;
  const {getCachedUserSettings}=loadTsModule('lib/auth/requestSettings.ts',{'react':react,'@/lib/supabase/server':{createClient:async()=>{clients++;return{};}},'@/services/userSettings':{getUserSettings:async(_client,id)=>{calls++;return{user_id:id};}}});
  const [a,b,c]=await Promise.all([getCachedUserSettings('a'),getCachedUserSettings('a'),getCachedUserSettings('b')]);assert.strictEqual(a,b);assert.equal(c.user_id,'b');assert.equal(calls,2);assert.equal(clients,2);
  react.nextRequest();await getCachedUserSettings('a');assert.equal(calls,3);
});
