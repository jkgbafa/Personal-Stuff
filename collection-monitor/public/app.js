'use strict';

// ---------------------------------------------------------------------------
// State & helpers
// ---------------------------------------------------------------------------

const state = {
  token: localStorage.getItem('cm_token') || null,
  user: JSON.parse(localStorage.getItem('cm_user') || 'null'),
  view: 'declarations',
};

const root = document.getElementById('root');

function h(html) {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  return template.content;
}

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function fmtMoney(amount, currency) {
  try {
    return new Intl.NumberFormat(undefined, { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount);
  } catch {
    return `${currency} ${Number(amount).toFixed(2)}`;
  }
}

function fmtDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

const STATUS_LABELS = {
  pending_payment: 'Pending payment',
  overdue: 'Overdue',
  proof_submitted: 'Awaiting verification',
  paid: 'Paid',
  submitted: 'Submitted',
  verified: 'Verified',
  rejected: 'Rejected',
  sent: 'Sent',
  logged: 'Logged (demo)',
  failed: 'Failed',
};

function badge(status) {
  return `<span class="badge ${esc(status)}">${esc(STATUS_LABELS[status] || status)}</span>`;
}

function toast(message, type = 'info') {
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  document.getElementById('toast-container').appendChild(el);
  setTimeout(() => el.remove(), 4500);
}

async function api(path, options = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (state.token) headers['Authorization'] = `Bearer ${state.token}`;
  const res = await fetch(path, {
    method: options.method || 'GET',
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && state.token) {
    logout();
    throw new Error('Session expired — please log in again');
  }
  if (!res.ok) throw new Error(data.error || `Request failed (${res.status})`);
  return data;
}

function logout() {
  state.token = null;
  state.user = null;
  localStorage.removeItem('cm_token');
  localStorage.removeItem('cm_user');
  render();
}

function openModal(innerHtml) {
  closeModal();
  const overlay = document.createElement('div');
  overlay.className = 'modal-overlay';
  overlay.id = 'modal';
  overlay.appendChild(h(`<div class="modal">${innerHtml}</div>`));
  overlay.addEventListener('click', (e) => { if (e.target === overlay) closeModal(); });
  document.body.appendChild(overlay);
  return overlay;
}

function closeModal() {
  document.getElementById('modal')?.remove();
}

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

function renderLogin() {
  root.innerHTML = '';
  root.appendChild(h(`
    <div class="login-wrap">
      <div class="login-card">
        <h1>🌍 Collection Monitor</h1>
        <div class="sub">Global income declaration, tax &amp; payment compliance</div>
        <form id="login-form">
          <div class="field"><label>Email</label><input type="email" name="email" required autocomplete="username"></div>
          <div class="field"><label>Password</label><input type="password" name="password" required autocomplete="current-password"></div>
          <div class="form-error" id="login-error"></div>
          <button class="btn block" type="submit">Sign in</button>
        </form>
        <div class="login-hint">
          <strong>Demo accounts</strong> (after running <code>npm run seed</code>):<br>
          Admin — admin@collectmon.app / admin123<br>
          Collector — accra@collectmon.app / collect123
        </div>
      </div>
    </div>`));

  document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      const data = await api('/api/auth/login', { method: 'POST', body: { email: fd.get('email'), password: fd.get('password') } });
      state.token = data.token;
      state.user = data.user;
      localStorage.setItem('cm_token', data.token);
      localStorage.setItem('cm_user', JSON.stringify(data.user));
      state.view = data.user.role === 'admin' ? 'dashboard' : 'declarations';
      render();
    } catch (err) {
      document.getElementById('login-error').textContent = err.message;
    }
  });
}

// ---------------------------------------------------------------------------
// Shell
// ---------------------------------------------------------------------------

const NAV = [
  { id: 'dashboard', label: 'Dashboard', icon: '📊', role: 'admin' },
  { id: 'declarations', label: 'Declarations', icon: '🧾' },
  { id: 'verifications', label: 'Verifications', icon: '✅', role: 'admin' },
  { id: 'locations', label: 'Locations', icon: '📍', role: 'admin' },
  { id: 'users', label: 'Users', icon: '👥', role: 'admin' },
  { id: 'notifications', label: 'Notifications', icon: '🔔' },
];

async function render() {
  if (!state.token || !state.user) return renderLogin();
  const isAdmin = state.user.role === 'admin';

  let pendingCount = 0;
  if (isAdmin) {
    try {
      const d = await api('/api/payments?status=submitted');
      pendingCount = d.payments.length;
    } catch { /* non-fatal */ }
  }

  root.innerHTML = '';
  root.appendChild(h(`
    <div class="shell">
      <nav class="sidebar">
        <div class="brand">🌍 Collection Monitor</div>
        ${NAV.filter((n) => !n.role || n.role === state.user.role).map((n) => `
          <button class="nav-item ${state.view === n.id ? 'active' : ''}" data-view="${n.id}">
            <span>${n.icon}</span> ${n.label}
            ${n.id === 'verifications' && pendingCount ? `<span class="nav-badge">${pendingCount}</span>` : ''}
          </button>`).join('')}
        <div class="sidebar-footer">
          <div class="who">${esc(state.user.name)}</div>
          <div>${isAdmin ? 'Administrator' : 'Collector'}</div>
          <button id="logout-btn">Sign out</button>
        </div>
      </nav>
      <main class="main" id="main"></main>
    </div>`));

  root.querySelectorAll('.nav-item').forEach((btn) =>
    btn.addEventListener('click', () => { state.view = btn.dataset.view; render(); }));
  document.getElementById('logout-btn').addEventListener('click', logout);

  const main = document.getElementById('main');
  try {
    if (state.view === 'dashboard') await renderDashboard(main);
    else if (state.view === 'declarations') await renderDeclarations(main);
    else if (state.view === 'verifications') await renderVerifications(main);
    else if (state.view === 'locations') await renderLocations(main);
    else if (state.view === 'users') await renderUsers(main);
    else if (state.view === 'notifications') await renderNotifications(main);
  } catch (err) {
    main.innerHTML = `<div class="panel"><span style="color:var(--red)">${esc(err.message)}</span></div>`;
  }
}

// ---------------------------------------------------------------------------
// Admin dashboard
// ---------------------------------------------------------------------------

async function renderDashboard(main) {
  const { totals, byLocation, pending_verifications } = await api('/api/dashboard');
  const complianceRate = totals.declarations ? Math.round((totals.paid / totals.declarations) * 100) : 0;

  main.appendChild(h(`
    <h1 class="page-title">Global overview</h1>
    <div class="page-sub">Collections, tax due and compliance across all locations</div>
    <div class="stat-grid">
      <div class="stat-card"><div class="label">Declarations</div><div class="value">${totals.declarations}</div></div>
      <div class="stat-card"><div class="label">Compliance rate</div><div class="value ${complianceRate >= 80 ? 'green' : complianceRate >= 50 ? 'amber' : 'red'}">${complianceRate}%</div></div>
      <div class="stat-card"><div class="label">Awaiting verification</div><div class="value blue">${pending_verifications}</div></div>
      <div class="stat-card"><div class="label">Overdue</div><div class="value ${totals.overdue ? 'red' : 'green'}">${totals.overdue || 0}</div></div>
      <div class="stat-card"><div class="label">Paid declarations</div><div class="value green">${totals.paid || 0}</div></div>
    </div>
    <div class="panel">
      <h2>By location</h2>
      <div style="overflow-x:auto"><table>
        <thead><tr>
          <th>Location</th><th>Country</th><th class="num">Rate</th><th class="num">Declared income</th>
          <th class="num">Tax due</th><th class="num">Collected</th><th class="num">Overdue</th><th class="num">Awaiting</th>
        </tr></thead>
        <tbody>
          ${byLocation.map((l) => `<tr>
            <td><strong>${esc(l.name)}</strong></td>
            <td>${esc(l.country)}</td>
            <td class="num">${l.tax_rate_percent}%</td>
            <td class="num">${fmtMoney(l.income_declared, l.currency)}</td>
            <td class="num">${fmtMoney(l.tax_due, l.currency)}</td>
            <td class="num" style="color:var(--green)">${fmtMoney(l.tax_collected, l.currency)}</td>
            <td class="num" style="color:${l.overdue ? 'var(--red)' : 'inherit'}">${l.overdue || 0}</td>
            <td class="num">${l.awaiting || 0}</td>
          </tr>`).join('') || '<tr><td colspan="8" class="empty">No locations yet</td></tr>'}
        </tbody>
      </table></div>
    </div>`));
}

// ---------------------------------------------------------------------------
// Declarations (both roles)
// ---------------------------------------------------------------------------

async function renderDeclarations(main) {
  const isAdmin = state.user.role === 'admin';
  const { declarations } = await api('/api/declarations');

  main.appendChild(h(`
    <div class="panel-head">
      <div>
        <h1 class="page-title">${isAdmin ? 'All declarations' : 'My declarations'}</h1>
        <div class="page-sub">${isAdmin ? 'Income declared and tax status across every location' : 'Declare your income, see your tax due, pay and upload proof'}</div>
      </div>
      ${!isAdmin ? '<button class="btn" id="declare-btn">＋ Declare income</button>' : ''}
    </div>
    <div class="panel">
      <div style="overflow-x:auto"><table>
        <thead><tr>
          ${isAdmin ? '<th>Collector</th><th>Location</th>' : ''}
          <th>Period</th><th class="num">Income</th><th class="num">Rate</th><th class="num">Tax due</th>
          <th>Due date</th><th>Status</th><th></th>
        </tr></thead>
        <tbody id="decl-rows"></tbody>
      </table></div>
    </div>`));

  const tbody = document.getElementById('decl-rows');
  if (!declarations.length) {
    tbody.innerHTML = `<tr><td colspan="9" class="empty">No declarations yet${isAdmin ? '' : ' — click “Declare income” to get started'}</td></tr>`;
  }
  for (const d of declarations) {
    const canPay = !isAdmin && ['pending_payment', 'overdue'].includes(d.status);
    const rejected = d.last_payment_status === 'rejected' && d.status !== 'paid';
    const row = h(`<tr>
      ${isAdmin ? `<td>${esc(d.user_name)}</td><td>${esc(d.location_name)}, ${esc(d.location_country)}</td>` : ''}
      <td><strong>${esc(d.period)}</strong></td>
      <td class="num">${fmtMoney(d.income_amount, d.currency)}</td>
      <td class="num">${d.tax_rate_percent}%</td>
      <td class="num"><strong>${fmtMoney(d.tax_due, d.currency)}</strong></td>
      <td>${fmtDate(d.due_date)}</td>
      <td>${badge(d.status)}${rejected ? `<div style="font-size:12px;color:var(--red);margin-top:4px">Last proof rejected: ${esc(d.last_rejection_reason || '')}</div>` : ''}</td>
      <td style="white-space:nowrap">
        ${canPay ? `<button class="btn small" data-pay="${d.id}">Pay &amp; upload proof</button>` : ''}
        ${isAdmin && d.status !== 'paid' ? `<button class="btn small secondary" data-remind="${d.id}">Send reminder</button>` : ''}
      </td>
    </tr>`);
    row.querySelector('[data-pay]')?.addEventListener('click', () => openPaymentModal(d));
    row.querySelector('[data-remind]')?.addEventListener('click', async (e) => {
      e.target.disabled = true;
      try {
        await api(`/api/declarations/${d.id}/remind`, { method: 'POST' });
        toast(`Reminder sent to ${d.user_name}`, 'success');
      } catch (err) { toast(err.message, 'error'); }
      e.target.disabled = false;
    });
    tbody.appendChild(row);
  }

  document.getElementById('declare-btn')?.addEventListener('click', openDeclareModal);
}

async function openDeclareModal() {
  const { location } = await api('/api/me');
  if (!location) return toast('Your account has no assigned location — contact your administrator', 'error');
  const currentPeriod = new Date().toISOString().slice(0, 7);

  openModal(`
    <h2>Declare income — ${esc(location.name)}</h2>
    <form id="declare-form">
      <div class="field"><label>Period (month)</label><input type="month" name="period" value="${currentPeriod}" required></div>
      <div class="field"><label>Income figure (${esc(location.currency)})</label>
        <input type="number" name="income" min="0.01" step="0.01" required placeholder="e.g. 50000"></div>
      <div class="calc-preview" id="calc-preview">
        Tax rate at this location: <strong>${location.tax_rate_percent}%</strong><br>
        Tax due: <span class="big" id="tax-preview">${fmtMoney(0, location.currency)}</span>
      </div>
      <div class="form-error" id="declare-error"></div>
      <div class="modal-actions">
        <button type="button" class="btn secondary" id="cancel-declare">Cancel</button>
        <button type="submit" class="btn">Submit declaration</button>
      </div>
    </form>`);

  const incomeInput = document.querySelector('#declare-form [name=income]');
  incomeInput.addEventListener('input', () => {
    const income = Number(incomeInput.value) || 0;
    document.getElementById('tax-preview').textContent =
      fmtMoney(Math.round(income * location.tax_rate_percent) / 100, location.currency);
  });
  document.getElementById('cancel-declare').addEventListener('click', closeModal);
  document.getElementById('declare-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    try {
      const data = await api('/api/declarations', {
        method: 'POST',
        body: { period: fd.get('period'), income_amount: Number(fd.get('income')) },
      });
      closeModal();
      toast(`Declared. Tax due: ${fmtMoney(data.declaration.tax_due, data.declaration.currency)} — notification sent via your preferred channel.`, 'success');
      render();
    } catch (err) {
      document.getElementById('declare-error').textContent = err.message;
    }
  });
}

function openPaymentModal(declaration) {
  openModal(`
    <h2>Pay &amp; upload proof — ${esc(declaration.period)}</h2>
    <div class="calc-preview">
      Amount due: <span class="big">${fmtMoney(declaration.tax_due, declaration.currency)}</span><br>
      <span style="color:var(--muted);font-size:13px">Due ${fmtDate(declaration.due_date)} · ${esc(declaration.location_name)}</span>
    </div>
    <form id="pay-form">
      <div class="form-row">
        <div class="field"><label>Amount paid (${esc(declaration.currency)})</label>
          <input type="number" name="amount" min="0.01" step="0.01" value="${declaration.tax_due}" required></div>
        <div class="field"><label>Payment method</label>
          <select name="method">
            <option value="bank_transfer">Bank transfer</option>
            <option value="mobile_money">Mobile money</option>
            <option value="card">Card</option>
            <option value="cash_deposit">Cash deposit</option>
          </select></div>
      </div>
      <div class="field"><label>Payment reference / transaction ID</label>
        <input type="text" name="reference" required minlength="4" placeholder="e.g. TX-2026-000123"></div>
      <div class="field"><label>Proof of payment (image or PDF, max 10 MB)</label>
        <input type="file" name="proof" accept="image/png,image/jpeg,image/webp,image/gif,application/pdf" required></div>
      <div class="form-error" id="pay-error"></div>
      <div class="modal-actions">
        <button type="button" class="btn secondary" id="cancel-pay">Cancel</button>
        <button type="submit" class="btn green">Submit payment</button>
      </div>
    </form>`);

  document.getElementById('cancel-pay').addEventListener('click', closeModal);
  document.getElementById('pay-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const form = e.target;
    const file = form.proof.files[0];
    if (!file) return;
    const submitBtn = form.querySelector('[type=submit]');
    submitBtn.disabled = true;
    try {
      const proofBase64 = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('Could not read file'));
        reader.readAsDataURL(file);
      });
      const data = await api(`/api/declarations/${declaration.id}/payment`, {
        method: 'POST',
        body: {
          amount: Number(form.amount.value),
          reference: form.reference.value,
          method: form.method.value,
          proof_base64: proofBase64,
          proof_name: file.name,
        },
      });
      closeModal();
      const failed = data.checks.filter((c) => !c.passed);
      if (data.auto_approved) toast('Payment verified automatically — you are compliant for this period ✅', 'success');
      else if (failed.length) toast(`Proof submitted, but ${failed.length} automatic check(s) flagged issues — an officer will review.`, 'error');
      else toast('Proof submitted — all automatic checks passed. Awaiting verification.', 'success');
      render();
    } catch (err) {
      document.getElementById('pay-error').textContent = err.message;
      submitBtn.disabled = false;
    }
  });
}

// ---------------------------------------------------------------------------
// Verifications (admin)
// ---------------------------------------------------------------------------

async function renderVerifications(main) {
  const { payments } = await api('/api/payments?status=submitted');

  main.appendChild(h(`
    <h1 class="page-title">Payment verification queue</h1>
    <div class="page-sub">Review uploaded proofs of payment and confirm whether each payment is successful</div>
    <div id="verify-list"></div>`));

  const list = document.getElementById('verify-list');
  if (!payments.length) {
    list.appendChild(h('<div class="panel empty" style="padding:40px;text-align:center">🎉 Nothing to verify — the queue is empty</div>'));
    return;
  }

  for (const p of payments) {
    const card = h(`<div class="verify-card">
      <div class="head">
        <div>
          <strong>${esc(p.user_name)}</strong> · ${esc(p.location_name)}, ${esc(p.location_country)}
          <div class="meta">Period ${esc(p.period)} · submitted ${fmtDate(p.submitted_at)} · ${badge(p.auto_check_passed ? 'verified' : 'failed').replace('Verified', 'Auto-checks passed').replace('Failed', 'Auto-checks flagged')}</div>
        </div>
        <div style="display:flex;gap:8px">
          <button class="btn green small" data-approve>Approve — payment successful</button>
          <button class="btn red small" data-reject>Reject</button>
        </div>
      </div>
      <div class="verify-grid">
        <div class="cell"><div class="k">Income declared</div><div class="v">${fmtMoney(p.income_amount, p.currency)}</div></div>
        <div class="cell"><div class="k">Tax due (${p.tax_rate_percent}%)</div><div class="v">${fmtMoney(p.tax_due, p.currency)}</div></div>
        <div class="cell"><div class="k">Amount paid</div><div class="v">${fmtMoney(p.amount, p.currency)}</div></div>
        <div class="cell"><div class="k">Reference</div><div class="v">${esc(p.reference || '—')}</div></div>
        <div class="cell"><div class="k">Method</div><div class="v">${esc((p.method || '—').replace('_', ' '))}</div></div>
      </div>
      <ul class="check-list">
        ${p.auto_checks.map((c) => `<li><span class="${c.passed ? 'ok' : 'fail'}">${c.passed ? '✔' : '✘'}</span> ${esc(c.name)} <span class="detail">— ${esc(c.detail)}</span></li>`).join('')}
      </ul>
      ${p.proof_filename ? `<button class="btn secondary small" data-proof>View proof of payment</button><div data-proof-slot></div>` : '<em style="color:var(--red);font-size:13px">No proof attached</em>'}
    </div>`);

    card.querySelector('[data-proof]')?.addEventListener('click', async (e) => {
      const slot = e.target.parentElement.querySelector('[data-proof-slot]');
      if (slot.childElementCount) { slot.innerHTML = ''; return; }
      const res = await fetch(`/api/payments/${p.id}/proof`, { headers: { Authorization: `Bearer ${state.token}` } });
      if (!res.ok) return toast('Could not load proof', 'error');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      slot.innerHTML = p.proof_mime === 'application/pdf'
        ? `<iframe src="${url}" class="proof-preview" style="width:100%;height:420px"></iframe>`
        : `<img src="${url}" class="proof-preview" alt="Proof of payment">`;
    });

    card.querySelector('[data-approve]').addEventListener('click', async (e) => {
      e.target.disabled = true;
      try {
        await api(`/api/payments/${p.id}/verify`, { method: 'POST', body: { approve: true } });
        toast(`Payment by ${p.user_name} verified — collector notified`, 'success');
        render();
      } catch (err) { toast(err.message, 'error'); e.target.disabled = false; }
    });

    card.querySelector('[data-reject]').addEventListener('click', () => {
      openModal(`
        <h2>Reject payment — ${esc(p.user_name)}, ${esc(p.period)}</h2>
        <form id="reject-form">
          <div class="field"><label>Reason (sent to the collector)</label>
            <textarea name="reason" rows="3" required placeholder="e.g. Amount paid does not match tax due; proof is unreadable"></textarea></div>
          <div class="modal-actions">
            <button type="button" class="btn secondary" onclick="document.getElementById('modal').remove()">Cancel</button>
            <button type="submit" class="btn red">Reject &amp; notify</button>
          </div>
        </form>`);
      document.getElementById('reject-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        try {
          await api(`/api/payments/${p.id}/verify`, { method: 'POST', body: { approve: false, reason: new FormData(e.target).get('reason') } });
          closeModal();
          toast('Payment rejected — collector notified with the reason', 'success');
          render();
        } catch (err) { toast(err.message, 'error'); }
      });
    });

    list.appendChild(card);
  }
}

// ---------------------------------------------------------------------------
// Locations (admin)
// ---------------------------------------------------------------------------

async function renderLocations(main) {
  const { locations } = await api('/api/locations');

  main.appendChild(h(`
    <div class="panel-head">
      <div>
        <h1 class="page-title">Locations</h1>
        <div class="page-sub">Collection stations around the world and their tax rates</div>
      </div>
      <button class="btn" id="add-location">＋ Add location</button>
    </div>
    <div class="panel">
      <div style="overflow-x:auto"><table>
        <thead><tr><th>Name</th><th>Country</th><th>Region</th><th>Currency</th><th class="num">Tax rate</th>
        <th class="num">Collectors</th><th class="num">Collected</th><th class="num">Overdue</th><th></th></tr></thead>
        <tbody id="loc-rows"></tbody>
      </table></div>
    </div>`));

  const tbody = document.getElementById('loc-rows');
  for (const l of locations) {
    const row = h(`<tr>
      <td><strong>${esc(l.name)}</strong>${l.active ? '' : ' <span class="badge failed">Inactive</span>'}</td>
      <td>${esc(l.country)}</td><td>${esc(l.region || '—')}</td><td>${esc(l.currency)}</td>
      <td class="num">${l.tax_rate_percent}%</td>
      <td class="num">${l.collectors}</td>
      <td class="num" style="color:var(--green)">${fmtMoney(l.total_collected, l.currency)}</td>
      <td class="num" style="color:${l.overdue_count ? 'var(--red)' : 'inherit'}">${l.overdue_count}</td>
      <td><button class="btn small secondary" data-edit>Edit</button></td>
    </tr>`);
    row.querySelector('[data-edit]').addEventListener('click', () => openLocationModal(l));
    tbody.appendChild(row);
  }
  if (!locations.length) tbody.innerHTML = '<tr><td colspan="9" class="empty">No locations yet</td></tr>';

  document.getElementById('add-location').addEventListener('click', () => openLocationModal(null));
}

function openLocationModal(loc) {
  openModal(`
    <h2>${loc ? 'Edit' : 'Add'} location</h2>
    <form id="loc-form">
      <div class="field"><label>Station name</label><input name="name" required value="${esc(loc?.name || '')}"></div>
      <div class="form-row">
        <div class="field"><label>Country</label><input name="country" required value="${esc(loc?.country || '')}"></div>
        <div class="field"><label>Region / state</label><input name="region" value="${esc(loc?.region || '')}"></div>
      </div>
      <div class="form-row">
        <div class="field"><label>Currency (ISO code)</label><input name="currency" required maxlength="3" value="${esc(loc?.currency || 'USD')}" style="text-transform:uppercase"></div>
        <div class="field"><label>Tax rate (%)</label><input name="tax_rate_percent" type="number" min="0" max="100" step="0.1" required value="${loc?.tax_rate_percent ?? 15}"></div>
      </div>
      ${loc ? `<div class="field"><label><input type="checkbox" name="active" ${loc.active ? 'checked' : ''} style="width:auto;margin-right:6px">Active</label></div>` : ''}
      <div class="form-error" id="loc-error"></div>
      <div class="modal-actions">
        <button type="button" class="btn secondary" onclick="document.getElementById('modal').remove()">Cancel</button>
        <button type="submit" class="btn">${loc ? 'Save changes' : 'Create location'}</button>
      </div>
    </form>`);

  document.getElementById('loc-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(e.target);
    const body = {
      name: fd.get('name'), country: fd.get('country'), region: fd.get('region'),
      currency: fd.get('currency'), tax_rate_percent: Number(fd.get('tax_rate_percent')),
    };
    if (loc) body.active = fd.get('active') != null;
    try {
      await api(loc ? `/api/locations/${loc.id}` : '/api/locations', { method: loc ? 'PUT' : 'POST', body });
      closeModal();
      toast(loc ? 'Location updated' : 'Location created', 'success');
      render();
    } catch (err) {
      document.getElementById('loc-error').textContent = err.message;
    }
  });
}

// ---------------------------------------------------------------------------
// Users (admin)
// ---------------------------------------------------------------------------

async function renderUsers(main) {
  const [{ users }, { locations }] = await Promise.all([api('/api/users'), api('/api/locations')]);

  main.appendChild(h(`
    <div class="panel-head">
      <div>
        <h1 class="page-title">Users</h1>
        <div class="page-sub">Administrators and level-one collectors</div>
      </div>
      <button class="btn" id="add-user">＋ Add user</button>
    </div>
    <div class="panel">
      <div style="overflow-x:auto"><table>
        <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Role</th><th>Location</th><th>Notify via</th></tr></thead>
        <tbody>
          ${users.map((u) => `<tr>
            <td><strong>${esc(u.name)}</strong></td>
            <td>${esc(u.email)}</td>
            <td>${esc(u.phone || '—')}</td>
            <td>${u.role === 'admin' ? '🛡 Admin' : 'Collector'}</td>
            <td>${u.location_name ? `${esc(u.location_name)}, ${esc(u.location_country)}` : '—'}</td>
            <td>${{ email: '📧 Email', sms: '💬 SMS', whatsapp: '🟢 WhatsApp' }[u.notify_channel] || esc(u.notify_channel)}</td>
          </tr>`).join('')}
        </tbody>
      </table></div>
    </div>`));

  document.getElementById('add-user').addEventListener('click', () => {
    openModal(`
      <h2>Add user</h2>
      <form id="user-form">
        <div class="field"><label>Full name</label><input name="name" required></div>
        <div class="form-row">
          <div class="field"><label>Email</label><input name="email" type="email" required></div>
          <div class="field"><label>Phone (with country code)</label><input name="phone" placeholder="+233550000000"></div>
        </div>
        <div class="form-row">
          <div class="field"><label>Role</label>
            <select name="role"><option value="collector">Collector</option><option value="admin">Admin</option></select></div>
          <div class="field"><label>Location (for collectors)</label>
            <select name="location_id"><option value="">—</option>
              ${locations.map((l) => `<option value="${l.id}">${esc(l.name)} (${esc(l.country)})</option>`).join('')}
            </select></div>
        </div>
        <div class="form-row">
          <div class="field"><label>Notification channel</label>
            <select name="notify_channel">
              <option value="email">Email</option><option value="sms">SMS</option><option value="whatsapp">WhatsApp</option>
            </select></div>
          <div class="field"><label>Password</label><input name="password" type="text" required minlength="6"></div>
        </div>
        <div class="form-error" id="user-error"></div>
        <div class="modal-actions">
          <button type="button" class="btn secondary" onclick="document.getElementById('modal').remove()">Cancel</button>
          <button type="submit" class="btn">Create user</button>
        </div>
      </form>`);

    document.getElementById('user-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const fd = new FormData(e.target);
      try {
        await api('/api/users', {
          method: 'POST',
          body: {
            name: fd.get('name'), email: fd.get('email'), phone: fd.get('phone'),
            role: fd.get('role'), location_id: fd.get('location_id') || null,
            notify_channel: fd.get('notify_channel'), password: fd.get('password'),
          },
        });
        closeModal();
        toast('User created', 'success');
        render();
      } catch (err) {
        document.getElementById('user-error').textContent = err.message;
      }
    });
  });
}

// ---------------------------------------------------------------------------
// Notifications
// ---------------------------------------------------------------------------

async function renderNotifications(main) {
  const isAdmin = state.user.role === 'admin';
  const { notifications } = await api(`/api/notifications${isAdmin ? '?all=1' : ''}`);

  main.appendChild(h(`
    <h1 class="page-title">Notifications</h1>
    <div class="page-sub">${isAdmin ? 'All messages sent by the system across every channel' : 'Messages the system has sent you'} — WhatsApp, SMS and email</div>
    <div class="panel">
      <div style="overflow-x:auto"><table>
        <thead><tr>${isAdmin ? '<th>User</th>' : ''}<th>Channel</th><th>Recipient</th><th>Subject</th><th>Status</th><th>When</th></tr></thead>
        <tbody>
          ${notifications.map((n) => `<tr>
            ${isAdmin ? `<td>${esc(n.user_name)}</td>` : ''}
            <td>${{ email: '📧 Email', sms: '💬 SMS', whatsapp: '🟢 WhatsApp' }[n.channel] || esc(n.channel)}</td>
            <td>${esc(n.recipient)}</td>
            <td title="${esc(n.body)}">${esc(n.subject)}</td>
            <td>${badge(n.status)}</td>
            <td>${fmtDate(n.created_at)}</td>
          </tr>`).join('') || `<tr><td colspan="6" class="empty">No notifications yet</td></tr>`}
        </tbody>
      </table></div>
    </div>`));
}

// ---------------------------------------------------------------------------

render();
