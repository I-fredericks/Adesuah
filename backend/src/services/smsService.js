const prisma = require('../config/db');

const SMS_API_URL = process.env.SMS_API_URL || 'https://sms.arkesel.com/api/v2/sms/send';
const DEFAULT_SENDER = process.env.SMS_SENDER_ID || 'Adesuah';

const normalizePhone = (phone) => {
  let d = String(phone || '').replace(/\D/g, '');
  if (d.startsWith('0') && d.length === 10) d = '233' + d.slice(1); // Ghana local → international
  return d ? `+${d}` : null;
};

const whatsappLink = (phone, message) => {
  const n = normalizePhone(phone);
  return n ? `https://wa.me/${n.replace('+', '')}?text=${encodeURIComponent(message)}` : null;
};

// Per-school SMS credentials live in School.settings.sms = { sender, apiKey };
// the platform-level env key is the fallback.
const smsCredentials = async (schoolId) => {
  let sender = DEFAULT_SENDER;
  let apiKey = process.env.SMS_API_KEY || '';
  if (schoolId) {
    const school = await prisma.school.findUnique({
      where: { id: schoolId },
      select: { settings: true },
    });
    const sms = school?.settings?.sms;
    if (sms?.apiKey) {
      apiKey = sms.apiKey;
      if (sms.sender) sender = sms.sender;
    }
  }
  return { sender, apiKey };
};

const logMessage = (schoolId, { channel = 'sms', recipient, studentId = null, message, status, response }) =>
  prisma.messageLog
    .create({
      data: {
        schoolId,
        channel,
        recipient: recipient || '',
        studentId,
        message,
        status,
        response: response ? String(response).slice(0, 250) : null,
      },
    })
    .catch((e) => console.error('message log failed:', e.message));

/**
 * Sends an SMS through Arkesel when credentials exist; otherwise the message is
 * logged with status "logged" so the school still has a record. Every attempt —
 * sent, failed or logged — is recorded in the MessageLog.
 */
const sendSms = async (schoolId, phones, message, { studentId = null } = {}) => {
  const list = (Array.isArray(phones) ? phones : [phones]).map(normalizePhone).filter(Boolean);
  const { sender, apiKey } = await smsCredentials(schoolId);

  if (list.length === 0) {
    await logMessage(schoolId, { recipient: '', studentId, message, status: 'logged', response: 'No recipient phone' });
    return { sent: false, status: 'logged', reason: 'no_recipients' };
  }

  if (!apiKey) {
    for (const to of list) {
      await logMessage(schoolId, { recipient: to, studentId, message, status: 'logged', response: 'No SMS API key set — message logged only' });
    }
    console.log(`[sms:logged] ${list.length} message(s) for school ${schoolId}`);
    return { sent: false, status: 'logged', reason: 'not_configured', recipients: list.length };
  }

  let status = 'failed';
  let response = '';
  try {
    const res = await fetch(SMS_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'api-key': apiKey },
      body: JSON.stringify({ sender, message, recipients: list.map((p) => p.replace('+', '')) }),
      signal: AbortSignal.timeout(10000),
    });
    const text = await res.text();
    status = text.includes('"success"') ? 'sent' : 'failed';
    response = text.slice(0, 250);
  } catch (e) {
    response = String(e).slice(0, 250);
  }

  for (const to of list) {
    await logMessage(schoolId, { recipient: to, studentId, message, status, response });
  }
  return { sent: status === 'sent', status, recipients: list.length };
};

module.exports = { normalizePhone, whatsappLink, sendSms, logMessage, smsCredentials };
