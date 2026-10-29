# Blüe's Fan Club registration page

The page people reach by scanning the QR code on Blüe's trading card.

**Live URL (QR code destination):** https://cjflanagan1.github.io/blue-fan-club/

It's a static site hosted on GitHub Pages. It has no build step.

## Current status: preview mode

The form, validation, Android notice, privacy agreement, and confirmation screen all work.
**Registrations are not sent or saved yet.** The page tells visitors this. A storage backend
hasn't been chosen. GitHub Pages only serves static files, so it can't store submissions itself.

## Turning on real submissions

1. Deploy an endpoint that accepts a `POST` with a JSON body (sent as `text/plain` to avoid a CORS
   preflight). The body contains `firstName, lastName, phone, email, phoneType, floor, wing,
   privacyAgreed, privacyVersion, requestId`. The endpoint should respond `{"ok": true}` only after
   a durable save, or `{"ok": false, "message": "..."}` on failure.
2. The endpoint must run its own validation. `validation.js` is dependency-free and can be reused
   on the server: `validateRegistration()` returns the normalized record. Store a server timestamp
   for `privacy_accepted_at` and `created_at`. Use `requestId` to ignore duplicate submissions.
3. In `index.html`, set `window.BLUE_CONFIG.submitUrl` to the endpoint URL.
   This removes the preview notices and the "Back to form" button automatically.

The URL doesn't change when you add a backend, so the QR code can be printed now.

Never commit registration data, credentials, or API secrets to this public repository.

## Files

- `index.html`: page markup and copy, plus the `BLUE_CONFIG` settings
- `styles.css`: styles, with automatic light and dark mode
- `validation.js`: shared phone/email/field rules, used by the browser (and later the server)
- `app.js`: form behavior: phone formatting, status messages, submit, and confirmation
- `assets/blue-square.jpg`: a crop of the owner-supplied `blue.jpeg` with the black bars removed

## Tests

```
npm test                       # validation rules (Node 18+)
npm install && npm run test:browser   # real-browser checks using installed Google Chrome
```

## Local preview

Open `index.html` in a browser, or run `python3 -m http.server` in this folder.
