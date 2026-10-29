# Backend setup (Google Sheet + Apps Script)

This takes about 10 minutes and uses a free Google account. Do it on a computer.

1. **Create the sheet.** Go to https://sheets.new and name it `Blüe’s Fan Club`.
   Keep it private. Don't share it. The `Registrations` tab is created automatically.
2. **Open the script editor.** In the sheet, click **Extensions → Apps Script**.
3. **Add the code.**
   - Replace everything in `Code.gs` with the contents of [`Code.gs`](Code.gs).
   - Click **+ → Script** and name it `Validation`. Replace its contents with
     [`../validation.js`](../validation.js).
   - Click **Save**.
4. **Choose where alerts go (optional).** Alerts go to your Google account's email by default.
   To use a different address (for example, the one your iPhone Mail shows):
   **Project Settings (gear) → Script Properties → Add property**, with name `NOTIFY_EMAIL`
   and value set to your address.
5. **Test the alert.** In the editor, choose `sendTestAlert` from the function menu and click **Run**.
   Approve the permission prompts. Google will warn that the app is unverified. That's expected
   for your own script: click **Advanced → Go to project**. You should get an email titled
   **A new Fan wants to join** with a contact card attached.
6. **Deploy.** Click **Deploy → New deployment → gear → Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**

   Click **Deploy** and copy the **Web app URL**. It ends in `/exec`.
7. **Connect the page.** Send the URL to Claude. Or edit `index.html` yourself, set
   `submitUrl: 'https://script.google.com/macros/s/…/exec'`, then commit and push.

## Getting the alert to pop up like a text (iPhone)

In the Mail app, add the sender (your own Google address) as a **VIP**.
Then go to **Settings → Notifications → Mail → VIP** and turn on alerts with a sound.

## Notes

- **Who can see what:** the web app only accepts new sign-ups. It has no way to read data back.
  Only you can see the sheet.
- **Duplicates:** a phone number that's already in the sheet gets "This number already enrolled".
  To let someone re-register, delete their row.
- **Updating code:** after you change the code, go to **Deploy → Manage deployments → edit →
  Version: New version**. This keeps the same URL, so the QR code stays valid.
  Creating a *new deployment* instead would change the URL.
