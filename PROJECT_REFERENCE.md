# Blüe’s Fan Club: project reference

Everything needed to maintain or update the fan club registration system.
Owner: CJ Flanagan. Spell the dog’s name **Blüe** (with the umlaut).
Last updated: October 29, 2026.

> This file is in a **public** repository. Never add passwords, tokens, registration data, or
> personal contact details here.

---

## 1. Important URLs

| What | URL |
|---|---|
| **Live registration page (QR destination)** | https://cjflanagan1.github.io/blue-fan-club/ |
| GitHub repository | https://github.com/cjflanagan1/blue-fan-club |
| GitHub Pages settings | https://github.com/cjflanagan1/blue-fan-club/settings/pages |
| Apps Script web app (submission endpoint) | https://script.google.com/macros/s/AKfycbwPpFKUxB_pJKrU0oN51TmAZ7UKxrkD1YTIX2oRB_c5DBv_dkb-8B8rR2eHlHGSMFZj/exec |
| Apps Script dashboard | https://script.google.com/home |
| Google Sheet | Search Google Drive (https://drive.google.com) for **Blüe’s Fan Club** |
| Apple iMessage reference (for the Android notice) | https://support.apple.com/en-us/118236 |

---

## 2. How it works

```
Fan scans the QR code on the card
        │
        ▼
Registration page (GitHub Pages, static HTML/JS)
        │  POST, JSON body, Content-Type text/plain
        ▼
Google Apps Script web app ── validates again on the server
        │
        ├── duplicate phone? → "This number already enrolled" (nothing saved, no email)
        │
        ├── saves a row → Google Sheet, "Registrations" tab (private)
        │
        └── emails CJ: subject "A new Fan wants to join" + contact card (.vcf)
                         │
                         ▼
          CJ adds the fan to Contacts and, for iPhone users, to the iMessage group by hand
```

- Members see each other **only in the iMessage group chat**. There is no member directory.
- Email is collected **only for CJ’s contacts**. It is never shown to members.
- Android users can register. The page explains that they can’t join the iMessage group yet.
- The web app has **no `doGet`**, so nobody can read registrations through it. Only CJ can see the sheet.

---

## 3. Accounts and services

| Service | Account | What it holds |
|---|---|---|
| GitHub | `cjflanagan1` | Repository and GitHub Pages hosting (free; the repo must stay public) |
| Google | CJ’s Google account | The sheet, the Apps Script project, and the alert emails |

### Apps Script details

| Item | Value |
|---|---|
| Project name | Blüe’s Fan Club Backend (bound to the sheet: **Extensions → Apps Script**) |
| Script files | `Code.gs` (copy of `backend/Code.gs`), `Validation.gs` (copy of `validation.js`) |
| Deployment type | Web app. Execute as: **Me**. Who has access: **Anyone** |
| Deployment ID | `AKfycbwPpFKUxB_pJKrU0oN51TmAZ7UKxrkD1YTIX2oRB_c5DBv_dkb-8B8rR2eHlHGSMFZj` |
| Deployed version | 1 (October 29, 2026) |
| Script property `NOTIFY_EMAIL` | Optional. Where alerts go; defaults to the script owner’s Google address. Check it under **Project Settings → Script Properties**. |
| Daily email limit | About 100 alert emails a day (consumer Google account) |

### Google Sheet details

- Sheet name: **Blüe’s Fan Club**
- Tab: **Registrations**, created automatically by the first sign-up
- Columns, in order:
  `registration_id, created_at, first_name, last_name, phone_display, phone_digits, email,
  phone_type, floor, wing, privacy_agreed, privacy_version, privacy_accepted_at, request_id`
- Duplicate check: compares `phone_digits` (10 digits) against every existing row.

---

## 4. Files in the repository

Local copy: `~/Desktop/Blue/site`

| File | Purpose |
|---|---|
| `index.html` | Page markup and all visitor-facing copy. `window.BLUE_CONFIG` holds `submitUrl` and `privacyVersion`. |
| `app.js` | Form behavior: phone formatting, status messages, submit, duplicate error, confirmation. |
| `validation.js` | Shared validation rules (names, phone, email, dropdown values, consent). **Also runs in Apps Script.** |
| `styles.css` | Styles, with automatic light and dark mode. |
| `assets/blue-square.jpg` | Photo crop. The original is `~/Desktop/Blue/blue.jpeg`. |
| `backend/Code.gs` | Apps Script source: save, duplicate check, alert email, vCard, `sendTestAlert()`. |
| `backend/README.md` | Step-by-step Google setup from scratch. |
| `qr/` | QR code files and the generator `make_qr.py`. |
| `tests/` | `validation.test.js`, `backend.test.js`, `browser.test.js`. |
| `HANDOFF.md` | The original backend setup handoff (historical). |
| `PROJECT_REFERENCE.md` | This file. |

Other files in `~/Desktop/Blue` (not in the repo):

- `card.png`: original card artwork, with the mock QR code
- `card-with-real-qr-PREVIEW.png`: card with the real QR code
- `blue.jpeg`: original photo
- `Blue_Fan_Club_Development_Handoff.txt`, `blue-fan-page.html`, `Wireframe.jpg`: original requirements and wireframe
- `Codex_Handoff.md`, `Claude_Publish_Handoff.md`: setup handoffs (historical)

---

## 5. QR code

| Item | Value |
|---|---|
| Encodes | `https://cjflanagan1.github.io/blue-fan-club/` (exact; the path is case-sensitive) |
| Error correction | H (30%), version 5, 37×37 modules |
| Print file | `qr/blue-fan-club-qr-heart.svg` (red heart in the center) |
| Other files | `qr/blue-fan-club-qr-heart.png`, `qr/blue-fan-club-qr-plain.svg` / `.png` |
| Regenerate | `pip install segno pillow opencv-python-headless`, then `python qr/make_qr.py`. The script also checks that every version scans. |

The QR code works as long as the URL works. **Never** rename the GitHub account, rename the repo,
make the repo private, or turn off Pages. Any of those breaks every printed card.

---

## 6. How to make common updates

### Change wording, fields, or styling on the page

1. Edit `index.html` / `styles.css` / `app.js` in `~/Desktop/Blue/site`.
2. Run `npm test`.
3. Run `git add -A && git commit -m "..." && git push`.
4. GitHub Pages updates within about a minute. Hard-refresh your phone to see the change.

### Change a validation rule or dropdown choice (for example, add Floor 9 or a new Wing)

The rules live in **two places that must match**:

1. Edit `validation.js` (and the `<select>` options in `index.html`).
2. Run `npm test`, then commit and push. This updates the page.
3. In Apps Script, replace the contents of `Validation.gs` with the new `validation.js`.
4. Redeploy **the existing deployment** (see the next section). Without this step, the server
   rejects the new values.

### Update the backend (`Code.gs`) without breaking the URL

1. Edit `backend/Code.gs`, run `npm test`, then commit and push.
2. Paste the new code into Apps Script `Code.gs` and click **Save**.
3. Go to **Deploy → Manage deployments → pencil (Edit) → Version: New version → Deploy**.
4. **Never** use **Deploy → New deployment**. It creates a new `/exec` URL, and the page stops saving.
   If that happens by accident, put the new URL into `submitUrl` in `index.html` and push.
5. Update the "Deployed version" in this file.

### Change the privacy statement

1. Edit the text in `index.html`.
2. Change `privacyVersion` in `window.BLUE_CONFIG` (for example, to the new date) so the sheet
   records which version each person accepted.
3. Commit and push.

### Change where alert emails go

In Apps Script, go to **Project Settings → Script Properties** and set `NOTIFY_EMAIL`.
No redeploy is needed.

### Let someone re-register, or remove someone

Delete their row in the **Registrations** tab. If they’re in the iMessage group, remove them there too.

### Pause registrations

Set `submitUrl: ''` in `index.html` and push. The page goes back to preview mode, says nothing is
saved, and sends nothing. To show a "registration closed" message instead, edit the page copy.

### Switch to a custom domain (optional)

Only worthwhile **before** printing cards, because the QR code must encode the new domain.

1. Buy the domain, for example from Cloudflare, Namecheap, or Squarespace. Turn on auto-renew.
2. At the registrar, add a `CNAME` record for `www` pointing to `cjflanagan1.github.io`. For the
   bare domain, add `A` records for 185.199.108.153, .109.153, .110.153, and .111.153.
3. In GitHub Pages settings, enter the custom domain and tick **Enforce HTTPS**.
4. Change `URL` in `qr/make_qr.py`, regenerate the QR code, and update this file.

### Run tests

```
cd ~/Desktop/Blue/site
npm test                                  # validation + backend logic (Node 18+)
npm install && npm run test:browser       # real-browser checks (needs Google Chrome)
```

### Preview locally

Open `index.html` in a browser, or run `python3 -m http.server` in the `site` folder.
With `submitUrl` set, a local copy **does** submit real registrations.

---

## 7. Troubleshooting

| Problem | Check |
|---|---|
| Page shows an error after pressing Join | The Apps Script deployment is still active (**Deploy → Manage deployments**), and `submitUrl` matches its `/exec` URL. Also look for errors in **Executions** in Apps Script. |
| Sign-up saved but no email | Spam folder; the `NOTIFY_EMAIL` property; the daily email limit (~100); **Executions** log in Apps Script. Saving always happens before emailing, so a failed email never loses a registration. |
| Everyone gets "This number already enrolled" | Look for a stray row in the sheet with a blank or wrong `phone_digits`. |
| Page changes don’t appear | Wait a minute and hard-refresh. Check the Pages build at https://github.com/cjflanagan1/blue-fan-club/actions. |
| QR code doesn’t open the page | Confirm the live URL loads in a browser, that the repo is public, and that Pages is enabled. |
| Google asks to re-authorize | Open Apps Script, run `sendTestAlert`, and approve. This can happen after editing the code. |

---

## 8. Decisions already made

- **Notification:** email with the subject "A new Fan wants to join" and a .vcf contact card. No SMS or Twilio.
- **Duplicate phone numbers:** rejected with "This number already enrolled". Existing rows are never overwritten.
- **Visibility:** names and phone numbers are visible to members only in the iMessage group chat.
  Email is for CJ only.
- **Privacy statement and checkbox wording:** kept as originally agreed. Version `2026-10-29`.
- **Adding fans to iMessage:** manual, by CJ. No automatic enrollment.
- **Hosting:** GitHub Pages (public repo). **Storage:** a private Google Sheet via Apps Script.
- **QR code:** level H with a center heart, encoding the github.io URL (no custom domain).

## 9. Open items

- Card print size: a QR code of about ¾ inch or larger is recommended. Test-print and scan with
  an iPhone and an Android phone before the full run.
- A real end-to-end test sign-up from an iPhone, including opening the .vcf (pending CJ).
- Not yet decided: a process for removal requests, how long data is kept, and whether anyone
  besides CJ administers the club.
- There is no spam protection beyond validation and duplicate rejection. If junk sign-ups appear,
  add a honeypot field or a rate limit.
- Future Android group-chat support is an intention, not a commitment.
