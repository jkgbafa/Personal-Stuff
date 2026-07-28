'use strict';

const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { db, now, UPLOADS_DIR } = require('./db');
const { hashPassword, verifyPassword, issueToken, userFromRequest } = require('./auth');
const { notifyUser } = require('./notify');

const PORT = Number(process.env.PORT || 3000);
const PAYMENT_DUE_DAYS = Number(process.env.PAYMENT_DUE_DAYS || 7);
const AUTO_APPROVE = process.env.AUTO_APPROVE === 'true';
const AMOUNT_TOLERANCE = 0.01;
const MAX_BODY_BYTES = 15 * 1024 * 1024;
const PUBLIC_DIR = path.join(__dirname, '..', 'public');

const round2 = (n) => Math.round(n * 100) / 100;
const money = (amount, currency) => `${currency} ${Number(amount).toFixed(2)}`;

// ---------------------------------------------------------------------------
// Domain helpers
// ---------------------------------------------------------------------------

function declarationWithJoins(id) {
  return db.prepare(`
    SELECT d.*, u.name AS user_name, u.email AS user_email,
           l.name AS location_name, l.country AS location_country
    FROM declarations d
    JOIN users u ON u.id = d.user_id
    JOIN locations l ON l.id = d.location_id
    WHERE d.id = ?`).get(id);
}

function runAutoChecks(declaration, { amount, reference, hasProof }) {
  const checks = [];
  const amountOk = Math.abs(Number(amount) - declaration.tax_due) <= AMOUNT_TOLERANCE;
  checks.push({
    name: 'Amount matches tax due',
    passed: amountOk,
    detail: amountOk
      ? `Paid ${money(amount, declaration.currency)} equals tax due`
      : `Paid ${money(amount, declaration.currency)} but tax due is ${money(declaration.tax_due, declaration.currency)}`,
  });
  checks.push({
    name: 'Proof of payment attached',
    passed: !!hasProof,
    detail: hasProof ? 'Document uploaded' : 'No document uploaded',
  });
  const ref = String(reference || '').trim();
  const refPresent = ref.length >= 4;
  let refUnique = true;
  if (refPresent) {
    const dup = db.prepare(
      `SELECT p.id FROM payments p
       WHERE lower(p.reference) = lower(?) AND p.declaration_id != ? AND p.status != 'rejected'`
    ).get(ref, declaration.id);
    refUnique = !dup;
  }
  checks.push({
    name: 'Payment reference valid and unused',
    passed: refPresent && refUnique,
    detail: !refPresent
      ? 'Reference missing or too short (min 4 characters)'
      : refUnique ? `Reference "${ref}" not used by any other payment`
                  : `Reference "${ref}" already used by another payment`,
  });
  const notLate = declaration.status !== 'overdue';
  checks.push({
    name: 'Paid within due date',
    passed: notLate,
    detail: notLate ? `Submitted before due date (${declaration.due_date.slice(0, 10)})`
                    : `Declaration was overdue (due ${declaration.due_date.slice(0, 10)})`,
  });
  return { checks, passed: checks.every((c) => c.passed) };
}

async function markPaymentVerified(payment, declaration, verifierId) {
  db.prepare(`UPDATE payments SET status = 'verified', verified_by = ?, verified_at = ? WHERE id = ?`)
    .run(verifierId, now(), payment.id);
  db.prepare(`UPDATE declarations SET status = 'paid' WHERE id = ?`).run(declaration.id);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(declaration.user_id);
  await notifyUser(user, {
    declarationId: declaration.id,
    subject: `Payment confirmed — ${declaration.period}`,
    body: `Hello ${user.name},\n\nYour payment of ${money(payment.amount, declaration.currency)} for period ${declaration.period} at ${declaration.location_name} has been verified as SUCCESSFUL. You are fully compliant for this period.\n\nReference: ${payment.reference || '(none)'}\n\nThank you.`,
  });
}

async function markPaymentRejected(payment, declaration, verifierId, reason) {
  db.prepare(`UPDATE payments SET status = 'rejected', verified_by = ?, verified_at = ?, rejection_reason = ? WHERE id = ?`)
    .run(verifierId, now(), reason, payment.id);
  const backTo = new Date(declaration.due_date) < new Date() ? 'overdue' : 'pending_payment';
  db.prepare(`UPDATE declarations SET status = ? WHERE id = ?`).run(backTo, declaration.id);
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(declaration.user_id);
  await notifyUser(user, {
    declarationId: declaration.id,
    subject: `Payment NOT successful — ${declaration.period}`,
    body: `Hello ${user.name},\n\nYour submitted payment of ${money(payment.amount, declaration.currency)} for period ${declaration.period} could NOT be verified.\n\nReason: ${reason}\n\nAmount due: ${money(declaration.tax_due, declaration.currency)}. Please make the payment and upload a valid proof of payment as soon as possible.`,
  });
}

// Mark declarations past their due date as overdue and send a reminder
// (at most one reminder per 24h per declaration).
async function sweepOverdue() {
  const candidates = db.prepare(`
    SELECT d.*, l.name AS location_name FROM declarations d
    JOIN locations l ON l.id = d.location_id
    WHERE d.status IN ('pending_payment','overdue') AND d.due_date < ?`).all(now());
  for (const d of candidates) {
    if (d.status !== 'overdue') {
      db.prepare(`UPDATE declarations SET status = 'overdue' WHERE id = ?`).run(d.id);
    }
    const dayAgo = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    if (!d.last_reminder_at || d.last_reminder_at < dayAgo) {
      db.prepare(`UPDATE declarations SET last_reminder_at = ? WHERE id = ?`).run(now(), d.id);
      const user = db.prepare('SELECT * FROM users WHERE id = ?').get(d.user_id);
      if (user) {
        await notifyUser(user, {
          declarationId: d.id,
          subject: `OVERDUE: tax payment for ${d.period}`,
          body: `Hello ${user.name},\n\nYour tax payment of ${money(d.tax_due, d.currency)} for period ${d.period} at ${d.location_name} was due on ${d.due_date.slice(0, 10)} and is now OVERDUE.\n\nPlease pay immediately and upload your proof of payment to remain compliant.`,
        });
      }
    }
  }
  return candidates.length;
}

// ---------------------------------------------------------------------------
// HTTP plumbing
// ---------------------------------------------------------------------------

function sendJson(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let size = 0;
    const chunks = [];
    req.on('data', (chunk) => {
      size += chunk.length;
      if (size > MAX_BODY_BYTES) {
        reject(Object.assign(new Error('Request body too large (max 15 MB)'), { status: 413 }));
        req.destroy();
        return;
      }
      chunks.push(chunk);
    });
    req.on('end', () => {
      if (!chunks.length) return resolve({});
      try {
        resolve(JSON.parse(Buffer.concat(chunks).toString('utf8')));
      } catch {
        reject(Object.assign(new Error('Invalid JSON body'), { status: 400 }));
      }
    });
    req.on('error', reject);
  });
}

const routes = [];
function route(method, pattern, opts, handler) {
  if (typeof opts === 'function') { handler = opts; opts = {}; }
  const names = [];
  const regex = new RegExp('^' + pattern.replace(/:(\w+)/g, (_, name) => {
    names.push(name);
    return '([^/]+)';
  }) + '$');
  routes.push({ method, regex, names, opts, handler });
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

route('POST', '/api/auth/login', async (req, res, params, body) => {
  const { email, password } = body;
  const user = db.prepare('SELECT * FROM users WHERE lower(email) = lower(?) AND active = 1').get(String(email || '').trim());
  if (!user || !verifyPassword(String(password || ''), user.password_hash)) {
    return sendJson(res, 401, { error: 'Invalid email or password' });
  }
  const { password_hash, ...safe } = user;
  sendJson(res, 200, { token: issueToken(user.id), user: safe });
});

route('GET', '/api/me', { auth: true }, async (req, res, params, body, user) => {
  const { password_hash, ...safe } = user;
  const location = user.location_id
    ? db.prepare('SELECT * FROM locations WHERE id = ?').get(user.location_id) : null;
  sendJson(res, 200, { user: safe, location });
});

// --- Locations ---

route('GET', '/api/locations', { auth: true }, async (req, res, params, body, user) => {
  const rows = db.prepare(`
    SELECT l.*,
      (SELECT COUNT(*) FROM users u WHERE u.location_id = l.id AND u.role = 'collector' AND u.active = 1) AS collectors,
      (SELECT COALESCE(SUM(d.income_amount), 0) FROM declarations d WHERE d.location_id = l.id) AS total_income,
      (SELECT COALESCE(SUM(d.tax_due), 0) FROM declarations d WHERE d.location_id = l.id) AS total_tax_due,
      (SELECT COALESCE(SUM(d.tax_due), 0) FROM declarations d WHERE d.location_id = l.id AND d.status = 'paid') AS total_collected,
      (SELECT COUNT(*) FROM declarations d WHERE d.location_id = l.id AND d.status = 'overdue') AS overdue_count
    FROM locations l ORDER BY l.country, l.name`).all();
  sendJson(res, 200, { locations: rows });
});

route('POST', '/api/locations', { auth: true, role: 'admin' }, async (req, res, params, body) => {
  const { name, country, region = '', currency = 'USD', tax_rate_percent } = body;
  if (!name || !country || tax_rate_percent == null || isNaN(Number(tax_rate_percent))) {
    return sendJson(res, 400, { error: 'name, country and tax_rate_percent are required' });
  }
  const rate = Number(tax_rate_percent);
  if (rate < 0 || rate > 100) return sendJson(res, 400, { error: 'tax_rate_percent must be between 0 and 100' });
  const info = db.prepare(`INSERT INTO locations (name, country, region, currency, tax_rate_percent, created_at)
                           VALUES (?, ?, ?, ?, ?, ?)`)
    .run(String(name).trim(), String(country).trim(), String(region).trim(), String(currency).trim().toUpperCase(), rate, now());
  sendJson(res, 201, { location: db.prepare('SELECT * FROM locations WHERE id = ?').get(Number(info.lastInsertRowid)) });
});

route('PUT', '/api/locations/:id', { auth: true, role: 'admin' }, async (req, res, params, body) => {
  const loc = db.prepare('SELECT * FROM locations WHERE id = ?').get(Number(params.id));
  if (!loc) return sendJson(res, 404, { error: 'Location not found' });
  const name = body.name != null ? String(body.name).trim() : loc.name;
  const country = body.country != null ? String(body.country).trim() : loc.country;
  const region = body.region != null ? String(body.region).trim() : loc.region;
  const currency = body.currency != null ? String(body.currency).trim().toUpperCase() : loc.currency;
  const rate = body.tax_rate_percent != null ? Number(body.tax_rate_percent) : loc.tax_rate_percent;
  const active = body.active != null ? (body.active ? 1 : 0) : loc.active;
  if (isNaN(rate) || rate < 0 || rate > 100) return sendJson(res, 400, { error: 'tax_rate_percent must be between 0 and 100' });
  db.prepare(`UPDATE locations SET name = ?, country = ?, region = ?, currency = ?, tax_rate_percent = ?, active = ? WHERE id = ?`)
    .run(name, country, region, currency, rate, active, loc.id);
  sendJson(res, 200, { location: db.prepare('SELECT * FROM locations WHERE id = ?').get(loc.id) });
});

// --- Users ---

route('GET', '/api/users', { auth: true, role: 'admin' }, async (req, res) => {
  const rows = db.prepare(`
    SELECT u.id, u.name, u.email, u.phone, u.role, u.location_id, u.notify_channel, u.active, u.created_at,
           l.name AS location_name, l.country AS location_country
    FROM users u LEFT JOIN locations l ON l.id = u.location_id
    ORDER BY u.role, u.name`).all();
  sendJson(res, 200, { users: rows });
});

route('POST', '/api/users', { auth: true, role: 'admin' }, async (req, res, params, body) => {
  const { name, email, phone = '', role = 'collector', location_id = null, notify_channel = 'email', password } = body;
  if (!name || !email || !password) return sendJson(res, 400, { error: 'name, email and password are required' });
  if (!['admin', 'collector'].includes(role)) return sendJson(res, 400, { error: 'Invalid role' });
  if (!['email', 'sms', 'whatsapp'].includes(notify_channel)) return sendJson(res, 400, { error: 'Invalid notify_channel' });
  if (role === 'collector' && !location_id) return sendJson(res, 400, { error: 'Collectors must be assigned to a location' });
  const existing = db.prepare('SELECT id FROM users WHERE lower(email) = lower(?)').get(String(email).trim());
  if (existing) return sendJson(res, 409, { error: 'A user with this email already exists' });
  const info = db.prepare(`INSERT INTO users (name, email, phone, role, location_id, password_hash, notify_channel, created_at)
                           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
    .run(String(name).trim(), String(email).trim(), String(phone).trim(), role,
         location_id ? Number(location_id) : null, hashPassword(String(password)), notify_channel, now());
  sendJson(res, 201, { id: Number(info.lastInsertRowid) });
});

// --- Declarations ---

route('GET', '/api/declarations', { auth: true }, async (req, res, params, body, user, url) => {
  await sweepOverdue();
  const filters = [];
  const args = [];
  if (user.role !== 'admin') {
    filters.push('d.user_id = ?');
    args.push(user.id);
  } else {
    const status = url.searchParams.get('status');
    const location = url.searchParams.get('location_id');
    if (status) { filters.push('d.status = ?'); args.push(status); }
    if (location) { filters.push('d.location_id = ?'); args.push(Number(location)); }
  }
  const where = filters.length ? 'WHERE ' + filters.join(' AND ') : '';
  const rows = db.prepare(`
    SELECT d.*, u.name AS user_name, l.name AS location_name, l.country AS location_country,
      (SELECT p.id FROM payments p WHERE p.declaration_id = d.id ORDER BY p.id DESC LIMIT 1) AS last_payment_id,
      (SELECT p.status FROM payments p WHERE p.declaration_id = d.id ORDER BY p.id DESC LIMIT 1) AS last_payment_status,
      (SELECT p.rejection_reason FROM payments p WHERE p.declaration_id = d.id ORDER BY p.id DESC LIMIT 1) AS last_rejection_reason
    FROM declarations d
    JOIN users u ON u.id = d.user_id
    JOIN locations l ON l.id = d.location_id
    ${where} ORDER BY d.created_at DESC`).all(...args);
  sendJson(res, 200, { declarations: rows });
});

route('POST', '/api/declarations', { auth: true }, async (req, res, params, body, user) => {
  if (user.role !== 'collector') return sendJson(res, 403, { error: 'Only collectors declare income' });
  if (!user.location_id) return sendJson(res, 400, { error: 'Your account has no assigned location' });
  const income = Number(body.income_amount);
  const period = String(body.period || '').trim();
  if (!income || income <= 0) return sendJson(res, 400, { error: 'income_amount must be a positive number' });
  if (!/^\d{4}-\d{2}$/.test(period)) return sendJson(res, 400, { error: 'period must be in YYYY-MM format' });
  const dup = db.prepare('SELECT id FROM declarations WHERE user_id = ? AND period = ?').get(user.id, period);
  if (dup) return sendJson(res, 409, { error: `You already have a declaration for ${period}` });

  const loc = db.prepare('SELECT * FROM locations WHERE id = ?').get(user.location_id);
  const taxDue = round2(income * loc.tax_rate_percent / 100);
  const dueDate = new Date(Date.now() + PAYMENT_DUE_DAYS * 24 * 3600 * 1000).toISOString();
  const info = db.prepare(`
    INSERT INTO declarations (user_id, location_id, period, income_amount, tax_rate_percent, tax_due, currency, status, due_date, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'pending_payment', ?, ?)`)
    .run(user.id, loc.id, period, income, loc.tax_rate_percent, taxDue, loc.currency, dueDate, now());
  const declarationId = Number(info.lastInsertRowid);

  await notifyUser(user, {
    declarationId,
    subject: `Tax due: ${money(taxDue, loc.currency)} for ${period}`,
    body: `Hello ${user.name},\n\nYour income declaration for ${period} at ${loc.name}, ${loc.country} has been recorded.\n\nDeclared income: ${money(income, loc.currency)}\nTax rate: ${loc.tax_rate_percent}%\nTAX DUE: ${money(taxDue, loc.currency)}\nPayment deadline: ${dueDate.slice(0, 10)}\n\nPlease make payment before the deadline and upload your proof of payment in the app.`,
  });

  sendJson(res, 201, { declaration: declarationWithJoins(declarationId) });
});

// --- Payments ---

route('POST', '/api/declarations/:id/payment', { auth: true }, async (req, res, params, body, user) => {
  const declaration = declarationWithJoins(Number(params.id));
  if (!declaration) return sendJson(res, 404, { error: 'Declaration not found' });
  if (user.role !== 'admin' && declaration.user_id !== user.id) return sendJson(res, 403, { error: 'Not your declaration' });
  if (declaration.status === 'paid') return sendJson(res, 400, { error: 'This declaration is already paid' });
  if (declaration.status === 'proof_submitted') return sendJson(res, 400, { error: 'A payment is already awaiting verification' });

  const amount = Number(body.amount);
  if (!amount || amount <= 0) return sendJson(res, 400, { error: 'amount must be a positive number' });
  const reference = String(body.reference || '').trim();
  const method = String(body.method || '').trim();

  // Proof arrives as a base64 data URL from the browser.
  let proofFilename = null, proofMime = null, proofOriginal = null;
  if (body.proof_base64) {
    const match = /^data:([\w.+/-]+);base64,(.+)$/s.exec(String(body.proof_base64));
    if (!match) return sendJson(res, 400, { error: 'proof_base64 must be a base64 data URL' });
    proofMime = match[1];
    const allowed = ['image/png', 'image/jpeg', 'image/webp', 'image/gif', 'application/pdf'];
    if (!allowed.includes(proofMime)) {
      return sendJson(res, 400, { error: 'Proof must be an image (PNG/JPEG/WebP/GIF) or a PDF' });
    }
    const buffer = Buffer.from(match[2], 'base64');
    if (buffer.length > 10 * 1024 * 1024) return sendJson(res, 413, { error: 'Proof file too large (max 10 MB)' });
    const ext = proofMime === 'application/pdf' ? 'pdf' : proofMime.split('/')[1];
    proofFilename = `proof-${declaration.id}-${crypto.randomBytes(8).toString('hex')}.${ext}`;
    fs.writeFileSync(path.join(UPLOADS_DIR, proofFilename), buffer);
    proofOriginal = String(body.proof_name || proofFilename).slice(0, 200);
  }

  const { checks, passed } = runAutoChecks(declaration, { amount, reference, hasProof: !!proofFilename });
  const info = db.prepare(`
    INSERT INTO payments (declaration_id, amount, reference, method, proof_filename, proof_original_name, proof_mime,
                          status, auto_checks, auto_check_passed, submitted_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, 'submitted', ?, ?, ?)`)
    .run(declaration.id, amount, reference, method, proofFilename, proofOriginal, proofMime,
         JSON.stringify(checks), passed ? 1 : 0, now());
  const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(Number(info.lastInsertRowid));
  db.prepare(`UPDATE declarations SET status = 'proof_submitted' WHERE id = ?`).run(declaration.id);

  if (AUTO_APPROVE && passed) {
    await markPaymentVerified(payment, declaration, null);
    return sendJson(res, 201, { payment: { ...payment, status: 'verified' }, checks, auto_approved: true });
  }

  const owner = db.prepare('SELECT * FROM users WHERE id = ?').get(declaration.user_id);
  await notifyUser(owner, {
    declarationId: declaration.id,
    subject: `Proof of payment received — ${declaration.period}`,
    body: `Hello ${owner.name},\n\nWe received your payment submission of ${money(amount, declaration.currency)} for period ${declaration.period}.\nAutomatic checks: ${passed ? 'ALL PASSED' : 'SOME FAILED — an officer will review'}.\n\nYou will be notified once verification is complete.`,
  });

  sendJson(res, 201, { payment, checks, auto_approved: false });
});

route('GET', '/api/payments', { auth: true, role: 'admin' }, async (req, res, params, body, user, url) => {
  const status = url.searchParams.get('status') || 'submitted';
  const rows = db.prepare(`
    SELECT p.*, d.period, d.tax_due, d.currency, d.income_amount, d.tax_rate_percent, d.due_date, d.status AS declaration_status,
           u.name AS user_name, u.email AS user_email, l.name AS location_name, l.country AS location_country
    FROM payments p
    JOIN declarations d ON d.id = p.declaration_id
    JOIN users u ON u.id = d.user_id
    JOIN locations l ON l.id = d.location_id
    ${status === 'all' ? '' : 'WHERE p.status = ?'}
    ORDER BY p.submitted_at DESC`).all(...(status === 'all' ? [] : [status]));
  sendJson(res, 200, { payments: rows.map((r) => ({ ...r, auto_checks: JSON.parse(r.auto_checks || '[]') })) });
});

route('GET', '/api/payments/:id/proof', { auth: true }, async (req, res, params, body, user) => {
  const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(Number(params.id));
  if (!payment || !payment.proof_filename) return sendJson(res, 404, { error: 'Proof not found' });
  const declaration = db.prepare('SELECT * FROM declarations WHERE id = ?').get(payment.declaration_id);
  if (user.role !== 'admin' && declaration.user_id !== user.id) return sendJson(res, 403, { error: 'Forbidden' });
  const filePath = path.join(UPLOADS_DIR, path.basename(payment.proof_filename));
  if (!fs.existsSync(filePath)) return sendJson(res, 404, { error: 'File missing on disk' });
  res.writeHead(200, {
    'Content-Type': payment.proof_mime || 'application/octet-stream',
    'Content-Disposition': `inline; filename="${payment.proof_original_name || 'proof'}"`,
  });
  fs.createReadStream(filePath).pipe(res);
});

route('POST', '/api/payments/:id/verify', { auth: true, role: 'admin' }, async (req, res, params, body, user) => {
  const payment = db.prepare('SELECT * FROM payments WHERE id = ?').get(Number(params.id));
  if (!payment) return sendJson(res, 404, { error: 'Payment not found' });
  if (payment.status !== 'submitted') return sendJson(res, 400, { error: `Payment already ${payment.status}` });
  const declaration = declarationWithJoins(payment.declaration_id);
  if (body.approve) {
    await markPaymentVerified(payment, declaration, user.id);
    return sendJson(res, 200, { status: 'verified' });
  }
  const reason = String(body.reason || '').trim();
  if (!reason) return sendJson(res, 400, { error: 'A rejection reason is required' });
  await markPaymentRejected(payment, declaration, user.id, reason);
  sendJson(res, 200, { status: 'rejected' });
});

// --- Reminders / notifications ---

route('POST', '/api/declarations/:id/remind', { auth: true, role: 'admin' }, async (req, res, params) => {
  const d = declarationWithJoins(Number(params.id));
  if (!d) return sendJson(res, 404, { error: 'Declaration not found' });
  if (d.status === 'paid') return sendJson(res, 400, { error: 'Declaration already paid' });
  const user = db.prepare('SELECT * FROM users WHERE id = ?').get(d.user_id);
  const result = await notifyUser(user, {
    declarationId: d.id,
    subject: `Payment reminder — ${money(d.tax_due, d.currency)} due for ${d.period}`,
    body: `Hello ${user.name},\n\nThis is a reminder that your tax payment of ${money(d.tax_due, d.currency)} for period ${d.period} at ${d.location_name} is ${d.status === 'overdue' ? 'OVERDUE' : `due by ${d.due_date.slice(0, 10)}`}.\n\nPlease pay and upload your proof of payment in the app.`,
  });
  db.prepare('UPDATE declarations SET last_reminder_at = ? WHERE id = ?').run(now(), d.id);
  sendJson(res, 200, { result });
});

route('GET', '/api/notifications', { auth: true }, async (req, res, params, body, user, url) => {
  const all = user.role === 'admin' && url.searchParams.get('all') === '1';
  const rows = db.prepare(`
    SELECT n.*, u.name AS user_name FROM notifications n
    JOIN users u ON u.id = n.user_id
    ${all ? '' : 'WHERE n.user_id = ?'}
    ORDER BY n.created_at DESC LIMIT 200`).all(...(all ? [] : [user.id]));
  sendJson(res, 200, { notifications: rows });
});

// --- Dashboard ---

route('GET', '/api/dashboard', { auth: true, role: 'admin' }, async (req, res) => {
  await sweepOverdue();
  const totals = db.prepare(`
    SELECT COUNT(*) AS declarations,
           COALESCE(SUM(income_amount), 0) AS income_declared,
           COALESCE(SUM(tax_due), 0) AS tax_due,
           COALESCE(SUM(CASE WHEN status = 'paid' THEN tax_due ELSE 0 END), 0) AS tax_collected,
           SUM(CASE WHEN status = 'overdue' THEN 1 ELSE 0 END) AS overdue,
           SUM(CASE WHEN status = 'proof_submitted' THEN 1 ELSE 0 END) AS awaiting_verification,
           SUM(CASE WHEN status = 'paid' THEN 1 ELSE 0 END) AS paid
    FROM declarations`).get();
  const byLocation = db.prepare(`
    SELECT l.id, l.name, l.country, l.currency, l.tax_rate_percent,
           COUNT(d.id) AS declarations,
           COALESCE(SUM(d.income_amount), 0) AS income_declared,
           COALESCE(SUM(d.tax_due), 0) AS tax_due,
           COALESCE(SUM(CASE WHEN d.status = 'paid' THEN d.tax_due ELSE 0 END), 0) AS tax_collected,
           SUM(CASE WHEN d.status = 'overdue' THEN 1 ELSE 0 END) AS overdue,
           SUM(CASE WHEN d.status = 'proof_submitted' THEN 1 ELSE 0 END) AS awaiting
    FROM locations l LEFT JOIN declarations d ON d.location_id = l.id
    GROUP BY l.id ORDER BY l.country, l.name`).all();
  const pendingPayments = db.prepare(`SELECT COUNT(*) AS n FROM payments WHERE status = 'submitted'`).get();
  sendJson(res, 200, { totals, byLocation, pending_verifications: pendingPayments.n });
});

// ---------------------------------------------------------------------------
// Static files + server
// ---------------------------------------------------------------------------

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function serveStatic(req, res, pathname) {
  const rel = pathname === '/' ? 'index.html' : pathname.slice(1);
  const filePath = path.join(PUBLIC_DIR, path.normalize(rel));
  if (!filePath.startsWith(PUBLIC_DIR) || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    // SPA fallback
    const index = path.join(PUBLIC_DIR, 'index.html');
    res.writeHead(200, { 'Content-Type': MIME['.html'] });
    return fs.createReadStream(index).pipe(res);
  }
  res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
  fs.createReadStream(filePath).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = url.pathname;
  try {
    if (pathname.startsWith('/api/')) {
      for (const r of routes) {
        if (r.method !== req.method) continue;
        const match = r.regex.exec(pathname);
        if (!match) continue;
        const params = {};
        r.names.forEach((name, i) => { params[name] = decodeURIComponent(match[i + 1]); });
        let user = null;
        if (r.opts.auth) {
          user = userFromRequest(req);
          if (!user) return sendJson(res, 401, { error: 'Not authenticated' });
          if (r.opts.role && user.role !== r.opts.role) return sendJson(res, 403, { error: 'Insufficient permissions' });
        }
        const body = ['POST', 'PUT', 'PATCH'].includes(req.method) ? await readBody(req) : {};
        return await r.handler(req, res, params, body, user, url);
      }
      return sendJson(res, 404, { error: 'Not found' });
    }
    if (req.method === 'GET') return serveStatic(req, res, pathname);
    sendJson(res, 404, { error: 'Not found' });
  } catch (err) {
    console.error(`[error] ${req.method} ${pathname}:`, err);
    sendJson(res, err.status || 500, { error: err.status ? err.message : 'Internal server error' });
  }
});

server.listen(PORT, () => {
  console.log(`Collection Monitor running at http://localhost:${PORT}`);
  console.log(`Notifications: ${process.env.TWILIO_ACCOUNT_SID || process.env.SENDGRID_API_KEY ? 'live providers configured' : 'DEMO MODE (logged to database only)'}`);
  sweepOverdue().catch((e) => console.error('overdue sweep failed:', e));
  setInterval(() => sweepOverdue().catch((e) => console.error('overdue sweep failed:', e)), 60 * 60 * 1000);
});
