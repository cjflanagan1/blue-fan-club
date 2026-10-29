// Blüe's Fan Club registration backend (Google Apps Script, bound to a Google Sheet).
// Saves each registration to the sheet, rejects phone numbers that are already
// enrolled, and emails the owner a "A new Fan wants to join" alert with a contact card.
// Requires validation.js pasted into the same project as a script file named "Validation".
// Setup steps are in backend/README.md.

const SHEET_NAME = 'Registrations';
const HEADERS = [
  'registration_id', 'created_at', 'first_name', 'last_name', 'phone_display', 'phone_digits',
  'email', 'phone_type', 'floor', 'wing', 'privacy_agreed', 'privacy_version',
  'privacy_accepted_at', 'request_id',
];
const DUPLICATE_MESSAGE = 'This number already enrolled';

function doPost(e) {
  let data;
  try {
    data = JSON.parse(e && e.postData ? e.postData.contents : '');
  } catch (err) {
    return reply({ ok: false, message: 'We could not read your registration.' });
  }
  return reply(register(data));
}

function register(data) {
  const { problems, record } = BlueValidation.validateRegistration(data);
  if (problems.length) {
    return { ok: false, code: 'invalid', message: 'Please check: ' + problems.join(', ') + '.' };
  }
  const privacyVersion = typeof data.privacyVersion === 'string' ? data.privacyVersion.slice(0, 40) : '';
  const requestId = typeof data.requestId === 'string' ? data.requestId.slice(0, 64) : '';

  const lock = LockService.getScriptLock();
  if (!lock.tryLock(20000)) {
    return { ok: false, code: 'busy', message: 'The club is busy right now.' };
  }
  let row;
  try {
    const sheet = getSheet();
    const rows = sheet.getLastRow() > 1
      ? sheet.getRange(2, 1, sheet.getLastRow() - 1, HEADERS.length).getValues()
      : [];
    const digitsCol = HEADERS.indexOf('phone_digits');
    const requestCol = HEADERS.indexOf('request_id');
    // A retried request that was already saved counts as success, not a duplicate.
    if (requestId && rows.some(r => String(r[requestCol]) === requestId)) return { ok: true };
    if (rows.some(r => String(r[digitsCol]).replace(/^'/, '') === record.phone_digits)) {
      return { ok: false, code: 'duplicate', message: DUPLICATE_MESSAGE };
    }
    const now = new Date();
    row = {
      registration_id: Utilities.getUuid(),
      created_at: now,
      ...record,
      privacy_version: privacyVersion,
      privacy_accepted_at: now,
      request_id: requestId,
    };
    // Leading apostrophe keeps Sheets from turning phone digits into numbers.
    sheet.appendRow(HEADERS.map(h => {
      const v = row[h];
      if (v === null || v === undefined) return '';
      return h === 'phone_digits' || h === 'phone_display' ? "'" + v : v;
    }));
    SpreadsheetApp.flush();
  } finally {
    lock.releaseLock();
  }

  // The registration is already saved; a failed alert email must not report failure.
  try {
    notifyOwner(row);
  } catch (err) {
    console.error('Alert email failed: ' + err);
  }
  return { ok: true };
}

function getSheet() {
  const book = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = book.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = book.insertSheet(SHEET_NAME);
    sheet.appendRow(HEADERS);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function notifyOwner(r) {
  const to = PropertiesService.getScriptProperties().getProperty('NOTIFY_EMAIL')
    || Session.getEffectiveUser().getEmail();
  const name = r.first_name + ' ' + r.last_name;
  const lines = [
    'Name: ' + name,
    'Phone: ' + r.phone_display,
    'Email: ' + (r.email || '(none)'),
    'Phone type: ' + r.phone_type + (r.phone_type === 'Android' ? ' (cannot join the iMessage group yet)' : ''),
    'Floor: ' + (r.floor === null ? '(not given)' : r.floor),
    'Wing: ' + (r.wing || '(not given)'),
    'Signed up: ' + r.created_at.toLocaleString('en-US', { timeZone: Session.getScriptTimeZone() }),
    '',
    'Tap the attached contact card to add ' + r.first_name + ' to your Contacts.',
  ];
  MailApp.sendEmail({
    to,
    subject: 'A new Fan wants to join',
    body: lines.join('\n'),
    name: 'Blüe’s Fan Club',
    attachments: [Utilities.newBlob(vCard(r), 'text/vcard', name.replace(/[^\p{L}\p{N} '-]/gu, '') + '.vcf')],
  });
}

function vCard(r) {
  const esc = s => String(s).replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/([,;])/g, '\\$1');
  const note = ['Blüe’s Fan Club', r.phone_type, r.floor === null ? '' : 'Floor ' + r.floor, r.wing ? 'Wing ' + r.wing : '']
    .filter(Boolean).join(' · ');
  return [
    'BEGIN:VCARD',
    'VERSION:3.0',
    'N:' + esc(r.last_name) + ';' + esc(r.first_name) + ';;;',
    'FN:' + esc(r.first_name + ' ' + r.last_name),
    'TEL;TYPE=CELL:+1' + r.phone_digits,
    r.email ? 'EMAIL;TYPE=INTERNET:' + esc(r.email) : '',
    'NOTE:' + esc(note),
    'END:VCARD',
  ].filter(Boolean).join('\r\n');
}

function reply(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

// Run this once from the Apps Script editor to grant permissions and confirm the alert email arrives.
function sendTestAlert() {
  notifyOwner({
    first_name: 'Test', last_name: 'Fan', phone_display: '(615)-555-0100', phone_digits: '6155550100',
    email: 'test@example.com', phone_type: 'iPhone', floor: 3, wing: 'East', created_at: new Date(),
  });
}
