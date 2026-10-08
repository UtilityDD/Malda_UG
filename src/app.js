import { PROJECT_INFO, BOQ_ITEMS } from './data/projectData.js';
import * as remote from './remote.js';

const PAGES = [
  { id: 'home', label: 'Home' },
  { id: 'boq', label: 'BOQ', note: 'LOA and survey quantity' },
  { id: 'gtp', label: 'GTP / Vendor', note: 'Submit or approve vendor' },
  { id: 'di', label: 'Inspection / DI', note: 'Offer, inspection, and dispatch' },
  { id: 'receive', label: 'Material receive', note: 'Store receipt record' },
  { id: 'billing', label: 'Vendor billing', note: 'Supply and erection invoices' },
  { id: 'daily', label: 'Daily progress', note: "Today's site quantity" },
  { id: 'users', label: 'People', note: 'Logins and roles' }
];

const ROLE_PAGES = {
  Vendor: ['home', 'gtp', 'di', 'billing', 'daily'],
  Turnkey: ['home', 'gtp', 'di', 'billing', 'daily'],
  Region: ['home', 'boq', 'gtp', 'di', 'billing', 'daily'],
  WBSEDCL: ['home', 'boq', 'gtp', 'di', 'billing', 'daily'],
  Store: ['home', 'receive'],
  Viewer: ['home', 'boq', 'gtp', 'di', 'receive', 'billing', 'daily'],
  Admin: ['home', 'boq', 'gtp', 'di', 'receive', 'billing', 'daily', 'users']
};

let simulatedRole = null;

function effectiveRole() {
  if (sessionUser && user.role === 'Admin' && simulatedRole) return simulatedRole;
  return user.role || '';
}

function roleKey() {
  return String(effectiveRole()).trim().toLowerCase();
}
function isAdmin() {
  return roleKey() === 'admin';
}
function isRegion() {
  const role = roleKey();
  return role === 'region' || role === 'wbsedcl';
}
function isVendor() {
  const role = roleKey();
  return role === 'vendor' || role === 'turnkey';
}
function isStore() {
  return roleKey() === 'store';
}
function isViewer() {
  return roleKey() === 'viewer';
}

const FEEDERS = [
  'English Bazar Feeder-1 (Rabindra Avenue)',
  'English Bazar Feeder-2 (Bandh Road)',
  'English Bazar Feeder-3 (Station Road)',
  'KPS 33/11kV Substation Outlet-1',
  'KPS 33/11kV Substation Outlet-2'
];

let currentPage = 'home';
let searchQuery = '';
let boqPart = 'Part-A (Material)';
let gtpTab = 'vendor';
let billTab = 'supply';
let dailyTab = 'supply';
let receiveTab = 'materials';
let inspTab = 'summary';
let inspModal = null;
let entryModal = null;
let inspectOpenedAt = 0;
let inspectTimer = 0;
let authMode = 'login';
let booting = true;
let loadError = '';
let sessionUser = null;
let user = { name: '', role: '', active: false };
let people = [];
let boqItems = [];
let gtpApprovals = [];
let dailyLogs = [];
let dispatchInstructions = [];
let inspectionOffers = [];
let receipts = [];
let invoices = [];
let refreshTimer = 0;
let sessionToken = 0;
let deferredPrompt = null;

document.addEventListener('DOMContentLoaded', init);

function init() {
  document.getElementById('sign-out').addEventListener('click', () => remote.signOut());

  document.addEventListener('click', onClick);
  document.addEventListener('submit', onSubmit);
  document.addEventListener('input', onInput);
  document.addEventListener('change', onChange);
  const dialog = document.getElementById('inspect-dialog');
  dialog.addEventListener('click', (event) => {
    if (event.target !== dialog) return;
    if (Date.now() - inspectOpenedAt < 400) return;
    inspModal = null;
    entryModal = null;
    paint();
  });
  dialog.addEventListener('cancel', (event) => {
    event.preventDefault();
    inspModal = null;
    entryModal = null;
    paint();
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) scheduleRefresh();
  });
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    paint();
  });
  remote.watchAuth(onSession);
}

async function onSession(session) {
  const token = ++sessionToken;
  sessionUser = session?.user || null;
  loadError = '';
  if (!sessionUser) {
    remote.stopListen();
    user = { name: '', role: '', active: false };
    people = [];
    booting = false;
    paint();
    return;
  }
  booting = true;
  paint();
  try {
    user = await remote.profile();
    if (token !== sessionToken) return;
    if (!user.active) {
      booting = false;
      paint();
      return;
    }
    const cached = remote.cachedRegister(user.role === 'Admin');
    if (cached) {
      adopt(cached);
      booting = false;
      paint();
    }
    await pullRegister();
    if (token !== sessionToken) return;
    if (boqItems.length === 0 && user.role === 'Admin') {
      await remote.seedItems(BOQ_ITEMS);
      await pullRegister();
    }
    if (token !== sessionToken) return;
    remote.listen(scheduleRefresh);
  } catch (error) {
    if (token !== sessionToken) return;
    if (!boqItems.length) loadError = error.message || 'Could not load the register';
    else toast(error.message || 'Could not refresh the register');
  }
  booting = false;
  paint();
}

async function pullRegister() {
  const data = await remote.loadRegister(user.role === 'Admin');
  adopt(data);
}

function scheduleRefresh() {
  clearTimeout(refreshTimer);
  refreshTimer = setTimeout(() => {
    refresh().catch((error) => console.warn(error));
  }, 1000);
}

async function refresh() {
  if (!user.active || document.hidden) return;
  await pullRegister();
  const dialog = document.getElementById('inspect-dialog');
  if (dialog?.open) return;
  paint();
}

function adopt(data) {
  boqItems = data.items;
  gtpApprovals = data.approvals || [];
  dailyLogs = data.logs;
  dispatchInstructions = data.dis;
  inspectionOffers = data.offers;
  receipts = data.receipts;
  invoices = data.invoices || [];
  people = data.people || [];
  boqItems.forEach((item) => {
    ensurePipeline(item);
    data.approvals
      .filter((row) => row.itemSl === item.slNo)
      .forEach((row) => {
        const target = row.kind === 'gtp' ? item.pipeline.gtpDoc : item.pipeline.vendorAppr;
        target.status = row.status;
        target.vendor = row.vendor;
        target.letterNo = row.letterNo;
        target.subDate = row.subDate;
        target.apprDate = row.apprDate;
        target.approvedQty = row.approvedQty;
        target.actionDate = row.actionDate;
        target.memoNo = row.memoNo;
        target.remarks = row.remarks;
        target.actionBy = row.actionBy;
      });
    const logged = sum(dailyLogs.filter((row) => Number(row.itemSl) === item.slNo && row.approvalStatus === 'Approved'), (row) => Number(row.executedQty) || 0);
    item.pipeline.execution.executedQty = logged;
    const received = sum(receipts.filter((row) => Number(row.itemSl) === item.slNo), (row) => Number(row.qty) || 0);
    const cleared = sum(dispatchInstructions.filter((row) => Number(row.itemSl) === item.slNo), (row) => Number(row.qty) || 0);
    item.pipeline.store = {
      status: cleared <= 0 ? 'Not Received' : received + 0.0001 >= cleared ? 'Received' : 'Partial',
      storeQty: received
    };
    syncSupplyPipeline(item);
  });
}

function paint() {
  const shell = document.querySelector('.shell');
  if (shell) {
    shell.classList.toggle('logged-out', !sessionUser || !user.active);
  }
  const box = document.getElementById('user-box');
  box.hidden = !user.active;
  if (user.active) {
    document.getElementById('user-label').textContent = `${user.name} · ${user.role}${simulatedRole ? ` (Simulating ${simulatedRole})` : ''}`;
  }
  const simContainer = document.getElementById('admin-sim-container');
  if (simContainer) {
    if (user.active && user.role === 'Admin') {
      simContainer.innerHTML = `
        <label class="sim-label" style="font-size: 0.75rem; color: #94a3b8; display: block; margin-top: 0.5rem;">
          Simulate View:
          <select id="sim-role-select" style="width: 100%; font-size: 0.75rem; padding: 2px 4px; margin-top: 2px; border-radius: 4px; background: #1e293b; color: #f8fafc; border: 1px solid #334155;">
            <option value=""${!simulatedRole ? ' selected' : ''}>👑 Admin (Full Control)</option>
            <option value="Region"${simulatedRole === 'Region' ? ' selected' : ''}>🏢 Region (WBSEDCL)</option>
            <option value="Vendor"${simulatedRole === 'Vendor' ? ' selected' : ''}>🚜 Vendor (Turnkey)</option>
            <option value="Store"${simulatedRole === 'Store' ? ' selected' : ''}>📦 Store Keeper</option>
            <option value="Viewer"${simulatedRole === 'Viewer' ? ' selected' : ''}>👁️ Viewer (Read Only)</option>
          </select>
        </label>
      `;
    } else {
      simContainer.innerHTML = '';
    }
  }
  renderNav();
  const pwaContainer = document.getElementById('pwa-install-container');
  if (pwaContainer) {
    pwaContainer.innerHTML = deferredPrompt ? `
      <button type="button" class="nav-btn" data-action="install-pwa" style="margin-top: 8px; background: #0284c7; color: #ffffff; font-weight: 600; text-align: center; border: none; box-shadow: 0 4px 6px -1px rgba(2, 132, 199, 0.3);">
        📲 Install App
      </button>
    ` : '';
  }
  document.querySelectorAll('.page').forEach((page) => {
    page.hidden = page.id !== `page-${currentPage}`;
  });
  const root = document.getElementById(`page-${currentPage}`);
  root.innerHTML = renderCurrent();
  applySearch(root);
  syncInspectDialog();
}

function renderNav() {
  const nav = document.getElementById('nav');
  if (!user.active) {
    nav.innerHTML = '';
    return;
  }
  nav.innerHTML = PAGES.filter((page) => canOpen(page.id)).map((page) => `
    <button type="button" class="nav-btn${page.id === currentPage ? ' active' : ''}" data-action="open" data-page="${page.id}">
      ${esc(page.label)}
    </button>
  `).join('');
}

function renderCurrent() {
  if (booting) return '<p class="empty-page">Loading the register…</p>';
  if (loadError) return `<div class="auth-card"><h1>Register unavailable</h1><p>${esc(loadError)}</p></div>`;
  if (!sessionUser) return renderAuth();
  if (!user.active) return renderWaiting();
  if (currentPage === 'home') return renderHome();
  if (currentPage === 'boq') return renderBoq();
  if (currentPage === 'gtp') return renderGtp();
  if (currentPage === 'di') return renderInspect();
  if (currentPage === 'receive') return renderReceive();
  if (currentPage === 'billing') return renderBilling();
  if (currentPage === 'daily') return renderDaily();
  if (currentPage === 'users') return renderUsers();
  return renderHome();
}

function renderAuth() {
  return `
    <div class="auth-wrapper">
      <form class="auth-card" id="form-login">
        <div class="auth-header">
          <div class="auth-icon">⚡</div>
          <h1>Malda UG Cable Register</h1>
          <p>Sign in using your User ID and PIN assigned by your Administrator.</p>
        </div>
        
        <div class="auth-fields">
          <label>User ID / Email
            <input name="email" id="auth-email" type="text" autocomplete="username" required placeholder="e.g. user01 or name@malda.com" />
          </label>
          
          <label>PIN / Password
            <input name="password" id="auth-password" type="password" autocomplete="current-password" required placeholder="Enter PIN or Password" />
          </label>
        </div>
        
        <p class="form-msg"></p>
        
        <button type="submit" class="primary auth-submit">Sign in to Register</button>

        <div class="auth-info-box">
          <strong>Need a Login or PIN Reset?</strong>
          User accounts are created exclusively by the Project Administrator. Please contact your Administrator or Divisional Engineer to receive your credentials.
        </div>
      </form>
    </div>
  `;
}

function renderWaiting() {
  return `
    <div class="auth-wrapper">
      <div class="auth-card">
        <div class="auth-header">
          <div class="auth-icon" style="background: linear-gradient(135deg, #d97706, #78350f);">⌛</div>
          <h1>Waiting for Activation</h1>
          <p>Your account <strong>${esc(user.name || user.email || '')}</strong> is registered, but not activated by the Administrator yet.</p>
        </div>
        <button type="button" class="ghost auth-submit" data-action="sign-out" style="background: #f1f5f9; color: #334155;">Sign out</button>
      </div>
    </div>
  `;
}

function renderUsers() {
  const rows = people.map((person) => {
    const isSelf = sessionUser?.id === person.id;
    const shortId = person.email.endsWith('@malda-ug.gov.in')
      ? person.email.replace('@malda-ug.gov.in', '')
      : person.email;

    return `
      <tr>
        <td>
          <strong>${esc(person.name)}</strong>
          <span class="meta">ID: <code>${esc(shortId)}</code> (${esc(person.email)})</span>
        </td>
        <td>
          <select data-person="${esc(person.id)}" data-field="role">
            ${['Vendor', 'Region', 'Store', 'Viewer', 'Admin', 'Turnkey', 'WBSEDCL'].map((r) => `<option${r === person.role ? ' selected' : ''}>${r}</option>`).join('')}
          </select>
        </td>
        <td>
          <select data-person="${esc(person.id)}" data-field="active">
            <option${person.active ? ' selected' : ''}>Active</option>
            <option${!person.active ? ' selected' : ''}>Inactive</option>
          </select>
        </td>
        <td>
          <div style="display: flex; gap: 6px; align-items: center;">
            <button type="button" class="tiny" data-action="save-person" data-id="${esc(person.id)}">Save</button>
            <button type="button" class="tiny ghost" data-action="reset-pin" data-id="${esc(person.id)}" data-name="${esc(person.name)}">Reset PIN</button>
          </div>
        </td>
      </tr>
    `;
  });

  return `
    ${head('People & Logins', 'Create user accounts with manual User ID, PIN, and Role. Manage existing user access, roles, and PINs.')}

    <form class="auth-card" id="form-create-user" style="max-width: 100%; width: 100%; margin: 0 0 24px 0; box-shadow: none;">
      <h2 style="margin: 0; font-size: 16px;">Create New User Account (Manual ID & PIN)</h2>
      <p style="margin-top: 2px; font-size: 12px; color: var(--muted);">Manually specify User ID, PIN, Name, and Role. Account is created as Active by default.</p>
      
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-top: 10px;">
        <label>Full Name
          <input name="name" type="text" required placeholder="e.g. Tarun Enterprise" />
        </label>
        <label>User ID or Email
          <input name="userId" type="text" required placeholder="e.g. user01 or name@malda.com" />
        </label>
        <label>PIN / Password
          <input name="pin" type="text" required placeholder="e.g. 1234 or pin123" />
        </label>
        <label>User Role
          <select name="role" required style="padding: 8px; border: 1px solid var(--line); border-radius: 6px; background: #fff; color: var(--text);">
            <option value="Vendor">Vendor</option>
            <option value="Region">Region (WBSEDCL DE)</option>
            <option value="Store">Store Keeper</option>
            <option value="Turnkey">Turnkey Contractor</option>
            <option value="WBSEDCL">WBSEDCL Engineer</option>
            <option value="Viewer">Viewer (Read Only)</option>
            <option value="Admin">Admin (Full Access)</option>
          </select>
        </label>
      </div>

      <p class="form-msg" style="margin-top: 8px;"></p>
      <div style="margin-top: 8px; display: flex; gap: 8px;">
        <button type="submit" class="primary" style="width: auto; padding: 8px 16px;">Create User Account</button>
      </div>
    </form>

    <h2 style="font-size: 16px; margin: 16px 0 8px;">Existing User Accounts (${people.length})</h2>
    ${table(['Name & User ID', 'Role', 'Access Status', 'Actions'], rows, 4, 'No logins yet.')}
  `;
}

function renderHome() {
  const material = boqItems.filter(isMaterial);
  const erection = boqItems.filter((item) => !isMaterial(item));
  const scopeValue = sum(boqItems, (item) => scopeQty(item) * item.rate);
  const executedValue = sum(boqItems, (item) => executedQty(item) * item.rate);
  const materialScope = sum(material, (item) => scopeQty(item) * item.rate);
  const materialReceived = sum(material, (item) => storeQty(item) * item.rate);
  const progress = scopeValue ? (executedValue / scopeValue) * 100 : 0;
  const receivedPct = materialScope ? (materialReceived / materialScope) * 100 : 0;
  const paid = sum(invoices.filter((invoice) => invoice.payStatus === 'Paid'), invoiceGross);
  const claimed = sum(invoices.filter((invoice) => invoice.payStatus !== 'Paid'), invoiceGross);
  const days = daysUntil(PROJECT_INFO.targetCompletionDate);
  const buttons = PAGES.filter((page) => page.id !== 'home' && canOpen(page.id));

  return `
    <div class="page-head">
      <div>
        <h1>Malda UG Cable</h1>
        <p>${esc(user.name || user.role)} · ${esc(user.role)} · ${esc(PROJECT_INFO.turnkeyAgency)}</p>
      </div>
    </div>
    <div class="kpis">
      ${kpi('Scope', formatCr(PROJECT_INFO.totalPoValue), `${material.length} material · ${erection.length} erection`)}
      ${kpi('Progress', `${progress.toFixed(1)}%`, `${formatMoney(executedValue)} executed`)}
      ${kpi('Material', `${receivedPct.toFixed(1)}%`, `${formatMoney(materialReceived)} received`)}
      ${kpi('Target', formatDisplayDate(PROJECT_INFO.targetCompletionDate), days >= 0 ? `${days} days left` : `${Math.abs(days)} days past target`)}
      ${kpi('Billing', formatMoney(paid), `${formatMoney(claimed)} claimed, not paid`)}
    </div>
    <div class="open-grid">
      ${buttons.map((page) => `
        <button type="button" class="open-btn" data-action="open" data-page="${page.id}">
          <strong>${esc(page.label)}</strong>
          <span>${esc(page.note)}</span>
        </button>
      `).join('')}
    </div>
  `;
}

function renderBoq() {
  const material = boqPart !== 'Part-B (Erection)';
  const rows = boqItems.filter((item) => material ? isMaterial(item) : !isMaterial(item));
  const hint = user.role === 'Admin'
    ? 'Edit updates the line. Survey quantity is entered here.'
    : 'Click an item to enter survey quantity.';
  return `
    ${head('BOQ', hint)}
    <div class="tab-row">
      ${tabBar('boq', [['material', 'Material'], ['erection', 'Erection']], material ? 'material' : 'erection')}
      ${user.role === 'Admin' ? '<button type="button" class="ghost" data-action="open-entry" data-mode="new">New item</button>' : ''}
    </div>
    ${table(['Sl', 'Description', 'Unit', numHead('LOA Qty'), numHead('Survey Qty'), numHead('Rate'), numHead('Executed'), ''], rows.map((item) => `
      <tr class="pick" data-action="open-entry" data-sl="${item.slNo}" data-q="${esc(searchText(item, itemTitle(item)))}">
        <td>${item.slNo}</td>
        <td class="desc" title="${esc(item.description)}">${nameButton(item)}</td>
        <td>${esc(item.unit)}</td>
        <td class="num">${qtyText(item.loaQty, item.unit)}</td>
        <td class="num">${surveyText(item)}</td>
        <td class="num">${fmtQty(item.rate)}</td>
        <td class="num">${qtyText(executedQty(item), item.unit)}</td>
        <td class="row-actions">${user.role === 'Admin' ? `<button type="button" class="tiny" data-action="open-entry" data-sl="${item.slNo}">Edit</button><button type="button" class="tiny danger" data-action="delete-boq" data-sl="${item.slNo}">Delete</button>` : ''}</td>
      </tr>
    `), 8)}
  `;
}

const GTP_WAITING = ['Submitted', 'Hold', 'Rejected'];

function renderGtp() {
  const rows = boqItems.filter(isMaterial);
  const canSubmit = isVendor() || isAdmin();
  const kind = gtpTab === 'gtp' ? 'gtp' : 'vendor';
  const groups = letterGroups();
  const hint = isRegion()
    ? 'Open "By letter" to decide every item of a letter in one go, or click a single row.'
    : 'New submission sends one letter for many materials: fill the reference once and tick the items it covers.';
  const body = gtpTab === 'letters' ? lettersTable(groups) : approvalTable(rows, kind);
  const stats = gtpStats(rows);
  const addBtn = user.role === 'Admin'
    ? `<button type="button" class="ghost" data-action="open-entry" data-mode="new">+ Add new material item</button>`
    : '';

  return `
    ${head('GTP / Vendor', hint)}
    <div class="gtp-stats">
      ${gtpStat('Not submitted', stats.open, 'idle', 'documents still to send')}
      ${gtpStat('Awaiting decision', stats.waiting, 'wait', 'with WBSEDCL')}
      ${gtpStat('Hold / rejected', stats.blocked, 'bad', 'need attention')}
      ${gtpStat('Ready for offer', stats.done, 'ok', `of ${rows.length} materials`)}
    </div>
    <div class="tab-row">
      ${tabBar('gtp', [['vendor', 'Vendor approval'], ['gtp', 'GTP'], ['letters', `By letter (${groups.length})`]], gtpTab)}
      <div class="actions" style="display:flex; gap:8px; align-items:center;">
        ${addBtn}
        ${canSubmit ? `<button type="button" class="primary" id="gtp-new-submission" data-action="batch-new" data-kind="${kind}">+ New submission</button>` : ''}
      </div>
    </div>
    ${body}
  `;
}

function gtpStats(rows) {
  const stats = { open: 0, waiting: 0, blocked: 0, done: 0 };
  rows.forEach((item) => {
    ['vendor', 'gtp'].forEach((kind) => {
      const status = approvalRecord(item, kind).status;
      if (status === 'Submitted') stats.waiting += 1;
      else if (status === 'Hold' || status === 'Rejected') stats.blocked += 1;
      else if (status !== 'Approved') stats.open += 1;
    });
    if (approvedBoqQty(item) > 0) stats.done += 1;
  });
  return stats;
}

function gtpStat(label, value, tone, sub) {
  return `<div class="gtp-stat ${tone}"><strong>${esc(value)}</strong><span>${esc(label)}</span><em>${esc(sub)}</em></div>`;
}

function kindLabel(kind) {
  return kind === 'gtp' ? 'GTP' : 'Vendor approval';
}

function kindBadge(kind) {
  return `<span class="badge kind-${kind === 'gtp' ? 'gtp' : 'vendor'}">${kind === 'gtp' ? 'GTP' : 'Vendor'}</span>`;
}

function letterKey(kind, letterNo) {
  return `${kind}|${letterNo}`;
}

// One letter reference groups every item submitted under it, per kind.
function letterGroups() {
  const map = new Map();
  gtpApprovals.forEach((record) => {
    if (!record.letterNo || record.status === 'Pending Submission') return;
    const item = findItem(record.itemSl);
    if (!item || !isMaterial(item)) return;
    const key = letterKey(record.kind, record.letterNo);
    if (!map.has(key)) map.set(key, { key, kind: record.kind, letterNo: record.letterNo, subDate: record.subDate || '', rows: [] });
    const group = map.get(key);
    group.rows.push({ item, record });
    if (record.subDate && (!group.subDate || record.subDate < group.subDate)) group.subDate = record.subDate;
  });
  return [...map.values()]
    .map((group) => ({
      ...group,
      waiting: group.rows.filter(({ record }) => GTP_WAITING.includes(record.status)).length,
      pending: group.rows.filter(({ record }) => record.status === 'Submitted').length
    }))
    .sort((a, b) => (b.pending > 0) - (a.pending > 0) || String(b.subDate).localeCompare(String(a.subDate)));
}

function findGroup(key) {
  return letterGroups().find((group) => group.key === key) || null;
}

function statusSummary(rows) {
  const order = [['Submitted', 'pending', 'wait'], ['Hold', 'on hold', 'hold'], ['Rejected', 'rejected', 'bad'], ['Approved', 'approved', 'ok']];
  return order
    .map(([status, word, tone]) => {
      const count = rows.filter(({ record }) => record.status === status).length;
      return count ? `<span class="badge ${tone}">${count} ${word}</span>` : '';
    })
    .filter(Boolean)
    .join(' ');
}

function miniStatus(record) {
  const map = { Approved: ['ok', 'Approved'], Submitted: ['wait', 'Submitted'], Hold: ['hold', 'On hold'], Rejected: ['bad', 'Rejected'] };
  const [tone, label] = map[record.status] || ['idle', 'Not submitted'];
  return `<span class="badge ${tone}">${label}</span>`;
}

function lettersTable(groups) {
  const canDecide = isRegion() || isAdmin();
  const canSubmit = isVendor() || isAdmin();
  return table(['Kind', 'Letter no.', 'Submitted', 'Items covered', 'Status', ''], groups.map((group) => {
    const names = group.rows.map(({ item }) => materialName(item));
    const preview = names.slice(0, 2).join(', ') + (names.length > 2 ? ` +${names.length - 2} more` : '');
    const days = group.pending ? daysSince(group.subDate) : null;
    let action = '';
    if (canDecide && group.waiting) action = `<button type="button" class="tiny strong" data-action="open-letter" data-id="${esc(group.key)}">Review ${group.waiting}</button>`;
    else action = `<button type="button" class="tiny" data-action="open-letter" data-id="${esc(group.key)}">View letter</button>`;
    if (user.role === 'Admin') {
      action += ` <button type="button" class="tiny danger" data-action="delete-approval-letter" data-kind="${group.kind}" data-letter="${esc(group.letterNo)}">Delete</button>`;
    }
    return `
      <tr class="pick" data-action="open-letter" data-id="${esc(group.key)}" data-q="${esc([group.kind, group.letterNo, ...names, ...group.rows.map(({ record }) => `${record.vendor} ${record.memoNo}`)].join(' '))}">
        <td>${kindBadge(group.kind)}</td>
        <td><strong>${esc(group.letterNo)}</strong></td>
        <td>${esc(group.subDate ? isoToDmy(group.subDate) : '—')}${days !== null ? `<span class="meta">${days} ${days === 1 ? 'day' : 'days'} waiting</span>` : ''}</td>
        <td class="letter-items"><strong>${group.rows.length} ${group.rows.length === 1 ? 'material' : 'materials'}</strong><span class="meta" title="${esc(names.join(', '))}">${esc(preview)}</span></td>
        <td class="decision">${statusSummary(group.rows)}</td>
        <td class="row-actions">${action}</td>
      </tr>
    `;
  }), 6, 'No letter submitted yet. Use New submission to send one.');
}

function approvalTable(rows, kind) {
  const headers = ['Sl', 'Material', 'Vendor', 'Letter no.', numHead('LOA Qty'), numHead('Survey Qty'), numHead('Approved Qty'), numHead('Delivered Qty'), 'Submitted', 'Decision'];
  if (user.role === 'Admin') headers.push('');
  return table(headers, rows.map((item) => {
    const records = itemApprovals(item, kind);
    const submitLabel = kind === 'gtp' ? 'Submit GTP' : 'Submit letter';
    const primaryRecord = approvalRecord(item, kind);

    let vendorHtml = '—';
    if (records.length) {
      const vendorNames = [...new Set(records.map((r) => r.vendor).filter(Boolean))];
      if (vendorNames.length > 1) {
        vendorHtml = vendorNames.map((v) => `<div class="multi-cell-item"><strong>${esc(v)}</strong></div>`).join('');
      } else if (vendorNames.length === 1) {
        vendorHtml = esc(vendorNames[0]);
      }
    }

    let letterHtml = '—';
    if (records.length) {
      const withLetters = records.filter((r) => r.letterNo);
      if (withLetters.length > 1) {
        letterHtml = withLetters.map((r) => `
          <div class="multi-cell-item">
            <button type="button" class="row-link letter-link" data-action="open-letter" data-id="${esc(letterKey(kind, r.letterNo))}">
              <strong>${esc(r.letterNo)}</strong>
            </button>
            ${r.vendor ? `<span class="meta">(${esc(r.vendor)})</span>` : ''}
          </div>
        `).join('');
      } else if (withLetters.length === 1) {
        letterHtml = `<button type="button" class="row-link letter-link" data-action="open-letter" data-id="${esc(letterKey(kind, withLetters[0].letterNo))}">${esc(withLetters[0].letterNo)}</button>`;
      }
    }

    let subDateHtml = '—';
    if (records.length) {
      const dates = records.map((r) => r.subDate ? isoToDmy(r.subDate) : '—');
      if (dates.length > 1) {
        subDateHtml = dates.map((d) => `<div class="multi-cell-item">${esc(d)}</div>`).join('');
      } else {
        subDateHtml = esc(dates[0]);
      }
    }

    let decisionHtml = '—';
    if (records.length > 1) {
      decisionHtml = records.map((r) => `
        <div class="multi-cell-item">
          ${decisionCellContent(r)}
        </div>
      `).join('');
    } else if (records.length === 1) {
      decisionHtml = decisionCellContent(records[0]);
    } else {
      decisionHtml = decisionCellContent(blankApproval());
    }

    const delBtn = (user.role === 'Admin' && records.some((r) => r.status !== 'Pending Submission'))
      ? `<button type="button" class="tiny danger" data-action="delete-approval" data-sl="${item.slNo}" data-kind="${kind}">Delete</button>`
      : '';

    const queryParts = [
      searchText(item, materialName(item)),
      ...records.map((r) => `${r.vendor} ${r.letterNo} ${r.status} ${r.memoNo} ${r.remarks}`)
    ];

    return `
      <tr class="pick" data-action="open-entry" data-sl="${item.slNo}" data-id="${kind}" data-q="${esc(queryParts.join(' '))}">
        <td>${item.slNo}</td>
        <td class="desc" title="${esc(item.description)}">${nameButton(item, `data-id="${kind}"`)} ${submitAction(item, kind, primaryRecord, submitLabel)}</td>
        <td>${vendorHtml}</td>
        <td>${letterHtml}</td>
        ${qtyCells(item, primaryRecord)}
        <td>${subDateHtml}</td>
        <td class="decision">${decisionHtml}</td>
        ${user.role === 'Admin' ? `<td class="row-actions">${delBtn}</td>` : ''}
      </tr>
    `;
  }), headers.length);
}

function renderInspect() {
  const materials = boqItems.filter(isMaterial);
  const pendingOfferItems = materials.filter((item) => supplyTrack(item).pendingOffer > 0.0001).length;
  const awaiting = inspectionOffers.filter((offer) => offer.status === 'Offered').length;
  const pendingDiItems = materials.filter((item) => pendingDiQty(item) > 0.0001).length;
  const groups = offerGroups();
  const canOffer = isVendor() || isAdmin();
  const hint = isRegion()
    ? 'Open "By offer letter" to review and clear or forward all items under one memo, or click an individual offer.'
    : 'New inspection offer sends one reference letter covering multiple materials: fill the details once and enter quantities.';
  return `
    ${head('Inspection / DI', hint)}
    <div class="kpis">
      ${kpi('Pending offer', String(pendingOfferItems), 'Items below approved qty')}
      ${kpi('Offers waiting', String(awaiting), 'RM/ZM or HQ/ZM')}
      ${kpi('Pending DI', String(pendingDiItems), 'Cleared or forwarded')}
      ${kpi('DI issued', String(dispatchInstructions.length), 'Dispatch instructions')}
    </div>
    <div class="tab-row">
      <div class="tabs">
        <button type="button" class="tab${inspTab === 'summary' ? ' active' : ''}" data-action="insp-tab" data-tab="summary">Material summary</button>
        <button type="button" class="tab${inspTab === 'letters' ? ' active' : ''}" data-action="insp-tab" data-tab="letters">By offer letter (${groups.length})</button>
        <button type="button" class="tab${inspTab === 'offered' ? ' active' : ''}" data-action="insp-tab" data-tab="offered">Waiting (${awaiting})</button>
        <button type="button" class="tab${inspTab === 'approved' ? ' active' : ''}" data-action="insp-tab" data-tab="approved">Cleared / DI pending</button>
      </div>
      ${canOffer ? `<button type="button" class="primary" id="insp-new-offer" data-action="batch-insp-new">+ New inspection offer</button>` : ''}
    </div>
    ${inspTab === 'letters' ? offerLettersTable(groups) : inspTab === 'offered' ? offeredTable() : inspTab === 'approved' ? approvedTable() : summaryTable(materials)}
  `;
}

function offerGroups() {
  const map = new Map();
  inspectionOffers.forEach((offer) => {
    if (!offer.offerNo) return;
    const key = offer.offerNo;
    if (!map.has(key)) {
      map.set(key, {
        offerNo: offer.offerNo,
        date: offer.date || '',
        manufacturer: offer.manufacturer || '',
        premises: offer.premises || '',
        class: offer.class || 'Central',
        rows: []
      });
    }
    const group = map.get(key);
    const item = findItem(offer.itemSl);
    group.rows.push({ offer, item });
    if (offer.date && (!group.date || offer.date < group.date)) group.date = offer.date;
    if (offer.manufacturer && !group.manufacturer) group.manufacturer = offer.manufacturer;
    if (offer.premises && !group.premises) group.premises = offer.premises;
  });

  return [...map.values()]
    .map((group) => ({
      ...group,
      waiting: group.rows.filter(({ offer }) => offer.status === 'Offered').length,
      cleared: group.rows.filter(({ offer }) => offer.status === 'Cleared' || offer.status === 'Forwarded').length,
      rejected: group.rows.filter(({ offer }) => offer.status === 'Rejected').length
    }))
    .sort((a, b) => (b.waiting > 0) - (a.waiting > 0) || String(b.date).localeCompare(String(a.date)));
}

function findOfferGroup(offerNo) {
  return offerGroups().find((g) => g.offerNo === offerNo) || null;
}

function offerLettersTable(groups) {
  const canDecide = isRegion() || isAdmin();
  const canOffer = isVendor() || isAdmin();
  return table(['Offer letter', 'Date', 'Materials covered', 'Manufacturer & premises', 'Office', 'Status', ''], groups.map((group) => {
    const names = group.rows.map(({ item, offer }) => item ? materialName(item) : offer.itemName);
    const preview = names.slice(0, 2).join(', ') + (names.length > 2 ? ` +${names.length - 2} more` : '');
    const days = group.waiting ? daysSince(group.date) : null;
    let action = '';
    if (canDecide && group.waiting) {
      action = `<button type="button" class="tiny strong" data-action="open-offer-letter" data-id="${esc(group.offerNo)}">Review ${group.waiting}</button>`;
    } else {
      action = `<button type="button" class="tiny" data-action="open-offer-letter" data-id="${esc(group.offerNo)}">View letter</button>`;
    }

    const offices = [...new Set(group.rows.map(({ offer }) => offer.class))];
    const officeBadges = offices.map(classBadge).join(' ');

    return `
      <tr class="pick" data-action="open-offer-letter" data-id="${esc(group.offerNo)}" data-q="${esc([group.offerNo, group.manufacturer, group.premises, ...names].join(' '))}">
        <td><strong>${esc(group.offerNo)}</strong></td>
        <td>${esc(group.date ? isoToDmy(group.date) : '—')}${days !== null ? `<span class="meta">${days} ${days === 1 ? 'day' : 'days'} waiting</span>` : ''}</td>
        <td class="letter-items"><strong>${group.rows.length} ${group.rows.length === 1 ? 'material' : 'materials'}</strong><span class="meta" title="${esc(names.join(', '))}">${esc(preview)}</span></td>
        <td class="desc" title="${esc(group.premises)}"><strong>${esc(group.manufacturer)}</strong><span class="meta">${esc(group.premises)}</span></td>
        <td>${officeBadges}</td>
        <td class="decision">${inspStatusSummary(group.rows)}</td>
        <td class="row-actions">${action}</td>
      </tr>
    `;
  }), 7, 'No inspection offer letter submitted yet. Use "+ New inspection offer" to submit one.');
}

function inspStatusSummary(rows) {
  const order = [
    ['Offered', 'waiting', 'wait'],
    ['Cleared', 'cleared', 'ok'],
    ['Forwarded', 'forwarded', 'ok'],
    ['Rejected', 'rejected', 'bad']
  ];
  return order
    .map(([status, word, tone]) => {
      const count = rows.filter(({ offer }) => offer.status === status).length;
      return count ? `<span class="badge ${tone}">${count} ${word}</span>` : '';
    })
    .filter(Boolean)
    .join(' ');
}

function summaryTable(materials) {
  return table(['Sl', 'Material', 'Office', numHead('LOA Qty'), numHead('Survey Qty'), numHead('Approved'), numHead('Offered'), numHead('Pending offer'), numHead('DI'), numHead('Pending DI'), 'Stage'], materials.map((item) => {
    const track = supplyTrack(item);
    const stage = stageOf(item, track);
    const blob = itemOffers(item).map((offer) => `${offer.offerNo} ${offer.manufacturer} ${offer.status} ${offer.memoNo || ''}`).join(' ');
    const clickable = summaryClickable(item);
    const offerBtn = (isVendor() || isAdmin()) && track.pendingOffer > 0.0001
      ? `<button type="button" class="tiny" data-action="batch-insp-new" data-sl="${item.slNo}">Offer</button>`
      : '';
    const name = clickable
      ? `<button type="button" class="row-link" data-action="open-inspect" data-sl="${item.slNo}">${esc(materialName(item))}</button> ${offerBtn}`
      : `${esc(materialName(item))} ${offerBtn}`;
    return `
      <tr class="${clickable ? 'pick' : ''}" ${clickable ? `data-action="open-inspect" data-sl="${item.slNo}"` : ''} data-q="${esc(searchText(item, materialName(item), track.className, stage.text, blob))}">
        <td>${item.slNo}</td>
        <td class="desc" title="${esc(item.description)}">${name}</td>
        <td>${classBadge(track.className)}</td>
        <td class="num">${qtyText(item.loaQty, item.unit)}</td>
        <td class="num">${surveyText(item)}</td>
        <td class="num">${qtyText(track.approved, item.unit)}</td>
        <td class="num">${qtyText(track.offered, item.unit)}</td>
        <td class="num">${qtyText(track.pendingOffer, item.unit)}</td>
        <td class="num">${qtyText(track.di, item.unit)}</td>
        <td class="num">${qtyText(pendingDiQty(item), item.unit)}</td>
        <td>${statusBadge(stage.text)}</td>
      </tr>
    `;
  }), 11);
}

function summaryClickable(item) {
  if (isVendor() || isAdmin()) return true;
  if (isRegion()) {
    return itemOffers(item).some((offer) => offer.status === 'Offered' || offer.status === 'Cleared' || offer.status === 'Forwarded');
  }
  return false;
}

function offeredTable() {
  const rows = inspectionOffers
    .filter((offer) => offer.status === 'Offered' || offer.status === 'Rejected')
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  return table(['Letter', 'Date', 'Material', numHead('Qty'), 'Manufacturer', 'Premises', 'Office', 'Status'], rows.map((offer) => {
    const item = findItem(offer.itemSl);
    return `
      <tr class="pick" data-action="open-offer-letter" data-id="${esc(offer.offerNo)}" data-q="${esc(`${offer.offerNo} ${offer.manufacturer} ${offer.premises} ${offer.status} ${materialName(item || { description: offer.itemName })}`)}">
        <td><button type="button" class="row-link" data-action="open-offer-letter" data-id="${esc(offer.offerNo)}">${esc(offer.offerNo)}</button></td>
        <td>${esc(offer.date ? isoToDmy(offer.date) : '—')}</td>
        <td class="desc" title="${esc(offer.itemName)}">${esc(item ? materialName(item) : offer.itemName)}</td>
        <td class="num">${qtyText(offer.qty, offer.unit)}</td>
        <td>${esc(offer.manufacturer)}</td>
        <td class="desc" title="${esc(offer.premises)}">${esc(offer.premises)}</td>
        <td>${esc(officeName(offer.class))}</td>
        ${offerDecisionCell(offer)}
      </tr>
    `;
  }), 8, 'No offer is waiting.');
}

function approvedTable() {
  const rows = inspectionOffers
    .filter((offer) => offer.status === 'Cleared' || offer.status === 'Forwarded')
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  return table(['Letter', 'Date', 'Material', numHead('Qty'), 'Office', 'Status', numHead('DI')], rows.map((offer) => {
    const item = findItem(offer.itemSl);
    const issued = offerDiQty(offer);
    return `
      <tr class="pick" data-action="open-offer-letter" data-id="${esc(offer.offerNo)}" data-q="${esc(`${offer.offerNo} ${offer.memoNo || ''} ${offer.status} ${materialName(item || { description: offer.itemName })}`)}">
        <td><button type="button" class="row-link" data-action="open-offer-letter" data-id="${esc(offer.offerNo)}">${esc(offer.offerNo)}</button></td>
        <td>${esc(offer.date ? isoToDmy(offer.date) : '—')}</td>
        <td class="desc" title="${esc(offer.itemName)}">${esc(item ? materialName(item) : offer.itemName)}</td>
        <td class="num">${qtyText(offer.qty, offer.unit)}</td>
        <td>${esc(officeName(offer.class))}</td>
        ${offerDecisionCell(offer)}
        <td class="num">${qtyText(issued, offer.unit)}</td>
      </tr>
    `;
  }), 7, 'No offer has been cleared or forwarded.');
}

function offerDiQty(offer) {
  return sum(dispatchInstructions.filter((row) => row.offerId === offer.id), (row) => Number(row.qty) || 0);
}

function openInspect(sl, offerId) {
  const item = findItem(sl);
  if (!item || !isMaterial(item)) return;
  const canOffer = isVendor() || isAdmin();
  const canAct = isRegion() || isAdmin();
  const offers = itemOffers(item);
  const offer = offerId ? offers.find((row) => row.id === offerId) : null;
  const waiting = offers.filter((row) => row.status === 'Offered');
  const ready = offers.filter((row) => (row.status === 'Cleared' || row.status === 'Forwarded') && offerRemain(row) > 0.0001);
  let mode = 'empty';
  let id = offer ? offer.id : '';
  if (offer) {
    if (canAct && offer.status === 'Offered') mode = 'approve';
    else if (canAct && (offer.status === 'Cleared' || offer.status === 'Forwarded')) mode = 'di';
    else mode = 'note';
  } else if (canAct && isRegion()) {
    if (waiting.length) { mode = 'approve'; id = waiting[0].id; }
    else if (ready.length) { mode = 'di'; id = ready[0].id; }
  } else if (user.role === 'Admin') {
    if (waiting.length) { mode = 'approve'; id = waiting[0].id; }
    else {
      inspModal = batchInspEntry({ picked: [item.slNo] });
      inspectOpenedAt = Date.now();
      paint();
      return;
    }
  } else if (canOffer) {
    inspModal = batchInspEntry({ picked: [item.slNo] });
    inspectOpenedAt = Date.now();
    paint();
    return;
  }
  inspModal = { sl: item.slNo, offerId: id, mode };
  inspectOpenedAt = Date.now();
  paint();
}

function batchInspEntry(draft = {}) {
  const defaultPicked = draft.picked || [];
  const qtys = { ...(draft.qtys || {}) };
  defaultPicked.forEach((sl) => {
    if (qtys[sl] === undefined) {
      const item = findItem(sl);
      if (item) {
        const room = supplyTrack(item).pendingOffer;
        if (room > 0) qtys[sl] = room;
      }
    }
  });

  return {
    mode: 'batch',
    sl: 0,
    offerId: '',
    draft: {
      offerNo: '',
      date: todayISO(),
      manufacturer: '',
      premises: '',
      remarks: '',
      filter: '',
      picked: defaultPicked,
      qtys,
      ...draft,
      date: draft.date || todayISO()
    }
  };
}

function syncInspectDialog() {
  const dialog = document.getElementById('inspect-dialog');
  if (!dialog) return;
  clearTimeout(inspectTimer);
  const html = dialogContent();
  if (html === null) {
    dialog.innerHTML = '';
    if (dialog.open) dialog.close();
    return;
  }
  dialog.innerHTML = html;
  dialog.classList.toggle('wide', Boolean(
    (entryModal && entryModal.page === 'gtp' && (entryModal.mode === 'batch' || entryModal.mode === 'letter')) ||
    (inspModal && (inspModal.mode === 'batch' || inspModal.mode === 'letter'))
  ));
  const batchForm = dialog.querySelector('#form-gtp-batch');
  if (batchForm) {
    filterPicks(batchForm);
    updateBatchCount(batchForm);
  }
  const decisionForm = dialog.querySelector('#form-decision-batch');
  if (decisionForm) updateDecisionCount(decisionForm);

  const inspBatchForm = dialog.querySelector('#form-insp-batch');
  if (inspBatchForm) {
    filterInspPicks(inspBatchForm);
    updateInspBatchCount(inspBatchForm);
  }
  const inspDecisionForm = dialog.querySelector('#form-insp-decision-batch');
  if (inspDecisionForm) updateInspDecisionCount(inspDecisionForm);

  if (!dialog.open) {
    inspectTimer = setTimeout(() => {
      if ((inspModal || entryModal) && !dialog.open) dialog.showModal();
    }, 0);
  }
}

function dialogContent() {
  if (currentPage === 'di' && inspModal) {
    if (inspModal.mode === 'batch') return inspBatchModal();
    if (inspModal.mode === 'letter') return inspLetterModal();
    const item = findItem(inspModal.sl);
    return item ? inspectModal(item) : '';
  }
  if (entryModal) return entryModalHtml();
  return null;
}

function inspBatchModal() {
  const draft = inspModal.draft;
  const picked = new Set(draft.picked.map(Number));
  const rows = boqItems.filter(isMaterial).map((item) => {
    const track = supplyTrack(item);
    const notApproved = !(track.approved > 0);
    const fullyOffered = !notApproved && !(track.pendingOffer > 0.0001);
    const locked = notApproved || fullyOffered;
    const checked = !locked && picked.has(item.slNo);
    const offeredVal = draft.qtys[item.slNo] !== undefined
      ? draft.qtys[item.slNo]
      : (track.pendingOffer > 0 ? track.pendingOffer : '');

    let statusHtml = '';
    if (notApproved) {
      statusHtml = '<span class="badge wait">GTP / Vendor not approved</span>';
    } else if (fullyOffered) {
      statusHtml = `<span class="badge ok">Fully offered (${fmtQty(track.offered)} ${item.unit})</span>`;
    } else {
      statusHtml = `<span class="meta">Appr: <strong>${qtyText(track.approved, item.unit)}</strong> · Left: <strong>${qtyText(track.pendingOffer, item.unit)}</strong></span>`;
    }

    return `
      <div class="insp-pick-row${locked ? ' locked' : ''}${checked ? ' on' : ''}" data-q="${esc(searchText(item, materialName(item), track.className))}">
        <label class="pick-check">
          <input type="checkbox" name="pick" value="${item.slNo}" ${checked ? 'checked' : ''} ${locked ? 'disabled' : ''} />
          <span class="pick-main">
            <strong><span class="pick-sl">${item.slNo}</span>${esc(materialName(item))}</strong>
            <span class="meta">LOA ${qtyText(item.loaQty, item.unit)} · Survey ${surveyText(item)}</span>
          </span>
        </label>
        <div>${classBadge(track.className)}</div>
        <div>${statusHtml}</div>
        <div>
          <input type="number" class="pick-qty-in" name="qty-${item.slNo}" data-qty-sl="${item.slNo}" min="0.001" max="${track.pendingOffer || 0}" step="any" value="${esc(offeredVal)}" placeholder="${locked ? '—' : `Max ${fmtQty(track.pendingOffer)}`}" ${locked || !checked ? 'disabled' : ''} />
        </div>
      </div>
    `;
  }).join('');

  return `
    <div class="modal-head">
      <div>
        <h2>New Inspection Offer</h2>
        <p>Raise an inspection call letter covering multiple materials under one reference.</p>
      </div>
      <button type="button" class="ghost" data-action="close-modal">Close</button>
    </div>
    <form class="entry entry-plain batch-form" id="form-insp-batch">
      <label>Offer letter no. <input name="offerNo" required placeholder="e.g. TE/INSP/2026/001" value="${esc(draft.offerNo)}" /></label>
      <label>Offer date <input name="date" type="date" required value="${esc(draft.date)}" /></label>
      <label>Manufacturer <input name="manufacturer" required placeholder="e.g. Polycab India Ltd" value="${esc(draft.manufacturer)}" /></label>
      <label class="span-2">Premises <input name="premises" required placeholder="e.g. Halol Works, Vadodara, Gujarat" value="${esc(draft.premises)}" /></label>
      <label class="span-2">Remarks <input name="remarks" placeholder="Optional reference remarks" value="${esc(draft.remarks)}" /></label>

      <div class="batch-toolbar span-all">
        <input type="search" class="insp-pick-search" placeholder="Filter materials…" value="${esc(draft.filter)}" aria-label="Filter materials" />
        <button type="button" class="tiny" data-action="batch-insp-all">Tick all eligible shown</button>
        <button type="button" class="tiny" data-action="batch-insp-none">Clear ticks</button>
      </div>

      <div class="pick-list span-all">
        <div class="pick-head insp-pick-head">
          <span>Material</span>
          <span>Office</span>
          <span>Approved / Remaining</span>
          <span style="text-align: right;">This Offer Qty</span>
        </div>
        ${rows || '<p class="pick-empty">No material items in the BOQ.</p>'}
        <p class="pick-empty filter-miss" hidden>No material matches the filter.</p>
      </div>

      <div class="batch-foot span-all">
        <span class="batch-count" data-insp-count></span>
        <button class="primary" type="submit" data-insp-submit>Submit inspection offer</button>
      </div>
      <p class="form-msg span-all"></p>
    </form>
  `;
}

function inspLetterModal() {
  const group = findOfferGroup(inspModal.offerNo);
  if (!group) return `${modalTitle('Offer letter not found', 'It may have been modified or deleted.')}`;
  const canDecide = (isRegion() || isAdmin()) && group.waiting > 0;
  const canOffer = isVendor() || isAdmin();
  const sub = `Submitted: ${group.date ? isoToDmy(group.date) : '—'} · ${esc(group.manufacturer)} (${esc(group.premises)}) · ${group.rows.length} ${group.rows.length === 1 ? 'material' : 'materials'}`;

  return `
    ${modalTitle(`Inspection Offer · ${esc(group.offerNo)}`, esc(sub))}
    ${canDecide ? inspLetterDecisionForm(group) : inspLetterSummary(group)}
  `;
}

function inspLetterSummary(group) {
  const canAct = isRegion() || isAdmin();
  return table(['Sl', 'Material', 'Office', numHead('Offered Qty'), 'Status', 'Decision memo', 'Action'], group.rows.map(({ item, offer }) => {
    const isReadyForDi = (offer.status === 'Cleared' || offer.status === 'Forwarded') && offerRemain(offer) > 0.0001;
    const diBtn = canAct && isReadyForDi
      ? `<button type="button" class="tiny primary" data-action="open-inspect" data-sl="${offer.itemSl}" data-offer="${esc(offer.id)}">Issue DI</button>`
      : '';
    const issued = offerDiQty(offer);
    const diInfo = issued > 0 ? `<span class="meta">DI issued: ${qtyText(issued, offer.unit)}</span>` : '';

    return `
      <tr>
        <td>${offer.itemSl}</td>
        <td class="desc" title="${esc(offer.itemName)}">${esc(item ? materialName(item) : offer.itemName)}</td>
        <td>${classBadge(offer.class)}</td>
        <td class="num">${qtyText(offer.qty, offer.unit)}</td>
        <td>${statusBadge(offer.status)}</td>
        <td class="desc">${offer.memoNo ? `<strong>${esc(offer.memoNo)}</strong><span class="meta">${isoToDmy(offer.actionDate)} · ${esc(offer.actionRemarks || '')}</span>` : '—'}${diInfo}</td>
        <td>${diBtn}</td>
      </tr>
    `;
  }), 7);
}

function inspLetterDecisionForm(group) {
  const rows = group.rows.map(({ item, offer }) => {
    const open = offer.status === 'Offered';
    const isCentral = offer.class === 'Central';
    const initial = isCentral ? 'Forwarded' : 'Cleared';

    const choices = isCentral
      ? [['Forwarded', 'Forward to HQ'], ['Rejected', 'Reject'], ['Skip', 'Skip']]
      : [['Cleared', 'Clear inspection'], ['Rejected', 'Reject'], ['Skip', 'Skip']];

    const decision = open
      ? `<div class="seg-group" role="radiogroup" aria-label="Decision for Sl ${offer.itemSl}">${choices.map(([value, label]) => `<label class="seg seg-${value.toLowerCase()}"><input type="radio" name="dec-${offer.id}" value="${value}" ${value === initial ? 'checked' : ''} /><span>${label}</span></label>`).join('')}</div>`
      : statusBadge(offer.status);

    return `
      <tr class="${open ? 'insp-dec-row' : 'dec-done'}" data-class="${esc(offer.class)}">
        <td>${offer.itemSl}</td>
        <td class="desc" title="${esc(offer.itemName)}">${esc(item ? materialName(item) : offer.itemName)}</td>
        <td>${classBadge(offer.class)}</td>
        <td class="num">${qtyText(offer.qty, offer.unit)}</td>
        <td>${statusBadge(offer.status)}</td>
        <td>${decision}</td>
      </tr>
    `;
  });

  return `
    <form class="entry entry-plain batch-form" id="form-insp-decision-batch">
      <input type="hidden" name="offerNo" value="${esc(group.offerNo)}" />
      <div class="batch-toolbar span-all">
        <span class="batch-label">Set open rows to:</span>
        <span class="choice">
          <button type="button" class="choice-btn" data-action="batch-insp-dec-set" data-dec="ClearForward">Clear / Forward all</button>
          <button type="button" class="choice-btn" data-action="batch-insp-dec-set" data-dec="Rejected">Reject all</button>
        </span>
      </div>
      <div class="span-all batch-sheet">
        ${table(['Sl', 'Material', 'Office', numHead('Offered Qty'), 'Current status', 'Decision'], rows, 6)}
      </div>
      <label>Memo no. <input name="memoNo" required placeholder="e.g. RM/MALDA/INSP/2026/001" /></label>
      <label>Memo date <input name="date" type="date" required value="${todayISO()}" /></label>
      <label class="span-2">Remarks <input name="remarks" placeholder="Required if any item is rejected" /></label>
      <div class="batch-foot span-all">
        <span class="batch-count" data-insp-dec-count></span>
        <button class="primary" type="submit" data-insp-dec-submit>Save decisions</button>
      </div>
      <p class="form-msg span-all"></p>
    </form>
  `;
}

function inspectModal(item) {
  const track = supplyTrack(item);
  const canAct = isRegion() || isAdmin();
  return `
    <div class="modal-head">
      <div>
        <h2>Sl ${item.slNo} · ${esc(materialName(item))}</h2>
        <p>${classBadge(track.className)} ${esc(officeName(track.className))} · Approved ${qtyText(track.approved, item.unit)} · Offered ${qtyText(track.offered, item.unit)}</p>
      </div>
      <button type="button" class="ghost" data-action="close-modal">Close</button>
    </div>
    ${canAct && inspModal.mode === 'offer' ? `${classSwitch(item)}<p class="quiet">New offers use this office. Saved offers keep theirs.</p>` : ''}
    ${modalBody(item, track)}
  `;
}

function modalBody(item, track) {
  if (inspModal.mode === 'offer') return offerModalForm(item, track);
  if (inspModal.mode === 'approve') return approveModalForm(item, track);
  if (inspModal.mode === 'di') return diModalForm(item);
  if (inspModal.mode === 'note') return offerNote(item);
  return '<p class="quiet">No offer has been submitted for this material.</p>';
}

function classSwitch(item) {
  const current = supplyClass(item);
  return `
    <div class="choice">
      <button type="button" class="choice-btn${current === 'Local' ? ' active' : ''}" data-action="set-class" data-class="Local" data-sl="${item.slNo}">Local</button>
      <button type="button" class="choice-btn${current === 'Central' ? ' active' : ''}" data-action="set-class" data-class="Central" data-sl="${item.slNo}">Central</button>
    </div>
  `;
}

function offerModalForm(item, track) {
  const room = Math.max(0, track.pendingOffer);
  const note = !(track.approved > 0)
    ? 'Both the vendor letter and the GTP must be approved before this offer can be saved.'
    : !(room > 0.0001)
      ? 'The approved quantity is fully offered.'
      : `${officeName(track.className)} · ${fmtQty(room)} ${item.unit} left to offer`;
  const waiting = itemOffers(item).filter((offer) => offer.status === 'Offered');
  return `
    <form class="entry entry-plain" id="form-offer">
      <input type="hidden" name="item" value="${item.slNo}" />
      <label>Offer letter <input name="offerNo" required placeholder="Offer letter no." /></label>
      <label>Offer date <input name="date" type="date" required value="${todayISO()}" /></label>
      <label>Qty <input name="qty" type="number" min="0.001" step="any" required placeholder="Up to ${fmtQty(room)}" /></label>
      <label>Manufacturer <input name="manufacturer" required placeholder="Manufacturer" /></label>
      <label class="span-2">Premises <input name="premises" required placeholder="Manufacturer premises" /></label>
      <label class="span-2">Remarks <input name="remarks" placeholder="Optional" /></label>
      <p class="offer-room span-all">${esc(note)}</p>
      <div class="actions">
        <button class="primary" type="submit">Save offer</button>
        ${user.role === 'Admin' && waiting.length ? `<button type="button" class="ghost" data-action="inspect-mode" data-mode="approve" data-offer="${esc(waiting[0].id)}">Review submitted offer</button>` : ''}
      </div>
      <p class="form-msg span-all"></p>
    </form>
  `;
}

function approveModalForm(item, track) {
  const waiting = itemOffers(item).filter((offer) => offer.status === 'Offered');
  if (!waiting.length) return '<p class="quiet">No offer is waiting on this material.</p>';
  const current = waiting.find((offer) => offer.id === inspModal.offerId) || waiting[0];
  const central = current.class === 'Central';
  return `
    <form class="entry entry-plain" id="form-offer-action">
      <input type="hidden" name="decision" value="${central ? 'Forwarded' : 'Cleared'}" />
      <label class="span-2">Offer
        <select name="offer" required>
          ${waiting.map((offer) => `<option value="${esc(offer.id)}" data-class="${esc(offer.class)}" data-premises="${esc(offer.premises)}"${offer.id === current.id ? ' selected' : ''}>${esc(offer.offerNo)} · ${qtyText(offer.qty, item.unit)} · ${esc(offer.manufacturer)} · ${esc(officeName(offer.class))}</option>`).join('')}
        </select>
      </label>
      <div class="field span-2">
        <span>Decision</span>
        <span class="choice for-local"${central ? ' hidden' : ''}>
          <button type="button" class="choice-btn${central ? '' : ' active'}" data-action="pick-decision" data-decision="Cleared">Clear</button>
          <button type="button" class="choice-btn" data-action="pick-decision" data-decision="Rejected">Reject</button>
        </span>
        <span class="choice for-central"${central ? '' : ' hidden'}>
          <button type="button" class="choice-btn active" data-action="pick-decision" data-decision="Forwarded">Forward to HQ/ZM</button>
        </span>
      </div>
      <label>Memo no. <input name="memoNo" required placeholder="Ref. memo no." /></label>
      <label>Date <input name="date" type="date" required value="${todayISO()}" /></label>
      <label class="span-2">Remarks <input name="remarks" required placeholder="Inspection or forward remark" /></label>
      <p class="offer-room span-all">${esc(current.premises)}. Local offers are cleared or rejected by RM/ZM. Central offers are forwarded to HQ/ZM.</p>
      <div class="actions">
        <button class="primary" type="submit">Save decision</button>
        ${user.role === 'Admin' && track.pendingOffer > 0.0001 ? '<button type="button" class="ghost" data-action="inspect-mode" data-mode="offer">New offer</button>' : ''}
      </div>
      <p class="form-msg span-all"></p>
    </form>
  `;
}

function diModalForm(item) {
  const ready = itemOffers(item).filter((offer) => (offer.status === 'Cleared' || offer.status === 'Forwarded') && offerRemain(offer) > 0.0001);
  const current = ready.find((offer) => offer.id === inspModal.offerId) || ready[0];
  if (!current) {
    const done = itemDis(item).filter((row) => !inspModal.offerId || row.offerId === inspModal.offerId);
    if (!done.length) return '<p class="quiet">Clear a local offer, or forward a central offer, before issuing a DI.</p>';
    return `<p class="quiet">DI already issued: ${done.map((row) => `${esc(row.diNo)} · ${qtyText(row.qty, item.unit)}`).join(', ')}</p>`;
  }
  return `
    <form class="entry entry-plain" id="form-di">
      <label class="span-2">Offer
        <select name="offer" required>
          ${ready.map((offer) => `<option value="${esc(offer.id)}"${offer.id === current.id ? ' selected' : ''}>${esc(offer.offerNo)} · ${qtyText(offerRemain(offer), item.unit)} left · ${esc(officeName(offer.class))}</option>`).join('')}
        </select>
      </label>
      <label>DI number <input name="diNo" required placeholder="DI/MALDA/2026/001" /></label>
      <label>DI date <input name="date" type="date" required value="${todayISO()}" /></label>
      <label>Qty <input name="qty" type="number" min="0.001" step="any" required placeholder="Up to ${fmtQty(offerRemain(current))}" /></label>
      <div class="actions"><button class="primary" type="submit">Issue DI</button></div>
      <p class="form-msg span-all"></p>
    </form>
  `;
}

function offerNote(item) {
  const offer = itemOffers(item).find((row) => row.id === inspModal.offerId);
  if (!offer) return '<p class="quiet">Offer not found.</p>';
  const lines = [
    `${offer.offerNo} · ${offer.date} · ${qtyText(offer.qty, item.unit)}`,
    `${offer.manufacturer} · ${offer.premises}`,
    `${officeName(offer.class)} · ${offer.status}`
  ];
  if (offer.memoNo || offer.actionDate) lines.push([offer.actionDate, offer.memoNo].filter(Boolean).join(' · '));
  if (offer.actionRemarks || offer.remarks) lines.push(offer.actionRemarks || offer.remarks);
  return `<p class="quiet">${lines.map((line) => esc(line)).join('<br>')}</p>`;
}

function openEntry(sl, id, mode) {
  inspModal = null;
  if (currentPage === 'gtp') prepareGtp(sl, id, mode);
  else if (currentPage === 'billing') prepareBill(id, mode);
  else if (currentPage === 'daily') prepareDaily(sl, id);
  else if (currentPage === 'receive') prepareReceive(sl, id);
  else if (currentPage === 'boq') {
    entryModal = { page: 'boq', sl, id: '', mode: mode === 'new' && user.role === 'Admin' ? 'new' : (user.role === 'Admin' ? 'edit' : 'survey') };
  } else {
    entryModal = null;
  }
  if (!entryModal) return;
  inspectOpenedAt = Date.now();
  paint();
}

function prepareGtp(sl, id, mode) {
  if (mode === 'new' && (isAdmin() || isVendor())) {
    entryModal = { page: 'gtp', sl: 0, id: '', mode: 'newMaterial' };
    return;
  }
  const kind = id === 'gtp' || id === 'vendor' ? id : (gtpTab === 'gtp' ? 'gtp' : 'vendor');
  const item = findItem(sl);
  const record = item ? approvalRecord(item, kind) : null;
  const waiting = record && ['Submitted', 'Hold', 'Rejected'].includes(record.status);
  const canSubmit = isVendor() || isAdmin();
  const canApprove = isRegion() || isAdmin();
  let modalMode = 'note';
  if (canApprove && !isVendor() && waiting) modalMode = 'decision';
  else if (canSubmit && record && record.status !== 'Approved') {
    // Opening one item starts a letter with it ticked; more items can be added before submitting.
    entryModal = batchEntry({ kind, picked: [item.slNo], letterNo: record.status === 'Rejected' ? '' : record.letterNo, vendor: record.vendor || '' });
    return;
  }
  entryModal = item ? { page: 'gtp', sl: item.slNo, id: kind, mode: modalMode } : null;
}

function batchEntry(draft = {}) {
  const kind = ['vendor', 'gtp', 'both'].includes(draft.kind) ? draft.kind : (gtpTab === 'gtp' ? 'gtp' : 'vendor');
  return {
    page: 'gtp',
    sl: 0,
    id: '',
    mode: 'batch',
    draft: { letterNo: '', date: todayISO(), vendor: '', picked: [], vendors: {}, filter: '', ...draft, date: draft.date || todayISO(), kind }
  };
}

function prepareBill(id, mode) {
  if (mode === 'new') {
    if (!isVendor() && !isAdmin()) return;
    const type = billTab === 'erection' ? 'Erection' : 'Supply';
    entryModal = {
      page: 'billing',
      sl: 0,
      id: '',
      mode: 'new',
      type,
      draft: { invoiceNo: '', date: todayISO() }
    };
    return;
  }
  const invoice = invoices.find((row) => row.id === id);
  const canPay = (isRegion() || isAdmin()) && invoice && invoice.payStatus !== 'Paid';
  entryModal = invoice ? { page: 'billing', sl: 0, id, mode: canPay ? 'pay' : 'note' } : null;
}

function prepareDaily(sl, id) {
  if (id) {
    const log = dailyLogs.find((row) => row.id === id);
    const canVerify = (isRegion() || isAdmin()) && log && log.approvalStatus !== 'Approved';
    entryModal = log ? { page: 'daily', sl: log.itemSl, id, mode: canVerify ? 'verify' : 'note' } : null;
    return;
  }
  const canLog = isVendor() || isAdmin();
  entryModal = findItem(sl) ? { page: 'daily', sl, id: '', mode: canLog ? 'log' : 'note' } : null;
}

function prepareReceive(sl, id) {
  if (id) {
    entryModal = { page: 'receive', sl, id, mode: 'note' };
    return;
  }
  const canReceive = user.role === 'Store' || user.role === 'Admin';
  entryModal = findItem(sl) ? { page: 'receive', sl, id: '', mode: canReceive ? 'srv' : 'note' } : null;
}

function entryModalHtml() {
  if (entryModal.page === 'boq') return boqModal();
  if (entryModal.page === 'gtp') return gtpModal();
  if (entryModal.page === 'billing') return billModal();
  if (entryModal.page === 'daily') return dailyModal();
  if (entryModal.page === 'receive') return receiveModal();
  return '';
}

function boqModal() {
  const item = entryModal.mode === 'new' ? null : findItem(entryModal.sl);
  if (entryModal.mode !== 'new' && !item) return '';
  if (entryModal.mode === 'survey') {
    const sub = `LOA ${qtyText(item.loaQty, item.unit)} · Survey ${surveyText(item)}`;
    return `
      ${modalTitle(`Sl ${item.slNo} · ${esc(itemTitle(item))}`, sub)}
      <form class="entry entry-plain" id="form-survey">
        <input type="hidden" name="item" value="${item.slNo}" />
        <label>Survey qty <input name="survey" type="number" min="0" step="any" required placeholder="Survey quantity" value="${surveyValue(item)}" /></label>
        <div class="actions"><button class="primary" type="submit">Save survey qty</button></div>
        <p class="form-msg span-all"></p>
      </form>
    `;
  }
  const title = item ? `Sl ${item.slNo} · ${esc(itemTitle(item))}` : 'New item';
  const sub = item ? `LOA ${qtyText(item.loaQty, item.unit)} · Survey ${surveyText(item)}` : 'Survey quantity can be filled now or later.';
  return `
    ${modalTitle(title, sub)}
    <form class="entry entry-plain" id="form-boq">
      <input type="hidden" name="item" value="${item ? item.slNo : 0}" />
      ${boqFields(item)}
      <div class="actions"><button class="primary" type="submit">${item ? 'Save' : 'Save item'}</button></div>
      <p class="form-msg span-all"></p>
    </form>
  `;
}

function boqFields(item) {
  const erection = item && String(item.part).includes('Erection');
  return `
    <label>Part
      <select name="part">
        <option${erection ? '' : ' selected'}>Part-A (Material)</option>
        <option${erection ? ' selected' : ''}>Part-B (Erection)</option>
      </select>
    </label>
    <label>Category <input name="category" required value="${item ? esc(item.category) : ''}" placeholder="Cables / HDD / RMU" /></label>
    <label>Unit <input name="unit" required value="${item ? esc(item.unit) : ''}" placeholder="M / KM / SET" /></label>
    <label>LOA qty <input name="loa" type="number" min="0" step="any" required value="${item ? esc(item.loaQty) : ''}" /></label>
    <label class="span-2">Description <input name="description" required value="${item ? esc(item.description) : ''}" /></label>
    <label>Survey qty <input name="survey" type="number" min="0" step="any" placeholder="Later" value="${surveyValue(item)}" /></label>
    <label>Rate (₹) <input name="rate" type="number" min="0" step="any" required value="${item ? esc(item.rate) : ''}" /></label>
  `;
}

function gtpNewMaterialModal() {
  return `
    ${modalTitle('New Material Item', 'Enter the material description, unit, LOA quantity, and optional survey quantity.')}
    <form class="entry entry-plain" id="form-boq">
      <input type="hidden" name="item" value="0" />
      <input type="hidden" name="part" value="Part-A (Material)" />
      <input type="hidden" name="category" value="Material" />
      <input type="hidden" name="rate" value="0" />
      
      <label class="span-2">Material Name / Description
        <input name="description" required placeholder="e.g. 33kV 3C x 300 sqmm XLPE Cable" />
      </label>
      <label>Unit
        <input name="unit" required placeholder="M / KM / SET / NOS" />
      </label>
      <label>LOA Qty
        <input name="loa" type="number" min="0" step="any" required placeholder="LOA Quantity" />
      </label>
      <label>Survey Qty
        <input name="survey" type="number" min="0" step="any" placeholder="Survey Qty (optional)" />
      </label>
      <div class="actions span-all">
        <button class="primary" type="submit">Save Material Item</button>
      </div>
      <p class="form-msg span-all"></p>
    </form>
  `;
}

function gtpModal() {
  if (entryModal.mode === 'newMaterial') return gtpNewMaterialModal();
  if (entryModal.mode === 'batch') return gtpBatchModal();
  if (entryModal.mode === 'letter') return gtpLetterModal();
  const item = findItem(entryModal.sl);
  if (!item) return '';
  const kind = entryModal.id === 'gtp' ? 'gtp' : 'vendor';
  const records = itemApprovals(item, kind);
  const primaryRecord = approvalRecord(item, kind);
  const label = kind === 'gtp' ? 'GTP' : 'Vendor';
  const sub = `${label} · LOA ${qtyText(item.loaQty, item.unit)} · Survey ${surveyText(item)}`;
  let body = gtpNotes(records, item, kind);
  if (entryModal.mode === 'decision') body = gtpDecisionForm(item, kind);
  const canSubmit = isVendor() || isAdmin();
  const canDecide = (isRegion() || isAdmin()) && records.some((r) => GTP_WAITING.includes(r.status));
  return `
    ${modalTitle(`Sl ${item.slNo} · ${esc(materialName(item))}`, sub)}
    ${body}
    <div class="actions">
      ${canSubmit ? `<button type="button" class="ghost" data-action="batch-new" data-kind="${kind}" data-sl="${item.slNo}">Submit new letter</button>` : ''}
      ${entryModal.mode !== 'decision' && canDecide ? `<button type="button" class="ghost" data-action="entry-mode" data-mode="decision">Decision</button>` : ''}
      ${user.role === 'Admin' && records.length ? `<button type="button" class="ghost danger" data-action="delete-approval" data-sl="${item.slNo}" data-kind="${kind}">Delete all for this item</button>` : ''}
    </div>
  `;
}

function batchKinds(kind) {
  return kind === 'both' ? ['vendor', 'gtp'] : [kind === 'gtp' ? 'gtp' : 'vendor'];
}

function gtpBatchModal() {
  const draft = entryModal.draft;
  if (draft.previewing) return gtpBatchPreviewModal(draft);
  const kinds = batchKinds(draft.kind);
  const picked = new Set(draft.picked.map(Number));
  const rowHint = 'Vendor name / Manufacturer (required)';
  const rows = boqItems.filter(isMaterial).map((item) => {
    const open = kinds.filter((kind) => approvalRecord(item, kind).status !== 'Approved');
    const locked = open.length === 0;
    const checked = !locked && picked.has(item.slNo);
    const resubmit = open.some((kind) => GTP_WAITING.includes(approvalRecord(item, kind).status));
    const existing = approvalRecord(item, 'vendor').vendor;
    const vendorValue = draft.vendors[item.slNo] ?? (isRealVendor(existing) ? existing : '');
    const status = kinds.map((kind) => `<span class="pick-kind">${kinds.length > 1 ? `<em>${kind === 'gtp' ? 'GTP' : 'Vendor'}</em>` : ''}${miniStatus(approvalRecord(item, kind))}</span>`).join('');
    const note = locked ? ' · already approved' : resubmit ? ' · will be re-submitted' : '';
    return `
      <div class="pick-row${locked ? ' locked' : ''}${checked ? ' on' : ''}" data-q="${esc(searchText(item, materialName(item), vendorValue))}">
        <label class="pick-check">
          <input type="checkbox" name="pick" value="${item.slNo}" ${checked ? 'checked' : ''} ${locked ? 'disabled' : ''} />
          <span class="pick-main">
            <strong><span class="pick-sl">${item.slNo}</span>${esc(materialName(item))}</strong>
            <span class="meta">LOA ${qtyText(item.loaQty, item.unit)} · Survey ${surveyText(item)}${note}</span>
          </span>
        </label>
        <span class="pick-status">${status}</span>
        <input class="pick-vendor" type="text" data-vendor-sl="${item.slNo}" value="${esc(vendorValue)}" placeholder="${esc(rowHint)}" aria-label="Vendor for Sl ${item.slNo}" ${locked ? 'disabled' : ''} />
      </div>
    `;
  }).join('');
  return `
    ${modalTitle('New submission', 'One letter can cover many materials. Fill the reference once, then tick every material it covers.')}
    <form class="entry entry-plain batch-form" id="form-gtp-batch">
      <div class="field span-all">
        <span>Submitting</span>
        <span class="choice">
          ${[['vendor', 'Vendor approval'], ['gtp', 'GTP'], ['both', 'Vendor + GTP together']].map(([value, label]) => `<button type="button" class="choice-btn${draft.kind === value ? ' active' : ''}" data-action="batch-kind" data-kind="${value}">${label}</button>`).join('')}
        </span>
      </div>
      <label>Letter no. <input name="letterNo" required placeholder="e.g. TE/MALDA/2026/014" value="${esc(draft.letterNo)}" /></label>
      <label>Letter date <input name="date" type="date" required value="${esc(draft.date)}" /></label>
      <div class="batch-toolbar span-all">
        <input type="search" class="pick-search" placeholder="Filter materials…" value="${esc(draft.filter)}" aria-label="Filter materials" />
        <button type="button" class="tiny" data-action="batch-all">Tick all shown</button>
        <button type="button" class="tiny" data-action="batch-none">Clear ticks</button>
      </div>
      <div class="pick-list span-all">
        <div class="pick-head"><span>Material</span><span>Current status</span><span>Vendor / Manufacturer (Required)</span></div>
        ${rows || '<p class="pick-empty">No material items in the BOQ.</p>'}
        <p class="pick-empty filter-miss" hidden>No material matches the filter.</p>
      </div>
      <div class="batch-foot span-all">
        <span class="batch-count" data-count></span>
        <button class="primary" type="submit" data-submit>Preview letter</button>
      </div>
      <p class="form-msg span-all"></p>
    </form>
  `;
}

function gtpBatchPreviewModal(draft) {
  const typeLabel = draft.kind === 'both' ? 'Vendor approval + GTP' : draft.kind === 'gtp' ? 'GTP submission' : 'Vendor approval';
  const payloads = draft.payloads || [];
  const uniqueSl = [...new Set(payloads.map((p) => p.itemSl))];

  const rows = uniqueSl.map((sl) => {
    const item = findItem(sl);
    const itemPayloads = payloads.filter((p) => p.itemSl === sl);
    const commentVal = itemPayloads[0]?.vendor || '—';
    return `
      <tr>
        <td>${sl}</td>
        <td class="desc" title="${esc(item?.description || '')}"><strong>${esc(materialName(item || { description: '' }))}</strong></td>
        <td class="num">${qtyText(item?.loaQty || 0, item?.unit || '')}</td>
        <td class="num">${surveyText(item)}</td>
        <td>${esc(commentVal)}</td>
      </tr>
    `;
  });

  return `
    ${modalTitle('Preview & Confirm Submission', `Review details for letter reference ${esc(draft.letterNo)} before submitting.`)}
    <div style="background: rgba(0,0,0,0.03); padding: 1rem; border-radius: 8px; margin-bottom: 1rem; display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 1rem;" class="span-all">
      <div><span class="meta">Letter No.</span><br><strong>${esc(draft.letterNo)}</strong></div>
      <div><span class="meta">Letter Date</span><br><strong>${esc(isoToDmy(draft.date))}</strong></div>
      <div><span class="meta">Submission Type</span><br><strong>${esc(typeLabel)}</strong></div>
      <div><span class="meta">Materials Covered</span><br><strong>${uniqueSl.length} ${uniqueSl.length === 1 ? 'material' : 'materials'}</strong></div>
    </div>

    <div class="span-all batch-sheet" style="max-height: 250px; overflow-y: auto; margin-bottom: 1rem;">
      ${table(['Sl', 'Material', numHead('LOA Qty'), numHead('Survey Qty'), 'Vendor / Manufacturer'], rows, 5)}
    </div>

    <div class="actions span-all" style="display: flex; justify-content: space-between; align-items: center; width: 100%;">
      <button type="button" class="ghost" data-action="batch-cancel-preview">← Back to Edit</button>
      <button type="button" class="primary" data-action="batch-confirm-submit">Confirm & Submit Letter</button>
    </div>
  `;
}

function gtpLetterModal() {
  const group = findGroup(entryModal.id);
  if (entryModal?.mode === 'rectifyLetter') return gtpRectifyLetterModal(group);
  if (!group) return `${modalTitle('Letter not found', 'It may have been re-submitted under a new reference.')}`;
  const canDecide = (isRegion() || isAdmin()) && group.waiting > 0;
  const canSubmit = isVendor() || isAdmin();
  const sub = `${kindLabel(group.kind)} · Submitted ${group.subDate ? isoToDmy(group.subDate) : '—'} · ${group.rows.length} ${group.rows.length === 1 ? 'material' : 'materials'}`;
  const adminActions = user.role === 'Admin'
    ? `<div class="actions" style="margin-top: 12px; display: flex; gap: 8px;">
         <button type="button" class="ghost" data-action="open-rectify-letter" data-kind="${group.kind}" data-letter="${esc(group.letterNo)}">✏️ Rectify Letter Tagging</button>
         <button type="button" class="ghost danger" data-action="delete-approval-letter" data-kind="${group.kind}" data-letter="${esc(group.letterNo)}">Delete letter</button>
       </div>`
    : '';
  return `
    ${modalTitle(`${kindBadge(group.kind)} ${esc(group.letterNo)}`, esc(sub))}
    ${canDecide ? letterDecisionForm(group) : letterSummary(group)}
    ${adminActions}
  `;
}

function gtpRectifyLetterModal(group) {
  if (!group) return modalTitle('Letter not found', 'Cannot rectify missing letter.');
  const vendorVal = group.rows[0]?.record?.vendor || '';
  return `
    ${modalTitle(`Rectify Tagging: ${esc(group.letterNo)}`, 'Admin tool to rectify mistaken tagging (Vendor vs GTP), letter reference number, vendor name, or date.')}
    <form class="entry entry-plain" id="form-rectify-letter">
      <input type="hidden" name="oldKind" value="${esc(group.kind)}" />
      <input type="hidden" name="oldLetterNo" value="${esc(group.letterNo)}" />

      <label class="span-2">Approval Type / Tagging
        <select name="newKind" style="padding: 8px; border: 1px solid var(--line); border-radius: 6px; background: #fff; color: var(--text);">
          <option value="vendor"${group.kind === 'vendor' ? ' selected' : ''}>Vendor Approval (kind = vendor)</option>
          <option value="gtp"${group.kind === 'gtp' ? ' selected' : ''}>GTP Approval (kind = gtp)</option>
        </select>
      </label>

      <label>Letter Reference No.
        <input name="newLetterNo" required value="${esc(group.letterNo)}" placeholder="e.g. TE-HO/RM/Malda_UG/025" />
      </label>

      <label>Vendor / Manufacturer Name
        <input name="newVendor" required value="${esc(vendorVal)}" placeholder="e.g. Polycab India Ltd" />
      </label>

      <label class="span-2">Submission Date
        <input name="newSubDate" type="date" value="${esc(group.subDate || '')}" />
      </label>

      <div class="actions span-all" style="display: flex; gap: 8px; margin-top: 12px;">
        <button class="primary" type="submit">Save Rectified Tagging</button>
        <button type="button" class="ghost" data-action="cancel-rectify-letter">Cancel</button>
      </div>
      <p class="form-msg span-all"></p>
    </form>
  `;
}

function letterSummary(group) {
  return table(['Sl', 'Material', 'Vendor', numHead('LOA Qty'), numHead('Approved Qty'), 'Decision'], group.rows.map(({ item, record }) => {
    const stored = Number(record.approvedQty);
    const approved = record.status === 'Approved' ? qtyText(stored > 0 ? stored : item.loaQty, item.unit) : '—';
    return `
      <tr>
        <td>${item.slNo}</td>
        <td class="desc" title="${esc(item.description)}">${esc(materialName(item))}</td>
        <td>${esc(record.vendor || '—')}</td>
        <td class="num">${qtyText(item.loaQty, item.unit)}</td>
        <td class="num">${approved}</td>
        ${decisionCell(record)}
      </tr>
    `;
  }), 6);
}

function letterDecisionForm(group) {
  const choices = [['Approved', 'Approve'], ['Hold', 'Hold'], ['Rejected', 'Reject'], ['Skip', 'Skip']];
  const rows = group.rows.map(({ item, record }) => {
    const open = GTP_WAITING.includes(record.status);
    const initial = record.status === 'Rejected' ? 'Skip' : 'Approved';
    const stored = Number(record.approvedQty);
    const decision = open
      ? `<div class="seg-group" role="radiogroup" aria-label="Decision for Sl ${item.slNo}">${choices.map(([value, label]) => `<label class="seg seg-${value.toLowerCase()}"><input type="radio" name="dec-${item.slNo}" value="${value}" ${value === initial ? 'checked' : ''} /><span>${label}</span></label>`).join('')}</div>`
      : miniStatus(record);
    const qty = open
      ? `<input class="qty-in" type="number" name="qty-${item.slNo}" min="0" step="any" value="${esc(stored > 0 ? stored : item.loaQty)}" aria-label="Approved quantity for Sl ${item.slNo}" />`
      : (record.status === 'Approved' ? qtyText(stored > 0 ? stored : item.loaQty, item.unit) : '—');
    return `
      <tr class="${open ? 'dec-row' : 'dec-done'}">
        <td>${item.slNo}</td>
        <td class="desc" title="${esc(item.description)}">${esc(materialName(item))}<span class="meta">${esc(record.vendor || 'No vendor named')}</span></td>
        <td class="num">${qtyText(item.loaQty, item.unit)}<span class="meta">Survey ${surveyText(item)}</span></td>
        <td>${miniStatus(record)}</td>
        <td>${decision}</td>
        <td class="num">${qty}</td>
      </tr>
    `;
  });
  return `
    <form class="entry entry-plain batch-form" id="form-decision-batch">
      <input type="hidden" name="group" value="${esc(group.key)}" />
      <div class="batch-toolbar span-all">
        <span class="batch-label">Set every open row to</span>
        <span class="choice">
          <button type="button" class="choice-btn" data-action="batch-set" data-decision="Approved">Approve all</button>
          <button type="button" class="choice-btn" data-action="batch-set" data-decision="Hold">Hold all</button>
          <button type="button" class="choice-btn" data-action="batch-set" data-decision="Rejected">Reject all</button>
        </span>
      </div>
      <div class="span-all batch-sheet">
        ${table(['Sl', 'Material / vendor', numHead('LOA Qty'), 'Now', 'Decision', numHead('Approve qty')], rows, 6)}
      </div>
      <label>Memo no. <input name="memoNo" required placeholder="Ref. memo no." /></label>
      <label>Memo date <input name="date" type="date" required value="${todayISO()}" /></label>
      <label class="span-2">Remarks <input name="remarks" placeholder="Required when any row is held or rejected" /></label>
      <div class="batch-foot span-all">
        <span class="batch-count" data-count></span>
        <button class="primary" type="submit" data-submit>Save decisions</button>
      </div>
      <p class="form-msg span-all"></p>
    </form>
  `;
}

function gtpDecisionForm(item, kind) {
  return `
    <form class="entry entry-plain" id="form-decision">
      <input type="hidden" name="kind" value="${kind}" />
      <input type="hidden" name="item" value="${item.slNo}" />
      <input type="hidden" name="decision" value="Approved" />
      <div class="field span-2">
        <span>Decision</span>
        <span class="choice">
          <button type="button" class="choice-btn active" data-action="pick-decision" data-decision="Approved">Approve</button>
          <button type="button" class="choice-btn" data-action="pick-decision" data-decision="Hold">Hold</button>
          <button type="button" class="choice-btn" data-action="pick-decision" data-decision="Rejected">Reject</button>
        </span>
      </div>
      <label>Memo no. <input name="memoNo" required placeholder="Ref. memo no." /></label>
      <label>Date <input name="date" type="date" required value="${todayISO()}" /></label>
      <label class="span-2">Remarks <input name="remarks" required placeholder="Remark for this decision" /></label>
      <div class="actions"><button class="primary" type="submit">Save decision</button></div>
      <p class="form-msg span-all"></p>
    </form>
  `;
}

function gtpNotes(records, item, kind) {
  if (!records || !records.length) return '<p class="quiet">Not submitted yet.</p>';
  return records.map((record) => {
    const lines = [record.status || 'Not submitted'];
    if (record.vendor) lines.push(`Vendor: ${record.vendor}`);
    if (record.letterNo) lines.push(`Letter: ${record.letterNo}`);
    if (record.subDate) lines.push(`Submitted: ${isoToDmy(record.subDate)}`);
    if (record.memoNo || record.actionDate) lines.push([record.actionDate ? isoToDmy(record.actionDate) : '', record.memoNo ? `Memo: ${record.memoNo}` : ''].filter(Boolean).join(' · '));
    if (record.remarks) lines.push(`Remarks: ${record.remarks}`);
    const adminBtns = user.role === 'Admin' && record.letterNo
      ? `<br><div style="display:flex; gap:6px; margin-top:4px;">
           <button type="button" class="tiny" data-action="open-rectify-letter" data-kind="${kind}" data-letter="${esc(record.letterNo)}">✏️ Rectify tagging</button>
           <button type="button" class="tiny danger" data-action="delete-approval" data-sl="${item.slNo}" data-kind="${kind}" data-letter="${esc(record.letterNo)}">Delete</button>
         </div>`
      : '';
    const openBtn = record.letterNo
      ? `<br><button type="button" class="tiny" style="margin-top:4px;" data-action="open-letter" data-id="${esc(letterKey(kind, record.letterNo))}">Open letter ${esc(record.letterNo)}</button>`
      : '';
    return `
      <div class="gtp-note-card">
        <p class="quiet" style="margin:0;">${lines.map((line) => esc(line)).join('<br>')}${openBtn}${adminBtns}</p>
      </div>
    `;
  }).join('');
}

function billModal() {
  if (entryModal.mode === 'new') return invoiceForm();
  const invoice = invoices.find((row) => row.id === entryModal.id);
  if (!invoice) return '';
  const gross = sum(invoice.lines, (line) => line.gross);
  const gst = sum(invoice.lines, (line) => line.gst);
  const sd = sum(invoice.lines, (line) => line.sd);
  const net = sum(invoice.lines, (line) => line.net);
  const delBtn = user.role === 'Admin'
    ? `<div class="actions" style="margin-top: 12px;"><button type="button" class="ghost danger" data-action="delete-invoice" data-id="${esc(invoice.id)}">Delete invoice</button></div>`
    : '';
  return `
    ${modalTitle(esc(invoice.invoiceNo), `${esc(invoice.type)} · ${esc(invoice.date)} · ${esc(invoice.payStatus === 'Paid' ? 'Paid' : 'Claimed')}`)}
    ${table(['Item', numHead('Qty'), numHead('Amount')], invoice.lines.map((line) => `
      <tr>
        <td class="desc" title="${esc(line.itemName)}">${esc(lineItemTitle(line))}</td>
        <td class="num">${qtyText(line.qty, line.unit)}</td>
        <td class="num">${formatMoney(line.net)}</td>
      </tr>
    `), 3)}
    <p class="quiet">Gross ${formatMoney(gross)} · GST ${formatMoney(gst)} · SD ${formatMoney(sd)} · Net ${formatMoney(net)}</p>
    ${entryModal.mode === 'pay' ? `
      <form class="entry entry-plain" id="form-pay">
        <input type="hidden" name="id" value="${esc(invoice.id)}" />
        <div class="actions"><button class="primary" type="submit">Mark paid</button></div>
        <p class="form-msg span-all"></p>
      </form>
    ` : ''}
    ${delBtn}
  `;
}

function invoiceForm() {
  const type = entryModal.type === 'Erection' ? 'Erection' : 'Supply';
  const draft = entryModal.draft || { invoiceNo: '', date: todayISO() };
  const items = boqItems.filter((item) => type === 'Supply' ? isMaterial(item) : !isMaterial(item));
  return `
    ${modalTitle(`New ${type.toLowerCase()} invoice`, 'Invoiced excludes this invoice. This quantity cannot pass the survey quantity, or half the LOA quantity until survey is entered.')}
    <form class="entry entry-plain" id="form-invoice">
      <input type="hidden" name="type" value="${type}" />
      <label>Invoice no <input name="invoiceNo" required placeholder="Invoice number" value="${esc(draft.invoiceNo || '')}" /></label>
      <label>Invoice date <input name="date" type="date" required value="${esc(draft.date || todayISO())}" /></label>
      <div class="span-all inv-sheet">
        ${table(['Sl', 'Item', numHead('LOA Qty'), numHead('Survey Qty'), numHead('Invoiced'), numHead('This invoice')], items.map((item) => {
          const left = billLeft(item);
          const open = left > 0.0001;
          return `
            <tr>
              <td>${item.slNo}</td>
              <td class="desc" title="${esc(item.description)}">${esc(itemTitle(item))}</td>
              <td class="num">${qtyText(item.loaQty, item.unit)}</td>
              <td class="num">${surveyText(item)}</td>
              <td class="num">${qtyText(billedQty(item), item.unit)}</td>
              <td class="num"><input name="qty" type="number" min="0.001" max="${left}" step="any" data-sl="${item.slNo}" data-unit="${esc(item.unit)}" placeholder="${open ? fmtQty(left) : '—'}" ${open ? '' : 'disabled'} /></td>
            </tr>
          `;
        }), 6)}
      </div>
      <div class="actions span-all">
        <button class="primary" type="submit">Raise invoice</button>
      </div>
      <p class="form-msg span-all"></p>
    </form>
  `;
}

function dailyModal() {
  if (entryModal.id) {
    const log = dailyLogs.find((row) => row.id === entryModal.id);
    if (!log) return '';
    const isPending = log.approvalStatus !== 'Approved';
    const sub = `Sl ${log.itemSl} · ${esc(log.feeder)} · ${qtyText(log.executedQty, log.unit)} · ${esc(log.siteEngineer || '')}`;
    const canVerify = (isRegion() || isAdmin()) && isPending;
    return `
      ${modalTitle(`Daily Log · ${esc(log.date)}`, sub)}
      <div style="background: rgba(0,0,0,0.03); padding: 0.85rem; border-radius: 6px; margin-bottom: 0.85rem;" class="span-all">
        <p style="margin: 0 0 4px 0;"><strong>Item:</strong> ${esc(log.itemDesc)}</p>
        <p style="margin: 0 0 4px 0;"><strong>Feeder / Stretch:</strong> ${esc(log.feeder)}</p>
        <p style="margin: 0 0 4px 0;"><strong>Location:</strong> ${esc(log.location || '—')}</p>
        <p style="margin: 0 0 4px 0;"><strong>Entered Quantity:</strong> <strong>${fmtQty(log.executedQty)} ${esc(log.unit)}</strong></p>
        <p style="margin: 0;"><strong>Status:</strong> ${statusBadge(log.approvalStatus === 'Approved' ? 'Approved' : 'Pending Verification')}</p>
        ${log.remarks ? `<p style="margin: 4px 0 0 0;"><strong>Remarks:</strong> ${esc(log.remarks)}</p>` : ''}
      </div>
      ${canVerify ? `
        <form class="entry entry-plain" id="form-verify">
          <input type="hidden" name="id" value="${esc(log.id)}" />
          <div class="actions"><button class="primary" type="submit">Verify & Approve Progress</button></div>
          <p class="form-msg span-all"></p>
        </form>
      ` : ''}
    `;
  }
  const item = findItem(entryModal.sl);
  if (!item) return '';
  const appQty = executedQty(item);
  const pendQty = pendingExecutedQty(item);
  const scope = scopeQty(item);
  const left = Math.max(0, scope - appQty - pendQty);
  const sub = `${item.part} · LOA ${qtyText(item.loaQty, item.unit)} · Survey ${surveyText(item)} · Approved ${qtyText(appQty, item.unit)}`;
  if (entryModal.mode !== 'log') return `${modalTitle(`Sl ${item.slNo} · ${esc(itemTitle(item))}`, sub)}<p class="quiet">Approved Progress: ${qtyText(appQty, item.unit)}.</p>`;
  return `
    ${modalTitle(`Sl ${item.slNo} · ${esc(itemTitle(item))}`, sub)}
    <form class="entry entry-plain" id="form-daily">
      <input type="hidden" name="item" value="${item.slNo}" />
      <label>Date <input name="date" type="date" required value="${todayISO()}" /></label>
      <label class="span-2">Feeder / Substation Outlet
        <input name="feeder" list="feeder-list" required placeholder="Select or type feeder name" />
      </label>
      <datalist id="feeder-list">${FEEDERS.map((feeder) => `<option value="${esc(feeder)}"></option>`).join('')}</datalist>
      <label>Today's Quantity (${esc(item.unit)})
        <input name="qty" type="number" min="0.001" step="any" required placeholder="Up to ${fmtQty(left)}" />
      </label>
      <label class="span-2">Location / Stretch <input name="location" required placeholder="Exact site location" /></label>
      <label class="span-2">Remarks <input name="remarks" placeholder="Optional site note" /></label>
      <p class="span-all meta" style="margin: 0; color: #f59e0b;">⏳ Note: Submitted quantity will remain as pending until verified by Region/Division User.</p>
      <div class="actions"><button class="primary" type="submit">Submit for Verification</button></div>
      <p class="form-msg span-all"></p>
    </form>
  `;
}

function receiveModal() {
  if (entryModal.id) {
    const row = receipts.find((receipt) => receipt.id === entryModal.id);
    if (!row) return '';
    return `${modalTitle(esc(row.srvNo), `${esc(row.date)} · ${qtyText(row.qty, row.unit)}`)}<p class="quiet">${esc(row.itemName)} · ${esc(row.by || '')}</p>`;
  }
  const item = findItem(entryModal.sl);
  if (!item) return '';
  const left = Math.max(0, diQty(item) - storeQty(item));
  const sub = `LOA ${qtyText(item.loaQty, item.unit)} · Survey ${surveyText(item)} · ${qtyText(left, item.unit)} left on DI`;
  if (entryModal.mode !== 'srv') return `${modalTitle(`Sl ${item.slNo} · ${esc(materialName(item))}`, sub)}<p class="quiet">Received ${qtyText(storeQty(item), item.unit)}.</p>`;
  return `
    ${modalTitle(`Sl ${item.slNo} · ${esc(materialName(item))}`, sub)}
    <form class="entry entry-plain" id="form-receive">
      <input type="hidden" name="item" value="${item.slNo}" />
      <label>SRV number <input name="srvNo" required placeholder="SRV number" /></label>
      <label>Receive date <input name="date" type="date" required value="${todayISO()}" /></label>
      <label>Received qty <input name="qty" type="number" min="0.001" step="any" required placeholder="Up to ${fmtQty(left)}" /></label>
      <div class="actions"><button class="primary" type="submit">Save receipt</button></div>
      <p class="form-msg span-all"></p>
    </form>
  `;
}

function renderReceive() {
  const materials = boqItems.filter(isMaterial);
  const rows = [...receipts].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  return `
    ${head('Material receive', 'Click a material to record the SRV against an issued DI.')}
    ${tabBar('receive', [['materials', 'Materials'], ['receipts', 'Receipts']], receiveTab)}
    ${receiveTab === 'receipts' ? table(['SRV', 'Date', 'Item', numHead('Qty'), 'By'], rows.map((row) => `
      <tr class="pick" data-action="open-entry" data-id="${esc(row.id)}" data-sl="${row.itemSl}" data-q="${esc(`${row.srvNo} ${row.itemName} ${row.by || ''}`)}">
        <td><button type="button" class="row-link" data-action="open-entry" data-id="${esc(row.id)}" data-sl="${row.itemSl}">${esc(row.srvNo)}</button></td>
        <td>${esc(row.date)}</td>
        <td class="desc" title="${esc(row.itemName)}">${esc(row.itemName)}</td>
        <td class="num">${fmtQty(row.qty)} ${esc(row.unit || '')}</td>
        <td>${esc(row.by || '—')}</td>
      </tr>
    `), 5, 'No receipt yet.') : table(['Sl', 'Material', numHead('LOA Qty'), numHead('Survey Qty'), numHead('DI'), numHead('Received')], materials.map((item) => `
      <tr class="pick" data-action="open-entry" data-sl="${item.slNo}" data-q="${esc(searchText(item, materialName(item)))}">
        <td>${item.slNo}</td>
        <td class="desc" title="${esc(item.description)}">${nameButton(item)}</td>
        <td class="num">${qtyText(item.loaQty, item.unit)}</td>
        <td class="num">${surveyText(item)}</td>
        <td class="num">${qtyText(diQty(item), item.unit)}</td>
        <td class="num">${qtyText(storeQty(item), item.unit)}</td>
      </tr>
    `), 6)}
  `;
}

function renderBilling() {
  const type = billTab === 'erection' ? 'Erection' : 'Supply';
  const hint = isRegion()
    ? 'Click a claimed invoice to mark it paid.'
    : `Raise the ${type.toLowerCase()} invoice from this tab. One invoice can hold many items. Payment follows the invoice.`;
  const canRaise = isVendor() || isAdmin();
  return `
    ${head('Vendor billing', hint)}
    <div class="tab-row">
      ${tabBar('bill', [['supply', 'Supply'], ['erection', 'Erection']], billTab === 'erection' ? 'erection' : 'supply')}
      ${canRaise ? `<button type="button" class="primary" data-action="open-entry" data-mode="new">Raise ${type.toLowerCase()} invoice</button>` : ''}
    </div>
    ${invoiceRows(type)}
  `;
}

function invoiceRows(type) {
  const rows = invoices.filter((invoice) => invoice.type === type)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  const headers = ['Invoice', 'Date', 'Items', numHead('Net'), 'Status'];
  if (user.role === 'Admin') headers.push('');
  return table(headers, rows.map((invoice) => {
    const names = invoice.lines.map((line) => line.itemName).join(' ');
    const net = sum(invoice.lines, (line) => line.net);
    const delBtn = user.role === 'Admin' ? `<td class="row-actions"><button type="button" class="tiny danger" data-action="delete-invoice" data-id="${esc(invoice.id)}">Delete</button></td>` : '';
    return `
      <tr class="pick" data-action="open-entry" data-id="${esc(invoice.id)}" data-q="${esc(`${invoice.invoiceNo} ${invoice.type} ${invoice.payStatus} ${names}`)}">
        <td><button type="button" class="row-link" data-action="open-entry" data-id="${esc(invoice.id)}">${esc(invoice.invoiceNo)}</button></td>
        <td>${esc(invoice.date)}</td>
        <td>${invoice.lines.length}</td>
        <td class="num">${formatMoney(net)}</td>
        <td>${statusBadge(invoice.payStatus === 'Paid' ? 'Paid' : 'Claimed')}</td>
        ${delBtn}
      </tr>
    `;
  }), headers.length, `No ${type.toLowerCase()} invoice yet.`);
}

function renderDaily() {
  const pendingCount = dailyLogs.filter((log) => log.approvalStatus !== 'Approved').length;
  const pendingLabel = pendingCount > 0 ? `Pending Approval (${pendingCount})` : 'Pending Approval';
  const tabs = [
    ['supply', 'Part-A (Supply)'],
    ['erection', 'Part-B (Erection)'],
    ['logs', 'Daily Logs'],
    ['pending', pendingLabel]
  ];
  const hint = (isRegion() || isAdmin())
    ? 'Verify pending daily progress entries submitted by vendors to count them into executed progress.'
    : 'Select Supply or Erection item to enter today\'s site progress quantity for Region approval.';
  
  let body = '';
  if (dailyTab === 'supply') {
    body = dailyItems('Part-A (Material)');
  } else if (dailyTab === 'erection') {
    body = dailyItems('Part-B (Erection)');
  } else if (dailyTab === 'logs') {
    body = dailyLogTable(false);
  } else {
    body = dailyLogTable(true);
  }

  return `
    ${head('Daily progress', hint)}
    ${tabBar('daily', tabs, dailyTab)}
    ${body}
  `;
}

function dailyItems(partFilter) {
  const items = boqItems.filter((item) => partFilter ? item.part === partFilter : true);
  const enter = (isVendor() || isAdmin())
    ? (item) => `<button type="button" class="tiny" data-action="open-entry" data-sl="${item.slNo}">Enter Qty</button>`
    : () => '';

  return table(['Sl', 'Item Description', numHead('LOA Qty'), numHead('Survey Qty'), numHead('Approved Progress'), numHead('Pending Approval'), numHead('Balance Qty'), 'Action'], items.map((item) => {
    const appQty = executedQty(item);
    const pendQty = pendingExecutedQty(item);
    const scope = scopeQty(item);
    const balance = Math.max(0, scope - appQty);
    return `
      <tr class="pick" data-action="open-entry" data-sl="${item.slNo}" data-q="${esc(searchText(item, itemTitle(item)))}">
        <td>${item.slNo}</td>
        <td class="desc" title="${esc(item.description)}">
          ${nameButton(item)}
          <span class="meta">${esc(item.category)} · ${esc(item.unit)}</span>
        </td>
        <td class="num">${qtyText(item.loaQty, item.unit)}</td>
        <td class="num">${surveyText(item)}</td>
        <td class="num" style="color: #22c55e; font-weight: 600;">${qtyText(appQty, item.unit)}</td>
        <td class="num" style="${pendQty > 0 ? 'color: #f59e0b; font-weight: 600;' : 'color: #94a3b8;'}">${pendQty > 0 ? qtyText(pendQty, item.unit) : '—'}</td>
        <td class="num">${qtyText(balance, item.unit)}</td>
        <td class="row-actions">${enter(item)}</td>
      </tr>
    `;
  }), 8, `No ${partFilter === 'Part-A (Material)' ? 'Supply' : 'Erection'} items in the BOQ.`);
}

function dailyLogTable(pendingOnly) {
  const rows = dailyLogs
    .filter((log) => !pendingOnly || log.approvalStatus !== 'Approved')
    .sort((a, b) => String(b.date).localeCompare(String(a.date)));
  return table(['Date', 'Feeder / Location', 'Item Description', numHead('Entered Qty'), 'Entered By', 'Verification Status', 'Action'], rows.map((log) => {
    const isPending = log.approvalStatus !== 'Approved';
    const verifyBtn = (isRegion() || isAdmin()) && isPending
      ? `<button type="button" class="tiny primary" data-action="open-entry" data-id="${esc(log.id)}" data-sl="${log.itemSl}">Verify</button>`
      : '';
    return `
      <tr class="pick" data-action="open-entry" data-id="${esc(log.id)}" data-sl="${log.itemSl}" data-q="${esc(`${log.date} ${log.feeder} ${log.location} ${log.itemDesc} ${log.siteEngineer} ${log.approvalStatus}`)}">
        <td><button type="button" class="row-link" data-action="open-entry" data-id="${esc(log.id)}" data-sl="${log.itemSl}">${esc(log.date)}</button></td>
        <td>${esc(log.feeder)}<br><span class="meta">${esc(log.location)}</span></td>
        <td class="desc" title="${esc(log.itemDesc)}">${esc(log.itemDesc)}</td>
        <td class="num"><strong>${fmtQty(log.executedQty)}</strong> ${esc(log.unit)}</td>
        <td>${esc(log.siteEngineer)}</td>
        <td>${statusBadge(log.approvalStatus === 'Approved' ? 'Approved' : 'Pending Verification')}</td>
        <td class="row-actions">${verifyBtn}</td>
      </tr>
    `;
  }), 7, pendingOnly ? 'No daily log is waiting for Region verification.' : 'No progress entered yet.');
}

function onClick(event) {
  const button = event.target.closest('[data-action]');
  if (!button) return;
  const action = button.dataset.action;
  if (action === 'open') {
    openPage(button.dataset.page);
    return;
  }
  if (action === 'print') {
    window.print();
    return;
  }
  if (action === 'page-tab') {
    const tab = button.dataset.tab;
    const group = button.dataset.group;
    if (group === 'boq') boqPart = tab === 'erection' ? 'Part-B (Erection)' : 'Part-A (Material)';
    if (group === 'gtp') gtpTab = tab === 'gtp' || tab === 'letters' ? tab : 'vendor';
    if (group === 'bill') billTab = tab === 'erection' ? 'erection' : 'supply';
    if (group === 'daily') dailyTab = ['supply', 'erection', 'logs', 'pending'].includes(tab) ? tab : 'supply';
    if (group === 'receive') receiveTab = tab === 'receipts' ? 'receipts' : 'materials';
    paint();
    return;
  }
  if (action === 'open-entry') {
    openEntry(Number(button.dataset.sl), button.dataset.id || '', button.dataset.mode || '');
    return;
  }
  if (action === 'entry-mode') {
    if (!entryModal) return;
    entryModal = { ...entryModal, mode: button.dataset.mode || 'note' };
    inspectOpenedAt = Date.now();
    paint();
    return;
  }
  if (action === 'insp-tab') {
    const tab = button.dataset.tab;
    inspTab = ['letters', 'offered', 'approved'].includes(tab) ? tab : 'summary';
    paint();
    return;
  }
  if (action === 'batch-insp-new') {
    if (!isVendor() && !isAdmin()) return;
    const sl = Number(button.dataset.sl) || 0;
    entryModal = null;
    inspModal = batchInspEntry({
      picked: sl ? [sl] : [],
      offerNo: button.dataset.offerNo || '',
      date: button.dataset.date || '',
      manufacturer: button.dataset.mfr || '',
      premises: button.dataset.premises || '',
      remarks: button.dataset.remarks || '',
      qtys: {}
    });
    inspectOpenedAt = Date.now();
    paint();
    return;
  }
  if (action === 'open-offer-letter') {
    if (!button.dataset.id) return;
    entryModal = null;
    inspModal = { mode: 'letter', offerNo: button.dataset.id };
    inspectOpenedAt = Date.now();
    paint();
    return;
  }
  if (action === 'batch-insp-all' || action === 'batch-insp-none') {
    const form = button.closest('form');
    if (!form) return;
    form.querySelectorAll('.insp-pick-row').forEach((row) => {
      const box = row.querySelector('input[name="pick"]');
      const qtyIn = row.querySelector('.pick-qty-in');
      if (!box || box.disabled) return;
      if (action === 'batch-insp-none') {
        box.checked = false;
        if (qtyIn) qtyIn.disabled = true;
      } else if (!row.hidden) {
        box.checked = true;
        if (qtyIn) {
          qtyIn.disabled = false;
          if (!Number(qtyIn.value)) qtyIn.value = qtyIn.max || '';
        }
      }
      row.classList.toggle('on', box.checked);
    });
    updateInspBatchCount(form);
    return;
  }
  if (action === 'batch-insp-dec-set') {
    const form = button.closest('form');
    if (!form) return;
    const dec = button.dataset.dec;
    form.querySelectorAll('.insp-dec-row').forEach((row) => {
      let targetVal = dec;
      if (dec === 'ClearForward') {
        const isCentral = row.dataset.class === 'Central';
        targetVal = isCentral ? 'Forwarded' : 'Cleared';
      }
      const radio = row.querySelector(`input[type="radio"][value="${CSS.escape(targetVal)}"]`);
      if (radio) radio.checked = true;
    });
    updateInspDecisionCount(form);
    return;
  }
  if (action === 'open-inspect') {
    openInspect(Number(button.dataset.sl), button.dataset.offer || '');
    return;
  }
  if (action === 'inspect-mode') {
    if (!inspModal) return;
    inspModal = { ...inspModal, mode: button.dataset.mode || 'offer', offerId: button.dataset.offer || inspModal.offerId || '' };
    paint();
    return;
  }
  if (action === 'close-modal') {
    inspModal = null;
    entryModal = null;
    paint();
    return;
  }
  if (action === 'modal-keep') return;
  if (action === 'install-pwa') {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    deferredPrompt.userChoice.then(({ outcome }) => {
      if (outcome === 'accepted') toast('Malda UG App installed!');
      deferredPrompt = null;
      paint();
    });
    return;
  }
  if (action === 'set-class') {
    setSupplyClass(Number(button.dataset.sl), button.dataset.class);
    return;
  }
  if (action === 'pick-decision') {
    pickDecision(button);
    return;
  }
  if (action === 'batch-new') {
    if (!isVendor() && !isAdmin()) return;
    const sl = Number(button.dataset.sl) || 0;
    inspModal = null;
    entryModal = batchEntry({
      kind: button.dataset.kind,
      picked: sl ? [sl] : [],
      letterNo: button.dataset.letter || '',
      date: button.dataset.date || '',
      vendor: button.dataset.vendor || ''
    });
    inspectOpenedAt = Date.now();
    paint();
    return;
  }
  if (action === 'batch-kind') {
    const form = document.getElementById('form-gtp-batch');
    if (!form || !entryModal) return;
    entryModal = { ...entryModal, draft: { ...readBatchDraft(form), kind: button.dataset.kind } };
    paint();
    return;
  }
  if (action === 'batch-all' || action === 'batch-none') {
    const form = button.closest('form');
    if (!form) return;
    form.querySelectorAll('.pick-row').forEach((row) => {
      const box = row.querySelector('input[name="pick"]');
      if (!box || box.disabled) return;
      if (action === 'batch-none') box.checked = false;
      else if (!row.hidden) box.checked = true;
      row.classList.toggle('on', box.checked);
    });
    updateBatchCount(form);
    return;
  }
  if (action === 'batch-set') {
    const form = button.closest('form');
    if (!form) return;
    form.querySelectorAll(`.dec-row input[type="radio"][value="${CSS.escape(button.dataset.decision || 'Approved')}"]`).forEach((radio) => {
      radio.checked = true;
    });
    updateDecisionCount(form);
    return;
  }
  if (action === 'open-letter') {
    if (!button.dataset.id) return;
    inspModal = null;
    entryModal = { page: 'gtp', sl: 0, id: button.dataset.id, mode: 'letter' };
    inspectOpenedAt = Date.now();
    paint();
    return;
  }
  if (action === 'open-rectify-letter') {
    const key = letterKey(button.dataset.kind, button.dataset.letter);
    entryModal = { page: 'gtp', sl: 0, id: key, mode: 'rectifyLetter' };
    inspectOpenedAt = Date.now();
    paint();
    return;
  }
  if (action === 'cancel-rectify-letter') {
    if (entryModal) entryModal.mode = 'letter';
    paint();
    return;
  }
  if (action === 'batch-cancel-preview') {
    if (entryModal && entryModal.draft) {
      entryModal.draft.previewing = false;
      paint();
    }
    return;
  }
  if (action === 'batch-confirm-submit') {
    confirmSaveGtpBatch();
    return;
  }
  if (action === 'pay-bill') markBillPaid(button.dataset.id);
  if (action === 'verify-log') verifyLog(button.dataset.id);
  if (action === 'delete-boq') deleteBoq(Number(button.dataset.sl));
  if (action === 'delete-approval') deleteApproval(Number(button.dataset.sl), button.dataset.kind, button.dataset.letter);
  if (action === 'delete-approval-letter') deleteApprovalLetter(button.dataset.kind, button.dataset.letter);
  if (action === 'delete-invoice') deleteInvoice(button.dataset.id);
  if (action === 'auth-mode') {
    authMode = button.dataset.mode === 'signup' ? 'signup' : 'login';
    paint();
  }
  if (action === 'sign-out') remote.signOut();
  if (action === 'save-person') savePerson(button.dataset.id);
  if (action === 'reset-pin') resetUserPin(button.dataset.id, button.dataset.name);
  if (action === 'fill-demo') {
    const email = button.dataset.email;
    const pass = button.dataset.pass;
    const role = button.dataset.role || 'Vendor';
    const emailInput = document.getElementById('auth-email');
    const passInput = document.getElementById('auth-password');
    if (emailInput) emailInput.value = email;
    if (passInput) passInput.value = pass;

    const names = {
      Admin: 'System Admin',
      Region: 'Divisional Engineer (WBSEDCL)',
      Vendor: 'M/s Tarun Enterprise',
      Store: 'Malda Store Keeper'
    };
    const name = names[role] || `${role} User`;

    toast(`Connecting as ${role}...`);
    remote.ensureDemoAccount(email, pass, name, role)
      .then(() => toast(`Signed in as ${role}`))
      .catch((err) => toast(err.message || 'Check credentials or sign up'));
    return;
  }
}

function onSubmit(event) {
  const form = event.target;
  if (!(form instanceof HTMLFormElement)) return;
  event.preventDefault();
  if (form.id === 'form-login') signIn(form);
  if (form.id === 'form-signup') signUp(form);
  if (form.id === 'form-create-user') createUserAccount(form);
  if (form.id === 'form-rectify-letter') saveRectifyLetter(form);
  if (form.id === 'form-boq') saveBoq(form);
  if (form.id === 'form-gtp-batch') {
    // Enter inside the filter box should filter, not submit the letter.
    if (document.activeElement?.classList.contains('pick-search')) return;
    saveGtpBatch(form);
  }
  if (form.id === 'form-decision-batch') saveDecisionBatch(form);
  if (form.id === 'form-decision') saveDecision(form);
  if (form.id === 'form-insp-batch') {
    if (document.activeElement?.classList.contains('insp-pick-search')) return;
    saveInspBatch(form);
  }
  if (form.id === 'form-insp-decision-batch') saveInspDecisionBatch(form);
  if (form.id === 'form-offer') saveOffer(form);
  if (form.id === 'form-offer-action') saveOfferAction(form);
  if (form.id === 'form-di') saveDi(form);
  if (form.id === 'form-receive') saveReceipt(form);
  if (form.id === 'form-invoice') saveInvoice(form);
  if (form.id === 'form-daily') saveDaily(form);
  if (form.id === 'form-survey') saveSurvey(form);
  if (form.id === 'form-pay') markBillPaid(field(form, 'id'));
  if (form.id === 'form-verify') verifyLog(field(form, 'id'));
}

function onInput(event) {
  if (event.target.name === 'qty' && event.target.form?.id === 'form-invoice') {
    rejectInvoiceQty(event.target);
    return;
  }
  if (event.target.classList.contains('pick-search')) {
    filterPicks(event.target.form);
    return;
  }
  if (event.target.classList.contains('insp-pick-search')) {
    filterInspPicks(event.target.form);
    return;
  }
  if (event.target.classList.contains('pick-qty-in')) {
    const max = Number(event.target.max);
    const val = Number(event.target.value);
    if (val > max + 0.0001) {
      setMsg(event.target.form, `Quantity cannot exceed pending room of ${fmtQty(max)}.`);
    } else {
      setMsg(event.target.form, '');
    }
    updateInspBatchCount(event.target.form);
    return;
  }
  if (event.target.name === 'vendor' && event.target.form?.id === 'form-gtp-batch') {
    const hint = event.target.value.trim() || 'Vendor name';
    event.target.form.querySelectorAll('.pick-vendor').forEach((input) => { input.placeholder = hint; });
    return;
  }
  if (!event.target.classList.contains('search')) return;
  searchQuery = event.target.value;
  applySearch(event.target.closest('.page'));
}

function rejectInvoiceQty(input) {
  if (input.value === '') return;
  const max = Number(input.max);
  const qty = Number(input.value);
  if (!(qty > max + 0.0001)) {
    setMsg(input.form, '');
    return;
  }
  input.value = '';
  setMsg(input.form, `Sl ${input.dataset.sl} cannot take more than ${fmtQty(max)} ${input.dataset.unit}.`);
}

function onChange(event) {
  if (event.target.id === 'sim-role-select') {
    simulatedRole = event.target.value || null;
    if (!canOpen(currentPage)) currentPage = 'home';
    paint();
    return;
  }
  if (event.target.id === 'boq-part') {
    boqPart = event.target.value;
    paint();
    return;
  }
  if (event.target.id === 'report-date') {
    reportDate = event.target.value || todayISO();
    paint();
    return;
  }
  if (event.target.name === 'offer' && event.target.form?.id === 'form-offer-action') {
    syncOfferAction(event.target.form);
    return;
  }
  if (event.target.name === 'pick' && event.target.form?.id === 'form-gtp-batch') {
    event.target.closest('.pick-row')?.classList.toggle('on', event.target.checked);
    updateBatchCount(event.target.form);
    return;
  }
  if (event.target.name === 'pick' && event.target.form?.id === 'form-insp-batch') {
    const row = event.target.closest('.insp-pick-row');
    row?.classList.toggle('on', event.target.checked);
    const qtyIn = row?.querySelector('.pick-qty-in');
    if (qtyIn) {
      qtyIn.disabled = !event.target.checked;
      if (event.target.checked && (!Number(qtyIn.value) || Number(qtyIn.value) <= 0)) {
        qtyIn.value = qtyIn.max || '';
      }
    }
    updateInspBatchCount(event.target.form);
    return;
  }
  if (event.target.type === 'radio' && event.target.form?.id === 'form-decision-batch') {
    updateDecisionCount(event.target.form);
  }
  if (event.target.type === 'radio' && event.target.form?.id === 'form-insp-decision-batch') {
    updateInspDecisionCount(event.target.form);
  }
}

function readBatchDraft(form) {
  const vendors = {};
  form.querySelectorAll('[data-vendor-sl]').forEach((input) => { vendors[input.dataset.vendorSl] = input.value; });
  return {
    ...entryModal.draft,
    letterNo: field(form, 'letterNo'),
    date: field(form, 'date'),
    vendor: field(form, 'vendor'),
    picked: [...form.querySelectorAll('input[name="pick"]:checked')].map((box) => Number(box.value)),
    vendors,
    filter: form.querySelector('.pick-search')?.value || ''
  };
}

function filterPicks(form) {
  if (!form) return;
  const query = (form.querySelector('.pick-search')?.value || '').trim().toLowerCase();
  let shown = 0;
  form.querySelectorAll('.pick-row').forEach((row) => {
    const match = !query || (row.dataset.q || '').toLowerCase().includes(query);
    row.hidden = !match;
    if (match) shown += 1;
  });
  const miss = form.querySelector('.filter-miss');
  if (miss) miss.hidden = shown !== 0 || !form.querySelector('.pick-row');
}

function updateBatchCount(form) {
  const count = form.querySelectorAll('input[name="pick"]:checked').length;
  const kind = entryModal?.draft?.kind || 'vendor';
  const docs = count * batchKinds(kind).length;
  const label = form.querySelector('[data-count]');
  if (label) {
    label.innerHTML = count
      ? `<strong>${count}</strong> ${count === 1 ? 'material' : 'materials'} ticked${kind === 'both' ? ` · ${docs} documents` : ''}`
      : 'Tick the materials this letter covers';
  }
  const submit = form.querySelector('[data-submit]');
  if (submit) {
    submit.disabled = count === 0;
    submit.textContent = count ? `Preview letter for ${count} ${count === 1 ? 'item' : 'items'}` : 'Preview letter';
  }
}

function updateDecisionCount(form) {
  const tally = { Approved: 0, Hold: 0, Rejected: 0, Skip: 0 };
  form.querySelectorAll('.dec-row input[type="radio"]:checked').forEach((radio) => { tally[radio.value] += 1; });
  const parts = [];
  if (tally.Approved) parts.push(`<span class="badge ok">${tally.Approved} approve</span>`);
  if (tally.Hold) parts.push(`<span class="badge hold">${tally.Hold} hold</span>`);
  if (tally.Rejected) parts.push(`<span class="badge bad">${tally.Rejected} reject</span>`);
  if (tally.Skip) parts.push(`<span class="badge idle">${tally.Skip} skipped</span>`);
  const label = form.querySelector('[data-count]');
  if (label) label.innerHTML = parts.join(' ') || 'Choose a decision for each row';
  const decided = tally.Approved + tally.Hold + tally.Rejected;
  const submit = form.querySelector('[data-submit]');
  if (submit) {
    submit.disabled = decided === 0;
    submit.textContent = decided ? `Save ${decided} ${decided === 1 ? 'decision' : 'decisions'}` : 'Save decisions';
  }
}

function openPage(pageId) {
  if (!canOpen(pageId)) return;
  if (pageId !== currentPage) {
    inspModal = null;
    entryModal = null;
  }
  currentPage = pageId;
  searchQuery = '';
  paint();
}

async function signIn(form) {
  try {
    await remote.signIn(field(form, 'email'), field(form, 'password'));
  } catch (error) {
    setMsg(form, error.message);
  }
}

async function signUp(form) {
  const name = field(form, 'name');
  if (!name) return setMsg(form, 'Enter your name.');
  try {
    await remote.signUp(name, field(form, 'email'), field(form, 'password'));
  } catch (error) {
    setMsg(form, error.message);
  }
}

async function savePerson(id) {
  if (user.role !== 'Admin') return;
  const role = document.querySelector(`[data-person="${CSS.escape(id)}"][data-field="role"]`)?.value;
  const active = document.querySelector(`[data-person="${CSS.escape(id)}"][data-field="active"]`)?.value === 'Active';
  if (!role) return;
  try {
    await remote.saveProfile(id, { role, active });
  } catch (error) {
    toast(error.message || 'Could not save');
    return;
  }
  const person = people.find((row) => row.id === id);
  if (person) {
    person.role = role;
    person.active = active;
  }
  if (sessionUser?.id === id) {
    user.role = role;
    user.active = active;
    if (!user.active || !canOpen(currentPage)) currentPage = 'home';
  }
  toast('Person saved');
  paint();
}

async function createUserAccount(form) {
  if (user.role !== 'Admin') return;
  const name = field(form, 'name');
  const userId = field(form, 'userId');
  const pin = field(form, 'pin');
  const role = field(form, 'role') || 'Vendor';

  if (!name || !userId || !pin) {
    return setMsg(form, 'Please enter Full Name, User ID, and PIN.');
  }

  try {
    setMsg(form, 'Creating user account…');
    await remote.createAdminUser(name, userId, pin, role, true);
    setMsg(form, '');
    toast(`User account "${name}" created!`);
    await pullRegister();
    paint();
  } catch (error) {
    setMsg(form, error.message || 'Failed to create user account');
  }
}

async function resetUserPin(id, name) {
  if (user.role !== 'Admin') return;
  const newPin = prompt(`Enter new PIN or Password for ${name || 'user'}:`);
  if (!newPin || !newPin.trim()) return;

  try {
    await remote.adminSetUserPin(id, newPin.trim());
    toast(`PIN for ${name || 'user'} has been updated!`);
  } catch (error) {
    toast(error.message || 'Could not reset PIN');
  }
}

async function finish(form, run) {
  try {
    await run();
    return true;
  } catch (error) {
    setMsg(form, error.message || 'Could not save');
    return false;
  }
}

async function saveBoq(form) {
  if (user.role !== 'Admin') return setMsg(form, 'Only Admin can update the BOQ.');
  const sl = Number(field(form, 'item'));
  const description = field(form, 'description');
  const unit = field(form, 'unit');
  const category = field(form, 'category') || 'Material';
  const part = field(form, 'part') || 'Part-A (Material)';
  const loa = Number(field(form, 'loa'));
  const rateStr = field(form, 'rate');
  const rate = rateStr !== '' && !isNaN(Number(rateStr)) ? Number(rateStr) : 0;
  if (!description || !unit || !category || !part || !(loa >= 0) || !(rate >= 0)) {
    return setMsg(form, 'Enter material name, unit, and LOA quantity.');
  }
  const existing = sl === 0 ? null : findItem(sl);
  if (sl !== 0 && !existing) return setMsg(form, 'Item not found.');
  const next = {
    ...(existing || {}),
    slNo: sl === 0 ? boqItems.reduce((max, item) => Math.max(max, item.slNo), 0) + 1 : sl,
    part,
    category,
    description,
    unit,
    rate,
    loaQty: loa,
    pipeline: existing?.pipeline || {}
  };
  if (!applySurvey(next, form)) return setMsg(form, 'Enter a survey quantity of zero or more.');
  next.revisedQty = scopeQty(next);
  next.totalAmount = next.revisedQty * rate;
  if (!existing) ensurePipeline(next);
  if (!await finish(form, () => remote.saveItem(next))) return;
  if (existing) Object.assign(existing, next);
  else boqItems.push(next);
  entryModal = null;
  toast('BOQ saved');
  paint();
}

function applySurvey(item, form) {
  if (!form.elements.namedItem('survey')) return true;
  const raw = field(form, 'survey');
  if (raw === '') {
    delete item.surveyQty;
    return true;
  }
  const qty = Number(raw);
  if (!(qty >= 0)) return false;
  item.surveyQty = qty;
  return true;
}

async function saveSurvey(form) {
  if (user.role !== 'WBSEDCL' && user.role !== 'Admin') return setMsg(form, 'Switch the role to WBSEDCL to enter survey quantity.');
  const item = findItem(field(form, 'item'));
  if (!item) return setMsg(form, 'Item not found.');
  const qty = Number(field(form, 'survey'));
  if (!(qty >= 0)) return setMsg(form, 'Enter the survey quantity.');
  if (!requireName(form)) return;
  if (!await finish(form, () => remote.saveItemFields(item.slNo, { survey_qty: qty }))) return;
  item.surveyQty = qty;
  entryModal = null;
  toast('Survey quantity saved');
  paint();
}

async function deleteBoq(slNo) {
  if (user.role !== 'Admin') return;
  const item = findItem(slNo);
  if (!item) return;
  if (!confirm(`Delete Sl ${slNo}?`)) return;
  try {
    await remote.removeItem(slNo);
  } catch (error) {
    toast(error.message || 'Could not delete');
    return;
  }
  boqItems = boqItems.filter((row) => row.slNo !== slNo);
  toast(`Sl ${slNo} deleted`);
  paint();
}

async function deleteApproval(slNo, kind, letterNo) {
  if (user.role !== 'Admin') return;
  const item = findItem(slNo);
  if (!item) return;
  const label = kind === 'gtp' ? 'GTP' : 'Vendor approval';
  const desc = letterNo ? `letter ${letterNo} for Sl ${slNo}` : `${label} request for Sl ${slNo}`;
  if (!confirm(`Delete ${desc}?`)) return;
  try {
    await remote.removeApproval(slNo, kind, letterNo);
    await pullRegister();
    entryModal = null;
    toast(`${label} request deleted`);
    paint();
  } catch (error) {
    toast(error.message || 'Could not delete');
  }
}

async function deleteApprovalLetter(kind, letterNo) {
  if (user.role !== 'Admin') return;
  const label = kind === 'gtp' ? 'GTP' : 'Vendor approval';
  if (!confirm(`Delete all ${label} requests under letter ${letterNo}?`)) return;
  try {
    await remote.removeApprovalLetter(kind, letterNo);
    await pullRegister();
    entryModal = null;
    toast(`Letter ${letterNo} deleted`);
    paint();
  } catch (error) {
    toast(error.message || 'Could not delete');
  }
}

async function saveRectifyLetter(form) {
  if (user.role !== 'Admin') return;
  const oldKind = field(form, 'oldKind');
  const oldLetterNo = field(form, 'oldLetterNo');
  const newKind = field(form, 'newKind');
  const newLetterNo = field(form, 'newLetterNo');
  const newVendor = field(form, 'newVendor');
  const newSubDate = field(form, 'newSubDate');

  if (!newLetterNo || !newVendor) {
    return setMsg(form, 'Please enter Letter Reference No. and Vendor Name.');
  }

  try {
    setMsg(form, 'Saving rectified tagging…');
    await remote.rectifyApproval(oldKind, oldLetterNo, newKind, newLetterNo, newVendor, newSubDate);
    await pullRegister();
    entryModal = null;
    toast(`Letter ${newLetterNo} tagging rectified!`);
    paint();
  } catch (error) {
    setMsg(form, error.message || 'Could not rectify tagging');
  }
}

async function deleteInvoice(id) {
  if (user.role !== 'Admin') return;
  const invoice = invoices.find((row) => row.id === id);
  if (!invoice) return;
  if (!confirm(`Delete invoice ${invoice.invoiceNo}?`)) return;
  try {
    await remote.removeInvoice(id);
    await pullRegister();
    entryModal = null;
    toast(`Invoice ${invoice.invoiceNo} deleted`);
    paint();
  } catch (error) {
    toast(error.message || 'Could not delete');
  }
}

async function saveGtpBatch(form) {
  if (!isVendor() && !isAdmin()) return;
  const draft = readBatchDraft(form);
  const kinds = batchKinds(draft.kind);
  if (!draft.letterNo || !draft.date) return setMsg(form, 'Enter the letter number and letter date.');
  const cleanLetter = String(draft.letterNo).trim();
  const alreadyExists = letterGroups().some((g) => kinds.includes(g.kind) && g.letterNo.toLowerCase() === cleanLetter.toLowerCase());
  if (alreadyExists) {
    return setMsg(form, `Letter '${cleanLetter}' has already been submitted. Adding more items to an existing submitted letter is not permitted. Please submit under a new letter reference.`);
  }
  if (!draft.picked.length) return setMsg(form, 'Tick at least one material.');
  const payloads = [];
  const missing = [];
  draft.picked.forEach((sl) => {
    const item = findItem(sl);
    if (!item || !isMaterial(item)) return;
    const vendorName = String(draft.vendors[sl] || '').trim();
    if (!vendorName) missing.push(sl);
    kinds.forEach((kind) => {
      const record = approvalRecord(item, kind);
      if (record.status === 'Approved') return;
      payloads.push({
        itemSl: item.slNo,
        kind,
        status: 'Submitted',
        vendor: vendorName,
        letterNo: draft.letterNo,
        subDate: draft.date,
        apprDate: '',
        approvedQty: '',
        actionDate: '',
        memoNo: '',
        remarks: '',
        actionBy: ''
      });
    });
  });
  if (missing.length) {
    return setMsg(form, `Please enter the Vendor / Manufacturer name for Sl ${missing.join(', ')}.`);
  }
  if (!payloads.length) return setMsg(form, 'Every ticked material is already approved.');
  if (!requireName(form)) return;
  
  entryModal.draft = {
    ...draft,
    previewing: true,
    payloads
  };
  paint();
}

async function confirmSaveGtpBatch() {
  if (!entryModal?.draft?.payloads) return;
  const draft = entryModal.draft;
  const payloads = draft.payloads;
  try {
    await remote.saveApprovals(payloads);
  } catch (error) {
    toast(error.message || 'Could not save submission');
    return;
  }
  payloads.forEach(({ itemSl, kind, ...fields }) => Object.assign(approvalRecord(findItem(itemSl), kind), fields));
  const count = new Set(payloads.map((row) => row.itemSl)).size;
  entryModal = null;
  if (gtpTab !== 'letters') gtpTab = draft.kind === 'gtp' ? 'gtp' : 'vendor';
  toast(`${draft.letterNo} submitted for ${count} ${count === 1 ? 'material' : 'materials'}`);
  paint();
}

async function saveDecisionBatch(form) {
  if (!isRegion() && !isAdmin()) return;
  const group = findGroup(field(form, 'group'));
  if (!group) return setMsg(form, 'Letter not found.');
  const memoNo = field(form, 'memoNo');
  const date = field(form, 'date');
  const remarks = field(form, 'remarks');
  const picks = [];
  for (const { item, record } of group.rows) {
    if (!GTP_WAITING.includes(record.status)) continue;
    const decision = form.querySelector(`input[name="dec-${item.slNo}"]:checked`)?.value || 'Skip';
    if (decision === 'Skip') continue;
    let qty = '';
    if (decision === 'Approved') {
      qty = Number(field(form, `qty-${item.slNo}`));
      if (!(qty > 0)) return setMsg(form, `Enter the approved quantity for Sl ${item.slNo}.`);
    }
    picks.push({ item, record, decision, qty });
  }
  if (!picks.length) return setMsg(form, 'Choose approve, hold, or reject for at least one row.');
  if (!memoNo || !date) return setMsg(form, 'Enter the memo number and memo date.');
  if (!remarks && picks.some(({ decision }) => decision !== 'Approved')) return setMsg(form, 'Add a remark for the rows put on hold or rejected.');
  if (!requireName(form)) return;
  const payloads = picks.map(({ item, record, decision, qty }) => ({
    itemSl: item.slNo,
    kind: group.kind,
    status: decision,
    vendor: record.vendor || '',
    letterNo: record.letterNo || '',
    subDate: record.subDate || '',
    apprDate: decision === 'Approved' ? date : '',
    approvedQty: decision === 'Approved' ? qty : '',
    actionDate: date,
    memoNo,
    remarks: remarks || decisionLabel(decision),
    actionBy: user.name || user.role
  }));
  if (!await finish(form, () => remote.saveApprovals(payloads))) return;
  payloads.forEach(({ itemSl, kind, ...fields }) => Object.assign(approvalRecord(findItem(itemSl), kind), fields));
  entryModal = null;
  toast(`${memoNo}: ${payloads.length} ${payloads.length === 1 ? 'decision' : 'decisions'} saved`);
  paint();
}

function readInspBatchDraft(form) {
  const qtys = {};
  form.querySelectorAll('[data-qty-sl]').forEach((input) => {
    qtys[input.dataset.qtySl] = input.value;
  });
  return {
    ...inspModal.draft,
    offerNo: field(form, 'offerNo'),
    date: field(form, 'date'),
    manufacturer: field(form, 'manufacturer'),
    premises: field(form, 'premises'),
    remarks: field(form, 'remarks'),
    picked: [...form.querySelectorAll('input[name="pick"]:checked')].map((b) => Number(b.value)),
    qtys,
    filter: form.querySelector('.insp-pick-search')?.value || ''
  };
}

function filterInspPicks(form) {
  if (!form) return;
  const query = (form.querySelector('.insp-pick-search')?.value || '').trim().toLowerCase();
  let shown = 0;
  form.querySelectorAll('.insp-pick-row').forEach((row) => {
    const match = !query || (row.dataset.q || '').toLowerCase().includes(query);
    row.hidden = !match;
    if (match) shown += 1;
  });
  const miss = form.querySelector('.filter-miss');
  if (miss) miss.hidden = shown !== 0 || !form.querySelector('.insp-pick-row');
}

function updateInspBatchCount(form) {
  const boxes = form.querySelectorAll('input[name="pick"]:checked');
  const count = boxes.length;
  let totalQty = 0;
  boxes.forEach((box) => {
    const qtyIn = form.querySelector(`input[data-qty-sl="${box.value}"]`);
    totalQty += Number(qtyIn?.value) || 0;
  });

  const label = form.querySelector('[data-insp-count]');
  if (label) {
    label.innerHTML = count
      ? `<strong>${count}</strong> ${count === 1 ? 'material' : 'materials'} ticked · Total qty: <strong>${fmtQty(totalQty)}</strong>`
      : 'Tick the materials this offer letter covers';
  }
  const submit = form.querySelector('[data-insp-submit]');
  if (submit) {
    submit.disabled = count === 0;
    submit.textContent = count ? `Submit inspection offer for ${count} ${count === 1 ? 'item' : 'items'}` : 'Submit inspection offer';
  }
}

function updateInspDecisionCount(form) {
  const tally = { Cleared: 0, Forwarded: 0, Rejected: 0, Skip: 0 };
  form.querySelectorAll('.insp-dec-row input[type="radio"]:checked').forEach((radio) => {
    if (tally[radio.value] !== undefined) tally[radio.value] += 1;
  });
  const parts = [];
  if (tally.Cleared) parts.push(`<span class="badge ok">${tally.Cleared} clear</span>`);
  if (tally.Forwarded) parts.push(`<span class="badge ok">${tally.Forwarded} forward</span>`);
  if (tally.Rejected) parts.push(`<span class="badge bad">${tally.Rejected} reject</span>`);
  if (tally.Skip) parts.push(`<span class="badge idle">${tally.Skip} skipped</span>`);
  const label = form.querySelector('[data-insp-dec-count]');
  if (label) label.innerHTML = parts.join(' ') || 'Choose a decision for each row';
  const decided = tally.Cleared + tally.Forwarded + tally.Rejected;
  const submit = form.querySelector('[data-insp-dec-submit]');
  if (submit) {
    submit.disabled = decided === 0;
    submit.textContent = decided ? `Save ${decided} ${decided === 1 ? 'decision' : 'decisions'}` : 'Save decisions';
  }
}

async function saveInspBatch(form) {
  if (!isVendor() && !isAdmin()) return;
  const draft = readInspBatchDraft(form);
  if (!draft.offerNo || !draft.date || !draft.manufacturer || !draft.premises) {
    return setMsg(form, 'Enter the offer letter number, date, manufacturer, and premises.');
  }
  const cleanOfferNo = String(draft.offerNo).trim();
  const alreadyExists = offerGroups().some((g) => g.offerNo.toLowerCase() === cleanOfferNo.toLowerCase());
  if (alreadyExists) {
    return setMsg(form, `Offer letter '${cleanOfferNo}' has already been submitted. Adding more items to an existing submitted letter is not permitted. Please submit under a new offer reference.`);
  }
  if (!draft.picked.length) return setMsg(form, 'Tick at least one material.');

  const offers = [];
  for (const sl of draft.picked) {
    const item = findItem(sl);
    if (!item) continue;
    const track = supplyTrack(item);
    if (!(track.approved > 0)) {
      return setMsg(form, `Sl ${item.slNo} (${materialName(item)}) is not approved yet.`);
    }
    const qty = Number(draft.qtys[sl]);
    if (!(qty > 0)) {
      return setMsg(form, `Enter a valid quantity for Sl ${item.slNo} (${materialName(item)}).`);
    }
    if (qty > track.pendingOffer + 0.0001) {
      return setMsg(form, `Sl ${item.slNo} cannot exceed remaining pending offer of ${fmtQty(track.pendingOffer)} ${item.unit}.`);
    }
    offers.push({
      id: uid('OFF'),
      offerNo: draft.offerNo,
      date: draft.date,
      itemSl: item.slNo,
      itemName: item.description,
      qty,
      unit: item.unit,
      manufacturer: draft.manufacturer,
      premises: draft.premises,
      remarks: draft.remarks || '',
      class: supplyClass(item),
      status: 'Offered',
      actionDate: '',
      memoNo: '',
      actionRemarks: '',
      actionBy: '',
      by: user.name || user.role
    });
  }

  if (!requireName(form)) return;
  if (!await finish(form, () => remote.saveOffers(offers))) return;

  offers.forEach((o) => inspectionOffers.unshift(o));
  offers.forEach((o) => {
    const item = findItem(o.itemSl);
    if (item) syncSupplyPipeline(item);
  });

  inspModal = null;
  if (inspTab !== 'letters') inspTab = 'letters';
  toast(`Offer ${draft.offerNo} submitted for ${offers.length} ${offers.length === 1 ? 'material' : 'materials'}`);
  paint();
}

async function saveInspDecisionBatch(form) {
  if (!isRegion() && !isAdmin()) return;
  const group = findOfferGroup(field(form, 'offerNo'));
  if (!group) return setMsg(form, 'Offer letter not found.');
  const memoNo = field(form, 'memoNo');
  const date = field(form, 'date');
  const remarks = field(form, 'remarks');
  const updates = [];

  for (const { offer, item } of group.rows) {
    if (offer.status !== 'Offered') continue;
    const decision = form.querySelector(`input[name="dec-${offer.id}"]:checked`)?.value || 'Skip';
    if (decision === 'Skip') continue;
    updates.push({
      id: offer.id,
      offer,
      status: decision,
      actionDate: date,
      memoNo,
      actionRemarks: remarks || decision,
      actionBy: user.name || user.role
    });
  }

  if (!updates.length) return setMsg(form, 'Choose clear, forward, or reject for at least one offer item.');
  if (!memoNo || !date) return setMsg(form, 'Enter the memo number and memo date.');
  if (!remarks && updates.some((u) => u.status === 'Rejected')) {
    return setMsg(form, 'Add a remark for the rejected items.');
  }
  if (!requireName(form)) return;

  if (!await finish(form, () => remote.saveOfferActions(updates))) return;

  updates.forEach(({ offer, status, actionDate, memoNo, actionRemarks, actionBy }) => {
    offer.status = status;
    offer.actionDate = actionDate;
    offer.memoNo = memoNo;
    offer.actionRemarks = actionRemarks;
    offer.actionBy = actionBy;
    const item = findItem(offer.itemSl);
    if (item) syncSupplyPipeline(item);
  });

  inspModal = null;
  toast(`${memoNo}: ${updates.length} ${updates.length === 1 ? 'decision' : 'decisions'} saved`);
  paint();
}

function pickDecision(button) {
  const form = button.closest('form');
  const input = form?.elements.namedItem('decision');
  if (!input) return;
  input.value = button.dataset.decision || 'Approved';
  form.querySelectorAll('.choice-btn').forEach((choice) => {
    choice.classList.toggle('active', choice === button);
  });
}

async function saveDecision(form) {
  if (!isRegion() && !isAdmin()) return;
  const kind = field(form, 'kind') === 'gtp' ? 'gtp' : 'vendor';
  const item = findItem(field(form, 'item'));
  const record = item ? approvalRecord(item, kind) : null;
  const decision = field(form, 'decision');
  const memoNo = field(form, 'memoNo');
  const date = field(form, 'date');
  const remarks = field(form, 'remarks');
  if (!record || !['Submitted', 'Hold', 'Rejected'].includes(record.status)) {
    return setMsg(form, 'Select a submitted item.');
  }
  if (!['Approved', 'Hold', 'Rejected'].includes(decision)) return setMsg(form, 'Choose approve, hold, or reject.');
  if (!memoNo || !date || !remarks) return setMsg(form, 'Enter the memo number, date, and remarks.');
  if (!requireName(form)) return;
  const payload = {
    itemSl: item.slNo,
    kind,
    status: decision,
    vendor: record.vendor || '',
    letterNo: record.letterNo || '',
    subDate: record.subDate || '',
    apprDate: decision === 'Approved' ? date : '',
    approvedQty: decision === 'Approved' ? item.loaQty : '',
    actionDate: date,
    memoNo,
    remarks,
    actionBy: user.name || user.role
  };
  if (!await finish(form, () => remote.saveApproval(payload))) return;
  record.status = payload.status;
  record.actionDate = payload.actionDate;
  record.memoNo = payload.memoNo;
  record.remarks = payload.remarks;
  record.actionBy = payload.actionBy;
  record.apprDate = payload.apprDate;
  record.approvedQty = payload.approvedQty;
  entryModal = null;
  const label = kind === 'gtp' ? 'GTP' : 'Vendor';
  toast(`${label} ${decisionLabel(decision).toLowerCase()}`);
  paint();
}

async function saveOffer(form) {
  if (!isVendor() && !isRegion() && !isAdmin()) {
    return setMsg(form, 'Switch the role to Vendor, Region, or Admin to save an offer.');
  }
  const item = findItem(field(form, 'item'));
  if (!item || !isMaterial(item)) return setMsg(form, 'Select a material item.');
  const approved = approvedBoqQty(item);
  if (!(approved > 0)) return setMsg(form, 'Approve the vendor and the GTP before offering inspection.');
  const qty = Number(field(form, 'qty'));
  const offerNo = field(form, 'offerNo');
  const date = field(form, 'date');
  const manufacturer = field(form, 'manufacturer');
  const premises = field(form, 'premises');
  if (!offerNo || !date || !manufacturer || !premises || !(qty > 0)) {
    return setMsg(form, 'Enter the letter, date, quantity, manufacturer, and premises.');
  }
  const room = approved - offeredQty(item);
  if (qty > room + 0.0001) return setMsg(form, `Only ${fmtQty(Math.max(room, 0))} ${item.unit} is left within the approved quantity.`);
  if (!requireName(form)) return;
  const offer = {
    id: uid('OFF'),
    offerNo,
    date,
    itemSl: item.slNo,
    itemName: item.description,
    qty,
    unit: item.unit,
    manufacturer,
    premises,
    remarks: field(form, 'remarks'),
    class: supplyClass(item),
    status: 'Offered',
    actionDate: '',
    memoNo: '',
    actionRemarks: '',
    actionBy: '',
    by: user.name
  };
  if (!await finish(form, () => remote.saveOffer(offer))) return;
  inspectionOffers.unshift(offer);
  syncSupplyPipeline(item);
  inspModal = null;
  toast('Inspection offered');
  paint();
}

async function saveOfferAction(form) {
  if (!isRegion() && !isAdmin()) {
    return setMsg(form, 'Switch the role to Region or Admin to clear, reject, or forward an offer.');
  }
  const offer = inspectionOffers.find((row) => row.id === field(form, 'offer'));
  const decision = field(form, 'decision');
  const memoNo = field(form, 'memoNo');
  const date = field(form, 'date');
  const remarks = field(form, 'remarks');
  if (!offer || offer.status !== 'Offered') return setMsg(form, 'Select an offer that is still open.');
  const allowed = offer.class === 'Central' ? ['Forwarded'] : ['Cleared', 'Rejected'];
  if (!allowed.includes(decision)) {
    return setMsg(form, offer.class === 'Central' ? 'Forward this offer to HQ/ZM.' : 'Clear or reject this offer.');
  }
  if (!memoNo || !date || !remarks) return setMsg(form, 'Enter the memo number, date, and remarks.');
  if (!requireName(form)) return;
  const next = {
    ...offer,
    status: decision,
    actionDate: date,
    memoNo,
    actionRemarks: remarks,
    actionBy: user.name || user.role
  };
  if (!await finish(form, () => remote.saveOfferAction(next))) return;
  offer.status = next.status;
  offer.actionDate = next.actionDate;
  offer.memoNo = next.memoNo;
  offer.actionRemarks = next.actionRemarks;
  offer.actionBy = next.actionBy;
  const item = findItem(offer.itemSl);
  if (item) syncSupplyPipeline(item);
  inspModal = null;
  const done = decision === 'Cleared' ? 'Offer cleared' : decision === 'Rejected' ? 'Offer rejected' : 'Offer forwarded';
  toast(done);
  paint();
}

function syncOfferAction(form) {
  const option = form.elements.namedItem('offer')?.selectedOptions?.[0];
  const central = option?.dataset.class === 'Central';
  form.querySelector('.for-local').hidden = central;
  form.querySelector('.for-central').hidden = !central;
  const decision = form.elements.namedItem('decision');
  const allowed = central ? ['Forwarded'] : ['Cleared', 'Rejected'];
  if (!allowed.includes(decision.value)) decision.value = allowed[0];
  form.querySelectorAll('.choice-btn').forEach((choice) => {
    const visible = !choice.closest('[hidden]');
    choice.classList.toggle('active', visible && choice.dataset.decision === decision.value);
  });
  const note = form.querySelector('.offer-room');
  if (note && option?.dataset.premises) note.textContent = `${option.dataset.premises}. Local offers are cleared or rejected by RM/ZM. Central offers are forwarded to HQ/ZM.`;
}

async function saveDi(form) {
  if (!isRegion() && !isAdmin()) {
    return setMsg(form, 'Switch the role to Region or Admin to issue a DI.');
  }
  const offer = inspectionOffers.find((row) => row.id === field(form, 'offer'));
  const item = offer ? findItem(offer.itemSl) : null;
  if (!item || !offer) return setMsg(form, 'Select an offer that is cleared or forwarded.');
  const allowed = offer.class === 'Local' ? offer.status === 'Cleared' : offer.status === 'Forwarded';
  if (!allowed) {
    return setMsg(form, offer.class === 'Local' ? 'Clear the offer before issuing a DI.' : 'Forward the offer before recording a DI.');
  }
  const qty = Number(field(form, 'qty'));
  const diNo = field(form, 'diNo');
  const date = field(form, 'date');
  if (!diNo || !date || !(qty > 0)) return setMsg(form, 'Enter DI number, date, and quantity.');
  const remain = offerRemain(offer);
  if (qty > remain + 0.0001) return setMsg(form, `Only ${fmtQty(Math.max(remain, 0))} ${item.unit} is left on this offer.`);
  if (!requireName(form)) return;
  const row = {
    id: uid('DI'),
    diNo,
    date,
    itemSl: item.slNo,
    itemName: item.description,
    qty,
    unit: item.unit,
    vendor: item.pipeline.vendorAppr?.vendor || '',
    by: user.name || user.role,
    offerId: offer.id,
    offerNo: offer.offerNo,
    class: offer.class
  };
  if (!await finish(form, () => remote.saveDi(row))) return;
  dispatchInstructions.unshift(row);
  syncSupplyPipeline(item);
  inspModal = null;
  toast('DI issued');
  paint();
}

async function setSupplyClass(slNo, className) {
  if (!isRegion() && !isAdmin()) return;
  const item = findItem(slNo);
  if (!item || (className !== 'Local' && className !== 'Central')) return;
  try {
    await remote.saveItemFields(slNo, { supply_class: className });
  } catch (error) {
    toast(error.message || 'Could not save');
    return;
  }
  item.supplyClass = className;
  toast(className === 'Local' ? 'Office set to RM/ZM' : 'Office set to HQ/ZM');
  paint();
}

async function saveReceipt(form) {
  if (!isStore() && !isAdmin()) return;
  const item = findItem(field(form, 'item'));
  if (!item || !isMaterial(item)) return setMsg(form, 'Select a material item.');
  const cleared = diQty(item);
  if (cleared <= 0) return setMsg(form, 'No DI is issued for this item.');
  const qty = Number(field(form, 'qty'));
  const srvNo = field(form, 'srvNo');
  const date = field(form, 'date');
  if (!srvNo || !date || !(qty > 0)) return setMsg(form, 'Enter SRV number, date, and quantity.');
  const already = storeQty(item);
  const remain = cleared - already;
  if (qty > remain + 0.0001) return setMsg(form, `Only ${fmtQty(Math.max(remain, 0))} ${item.unit} is left on the DI.`);
  if (!requireName(form)) return;
  const row = {
    id: uid('SRV'),
    srvNo,
    date,
    itemSl: item.slNo,
    itemName: item.description,
    qty,
    unit: item.unit,
    by: user.name
  };
  if (!await finish(form, () => remote.saveReceipt(row))) return;
  receipts.unshift(row);
  const received = already + qty;
  item.pipeline.store = {
    status: received + 0.0001 >= cleared ? 'Received' : 'Partial',
    srvNo,
    srvDate: date,
    storeQty: received
  };
  entryModal = null;
  toast('Receipt saved');
  paint();
}

async function saveInvoice(form) {
  if (!isVendor() && !isAdmin()) return;
  const type = field(form, 'type') === 'Erection' ? 'Erection' : 'Supply';
  const invoiceNo = field(form, 'invoiceNo');
  const date = field(form, 'date');
  if (!invoiceNo || !date) return setMsg(form, 'Enter the invoice number and date.');
  const rawLines = [...form.querySelectorAll('input[name="qty"]')]
    .map((input) => ({ itemSl: input.dataset.sl, qty: input.value.trim(), max: Number(input.max), unit: input.dataset.unit || '' }))
    .filter((line) => line.qty !== '');
  if (!rawLines.length) return setMsg(form, 'Enter a quantity on at least one item.');
  const lines = [];
  for (const raw of rawLines) {
    const item = findItem(raw.itemSl);
    const qty = Number(raw.qty);
    if (!item || !(qty > 0)) return setMsg(form, 'Enter a quantity above zero.');
    if (type === 'Supply' && !isMaterial(item)) return setMsg(form, 'A supply invoice uses material items.');
    if (type === 'Erection' && isMaterial(item)) return setMsg(form, 'An erection invoice uses erection items.');
    const left = billLeft(item);
    if (qty > left + 0.0001) {
      const limit = surveyValue(item) !== '' ? 'the survey quantity' : 'half the LOA quantity until survey is entered';
      return setMsg(form, `Sl ${item.slNo} cannot take more than ${fmtQty(Math.max(left, 0))} ${item.unit}. The limit is ${limit}.`);
    }
    const gross = qty * item.rate;
    const gst = gross * PROJECT_INFO.gstRate;
    const sd = gross * 0.03;
    lines.push({
      id: uid('IL'),
      itemSl: item.slNo,
      itemName: item.description,
      unit: item.unit,
      qty,
      gross,
      gst,
      sd,
      net: gross + gst - sd
    });
  }
  if (!requireName(form)) return;
  const invoice = {
    id: uid('INV'),
    invoiceNo,
    date,
    type,
    payStatus: 'Claimed',
    by: user.name || user.role,
    lines
  };
  if (!await finish(form, () => remote.saveInvoice(invoice))) return;
  invoices.unshift(invoice);
  entryModal = null;
  toast('Invoice saved');
  paint();
}

async function markBillPaid(id) {
  if (!isRegion() && !isAdmin()) return;
  const invoice = invoices.find((row) => row.id === id);
  if (!invoice) return;
  try {
    await remote.markBillPaid(id);
  } catch (error) {
    toast(error.message || 'Could not save');
    return;
  }
  invoice.payStatus = 'Paid';
  entryModal = null;
  toast('Invoice marked paid');
  paint();
}

async function saveDaily(form) {
  if (!isVendor() && !isAdmin()) return;
  const item = findItem(field(form, 'item'));
  if (!item) return setMsg(form, 'Select an item.');
  const qty = Number(field(form, 'qty'));
  const date = field(form, 'date');
  const feeder = field(form, 'feeder');
  const location = field(form, 'location');
  if (!date || !feeder || !location || !(qty > 0)) return setMsg(form, 'Enter date, feeder, location, and quantity.');
  const appDone = executedQty(item);
  const pendDone = pendingExecutedQty(item);
  const remain = scopeQty(item) - appDone - pendDone;
  if (qty > remain + 0.0001) return setMsg(form, `Only ${fmtQty(Math.max(remain, 0))} ${item.unit} is available beyond approved and pending logs.`);
  if (!requireName(form)) return;
  const row = {
    id: uid('DL'),
    date,
    feeder,
    location,
    itemSl: item.slNo,
    itemDesc: item.description,
    unit: item.unit,
    executedQty: qty,
    siteEngineer: user.name,
    remarks: field(form, 'remarks'),
    approvalStatus: 'Pending'
  };
  if (!await finish(form, () => remote.saveLog(row))) return;
  dailyLogs.unshift(row);
  entryModal = null;
  toast('Daily progress submitted for Region verification');
  paint();
}

async function verifyLog(id) {
  if (!isRegion() && !isAdmin()) return;
  const log = dailyLogs.find((row) => row.id === id);
  if (!log || log.approvalStatus === 'Approved') return;
  const inspector = user.name || user.role || 'WBSEDCL';
  try {
    await remote.verifyLog(id, inspector);
  } catch (error) {
    toast(error.message || 'Could not verify log');
    return;
  }
  log.approvalStatus = 'Approved';
  log.inspector = inspector;
  const item = findItem(log.itemSl);
  if (item) {
    item.pipeline.execution.executedQty = executedQty(item);
  }
  entryModal = null;
  toast('Daily progress verified and counted into executed total');
  paint();
}

function requireName(form) {
  if (user.name) return true;
  setMsg(form, 'This login has no name.');
  return false;
}

async function resetData() {
  if (!isAdmin()) return;
  if (!confirm('Reset quantities, logs, DI, receipts, and invoices to the LOA baseline?')) return;
  try {
    await remote.resetToLoa(BOQ_ITEMS);
    await pullRegister();
    toast('Reset to the LOA');
    paint();
  } catch (error) {
    toast(error.message || 'Could not reset');
  }
}

function ensurePipeline(item) {
  const current = item.pipeline || {};
  const legacy = current.gtp || {};
  const vendorAppr = blankApproval(current.vendorAppr);
  const gtpDoc = blankApproval(current.gtpDoc);
  if (!current.vendorAppr && isRealVendor(legacy.vendor)) {
    vendorAppr.vendor = legacy.vendor;
    vendorAppr.status = legacy.status || 'Pending Submission';
    vendorAppr.subDate = cleanDate(legacy.subDate);
    vendorAppr.apprDate = cleanDate(legacy.apprDate);
  }
  if (!current.gtpDoc && legacy.status && legacy.status !== 'Pending Submission') {
    gtpDoc.status = legacy.status;
    gtpDoc.subDate = cleanDate(legacy.subDate);
    gtpDoc.apprDate = cleanDate(legacy.apprDate);
  }
  item.pipeline = {
    gtp: { status: 'Pending Submission', vendor: '', subDate: '', apprDate: '', ...legacy },
    vendorAppr,
    gtpDoc,
    di: { status: 'Not Issued', diNo: '', diDate: '', diQty: 0, ...current.di },
    store: { status: 'Not Received', srvNo: '', srvDate: '', storeQty: 0, ...current.store },
    execution: { executedQty: 0, ...current.execution },
    supplyBill: { status: 'Unbilled', ...current.supplyBill },
    erectionBill: { status: 'Unbilled', ...current.erectionBill }
  };
}

function blankApproval(current) {
  return {
    status: 'Pending Submission',
    vendor: '',
    letterNo: '',
    subDate: '',
    apprDate: '',
    approvedQty: '',
    actionDate: '',
    memoNo: '',
    remarks: '',
    actionBy: '',
    ...(current || {})
  };
}

function itemApprovals(item, kind) {
  if (!item || !item.slNo) return [];
  const sl = Number(item.slNo);
  return gtpApprovals.filter((row) => Number(row.itemSl) === sl && (!kind || row.kind === kind));
}

function approvalRecord(item, kind) {
  const records = itemApprovals(item, kind);
  if (!records.length) return blankApproval();
  const approved = records.find((r) => r.status === 'Approved');
  if (approved) return approved;
  return records[records.length - 1];
}

function submitAction(item, kind, record, label) {
  if (!isVendor() && !isAdmin()) return '';
  return `<button type="button" class="tiny" data-action="open-entry" data-sl="${item.slNo}" data-id="${kind}">${esc(label)}</button>`;
}

function findItem(slNo) {
  return boqItems.find((item) => item.slNo === Number(slNo));
}

function isMaterial(item) {
  return String(item.part).includes('Material');
}

function diQty(item) {
  return sum(dispatchInstructions.filter((row) => Number(row.itemSl) === item.slNo), (row) => Number(row.qty) || 0);
}

function supplyClass(item) {
  if (item.supplyClass === 'Local' || item.supplyClass === 'Central') return item.supplyClass;
  return item.category === 'Hardware' ? 'Local' : 'Central';
}

function officeName(className) {
  return className === 'Local' ? 'RM/ZM' : 'HQ/ZM';
}

function approvedBoqQty(item) {
  if (!item) return 0;
  const vendorApprs = itemApprovals(item, 'vendor').filter((r) => r.status === 'Approved');
  const gtpDocs = itemApprovals(item, 'gtp').filter((r) => r.status === 'Approved');
  if (!vendorApprs.length && !gtpDocs.length) return 0;
  const getQty = (list) => {
    if (!list.length) return 0;
    const nums = list.map((r) => {
      const q = Number(r.approvedQty);
      return q > 0 ? q : Number(item.loaQty) || 0;
    });
    return Math.max(...nums);
  };
  const vQty = getQty(vendorApprs);
  const gQty = getQty(gtpDocs);
  if (vQty > 0 && gQty > 0) return Math.min(vQty, gQty);
  const val = Math.max(vQty, gQty);
  return val > 0 ? val : Number(item.loaQty) || 0;
}

function itemOffers(item) {
  return inspectionOffers.filter((offer) => Number(offer.itemSl) === item.slNo);
}

function itemDis(item) {
  return dispatchInstructions.filter((row) => Number(row.itemSl) === item.slNo);
}

function offeredQty(item) {
  return sum(itemOffers(item).filter((offer) => offer.status !== 'Rejected'), (offer) => Number(offer.qty) || 0);
}

function offerRemain(offer) {
  const used = sum(dispatchInstructions.filter((row) => row.offerId === offer.id), (row) => Number(row.qty) || 0);
  return Math.max(0, (Number(offer.qty) || 0) - used);
}

function pendingDiQty(item) {
  return sum(itemOffers(item).filter((offer) => offer.status === 'Cleared' || offer.status === 'Forwarded'), offerRemain);
}

function supplyTrack(item) {
  const approved = approvedBoqQty(item);
  const offered = offeredQty(item);
  return {
    approved,
    offered,
    pendingOffer: Math.max(0, approved - offered),
    di: diQty(item),
    className: supplyClass(item)
  };
}

function stageOf(item, track = supplyTrack(item)) {
  if (!(track.approved > 0)) return { text: 'Not approved' };
  const open = itemOffers(item).filter((offer) => offer.status === 'Offered');
  const local = open.some((offer) => offer.class === 'Local');
  const central = open.some((offer) => offer.class === 'Central');
  if (local && central) return { text: 'Inspection pending' };
  if (local) return { text: 'RM/ZM inspection' };
  if (central) return { text: 'Forward to HQ/ZM' };
  if (track.pendingOffer > 0.0001) return { text: 'Offer pending' };
  if (pendingDiQty(item) > 0.0001) return { text: 'DI pending' };
  return { text: 'Complete' };
}

function inspectionWait(item) {
  const track = supplyTrack(item);
  const open = itemOffers(item).filter((offer) => offer.status === 'Offered');
  const parts = [];
  if (track.pendingOffer > 0.0001) parts.push(`${fmtQty(track.pendingOffer)} ${item.unit} not offered`);
  const local = open.filter((offer) => offer.class === 'Local').length;
  const central = open.filter((offer) => offer.class === 'Central').length;
  if (local) parts.push(`${local} with RM/ZM`);
  if (central) parts.push(`${central} to forward`);
  if (parts.length) return { name: materialName(item), step: 'Inspection', detail: parts.join(' · ') };
  if (pendingDiQty(item) > 0.0001) {
    return { name: materialName(item), step: 'DI', detail: `${fmtQty(pendingDiQty(item))} ${item.unit} waiting for DI` };
  }
  return null;
}

function syncSupplyPipeline(item) {
  const offered = offeredQty(item);
  const di = diQty(item);
  const latest = itemDis(item)[0];
  item.pipeline.inspection = { status: offered > 0 ? 'Offered' : 'Not Offered', offerQty: offered };
  item.pipeline.di = {
    status: di > 0 ? 'Issued' : 'Not Issued',
    diNo: latest?.diNo || '',
    diDate: latest?.date || '',
    diQty: di
  };
}

function classBadge(className) {
  const local = className === 'Local';
  return `<span class="badge ${local ? 'local' : 'central'}">${local ? 'Local' : 'Central'}</span>`;
}

function offerDecisionCell(offer) {
  const lines = [];
  if (offer.actionDate || offer.memoNo) {
    lines.push([offer.actionDate ? isoToDmy(offer.actionDate) : '', offer.memoNo].filter(Boolean).join(' · '));
  }
  if (offer.actionRemarks) lines.push(offer.actionRemarks);
  else if (offer.remarks) lines.push(offer.remarks);
  const detail = lines.map((line) => `<span class="meta">${esc(line)}</span>`).join('');
  return `<td class="decision">${statusBadge(offer.status)}${detail}</td>`;
}

function qtyText(value, unit) {
  return `${fmtQty(value)} ${unit || ''}`.trim();
}

function storeQty(item) {
  const logged = sum(receipts.filter((row) => Number(row.itemSl) === item.slNo), (row) => Number(row.qty) || 0);
  const stored = Number(item.pipeline?.store?.storeQty) || 0;
  return Math.max(logged, stored);
}

function executedQty(item) {
  const approvedLogs = sum(dailyLogs.filter((row) => Number(row.itemSl) === item.slNo && row.approvalStatus === 'Approved'), (row) => Number(row.executedQty) || 0);
  const stored = Number(item.pipeline?.execution?.executedQty) || 0;
  return Math.max(approvedLogs, stored);
}

function pendingExecutedQty(item) {
  return sum(dailyLogs.filter((row) => Number(row.itemSl) === item.slNo && row.approvalStatus !== 'Approved'), (row) => Number(row.executedQty) || 0);
}

function invoiceGross(invoice) {
  return sum(invoice.lines, (line) => line.gross);
}

function lineItemTitle(line) {
  const item = findItem(line.itemSl);
  return item ? itemTitle(item) : line.itemName;
}

function billCap(item) {
  if (surveyValue(item) !== '') return Number(item.surveyQty);
  return (Number(item.loaQty) || 0) * 0.5;
}

function billedQty(item) {
  return sum(invoices.flatMap((invoice) => invoice.lines).filter((line) => Number(line.itemSl) === item.slNo), (line) => Number(line.qty) || 0);
}

function billLeft(item) {
  return Math.max(0, billCap(item) - billedQty(item));
}

function canOpen(pageId) {
  return (ROLE_PAGES[user.role] || ROLE_PAGES.Turnkey).includes(pageId);
}

function head(title, hint) {
  return `
    <div class="page-head">
      <div>
        <h1>${esc(title)}</h1>
        <p>${esc(hint)}</p>
      </div>
      <input class="search" type="search" placeholder="Search" value="${esc(searchQuery)}" />
    </div>
  `;
}

function kpi(label, value, sub) {
  return `
    <article class="kpi">
      <span class="kpi-label">${esc(label)}</span>
      <strong class="kpi-value">${esc(value)}</strong>
      <span class="kpi-sub">${esc(sub)}</span>
    </article>
  `;
}

function table(headers, rows, cols, emptyText = 'No records yet.') {
  const body = rows.length
    ? rows.join('') + `<tr class="filter-empty" hidden><td class="empty" colspan="${cols}">No match.</td></tr>`
    : `<tr><td class="empty" colspan="${cols}">${esc(emptyText)}</td></tr>`;
  const head = headers.map((header) => {
    const numeric = header && typeof header === 'object';
    const label = numeric ? header.label : header;
    return `<th${numeric ? ' class="num"' : ''}>${esc(label)}</th>`;
  }).join('');
  return `
    <div class="table-wrap">
      <table>
        <thead><tr>${head}</tr></thead>
        <tbody>${body}</tbody>
      </table>
    </div>
  `;
}

function numHead(label) {
  return { label };
}

function tabBar(group, tabs, current) {
  return `<div class="tabs">${tabs.map(([id, label]) => `<button type="button" class="tab${current === id ? ' active' : ''}" data-action="page-tab" data-group="${group}" data-tab="${id}">${esc(label)}</button>`).join('')}</div>`;
}

function itemTitle(item) {
  return isMaterial(item) ? materialName(item) : String(item.description || '');
}

function nameButton(item, extra = '') {
  return `<button type="button" class="row-link" data-action="open-entry" data-sl="${item.slNo}" ${extra}>${esc(itemTitle(item))}</button>`;
}

function surveyValue(item) {
  if (!item || item.surveyQty === '' || item.surveyQty === null || item.surveyQty === undefined) return '';
  const value = Number(item.surveyQty);
  return Number.isFinite(value) ? esc(value) : '';
}

function surveyText(item) {
  const value = surveyValue(item);
  return value === '' ? '—' : qtyText(Number(item.surveyQty), item.unit);
}

function scopeQty(item) {
  const surveyed = surveyValue(item);
  if (surveyed !== '') return Number(item.surveyQty);
  return Number(item.loaQty) || 0;
}

function modalTitle(title, sub) {
  return `<div class="modal-head"><div><h2>${title}</h2><p>${sub}</p></div><button type="button" class="ghost" data-action="close-modal">Close</button></div>`;
}

function materialOptions() {
  return boqItems.filter(isMaterial).map((item) => `<option value="${item.slNo}">${esc(itemLabel(item))}</option>`).join('');
}

function shortMaterialOptions() {
  return boqItems.filter(isMaterial).map((item) => `<option value="${item.slNo}">${esc(materialName(item))}</option>`).join('');
}

function materialName(item) {
  return String(item.description || '').replace(/^supply\s*&\s*delivery\s+of\s+/i, '').trim();
}

function materialCell(item) {
  return `<td class="desc" title="${esc(item.description)}">${esc(materialName(item))}</td>`;
}

function qtyCells(item, record) {
  const stored = Number(record.approvedQty);
  const approved = record.status === 'Approved' ? (stored > 0 ? stored : item.loaQty) : null;
  return `
    <td class="num">${qtyText(item.loaQty, item.unit)}</td>
    <td class="num">${surveyText(item)}</td>
    <td class="num">${approved === null ? '—' : qtyText(approved, item.unit)}</td>
    <td class="num">${qtyText(storeQty(item), item.unit)}</td>
  `;
}

function decisionCellContent(record) {
  const lines = [];
  if (record.actionDate || record.memoNo) {
    lines.push([record.actionDate ? isoToDmy(record.actionDate) : '', record.memoNo].filter(Boolean).join(' · '));
  }
  if (record.remarks) lines.push(record.remarks);
  const detail = lines.map((line) => `<span class="meta">${esc(line)}</span>`).join('');
  return `${approvalBadge(record)}${detail}`;
}

function decisionCell(record) {
  return `<td class="decision">${decisionCellContent(record)}</td>`;
}

function approvalBadge(record) {
  if (record.status === 'Approved') return statusBadge('Approved');
  if (record.status === 'Rejected') return statusBadge('Rejected');
  if (record.status === 'Hold') return statusBadge('On Hold');
  if (record.status !== 'Submitted') return statusBadge('Not submitted');
  const days = daysSince(record.subDate);
  if (days === null) return statusBadge('Submitted');
  const word = days === 1 ? 'day' : 'days';
  return `<span class="badge wait">Approval Pending Since ${days} ${word}</span>`;
}

function decisionLabel(status) {
  if (status === 'Hold') return 'On Hold';
  if (status === 'Rejected') return 'Rejected';
  if (status === 'Approved') return 'Approved';
  if (status === 'Submitted') return 'Submitted';
  return 'Not submitted';
}

function waitingDetail(record) {
  if (record.status === 'Submitted') {
    const days = daysSince(record.subDate);
    if (days === null) return 'Submitted';
    return `Approval Pending Since ${days} ${days === 1 ? 'day' : 'days'}`;
  }
  const note = [decisionLabel(record.status), record.memoNo, record.remarks].filter(Boolean).join(' · ');
  return note || 'Not submitted';
}

function daysSince(iso) {
  const [year, month, day] = String(iso || '').split('-').map(Number);
  if (!year || !month || !day) return null;
  const start = new Date(year, month - 1, day);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return Math.max(0, Math.round((now - start) / 86400000));
}

function cleanDate(value) {
  if (!value || value === '-') return '';
  return value;
}

function isRealVendor(name) {
  const value = String(name || '').trim();
  return Boolean(value) && value !== '-' && value !== 'Pending Vendor';
}

function allItemOptions() {
  return boqItems.map((item) => `<option value="${item.slNo}">${esc(itemLabel(item))}</option>`).join('');
}

function itemLabel(item) {
  const kind = isMaterial(item) ? 'Mat' : 'Erec';
  return `Sl ${item.slNo} ${kind}: ${item.description}`;
}

function descCell(item) {
  return `<td class="desc" title="${esc(item.description)}">${esc(item.description)}</td>`;
}

function statusBadge(status) {
  const label = status === 'Hold' ? 'On Hold' : (status || 'Pending');
  const tone = ['Approved', 'Paid', 'Received', 'Issued', 'Cleared', 'Complete'].includes(status)
    ? 'ok'
    : status === 'Rejected'
      ? 'bad'
      : (status === 'Hold' || status === 'On Hold' || status === 'Forwarded')
        ? 'hold'
        : 'wait';
  return `<span class="badge ${tone}">${esc(label)}</span>`;
}

function searchText(item, ...extra) {
  return [item.slNo, item.description, item.part, item.unit, item.category, ...extra].join(' ');
}

function applySearch(root) {
  if (!root) return;
  const query = searchQuery.toLowerCase();
  root.querySelectorAll('tbody').forEach((tbody) => {
    const rows = [...tbody.querySelectorAll('tr[data-q]')];
    let shown = 0;
    rows.forEach((row) => {
      const match = !query || (row.dataset.q || '').toLowerCase().includes(query);
      row.hidden = !match;
      if (match) shown += 1;
    });
    const empty = tbody.querySelector('.filter-empty');
    if (empty) empty.hidden = rows.length === 0 || shown !== 0;
  });
}

function setMsg(form, text) {
  const message = form.querySelector('.form-msg');
  if (message) {
    message.textContent = text;
    message.className = 'form-msg bad';
  }
}

function field(form, name) {
  const control = form.elements.namedItem(name);
  return String(control?.value || '').trim();
}

function toast(text) {
  const el = document.getElementById('toast');
  el.textContent = text;
  el.hidden = false;
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { el.hidden = true; }, 2400);
}

function sum(list, pick) {
  return list.reduce((total, row) => total + (Number(pick(row)) || 0), 0);
}

function uid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`;
}

function todayISO() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${now.getFullYear()}-${month}-${day}`;
}

function isoToDmy(iso) {
  const [year, month, day] = String(iso).split('-');
  if (!year || !month || !day) return iso;
  return `${day}-${month}-${year}`;
}

function formatDisplayDate(dmy) {
  const [day, month, year] = String(dmy).split('-').map(Number);
  if (!year) return dmy;
  return new Date(year, month - 1, day).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function daysUntil(dmy) {
  const [day, month, year] = dmy.split('-').map(Number);
  const end = new Date(year, month - 1, day);
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return Math.round((end - start) / 86400000);
}

function fmtQty(value) {
  return (Number(value) || 0).toLocaleString('en-IN', { maximumFractionDigits: 3 });
}

function formatCr(value) {
  return `₹${((Number(value) || 0) / 1e7).toFixed(2)} Cr`;
}

function formatMoney(value) {
  const amount = Number(value) || 0;
  if (Math.abs(amount) >= 1e7) return formatCr(amount);
  if (Math.abs(amount) >= 1e5) return `₹${(amount / 1e5).toFixed(2)} L`;
  return `₹${amount.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
}

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}
