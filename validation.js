// Shared validation rules for Blüe's Fan Club registration.
// Plain JavaScript with no dependencies so the same file can run in the browser,
// in Node tests, and (later) on the server that saves registrations.
(function (root) {
  const PHONE_FORMAT = /^\(\d{3}\)-\d{3}-\d{4}$/;
  // WHATWG "valid email address" syntax, additionally requiring a dotted domain.
  const EMAIL_FORMAT = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;
  const PHONE_TYPES = ['iPhone', 'Android'];
  const FLOORS = ['1', '2', '3', '4', '5', '6', '7', '8'];
  const WINGS = ['East', 'West', 'N/A'];
  const NAME_MAX = 80;
  const EMAIL_MAX = 254;

  const MESSAGES = {
    phoneLetters: 'Phone number cannot contain letters. Use (xxx)-xxx-xxxx.',
    phoneFormat: 'Enter a valid 10-digit phone number in this format: (xxx)-xxx-xxxx.',
    email: 'Enter a valid email address, such as name@example.com, or leave Email blank.',
  };

  // Formats digit entry as (xxx)-xxx-xxxx while typing. Anything containing
  // letters, unsupported characters, or more than 10 digits is returned unchanged
  // so validation can flag it instead of silently "fixing" it.
  function formatPhone(value) {
    if (/[^0-9()\-\s.]/.test(value)) return value;
    const digits = value.replace(/\D/g, '');
    if (digits.length > 10) return value;
    if (digits.length === 0) return '';
    if (digits.length < 3) return '(' + digits;
    if (digits.length === 3) return '(' + digits + ')';
    return '(' + digits.slice(0, 3) + ')-' + digits.slice(3, 6) + (digits.length > 6 ? '-' + digits.slice(6) : '');
  }

  function phoneError(value) {
    if (value === '') return '';
    if (PHONE_FORMAT.test(value)) return '';
    return /[a-z]/i.test(value) ? MESSAGES.phoneLetters : MESSAGES.phoneFormat;
  }

  function emailError(value) {
    const v = (value || '').trim();
    if (v === '') return '';
    return v.length <= EMAIL_MAX && EMAIL_FORMAT.test(v) ? '' : MESSAGES.email;
  }

  function str(v) { return typeof v === 'string' ? v : ''; }

  // Validates a raw submission. Returns { problems, record } where problems is a
  // list of human-readable items (by field label) and record is the normalized
  // data when there are no problems.
  function validateRegistration(input) {
    const data = input || {};
    const problems = [];
    const firstName = str(data.firstName).trim();
    const lastName = str(data.lastName).trim();
    const phone = str(data.phone).trim();
    const email = str(data.email).trim();
    const phoneType = str(data.phoneType);
    const floor = str(data.floor);
    const wing = str(data.wing);

    if (!firstName) problems.push('First Name');
    else if (firstName.length > NAME_MAX) problems.push('First Name (too long)');
    if (!lastName) problems.push('Last Name');
    else if (lastName.length > NAME_MAX) problems.push('Last Name (too long)');
    if (!phone) problems.push('Phone Number');
    else if (phoneError(phone)) problems.push('Phone Number (10 digits required)');
    if (emailError(email)) problems.push('Email (correct the address or leave it blank)');
    if (!PHONE_TYPES.includes(phoneType)) problems.push('Phone Type');
    if (floor !== '' && !FLOORS.includes(floor)) problems.push('Floor');
    if (wing !== '' && !WINGS.includes(wing)) problems.push('Wing');
    if (data.privacyAgreed !== true) problems.push('Privacy agreement');

    if (problems.length) return { problems, record: null };
    return {
      problems,
      record: {
        first_name: firstName,
        last_name: lastName,
        phone_display: phone,
        phone_digits: phone.replace(/\D/g, ''),
        email: email || null,
        phone_type: phoneType,
        floor: floor === '' ? null : Number(floor),
        wing: wing === '' ? null : wing,
        privacy_agreed: true,
      },
    };
  }

  const api = { formatPhone, phoneError, emailError, validateRegistration, MESSAGES, PHONE_TYPES, FLOORS, WINGS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.BlueValidation = api;
})(typeof window !== 'undefined' ? window : globalThis);
