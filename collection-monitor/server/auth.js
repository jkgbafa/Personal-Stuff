'use strict';

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { db, DATA_DIR } = require('./db');

// Session-signing secret: from env, or generated once and persisted alongside the DB.
function loadSecret() {
  if (process.env.SECRET) return process.env.SECRET;
  const keyFile = path.join(DATA_DIR, 'secret.key');
  if (fs.existsSync(keyFile)) return fs.readFileSync(keyFile, 'utf8').trim();
  const secret = crypto.randomBytes(32).toString('hex');
  fs.writeFileSync(keyFile, secret, { mode: 0o600 });
  return secret;
}
const SECRET = loadSecret();

const TOKEN_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 32).toString('hex');
  return `${salt}$${hash}`;
}

function verifyPassword(password, stored) {
  const [salt, hash] = String(stored).split('$');
  if (!salt || !hash) return false;
  const candidate = crypto.scryptSync(password, salt, 32).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(candidate, 'hex'));
}

function sign(payload) {
  const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const mac = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  return `${body}.${mac}`;
}

function issueToken(userId) {
  return sign({ uid: userId, exp: Date.now() + TOKEN_TTL_MS });
}

function verifyToken(token) {
  const [body, mac] = String(token || '').split('.');
  if (!body || !mac) return null;
  const expected = crypto.createHmac('sha256', SECRET).update(body).digest('base64url');
  if (mac.length !== expected.length ||
      !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(expected))) return null;
  let payload;
  try {
    payload = JSON.parse(Buffer.from(body, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  if (!payload.uid || payload.exp < Date.now()) return null;
  return payload;
}

function userFromRequest(req) {
  const header = req.headers['authorization'] || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  const payload = verifyToken(token);
  if (!payload) return null;
  const user = db.prepare('SELECT * FROM users WHERE id = ? AND active = 1').get(payload.uid);
  return user || null;
}

module.exports = { hashPassword, verifyPassword, issueToken, verifyToken, userFromRequest };
