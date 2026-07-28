'use strict';

const { db, now } = require('./db');

// Notification dispatch. Every message is recorded in the `notifications` table.
// Real delivery is attempted when provider credentials are configured:
//   Email    -> SendGrid  (SENDGRID_API_KEY, EMAIL_FROM)
//   SMS      -> Twilio    (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_SMS_FROM)
//   WhatsApp -> Twilio    (TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM)
// Without credentials the app runs in demo mode: messages are logged, not sent.

async function sendViaTwilio(to, body, whatsapp) {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const token = process.env.TWILIO_AUTH_TOKEN;
  const from = whatsapp ? process.env.TWILIO_WHATSAPP_FROM : process.env.TWILIO_SMS_FROM;
  if (!sid || !token || !from) return { status: 'logged', detail: 'demo mode (Twilio not configured)' };

  const params = new URLSearchParams({
    From: whatsapp ? `whatsapp:${from}` : from,
    To: whatsapp ? `whatsapp:${to}` : to,
    Body: body,
  });
  const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
    method: 'POST',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'),
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: params.toString(),
  });
  const text = await res.text();
  return res.ok
    ? { status: 'sent', detail: text.slice(0, 500) }
    : { status: 'failed', detail: `HTTP ${res.status}: ${text.slice(0, 500)}` };
}

async function sendViaSendGrid(to, subject, body) {
  const key = process.env.SENDGRID_API_KEY;
  const from = process.env.EMAIL_FROM;
  if (!key || !from) return { status: 'logged', detail: 'demo mode (SendGrid not configured)' };

  const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: to }] }],
      from: { email: from },
      subject,
      content: [{ type: 'text/plain', value: body }],
    }),
  });
  if (res.ok) return { status: 'sent', detail: `HTTP ${res.status}` };
  const text = await res.text();
  return { status: 'failed', detail: `HTTP ${res.status}: ${text.slice(0, 500)}` };
}

async function notifyUser(user, { subject, body, declarationId = null, channel = null }) {
  const useChannel = channel || user.notify_channel || 'email';
  const recipient = useChannel === 'email' ? user.email : (user.phone || '');

  let result;
  if (!recipient) {
    result = { status: 'failed', detail: `user has no ${useChannel === 'email' ? 'email' : 'phone number'}` };
  } else {
    try {
      if (useChannel === 'email') result = await sendViaSendGrid(recipient, subject, body);
      else result = await sendViaTwilio(recipient, `${subject}\n\n${body}`, useChannel === 'whatsapp');
    } catch (err) {
      result = { status: 'failed', detail: String(err.message || err).slice(0, 500) };
    }
  }

  db.prepare(`INSERT INTO notifications (user_id, declaration_id, channel, recipient, subject, body, status, provider_response, created_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(user.id, declarationId, useChannel, recipient || '(none)', subject, body, result.status, result.detail, now());

  console.log(`[notify] ${useChannel} -> ${recipient || '(none)'} [${result.status}] ${subject}`);
  return result;
}

module.exports = { notifyUser };
