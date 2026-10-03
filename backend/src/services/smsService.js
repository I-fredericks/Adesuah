const SMS_API_KEY = process.env.SMS_API_KEY;
const SMS_API_URL = process.env.SMS_API_URL || 'https://sms.arkesel.com/api/v2/sms/send';
const SMS_SENDER_ID = process.env.SMS_SENDER_ID || 'Adesuah';

const normalizePhone = (phone) => {
  if (!phone) return null;
  let p = String(phone).replace(/[\s-()]/g, '');
  if (p.startsWith('0')) p = `233${p.slice(1)}`;
  if (!p.startsWith('+')) p = `+${p}`;
  return p;
};

const sendSms = async (phones, message) => {
  const recipients = (Array.isArray(phones) ? phones : [phones])
    .map(normalizePhone)
    .filter(Boolean);
  if (recipients.length === 0) return { sent: false, reason: 'no_recipients' };

  if (!SMS_API_KEY) {
    console.log(`[sms:not-configured] To ${recipients.length} recipient(s): ${message.slice(0, 80)}`);
    return { sent: false, reason: 'not_configured' };
  }

  try {
    const res = await fetch(SMS_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': SMS_API_KEY,
      },
      body: JSON.stringify({
        sender: SMS_SENDER_ID,
        message,
        recipients: recipients.map((p) => p.replace('+', '')),
      }),
    });
    const body = await res.json().catch(() => ({}));
    return { sent: res.ok, response: body };
  } catch (err) {
    console.error('SMS send failed:', err.message);
    return { sent: false, reason: 'error', error: err.message };
  }
};

module.exports = { sendSms, normalizePhone };
