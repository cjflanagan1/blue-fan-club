// Real-browser checks using installed Google Chrome.
// Setup once:  npm install --no-save playwright-core
// Run:         node --test tests/browser.test.js
const test = require('node:test');
const assert = require('node:assert');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium, devices } = require('playwright-core');

const SITE = path.join(__dirname, '..');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.jpg': 'image/jpeg' };
let server, base, browser;

test.before(async () => {
  server = http.createServer((req, res) => {
    const file = path.join(SITE, req.url === '/' ? 'index.html' : decodeURIComponent(req.url.split('?')[0]));
    if (!file.startsWith(SITE) || !fs.existsSync(file)) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise(r => server.listen(0, r));
  base = `http://127.0.0.1:${server.address().port}/`;
  browser = await chromium.launch({ channel: 'chrome' });
});
test.after(async () => { await browser.close(); server.close(); });

async function openPage(submitUrl) {
  const context = await browser.newContext({ ...devices['iPhone 13'] });
  const page = await context.newPage();
  if (submitUrl) {
    await page.route(base, async route => {
      const res = await route.fetch();
      const html = (await res.text()).replace("submitUrl: ''", `submitUrl: '${submitUrl}'`);
      await route.fulfill({ response: res, body: html });
    });
  }
  await page.goto(base);
  return page;
}

async function fillValid(page, phoneType = 'iPhone') {
  await page.fill('#bf-first', 'Zoë');
  await page.fill('#bf-last', "O'Brien");
  await page.locator('#bf-phone').pressSequentially('6155551234');
  await page.selectOption('#bf-phone-type', phoneType);
  await page.check('#bf-agree');
}

test('photo, credential, and no horizontal scroll on a phone', async () => {
  const page = await openPage();
  const img = page.locator('.bf-photo img');
  assert.ok(await img.evaluate(el => el.complete && el.naturalWidth > 0));
  assert.strictEqual(await page.textContent('.bf-eyebrow'), 'AKC Advanced Therapy Dog');
  assert.strictEqual(await page.textContent('.bf-name'), 'Blüe');
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
  await page.context().close();
});

test('phone formats while typing and letters show an error', async () => {
  const page = await openPage();
  const phone = page.locator('#bf-phone');
  await phone.pressSequentially('6155551234');
  assert.strictEqual(await phone.inputValue(), '(615)-555-1234');
  assert.ok(await page.isHidden('#bf-phone-error'));
  await phone.fill('');
  await phone.pressSequentially('615abc');
  assert.ok(await page.isVisible('#bf-phone-error'));
  assert.match(await page.textContent('#bf-phone-error'), /letters/);
  await page.context().close();
});

test('button enables only when valid; invalid email blocks', async () => {
  const page = await openPage();
  const button = page.locator('button[type=submit]');
  assert.ok(await button.isDisabled());
  assert.match(await page.textContent('#bf-missing'), /First Name, Last Name, Phone Number, Phone Type, Privacy agreement/);
  await fillValid(page);
  assert.ok(await button.isEnabled());
  assert.match(await page.textContent('#bf-missing'), /All required fields are complete/);
  await page.fill('#bf-email', 'not-an-email');
  assert.ok(await button.isDisabled());
  assert.ok(await page.isVisible('#bf-email-error'));
  await page.fill('#bf-email', 'name@example.com');
  assert.ok(await button.isEnabled());
  await page.context().close();
});

test('Android notice shows only for Android and confirmation repeats it', async () => {
  const page = await openPage();
  assert.ok(await page.isHidden('#bf-android-note'));
  await fillValid(page, 'Android');
  assert.ok(await page.isVisible('#bf-android-note'));
  await page.selectOption('#bf-phone-type', 'iPhone');
  assert.ok(await page.isHidden('#bf-android-note'));
  await page.selectOption('#bf-phone-type', 'Android');
  await page.click('button[type=submit]');
  assert.match(await page.textContent('#bf-confirmation-detail'), /Apple iMessage/);
  await page.context().close();
});

test('preview confirmation is visible, in view, and focused', async () => {
  const page = await openPage();
  await page.fill('#bf-email', 'name@example.com');
  await fillValid(page);
  await page.click('button[type=submit]');
  const title = page.locator('#bf-confirmation-title');
  assert.ok(await title.isVisible());
  assert.ok(await title.evaluate(el => document.activeElement === el));
  assert.ok(await title.evaluate(el => { const r = el.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight; }));
  assert.match(await page.textContent('.bf-success'), /has not been sent or saved/);
  await page.context().close();
});

test('live mode: one click sends one request with consent and shows success', async () => {
  const page = await openPage('https://example.test/register');
  const bodies = [];
  await page.route('https://example.test/register', async route => {
    bodies.push(JSON.parse(route.request().postData()));
    await new Promise(r => setTimeout(r, 300));
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}', headers: { 'Access-Control-Allow-Origin': '*' } });
  });
  assert.strictEqual(await page.locator('[data-preview-only]').count(), 0);
  await fillValid(page);
  await page.click('button[type=submit]');
  await page.locator('button[type=submit]').dispatchEvent('click');
  await page.locator('#bf-confirmation-title').waitFor();
  assert.strictEqual(bodies.length, 1);
  assert.strictEqual(bodies[0].privacyAgreed, true);
  assert.strictEqual(bodies[0].privacyVersion, '2026-10-29');
  assert.ok(bodies[0].requestId);
  assert.match(await page.textContent('#bf-confirmation-lead'), /received/);
  await page.context().close();
});

test('live mode: server failure keeps values and never shows success', async () => {
  const page = await openPage('https://example.test/register');
  await page.route('https://example.test/register', route =>
    route.fulfill({ status: 500, contentType: 'application/json', body: '{"ok":false}', headers: { 'Access-Control-Allow-Origin': '*' } }));
  await fillValid(page);
  await page.click('button[type=submit]');
  await page.waitForFunction(() => /try again/.test(document.querySelector('#bf-missing').textContent));
  assert.ok(await page.isHidden('.bf-success'));
  assert.strictEqual(await page.inputValue('#bf-phone'), '(615)-555-1234');
  assert.ok(await page.locator('button[type=submit]').isEnabled());
  await page.context().close();
});

test('live mode: already-enrolled number shows the duplicate error', async () => {
  const page = await openPage('https://example.test/register');
  await page.route('https://example.test/register', route =>
    route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":false,"code":"duplicate","message":"This number already enrolled"}', headers: { 'Access-Control-Allow-Origin': '*' } }));
  await fillValid(page);
  await page.click('button[type=submit]');
  await page.waitForFunction(() => document.querySelector('#bf-missing').textContent === 'This number already enrolled');
  assert.strictEqual(await page.textContent('#bf-phone-error'), 'This number already enrolled');
  assert.ok(await page.isHidden('.bf-success'));
  assert.ok(await page.locator('button[type=submit]').isDisabled());
  await page.locator('#bf-phone').fill('');
  await page.locator('#bf-phone').pressSequentially('6155550000');
  assert.ok(await page.isHidden('#bf-phone-error'));
  assert.ok(await page.locator('button[type=submit]').isEnabled());
  await page.context().close();
});
