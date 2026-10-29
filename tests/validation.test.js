// Run with: node --test tests/
const test = require('node:test');
const assert = require('node:assert');
const V = require('../validation.js');

const valid = {
  firstName: 'Zoë', lastName: "O'Brien-Núñez", phone: '(615)-555-1234', email: '',
  phoneType: 'iPhone', floor: '', wing: '', privacyAgreed: true,
};

test('formats digits as (xxx)-xxx-xxxx while typing', () => {
  assert.strictEqual(V.formatPhone('6'), '(6');
  assert.strictEqual(V.formatPhone('615'), '(615)');
  assert.strictEqual(V.formatPhone('6155'), '(615)-5');
  assert.strictEqual(V.formatPhone('6155551234'), '(615)-555-1234');
  assert.strictEqual(V.formatPhone('615.555.1234'), '(615)-555-1234');
  assert.strictEqual(V.formatPhone(''), '');
});

test('does not silently fix letters or extra digits', () => {
  assert.strictEqual(V.formatPhone('615555abcd'), '615555abcd');
  assert.strictEqual(V.formatPhone('61555512345'), '61555512345');
  assert.strictEqual(V.formatPhone('+1 615 555 1234'), '+1 615 555 1234');
});

test('phone errors', () => {
  assert.strictEqual(V.phoneError('(615)-555-1234'), '');
  assert.strictEqual(V.phoneError('615555abcd'), V.MESSAGES.phoneLetters);
  assert.strictEqual(V.phoneError('(615)-555-123'), V.MESSAGES.phoneFormat);
  assert.strictEqual(V.phoneError('61555512345'), V.MESSAGES.phoneFormat);
  assert.strictEqual(V.phoneError('615-555-1234'), V.MESSAGES.phoneFormat);
});

test('email is optional but must be valid when supplied', () => {
  assert.strictEqual(V.emailError(''), '');
  assert.strictEqual(V.emailError('   '), '');
  assert.strictEqual(V.emailError('name@example.com'), '');
  assert.strictEqual(V.emailError('first.last+club@sub.example.org'), '');
  for (const bad of ['name', 'name@', 'name@example', '@example.com', 'a b@example.com', 'name@exa_mple.com', 'name@-example.com']) {
    assert.strictEqual(V.emailError(bad), V.MESSAGES.email, bad);
  }
});

test('valid registration normalizes and keeps optional blanks null', () => {
  const { problems, record } = V.validateRegistration({ ...valid, firstName: '  Zoë  ' });
  assert.deepStrictEqual(problems, []);
  assert.deepStrictEqual(record, {
    first_name: 'Zoë', last_name: "O'Brien-Núñez", phone_display: '(615)-555-1234',
    phone_digits: '6155551234', email: null, phone_type: 'iPhone', floor: null, wing: null,
    privacy_agreed: true,
  });
});

test('floor, wing, and N/A are preserved', () => {
  const { record } = V.validateRegistration({ ...valid, floor: '8', wing: 'N/A', email: 'a@b.co' });
  assert.strictEqual(record.floor, 8);
  assert.strictEqual(record.wing, 'N/A');
  assert.strictEqual(record.email, 'a@b.co');
});

test('Android registrations are allowed', () => {
  assert.deepStrictEqual(V.validateRegistration({ ...valid, phoneType: 'Android' }).problems, []);
});

test('blank form lists every required item by label', () => {
  assert.deepStrictEqual(V.validateRegistration({}).problems,
    ['First Name', 'Last Name', 'Phone Number', 'Phone Type', 'Privacy agreement']);
});

test('whitespace-only names are rejected', () => {
  const { problems } = V.validateRegistration({ ...valid, firstName: '   ', lastName: '\t' });
  assert.deepStrictEqual(problems, ['First Name', 'Last Name']);
});

test('unrecognized dropdown values and non-true consent are rejected', () => {
  const { problems } = V.validateRegistration({ ...valid, phoneType: 'Pixel', floor: '9', wing: 'North', privacyAgreed: 'true' });
  assert.deepStrictEqual(problems, ['Phone Type', 'Floor', 'Wing', 'Privacy agreement']);
});

test('invalid phone and email block submission', () => {
  const { problems } = V.validateRegistration({ ...valid, phone: '615555abcd', email: 'nope' });
  assert.deepStrictEqual(problems, ['Phone Number (10 digits required)', 'Email (correct the address or leave it blank)']);
});
