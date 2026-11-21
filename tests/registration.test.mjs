import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadTsModule } from './loadTsModule.mjs';
const { validateRegistration, normalizeOtp, isValidOtp, registrationErrorMessage } = loadTsModule('lib/auth/registration.ts');
test('registration rejects mismatched passwords without changing password whitespace', () => {
  assert.equal(validateRegistration('person@example.test', 'secret1', 'different'), 'password_mismatch');
  assert.equal(validateRegistration('person@example.test', 'secret1 ', 'secret1'), 'password_mismatch');
  assert.equal(validateRegistration('person@example.test', 'secret1 ', 'secret1 '), null);
});
test('registration validates email and password length before requesting signup', () => {
  assert.equal(validateRegistration('bad-email', 'secret1', 'secret1'), 'invalid_email');
  assert.equal(validateRegistration('person@example.test', 'short', 'short'), 'short_password');
  assert.equal(validateRegistration(' person@example.test ', 'secret1', 'secret1'), null);
});
test('OTP accepts configured six to ten digits and preserves leading zeroes', () => {
  assert.equal(normalizeOtp('01 23-45'), '012345');
  for (const token of ['012345', '01234567', '0123456789']) assert.equal(isValidOtp(token), true);
  for (const token of ['', '12345', '12345678901', '12345a', '123 456']) assert.equal(isValidOtp(token), false);
});
test('OTP and delivery failures are actionable in both locales without leaking provider details', () => {
  for (const locale of ['th', 'en']) {
    for (const code of ['otp_expired','over_email_send_rate_limit','email_address_not_authorized','email_exists','weak_password']) {
      const message = registrationErrorMessage({ code, message:'PRIVATE upstream credentials' }, locale);
      assert.equal(typeof message, 'string'); assert.ok(message.length > 10); assert.ok(!message.includes('PRIVATE'));
    }
    assert.equal(registrationErrorMessage({message:'PRIVATE upstream credentials'},locale), registrationErrorMessage(null,locale));
  }
});
