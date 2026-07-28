'use strict';

// Seeds the database with demo locations, users and declarations.
// Safe to run once; refuses to run against a non-empty database.

const { db, now } = require('./db');
const { hashPassword } = require('./auth');

const existing = db.prepare('SELECT COUNT(*) AS n FROM users').get();
if (existing.n > 0) {
  console.log('Database already has users — seed skipped. Delete the data/ directory to start fresh.');
  process.exit(0);
}

const round2 = (n) => Math.round(n * 100) / 100;

const insertLocation = db.prepare(`INSERT INTO locations (name, country, region, currency, tax_rate_percent, created_at)
                                   VALUES (?, ?, ?, ?, ?, ?)`);
const insertUser = db.prepare(`INSERT INTO users (name, email, phone, role, location_id, password_hash, notify_channel, created_at)
                               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);
const insertDeclaration = db.prepare(`
  INSERT INTO declarations (user_id, location_id, period, income_amount, tax_rate_percent, tax_due, currency, status, due_date, created_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`);

const locations = [
  ['Accra Central Station', 'Ghana', 'Greater Accra', 'GHS', 15],
  ['Lagos Island Station', 'Nigeria', 'Lagos State', 'NGN', 12.5],
  ['Nairobi CBD Station', 'Kenya', 'Nairobi County', 'KES', 16],
  ['London City Station', 'United Kingdom', 'Greater London', 'GBP', 20],
  ['New York Downtown Station', 'United States', 'New York', 'USD', 18],
  ['Mumbai South Station', 'India', 'Maharashtra', 'INR', 18],
];

const locationIds = locations.map((l) => Number(insertLocation.run(...l, now()).lastInsertRowid));

insertUser.run('System Administrator', 'admin@collectmon.app', '+15550100001', 'admin', null,
  hashPassword('admin123'), 'email', now());

const collectors = [
  ['Kwame Mensah', 'accra@collectmon.app', '+233550100001', locationIds[0], 'whatsapp'],
  ['Adaeze Okafor', 'lagos@collectmon.app', '+234800100001', locationIds[1], 'sms'],
  ['Wanjiru Kamau', 'nairobi@collectmon.app', '+254700100001', locationIds[2], 'whatsapp'],
  ['Oliver Hughes', 'london@collectmon.app', '+447700100001', locationIds[3], 'email'],
  ['Maria Santos', 'newyork@collectmon.app', '+12125550001', locationIds[4], 'email'],
  ['Priya Sharma', 'mumbai@collectmon.app', '+919800100001', locationIds[5], 'sms'],
];

const collectorIds = collectors.map(([name, email, phone, locId, channel]) =>
  Number(insertUser.run(name, email, phone, 'collector', locId, hashPassword('collect123'), channel, now()).lastInsertRowid));

// Demo declarations in a mix of states so the dashboard has something to show.
const lastMonth = (() => {
  const d = new Date();
  d.setMonth(d.getMonth() - 1);
  return d.toISOString().slice(0, 7);
})();
const daysFromNow = (days) => new Date(Date.now() + days * 24 * 3600 * 1000).toISOString();

function declare(collectorIdx, period, income, status, dueInDays) {
  const [, , , locId] = collectors[collectorIdx];
  const loc = db.prepare('SELECT * FROM locations WHERE id = ?').get(locId);
  const taxDue = round2(income * loc.tax_rate_percent / 100);
  return Number(insertDeclaration.run(collectorIds[collectorIdx], locId, period, income,
    loc.tax_rate_percent, taxDue, loc.currency, status, daysFromNow(dueInDays), now()).lastInsertRowid);
}

// Paid last month
const paid1 = declare(0, lastMonth, 48000, 'paid', -20);
const paid2 = declare(3, lastMonth, 125000, 'paid', -22);
db.prepare(`INSERT INTO payments (declaration_id, amount, reference, method, status, auto_checks, auto_check_passed, verified_by, verified_at, submitted_at)
            VALUES (?, ?, ?, 'bank_transfer', 'verified', '[]', 1, 1, ?, ?)`)
  .run(paid1, round2(48000 * 0.15), 'GH-TX-889201', now(), now());
db.prepare(`INSERT INTO payments (declaration_id, amount, reference, method, status, auto_checks, auto_check_passed, verified_by, verified_at, submitted_at)
            VALUES (?, ?, ?, 'bank_transfer', 'verified', '[]', 1, 1, ?, ?)`)
  .run(paid2, round2(125000 * 0.20), 'UK-TX-142201', now(), now());

// Pending and overdue
declare(1, lastMonth, 3200000, 'overdue', -5);
declare(4, lastMonth, 96000, 'pending_payment', 4);
declare(5, lastMonth, 850000, 'pending_payment', 6);

console.log('Seed complete.');
console.log('');
console.log('  Admin login:      admin@collectmon.app / admin123');
console.log('  Collector logins: accra@collectmon.app, lagos@collectmon.app, nairobi@collectmon.app,');
console.log('                    london@collectmon.app, newyork@collectmon.app, mumbai@collectmon.app');
console.log('                    (password for all collectors: collect123)');
