// Runs backend/Code.gs against an in-memory stand-in for Google Apps Script services.
// Run with: node --test tests/backend.test.js
const test = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function load() {
  const rows = [];
  const mail = [];
  const sheet = {
    appendRow: r => rows.push(r),
    getLastRow: () => rows.length,
    // Like Sheets, a leading apostrophe forces text and is not part of the read-back value.
    getRange: (r, c, n, w) => ({ getValues: () => rows.slice(r - 1, r - 1 + n)
      .map(x => x.slice(c - 1, c - 1 + w).map(v => (typeof v === 'string' ? v.replace(/^'/, '') : v))) }),
    setFrozenRows() {},
  };
  const book = { getSheetByName: () => (rows.length ? sheet : null), insertSheet: () => sheet };
  const ctx = {
    console,
    SpreadsheetApp: { getActiveSpreadsheet: () => book, flush() {} },
    LockService: { getScriptLock: () => ({ tryLock: () => true, releaseLock() {} }) },
    Utilities: { getUuid: () => 'uuid-' + rows.length, newBlob: (data, type, name) => ({ data, type, name }) },
    PropertiesService: { getScriptProperties: () => ({ getProperty: () => 'owner@example.com' }) },
    Session: { getEffectiveUser: () => ({ getEmail: () => 'x' }), getScriptTimeZone: () => 'America/Chicago' },
    MailApp: { sendEmail: m => mail.push(m) },
    ContentService: { createTextOutput: t => ({ text: t, setMimeType() { return this; } }), MimeType: { JSON: 'json' } },
  };
  vm.createContext(ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../validation.js'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(path.join(__dirname, '../backend/Code.gs'), 'utf8'), ctx);
  const post = body => JSON.parse(ctx.doPost({ postData: { contents: JSON.stringify(body) } }).text);
  const postRaw = contents => JSON.parse(ctx.doPost({ postData: { contents } }).text);
  return { post, postRaw, rows, mail };
}

const valid = {
  firstName: 'Zoë', lastName: "O'Brien", phone: '(615)-555-1234', email: 'zoe@example.com',
  phoneType: 'Android', floor: '3', wing: 'N/A', privacyAgreed: true, privacyVersion: '2026-10-29', requestId: 'r1',
};

test('saves registration with consent metadata and emails the owner a contact card', () => {
  const { post, rows, mail } = load();
  assert.deepStrictEqual(post(valid), { ok: true });
  assert.strictEqual(rows.length, 2);
  const [header, row] = rows;
  const rec = Object.fromEntries(header.map((h, i) => [h, row[i]]));
  assert.strictEqual(rec.phone_digits, "'6155551234");
  assert.strictEqual(rec.floor, 3);
  assert.strictEqual(rec.wing, 'N/A');
  assert.strictEqual(rec.privacy_agreed, true);
  assert.strictEqual(rec.privacy_version, '2026-10-29');
  assert.strictEqual(Object.prototype.toString.call(rec.privacy_accepted_at), '[object Date]');
  assert.strictEqual(mail.length, 1);
  assert.strictEqual(mail[0].subject, 'A new Fan wants to join');
  assert.strictEqual(mail[0].to, 'owner@example.com');
  assert.match(mail[0].body, /cannot join the iMessage group/);
  const card = mail[0].attachments[0];
  assert.match(card.name, /\.vcf$/);
  assert.match(card.data, /N:O'Brien;Zoë/);
  assert.match(card.data, /TEL;TYPE=CELL:\+16155551234/);
  assert.match(card.data, /EMAIL;TYPE=INTERNET:zoe@example.com/);
});

test('optional blanks are stored blank', () => {
  const { post, rows } = load();
  post({ ...valid, email: '', floor: '', wing: '' });
  const rec = Object.fromEntries(rows[0].map((h, i) => [h, rows[1][i]]));
  assert.strictEqual(rec.email, '');
  assert.strictEqual(rec.floor, '');
  assert.strictEqual(rec.wing, '');
});

test('same phone number is rejected as already enrolled', () => {
  const { post, rows, mail } = load();
  post(valid);
  const res = post({ ...valid, firstName: 'Other', requestId: 'r2' });
  assert.deepStrictEqual(res, { ok: false, code: 'duplicate', message: 'This number already enrolled' });
  assert.strictEqual(rows.length, 2);
  assert.strictEqual(mail.length, 1);
});

test('a retried request is not saved twice and is not called a duplicate', () => {
  const { post, rows, mail } = load();
  post(valid);
  assert.deepStrictEqual(post(valid), { ok: true });
  assert.strictEqual(rows.length, 2);
  assert.strictEqual(mail.length, 1);
});

test('server rejects invalid data sent directly', () => {
  const { post, rows } = load();
  const res = post({ ...valid, phoneType: 'Pixel', privacyAgreed: 'yes' });
  assert.strictEqual(res.ok, false);
  assert.strictEqual(res.code, 'invalid');
  assert.strictEqual(rows.length, 0);
});

test('unreadable body is rejected', () => {
  const { postRaw, rows } = load();
  assert.strictEqual(postRaw('not json').ok, false);
  assert.strictEqual(rows.length, 0);
});
