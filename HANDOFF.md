# Blüe’s Fan Club: handoff for finishing setup

Prepared October 29, 2026, for the agent completing the backend connection.
Owner: CJ Flanagan. Spell the dog’s name **Blüe** (with the umlaut).

## Goal

Fans scan a QR code on Blüe’s printed trading card. It opens a registration page. When someone
signs up:

1. Their details are saved to a private Google Sheet.
2. A phone number that is already registered is rejected with the exact message
   **This number already enrolled**.
3. CJ gets an email with the subject **A new Fan wants to join**. It contains the fan’s details and an
   attached contact card (.vcf) so CJ can add them to iPhone Contacts with one tap.

CJ chose email instead of SMS. Do not add Twilio or other SMS services.

## What is already done (do not rebuild)

- **Live page:** https://cjflanagan1.github.io/blue-fan-club/
- **Repository:** https://github.com/cjflanagan1/blue-fan-club (public, GitHub Pages serving `main` from `/`)
- **Local copy:** `~/Desktop/Blue/site`

The page is complete and in **preview mode**. Submitting shows the thank-you screen, but nothing is
sent or saved, and the page says so.

| File | Purpose |
|---|---|
| `index.html` | Page markup and copy. `window.BLUE_CONFIG = { submitUrl: '', privacyVersion: '2026-10-29' }` lives here. |
| `app.js` | Form behavior: phone formatting, status messages, submit, duplicate error, confirmation. Preview mode is on while `submitUrl` is empty. |
| `validation.js` | Shared, dependency-free validation. Runs in the browser, in Node tests, **and in Apps Script**. |
| `styles.css` | Styles, with automatic light and dark mode. |
| `backend/Code.gs` | The Apps Script backend: `doPost`, duplicate check, sheet append, alert email, vCard, and `sendTestAlert()`. Written and unit-tested, **not yet deployed**. |
| `backend/README.md` | Manual setup steps (the click-through version of this handoff). |
| `tests/` | `validation.test.js`, `backend.test.js` (Code.gs run against stubbed Apps Script services), and `browser.test.js` (real Chrome, via playwright-core). |

### Contract between the page and the backend

`app.js` sends a `POST` to `submitUrl`. It uses `Content-Type: text/plain;charset=utf-8`
**on purpose**: Apps Script can’t answer a CORS preflight, so don’t change it to `application/json`.

The body is JSON:

```
firstName, lastName, phone "(615)-555-1234", email, phoneType "iPhone"|"Android",
floor "1".."8"|"", wing "East"|"West"|"N/A"|"", privacyAgreed true, privacyVersion, requestId
```

The backend responds with:

- `{"ok": true}` only after the row is saved.
- `{"ok": false, "code": "duplicate", "message": "This number already enrolled"}` for a phone number
  that is already registered. The page shows this at the phone field and in the status box, and keeps
  the button disabled until the number changes.
- `{"ok": false, "code": "invalid" | "busy", "message": "..."}` for other failures. The page keeps the
  entered values and lets the visitor retry.

A repeated `requestId` returns `ok: true` without saving a second row.

## Remaining work

### 1. Create the Google Sheet and Apps Script project

These steps need **CJ’s Google account**. Any login or OAuth consent screen must be completed by CJ.
Don’t ask for the password, and don’t store credentials in the repo.

Option A, manual (no tooling). Follow `backend/README.md`:

- Create a sheet named `Blüe’s Fan Club`.
- Open **Extensions → Apps Script**.
- Paste `backend/Code.gs` into `Code.gs`.
- Add a script file named `Validation` containing `validation.js`.

Option B, `clasp` (preferred if CJ is at the keyboard for the login):

- CJ enables the Apps Script API at https://script.google.com/home/usersettings.
- Run `npm i -g @google/clasp`, then `clasp login`. This opens a browser, and CJ approves.
- Create a sheet-bound project: `clasp create --type sheets --title "Blüe’s Fan Club"`.
- Push exactly two code files, `backend/Code.gs` and `validation.js`, plus `appsscript.json`.
  Don’t push `app.js` or the tests.
  - Keep `validation.js` as the single source of truth. Don’t fork a copy that can drift. A
    `.claspignore` that allows only those files works, as does a small copy step in a script.
- Manifest (`appsscript.json`):
  ```json
  {
    "timeZone": "America/Chicago",
    "runtimeVersion": "V8",
    "exceptionLogging": "STACKDRIVER",
    "webapp": { "executeAs": "USER_DEPLOYING", "access": "ANYONE_ANONYMOUS" }
  }
  ```
  The time zone is an assumption. Confirm it with CJ. It only affects the time shown in the alert email.
- Never commit `~/.clasprc.json` (it contains OAuth tokens). Keep `.clasp.json` out of the public repo
  too: add it to `.gitignore`.

### 2. Set the alert address and authorize

- Optionally, add the script property `NOTIFY_EMAIL` with the address CJ reads on the iPhone.
  Without it, alerts go to the Google account that owns the script. **Ask CJ which address to use.**
- Run `sendTestAlert` once from the Apps Script editor. This triggers the permission prompt for
  Sheets and Mail.
  - CJ will see "Google hasn’t verified this app". That’s expected for a personal script:
    **Advanced → Go to project**.
- Confirm with CJ that the test email arrived, that its subject is **A new Fan wants to join**, and
  that tapping the .vcf on the iPhone offers to create a contact.

### 3. Deploy the web app

- **Deploy → New deployment → Web app**, with execute as **Me** and access set to **Anyone**.
  With clasp, use `clasp deploy`.
- Record the deployment ID. **For future code changes, update the same deployment**: in the editor,
  use **Manage deployments → Edit → New version**; with clasp, use `clasp deploy -i <deploymentId>`.
  A new deployment creates a new URL and breaks the page.
- Copy the `/exec` URL.
- Check that the endpoint accepts nothing but POST. `Code.gs` intentionally has **no `doGet`**, and
  there must be no way to read registrations through the web app.

### 4. Connect the page

- In `index.html`, set `submitUrl: 'https://script.google.com/macros/s/<id>/exec'`.
  - This automatically removes the preview notice and the "Back to form" button. Elements marked
    `data-preview-only` are deleted when `submitUrl` is set.
- Commit and push to `main`. GitHub Pages redeploys within about a minute.
- The page URL (and so the QR code) **must not change**. Don’t rename the repo or change the Pages settings.

### 5. Verify end to end on the live site

Use a test name and a phone number CJ approves (for example, CJ’s own):

1. Submit on https://cjflanagan1.github.io/blue-fan-club/. The thank-you screen should appear, a row
   should appear in the `Registrations` tab, and the alert email should arrive with a contact card.
2. Submit again with the same number. You should see **This number already enrolled**, with no new
   row and no email.
3. Submit with Phone Type = Android. The confirmation should mention Apple iMessage, and the email
   should flag Android.
4. Check the sheet:
   - `phone_digits` should keep its digits as text.
   - Floor, Wing, and Email left blank should stay blank.
   - `privacy_agreed`, `privacy_version`, and `privacy_accepted_at` should be filled in.
5. Delete the test rows afterward.
6. Ideally, test on a real iPhone (Safari) and a real Android phone (Chrome).

Then run the automated tests and confirm they still pass:

```
npm test                                   # validation + backend logic
npm install && npm run test:browser        # needs Google Chrome installed
```

### 6. Optional: generate the real QR code

Only do this once steps 1–5 pass, and only if CJ asks.

- Encode exactly `https://cjflanagan1.github.io/blue-fan-club/`.
- Use **error correction level H**. The card design puts a heart over the center of the code.
- Deliver vector (SVG) plus a high-resolution PNG (at least 1200 px) with a quiet zone of 4 modules.
- Test-scan it with both an iPhone and an Android phone, including with the heart overlay, before
  CJ sends the card to the printer.
- `card.png` in `~/Desktop/Blue` is a mockup with a fake QR code. Updating the card artwork is CJ’s call.

## Decisions already made (don’t revisit)

- **Notification:** email with the subject "A new Fan wants to join" and a .vcf attachment. No SMS.
- **Duplicates:** reject with "This number already enrolled". Never overwrite an existing row.
- **Visibility:** members see each other only in the iMessage group chat. Email is only for CJ’s
  contacts and is never shown to members. There is no member directory.
- **Privacy statement and checkbox wording:** keep the current text exactly. CJ declined to change it.
- **Copy, field order, dropdown choices, and the Android notice:** as built. Don’t change them without CJ.
- **Hosting:** GitHub Pages, public repo. No registration data, credentials, or tokens may ever be
  committed.

## Known limits and open items (report, don’t silently solve)

- **No spam or abuse protection** beyond validation, duplicate rejection, and Apps Script quotas.
  If junk sign-ups become a problem, propose a honeypot field or a simple rate limit.
- **Email quota:** consumer Google accounts can send about 100 emails a day from Apps Script.
  That’s fine for this club.
- **Not decided yet:** how removal requests are handled, how long data is kept, and who besides CJ
  administers the club. Leave as open questions for CJ.
- **iMessage group:** adding fans is still manual. CJ uses the alert email to add iPhone fans.
  There is no automatic enrollment, and none should be built.

## Done when

- The live page saves to the sheet, rejects duplicates with the exact message, and emails CJ the
  alert with a working contact card.
- The preview notices are gone.
- All tests pass.
- CJ has confirmed the email arrives on their iPhone.
