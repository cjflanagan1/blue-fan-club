# Blüe's Fan Club registration page

The page people reach by scanning the QR code on Blüe's trading card.

**Live URL (QR code destination):** https://cjflanagan1.github.io/blue-fan-club/

It's a static site hosted on GitHub Pages. It has no build step.

## Current status: preview mode

The form, validation, Android notice, privacy agreement, and confirmation screen all work.
**Registrations are not saved until the backend is connected.** Until then, the page tells visitors this.

## Backend: Google Sheet + Apps Script

[`backend/`](backend/) contains a Google Apps Script that:
- saves each sign-up to a private Google Sheet, with a timestamp and the privacy version accepted
- rejects a phone number that's already in the sheet with **"This number already enrolled"**
- emails the owner **"A new Fan wants to join"** with the fan's details and an attached contact
  card (.vcf). Tap the card to add the fan to iPhone Contacts.

Setup steps are in [`backend/README.md`](backend/README.md). Once the script is deployed, set
`window.BLUE_CONFIG.submitUrl` in `index.html` to its `/exec` URL. This removes the preview notices
automatically. The page URL doesn't change, so the QR code can be printed now.

Who can see what: members see each other only in the iMessage group chat. Email is only for the
owner's contacts. The sheet is private, and the web app can't read data back.

Never commit registration data or credentials to this public repository.

## Files

- `index.html`: page markup and copy, plus the `BLUE_CONFIG` settings
- `styles.css`: styles, with automatic light and dark mode
- `validation.js`: shared phone/email/field rules, used by the browser (and later the server)
- `app.js`: form behavior: phone formatting, status messages, submit, and confirmation
- `backend/Code.gs`: Apps Script backend (save, duplicate check, alert email)
- `assets/blue-square.jpg`: a crop of the owner-supplied `blue.jpeg` with the black bars removed

## Tests

```
npm test                       # validation rules + backend logic (Node 18+)
npm install && npm run test:browser   # real-browser checks using installed Google Chrome
```

## Local preview

Open `index.html` in a browser, or run `python3 -m http.server` in this folder.

## QR code

`qr/` holds the trading-card QR code. It encodes `https://cjflanagan1.github.io/blue-fan-club/`
with error correction level H, so it still scans with the red heart in the center.
- `blue-fan-club-qr-heart.svg` / `.png`: matches the card design. Use the SVG for print.
- `blue-fan-club-qr-plain.svg` / `.png`: a fallback without the heart.

To regenerate and re-run the scan checks: `pip install segno pillow opencv-python-headless`, then `python qr/make_qr.py`.
