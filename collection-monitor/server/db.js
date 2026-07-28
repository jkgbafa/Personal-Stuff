'use strict';

const { DatabaseSync } = require('node:sqlite');
const fs = require('node:fs');
const path = require('node:path');

const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, '..', 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const db = new DatabaseSync(path.join(DATA_DIR, 'collection-monitor.db'));

db.exec(`
  PRAGMA journal_mode = WAL;
  PRAGMA foreign_keys = ON;

  CREATE TABLE IF NOT EXISTS locations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    country TEXT NOT NULL,
    region TEXT DEFAULT '',
    currency TEXT NOT NULL DEFAULT 'USD',
    tax_rate_percent REAL NOT NULL DEFAULT 15,
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    phone TEXT DEFAULT '',
    role TEXT NOT NULL DEFAULT 'collector' CHECK (role IN ('admin','collector')),
    location_id INTEGER REFERENCES locations(id),
    password_hash TEXT NOT NULL,
    notify_channel TEXT NOT NULL DEFAULT 'email' CHECK (notify_channel IN ('email','sms','whatsapp')),
    active INTEGER NOT NULL DEFAULT 1,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS declarations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    location_id INTEGER NOT NULL REFERENCES locations(id),
    period TEXT NOT NULL,
    income_amount REAL NOT NULL,
    tax_rate_percent REAL NOT NULL,
    tax_due REAL NOT NULL,
    currency TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pending_payment'
      CHECK (status IN ('pending_payment','overdue','proof_submitted','paid')),
    due_date TEXT NOT NULL,
    last_reminder_at TEXT,
    created_at TEXT NOT NULL,
    UNIQUE (user_id, period)
  );

  CREATE TABLE IF NOT EXISTS payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    declaration_id INTEGER NOT NULL REFERENCES declarations(id),
    amount REAL NOT NULL,
    reference TEXT DEFAULT '',
    method TEXT DEFAULT '',
    proof_filename TEXT,
    proof_original_name TEXT,
    proof_mime TEXT,
    status TEXT NOT NULL DEFAULT 'submitted'
      CHECK (status IN ('submitted','verified','rejected')),
    auto_checks TEXT,
    auto_check_passed INTEGER,
    verified_by INTEGER REFERENCES users(id),
    verified_at TEXT,
    rejection_reason TEXT,
    submitted_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL REFERENCES users(id),
    declaration_id INTEGER REFERENCES declarations(id),
    channel TEXT NOT NULL,
    recipient TEXT NOT NULL,
    subject TEXT NOT NULL,
    body TEXT NOT NULL,
    status TEXT NOT NULL,
    provider_response TEXT,
    created_at TEXT NOT NULL
  );
`);

const now = () => new Date().toISOString();

module.exports = { db, now, DATA_DIR, UPLOADS_DIR };
