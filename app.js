(() => {
  const V = window.BlueValidation;
  const config = window.BLUE_CONFIG || {};
  const preview = !config.submitUrl;

  const root = document.getElementById('blue-fan-club');
  const form = root.querySelector('form');
  const success = root.querySelector('.bf-success');
  const submit = form.querySelector('button[type="submit"]');
  const missing = root.querySelector('#bf-missing');
  const phoneType = root.querySelector('#bf-phone-type');
  const androidNote = root.querySelector('#bf-android-note');
  const phone = root.querySelector('#bf-phone');
  const phoneErrorEl = root.querySelector('#bf-phone-error');
  const email = root.querySelector('#bf-email');
  const emailErrorEl = root.querySelector('#bf-email-error');
  const agree = root.querySelector('#bf-agree');
  const SUBMIT_LABEL = submit.textContent;

  let submitting = false;
  let serverError = '';
  let requestId = newRequestId();

  if (!preview) root.querySelectorAll('[data-preview-only]').forEach(el => el.remove());

  function newRequestId() {
    if (window.crypto && crypto.randomUUID) return crypto.randomUUID();
    return Date.now().toString(36) + Math.random().toString(36).slice(2);
  }

  function readForm() {
    return {
      firstName: form.firstName.value,
      lastName: form.lastName.value,
      phone: phone.value,
      email: email.value,
      phoneType: phoneType.value,
      floor: form.floor.value,
      wing: form.wing.value,
      privacyAgreed: agree.checked,
    };
  }

  // Keep the caret after the same number of digits when the phone value is reformatted.
  phone.addEventListener('input', () => {
    const position = phone.selectionStart ?? phone.value.length;
    const digitsBefore = phone.value.slice(0, position).replace(/\D/g, '').length;
    const formatted = V.formatPhone(phone.value);
    if (phone.value === formatted) return;
    phone.value = formatted;
    let cursor = 0, seen = 0;
    while (cursor < formatted.length && seen < digitsBefore) { if (/\d/.test(formatted[cursor])) seen++; cursor++; }
    while (cursor < formatted.length && /\D/.test(formatted[cursor])) cursor++;
    phone.setSelectionRange(cursor, cursor);
  });

  function showFieldError(input, el, message) {
    input.setAttribute('aria-invalid', String(!!message));
    el.hidden = !message;
    el.textContent = message;
  }

  function update() {
    showFieldError(phone, phoneErrorEl, V.phoneError(phone.value.trim()));
    showFieldError(email, emailErrorEl, V.emailError(email.value));
    androidNote.hidden = phoneType.value !== 'Android';

    const { problems } = V.validateRegistration(readForm());
    submit.disabled = submitting || problems.length > 0;

    let message;
    if (submitting) message = 'Submitting your registration…';
    else if (problems.length) message = 'Please complete the following to join: ' + problems.join(', ') + '.';
    else if (serverError) message = serverError;
    else message = 'All required fields are complete. You can join the fan club.';
    missing.classList.toggle('bf-error', !submitting && !problems.length && !!serverError);
    if (missing.textContent !== message) missing.textContent = message;
    return problems;
  }

  function showConfirmation(isAndroid) {
    root.querySelector('#bf-confirmation-lead').textContent = preview
      ? 'You’ve completed Blüe’s Fan Club registration form.'
      : 'We received your registration for Blüe’s Fan Club.';
    root.querySelector('#bf-confirmation-detail').textContent = isAndroid
      ? 'Our current group chat uses Apple iMessage. We hope to expand to Android in the future.'
      : 'We look forward to staying connected with you.';
    form.hidden = true;
    success.hidden = false;
    success.scrollIntoView({ behavior: 'instant', block: 'start' });
    root.querySelector('#bf-confirmation-title').focus({ preventScroll: true });
  }

  async function send(data) {
    const response = await fetch(config.submitUrl, {
      method: 'POST',
      // text/plain avoids a CORS preflight, which some simple backends cannot answer.
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ ...data, requestId, privacyVersion: config.privacyVersion }),
    });
    let body = null;
    try { body = await response.json(); } catch (_) { /* non-JSON response */ }
    if (!response.ok || !body || body.ok !== true) {
      throw new Error((body && body.message) || 'We could not save your registration.');
    }
  }

  form.addEventListener('input', () => { serverError = ''; update(); });
  form.addEventListener('change', update);

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (submitting || update().length) return;
    const data = readForm();
    const isAndroid = data.phoneType === 'Android';
    if (preview) { showConfirmation(isAndroid); return; }

    submitting = true;
    submit.textContent = 'Submitting…';
    update();
    try {
      await send(data);
      showConfirmation(isAndroid);
    } catch (err) {
      serverError = err.message + ' Your information is still filled in. Please try again.';
    } finally {
      submitting = false;
      submit.textContent = SUBMIT_LABEL;
      update();
    }
  });

  const back = success.querySelector('button');
  if (back) back.addEventListener('click', () => {
    success.hidden = true;
    form.hidden = false;
    requestId = newRequestId();
    update();
    root.scrollIntoView({ behavior: 'instant', block: 'start' });
  });

  window.addEventListener('pageshow', () => { phone.value = V.formatPhone(phone.value); update(); });
  update();
})();
