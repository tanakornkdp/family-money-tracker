import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './loadTsModule.mjs';
const { isExistingSignup } = loadTsModule('lib/auth/registration.ts');
test('confirmed-account obfuscated signup response routes to account recovery, not OTP', () => {
  assert.equal(isExistingSignup({user:{identities:[],role:""},session:null}, null),true);
});
test('explicit duplicate errors route to account recovery', () => {
  for(const code of ['user_already_exists','email_exists']) assert.equal(isExistingSignup(null,{code}),true);
});
test('new or unconfirmed signup and ambiguous/malformed responses are not guessed as existing', () => {
  for(const data of [null,{}, {user:null}, {user:{}}, {user:{identities:null}}, {user:{identities:[]}}, {user:{identities:[],role:"authenticated",invited_at:"2026-11-22"}}, {user:{identities:[{id:'email-identity'}]},session:null}, {user:{identities:[]},session:{access_token:'fake-session'}}]) assert.equal(isExistingSignup(data,null),false);
  assert.equal(isExistingSignup({user:{identities:[],role:""},session:null},{code:'over_email_send_rate_limit'}),false);
  assert.equal(isExistingSignup(null,{message:'private upstream details'}),false);
});
