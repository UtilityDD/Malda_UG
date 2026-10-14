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
  Division: ['home', 'boq', 'gtp', 'di', 'billing', 'daily'],
  Divisional: ['home', 'boq', 'gtp', 'di', 'billing', 'daily'],
  Store: ['home', 'receive'],
  Viewer: ['home', 'boq', 'gtp', 'di', 'receive', 'billing', 'daily'],
  Admin: ['home', 'boq', 'gtp', 'di', 'receive', 'billing', 'daily', 'users']
};

export const PERMISSION_DEFS = [
  { key: 'survey_entry', label: 'Feeder Survey Entry', desc: 'Add, edit & delete feeder survey measurements', icon: '🗺️' },
  { key: 'boq_edit', label: 'Contract & Milestones', desc: 'Edit LOA baseline, BGs, milestones & EOTs', icon: '📋' },
  { key: 'gtp_submit', label: 'GTP Submission', desc: 'Upload & submit vendor GTP documents', icon: '📑' },
  { key: 'gtp_approve', label: 'GTP Approval', desc: 'Review, approve, or reject vendor GTP submissions', icon: '✅' },
  { key: 'di_offer', label: 'Inspection Offer', desc: 'Submit material inspection call / offers', icon: '🔍' },
  { key: 'di_issue', label: 'DI Issuance', desc: 'Approve inspection and issue Dispatch Instruction', icon: '🚚' },
  { key: 'receive_record', label: 'Material Receive (Store)', desc: 'Record store receipts and stock entries', icon: '📦' },
  { key: 'billing_submit', label: 'Vendor Billing', desc: 'Submit supply and erection invoices', icon: '💰' },
  { key: 'billing_pay', label: 'Payment Processing', desc: 'Verify invoices and record payments', icon: '💳' },
  { key: 'daily_log', label: 'Daily Progress (DPR)', desc: 'Log daily cable laying and site progress', icon: '🚜' },
  { key: 'daily_verify', label: 'DPR Verification', desc: 'Verify and certify daily site progress', icon: '✔️' },
  { key: 'users_manage', label: 'User Admin', desc: 'Manage user logins and custom authorizations', icon: '👥' }
];

export const ROLE_DEFAULT_PERMISSIONS = {
  Admin: {
    survey_entry: true, boq_edit: true, gtp_submit: true, gtp_approve: true,
    di_offer: true, di_issue: true, receive_record: true, billing_submit: true,
    billing_pay: true, daily_log: true, daily_verify: true, users_manage: true
  },
  Division: {
    survey_entry: true, boq_edit: false, gtp_submit: false, gtp_approve: true,
    di_offer: false, di_issue: true, receive_record: false, billing_submit: false,
    billing_pay: false, daily_log: true, daily_verify: true, users_manage: false
  },
  Divisional: {
    survey_entry: true, boq_edit: false, gtp_submit: false, gtp_approve: true,
    di_offer: false, di_issue: true, receive_record: false, billing_submit: false,
    billing_pay: false, daily_log: true, daily_verify: true, users_manage: false
  },
  Region: {
    survey_entry: true, boq_edit: true, gtp_submit: false, gtp_approve: true,
    di_offer: false, di_issue: true, receive_record: false, billing_submit: false,
    billing_pay: true, daily_log: false, daily_verify: true, users_manage: false
  },
  WBSEDCL: {
    survey_entry: true, boq_edit: true, gtp_submit: false, gtp_approve: true,
    di_offer: false, di_issue: true, receive_record: false, billing_submit: false,
    billing_pay: true, daily_log: false, daily_verify: true, users_manage: false
  },
  Vendor: {
    survey_entry: false, boq_edit: false, gtp_submit: true, gtp_approve: false,
    di_offer: true, di_issue: false, receive_record: false, billing_submit: true,
    billing_pay: false, daily_log: true, daily_verify: false, users_manage: false
  },
  Turnkey: {
    survey_entry: false, boq_edit: false, gtp_submit: true, gtp_approve: false,
    di_offer: true, di_issue: false, receive_record: false, billing_submit: true,
    billing_pay: false, daily_log: true, daily_verify: false, users_manage: false
  },
  Store: {
    survey_entry: false, boq_edit: false, gtp_submit: false, gtp_approve: false,
    di_offer: false, di_issue: false, receive_record: true, billing_submit: false,
    billing_pay: false, daily_log: false, daily_verify: false, users_manage: false
  },
  Viewer: {
    survey_entry: false, boq_edit: false, gtp_submit: false, gtp_approve: false,
    di_offer: false, di_issue: false, receive_record: false, billing_submit: false,
    billing_pay: false, daily_log: false, daily_verify: false, users_manage: false
  }
};

let simulatedRole = null;

function getUserPermissions(targetUser) {
  if (!targetUser) return {};
  if (targetUser.permissions && typeof targetUser.permissions === 'object' && Object.keys(targetUser.permissions).length > 0) {
    return targetUser.permissions;
  }
  const role = targetUser.role || 'Viewer';
  return ROLE_DEFAULT_PERMISSIONS[role] || ROLE_DEFAULT_PERMISSIONS.Viewer;
}

function can(permKey) {
  if (!user || !user.active) return false;
  if (sessionUser && user.role === 'Admin' && simulatedRole) {
    const simDefaults = ROLE_DEFAULT_PERMISSIONS[simulatedRole] || ROLE_DEFAULT_PERMISSIONS.Viewer;
    return Boolean(simDefaults[permKey]);
  }
  if (user.role === 'Admin') return true;
  const perms = getUserPermissions(user);
  return Boolean(perms[permKey]);
}

function effectiveRole() {
  if (sessionUser && user.role === 'Admin' && simulatedRole) return simulatedRole;
  return user.role || '';
}

function roleKey() {
  return String(effectiveRole()).trim().toLowerCase();
}
function isAdmin() {
  if (sessionUser && user.role === 'Admin' && simulatedRole) return simulatedRole === 'Admin';
  return user.role === 'Admin' || can('users_manage');
}
function isRegion() {
  return can('boq_edit') || can('gtp_approve') || can('billing_pay') || isAdmin();
}
function isDivision() {
  return can('survey_entry') || isRegion() || isAdmin();
}
function isVendor() {
  return can('gtp_submit') || can('di_offer') || can('billing_submit') || can('daily_log');
}
function isStore() {
  return can('receive_record');
}
function isViewer() {
  return !isAdmin() && !isDivision() && !isVendor() && !isStore();
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
let boqTab = 'overview';
let boqPart = 'Part-A (Material)';
let contractData = null;
let gtpTab = 'all';
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
let siteActivities = [];
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
    const cached = remote.cachedRegister(user.role === 'Admin' || can('users_manage'));
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
  const data = await remote.loadRegister(user.role === 'Admin' || can('users_manage'));
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
  siteActivities = data.activities || [];
  contractData = data.contract || defaultContract();
  people = data.people || [];
  boqItems.forEach((item) => {
    ensurePipeline(item);
    data.approvals
      .filter((row) => row.itemSl === item.slNo)
      .forEach((row) => {
        const targets = row.kind === 'gtp_vendor'
          ? [item.pipeline.gtpDoc, item.pipeline.vendorAppr]
          : [row.kind === 'gtp' ? item.pipeline.gtpDoc : item.pipeline.vendorAppr];
        targets.forEach((target) => {
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
            <option value="Division"${simulatedRole === 'Division' ? ' selected' : ''}>🗺️ Division (Survey & DPR)</option>
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
  const canManage = can('users_manage') || isAdmin();

  const rows = people.map((person) => {
    const isSelf = sessionUser?.id === person.id;
    const shortId = person.email.endsWith('@malda-ug.gov.in')
      ? person.email.replace('@malda-ug.gov.in', '')
      : person.email;

    const perms = getUserPermissions(person);
    const enabledPerms = PERMISSION_DEFS.filter((d) => Boolean(perms[d.key]));
    const enabledCount = enabledPerms.length;

    let badgesHtml = '';
    if (enabledCount === PERMISSION_DEFS.length) {
      badgesHtml = '<span class="badge ok" style="font-size: 11px;">👑 All 12 (Full Access)</span>';
    } else if (enabledCount === 0) {
      badgesHtml = '<span class="badge bad" style="font-size: 11px;">🚫 None (Blocked)</span>';
    } else {
      const topBadges = enabledPerms.slice(0, 3).map((d) => `<span class="perm-pill">${d.icon} ${esc(d.label.split(' ')[0])}</span>`).join(' ');
      const extra = enabledCount > 3 ? `<span class="perm-pill-more">+${enabledCount - 3} more</span>` : '';
      badgesHtml = `<div style="display: flex; flex-wrap: wrap; gap: 4px; align-items: center;">${topBadges} ${extra}</div>`;
    }

    return `
      <tr>
        <td>
          <div style="font-weight: 700; color: #0f172a;">${esc(person.name)}</div>
          <span class="meta">ID: <code>${esc(shortId)}</code> (${esc(person.email)})</span>
        </td>
        <td>
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <div>${badgesHtml}</div>
            ${canManage ? `
              <div>
                <button type="button" class="tiny primary" data-action="edit-user-perms" data-id="${esc(person.id)}" style="display: inline-flex; align-items: center; gap: 4px; font-weight: 650; padding: 3px 9px;">
                  <span>⚙️</span> Authorizations (${enabledCount}/12)
                </button>
              </div>
            ` : ''}
          </div>
        </td>
        <td>
          <select data-person="${esc(person.id)}" data-field="role" style="font-size: 12px; padding: 4px 6px;">
            ${['Admin', 'Division', 'Region', 'Vendor', 'Store', 'Viewer'].map((r) => `<option${r === person.role ? ' selected' : ''}>${r}</option>`).join('')}
          </select>
        </td>
        <td>
          <select data-person="${esc(person.id)}" data-field="active" style="font-size: 12px; padding: 4px 6px;">
            <option${person.active ? ' selected' : ''}>Active</option>
            <option${!person.active ? ' selected' : ''}>Inactive</option>
          </select>
        </td>
        <td>
          <div style="display: flex; gap: 6px; align-items: center;">
            ${canManage ? `
              <button type="button" class="tiny" data-action="save-person" data-id="${esc(person.id)}">Save</button>
              <button type="button" class="tiny ghost" data-action="reset-pin" data-id="${esc(person.id)}" data-name="${esc(person.name)}">Reset PIN</button>
            ` : '<span class="quiet">View Only</span>'}
          </div>
        </td>
      </tr>
    `;
  });

  return `
    ${head('People & Custom Authorizations', 'Create user accounts and configure granular on/off authorizations for each individual user.')}

    <form class="auth-card" id="form-create-user" style="max-width: 100%; width: 100%; margin: 0 0 24px 0; box-shadow: none;">
      <h2 style="margin: 0; font-size: 16px;">Create New User Account & Authorizations</h2>
      <p style="margin-top: 2px; font-size: 12px; color: var(--muted);">Specify User ID, PIN, Name, and choose custom ON/OFF authorizations for the user.</p>
      
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
        <label>Role Preset
          <select name="role" id="new-user-role" required style="padding: 8px; border: 1px solid var(--line); border-radius: 6px; background: #fff; color: var(--text);">
            <option value="Division">Division (Survey & DPR)</option>
            <option value="Region">Region (WBSEDCL DE)</option>
            <option value="Vendor" selected>Vendor / Turnkey</option>
            <option value="Store">Store Keeper</option>
            <option value="Viewer">Viewer (Read Only)</option>
            <option value="Admin">Admin (Full Access)</option>
          </select>
        </label>
      </div>

      <!-- Compact Checklist of 12 Authorizations with ON/OFF Switches -->
      <div style="margin-top: 14px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; background: #f8fafc;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span style="font-size: 12.5px; font-weight: 700; color: #1e293b;">
            ⚙️ Turn Individual Authorizations ON / OFF for this User:
          </span>
          <span style="font-size: 11px; color: #64748b;">Preset auto-selects defaults; feel free to toggle any switch</span>
        </div>
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 8px;">
          ${PERMISSION_DEFS.map((def) => {
            const defaultVendor = Boolean(ROLE_DEFAULT_PERMISSIONS.Vendor[def.key]);
            return `
              <label style="display: flex; align-items: center; gap: 8px; font-size: 12px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 10px; cursor: pointer;">
                <input type="checkbox" name="perm_${def.key}" ${defaultVendor ? 'checked' : ''} style="accent-color: #2563eb;" />
                <span>${def.icon} <strong>${def.label}</strong></span>
              </label>
            `;
          }).join('')}
        </div>
      </div>

      <p class="form-msg" style="margin-top: 8px;"></p>
      <div style="margin-top: 10px; display: flex; gap: 8px;">
        <button type="submit" class="primary" style="width: auto; padding: 8px 18px; font-weight: 700;">Create User Account</button>
      </div>
    </form>

    <h2 style="font-size: 16px; margin: 16px 0 8px;">Existing User Accounts (${people.length})</h2>
    ${table(['Name & User ID', 'Custom Authorizations (On / Off)', 'Role Preset', 'Access Status', 'Actions'], rows, 5, 'No logins yet.')}
  `;
}

function userPermissionsModal(person) {
  if (!person) return '';
  const shortId = person.email.endsWith('@malda-ug.gov.in')
    ? person.email.replace('@malda-ug.gov.in', '')
    : person.email;
  const currentPerms = getUserPermissions(person);
  const enabledCount = PERMISSION_DEFS.filter((d) => Boolean(currentPerms[d.key])).length;

  return `
    ${modalTitle('Custom User Authorizations', `Configure granular ON/OFF permissions for ${esc(person.name)} (${esc(shortId)})`)}
    <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; margin: 10px 0 14px;">
      <div style="font-size: 11px; font-weight: 700; color: #475569; text-transform: uppercase; margin-bottom: 6px;">
        Quick Apply Preset:
      </div>
      <div style="display: flex; flex-wrap: wrap; gap: 6px;">
        <button type="button" class="tiny ghost" data-action="perm-preset" data-preset="Admin">👑 Full Admin</button>
        <button type="button" class="tiny ghost" data-action="perm-preset" data-preset="Division">🗺️ Division (Survey & DPR)</button>
        <button type="button" class="tiny ghost" data-action="perm-preset" data-preset="Region">🏢 Region (DE)</button>
        <button type="button" class="tiny ghost" data-action="perm-preset" data-preset="Vendor">🚜 Turnkey / Vendor</button>
        <button type="button" class="tiny ghost" data-action="perm-preset" data-preset="Store">📦 Store Keeper</button>
        <button type="button" class="tiny ghost" data-action="perm-preset" data-preset="Viewer">👁️ View Only</button>
        <button type="button" class="tiny ghost" data-action="perm-preset" data-preset="all" style="color: #2563eb; font-weight: 700;">Select All</button>
        <button type="button" class="tiny ghost" data-action="perm-preset" data-preset="none" style="color: #dc2626; font-weight: 700;">Clear All</button>
      </div>
    </div>

    <form class="entry entry-plain" id="form-user-permissions" data-id="${esc(person.id)}">
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 10px; max-height: 52vh; overflow-y: auto; padding: 2px;">
        ${PERMISSION_DEFS.map((def) => {
          const isChecked = Boolean(currentPerms[def.key]);
          return `
            <label class="perm-toggle-card${isChecked ? ' active' : ''}" style="display: flex; align-items: center; justify-content: space-between; border: 1.5px solid ${isChecked ? '#2563eb' : '#e2e8f0'}; border-radius: 8px; padding: 10px 12px; background: ${isChecked ? '#eff6ff' : '#ffffff'}; cursor: pointer; transition: all 0.15s ease;">
              <div style="display: flex; align-items: flex-start; gap: 9px; flex: 1; margin-right: 12px;">
                <span style="font-size: 18px; line-height: 1.2;">${def.icon}</span>
                <div>
                  <div style="font-weight: 700; font-size: 13px; color: #0f172a;">${def.label}</div>
                  <div style="font-size: 11px; color: #64748b; margin-top: 1px;">${def.desc}</div>
                </div>
              </div>
              <input type="checkbox" name="perm_${def.key}" ${isChecked ? 'checked' : ''} class="perm-switch" style="width: 18px; height: 18px; cursor: pointer; accent-color: #2563eb;" />
            </label>
          `;
        }).join('')}
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 16px; border-top: 1px solid #e2e8f0; padding-top: 12px;">
        <span style="font-size: 12px; color: #64748b;" id="perm-counter">${enabledCount} of 12 Authorizations Enabled</span>
        <div style="display: flex; gap: 8px;">
          <button type="button" class="ghost" data-action="close-dialog">Cancel</button>
          <button type="submit" class="primary" style="font-weight: 700; padding: 8px 20px;">Save Authorizations</button>
        </div>
      </div>
    </form>
  `;
}

function defaultContract() {
  return {
    id: 'MALDA-UG-MAIN',
    loaNo: PROJECT_INFO.poNumber || 'WBSEDCL/RE/Malda/UG/2023-24/01',
    loaDate: PROJECT_INFO.poDate || '2024-01-16',
    acceptanceDate: '',
    acceptanceRef: '',
    scheduleSubDate: '',
    scheduleSubRef: '',
    scheduleSubRemarks: '',
    scheduleApprDate: '',
    scheduleApprRef: '',
    scheduleApprStatus: 'Pending',
    scheduleApprRemarks: '',
    targetCompletionDate: PROJECT_INFO.targetCompletionDate || '2025-07-15',
    bgEntries: [],
    eotEntries: [],
    feederSurveys: remote.defaultFeederSurveys ? remote.defaultFeederSurveys() : [],
    remarks: '',
    updatedBy: '',
    updatedAt: ''
  };
}

function effectiveTargetCompletionDate() {
  const c = contractData || defaultContract();
  const approvedEots = (c.eotEntries || [])
    .filter((e) => e.status === 'Approved' && e.revisedDate)
    .sort((a, b) => String(b.revisedDate).localeCompare(String(a.revisedDate)));
  if (approvedEots.length > 0) return approvedEots[0].revisedDate;
  return c.targetCompletionDate || PROJECT_INFO.targetCompletionDate || '2025-07-15';
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

  const contract = contractData || defaultContract();
  const effTarget = effectiveTargetCompletionDate();
  const days = daysUntil(effTarget);
  const activeBgs = (contract.bgEntries || []).filter((b) => b.status !== 'Released');
  const totalBgAmount = sum(activeBgs, (b) => Number(b.amount) || 0);
  const approvedEots = (contract.eotEntries || []).filter((e) => e.status === 'Approved');

  const buttons = PAGES.filter((page) => page.id !== 'home' && canOpen(page.id));

  return `
    <div class="page-head">
      <div>
        <h1>Malda UG Cable</h1>
        <p>${esc(user.name || effectiveRole())} · ${esc(effectiveRole())} · ${esc(PROJECT_INFO.turnkeyAgency)}</p>
      </div>
    </div>
    <div class="kpis">
      ${kpi('Scope', formatCr(PROJECT_INFO.totalPoValue), `${material.length} material · ${erection.length} erection`)}
      ${kpi('Progress', `${progress.toFixed(1)}%`, `${formatMoney(executedValue)} executed`)}
      ${kpi('Material', `${receivedPct.toFixed(1)}%`, `${formatMoney(materialReceived)} received`)}
      ${kpi('Target', formatDisplayDate(effTarget), days >= 0 ? `${days} days left` : `${Math.abs(days)} days past target`, 'open-contract-overview')}
      ${kpi('Billing', formatMoney(paid), `${formatMoney(claimed)} claimed, not paid`)}
    </div>

    <div class="contract-banner-card" data-action="open-contract-overview" title="Open Contract Milestones & Overview">
      <div class="contract-banner-main">
        <span class="contract-badge">Contract Milestones & Overview</span>
        <h3>LOA: ${esc(contract.loaNo || PROJECT_INFO.poNumber)} · Target: ${esc(formatDisplayDate(effTarget))}</h3>
        <p class="contract-banner-sub">
          LOA Date: <strong>${esc(formatDisplayDate(contract.loaDate || PROJECT_INFO.poDate))}</strong> ·
          L1/L2 Schedule: <strong>${esc(contract.scheduleApprStatus || 'Pending')}</strong> ·
          Bank Guarantees: <strong>${activeBgs.length} Active</strong> (${formatMoney(totalBgAmount)}) ·
          EOT: <strong>${approvedEots.length} Approved</strong>
        </p>
      </div>
      <div>
        <button type="button" class="contract-banner-btn" data-action="open-contract-overview">
          Contract Overview &rarr;
        </button>
      </div>
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
  const tabs = [
    ['overview', 'Overview & Milestones'],
    ['survey', 'Feeder Survey'],
    ['material', 'Material (Part-A)'],
    ['erection', 'Erection (Part-B)']
  ];

  if (boqTab === 'overview') {
    return renderBoqOverview(tabs);
  }
  if (boqTab === 'survey') {
    return renderBoqSurvey(tabs);
  }

  const material = boqTab === 'material' || (boqTab !== 'erection' && boqPart !== 'Part-B (Erection)');
  const hint = isAdmin()
    ? 'Edit updates the line. Survey quantity is entered here.'
    : 'Click an item to enter survey quantity.';

  const materialItems = boqItems.filter(isMaterial);
  const erectionItems = boqItems.filter((item) => !isMaterial(item));

  // Partition Material items: LOA Baseline (rate > 0) vs Erection-Supplied / Extra Items (rate === 0)
  const loaMaterialItems = materialItems.filter((item) => Number(item.rate) > 0);
  const erectionSupplyItems = materialItems.filter((item) => (Number(item.rate) || 0) === 0);

  const partMaterialTotal = sum(loaMaterialItems, (item) => (Number(item.loaQty) || 0) * (Number(item.rate) || 0));
  const partErectionTotal = sum(erectionItems, (item) => (Number(item.loaQty) || 0) * (Number(item.rate) || 0));
  const currentPartTotal = material ? partMaterialTotal : partErectionTotal;

  const materialExecutedTotal = sum(loaMaterialItems, (item) => (Number(executedQty(item)) || 0) * (Number(item.rate) || 0));
  const erectionExecutedTotal = sum(erectionItems, (item) => (Number(executedQty(item)) || 0) * (Number(item.rate) || 0));
  const currentExecutedTotal = material ? materialExecutedTotal : erectionExecutedTotal;

  const grandTotalExclGst = partMaterialTotal + partErectionTotal;
  const gstRate = PROJECT_INFO.gstRate || 0.18;
  const gstAmount = grandTotalExclGst * gstRate;
  const grandTotalWithGst = grandTotalExclGst + gstAmount;

  const contract = contractData || defaultContract();

  let scheduleContent = '';

  if (material) {
    // ----------------------------------------------------
    // PART-A (MATERIAL): TWO SEPARATE CLEAN GROUPS
    // ----------------------------------------------------
    const loaTableFooter = `
      <tr class="boq-foot-row">
        <td colspan="3"><strong>Total Part-A LOA Baseline (${loaMaterialItems.length} Items)</strong></td>
        <td class="num"></td>
        <td class="num"></td>
        <td class="num quiet" style="font-weight:650;">Baseline Subtotal (Excl. GST):</td>
        <td class="num font-mono"><strong style="font-size: 13.5px; color: #0f172a;">${formatInr(partMaterialTotal)}</strong></td>
        <td class="num font-mono"><strong style="color: #059669;">${formatMoney(materialExecutedTotal)}</strong></td>
        <td></td>
      </tr>
    `;

    const erectionSupplyTableFooter = `
      <tr class="boq-foot-row" style="background: #fffbeb;">
        <td colspan="3"><strong>Total Erection-Supplied Materials (${erectionSupplyItems.length} Items)</strong></td>
        <td class="num"></td>
        <td class="num"></td>
        <td class="num quiet" style="font-weight:650;">Direct Material Cost:</td>
        <td class="num font-mono"><strong style="color: #b45309;">₹0.00 (Covered in Erection)</strong></td>
        <td class="num font-mono"><strong style="color: #059669;">${formatMoney(sum(erectionSupplyItems, (item) => (Number(executedQty(item)) || 0) * (Number(item.rate) || 0)))}</strong></td>
        <td></td>
      </tr>
    `;

    scheduleContent = `
      <!-- Group 1: Official LOA Baseline Material Schedule -->
      <div class="boq-group-header">
        <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <h3 style="margin: 0; font-size: 14px;">Part-A: Material Schedule</h3>
            <span class="badge ok">${loaMaterialItems.length} Items</span>
          </div>
          <div style="font-weight: 700; font-size: 13px; color: #0f172a;">
            Total: ${formatInr(partMaterialTotal)}
          </div>
        </div>
      </div>

      ${table(['Sl', 'Description', 'Unit', numHead('LOA Qty'), numHead('Survey Qty'), numHead('Rate (₹)'), numHead('Total Cost (₹)'), numHead('Executed'), ''], loaMaterialItems.map((item) => {
        const itemCost = (Number(item.loaQty) || 0) * (Number(item.rate) || 0);
        const executedCost = (Number(executedQty(item)) || 0) * (Number(item.rate) || 0);
        return `
          <tr class="pick" data-action="open-entry" data-sl="${item.slNo}" data-q="${esc(searchText(item, itemTitle(item)))}">
            <td>${item.slNo}</td>
            <td class="desc" title="${esc(item.description)}">${nameButton(item)}</td>
            <td>${esc(item.unit)}</td>
            <td class="num">${qtyText(item.loaQty, item.unit)}</td>
            <td class="num">${surveyText(item)}</td>
            <td class="num">${fmtQty(item.rate)}</td>
            <td class="num font-mono"><strong>${formatInr(itemCost)}</strong></td>
            <td class="num">${qtyText(executedQty(item), item.unit)}</td>
            <td class="row-actions">${isAdmin() ? `<button type="button" class="tiny" data-action="open-entry" data-sl="${item.slNo}">Edit</button><button type="button" class="tiny danger" data-action="delete-boq" data-sl="${item.slNo}">Delete</button>` : ''}</td>
          </tr>
        `;
      }), 9, 'No baseline material items found.', loaTableFooter)}

      <!-- Group 2: Items Part of Erection Schedule -->
      <div class="boq-group-header erection-supply-header" style="margin-top: 24px;">
        <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <h3 style="margin: 0; font-size: 14px;">Materials Supplied under Erection Scope</h3>
            <span class="badge wait">${erectionSupplyItems.length} Items</span>
          </div>
          <div class="quiet" style="font-size: 12px; font-weight: 600;">
            Supplied within Erection Scope (₹0 Rate)
          </div>
        </div>
      </div>

      ${erectionSupplyItems.length > 0 ? table(['Sl', 'Description', 'Unit', numHead('LOA Qty'), numHead('Survey Qty'), numHead('Rate (₹)'), numHead('Total Cost (₹)'), numHead('Executed'), ''], erectionSupplyItems.map((item) => {
        return `
          <tr class="pick" data-action="open-entry" data-sl="${item.slNo}" data-q="${esc(searchText(item, itemTitle(item)))}">
            <td>${item.slNo}</td>
            <td class="desc" title="${esc(item.description)}">${nameButton(item)}</td>
            <td>${esc(item.unit)}</td>
            <td class="num">${qtyText(item.loaQty, item.unit)}</td>
            <td class="num">${surveyText(item)}</td>
            <td class="num"><span class="quiet">₹0.00</span></td>
            <td class="num font-mono"><span class="quiet">₹0.00</span></td>
            <td class="num">${qtyText(executedQty(item), item.unit)}</td>
            <td class="row-actions">${isAdmin() ? `<button type="button" class="tiny" data-action="open-entry" data-sl="${item.slNo}">Edit</button><button type="button" class="tiny danger" data-action="delete-boq" data-sl="${item.slNo}">Delete</button>` : ''}</td>
          </tr>
        `;
      }), 9, 'No erection-supplied material items found.', erectionSupplyTableFooter) : ''}
    `;
  } else {
    // ----------------------------------------------------
    // PART-B (ERECTION SCHEDULE)
    // ----------------------------------------------------
    const erectionTableFooter = `
      <tr class="boq-foot-row">
        <td colspan="3"><strong>Total Part-B LOA Baseline (${erectionItems.length} Items)</strong></td>
        <td class="num"></td>
        <td class="num"></td>
        <td class="num quiet" style="font-weight:650;">Subtotal (Excl. GST):</td>
        <td class="num font-mono"><strong style="font-size: 13.5px; color: #0f172a;">${formatInr(partErectionTotal)}</strong></td>
        <td class="num font-mono"><strong style="color: #059669;">${formatMoney(erectionExecutedTotal)}</strong></td>
        <td></td>
      </tr>
    `;

    scheduleContent = `
      <div class="boq-group-header">
        <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
          <div style="display: flex; align-items: center; gap: 8px;">
            <h3 style="margin: 0; font-size: 14px;">Part-B: Erection Schedule</h3>
            <span class="badge ok">${erectionItems.length} Items</span>
          </div>
          <div style="font-weight: 700; font-size: 13px; color: #0f172a;">
            Total: ${formatInr(partErectionTotal)}
          </div>
        </div>
      </div>

      ${table(['Sl', 'Description', 'Unit', numHead('LOA Qty'), numHead('Survey Qty'), numHead('Rate (₹)'), numHead('Total Cost (₹)'), numHead('Executed'), ''], erectionItems.map((item) => {
        const itemCost = (Number(item.loaQty) || 0) * (Number(item.rate) || 0);
        const executedCost = (Number(executedQty(item)) || 0) * (Number(item.rate) || 0);
        return `
          <tr class="pick" data-action="open-entry" data-sl="${item.slNo}" data-q="${esc(searchText(item, itemTitle(item)))}">
            <td>${item.slNo}</td>
            <td class="desc" title="${esc(item.description)}">${nameButton(item)}</td>
            <td>${esc(item.unit)}</td>
            <td class="num">${qtyText(item.loaQty, item.unit)}</td>
            <td class="num">${surveyText(item)}</td>
            <td class="num">${fmtQty(item.rate)}</td>
            <td class="num font-mono"><strong>${formatInr(itemCost)}</strong></td>
            <td class="num">${qtyText(executedQty(item), item.unit)}</td>
            <td class="row-actions">${isAdmin() ? `<button type="button" class="tiny" data-action="open-entry" data-sl="${item.slNo}">Edit</button><button type="button" class="tiny danger" data-action="delete-boq" data-sl="${item.slNo}">Delete</button>` : ''}</td>
          </tr>
        `;
      }), 9, 'No erection items found.', erectionTableFooter)}
    `;
  }

  return `
    ${head('Bill of Quantities (BOQ)', 'LOA contract schedule items, rates, and executed quantities.')}
    <div class="tab-row">
      ${tabBar('boq', tabs, boqTab)}
      ${isAdmin() ? '<button type="button" class="ghost" data-action="open-entry" data-mode="new">New item</button>' : ''}
    </div>

    <div class="kpis" style="margin-top: 14px; margin-bottom: 14px;">
      ${kpi(material ? 'Part-A Scope' : 'Part-B Scope', formatCr(currentPartTotal), `${material ? loaMaterialItems.length : erectionItems.length} Items`)}
      ${kpi('Executed Value', formatMoney(currentExecutedTotal), `${currentPartTotal > 0 ? ((currentExecutedTotal / currentPartTotal) * 100).toFixed(1) : 0}% progress`)}
      ${kpi('Total (Excl. GST)', formatCr(grandTotalExclGst), `Material: ${formatCr(partMaterialTotal)} · Erection: ${formatCr(partErectionTotal)}`)}
      ${kpi('With 18% GST', formatCr(grandTotalWithGst), `GST: ${formatCr(gstAmount)}`)}
    </div>

    ${scheduleContent}

    ${renderLoaSummarySection({
      material,
      partMaterialTotal,
      partErectionTotal,
      grandTotalExclGst,
      gstAmount,
      grandTotalWithGst,
      materialExecutedTotal,
      erectionExecutedTotal
    })}
  `;
}

function renderLoaSummarySection({
  material,
  partMaterialTotal,
  partErectionTotal,
  grandTotalExclGst,
  gstAmount,
  grandTotalWithGst,
  materialExecutedTotal,
  erectionExecutedTotal
}) {
  const contract = contractData || defaultContract();
  return `
    <div class="compact-card" style="margin-top: 20px;">
      <div class="compact-card-header">
        <div>
          <h3>LOA Schedule Financial Summary</h3>
          <p>Contract Baseline · LOA No. <strong>${esc(contract.loaNo || PROJECT_INFO.poNumber)}</strong></p>
        </div>
        <button type="button" class="tiny ghost" data-action="page-tab" data-group="boq" data-tab="overview">
          Full Contract Overview →
        </button>
      </div>

      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(190px, 1fr)); gap: 10px; margin-top: 4px;">
        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px;">
          <div class="quiet" style="font-size: 11px; text-transform: uppercase; font-weight: 650;">Part-A Material</div>
          <div style="font-size: 16px; font-weight: 700; color: #1e3a8a; margin-top: 2px;">${formatInr(partMaterialTotal)}</div>
          <div class="quiet" style="font-size: 11px; margin-top: 2px;">Executed: <strong style="color: #059669;">${formatMoney(materialExecutedTotal)}</strong></div>
        </div>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px;">
          <div class="quiet" style="font-size: 11px; text-transform: uppercase; font-weight: 650;">Part-B Erection</div>
          <div style="font-size: 16px; font-weight: 700; color: #065f46; margin-top: 2px;">${formatInr(partErectionTotal)}</div>
          <div class="quiet" style="font-size: 11px; margin-top: 2px;">Executed: <strong style="color: #059669;">${formatMoney(erectionExecutedTotal)}</strong></div>
        </div>

        <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 10px 12px;">
          <div class="quiet" style="font-size: 11px; text-transform: uppercase; font-weight: 650;">Subtotal (Excl. GST)</div>
          <div style="font-size: 16px; font-weight: 700; color: #0f172a; margin-top: 2px;">${formatInr(grandTotalExclGst)}</div>
          <div class="quiet" style="font-size: 11px; margin-top: 2px;">GST (18%): ${formatInr(gstAmount)}</div>
        </div>

        <div style="background: #ecfdf5; border: 1px solid #a7f3d0; border-radius: 6px; padding: 10px 12px;">
          <div style="font-size: 11px; text-transform: uppercase; font-weight: 700; color: #065f46;">Total Order Value</div>
          <div style="font-size: 16px; font-weight: 800; color: #065f46; margin-top: 2px;">${formatInr(grandTotalWithGst)}</div>
          <div style="font-size: 11px; color: #047857; margin-top: 2px;">Incl. 18% GST (${formatCr(grandTotalWithGst)})</div>
        </div>
      </div>
    </div>
  `;
}

function renderBoqOverview(tabs) {
  const contract = contractData || defaultContract();
  const effTarget = effectiveTargetCompletionDate();
  const days = daysUntil(effTarget);
  const canEdit = isRegion() || isAdmin();

  const bgs = contract.bgEntries || [];
  const activeBgs = bgs.filter((b) => b.status !== 'Released');
  const totalBgSubmitted = sum(bgs, (b) => Number(b.amount) || 0);
  const totalBgActive = sum(activeBgs, (b) => Number(b.amount) || 0);

  const eots = contract.eotEntries || [];
  const approvedEots = eots.filter((e) => e.status === 'Approved');

  const materialItems = boqItems.filter(isMaterial);
  const erectionItems = boqItems.filter((item) => !isMaterial(item));
  const loaMaterialItems = materialItems.filter((item) => Number(item.rate) > 0);
  const erectionSupplyItems = materialItems.filter((item) => (Number(item.rate) || 0) === 0);

  const partMaterialTotal = sum(loaMaterialItems, (item) => (Number(item.loaQty) || 0) * (Number(item.rate) || 0));
  const partErectionTotal = sum(erectionItems, (item) => (Number(item.loaQty) || 0) * (Number(item.rate) || 0));
  const grandTotalExclGst = partMaterialTotal + partErectionTotal;
  const gstRate = PROJECT_INFO.gstRate || 0.18;
  const gstAmount = grandTotalExclGst * gstRate;
  const grandTotalWithGst = grandTotalExclGst + gstAmount;

  const materialPct = grandTotalExclGst > 0 ? ((partMaterialTotal / grandTotalExclGst) * 100).toFixed(2) : '0.00';
  const erectionPct = grandTotalExclGst > 0 ? ((partErectionTotal / grandTotalExclGst) * 100).toFixed(2) : '0.00';

  const l1StatusBadge = contract.scheduleApprStatus === 'Approved'
    ? '<span class="badge ok">Approved</span>'
    : contract.scheduleApprStatus === 'Revision Requested'
    ? '<span class="badge bad">Revision Req.</span>'
    : contract.scheduleApprStatus === 'Conditional'
    ? '<span class="badge wait">Conditional</span>'
    : '<span class="badge wait">Pending</span>';

  return `
    ${head('Contract & BOQ Overview', 'Baseline financial schedule, survey variation tracking, and milestones.')}
    <div class="tab-row">
      ${tabBar('boq', tabs, 'overview')}
      ${canEdit ? '<button type="button" class="ghost" data-action="contract-edit-milestones">Edit Milestones</button>' : ''}
    </div>

    <!-- Executive KPIs -->
    <div class="overview-kpis">
      <div class="overview-kpi-card kpi-loa">
        <div class="overview-kpi-top">
          <span class="overview-kpi-label">Contract Value (LOA)</span>
        </div>
        <div class="overview-kpi-value">${formatCr(grandTotalExclGst)}</div>
        <div class="overview-kpi-sub">With 18% GST: <strong>${formatCr(grandTotalWithGst)}</strong></div>
      </div>

      <div class="overview-kpi-card kpi-survey">
        <div class="overview-kpi-top">
          <span class="overview-kpi-label">Post-Survey Value</span>
        </div>
        <div class="overview-kpi-value" style="color: #7c3aed;">Yet to finalize</div>
        <div class="overview-kpi-sub">Joint route survey in progress</div>
      </div>

      <div class="overview-kpi-card kpi-target">
        <div class="overview-kpi-top">
          <span class="overview-kpi-label">Target Completion</span>
        </div>
        <div class="overview-kpi-value">${esc(formatDisplayDate(effTarget))}</div>
        <div class="overview-kpi-sub">${days >= 0 ? `<strong>${days} days</strong> remaining` : `<strong style="color:#b91c1c;">${Math.abs(days)} days</strong> delayed`}</div>
      </div>

      <div class="overview-kpi-card kpi-bg">
        <div class="overview-kpi-top">
          <span class="overview-kpi-label">Bank Guarantees</span>
        </div>
        <div class="overview-kpi-value">${formatMoney(totalBgActive)}</div>
        <div class="overview-kpi-sub"><strong>${activeBgs.length} Active</strong> (${formatMoney(totalBgSubmitted)} submitted)</div>
      </div>
    </div>

    <div class="contract-overview-wrap" style="gap: 14px;">
      <!-- Card 1: Tabulated Executive Cost Summary & Survey Variation Tracking -->
      <div class="compact-card">
        <div class="compact-card-header">
          <div>
            <h3>Executive Cost Summary & Variation Tracking</h3>
            <p>LOA No. <strong>${esc(contract.loaNo || PROJECT_INFO.poNumber)}</strong> · Agency: <strong>${esc(PROJECT_INFO.agencyName || 'M/s Tarun Enterprise')}</strong></p>
          </div>
        </div>

        <div class="overview-cost-table-wrap">
          <table class="overview-cost-table">
            <thead>
              <tr class="overview-cost-superhead">
                <th colspan="4" class="superhead-baseline">LOA Awarded Baseline</th>
                <th colspan="3" class="superhead-survey survey-col-start">Post-Survey Variation</th>
              </tr>
              <tr class="overview-cost-subhead">
                <th style="width: 32%;">Component</th>
                <th style="text-align: center; width: 8%;">Items</th>
                <th style="text-align: right; width: 10%;">Share</th>
                <th style="text-align: right; width: 18%;">Baseline Cost (₹)</th>
                <th class="survey-col survey-col-start" style="text-align: center; width: 14%;">Survey Cost (₹)</th>
                <th class="survey-col" style="text-align: center; width: 12%;">Variation (₹)</th>
                <th class="survey-col" style="text-align: center; width: 6%;">Var %</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Part-A: Material Schedule</strong></td>
                <td style="text-align: center;">${loaMaterialItems.length}</td>
                <td style="text-align: right;">${materialPct}%</td>
                <td style="text-align: right; font-weight: 600;">${formatInr(partMaterialTotal)}</td>
                <td class="survey-col survey-col-start" style="text-align: center; color: #94a3b8;">—</td>
                <td class="survey-col" style="text-align: center; color: #94a3b8;">—</td>
                <td class="survey-col" style="text-align: center; color: #94a3b8;">—</td>
              </tr>
              <tr>
                <td><strong>Part-B: Erection Schedule</strong></td>
                <td style="text-align: center;">${erectionItems.length}</td>
                <td style="text-align: right;">${erectionPct}%</td>
                <td style="text-align: right; font-weight: 600;">${formatInr(partErectionTotal)}</td>
                <td class="survey-col survey-col-start" style="text-align: center; color: #94a3b8;">—</td>
                <td class="survey-col" style="text-align: center; color: #94a3b8;">—</td>
                <td class="survey-col" style="text-align: center; color: #94a3b8;">—</td>
              </tr>
              <tr class="subtotal-row">
                <td><strong>TOTAL AMOUNT (EXCLUDING GST)</strong></td>
                <td style="text-align: center;"><strong>${loaMaterialItems.length + erectionItems.length}</strong></td>
                <td style="text-align: right;">100.0%</td>
                <td style="text-align: right; font-size: 13.5px; color: #0f172a;"><strong>${formatInr(grandTotalExclGst)}</strong></td>
                <td class="survey-col survey-col-start" style="text-align: center;"><span class="badge wait">Yet to finalize</span></td>
                <td class="survey-col" style="text-align: center; color: #94a3b8;">—</td>
                <td class="survey-col" style="text-align: center; color: #94a3b8;">—</td>
              </tr>
              <tr>
                <td>Statutory GST (${(gstRate * 100).toFixed(0)}%)</td>
                <td style="text-align: center;">—</td>
                <td style="text-align: right;">${(gstRate * 100).toFixed(0)}%</td>
                <td style="text-align: right; font-weight: 600;">${formatInr(gstAmount)}</td>
                <td class="survey-col survey-col-start" style="text-align: center; color: #94a3b8;">—</td>
                <td class="survey-col" style="text-align: center; color: #94a3b8;">—</td>
                <td class="survey-col" style="text-align: center; color: #94a3b8;">—</td>
              </tr>
              <tr class="grandtotal-row">
                <td><strong>TOTAL CONTRACT ORDER VALUE (INCL. GST)</strong></td>
                <td style="text-align: center;"><strong>${loaMaterialItems.length + erectionItems.length}</strong></td>
                <td style="text-align: right;">—</td>
                <td style="text-align: right; font-size: 14.5px;"><strong>${formatInr(grandTotalWithGst)}</strong></td>
                <td class="survey-col survey-col-start" style="text-align: center;"><span class="badge wait" style="font-weight:700;">Yet to finalize</span></td>
                <td class="survey-col" style="text-align: center; color: #94a3b8;">—</td>
                <td class="survey-col" style="text-align: center; color: #94a3b8;">—</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div class="overview-inwords-panel" style="margin-top: 10px;">
          <div style="font-size: 11px; font-weight: 700; color: #6b21a8; text-transform: uppercase; letter-spacing: 0.04em;">LOA Baseline in Words</div>
          <div class="inwords-text" style="margin-top: 2px;">${esc(numberToIndianWords(grandTotalExclGst))} (Excl. GST)</div>
          <div class="inwords-gst" style="margin-top: 2px;">Incl. 18% GST: <strong>${esc(numberToIndianWords(grandTotalWithGst))}</strong></div>
        </div>
      </div>

      <!-- Card 2: Tabulated Implementation Milestones -->
      <div class="compact-card">
        <div class="compact-card-header">
          <div>
            <h3>Contract Milestones</h3>
            <p>LOA baseline dates, schedule approvals, and completion timelines</p>
          </div>
          ${canEdit ? '<button type="button" class="tiny ghost" data-action="contract-edit-milestones">Edit Milestones</button>' : ''}
        </div>
        <div class="milestones-tabulated-wrap">
          <table class="milestones-table">
            <thead>
              <tr>
                <th style="width: 28%;">Milestone</th>
                <th style="width: 28%;">Reference / Detail</th>
                <th style="width: 20%;">Status</th>
                <th style="width: 24%;">Date / Timeline</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td><strong>Letter of Award (LOA)</strong></td>
                <td><strong>${esc(contract.loaNo || PROJECT_INFO.poNumber)}</strong></td>
                <td><span class="badge ok">Awarded</span></td>
                <td>${esc(formatDisplayDate(contract.loaDate || PROJECT_INFO.poDate))}</td>
              </tr>
              <tr>
                <td><strong>Date of Acceptance</strong></td>
                <td>${contract.acceptanceRef ? `Ref: <strong>${esc(contract.acceptanceRef)}</strong>` : '—'}</td>
                <td>${contract.acceptanceDate ? '<span class="badge ok">Accepted</span>' : '<span class="badge wait">Pending</span>'}</td>
                <td>${contract.acceptanceDate ? esc(formatDisplayDate(contract.acceptanceDate)) : '<span class="quiet">Pending</span>'}</td>
              </tr>
              <tr>
                <td><strong>Implementation Schedule (L1/L2)</strong></td>
                <td>${contract.scheduleSubRef || (contract.scheduleSubDate ? `Sub: ${formatDisplayDate(contract.scheduleSubDate)}` : '—')}</td>
                <td>${l1StatusBadge}</td>
                <td>${contract.scheduleApprDate ? esc(formatDisplayDate(contract.scheduleApprDate)) : '—'}</td>
              </tr>
              <tr>
                <td><strong>Target Completion</strong></td>
                <td>Original: ${esc(formatDisplayDate(contract.targetCompletionDate || PROJECT_INFO.targetCompletionDate))}</td>
                <td>${approvedEots.length > 0 ? `<span class="badge ok">${approvedEots.length} EOT Rev.</span>` : '<span class="badge ok">Original</span>'}</td>
                <td><strong>${esc(formatDisplayDate(effTarget))}</strong> (${days >= 0 ? `${days}d left` : `${Math.abs(days)}d delayed`})</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Card 3: Bank Guarantees (Multi-entry) -->
      <div class="compact-card">
        <div class="compact-card-header">
          <div>
            <h3>Bank Guarantees (Security & Performance BGs)</h3>
            <p>${activeBgs.length} active (${formatMoney(totalBgActive)}) · Total submitted: ${formatMoney(totalBgSubmitted)}</p>
          </div>
          ${canEdit ? '<button type="button" class="primary tiny" data-action="contract-add-bg">+ Add BG</button>' : ''}
        </div>
        ${table(['BG No.', 'Issuing Bank & Branch', numHead('BG Amount (₹)'), 'Submission Date', 'Expiry Date', 'Claim Expiry', 'Status', 'Remarks', ''], bgs.map((bg, idx) => {
          const bgStatusBadge = bg.status === 'Released'
            ? '<span class="badge idle">Released</span>'
            : bg.status === 'Expired'
            ? '<span class="badge bad">Expired</span>'
            : '<span class="badge ok">Active</span>';
          return `
            <tr>
              <td><strong>${esc(bg.bgNo || '—')}</strong></td>
              <td>${esc(bg.bankName || '—')}</td>
              <td class="num">${formatMoney(bg.amount)}</td>
              <td>${esc(formatDisplayDate(bg.subDate))}</td>
              <td>${esc(formatDisplayDate(bg.expiryDate))}</td>
              <td>${esc(formatDisplayDate(bg.claimDate))}</td>
              <td>${bgStatusBadge}</td>
              <td class="desc" title="${esc(bg.remarks || '')}">${esc(bg.remarks || '—')}</td>
              <td class="row-actions">
                ${canEdit ? `<button type="button" class="tiny" data-action="contract-edit-bg" data-idx="${idx}">Edit</button><button type="button" class="tiny danger" data-action="contract-delete-bg" data-idx="${idx}">Delete</button>` : ''}
              </td>
            </tr>
          `;
        }), 9, 'No Bank Guarantees recorded yet. Region User or Admin can click "+ Add BG" to register one.')}
      </div>

      <!-- Card 4: Target Completion Date & Extensions of Time (EOT) -->
      <div class="compact-card">
        <div class="compact-card-header">
          <div>
            <h3>Completion Target & Time Extensions (EOT)</h3>
            <p>Original target: <strong>${esc(formatDisplayDate(contract.targetCompletionDate || PROJECT_INFO.targetCompletionDate))}</strong> · Effective target: <strong>${esc(formatDisplayDate(effTarget))}</strong> (${approvedEots.length} Approved EOTs)</p>
          </div>
          ${canEdit ? '<button type="button" class="primary tiny" data-action="contract-add-eot">+ Add Revision / EOT</button>' : ''}
        </div>
        ${table(['Rev #', 'Revised Target Date', 'Extension', 'Approval Memo', 'Approval Date', 'Approved By', 'Status', 'Reason / Grounds', ''], eots.map((eot, idx) => {
          const eotStatusBadge = eot.status === 'Approved'
            ? '<span class="badge ok">Approved</span>'
            : eot.status === 'Rejected'
            ? '<span class="badge bad">Rejected</span>'
            : '<span class="badge wait">Pending / Review</span>';
          return `
            <tr>
              <td><strong>Rev-${idx + 1}</strong></td>
              <td><strong>${esc(formatDisplayDate(eot.revisedDate))}</strong></td>
              <td>${esc(eot.extensionDays ? `${eot.extensionDays} days` : '—')}</td>
              <td>${esc(eot.memoNo || '—')}</td>
              <td>${esc(formatDisplayDate(eot.approvalDate))}</td>
              <td>${esc(eot.approvedBy || 'WBSEDCL')}</td>
              <td>${eotStatusBadge}</td>
              <td class="desc" title="${esc(eot.reason || '')}">${esc(eot.reason || '—')}</td>
              <td class="row-actions">
                ${canEdit ? `<button type="button" class="tiny" data-action="contract-edit-eot" data-idx="${idx}">Edit</button><button type="button" class="tiny danger" data-action="contract-delete-eot" data-idx="${idx}">Delete</button>` : ''}
              </td>
            </tr>
          `;
        }), 9, 'No Time Extension (EOT) revisions recorded. Original target date applies.')}
      </div>
    </div>
  `;
}

function extractDtrQty(details, kva) {
  if (!details || typeof details !== 'string') return '';
  const re = new RegExp(`${kva}\\s*kVA[^\\d]*(\\d+)`, 'i');
  const m = details.match(re);
  return m ? m[1] : '';
}

function renderDtrCell(s) {
  const counts = s.dtrCounts || {};
  const standardKeys = ['630', '500', '315', '250', '160', '100'];
  const activeKeys = standardKeys.filter((k) => Number(counts[k]) > 0);

  if (activeKeys.length === 0 && !s.dtrOther) {
    if (s.dtrDetails && s.dtrDetails !== '—') {
      return `<div style="font-size: 11.5px; font-weight: 500;">${esc(s.dtrDetails)}</div>`;
    }
    return '<span class="quiet">—</span>';
  }

  const pills = activeKeys.map((k) => `
    <span class="dtr-pill-badge" title="${k} kVA DTR: ${counts[k]} Nos">
      ${k}k: <strong>${counts[k]}</strong>
    </span>
  `);

  if (s.dtrOther) {
    pills.push(`<span class="dtr-pill-badge custom" title="Other capacity">${esc(s.dtrOther)}</span>`);
  }

  const totalNos = Number(s.dtrTotalNos) || sum(activeKeys, (k) => Number(counts[k]));
  const totalKva = Number(s.dtrTotalKva) || sum(activeKeys, (k) => Number(k) * Number(counts[k]));

  return `
    <div style="display: flex; flex-direction: column; gap: 3px;">
      <div style="display: flex; flex-wrap: wrap; gap: 3px;">${pills.join('')}</div>
      ${totalNos > 0 ? `<div class="quiet" style="font-size: 10px; font-weight: 600; color: #475569;">Total: ${totalNos} Nos (${totalKva.toLocaleString('en-IN')} kVA)</div>` : ''}
    </div>
  `;
}

function renderBoqSurvey(tabs) {
  const contract = contractData || defaultContract();
  // Filter out any legacy dummy records to keep survey register strictly blank until user data entry
  const surveys = (contract.feederSurveys || []).filter((s) => !s.id || !s.id.startsWith('FS-0'));
  const canEdit = isDivision() || isRegion() || isAdmin();

  const totalRouteLength = sum(surveys, (s) => Number(s.routeLength) || 0);
  const totalCable400 = sum(surveys, (s) => Number(s.cable400) || 0);
  const totalCable185 = sum(surveys, (s) => Number(s.cable185) || 0);
  const totalRmu3 = sum(surveys, (s) => Number(s.rmu3Way) || 0);
  const totalRmu4 = sum(surveys, (s) => Number(s.rmu4Way) || 0);
  const totalDtrNos = sum(surveys, (s) => Number(s.dtrTotalNos) || (s.dtrCounts ? sum(Object.values(s.dtrCounts), Number) : 0));
  const totalDtrKva = sum(surveys, (s) => Number(s.dtrTotalKva) || 0);
  const totalKit400 = sum(surveys, (s) => Number(s.termKit400) || 0);
  const totalKit185 = sum(surveys, (s) => Number(s.termKit185) || 0);
  const totalHdd = sum(surveys, (s) => Number(s.microTunneling) || 0);
  const totalOpenCut = sum(surveys, (s) => Number(s.openCut) || 0);
  const totalJackPush = sum(surveys, (s) => Number(s.jackPush) || 0);
  const totalHdpe = sum(surveys, (s) => Number(s.hdpePipe) || 0);

  const completedCount = surveys.filter((s) => s.status === 'Completed' || s.status === 'Approved').length;
  const inProgressCount = surveys.filter((s) => s.status === 'In Progress').length;

  return `
    ${head('Feeder-wise Survey Summary', 'Joint route survey measurements certified by Malda Division.')}
    <div class="tab-row">
      ${tabBar('boq', tabs, 'survey')}
    </div>

    <!-- Feeder Survey Executive KPIs -->
    <div class="overview-kpis">
      <div class="overview-kpi-card kpi-loa">
        <div class="overview-kpi-top">
          <span class="overview-kpi-label">Surveyed Feeders</span>
        </div>
        <div class="overview-kpi-value">${surveys.length} Feeders</div>
        <div class="overview-kpi-sub">${surveys.length > 0 ? `${completedCount} Completed · ${inProgressCount} in progress` : '<span class="quiet">No survey entries yet</span>'}</div>
      </div>

      <div class="overview-kpi-card kpi-survey">
        <div class="overview-kpi-top">
          <span class="overview-kpi-label">Route Length (R/L)</span>
        </div>
        <div class="overview-kpi-value" style="color: #6b21a8;">${(totalRouteLength / 1000).toFixed(2)} km</div>
        <div class="overview-kpi-sub"><strong>${totalRouteLength.toLocaleString('en-IN')} meters</strong> route pegged</div>
      </div>

      <div class="overview-kpi-card kpi-target">
        <div class="overview-kpi-top">
          <span class="overview-kpi-label">HT XLPE Cables</span>
        </div>
        <div class="overview-kpi-value">${((totalCable400 + totalCable185) / 1000).toFixed(2)} km</div>
        <div class="overview-kpi-sub">400: <strong>${(totalCable400 / 1000).toFixed(2)}k</strong> · 185: <strong>${(totalCable185 / 1000).toFixed(2)}k</strong></div>
      </div>

      <div class="overview-kpi-card kpi-bg">
        <div class="overview-kpi-top">
          <span class="overview-kpi-label">RMUs & DTRs</span>
        </div>
        <div class="overview-kpi-value">${totalRmu3 + totalRmu4} RMUs · ${totalDtrNos} DTRs</div>
        <div class="overview-kpi-sub">${totalDtrKva > 0 ? `${totalDtrKva.toLocaleString('en-IN')} kVA Total DTR` : 'HDD: <strong>' + totalHdd.toLocaleString('en-IN') + 'm</strong> · HDPE: <strong>' + totalHdpe.toLocaleString('en-IN') + 'm</strong>'}</div>
      </div>
    </div>

    <!-- Feeder Survey Table Card -->
    <div class="compact-card" style="margin-top: 10px;">
      <div class="compact-card-header">
        <div>
          <h3>Feeder Joint Survey Register</h3>
        </div>
        ${canEdit ? `
          <button type="button" class="primary tiny" data-action="survey-add-feeder">
            + Add Feeder Survey
          </button>
        ` : `
          <span class="badge wait" title="Divisional Engineer or Admin access required">Divisional Access Only</span>
        `}
      </div>

      <div class="feeder-survey-table-wrap">
        <table class="feeder-survey-table">
          <thead>
            <tr class="feeder-superhead">
              <th colspan="3" class="survey-th-id">Feeder Info</th>
              <th colspan="3" class="survey-th-cables">Route & Cables (m)</th>
              <th colspan="3" class="survey-th-equip">RMUs & DTRs</th>
              <th colspan="2" class="survey-th-kits">Kits (Sets)</th>
              <th colspan="4" class="survey-th-trench">Trenching (m)</th>
              <th colspan="2" class="survey-th-status">Status & Actions</th>
            </tr>
            <tr class="feeder-subhead">
              <th style="width: 35px; text-align: center;">#</th>
              <th style="min-width: 130px;">Substation</th>
              <th style="min-width: 160px;">Feeder Name</th>
              
              <th style="min-width: 90px; text-align: right;">Route (m)</th>
              <th style="min-width: 85px; text-align: right;">400 sq.mm</th>
              <th style="min-width: 85px; text-align: right;">185 sq.mm</th>

              <th style="min-width: 60px; text-align: center;">3-Way</th>
              <th style="min-width: 60px; text-align: center;">4-Way</th>
              <th style="min-width: 130px;">DTR Capacity</th>

              <th style="min-width: 65px; text-align: center;">Kit 400</th>
              <th style="min-width: 65px; text-align: center;">Kit 185</th>

              <th style="min-width: 85px; text-align: right;">HDD (m)</th>
              <th style="min-width: 80px; text-align: right;">Open-Cut</th>
              <th style="min-width: 80px; text-align: right;">JackPush</th>
              <th style="min-width: 85px; text-align: right;">HDPE (m)</th>

              <th style="min-width: 75px; text-align: center;">Status</th>
              <th style="min-width: 75px; text-align: center;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${surveys.length === 0 ? `
              <tr>
                <td colspan="17" class="empty" style="text-align: center; padding: 26px 16px; color: #64748b;">
                  No feeder survey records entered yet. Click <strong>+ Add Feeder Survey</strong> above to record joint measurements.
                </td>
              </tr>
            ` : surveys.map((s, idx) => {
              const statusBadge = s.status === 'Completed' || s.status === 'Approved'
                ? '<span class="badge ok">Completed</span>'
                : s.status === 'In Progress'
                ? '<span class="badge wait">In Progress</span>'
                : s.status === 'Under Survey'
                ? '<span class="badge idle">Under Survey</span>'
                : `<span class="badge ok">${esc(s.status)}</span>`;

              return `
                <tr>
                  <td style="text-align: center; font-weight: 600; color: #64748b;">${idx + 1}</td>
                  <td>
                    <div style="font-weight: 600; color: #0f172a;">${esc(s.ssName || '—')}</div>
                  </td>
                  <td>
                    <div style="font-weight: 650; color: #0369a1;">${esc(s.feederName || '—')}</div>
                    ${s.surveyDate ? `<div class="quiet" style="font-size: 10px;">${esc(formatDisplayDate(s.surveyDate))}</div>` : ''}
                  </td>
                  
                  <td style="text-align: right; font-weight: 700; color: #0f172a;">${(Number(s.routeLength) || 0).toLocaleString('en-IN')}</td>
                  <td style="text-align: right; font-weight: 600; color: #1e3a8a;">${(Number(s.cable400) || 0).toLocaleString('en-IN')}</td>
                  <td style="text-align: right; font-weight: 600; color: #2563eb;">${(Number(s.cable185) || 0).toLocaleString('en-IN')}</td>

                  <td style="text-align: center; font-weight: 600;">${Number(s.rmu3Way) || 0}</td>
                  <td style="text-align: center; font-weight: 600;">${Number(s.rmu4Way) || 0}</td>
                  <td>${renderDtrCell(s)}</td>

                  <td style="text-align: center; font-weight: 600; color: #92400e;">${Number(s.termKit400) || 0}</td>
                  <td style="text-align: center; font-weight: 600; color: #92400e;">${Number(s.termKit185) || 0}</td>

                  <td style="text-align: right; font-weight: 600; color: #065f46;">${(Number(s.microTunneling) || 0).toLocaleString('en-IN')}</td>
                  <td style="text-align: right;">${(Number(s.openCut) || 0).toLocaleString('en-IN')}</td>
                  <td style="text-align: right;">${(Number(s.jackPush) || 0).toLocaleString('en-IN')}</td>
                  <td style="text-align: right; font-weight: 600; color: #047857;">${(Number(s.hdpePipe) || 0).toLocaleString('en-IN')}</td>

                  <td style="text-align: center;">${statusBadge}</td>
                  <td style="text-align: center; white-space: nowrap;">
                    ${canEdit ? `
                      <button type="button" class="tiny" data-action="survey-edit-feeder" data-idx="${idx}" title="Edit Survey Record">Edit</button>
                      <button type="button" class="tiny danger" data-action="survey-delete-feeder" data-idx="${idx}" title="Delete Survey Record">✕</button>
                    ` : '<span class="quiet">—</span>'}
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
          ${surveys.length > 0 ? `
            <tfoot>
              <tr class="feeder-survey-foot">
                <td colspan="3" style="text-align: right; font-weight: 800; letter-spacing: 0.03em;">TOTAL:</td>
                <td style="text-align: right; font-weight: 800;">${totalRouteLength.toLocaleString('en-IN')} m</td>
                <td style="text-align: right; font-weight: 800;">${totalCable400.toLocaleString('en-IN')} m</td>
                <td style="text-align: right; font-weight: 800;">${totalCable185.toLocaleString('en-IN')} m</td>
                <td style="text-align: center; font-weight: 800;">${totalRmu3}</td>
                <td style="text-align: center; font-weight: 800;">${totalRmu4}</td>
                <td style="font-size: 11px; font-weight: 700; color: #38bdf8;">${totalDtrNos > 0 ? `${totalDtrNos} Nos (${totalDtrKva.toLocaleString('en-IN')} kVA)` : '—'}</td>
                <td style="text-align: center; font-weight: 800;">${totalKit400}</td>
                <td style="text-align: center; font-weight: 800;">${totalKit185}</td>
                <td style="text-align: right; font-weight: 800;">${totalHdd.toLocaleString('en-IN')} m</td>
                <td style="text-align: right; font-weight: 800;">${totalOpenCut.toLocaleString('en-IN')} m</td>
                <td style="text-align: right; font-weight: 800;">${totalJackPush.toLocaleString('en-IN')} m</td>
                <td style="text-align: right; font-weight: 800;">${totalHdpe.toLocaleString('en-IN')} m</td>
                <td style="text-align: center; font-weight: 700;">${completedCount}/${surveys.length} Done</td>
                <td></td>
              </tr>
            </tfoot>
          ` : ''}
        </table>
      </div>
    </div>
  `;
}

const GTP_WAITING = ['Submitted', 'Hold', 'Rejected'];

function renderGtp() {
  const rows = boqItems.filter(isMaterial);
  const canSubmit = isVendor() || isAdmin();
  const groups = letterGroups();
  const stats = gtpStats(rows);
  const hint = isRegion()
    ? 'Review submissions, approve with memo reference, or open "By letter" to decide whole letters in bulk.'
    : 'Submit letters covering multiple materials. Choose GTP+Vendor, GTP only, or Vendor only.';
  const addBtn = isAdmin()
    ? `<button type="button" class="ghost" data-action="open-entry" data-mode="new">+ Add new material item</button>`
    : '';

  let body = '';
  if (gtpTab === 'letters') {
    body = lettersTable(groups);
  } else {
    let filteredRows = rows;
    let emptyMsg = 'No materials in this category.';
    if (gtpTab === 'not_submitted') {
      filteredRows = rows.filter((item) => itemMatchesGtpTab(item, 'not_submitted'));
      emptyMsg = 'No materials awaiting submission. All materials have been submitted or approved!';
    } else if (gtpTab === 'pending') {
      filteredRows = rows.filter((item) => itemMatchesGtpTab(item, 'pending'));
      emptyMsg = 'No submissions currently pending approval. All caught up!';
    } else if (gtpTab === 'approved') {
      filteredRows = rows.filter((item) => itemMatchesGtpTab(item, 'approved'));
      emptyMsg = 'No materials approved yet.';
    } else if (gtpTab === 'rejected') {
      filteredRows = rows.filter((item) => itemMatchesGtpTab(item, 'rejected'));
      emptyMsg = 'No materials rejected or on hold.';
    }
    body = unifiedApprovalTable(filteredRows, emptyMsg, gtpTab);
  }

  return `
    ${head('GTP / Vendor', hint)}
    <div class="gtp-stats">
      <div class="gtp-stat idle pick" data-action="gtp-tab" data-tab="not_submitted" style="cursor:pointer;" title="Show Not-Submitted">
        <strong>${stats.notSubmitted}</strong>
        <span>Not-Submitted</span>
        <em>pending initial submission</em>
      </div>
      <div class="gtp-stat wait pick" data-action="gtp-tab" data-tab="pending" style="cursor:pointer;" title="Show Pending Approval">
        <strong>${stats.pending}</strong>
        <span>Pending Approval</span>
        <em>awaiting WBSEDCL decision</em>
      </div>
      <div class="gtp-stat ok pick" data-action="gtp-tab" data-tab="approved" style="cursor:pointer;" title="Show Approved">
        <strong>${stats.approved}</strong>
        <span>Approved</span>
        <em>ready for inspection offer</em>
      </div>
      <div class="gtp-stat bad pick" data-action="gtp-tab" data-tab="rejected" style="cursor:pointer;" title="Show Rejected / Hold">
        <strong>${stats.rejected}</strong>
        <span>Rejected / Hold</span>
        <em>needs attention</em>
      </div>
    </div>
    <div class="tab-row">
      ${tabBar('gtp', [
        ['all', `All materials (${rows.length})`],
        ['not_submitted', `Not-Submitted (${stats.notSubmitted})`],
        ['pending', `Pending Approval (${stats.pending})`],
        ['approved', `Approved (${stats.approved})`],
        ['rejected', `Rejected (${stats.rejected})`],
        ['letters', `By letter (${groups.length})`]
      ], gtpTab)}
      <div class="actions" style="display:flex; gap:8px; align-items:center;">
        ${addBtn}
        ${canSubmit ? `<button type="button" class="primary" id="gtp-new-submission" data-action="batch-new" data-kind="gtp_vendor">+ New submission</button>` : ''}
      </div>
    </div>
    ${body}
  `;
}

function itemMatchesGtpTab(item, tab) {
  const records = itemAllApprovals(item).filter((r) => r.status && r.status !== 'Pending Submission');
  if (tab === 'all') return true;
  if (tab === 'not_submitted') return records.length === 0;
  if (tab === 'pending') return records.some((r) => r.status === 'Submitted');
  if (tab === 'approved') return records.some((r) => r.status === 'Approved');
  if (tab === 'rejected') return records.some((r) => r.status === 'Rejected' || r.status === 'Hold');
  return true;
}

function gtpStats(rows) {
  return {
    notSubmitted: rows.filter((item) => itemMatchesGtpTab(item, 'not_submitted')).length,
    pending: rows.filter((item) => itemMatchesGtpTab(item, 'pending')).length,
    approved: rows.filter((item) => itemMatchesGtpTab(item, 'approved')).length,
    rejected: rows.filter((item) => itemMatchesGtpTab(item, 'rejected')).length,
    total: rows.length
  };
}

function gtpStat(label, value, tone, sub) {
  return `<div class="gtp-stat ${tone}"><strong>${esc(value)}</strong><span>${esc(label)}</span><em>${esc(sub)}</em></div>`;
}

function kindLabel(kind) {
  if (kind === 'gtp_vendor') return 'GTP + Vendor';
  return kind === 'gtp' ? 'GTP' : 'Vendor';
}

function kindBadge(kind) {
  if (kind === 'gtp_vendor') return '<span class="badge kind-gtp-vendor">GTP + Vendor</span>';
  return `<span class="badge kind-${kind === 'gtp' ? 'gtp' : 'vendor'}">${kind === 'gtp' ? 'GTP' : 'Vendor'}</span>`;
}

function itemAllApprovals(item) {
  if (!item || !item.slNo) return [];
  const sl = Number(item.slNo);
  return gtpApprovals.filter((row) => Number(row.itemSl) === sl);
}

function primaryApprovalRecord(item) {
  const records = itemAllApprovals(item);
  if (!records.length) return blankApproval();
  const approved = records.find((r) => r.status === 'Approved');
  if (approved) return approved;
  const waiting = records.find((r) => r.status === 'Submitted');
  if (waiting) return waiting;
  const blocked = records.find((r) => r.status === 'Hold' || r.status === 'Rejected');
  if (blocked) return blocked;
  return records[records.length - 1];
}

function itemApprovalStatus(item) {
  const records = itemAllApprovals(item).filter((r) => r.status && r.status !== 'Pending Submission');
  if (!records.length) return 'not_submitted';
  const hasPending = records.some((r) => r.status === 'Submitted');
  const hasRejected = records.some((r) => r.status === 'Rejected' || r.status === 'Hold');
  const hasApproved = records.some((r) => r.status === 'Approved');

  if (hasPending) return 'pending';
  if (hasRejected) return 'rejected';
  if (hasApproved) return 'approved';
  return 'not_submitted';
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
  if (!key) return null;
  const groups = letterGroups();
  const direct = groups.find((group) => group.key === key);
  if (direct) return direct;
  const trimmed = String(key).trim();
  return groups.find((group) => group.letterNo === trimmed || group.key.toLowerCase() === trimmed.toLowerCase() || group.letterNo.toLowerCase() === trimmed.toLowerCase()) || null;
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
    if (canDecide && group.pending) action = `<button type="button" class="tiny strong" data-action="open-letter" data-id="${esc(group.key)}">Review ${group.pending}</button>`;
    else action = `<button type="button" class="tiny" data-action="open-letter" data-id="${esc(group.key)}">View letter</button>`;
    if (isAdmin()) {
      action += ` <button type="button" class="tiny" data-action="open-rectify-letter" data-kind="${group.kind}" data-letter="${esc(group.letterNo)}">Edit</button>`;
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
  return unifiedApprovalTable(rows);
}

function unifiedApprovalTable(rows, emptyMsg = 'No items found.', tab = gtpTab) {
  const headers = [
    'Sl',
    'Material',
    'Scope',
    'Vendor / Manufacturer',
    'Letter no.',
    numHead('LOA Qty'),
    numHead('Survey Qty'),
    numHead('Approved Qty'),
    'Submitted',
    'Status / Decision',
    'Actions'
  ];

  return table(headers, rows.map((item) => {
    const allRecords = itemAllApprovals(item);
    let records = allRecords;
    if (tab === 'rejected') {
      const filtered = allRecords.filter((r) => r.status === 'Rejected' || r.status === 'Hold');
      if (filtered.length) records = filtered;
    } else if (tab === 'pending') {
      const filtered = allRecords.filter((r) => r.status === 'Submitted');
      if (filtered.length) records = filtered;
    } else if (tab === 'approved') {
      const filtered = allRecords.filter((r) => r.status === 'Approved');
      if (filtered.length) records = filtered;
    }

    const primaryRecord = records.find((r) => r.status === 'Approved')
      || records.find((r) => r.status === 'Submitted')
      || records.find((r) => r.status === 'Hold' || r.status === 'Rejected')
      || records[0]
      || blankApproval();
    const status = itemApprovalStatus(item);

    // Scope Badges
    let scopeHtml = '<span class="meta">Not submitted</span>';
    if (records.length) {
      const kinds = [...new Set(records.map((r) => r.kind))];
      scopeHtml = kinds.map((k) => kindBadge(k)).join(' ');
    }

    // Vendor Names
    let vendorHtml = '—';
    if (records.length) {
      const vendorNames = [...new Set(records.map((r) => r.vendor).filter(Boolean))];
      if (vendorNames.length > 1) {
        vendorHtml = vendorNames.map((v) => `<div class="multi-cell-item"><strong>${esc(v)}</strong></div>`).join('');
      } else if (vendorNames.length === 1) {
        vendorHtml = esc(vendorNames[0]);
      }
    }

    // Letter Numbers
    let letterHtml = '—';
    if (records.length) {
      const withLetters = records.filter((r) => r.letterNo);
      if (withLetters.length > 1) {
        letterHtml = withLetters.map((r) => `
          <div class="multi-cell-item">
            <button type="button" class="row-link letter-link" data-action="open-letter" data-id="${esc(letterKey(r.kind, r.letterNo))}">
              <strong>${esc(r.letterNo)}</strong>
            </button>
            ${r.vendor ? `<span class="meta">(${esc(r.vendor)})</span>` : ''}
          </div>
        `).join('');
      } else if (withLetters.length === 1) {
        letterHtml = `<button type="button" class="row-link letter-link" data-action="open-letter" data-id="${esc(letterKey(withLetters[0].kind, withLetters[0].letterNo))}">${esc(withLetters[0].letterNo)}</button>`;
      }
    }

    // Quantities
    const appQty = approvedBoqQty(item);
    const approvedQtyDisplay = (tab === 'all' || tab === 'approved' || records.some((r) => r.status === 'Approved')) && appQty > 0
      ? qtyText(appQty, item.unit)
      : '—';

    // Submission Dates
    let subDateHtml = '—';
    if (records.length) {
      const dates = records.map((r) => r.subDate ? isoToDmy(r.subDate) : '—');
      if (dates.length > 1) {
        subDateHtml = dates.map((d) => `<div class="multi-cell-item">${esc(d)}</div>`).join('');
      } else {
        subDateHtml = esc(dates[0]);
      }
    }

    // Decision
    let decisionHtml = '—';
    if (records.length > 1) {
      decisionHtml = records.map((r) => `
        <div class="multi-cell-item">
          ${kindBadge(r.kind)} ${decisionCellContent(r)}
        </div>
      `).join('');
    } else if (records.length === 1) {
      decisionHtml = decisionCellContent(records[0]);
    } else {
      decisionHtml = decisionCellContent(blankApproval());
    }

    // Row Actions
    let actionBtn = '';
    const canApprove = isRegion() || isAdmin();
    const canSubmit = isVendor() || isAdmin();
    const hasPendingInTab = records.some((r) => r.status === 'Submitted');
    const hasApprovedInTab = records.some((r) => r.status === 'Approved');
    if (canApprove && hasPendingInTab) {
      actionBtn = `<button type="button" class="tiny strong" data-action="open-entry" data-sl="${item.slNo}" data-id="${primaryRecord.kind || 'gtp_vendor'}" data-mode="decision">Review</button>`;
    } else if (canSubmit && !hasApprovedInTab && tab !== 'approved') {
      actionBtn = `<button type="button" class="tiny" data-action="open-entry" data-sl="${item.slNo}" data-id="${primaryRecord.kind || 'gtp_vendor'}" data-mode="submit">Submit</button>`;
    } else {
      actionBtn = `<button type="button" class="tiny" data-action="open-entry" data-sl="${item.slNo}" data-id="${primaryRecord.kind || 'gtp_vendor'}">Details</button>`;
    }

    if (isAdmin() && records.some((r) => r.status !== 'Pending Submission')) {
      const activeLetters = records.map((r) => r.letterNo).filter(Boolean);
      const letterAttr = activeLetters.length === 1 ? ` data-letter="${esc(activeLetters[0])}"` : '';
      actionBtn += ` <button type="button" class="tiny" data-action="open-edit-approval" data-sl="${item.slNo}" data-kind="${primaryRecord.kind || 'vendor'}"${letterAttr}>Edit</button>`;
    }

    const queryParts = [
      searchText(item, materialName(item)),
      ...records.map((r) => `${r.kind} ${r.vendor} ${r.letterNo} ${r.status} ${r.memoNo} ${r.remarks}`)
    ];

    return `
      <tr class="pick" data-action="open-entry" data-sl="${item.slNo}" data-id="${primaryRecord.kind || 'gtp_vendor'}" data-q="${esc(queryParts.join(' '))}">
        <td>${item.slNo}</td>
        <td class="desc" title="${esc(item.description)}">${nameButton(item, `data-id="${primaryRecord.kind || 'gtp_vendor'}"`)}</td>
        <td>${scopeHtml}</td>
        <td>${vendorHtml}</td>
        <td>${letterHtml}</td>
        <td class="num">${qtyText(item.loaQty, item.unit)}</td>
        <td class="num">${surveyText(item)}</td>
        <td class="num">${approvedQtyDisplay}</td>
        <td>${subDateHtml}</td>
        <td class="decision">${decisionHtml}</td>
        <td class="row-actions">${actionBtn}</td>
      </tr>
    `;
  }), headers.length, emptyMsg);
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
    if (isAdmin()) {
      action += ` <button type="button" class="tiny" data-action="open-edit-offer-letter" data-id="${esc(group.offerNo)}">Edit</button>`;
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
    (entryModal && entryModal.page === 'gtp' && (entryModal.mode === 'batch' || entryModal.mode === 'letter' || entryModal.mode === 'rectifyLetter' || entryModal.mode === 'editApproval')) ||
    (entryModal && (entryModal.page === 'contract' || entryModal.page === 'users')) ||
    (inspModal && (inspModal.mode === 'batch' || inspModal.mode === 'letter' || inspModal.mode === 'editOfferLetter'))
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
    if (inspModal.mode === 'letter' || inspModal.mode === 'editOfferLetter') return inspLetterModal();
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
  if (inspModal?.mode === 'editOfferLetter') return inspEditOfferModal(group);
  if (!group) return `${modalTitle('Offer letter not found', 'It may have been modified or deleted.')}`;
  const canDecide = (isRegion() || isAdmin()) && group.waiting > 0;
  const canOffer = isVendor() || isAdmin();
  const sub = `Submitted: ${group.date ? isoToDmy(group.date) : '—'} · ${esc(group.manufacturer)} (${esc(group.premises)}) · ${group.rows.length} ${group.rows.length === 1 ? 'material' : 'materials'}`;
  const adminActions = isAdmin()
    ? `<div class="actions" style="margin-top: 12px; display: flex; gap: 8px;">
         <button type="button" class="ghost" data-action="open-edit-offer-letter" data-id="${esc(group.offerNo)}">✏️ Edit Offer & Memo</button>
       </div>`
    : '';

  return `
    ${modalTitle(`Inspection Offer · ${esc(group.offerNo)}`, esc(sub))}
    ${canDecide ? inspLetterDecisionForm(group) : inspLetterSummary(group)}
    ${adminActions}
  `;
}

function inspEditOfferModal(group) {
  if (!group) return modalTitle('Offer letter not found', 'Cannot edit missing offer.');
  const firstOffer = group.rows[0]?.offer || {};
  return `
    ${modalTitle(`Edit Offer & Memo: ${esc(group.offerNo)}`, 'Admin tool to edit letter/memo numbers, submission/action dates, and comments.')}
    <form class="entry entry-plain" id="form-edit-offer">
      <input type="hidden" name="oldOfferNo" value="${esc(group.offerNo)}" />

      <div class="edit-form-section">Turnkey Agency Offer Details</div>

      <label>Offer Letter No.
        <input name="newOfferNo" required value="${esc(group.offerNo)}" placeholder="e.g. TE/MALDA/INSP/01" />
      </label>

      <label>Offer Submission Date
        <input name="newOfferDate" type="date" value="${esc(group.date || '')}" />
      </label>

      <label>Manufacturer Name
        <input name="newManufacturer" required value="${esc(group.manufacturer || '')}" placeholder="e.g. Havells India Ltd" />
      </label>

      <label>Inspection Premises
        <input name="newPremises" required value="${esc(group.premises || '')}" placeholder="e.g. Works at Alwar, Rajasthan" />
      </label>

      <label class="span-2">Agency Offer Remarks / Comment
        <input name="newRemarks" value="${esc(firstOffer.remarks || '')}" placeholder="Optional remarks" />
      </label>

      <div class="edit-form-section">Approving Authority Decision & Comments (Memo & Remarks)</div>

      <label>Decision Status
        <select name="newStatus" style="padding: 8px; border: 1px solid var(--line); border-radius: 6px; background: #fff; color: var(--text);">
          <option value="Offered"${firstOffer.status === 'Offered' ? ' selected' : ''}>Offered (Pending Decision)</option>
          <option value="Cleared"${firstOffer.status === 'Cleared' ? ' selected' : ''}>Cleared (Local Inspection)</option>
          <option value="Forwarded"${firstOffer.status === 'Forwarded' ? ' selected' : ''}>Forwarded (to HQ)</option>
          <option value="Rejected"${firstOffer.status === 'Rejected' ? ' selected' : ''}>Rejected</option>
        </select>
      </label>

      <label>Decision Memo No.
        <input name="newMemoNo" value="${esc(firstOffer.memoNo || '')}" placeholder="e.g. RM/MALDA/INSP/2026/001" />
      </label>

      <label>Decision / Action Date
        <input name="newActionDate" type="date" value="${esc(firstOffer.actionDate || '')}" />
      </label>

      <label class="span-2">Authority Remarks / Comments
        <input name="newActionRemarks" value="${esc(firstOffer.actionRemarks || '')}" placeholder="e.g. Cleared for dispatch / Comments" />
      </label>

      <div class="actions span-all" style="display: flex; gap: 8px; margin-top: 12px;">
        <button class="primary" type="submit">Save Offer & Memo Details</button>
        <button type="button" class="ghost" data-action="cancel-edit-offer">Cancel</button>
      </div>
      <p class="form-msg span-all"></p>
    </form>
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
        ${isAdmin() && waiting.length ? `<button type="button" class="ghost" data-action="inspect-mode" data-mode="approve" data-offer="${esc(waiting[0].id)}">Review submitted offer</button>` : ''}
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
        ${isAdmin() && track.pendingOffer > 0.0001 ? '<button type="button" class="ghost" data-action="inspect-mode" data-mode="offer">New offer</button>' : ''}
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
  const adminBtn = isAdmin()
    ? `<br><button type="button" class="tiny" style="margin-top:4px;" data-action="open-edit-offer-letter" data-id="${esc(offer.offerNo)}">✏️ Edit Offer & Memo</button>`
    : '';
  return `<p class="quiet">${lines.map((line) => esc(line)).join('<br>')}${adminBtn}</p>`;
}

function openEntry(sl, id, mode) {
  inspModal = null;
  if (currentPage === 'gtp') prepareGtp(sl, id, mode);
  else if (currentPage === 'billing') prepareBill(id, mode);
  else if (currentPage === 'daily') prepareDaily(sl, id);
  else if (currentPage === 'receive') prepareReceive(sl, id);
  else if (currentPage === 'boq') {
    entryModal = { page: 'boq', sl, id: '', mode: mode === 'new' && isAdmin() ? 'new' : (isAdmin() ? 'edit' : 'survey') };
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
  const item = findItem(sl);
  if (!item) {
    entryModal = null;
    return;
  }
  const records = itemAllApprovals(item);
  const waitingRecord = records.find((r) => r.status === 'Submitted') || records.find((r) => GTP_WAITING.includes(r.status));
  const waiting = Boolean(waitingRecord);
  const hasPending = records.some((r) => r.status === 'Submitted');
  const kind = ['gtp', 'vendor', 'gtp_vendor'].includes(id) ? id : (waitingRecord?.kind || records[records.length - 1]?.kind || 'gtp_vendor');
  const canApprove = isRegion() || isAdmin();
  const canSubmit = isVendor() || isAdmin();

  let modalMode = 'note';
  if (mode === 'decision' && canApprove) {
    modalMode = 'decision';
  } else if (mode === 'submit' && canSubmit) {
    const record = approvalRecord(item, kind);
    entryModal = batchEntry({ kind, picked: [item.slNo], letterNo: record.status === 'Rejected' ? '' : record.letterNo, vendor: record.vendor || '' });
    return;
  } else if (canApprove && !isVendor() && hasPending) {
    modalMode = 'decision';
  } else if (isVendor() && !waiting && itemApprovalStatus(item) !== 'approved') {
    const record = approvalRecord(item, kind);
    entryModal = batchEntry({ kind, picked: [item.slNo], letterNo: record.status === 'Rejected' ? '' : record.letterNo, vendor: record.vendor || '' });
    return;
  }

  entryModal = { page: 'gtp', sl: item.slNo, id: kind, mode: modalMode };
}

function batchEntry(draft = {}) {
  const kind = ['gtp_vendor', 'vendor', 'gtp', 'both'].includes(draft.kind) ? draft.kind : 'gtp_vendor';
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
  const canReceive = isStore() || isAdmin();
  entryModal = findItem(sl) ? { page: 'receive', sl, id: '', mode: canReceive ? 'srv' : 'note' } : null;
}

function entryModalHtml() {
  if (entryModal.page === 'users') return userPermissionsModal(people.find((p) => p.id === entryModal.id));
  if (entryModal.page === 'boq') return boqModal();
  if (entryModal.page === 'contract') return contractModal();
  if (entryModal.page === 'gtp') return gtpModal();
  if (entryModal.page === 'billing') return billModal();
  if (entryModal.page === 'daily') return dailyModal();
  if (entryModal.page === 'receive') return receiveModal();
  return '';
}

function contractModal() {
  const contract = contractData || defaultContract();
  if (entryModal.mode === 'milestones') {
    return `
      ${modalTitle('Contract Baseline & Schedule Milestones', 'Update LOA acceptance, L1/L2 schedule status, and baseline completion target.')}
      <form class="entry entry-plain" id="form-contract-milestones">
        <label>LOA / PO Number <input name="loaNo" required value="${esc(contract.loaNo || PROJECT_INFO.poNumber)}" /></label>
        <label>LOA Date <input name="loaDate" type="date" value="${esc(contract.loaDate || '')}" /></label>
        <label>Date of LOA Acceptance <input name="acceptanceDate" type="date" value="${esc(contract.acceptanceDate || '')}" /></label>
        <label>Acceptance Letter Ref <input name="acceptanceRef" value="${esc(contract.acceptanceRef || '')}" placeholder="e.g. TE/LOA-ACC/2024/01" /></label>
        
        <label>L1/L2 Schedule Submission Date <input name="scheduleSubDate" type="date" value="${esc(contract.scheduleSubDate || '')}" /></label>
        <label>Schedule Submission Letter Ref <input name="scheduleSubRef" value="${esc(contract.scheduleSubRef || '')}" placeholder="e.g. TE/SCHED/01" /></label>
        <label class="span-2">Schedule Submission Remarks <input name="scheduleSubRemarks" value="${esc(contract.scheduleSubRemarks || '')}" placeholder="Submission details, revisions, software used (MS Project/Primavera)" /></label>
        
        <label>Schedule Approval Date <input name="scheduleApprDate" type="date" value="${esc(contract.scheduleApprDate || '')}" /></label>
        <label>Schedule Approval Memo <input name="scheduleApprRef" value="${esc(contract.scheduleApprRef || '')}" placeholder="e.g. WBSEDCL/RE/SCHED-APPR/45" /></label>
        <label>Schedule Approval Status
          <select name="scheduleApprStatus">
            <option${contract.scheduleApprStatus === 'Pending' ? ' selected' : ''}>Pending</option>
            <option${contract.scheduleApprStatus === 'Approved' ? ' selected' : ''}>Approved</option>
            <option${contract.scheduleApprStatus === 'Conditional' ? ' selected' : ''}>Conditional</option>
            <option${contract.scheduleApprStatus === 'Revision Requested' ? ' selected' : ''}>Revision Requested</option>
          </select>
        </label>
        <label>Base Target Completion Date <input name="targetCompletionDate" type="date" value="${esc(contract.targetCompletionDate || '')}" /></label>
        <label class="span-2">Schedule Approval Remarks <input name="scheduleApprRemarks" value="${esc(contract.scheduleApprRemarks || '')}" placeholder="Approval conditions, milestone reviews, remarks" /></label>
        
        <div class="actions"><button class="primary" type="submit">Save Contract Milestones</button></div>
        <p class="form-msg span-all"></p>
      </form>
    `;
  }

  if (entryModal.mode === 'bg') {
    const isEdit = entryModal.idx !== undefined && entryModal.idx !== null;
    const bg = isEdit ? (contract.bgEntries[entryModal.idx] || {}) : {};
    return `
      ${modalTitle(isEdit ? 'Edit Bank Guarantee' : 'Add Bank Guarantee', 'Security deposit or performance bank guarantee submitted by Turnkey Agency.')}
      <form class="entry entry-plain" id="form-contract-bg">
        <input type="hidden" name="idx" value="${isEdit ? entryModal.idx : -1}" />
        <label>BG Number <input name="bgNo" required value="${esc(bg.bgNo || '')}" placeholder="e.g. 0541BGR000124" /></label>
        <label>Issuing Bank & Branch <input name="bankName" required value="${esc(bg.bankName || '')}" placeholder="e.g. State Bank of India, Malda Branch" /></label>
        <label>BG Amount (₹) <input name="amount" type="number" step="any" min="0" required value="${esc(bg.amount || '')}" placeholder="e.g. 15570909" /></label>
        <label>Submission Date <input name="subDate" type="date" required value="${esc(bg.subDate || '')}" /></label>
        <label>Expiry Date <input name="expiryDate" type="date" value="${esc(bg.expiryDate || '')}" /></label>
        <label>Claim Expiry Date <input name="claimDate" type="date" value="${esc(bg.claimDate || '')}" /></label>
        <label>Status
          <select name="status">
            <option${bg.status === 'Active' || !bg.status ? ' selected' : ''}>Active</option>
            <option${bg.status === 'Released' ? ' selected' : ''}>Released</option>
            <option${bg.status === 'Expired' ? ' selected' : ''}>Expired</option>
            <option${bg.status === 'Invoked' ? ' selected' : ''}>Invoked</option>
          </select>
        </label>
        <label class="span-2">Remarks <input name="remarks" value="${esc(bg.remarks || '')}" placeholder="e.g. Initial Contract Performance BG (10% of LOA value)" /></label>
        <div class="actions"><button class="primary" type="submit">${isEdit ? 'Update BG' : 'Save BG'}</button></div>
        <p class="form-msg span-all"></p>
      </form>
    `;
  }

  if (entryModal.mode === 'eot') {
    const isEdit = entryModal.idx !== undefined && entryModal.idx !== null;
    const eot = isEdit ? (contract.eotEntries[entryModal.idx] || {}) : {};
    return `
      ${modalTitle(isEdit ? 'Edit Extension of Time (EOT)' : 'Add Extension of Time (EOT)', 'Record revised completion target date with approval memo details.')}
      <form class="entry entry-plain" id="form-contract-eot">
        <input type="hidden" name="idx" value="${isEdit ? entryModal.idx : -1}" />
        <label>Revised Target Date <input name="revisedDate" type="date" required value="${esc(eot.revisedDate || '')}" /></label>
        <label>Extension Period (Days) <input name="extensionDays" type="number" min="0" value="${esc(eot.extensionDays || '')}" placeholder="e.g. 90" /></label>
        <label>Approval Memo / Letter No. <input name="memoNo" required value="${esc(eot.memoNo || '')}" placeholder="e.g. WBSEDCL/RE/EOT/2025/112" /></label>
        <label>Approval Date <input name="approvalDate" type="date" value="${esc(eot.approvalDate || '')}" /></label>
        <label>Approved By <input name="approvedBy" value="${esc(eot.approvedBy || 'Chief Engineer (Distribution)')}" placeholder="e.g. CE / SE / WBSEDCL" /></label>
        <label>Status
          <select name="status">
            <option${eot.status === 'Approved' || !eot.status ? ' selected' : ''}>Approved</option>
            <option${eot.status === 'Pending' ? ' selected' : ''}>Pending</option>
            <option${eot.status === 'Under Review' ? ' selected' : ''}>Under Review</option>
            <option${eot.status === 'Rejected' ? ' selected' : ''}>Rejected</option>
          </select>
        </label>
        <label class="span-2">Reason / Grounds of EOT <input name="reason" value="${esc(eot.reason || '')}" placeholder="e.g. Monsoon flooding, RoW clearance delay at Bandh Road" /></label>
        <div class="actions"><button class="primary" type="submit">${isEdit ? 'Update EOT' : 'Save EOT'}</button></div>
        <p class="form-msg span-all"></p>
      </form>
    `;
  }

  if (entryModal.mode === 'feederSurvey') {
    const isEdit = entryModal.idx !== undefined && entryModal.idx !== null && entryModal.idx >= 0;
    const s = isEdit ? (contract.feederSurveys[entryModal.idx] || {}) : {};
    const dtrCounts = s.dtrCounts || {};
    const dtr100 = dtrCounts['100'] ?? extractDtrQty(s.dtrDetails, '100');
    const dtr160 = dtrCounts['160'] ?? extractDtrQty(s.dtrDetails, '160');
    const dtr250 = dtrCounts['250'] ?? extractDtrQty(s.dtrDetails, '250');
    const dtr315 = dtrCounts['315'] ?? extractDtrQty(s.dtrDetails, '315');
    const dtr500 = dtrCounts['500'] ?? extractDtrQty(s.dtrDetails, '500');
    const dtr630 = dtrCounts['630'] ?? extractDtrQty(s.dtrDetails, '630');

    return `
      ${modalTitle(isEdit ? 'Edit Feeder Survey Record' : 'Add Feeder Survey Record', 'Feeder-wise joint survey measurements entered and verified by Divisional Engineer / WBSEDCL.')}
      <form class="entry entry-plain" id="form-feeder-survey" style="max-width: 780px;">
        <input type="hidden" name="idx" value="${isEdit ? entryModal.idx : -1}" />
        
        <div style="grid-column: 1 / -1; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 10px; font-weight: 700; font-size: 11.5px; color: #334155; text-transform: uppercase; letter-spacing: 0.04em;">
          1. Substation & Feeder Identification
        </div>
        <label>Name of Substation (SS) *
          <input name="ssName" required value="${esc(s.ssName || '')}" list="ss-list" placeholder="e.g. English Bazar 33/11kV Substation" />
          <datalist id="ss-list">
            <option value="English Bazar 33/11kV Substation">
            <option value="KPS 33/11kV Substation">
            <option value="Mokdumpur 33/11kV Substation">
            <option value="Malda Town 33/11kV Substation">
          </datalist>
        </label>
        <label>Name of Feeder *
          <input name="feederName" required value="${esc(s.feederName || '')}" list="feeder-list" placeholder="e.g. English Bazar Feeder-1 (Rabindra Avenue)" />
          <datalist id="feeder-list">
            ${FEEDERS.map((f) => `<option value="${esc(f)}">`).join('')}
          </datalist>
        </label>
        <label>Survey Status
          <select name="status">
            <option${s.status === 'Completed' ? ' selected' : ''}>Completed</option>
            <option${s.status === 'In Progress' || !s.status ? ' selected' : ''}>In Progress</option>
            <option${s.status === 'Under Survey' ? ' selected' : ''}>Under Survey</option>
            <option${s.status === 'Approved' ? ' selected' : ''}>Approved</option>
          </select>
        </label>
        <label>Joint Survey Date
          <input name="surveyDate" type="date" value="${esc(s.surveyDate || '')}" />
        </label>

        <div style="grid-column: 1 / -1; margin-top: 6px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 10px; font-weight: 700; font-size: 11.5px; color: #334155; text-transform: uppercase; letter-spacing: 0.04em;">
          2. Route Length & HT Cables (Laying Lengths)
        </div>
        <label>Total Route Length (R/L) (m) *
          <input name="routeLength" type="number" step="any" min="0" required value="${esc(s.routeLength || '')}" placeholder="e.g. 3850" />
        </label>
        <label>Length of Cable 400 sq.mm (m)
          <input name="cable400" type="number" step="any" min="0" value="${esc(s.cable400 || '')}" placeholder="e.g. 1200" />
        </label>
        <label>Length of Cable 185 sq.mm (m)
          <input name="cable185" type="number" step="any" min="0" value="${esc(s.cable185 || '')}" placeholder="e.g. 3100" />
        </label>

        <div style="grid-column: 1 / -1; margin-top: 6px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 10px; font-weight: 700; font-size: 11.5px; color: #334155; text-transform: uppercase; letter-spacing: 0.04em;">
          3. SCADA RMUs & Termination Kits
        </div>
        <label>3-Way RMU (Nos)
          <input name="rmu3Way" type="number" min="0" value="${esc(s.rmu3Way || '')}" placeholder="0" />
        </label>
        <label>4-Way RMU (Nos)
          <input name="rmu4Way" type="number" min="0" value="${esc(s.rmu4Way || '')}" placeholder="0" />
        </label>
        <label>Termination Kit 400 sq.mm (Sets)
          <input name="termKit400" type="number" min="0" value="${esc(s.termKit400 || '')}" placeholder="0" />
        </label>
        <label>Termination Kit 185 sq.mm (Sets)
          <input name="termKit185" type="number" min="0" value="${esc(s.termKit185 || '')}" placeholder="0" />
        </label>

        <!-- Capacity-wise Clean DTR Entry Section -->
        <div style="grid-column: 1 / -1; margin-top: 6px;" class="dtr-capacity-box">
          <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 6px;">
            <div style="font-weight: 750; font-size: 12px; color: #0f172a; display: flex; align-items: center; gap: 5px;">
              <span>⚡</span> Distribution Transformers (DTR) — Capacity-wise Clean Input
            </div>
            <span class="quiet" style="font-size: 11px;">Enter quantity (Nos) against each transformer capacity</span>
          </div>

          <div class="dtr-capacity-grid">
            <div class="dtr-cap-card">
              <span class="dtr-cap-label">100 kVA</span>
              <input class="dtr-cap-input" type="number" name="dtr_100" min="0" step="1" value="${esc(dtr100)}" placeholder="0" />
            </div>
            <div class="dtr-cap-card">
              <span class="dtr-cap-label">160 kVA</span>
              <input class="dtr-cap-input" type="number" name="dtr_160" min="0" step="1" value="${esc(dtr160)}" placeholder="0" />
            </div>
            <div class="dtr-cap-card">
              <span class="dtr-cap-label">250 kVA</span>
              <input class="dtr-cap-input" type="number" name="dtr_250" min="0" step="1" value="${esc(dtr250)}" placeholder="0" />
            </div>
            <div class="dtr-cap-card">
              <span class="dtr-cap-label">315 kVA</span>
              <input class="dtr-cap-input" type="number" name="dtr_315" min="0" step="1" value="${esc(dtr315)}" placeholder="0" />
            </div>
            <div class="dtr-cap-card">
              <span class="dtr-cap-label">500 kVA</span>
              <input class="dtr-cap-input" type="number" name="dtr_500" min="0" step="1" value="${esc(dtr500)}" placeholder="0" />
            </div>
            <div class="dtr-cap-card">
              <span class="dtr-cap-label">630 kVA</span>
              <input class="dtr-cap-input" type="number" name="dtr_630" min="0" step="1" value="${esc(dtr630)}" placeholder="0" />
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 10px;">
            <label style="font-size: 11px; font-weight: 600; color: #475569;">Other DTR Rating / Custom Capacity (Optional)
              <input type="text" name="dtr_other" value="${esc(s.dtrOther || '')}" placeholder="e.g. 63 kVA (1 No), 1000 kVA (1 No)" style="font-size: 12px; margin-top: 2px;" />
            </label>
            <label style="font-size: 11px; font-weight: 600; color: #475569;">DTR Plinth / Mounting Remarks (Optional)
              <input type="text" name="dtr_notes" value="${esc(s.dtrNotes || '')}" placeholder="e.g. Compact Substation (CSS) / Plinth" style="font-size: 12px; margin-top: 2px;" />
            </label>
          </div>
        </div>

        <div style="grid-column: 1 / -1; margin-top: 6px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 10px; font-weight: 700; font-size: 11.5px; color: #334155; text-transform: uppercase; letter-spacing: 0.04em;">
          4. Trenching, Laying Methods & HDPE Pipes (Lengths)
        </div>
        <label>Micro-tunneling / HDD (m)
          <input name="microTunneling" type="number" step="any" min="0" value="${esc(s.microTunneling || '')}" placeholder="e.g. 2100" />
        </label>
        <label>Open-Cut Trenching (m)
          <input name="openCut" type="number" step="any" min="0" value="${esc(s.openCut || '')}" placeholder="e.g. 1450" />
        </label>
        <label>JackPush Length (m)
          <input name="jackPush" type="number" step="any" min="0" value="${esc(s.jackPush || '')}" placeholder="e.g. 300" />
        </label>
        <label>HDPE Pipes Length (m)
          <input name="hdpePipe" type="number" step="any" min="0" value="${esc(s.hdpePipe || '')}" placeholder="e.g. 4300" />
        </label>

        <div style="grid-column: 1 / -1; margin-top: 6px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 6px 10px; font-weight: 700; font-size: 11.5px; color: #334155; text-transform: uppercase; letter-spacing: 0.04em;">
          5. Divisional Representative & Remarks
        </div>
        <label>Divisional Surveyor / Engineer
          <input name="surveyorName" value="${esc(s.surveyorName || (user.name ? `${user.name} (${user.role})` : ''))}" placeholder="e.g. Er. S. Roy (AE, Malda Division)" />
        </label>
        <label class="span-2">Survey Remarks / Route Observations
          <input name="remarks" value="${esc(s.remarks || '')}" placeholder="e.g. Traffic permission required at Rathbari, RoW cleared" />
        </label>

        <div class="actions" style="grid-column: 1 / -1; margin-top: 8px;">
          <button class="primary" type="submit">${isEdit ? 'Update Feeder Survey' : 'Save Feeder Survey'}</button>
          <button class="ghost" type="button" data-action="close-modal">Cancel</button>
        </div>
        <p class="form-msg span-all"></p>
      </form>
    `;
  }
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
    <label>Rate (₹) <input name="rate" type="number" min="0" step="any" required value="${item ? esc(item.rate) : ''}" placeholder="0 for erection-supplied items" />
      <span class="quiet" style="font-size:11px; display:block; margin-top:2px;">Enter 0 if material is supplied within Erection schedule charges / extra scope</span>
    </label>
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
  if (entryModal.mode === 'letter' || entryModal.mode === 'rectifyLetter') return gtpLetterModal();
  if (entryModal.mode === 'editApproval') return gtpEditApprovalModal();
  const item = findItem(entryModal.sl);
  if (!item) return '';
  const kind = ['gtp', 'vendor', 'gtp_vendor'].includes(entryModal.id) ? entryModal.id : 'gtp_vendor';
  const records = itemAllApprovals(item);
  const label = kindLabel(kind);
  const sub = `${label} · LOA ${qtyText(item.loaQty, item.unit)} · Survey ${surveyText(item)}`;
  let body = gtpNotes(records, item, kind);
  if (entryModal.mode === 'decision') body = gtpDecisionForm(item, kind);
  const canSubmit = isVendor() || isAdmin();
  const canDecide = isRegion() || isAdmin();
  return `
    ${modalTitle(`Sl ${item.slNo} · ${esc(materialName(item))}`, sub)}
    ${body}
    <div class="actions">
      ${entryModal.mode === 'decision' ? `<button type="button" class="ghost" data-action="entry-mode" data-mode="note">← View submission history</button>` : ''}
      ${canSubmit && entryModal.mode !== 'decision' ? `<button type="button" class="ghost" data-action="batch-new" data-kind="${kind}" data-sl="${item.slNo}">Submit new letter</button>` : ''}
      ${entryModal.mode !== 'decision' && canDecide ? `<button type="button" class="ghost" data-action="entry-mode" data-mode="decision">Approve / Reject</button>` : ''}
      ${isAdmin() && records.some((r) => r.status === 'Rejected' || r.status === 'Hold' || r.status === 'Approved') ? `<button type="button" class="ghost" data-action="reset-approval-decision" data-sl="${item.slNo}" data-kind="${kind}">↺ Reset decision to Submitted</button>` : ''}
      ${isAdmin() && records.length ? `<button type="button" class="ghost danger" data-action="delete-approval" data-sl="${item.slNo}" data-kind="${kind}">Delete all for this item</button>` : ''}
    </div>
  `;
}

function batchKinds(kind) {
  if (kind === 'both' || kind === 'gtp_vendor') return ['gtp_vendor'];
  if (kind === 'gtp') return ['gtp'];
  return ['vendor'];
}

function gtpBatchModal() {
  const draft = entryModal.draft;
  if (draft.previewing) return gtpBatchPreviewModal(draft);
  const kinds = batchKinds(draft.kind);
  const picked = new Set(draft.picked.map(Number));
  const rowHint = 'Vendor name / Manufacturer (required)';
  const rows = boqItems.filter(isMaterial).map((item) => {
    const open = kinds.filter((k) => approvalRecord(item, k).status !== 'Approved');
    const locked = open.length === 0;
    const checked = !locked && picked.has(item.slNo);
    const resubmit = open.some((k) => GTP_WAITING.includes(approvalRecord(item, k).status));
    const existing = approvalRecord(item, 'vendor').vendor || approvalRecord(item, 'gtp_vendor').vendor;
    const vendorValue = draft.vendors[item.slNo] ?? (isRealVendor(existing) ? existing : '');
    const status = kinds.map((k) => `<span class="pick-kind">${kinds.length > 1 ? `<em>${kindLabel(k)}</em>` : ''}${miniStatus(approvalRecord(item, k))}</span>`).join('');
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
          ${[['gtp_vendor', 'GTP + Vendor (Combined)'], ['gtp', 'GTP only'], ['vendor', 'Vendor only']].map(([value, label]) => `<button type="button" class="choice-btn${draft.kind === value ? ' active' : ''}" data-action="batch-kind" data-kind="${value}">${label}</button>`).join('')}
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
  const typeLabel = draft.kind === 'gtp_vendor' || draft.kind === 'both' ? 'GTP + Vendor (Combined)' : draft.kind === 'gtp' ? 'GTP submission' : 'Vendor approval';
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
  const canDecide = (isRegion() || isAdmin()) && group.pending > 0;
  const canSubmit = isVendor() || isAdmin();
  const sub = `${kindLabel(group.kind)} · Submitted ${group.subDate ? isoToDmy(group.subDate) : '—'} · ${group.rows.length} ${group.rows.length === 1 ? 'material' : 'materials'}`;
  const canDeleteLetter = isAdmin() && group.rows.every(({ record }) => record.status !== 'Approved');
  const canResetLetter = isAdmin() && group.rows.some(({ record }) => record.status === 'Approved' || record.status === 'Rejected' || record.status === 'Hold');
  const adminActions = isAdmin()
    ? `<div class="actions" style="margin-top: 12px; display: flex; gap: 8px; flex-wrap: wrap;">
         <button type="button" class="ghost" data-action="open-rectify-letter" data-kind="${group.kind}" data-letter="${esc(group.letterNo)}">✏️ Edit Letter, Memo & Comments</button>
         ${canResetLetter ? `<button type="button" class="ghost" data-action="reset-letter-decision" data-kind="${group.kind}" data-letter="${esc(group.letterNo)}">↺ Reset decisions to Submitted</button>` : ''}
         ${canDeleteLetter ? `<button type="button" class="ghost danger" data-action="delete-approval-letter" data-kind="${group.kind}" data-letter="${esc(group.letterNo)}">Delete letter</button>` : ''}
       </div>`
    : '';
  return `
    ${modalTitle(`${kindBadge(group.kind)} ${esc(group.letterNo)}`, esc(sub))}
    ${canDecide ? letterDecisionForm(group) : letterSummary(group)}
    ${adminActions}
  `;
}

function gtpRectifyLetterModal(group) {
  if (!group) {
    return `
      ${modalTitle('Letter Not Found', 'Could not locate the letter details in the register.')}
      <div class="actions" style="margin-top: 16px;">
        <button type="button" class="ghost" data-action="cancel-rectify-letter">Back</button>
      </div>
    `;
  }
  const vendorVal = group.rows[0]?.record?.vendor || '';
  const firstRec = group.rows[0]?.record || {};
  const materialList = group.rows
    .map(({ item }) => `<li><strong>Sl ${item.slNo}:</strong> ${esc(materialName(item))}</li>`)
    .join('');
  return `
    ${modalTitle(`Edit Letter & Memo: ${esc(group.letterNo)}`, 'Admin tool to edit letter reference, vendor name, dates, decision memo numbers, and comments.')}
    <form class="entry entry-plain" id="form-rectify-letter">
      <input type="hidden" name="oldKind" value="${esc(group.kind)}" />
      <input type="hidden" name="oldLetterNo" value="${esc(group.letterNo)}" />

      <div class="edit-form-section">Turnkey Agency Submission Details</div>

      <label class="span-2">Approval Type / Tagging
        <select name="newKind" style="padding: 8px; border: 1px solid var(--line); border-radius: 6px; background: #fff; color: var(--text);">
          <option value="gtp_vendor"${group.kind === 'gtp_vendor' ? ' selected' : ''}>GTP + Vendor Combined (kind = gtp_vendor)</option>
          <option value="gtp"${group.kind === 'gtp' ? ' selected' : ''}>GTP Approval only (kind = gtp)</option>
          <option value="vendor"${group.kind === 'vendor' ? ' selected' : ''}>Vendor Approval only (kind = vendor)</option>
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

      <div class="edit-form-section">Approving Authority Decision & Comments (Memo & Remarks)</div>

      <label>Decision Status
        <select name="newStatus" style="padding: 8px; border: 1px solid var(--line); border-radius: 6px; background: #fff; color: var(--text);">
          <option value="">Keep current status</option>
          <option value="Submitted"${firstRec.status === 'Submitted' ? ' selected' : ''}>Submitted (Pending Decision)</option>
          <option value="Approved"${firstRec.status === 'Approved' ? ' selected' : ''}>Approved</option>
          <option value="Hold"${firstRec.status === 'Hold' ? ' selected' : ''}>Hold</option>
          <option value="Rejected"${firstRec.status === 'Rejected' ? ' selected' : ''}>Rejected</option>
        </select>
      </label>

      <label>Decision Memo No.
        <input name="newMemoNo" value="${esc(firstRec.memoNo || '')}" placeholder="e.g. RM/MALDA/2026/05" />
      </label>

      <label>Decision / Memo Date
        <input name="newActionDate" type="date" value="${esc(firstRec.actionDate || '')}" />
      </label>

      <label class="span-2">Authority Remarks / Comments
        <input name="newRemarks" value="${esc(firstRec.remarks || '')}" placeholder="Remarks / comments by approving authority" />
      </label>

      <div class="span-all" style="background: var(--surface-2, #f8fafc); border: 1px solid var(--line); border-radius: 6px; padding: 12px; margin-top: 4px;">
        <span style="font-weight: 600; font-size: 0.85rem; color: var(--text-muted);">Materials covered under this letter (${group.rows.length}):</span>
        <ul style="margin: 6px 0 0 16px; padding: 0; font-size: 0.85rem; line-height: 1.5; color: var(--text);">
          ${materialList}
        </ul>
      </div>

      <div class="actions span-all" style="display: flex; gap: 8px; margin-top: 12px;">
        <button class="primary" type="submit">Save Changes to Letter & Memo</button>
        <button type="button" class="ghost" data-action="cancel-rectify-letter">Cancel</button>
      </div>
      <p class="form-msg span-all"></p>
    </form>
  `;
}

function gtpEditApprovalModal() {
  const item = findItem(entryModal.sl);
  if (!item) return modalTitle('Item not found', 'Cannot edit missing item.');
  const records = itemAllApprovals(item);
  if (!records.length) return modalTitle('No approval record', 'There are no submissions to edit for this material.');

  let record = entryModal.letter
    ? records.find((r) => r.letterNo === entryModal.letter)
    : (records.find((r) => r.letterNo) || records[0]);
  if (!record) record = records[0];

  const letterOptions = records.length > 1
    ? `<label class="span-2">Select Submission / Letter to Edit
        <select name="selectedLetter" data-action="change-edit-approval-record" style="padding: 8px; border: 1px solid var(--line); border-radius: 6px; background: #fff; color: var(--text);">
          ${records.map((r) => `<option value="${esc(r.letterNo || '')}"${r.letterNo === record.letterNo ? ' selected' : ''}>${esc(r.letterNo || 'No Letter')} · ${esc(r.vendor || 'No Vendor')} · ${esc(r.status || 'Pending')} (${kindLabel(r.kind)})</option>`).join('')}
        </select>
       </label>`
    : '';

  const otherCount = record.letterNo
    ? gtpApprovals.filter((r) => r.kind === record.kind && r.letterNo === record.letterNo).length
    : 1;

  const scopeCheckbox = otherCount > 1
    ? `<label class="span-all" style="display: flex; align-items: flex-start; gap: 8px; font-weight: normal; margin-top: 8px; background: rgba(0,0,0,0.03); padding: 8px 12px; border-radius: 6px; font-size: 0.86rem;">
        <input type="checkbox" name="applyToAll" value="1" checked style="margin-top: 2px;" />
        <span>Also apply Letter No, Date, Vendor, Memo No, Action Date & Comments across all ${otherCount} materials covered under letter <strong>${esc(record.letterNo)}</strong> (Approved Qty remains specific to this item)</span>
       </label>`
    : '';

  return `
    ${modalTitle(`Edit Approval: Sl ${item.slNo} · ${esc(materialName(item))}`, 'Admin tool to edit turnkey letter details, memo number, dates, and comments.')}
    <form class="entry entry-plain" id="form-edit-approval">
      <input type="hidden" name="itemSl" value="${item.slNo}" />
      <input type="hidden" name="oldKind" value="${esc(record.kind)}" />
      <input type="hidden" name="oldLetterNo" value="${esc(record.letterNo || '')}" />

      ${letterOptions}

      <div class="edit-form-section">Turnkey Agency Submission Details</div>

      <label class="span-2">Approval Type / Tagging
        <select name="newKind" style="padding: 8px; border: 1px solid var(--line); border-radius: 6px; background: #fff; color: var(--text);">
          <option value="gtp_vendor"${record.kind === 'gtp_vendor' ? ' selected' : ''}>GTP + Vendor Combined (kind = gtp_vendor)</option>
          <option value="gtp"${record.kind === 'gtp' ? ' selected' : ''}>GTP Approval only (kind = gtp)</option>
          <option value="vendor"${record.kind === 'vendor' ? ' selected' : ''}>Vendor Approval only (kind = vendor)</option>
        </select>
      </label>

      <label>Letter Reference No.
        <input name="newLetterNo" required value="${esc(record.letterNo || '')}" placeholder="e.g. TE-HO/RM/Malda_UG/025" />
      </label>

      <label>Vendor / Manufacturer Name
        <input name="newVendor" required value="${esc(record.vendor || '')}" placeholder="e.g. Polycab India Ltd" />
      </label>

      <label class="span-2">Submission Date
        <input name="newSubDate" type="date" value="${esc(record.subDate || '')}" />
      </label>

      <div class="edit-form-section">Approving Authority Decision & Comments (Memo & Remarks)</div>

      <label>Decision Status
        <select name="newStatus" style="padding: 8px; border: 1px solid var(--line); border-radius: 6px; background: #fff; color: var(--text);">
          <option value="Submitted"${record.status === 'Submitted' ? ' selected' : ''}>Submitted (Pending Decision)</option>
          <option value="Approved"${record.status === 'Approved' ? ' selected' : ''}>Approved</option>
          <option value="Hold"${record.status === 'Hold' ? ' selected' : ''}>Hold</option>
          <option value="Rejected"${record.status === 'Rejected' ? ' selected' : ''}>Rejected</option>
        </select>
      </label>

      <label>Decision Memo No.
        <input name="newMemoNo" value="${esc(record.memoNo || '')}" placeholder="e.g. RM/MALDA/2026/05" />
      </label>

      <label>Decision / Memo Date
        <input name="newActionDate" type="date" value="${esc(record.actionDate || '')}" />
      </label>

      <label>Approved Qty (${esc(item.unit)})
        <input name="newApprovedQty" type="number" min="0" step="any" value="${esc(record.approvedQty !== null && record.approvedQty !== undefined && record.approvedQty !== '' ? record.approvedQty : item.loaQty)}" />
      </label>

      <label class="span-2">Authority Remarks / Comments
        <input name="newRemarks" value="${esc(record.remarks || '')}" placeholder="Remarks / comments by approving authority" />
      </label>

      ${scopeCheckbox}

      <div class="actions span-all" style="display: flex; gap: 8px; margin-top: 12px;">
        <button class="primary" type="submit">Save Changes</button>
        <button type="button" class="ghost" data-action="cancel-edit-approval">Cancel</button>
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
  const choices = [['Approved', 'Approve'], ['Rejected', 'Reject']];
  const rows = group.rows.map(({ item, record }) => {
    const open = GTP_WAITING.includes(record.status);
    const initial = record.status === 'Rejected' ? 'Rejected' : 'Approved';
    const decision = open
      ? `<div class="seg-group" role="radiogroup" aria-label="Decision for Sl ${item.slNo}">${choices.map(([value, label]) => `<label class="seg seg-${value.toLowerCase()}"><input type="radio" name="dec-${item.slNo}" value="${value}" ${value === initial ? 'checked' : ''} /><span>${label}</span></label>`).join('')}</div>`
      : miniStatus(record);
    return `
      <tr class="${open ? 'dec-row' : 'dec-done'}">
        <td>${item.slNo}</td>
        <td class="desc" title="${esc(item.description)}">${esc(materialName(item))}<span class="meta">${esc(record.vendor || 'No vendor named')}</span></td>
        <td class="num">${qtyText(item.loaQty, item.unit)}<span class="meta">Survey ${surveyText(item)}</span></td>
        <td>${miniStatus(record)}</td>
        <td>${decision}</td>
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
          <button type="button" class="choice-btn" data-action="batch-set" data-decision="Rejected">Reject all</button>
        </span>
      </div>
      <div class="span-all batch-sheet">
        ${table(['Sl', 'Material / vendor', numHead('LOA Qty'), 'Now', 'Decision'], rows, 5)}
      </div>
      <label>Memo no. <input name="memoNo" required placeholder="Ref. memo no." /></label>
      <label>Memo date <input name="date" type="date" required value="${todayISO()}" /></label>
      <label class="span-2">Remarks <input name="remarks" placeholder="Required when any row is rejected" /></label>
      <div class="batch-foot span-all">
        <span class="batch-count" data-count></span>
        <button class="primary" type="submit" data-submit>Save decisions</button>
      </div>
      <p class="form-msg span-all"></p>
    </form>
  `;
}

function gtpDecisionForm(item, kind) {
  const records = itemApprovals(item, kind);
  const waitingRecord = records.find((r) => r.status === 'Submitted') || records.find((r) => GTP_WAITING.includes(r.status)) || approvalRecord(item, kind);
  const defaultVendor = waitingRecord.vendor || approvalRecord(item, 'vendor').vendor || '';
  const defaultLetter = waitingRecord.letterNo || '';
  return `
    <form class="entry entry-plain" id="form-decision">
      <input type="hidden" name="kind" value="${kind}" />
      <input type="hidden" name="item" value="${item.slNo}" />
      <input type="hidden" name="decision" value="Approved" />
      <div class="field span-2">
        <span>Decision</span>
        <span class="choice">
          <button type="button" class="choice-btn active" data-action="pick-decision" data-decision="Approved">Approve</button>
          <button type="button" class="choice-btn" data-action="pick-decision" data-decision="Rejected">Reject</button>
        </span>
      </div>
      <label>Vendor / Manufacturer <input name="vendor" value="${esc(defaultVendor)}" placeholder="Vendor or manufacturer" /></label>
      <label>Letter ref. no. <input name="letterNo" value="${esc(defaultLetter)}" placeholder="Submission letter reference" /></label>
      <label>Approval memo no. <input name="memoNo" required placeholder="WBSEDCL approval memo no." /></label>
      <label>Approval date <input name="date" type="date" required value="${todayISO()}" /></label>
      <label class="span-2">Remarks <input name="remarks" placeholder="Required when rejected, optional if approved" /></label>
      <div class="actions"><button class="primary" type="submit">Save decision</button></div>
      <p class="form-msg span-all"></p>
    </form>
  `;
}

function gtpNotes(records, item, kind) {
  if (!records || !records.length) return '<p class="quiet">Not submitted yet.</p>';
  return records.map((record) => {
    const lines = [`${kindBadge(record.kind)} <strong>${esc(record.status || 'Not submitted')}</strong>`];
    if (record.vendor) lines.push(`Vendor: ${record.vendor}`);
    if (record.letterNo) lines.push(`Letter: ${record.letterNo}`);
    if (record.subDate) lines.push(`Submitted: ${isoToDmy(record.subDate)}`);
    if (record.memoNo || record.actionDate) lines.push([record.actionDate ? isoToDmy(record.actionDate) : '', record.memoNo ? `Memo: ${record.memoNo}` : ''].filter(Boolean).join(' · '));
    if (record.remarks) lines.push(`Remarks: ${record.remarks}`);
    const canDeleteRecord = isAdmin() && record.letterNo && record.status !== 'Approved';
    const canResetRecord = isAdmin() && (record.status === 'Approved' || record.status === 'Rejected' || record.status === 'Hold');
    const recKind = record.kind || kind || 'gtp_vendor';
    const adminBtns = isAdmin() && record.letterNo
      ? `<br><div style="display:flex; gap:6px; margin-top:4px; flex-wrap:wrap;">
           <button type="button" class="tiny" data-action="open-edit-approval" data-kind="${recKind}" data-letter="${esc(record.letterNo)}" data-sl="${item.slNo}">✏️ Edit details & comment</button>
           ${canResetRecord ? `<button type="button" class="tiny" data-action="reset-approval-decision" data-sl="${item.slNo}" data-kind="${recKind}" data-letter="${esc(record.letterNo)}">↺ Reset to Submitted</button>` : ''}
           ${canDeleteRecord ? `<button type="button" class="tiny danger" data-action="delete-approval" data-sl="${item.slNo}" data-kind="${recKind}" data-letter="${esc(record.letterNo)}">Delete</button>` : ''}
         </div>`
      : '';
    const openBtn = record.letterNo
      ? `<br><button type="button" class="tiny" style="margin-top:4px;" data-action="open-letter" data-id="${esc(letterKey(recKind, record.letterNo))}">Open letter ${esc(record.letterNo)}</button>`
      : '';
    return `
      <div class="gtp-note-card">
        <p class="quiet" style="margin:0;">${lines.map((line) => line.startsWith('<') ? line : esc(line)).join('<br>')}${openBtn}${adminBtns}</p>
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

const ACTIVITY_TYPES = [
  'Joint Measurement',
  'Site Visit / Joint Inspection',
  'Route Survey & Trench Alignment',
  'Feeder Shutdown / Tripping Coordination',
  'HDD Trial Boring & Utility Detection',
  'Road Cutting / Municipal & Police Coordination',
  'Right of Way (RoW) / Local Issue Clearance',
  'Material Shifting & Mobilization',
  'Cable Trenching & Laying Supervision',
  'Site Restoration & Final Cleanup',
  'Other'
];

function activityNewModal() {
  return `
    ${modalTitle('Log Site Activity', 'Record joint site visits, measurements, feeder shutdowns, or inter-agency meetings.')}
    <form class="entry entry-plain" id="form-site-activity" style="display: flex; flex-direction: column; gap: 14px; margin-top: 4px;">
      
      <!-- Section 1: Basic Information -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; display: grid; grid-template-columns: 1fr 1.5fr; gap: 12px;">
        <label style="display: flex; flex-direction: column; gap: 4px; font-size: 11.5px; font-weight: 600; color: #475569; text-transform: uppercase;">
          Activity Date <span style="color: #ef4444;">*</span>
          <input name="date" type="date" required value="${todayISO()}" style="padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13.5px; background: #fff;" />
        </label>

        <label style="display: flex; flex-direction: column; gap: 4px; font-size: 11.5px; font-weight: 600; color: #475569; text-transform: uppercase;">
          Activity Classification <span style="color: #ef4444;">*</span>
          <select name="activityType" id="select-activity-type" style="padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13.5px; background: #fff; color: var(--text);">
            ${ACTIVITY_TYPES.map((t) => `<option value="${esc(t)}">${esc(t)}</option>`).join('')}
          </select>
        </label>

        <label id="custom-activity-wrapper" hidden style="grid-column: span 2; display: flex; flex-direction: column; gap: 4px; font-size: 11.5px; font-weight: 600; color: #475569; text-transform: uppercase;">
          Specify Custom Activity Name <span style="color: #ef4444;">*</span>
          <input name="customType" placeholder="e.g. Tree Trimming NOC / Cable Drum Shifting" style="padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13.5px; background: #fff;" />
        </label>
      </div>

      <!-- Section 2: Representatives / Attendees -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px;">
        <div style="font-size: 11.5px; font-weight: 700; color: #334155; text-transform: uppercase; letter-spacing: 0.03em; margin-bottom: 10px; display: flex; align-items: center; gap: 6px;">
          <span>👥 Attendees & Stakeholders</span>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
          <label style="display: flex; flex-direction: column; gap: 4px; font-size: 11.5px; font-weight: 600; color: #475569;">
            <span>🏢 Agency Representative <span style="color: #ef4444;">*</span></span>
            <input name="agencyRep" required placeholder="Name, Designation (Tarun Enterprise)" style="padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13.5px; background: #fff;" />
          </label>

          <label style="display: flex; flex-direction: column; gap: 4px; font-size: 11.5px; font-weight: 600; color: #475569;">
            <span>⚡ WBSEDCL Representative</span>
            <input name="wbsedclRep" placeholder="Name, Designation (Division/Subdivision)" style="padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13.5px; background: #fff;" />
          </label>

          <label style="grid-column: span 2; display: flex; flex-direction: column; gap: 4px; font-size: 11.5px; font-weight: 600; color: #475569;">
            <span>🏛️ Other Representative / Authority (Optional)</span>
            <input name="otherRep" placeholder="e.g. Traffic Police OC / Municipal Engineer / Ward Councilor / Land Owner" style="padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13.5px; background: #fff;" />
          </label>
        </div>
      </div>

      <!-- Section 3: Quantity & Site Notes -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; display: flex; flex-direction: column; gap: 10px;">
        <label style="display: flex; flex-direction: column; gap: 4px; font-size: 11.5px; font-weight: 600; color: #475569;">
          <span>📏 Quantity / Stretch Length (Optional)</span>
          <input name="qty" placeholder="e.g. 250 m stretch or 2 joint bays" style="padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13.5px; background: #fff;" />
        </label>

        <label style="display: flex; flex-direction: column; gap: 4px; font-size: 11.5px; font-weight: 600; color: #475569;">
          <span>📝 Site Description & Meeting Minutes</span>
          <textarea name="description" rows="3" placeholder="Provide detailed notes on site findings, stretch inspected, decisions made, obstacles resolved, or next action items…" style="padding: 10px; border: 1px solid #cbd5e1; border-radius: 6px; font-size: 13.5px; background: #fff; font-family: inherit; resize: vertical;"></textarea>
        </label>
      </div>

      <!-- Footer Buttons -->
      <div style="display: flex; justify-content: flex-end; align-items: center; gap: 10px; margin-top: 4px;">
        <button type="button" class="ghost" data-action="close-modal" style="padding: 8px 16px;">Cancel</button>
        <button class="primary" type="submit" style="padding: 8px 20px; font-weight: 600;">Save Activity Record</button>
      </div>
      <p class="form-msg" style="margin: 0;"></p>
    </form>
  `;
}

function activityViewModal(act) {
  const badge = activityBadge(act.activityType);
  return `
    ${modalTitle(`Site Activity Details`, `${esc(formatDisplayDate(act.date))} · ${badge}`)}
    <div style="display: flex; flex-direction: column; gap: 14px; margin-top: 6px;">

      <!-- Top Highlights Bar -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px; display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px;">
        <div>
          <span style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.03em;">Activity Type</span>
          <div style="margin-top: 4px;">${badge}</div>
        </div>
        <div>
          <span style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.03em;">Date</span>
          <div style="font-weight: 600; font-size: 14px; margin-top: 4px; color: #0f172a;">${esc(formatDisplayDate(act.date))}</div>
        </div>
        <div>
          <span style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.03em;">Quantity / Stretch</span>
          <div style="font-weight: 600; font-size: 14px; margin-top: 4px; color: #0f172a;">${esc(act.qty || '—')}</div>
        </div>
        <div>
          <span style="font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: 700; letter-spacing: 0.03em;">Logged By</span>
          <div style="font-weight: 500; font-size: 13px; margin-top: 4px; color: #334155;">${esc(act.createdBy || 'Agency')}</div>
        </div>
      </div>

      <!-- Attendees Card -->
      <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px;">
        <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.03em; margin-bottom: 8px;">
          👥 Attendees & Representatives
        </div>
        <div style="display: grid; gap: 8px; font-size: 13.5px;">
          <div style="display: flex; gap: 8px;">
            <span style="font-weight: 600; min-width: 170px; color: #334155;">🏢 Agency Representative:</span>
            <span style="color: #0f172a;">${esc(act.agencyRep)}</span>
          </div>
          <div style="display: flex; gap: 8px;">
            <span style="font-weight: 600; min-width: 170px; color: #334155;">⚡ WBSEDCL Representative:</span>
            <span style="color: #0f172a;">${esc(act.wbsedclRep || '—')}</span>
          </div>
          ${act.otherRep ? `
            <div style="display: flex; gap: 8px;">
              <span style="font-weight: 600; min-width: 170px; color: #334155;">🏛️ Other Representative:</span>
              <span style="color: #0f172a;">${esc(act.otherRep)}</span>
            </div>
          ` : ''}
        </div>
      </div>

      <!-- Notes / Description -->
      <div style="background: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 12px 14px;">
        <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.03em; margin-bottom: 6px;">
          📝 Site Notes & Observations
        </div>
        <p style="margin: 0; font-size: 13.5px; line-height: 1.6; color: #1e293b; white-space: pre-wrap;">${esc(act.description || 'No detailed observations recorded.')}</p>
      </div>

      <!-- Footer Actions -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 4px;">
        <div>
          ${isAdmin() ? `<button type="button" class="ghost danger" data-action="delete-activity" data-id="${esc(act.id)}" style="padding: 6px 12px; font-size: 13px;">Delete Record</button>` : ''}
        </div>
        <button type="button" class="ghost" data-action="close-modal" style="padding: 8px 18px;">Close</button>
      </div>
    </div>
  `;
}

function dailyModal() {
  if (entryModal.mode === 'newActivity') return activityNewModal();
  if (entryModal.mode === 'viewActivity') {
    const act = siteActivities.find((row) => row.id === entryModal.id);
    if (!act) return '';
    return activityViewModal(act);
  }
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
  if (isAdmin()) headers.push('');
  return table(headers, rows.map((invoice) => {
    const names = invoice.lines.map((line) => line.itemName).join(' ');
    const net = sum(invoice.lines, (line) => line.net);
    const delBtn = isAdmin() ? `<td class="row-actions"><button type="button" class="tiny danger" data-action="delete-invoice" data-id="${esc(invoice.id)}">Delete</button></td>` : '';
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
    ['logs', 'Daily BOQ Logs'],
    ['activities', `Site Activities (${siteActivities.length})`],
    ['pending', pendingLabel]
  ];
  let hint = (isRegion() || isAdmin())
    ? 'Verify pending daily progress entries submitted by vendors to count them into executed progress.'
    : 'Select Supply or Erection item to enter today\'s site progress quantity for Region approval.';
  if (dailyTab === 'activities') {
    hint = 'Log and review site visits, joint measurements, shutdowns, route inspections, and inter-agency coordination.';
  }
  
  let body = '';
  if (dailyTab === 'supply') {
    body = dailyItems('Part-A (Material)');
  } else if (dailyTab === 'erection') {
    body = dailyItems('Part-B (Erection)');
  } else if (dailyTab === 'logs') {
    body = dailyLogTable(false);
  } else if (dailyTab === 'activities') {
    body = dailyActivitiesTable();
  } else {
    body = dailyLogTable(true);
  }

  return `
    ${head('Daily progress', hint)}
    ${tabBar('daily', tabs, dailyTab)}
    ${body}
  `;
}

function dailyActivitiesTable() {
  const canLogActivity = isVendor() || isAdmin();
  const topActions = `
    <div class="actions" style="display:flex; justify-content: space-between; align-items:center; margin-bottom: 12px;">
      <span class="meta">${siteActivities.length} ${siteActivities.length === 1 ? 'activity record' : 'activity records'}</span>
      ${canLogActivity ? `<button type="button" class="primary" data-action="activity-new">+ Log Site Activity</button>` : ''}
    </div>
  `;
  const rows = [...siteActivities].sort((a, b) => String(b.date).localeCompare(String(a.date)));
  const tableHtml = table([
    'Date',
    'Activity',
    'Agency Representative',
    'WBSEDCL Representative',
    'Other Representative',
    numHead('Qty (Optional)'),
    'Description',
    'Action'
  ], rows.map((act) => {
    const badge = activityBadge(act.activityType);
    const viewBtn = `<button type="button" class="tiny" data-action="open-activity" data-id="${esc(act.id)}">View</button>`;
    const delBtn = isAdmin() ? `<button type="button" class="tiny danger" data-action="delete-activity" data-id="${esc(act.id)}">Delete</button>` : '';
    const descPreview = act.description ? (act.description.length > 55 ? act.description.slice(0, 55) + '…' : act.description) : '—';
    return `
      <tr class="pick" data-action="open-activity" data-id="${esc(act.id)}" data-q="${esc(`${act.date} ${act.activityType} ${act.agencyRep} ${act.wbsedclRep} ${act.otherRep} ${act.description}`)}">
        <td><button type="button" class="row-link" data-action="open-activity" data-id="${esc(act.id)}">${esc(act.date)}</button></td>
        <td>${badge}</td>
        <td><strong>${esc(act.agencyRep)}</strong></td>
        <td>${esc(act.wbsedclRep || '—')}</td>
        <td>${esc(act.otherRep || '—')}</td>
        <td class="num">${esc(act.qty || '—')}</td>
        <td class="desc" title="${esc(act.description)}">${esc(descPreview)}</td>
        <td class="row-actions"><div style="display:flex; gap:4px;">${viewBtn}${delBtn}</div></td>
      </tr>
    `;
  }), 8, 'No random site activities logged yet. Click "+ Log Site Activity" to add one.');
  return topActions + tableHtml;
}

function activityBadge(type) {
  const toneMap = {
    'Joint Measurement': 'ok',
    'Site Visit / Joint Inspection': 'wait',
    'Route Survey & Trench Alignment': 'hold',
    'Feeder Shutdown / Tripping Coordination': 'bad',
    'Right of Way (RoW) / Local Issue Clearance': 'hold',
    'Road Cutting / Municipal & Police Coordination': 'hold'
  };
  const tone = toneMap[type] || 'idle';
  return `<span class="badge ${tone}">${esc(type)}</span>`;
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
  if (action === 'open-contract-overview') {
    openPage('boq');
    boqTab = 'overview';
    paint();
    return;
  }
  if (action === 'print') {
    window.print();
    return;
  }
  if (action === 'page-tab') {
    const tab = button.dataset.tab;
    const group = button.dataset.group;
    if (group === 'boq') {
      boqTab = ['overview', 'survey', 'material', 'erection'].includes(tab) ? tab : 'overview';
      if (tab === 'erection') boqPart = 'Part-B (Erection)';
      else if (tab === 'material') boqPart = 'Part-A (Material)';
    }
    if (group === 'gtp') gtpTab = ['all', 'not_submitted', 'pending', 'approved', 'rejected', 'letters'].includes(tab) ? tab : 'all';
    if (group === 'bill') billTab = tab === 'erection' ? 'erection' : 'supply';
    if (group === 'daily') dailyTab = ['supply', 'erection', 'logs', 'activities', 'pending'].includes(tab) ? tab : 'supply';
    if (group === 'receive') receiveTab = tab === 'receipts' ? 'receipts' : 'materials';
    paint();
    return;
  }
  if (action === 'gtp-tab') {
    const tab = button.dataset.tab;
    gtpTab = ['all', 'not_submitted', 'pending', 'approved', 'rejected', 'letters'].includes(tab) ? tab : 'all';
    paint();
    return;
  }
  if (action === 'reset-approval-decision') {
    resetApprovalDecision(Number(button.dataset.sl), button.dataset.kind || '', button.dataset.letter || '');
    return;
  }
  if (action === 'reset-letter-decision') {
    resetLetterDecision(button.dataset.kind || '', button.dataset.letter || '');
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
    const kind = button.dataset.kind || 'gtp';
    const letter = button.dataset.letter || '';
    const sl = Number(button.dataset.sl) || 0;
    const key = letterKey(kind, letter);
    entryModal = { page: 'gtp', sl, id: key, kind, letter, mode: 'rectifyLetter' };
    inspectOpenedAt = Date.now();
    paint();
    return;
  }
  if (action === 'cancel-rectify-letter') {
    if (entryModal) {
      if (entryModal.sl) {
        entryModal.mode = 'note';
        entryModal.id = entryModal.kind || 'gtp';
      } else {
        entryModal.mode = 'letter';
      }
    }
    paint();
    return;
  }
  if (action === 'open-edit-approval') {
    const sl = Number(button.dataset.sl);
    const kind = button.dataset.kind || (gtpTab === 'gtp' ? 'gtp' : 'vendor');
    const letter = button.dataset.letter || '';
    inspModal = null;
    entryModal = { page: 'gtp', sl, id: kind, letter, mode: 'editApproval' };
    inspectOpenedAt = Date.now();
    paint();
    return;
  }
  if (action === 'cancel-edit-approval') {
    if (entryModal && entryModal.sl) {
      entryModal.mode = 'note';
    } else {
      entryModal = null;
    }
    paint();
    return;
  }
  if (action === 'open-edit-offer-letter') {
    const offerNo = button.dataset.id;
    inspModal = { mode: 'editOfferLetter', offerNo };
    inspectOpenedAt = Date.now();
    paint();
    return;
  }
  if (action === 'cancel-edit-offer') {
    if (inspModal) inspModal.mode = 'letter';
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
  if (action === 'activity-new') {
    inspModal = null;
    entryModal = { page: 'daily', sl: 0, id: '', mode: 'newActivity' };
    inspectOpenedAt = Date.now();
    paint();
    return;
  }
  if (action === 'open-activity') {
    inspModal = null;
    entryModal = { page: 'daily', sl: 0, id: button.dataset.id, mode: 'viewActivity' };
    inspectOpenedAt = Date.now();
    paint();
    return;
  }
  if (action === 'delete-activity') {
    deleteSiteActivity(button.dataset.id);
    return;
  }
  if (action === 'contract-edit-milestones') {
    if (!isRegion() && !isAdmin()) return;
    entryModal = { page: 'contract', mode: 'milestones' };
    inspectOpenedAt = Date.now();
    paint();
    return;
  }
  if (action === 'contract-add-bg') {
    if (!isRegion() && !isAdmin()) return;
    entryModal = { page: 'contract', mode: 'bg', idx: null };
    inspectOpenedAt = Date.now();
    paint();
    return;
  }
  if (action === 'contract-edit-bg') {
    if (!isRegion() && !isAdmin()) return;
    const idx = Number(button.dataset.idx);
    entryModal = { page: 'contract', mode: 'bg', idx };
    inspectOpenedAt = Date.now();
    paint();
    return;
  }
  if (action === 'contract-delete-bg') {
    if (!isRegion() && !isAdmin()) return;
    deleteContractBg(Number(button.dataset.idx));
    return;
  }
  if (action === 'contract-add-eot') {
    if (!isRegion() && !isAdmin()) return;
    entryModal = { page: 'contract', mode: 'eot', idx: null };
    inspectOpenedAt = Date.now();
    paint();
    return;
  }
  if (action === 'contract-edit-eot') {
    if (!isRegion() && !isAdmin()) return;
    const idx = Number(button.dataset.idx);
    entryModal = { page: 'contract', mode: 'eot', idx };
    inspectOpenedAt = Date.now();
    paint();
    return;
  }
  if (action === 'contract-delete-eot') {
    if (!isRegion() && !isAdmin()) return;
    deleteContractEot(Number(button.dataset.idx));
    return;
  }
  if (action === 'survey-add-feeder') {
    if (!isDivision() && !isRegion() && !isAdmin()) return;
    entryModal = { page: 'contract', mode: 'feederSurvey', idx: -1 };
    inspectOpenedAt = Date.now();
    paint();
    return;
  }
  if (action === 'survey-edit-feeder') {
    if (!isDivision() && !isRegion() && !isAdmin()) return;
    const idx = Number(button.dataset.idx);
    entryModal = { page: 'contract', mode: 'feederSurvey', idx };
    inspectOpenedAt = Date.now();
    paint();
    return;
  }
  if (action === 'survey-delete-feeder') {
    if (!isDivision() && !isRegion() && !isAdmin()) return;
    const idx = Number(button.dataset.idx);
    deleteFeederSurvey(idx);
    return;
  }
  if (action === 'auth-mode') {
    authMode = button.dataset.mode === 'signup' ? 'signup' : 'login';
    paint();
  }
  if (action === 'sign-out') remote.signOut();
  if (action === 'save-person') savePerson(button.dataset.id);
  if (action === 'reset-pin') resetUserPin(button.dataset.id, button.dataset.name);
  if (action === 'edit-user-perms') {
    if (!can('users_manage') && user.role !== 'Admin') return;
    entryModal = { page: 'users', mode: 'permissions', id: button.dataset.id };
    inspectOpenedAt = Date.now();
    paint();
    return;
  }
  if (action === 'perm-preset') {
    const preset = button.dataset.preset;
    const modalForm = document.getElementById('form-user-permissions');
    if (!modalForm) return;
    let targetPerms = {};
    if (preset === 'all') {
      PERMISSION_DEFS.forEach((d) => { targetPerms[d.key] = true; });
    } else if (preset === 'none') {
      PERMISSION_DEFS.forEach((d) => { targetPerms[d.key] = false; });
    } else {
      targetPerms = ROLE_DEFAULT_PERMISSIONS[preset] || ROLE_DEFAULT_PERMISSIONS.Viewer;
    }
    let count = 0;
    PERMISSION_DEFS.forEach((def) => {
      const input = modalForm.elements[`perm_${def.key}`];
      if (input) {
        input.checked = Boolean(targetPerms[def.key]);
        if (input.checked) count++;
        const card = input.closest('.perm-toggle-card');
        if (card) {
          if (input.checked) {
            card.classList.add('active');
            card.style.borderColor = '#2563eb';
            card.style.background = '#eff6ff';
          } else {
            card.classList.remove('active');
            card.style.borderColor = '#e2e8f0';
            card.style.background = '#ffffff';
          }
        }
      }
    });
    const counter = document.getElementById('perm-counter');
    if (counter) counter.textContent = `${count} of 12 Authorizations Enabled`;
    return;
  }
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
  if (form.id === 'form-user-permissions') saveUserPermissions(form);
  if (form.id === 'form-contract-milestones') saveContractMilestones(form);
  if (form.id === 'form-contract-bg') saveContractBg(form);
  if (form.id === 'form-contract-eot') saveContractEot(form);
  if (form.id === 'form-feeder-survey') saveFeederSurvey(form);
  if (form.id === 'form-rectify-letter') saveRectifyLetter(form);
  if (form.id === 'form-edit-approval') saveEditApproval(form);
  if (form.id === 'form-edit-offer') saveEditOffer(form);
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
  if (form.id === 'form-site-activity') saveSiteActivity(form);
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
  if (event.target.classList.contains('perm-switch')) {
    const card = event.target.closest('.perm-toggle-card');
    if (card) {
      if (event.target.checked) {
        card.classList.add('active');
        card.style.borderColor = '#2563eb';
        card.style.background = '#eff6ff';
      } else {
        card.classList.remove('active');
        card.style.borderColor = '#e2e8f0';
        card.style.background = '#ffffff';
      }
    }
    const modalForm = document.getElementById('form-user-permissions');
    if (modalForm) {
      let count = 0;
      PERMISSION_DEFS.forEach((def) => {
        if (modalForm.elements[`perm_${def.key}`]?.checked) count++;
      });
      const counter = document.getElementById('perm-counter');
      if (counter) counter.textContent = `${count} of 12 Authorizations Enabled`;
    }
    return;
  }
  if (event.target.id === 'new-user-role') {
    const preset = event.target.value;
    const form = event.target.closest('form');
    if (form) {
      const defaults = ROLE_DEFAULT_PERMISSIONS[preset] || ROLE_DEFAULT_PERMISSIONS.Viewer;
      PERMISSION_DEFS.forEach((def) => {
        const input = form.elements[`perm_${def.key}`];
        if (input) input.checked = Boolean(defaults[def.key]);
      });
    }
    return;
  }
  if (event.target.id === 'select-activity-type') {
    const customWrap = document.getElementById('custom-activity-wrapper');
    if (customWrap) customWrap.hidden = event.target.value !== 'Other';
    return;
  }
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
  if (event.target.name === 'selectedLetter' && event.target.form?.id === 'form-edit-approval') {
    if (entryModal) {
      entryModal.letter = event.target.value;
      paint();
    }
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
  const tally = { Approved: 0, Rejected: 0 };
  form.querySelectorAll('.dec-row input[type="radio"]:checked').forEach((radio) => {
    if (tally[radio.value] !== undefined) tally[radio.value] += 1;
  });
  const parts = [];
  if (tally.Approved) parts.push(`<span class="badge ok">${tally.Approved} approve</span>`);
  if (tally.Rejected) parts.push(`<span class="badge bad">${tally.Rejected} reject</span>`);
  const label = form.querySelector('[data-count]');
  if (label) label.innerHTML = parts.join(' ') || 'Choose a decision for each row';
  const decided = tally.Approved + tally.Rejected;
  const submit = form.querySelector('[data-submit]');
  if (submit) {
    submit.disabled = decided === 0;
    submit.textContent = decided ? `Save ${decided} ${decided === 1 ? 'decision' : 'decisions'}` : 'Save decisions';
  }
}

function openPage(pageId) {
  if (pageId === 'boq') boqTab = 'overview';
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
  if (!can('users_manage') && user.role !== 'Admin') return;
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
  toast('User access updated');
  paint();
}

async function saveUserPermissions(form) {
  if (!can('users_manage') && user.role !== 'Admin') return;
  const id = form.dataset.id;
  const permissions = {};
  PERMISSION_DEFS.forEach((def) => {
    const input = form.elements[`perm_${def.key}`];
    permissions[def.key] = input ? input.checked : false;
  });

  try {
    await remote.saveProfile(id, { permissions });
    const person = people.find((p) => p.id === id);
    if (person) {
      person.permissions = permissions;
    }
    if (sessionUser?.id === id) {
      user.permissions = permissions;
    }
    entryModal = null;
    toast('Custom authorizations updated successfully');
    paint();
  } catch (err) {
    toast(err.message || 'Failed to update authorizations');
  }
}

async function createUserAccount(form) {
  if (!can('users_manage') && user.role !== 'Admin') return;
  const name = field(form, 'name');
  const userId = field(form, 'userId');
  const pin = field(form, 'pin');
  const role = field(form, 'role') || 'Vendor';

  if (!name || !userId || !pin) {
    return setMsg(form, 'Please enter Full Name, User ID, and PIN.');
  }

  const permissions = {};
  PERMISSION_DEFS.forEach((def) => {
    const input = form.elements[`perm_${def.key}`];
    permissions[def.key] = input ? input.checked : false;
  });

  try {
    setMsg(form, 'Creating user account…');
    await remote.createAdminUser(name, userId, pin, role, true, permissions);
    setMsg(form, '');
    toast(`User account "${name}" created with custom authorizations!`);
    await pullRegister();
    paint();
  } catch (error) {
    setMsg(form, error.message || 'Failed to create user account');
  }
}

async function resetUserPin(id, name) {
  if (!can('users_manage') && user.role !== 'Admin') return;
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
  const records = itemApprovals(item, kind);
  const target = letterNo ? records.find((r) => r.letterNo === letterNo) : records[0];
  const label = kindLabel(kind);
  if (target?.status === 'Approved') {
    alert(`Cannot delete this ${label} record: It has already been Approved. Rectify tagging instead of deleting.`);
    return;
  }
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
  const group = findGroup(letterKey(kind, letterNo));
  const hasApproved = group?.rows?.some(({ record }) => record.status === 'Approved');
  if (hasApproved) {
    alert(`Cannot delete letter ${letterNo}: Some or all materials covered under this letter are already approved. Use "Rectify Letter Tagging" to correct metadata instead.`);
    return;
  }
  const label = kindLabel(kind);
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

async function resetApprovalDecision(slNo, kind, letterNo) {
  if (user.role !== 'Admin') return;
  const item = findItem(slNo);
  if (!item) return;
  const records = itemAllApprovals(item);
  const target = letterNo ? records.find((r) => r.letterNo === letterNo) : records.find((r) => r.kind === kind) || records[0];
  if (!target) return;
  if (!confirm(`Reset decision for Sl ${slNo} (${target.letterNo || 'Material'}) back to 'Submitted' (Pending Approval)?`)) return;
  try {
    const updated = {
      itemSl: item.slNo,
      kind: target.kind,
      status: 'Submitted',
      vendor: target.vendor || '',
      letterNo: target.letterNo || '',
      subDate: target.subDate || todayISO(),
      apprDate: '',
      approvedQty: '',
      actionDate: '',
      memoNo: '',
      remarks: '',
      actionBy: ''
    };
    await remote.saveApproval(updated);
    await pullRegister();
    entryModal = null;
    toast(`Sl ${slNo} decision reset to 'Submitted'`);
    paint();
  } catch (error) {
    toast(error.message || 'Could not reset decision');
  }
}

async function resetLetterDecision(kind, letterNo) {
  if (user.role !== 'Admin') return;
  const group = findGroup(letterKey(kind, letterNo));
  if (!group || !group.rows.length) return;
  if (!confirm(`Reset all decisions under letter '${letterNo}' back to 'Submitted' (Pending Approval)?`)) return;
  try {
    const payloads = group.rows.map(({ item, record }) => ({
      itemSl: item.slNo,
      kind: record.kind,
      status: 'Submitted',
      vendor: record.vendor || '',
      letterNo: record.letterNo || letterNo,
      subDate: record.subDate || todayISO(),
      apprDate: '',
      approvedQty: '',
      actionDate: '',
      memoNo: '',
      remarks: '',
      actionBy: ''
    }));
    await remote.saveApprovals(payloads);
    await pullRegister();
    entryModal = null;
    toast(`Decisions for letter ${letterNo} reset to 'Submitted'`);
    paint();
  } catch (error) {
    toast(error.message || 'Could not reset decisions');
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
  const newStatus = field(form, 'newStatus');
  const newMemoNo = field(form, 'newMemoNo');
  const newActionDate = field(form, 'newActionDate');
  const newRemarks = field(form, 'newRemarks');

  if (!newLetterNo || !newVendor) {
    return setMsg(form, 'Please enter Letter Reference No. and Vendor Name.');
  }

  try {
    setMsg(form, 'Saving changes…');
    await remote.rectifyApproval(
      oldKind,
      oldLetterNo,
      newKind,
      newLetterNo,
      newVendor,
      newSubDate,
      null,
      newMemoNo,
      newActionDate,
      newRemarks,
      newStatus
    );
    await pullRegister();
    const returnSl = entryModal?.sl;
    if (returnSl) {
      entryModal = { page: 'gtp', sl: returnSl, id: newKind, mode: 'note' };
    } else {
      const newKey = letterKey(newKind, newLetterNo);
      entryModal = { page: 'gtp', sl: 0, id: newKey, mode: 'letter' };
    }
    toast(`Letter ${newLetterNo} details updated!`);
    paint();
  } catch (error) {
    setMsg(form, error.message || 'Could not save changes');
  }
}

async function saveEditApproval(form) {
  if (user.role !== 'Admin') return;
  const itemSl = Number(field(form, 'itemSl'));
  const oldKind = field(form, 'oldKind');
  const oldLetterNo = field(form, 'oldLetterNo');
  const newKind = field(form, 'newKind');
  const newLetterNo = field(form, 'newLetterNo');
  const newVendor = field(form, 'newVendor');
  const newSubDate = field(form, 'newSubDate');
  const newStatus = field(form, 'newStatus');
  const newMemoNo = field(form, 'newMemoNo');
  const newActionDate = field(form, 'newActionDate');
  const newApprovedQty = field(form, 'newApprovedQty');
  const newRemarks = field(form, 'newRemarks');
  const applyToAll = form.elements['applyToAll'] ? form.elements['applyToAll'].checked : false;

  if (!newLetterNo || !newVendor) {
    return setMsg(form, 'Please enter Letter Reference No. and Vendor Name.');
  }

  try {
    setMsg(form, 'Saving changes…');
    await remote.rectifyApproval(
      oldKind,
      oldLetterNo,
      newKind,
      newLetterNo,
      newVendor,
      newSubDate,
      applyToAll ? null : itemSl,
      newMemoNo,
      newActionDate,
      newRemarks,
      newStatus,
      newApprovedQty
    );
    await pullRegister();
    entryModal = { page: 'gtp', sl: itemSl, id: newKind, mode: 'note' };
    toast('Approval details & comments updated!');
    paint();
  } catch (error) {
    setMsg(form, error.message || 'Could not save changes');
  }
}

async function saveEditOffer(form) {
  if (user.role !== 'Admin') return;
  const oldOfferNo = field(form, 'oldOfferNo');
  const newOfferNo = field(form, 'newOfferNo');
  const newOfferDate = field(form, 'newOfferDate');
  const newManufacturer = field(form, 'newManufacturer');
  const newPremises = field(form, 'newPremises');
  const newRemarks = field(form, 'newRemarks');
  const newStatus = field(form, 'newStatus');
  const newMemoNo = field(form, 'newMemoNo');
  const newActionDate = field(form, 'newActionDate');
  const newActionRemarks = field(form, 'newActionRemarks');

  if (!newOfferNo || !newManufacturer) {
    return setMsg(form, 'Please enter Offer Letter No. and Manufacturer Name.');
  }

  try {
    setMsg(form, 'Saving changes…');
    await remote.rectifyOffer(
      oldOfferNo,
      newOfferNo,
      newOfferDate,
      newManufacturer,
      newPremises,
      newRemarks,
      null,
      newMemoNo,
      newActionDate,
      newActionRemarks,
      newStatus
    );
    await pullRegister();
    inspModal = null;
    toast(`Offer ${newOfferNo} details updated!`);
    paint();
  } catch (error) {
    setMsg(form, error.message || 'Could not save changes');
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
    const decision = form.querySelector(`input[name="dec-${item.slNo}"]:checked`)?.value || 'Approved';
    picks.push({ item, record, decision, qty: item.loaQty });
  }
  if (!picks.length) return setMsg(form, 'Choose approve or reject for at least one row.');
  if (!memoNo || !date) return setMsg(form, 'Enter the memo number and memo date.');
  if (!remarks && picks.some(({ decision }) => decision === 'Rejected')) return setMsg(form, 'Add a remark for the rejected rows.');
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
  payloads.forEach(({ itemSl, kind, ...fields }) => {
    const it = findItem(itemSl);
    const rec = itemApprovals(it, kind).find((r) => r.letterNo === fields.letterNo) || approvalRecord(it, kind);
    Object.assign(rec, fields);
  });
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
  const kind = ['gtp', 'vendor', 'gtp_vendor'].includes(field(form, 'kind')) ? field(form, 'kind') : 'gtp_vendor';
  const item = findItem(field(form, 'item'));
  if (!item) return setMsg(form, 'Select a valid item.');

  const decision = field(form, 'decision');
  if (!['Approved', 'Rejected'].includes(decision)) return setMsg(form, 'Choose approve or reject.');

  const memoNo = field(form, 'memoNo');
  const date = field(form, 'date');
  const remarks = field(form, 'remarks');
  if (!memoNo || !date) return setMsg(form, 'Enter the memo number and date.');
  if (decision === 'Rejected' && !remarks) return setMsg(form, 'Add a remark for the rejected decision.');
  if (!requireName(form)) return;

  const records = itemApprovals(item, kind);
  const letterNoInput = field(form, 'letterNo');
  const record = (letterNoInput ? records.find((r) => r.letterNo === letterNoInput) : null)
    || records.find((r) => r.status === 'Submitted')
    || records.find((r) => GTP_WAITING.includes(r.status))
    || approvalRecord(item, kind);
  const vendor = field(form, 'vendor') || record.vendor || approvalRecord(item, 'vendor').vendor || '';
  const letterNo = letterNoInput || record.letterNo || '';

  const payload = {
    itemSl: item.slNo,
    kind,
    status: decision,
    vendor: vendor || '',
    letterNo: letterNo || '',
    subDate: record.subDate || date,
    apprDate: decision === 'Approved' ? date : '',
    approvedQty: decision === 'Approved' ? item.loaQty : '',
    actionDate: date,
    memoNo,
    remarks: remarks || decisionLabel(decision),
    actionBy: user.name || user.role
  };

  if (!await finish(form, () => remote.saveApproval(payload))) return;
  Object.assign(record, payload);
  if (!gtpApprovals.includes(record)) {
    gtpApprovals.push(record);
  }
  entryModal = null;
  const label = kindLabel(kind);
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

async function saveSiteActivity(form) {
  if (!isVendor() && !isAdmin()) return;
  const date = field(form, 'date');
  const activityType = field(form, 'activityType');
  const customType = field(form, 'customType');
  const type = activityType === 'Other' && customType ? customType : activityType;
  const agencyRep = field(form, 'agencyRep');
  const wbsedclRep = field(form, 'wbsedclRep');
  const otherRep = field(form, 'otherRep');
  const qty = field(form, 'qty');
  const description = field(form, 'description');

  if (!date || !type || !agencyRep) {
    return setMsg(form, 'Please enter Date, Activity, and Agency Representative.');
  }

  const row = {
    id: uid('ACT'),
    date,
    activityType: type,
    agencyRep,
    wbsedclRep,
    otherRep,
    qty,
    description,
    createdBy: user.name || effectiveRole()
  };

  try {
    setMsg(form, 'Saving activity…');
    await remote.saveSiteActivity(row);
    await pullRegister();
    entryModal = null;
    toast('Site activity recorded');
    paint();
  } catch (err) {
    setMsg(form, err.message || 'Could not save activity');
  }
}

async function deleteSiteActivity(id) {
  if (!isAdmin()) return;
  const act = siteActivities.find((a) => a.id === id);
  if (!act) return;
  if (!confirm(`Delete activity "${act.activityType}" on ${act.date}?`)) return;
  try {
    await remote.removeSiteActivity(id);
    await pullRegister();
    entryModal = null;
    toast('Activity deleted');
    paint();
  } catch (err) {
    toast(err.message || 'Could not delete');
  }
}

async function saveContractMilestones(form) {
  if (!isRegion() && !isAdmin()) return;
  const contract = { ...(contractData || defaultContract()) };
  contract.loaNo = field(form, 'loaNo');
  contract.loaDate = field(form, 'loaDate') || null;
  contract.acceptanceDate = field(form, 'acceptanceDate') || null;
  contract.acceptanceRef = field(form, 'acceptanceRef');
  contract.scheduleSubDate = field(form, 'scheduleSubDate') || null;
  contract.scheduleSubRef = field(form, 'scheduleSubRef');
  contract.scheduleSubRemarks = field(form, 'scheduleSubRemarks');
  contract.scheduleApprDate = field(form, 'scheduleApprDate') || null;
  contract.scheduleApprRef = field(form, 'scheduleApprRef');
  contract.scheduleApprStatus = field(form, 'scheduleApprStatus');
  contract.scheduleApprRemarks = field(form, 'scheduleApprRemarks');
  contract.targetCompletionDate = field(form, 'targetCompletionDate') || null;
  contract.updatedBy = user.name || effectiveRole();

  try {
    setMsg(form, 'Saving milestones…');
    await remote.saveContractOverview(contract);
    await pullRegister();
    entryModal = null;
    toast('Contract milestones updated');
    paint();
  } catch (err) {
    setMsg(form, err.message || 'Could not save milestones');
  }
}

async function saveContractBg(form) {
  if (!isRegion() && !isAdmin()) return;
  const idx = Number(field(form, 'idx'));
  const contract = { ...(contractData || defaultContract()) };
  const list = [...(contract.bgEntries || [])];
  const bgNo = field(form, 'bgNo');
  const bankName = field(form, 'bankName');
  const amount = Number(field(form, 'amount')) || 0;
  const subDate = field(form, 'subDate');

  if (!bgNo || !bankName || !subDate) {
    return setMsg(form, 'Please enter BG Number, Bank Name, and Submission Date.');
  }

  const entry = {
    id: idx >= 0 && list[idx]?.id ? list[idx].id : uid('BG'),
    bgNo,
    bankName,
    amount,
    subDate,
    expiryDate: field(form, 'expiryDate') || null,
    claimDate: field(form, 'claimDate') || null,
    status: field(form, 'status') || 'Active',
    remarks: field(form, 'remarks') || ''
  };

  if (idx >= 0 && idx < list.length) {
    list[idx] = entry;
  } else {
    list.push(entry);
  }

  contract.bgEntries = list;
  contract.updatedBy = user.name || effectiveRole();

  try {
    setMsg(form, 'Saving Bank Guarantee…');
    await remote.saveContractOverview(contract);
    await pullRegister();
    entryModal = null;
    toast(idx >= 0 ? 'Bank Guarantee updated' : 'Bank Guarantee added');
    paint();
  } catch (err) {
    setMsg(form, err.message || 'Could not save BG');
  }
}

async function deleteContractBg(idx) {
  if (!isRegion() && !isAdmin()) return;
  const contract = { ...(contractData || defaultContract()) };
  const list = [...(contract.bgEntries || [])];
  const bg = list[idx];
  if (!bg) return;
  if (!confirm(`Delete Bank Guarantee "${bg.bgNo}"?`)) return;
  list.splice(idx, 1);
  contract.bgEntries = list;
  contract.updatedBy = user.name || effectiveRole();
  try {
    await remote.saveContractOverview(contract);
    await pullRegister();
    toast('Bank Guarantee deleted');
    paint();
  } catch (err) {
    toast(err.message || 'Could not delete BG');
  }
}

async function saveContractEot(form) {
  if (!isRegion() && !isAdmin()) return;
  const idx = Number(field(form, 'idx'));
  const contract = { ...(contractData || defaultContract()) };
  const list = [...(contract.eotEntries || [])];
  const revisedDate = field(form, 'revisedDate');
  const memoNo = field(form, 'memoNo');

  if (!revisedDate || !memoNo) {
    return setMsg(form, 'Please enter Revised Target Date and Approval Memo No.');
  }

  const entry = {
    id: idx >= 0 && list[idx]?.id ? list[idx].id : uid('EOT'),
    revisedDate,
    extensionDays: Number(field(form, 'extensionDays')) || 0,
    memoNo,
    approvalDate: field(form, 'approvalDate') || null,
    approvedBy: field(form, 'approvedBy') || 'WBSEDCL',
    status: field(form, 'status') || 'Approved',
    reason: field(form, 'reason') || ''
  };

  if (idx >= 0 && idx < list.length) {
    list[idx] = entry;
  } else {
    list.push(entry);
  }

  contract.eotEntries = list;
  contract.updatedBy = user.name || effectiveRole();

  try {
    setMsg(form, 'Saving Time Extension…');
    await remote.saveContractOverview(contract);
    await pullRegister();
    entryModal = null;
    toast(idx >= 0 ? 'EOT revision updated' : 'EOT revision added');
    paint();
  } catch (err) {
    setMsg(form, err.message || 'Could not save EOT');
  }
}

async function deleteContractEot(idx) {
  if (!isRegion() && !isAdmin()) return;
  const contract = { ...(contractData || defaultContract()) };
  const list = [...(contract.eotEntries || [])];
  const eot = list[idx];
  if (!eot) return;
  if (!confirm(`Delete Time Extension revision (Rev-${idx + 1})?`)) return;
  list.splice(idx, 1);
  contract.eotEntries = list;
  contract.updatedBy = user.name || effectiveRole();
  try {
    await remote.saveContractOverview(contract);
    await pullRegister();
    toast('EOT revision deleted');
    paint();
  } catch (err) {
    toast(err.message || 'Could not delete EOT');
  }
}

async function saveFeederSurvey(form) {
  if (!isDivision() && !isRegion() && !isAdmin()) return;
  const idx = Number(field(form, 'idx'));
  const contract = { ...(contractData || defaultContract()) };
  const list = [...(contract.feederSurveys || [])];

  const ssName = field(form, 'ssName');
  const feederName = field(form, 'feederName');
  const routeLength = Number(field(form, 'routeLength')) || 0;

  if (!ssName || !feederName || !routeLength) {
    return setMsg(form, 'Please enter Substation Name, Feeder Name, and Total Route Length.');
  }

  // Capacity-wise DTR inputs
  const dtr100 = Math.max(0, parseInt(field(form, 'dtr_100'), 10) || 0);
  const dtr160 = Math.max(0, parseInt(field(form, 'dtr_160'), 10) || 0);
  const dtr250 = Math.max(0, parseInt(field(form, 'dtr_250'), 10) || 0);
  const dtr315 = Math.max(0, parseInt(field(form, 'dtr_315'), 10) || 0);
  const dtr500 = Math.max(0, parseInt(field(form, 'dtr_500'), 10) || 0);
  const dtr630 = Math.max(0, parseInt(field(form, 'dtr_630'), 10) || 0);
  const dtrOther = (field(form, 'dtr_other') || '').trim();
  const dtrNotes = (field(form, 'dtr_notes') || '').trim();

  const dtrCounts = {};
  if (dtr100 > 0) dtrCounts['100'] = dtr100;
  if (dtr160 > 0) dtrCounts['160'] = dtr160;
  if (dtr250 > 0) dtrCounts['250'] = dtr250;
  if (dtr315 > 0) dtrCounts['315'] = dtr315;
  if (dtr500 > 0) dtrCounts['500'] = dtr500;
  if (dtr630 > 0) dtrCounts['630'] = dtr630;

  const totalDtrNos = dtr100 + dtr160 + dtr250 + dtr315 + dtr500 + dtr630;
  const totalDtrKva = (dtr100 * 100) + (dtr160 * 160) + (dtr250 * 250) + (dtr315 * 315) + (dtr500 * 500) + (dtr630 * 630);

  const dtrParts = [];
  if (dtr630 > 0) dtrParts.push(`630 kVA (${dtr630})`);
  if (dtr500 > 0) dtrParts.push(`500 kVA (${dtr500})`);
  if (dtr315 > 0) dtrParts.push(`315 kVA (${dtr315})`);
  if (dtr250 > 0) dtrParts.push(`250 kVA (${dtr250})`);
  if (dtr160 > 0) dtrParts.push(`160 kVA (${dtr160})`);
  if (dtr100 > 0) dtrParts.push(`100 kVA (${dtr100})`);
  if (dtrOther) dtrParts.push(dtrOther);

  let dtrDetails = dtrParts.join(', ');
  if (totalDtrNos > 0 && dtrParts.length > 1) {
    dtrDetails += ` · Total: ${totalDtrNos} Nos (${totalDtrKva} kVA)`;
  }

  const entry = {
    id: idx >= 0 && list[idx]?.id ? list[idx].id : uid('FS'),
    ssName,
    feederName,
    routeLength,
    cable400: Number(field(form, 'cable400')) || 0,
    cable185: Number(field(form, 'cable185')) || 0,
    rmu3Way: Number(field(form, 'rmu3Way')) || 0,
    rmu4Way: Number(field(form, 'rmu4Way')) || 0,
    dtrCounts,
    dtrOther,
    dtrNotes,
    dtrTotalNos: totalDtrNos,
    dtrTotalKva,
    dtrDetails: dtrDetails || '—',
    termKit400: Number(field(form, 'termKit400')) || 0,
    termKit185: Number(field(form, 'termKit185')) || 0,
    microTunneling: Number(field(form, 'microTunneling')) || 0,
    openCut: Number(field(form, 'openCut')) || 0,
    jackPush: Number(field(form, 'jackPush')) || 0,
    hdpePipe: Number(field(form, 'hdpePipe')) || 0,
    status: field(form, 'status') || 'In Progress',
    surveyDate: field(form, 'surveyDate') || cleanDate(new Date().toISOString()),
    surveyorName: field(form, 'surveyorName') || '',
    remarks: field(form, 'remarks') || ''
  };

  if (idx >= 0 && idx < list.length) {
    list[idx] = entry;
  } else {
    list.push(entry);
  }

  contract.feederSurveys = list;
  contract.updatedBy = user.name || effectiveRole();

  try {
    setMsg(form, 'Saving Feeder Survey…');
    await remote.saveContractOverview(contract);
    await pullRegister();
    entryModal = null;
    toast(idx >= 0 ? 'Feeder survey updated' : 'Feeder survey added');
    paint();
  } catch (err) {
    setMsg(form, err.message || 'Could not save survey');
  }
}

async function deleteFeederSurvey(idx) {
  if (!isDivision() && !isRegion() && !isAdmin()) return;
  const contract = { ...(contractData || defaultContract()) };
  const list = [...(contract.feederSurveys || [])];
  const s = list[idx];
  if (!s) return;
  if (!confirm(`Delete survey record for "${s.feederName}"?`)) return;
  list.splice(idx, 1);
  contract.feederSurveys = list;
  contract.updatedBy = user.name || effectiveRole();
  try {
    await remote.saveContractOverview(contract);
    await pullRegister();
    toast('Feeder survey deleted');
    paint();
  } catch (err) {
    toast(err.message || 'Could not delete survey');
  }
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
  return `<button type="button" class="tiny" data-action="open-entry" data-sl="${item.slNo}" data-id="${kind}" data-mode="submit">${esc(label)}</button>`;
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
  const comboApprs = itemApprovals(item, 'gtp_vendor').filter((r) => r.status === 'Approved');
  const getQty = (list) => {
    if (!list.length) return 0;
    const nums = list.map((r) => {
      const q = Number(r.approvedQty);
      return q > 0 ? q : Number(item.loaQty) || 0;
    });
    return Math.max(...nums);
  };
  if (comboApprs.length) {
    const cQty = getQty(comboApprs);
    return cQty > 0 ? cQty : Number(item.loaQty) || 0;
  }
  const vendorApprs = itemApprovals(item, 'vendor').filter((r) => r.status === 'Approved');
  const gtpDocs = itemApprovals(item, 'gtp').filter((r) => r.status === 'Approved');
  if (!vendorApprs.length && !gtpDocs.length) return 0;
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
  if (pageId === 'home') return true;
  if (pageId === 'boq') return true;
  if (pageId === 'gtp') return can('gtp_submit') || can('gtp_approve') || user.role === 'Viewer' || isAdmin();
  if (pageId === 'di') return can('di_offer') || can('di_issue') || user.role === 'Viewer' || isAdmin();
  if (pageId === 'receive') return can('receive_record') || user.role === 'Viewer' || isAdmin();
  if (pageId === 'billing') return can('billing_submit') || can('billing_pay') || user.role === 'Viewer' || isAdmin();
  if (pageId === 'daily') return can('daily_log') || can('daily_verify') || user.role === 'Viewer' || isAdmin();
  if (pageId === 'users') return can('users_manage') || isAdmin();
  return (ROLE_PAGES[effectiveRole()] || ROLE_PAGES.Turnkey).includes(pageId);
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

function kpi(label, value, sub, action = '') {
  return `
    <article class="kpi"${action ? ` data-action="${esc(action)}" style="cursor:pointer;" title="Click to view details"` : ''}>
      <span class="kpi-label">${esc(label)}</span>
      <strong class="kpi-value">${esc(value)}</strong>
      <span class="kpi-sub">${esc(sub)}</span>
    </article>
  `;
}

function table(headers, rows, cols, emptyText = 'No records yet.', footerHtml = '') {
  const body = rows.length
    ? rows.join('') + `<tr class="filter-empty" hidden><td class="empty" colspan="${cols}">No match.</td></tr>`
    : `<tr><td class="empty" colspan="${cols}">${esc(emptyText)}</td></tr>`;
  const head = headers.map((header) => {
    const numeric = header && typeof header === 'object';
    const label = numeric ? header.label : header;
    return `<th${numeric ? ' class="num"' : ''}>${esc(label)}</th>`;
  }).join('');
  const foot = footerHtml ? `<tfoot>${footerHtml}</tfoot>` : '';
  return `
    <div class="table-wrap">
      <table>
        <thead><tr>${head}</tr></thead>
        <tbody>${body}</tbody>
        ${foot}
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
  if (!dmy) return '—';
  const parts = String(dmy).split('-').map(Number);
  if (parts.length !== 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) return dmy;
  let year, month, day;
  if (parts[0] > 1000) {
    year = parts[0]; month = parts[1]; day = parts[2];
  } else {
    day = parts[0]; month = parts[1]; year = parts[2];
  }
  const d = new Date(year, month - 1, day);
  if (isNaN(d.getTime())) return dmy;
  return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function daysUntil(dmy) {
  if (!dmy) return 0;
  const parts = String(dmy).split('-').map(Number);
  if (parts.length !== 3 || isNaN(parts[0]) || isNaN(parts[1]) || isNaN(parts[2])) return 0;
  let year, month, day;
  if (parts[0] > 1000) {
    year = parts[0]; month = parts[1]; day = parts[2];
  } else {
    day = parts[0]; month = parts[1]; year = parts[2];
  }
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

function formatInr(value, decimals = 2) {
  const amount = Number(value) || 0;
  return '₹' + amount.toLocaleString('en-IN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });
}

function numberToIndianWords(amount) {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine',
    'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertTwoDigits(n) {
    if (n < 20) return ones[n];
    const t = Math.floor(n / 10);
    const r = n % 10;
    return tens[t] + (r > 0 ? ' ' + ones[r] : '');
  }

  function convertThreeDigits(n) {
    const h = Math.floor(n / 100);
    const r = n % 100;
    let res = '';
    if (h > 0) res += ones[h] + ' Hundred';
    if (r > 0) res += (res ? ' ' : '') + convertTwoDigits(r);
    return res;
  }

  const rounded = Number(amount || 0).toFixed(2);
  const parts = rounded.split('.');
  let num = parseInt(parts[0], 10);
  const paise = parseInt(parts[1], 10);

  if (num === 0 && paise === 0) return 'Rupees Zero Only';

  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  const lakh = Math.floor(num / 100000);
  num %= 100000;
  const thousand = Math.floor(num / 1000);
  num %= 1000;
  const hundred = num;

  const result = [];
  if (crore > 0) result.push(convertThreeDigits(crore) + ' Crore');
  if (lakh > 0) result.push(convertThreeDigits(lakh) + ' Lakh');
  if (thousand > 0) result.push(convertThreeDigits(thousand) + ' Thousand');
  if (hundred > 0) result.push(convertThreeDigits(hundred));

  let str = 'Rupees ' + (result.join(' ') || 'Zero');
  if (paise > 0) {
    str += ' and ' + convertTwoDigits(paise) + ' Paise';
  }
  str += ' Only';
  return str;
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
