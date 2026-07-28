# 🌍 Collection Monitor

A self-contained web app for monitoring collections from stations anywhere in the world, ensuring
tax compliance and prompt payment.

**The flow it implements:**

1. A **level-one collector** captures an **income figure** for a period (month).
2. The system calculates the **tax due** using the tax percentage configured for their location.
3. The collector instantly receives a **notification** — via **WhatsApp, SMS or email**
   (whichever channel is configured on their profile) — telling them the amount due and the deadline.
4. The collector **makes the payment** and **uploads proof of payment** (image or PDF) with the
   payment reference.
5. The system runs **automatic checks** (amount matches tax due, proof attached, reference valid
   and unused, paid within deadline) and an **administrator verifies** the proof — approving it as
   a **successful payment** or **rejecting it** with a reason. Either way the collector is notified.
6. Anything unpaid past its deadline is automatically flagged **overdue** and reminder
   notifications go out. Admins see a **global compliance dashboard** across all locations.

## Requirements

- Node.js **22.13+** (uses the built-in `node:sqlite` — **zero npm dependencies**)

## Quick start

```bash
cd collection-monitor
npm run seed    # creates demo locations, users and declarations
npm start       # http://localhost:3000
```

### Demo accounts (created by the seed)

| Role | Email | Password |
|---|---|---|
| Admin | `admin@collectmon.app` | `admin123` |
| Collector (Accra, Ghana) | `accra@collectmon.app` | `collect123` |
| Collector (Lagos, Nigeria) | `lagos@collectmon.app` | `collect123` |
| Collector (Nairobi, Kenya) | `nairobi@collectmon.app` | `collect123` |
| Collector (London, UK) | `london@collectmon.app` | `collect123` |
| Collector (New York, US) | `newyork@collectmon.app` | `collect123` |
| Collector (Mumbai, India) | `mumbai@collectmon.app` | `collect123` |

> ⚠️ Change these before any real deployment.

## Notifications: demo mode vs. live

Out of the box the app runs in **demo mode**: every notification is generated, logged to the
console and stored in the database (visible on the *Notifications* page), but not actually
delivered. To send real messages, set provider credentials as environment variables
(see `.env.example`):

| Channel | Provider | Variables |
|---|---|---|
| Email | SendGrid | `SENDGRID_API_KEY`, `EMAIL_FROM` |
| SMS | Twilio | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_SMS_FROM` |
| WhatsApp | Twilio | `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_FROM` |

Each user has a preferred channel (`email`, `sms` or `whatsapp`) set on their profile.

## Configuration

| Variable | Default | Purpose |
|---|---|---|
| `PORT` | `3000` | HTTP port |
| `DATA_DIR` | `./data` | Where the SQLite DB, uploads and secret key live |
| `SECRET` | auto-generated | Session-token signing secret |
| `PAYMENT_DUE_DAYS` | `7` | Days a collector has to pay after declaring |
| `AUTO_APPROVE` | `false` | If `true`, payments that pass **all** automatic checks are verified instantly with no admin review |

## Architecture

```
collection-monitor/
├── server/
│   ├── index.js    HTTP server, REST API, static file serving, overdue sweeper
│   ├── db.js       SQLite schema (locations, users, declarations, payments, notifications)
│   ├── auth.js     scrypt password hashing + HMAC-signed session tokens
│   ├── notify.js   Notification dispatch (SendGrid / Twilio via REST, demo-mode fallback)
│   └── seed.js     Demo data
├── public/         Single-page web app (vanilla JS, no build step)
└── data/           Created at runtime: SQLite DB + uploaded proofs (git-ignored)
```

No frameworks, no npm packages, no build step — `node server/index.js` is the whole deployment.

## API overview

| Method & path | Who | Purpose |
|---|---|---|
| `POST /api/auth/login` | anyone | Get a session token |
| `POST /api/declarations` | collector | Declare income → tax computed → notification sent |
| `GET /api/declarations` | both | List own (collector) or all (admin) declarations |
| `POST /api/declarations/:id/payment` | owner | Record payment + upload proof (base64) → auto-checks run |
| `GET /api/payments?status=submitted` | admin | Verification queue with auto-check results |
| `GET /api/payments/:id/proof` | owner/admin | View the uploaded proof file |
| `POST /api/payments/:id/verify` | admin | Approve (successful) or reject (with reason) → notification |
| `POST /api/declarations/:id/remind` | admin | Send a manual payment reminder |
| `GET /api/dashboard` | admin | Global + per-location compliance stats |
| `GET/POST/PUT /api/locations` | admin | Manage stations & tax rates |
| `GET/POST /api/users` | admin | Manage users & their notification channels |
| `GET /api/notifications` | both | Notification history |
