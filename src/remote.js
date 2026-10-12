import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  throw new Error('The Supabase URL and anon key are missing from .env');
}

export const supabase = createClient(url, anonKey);

const CACHE_KEY = 'malda_ug_register_v1';
const DATA_TABLES = ['items', 'approvals', 'offers', 'di', 'receipts', 'invoices', 'invoice_lines', 'logs', 'site_activities', 'project_contract'];

let channel = null;

export function watchAuth(onSession) {
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'SIGNED_OUT') onSession(session);
  });
}

export function normalizeUserId(input) {
  if (!input) return '';
  const trimmed = input.trim();
  if (trimmed.includes('@')) return trimmed.toLowerCase();
  return `${trimmed.toLowerCase()}@malda-ug.gov.in`;
}

export function normalizePin(pinInput) {
  if (!pinInput) return '';
  const trimmed = String(pinInput).trim();
  if (trimmed.length < 6) {
    return (trimmed + '000000').slice(0, 6);
  }
  return trimmed;
}

export async function signIn(userIdOrEmail, pinOrPassword) {
  const email = normalizeUserId(userIdOrEmail);
  const password = normalizePin(pinOrPassword);
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error(error.message);
}

export async function ensureDemoAccount(email, password, name, role, regionId = 'REG-MALDA', vendorId = 'VEND-512589') {
  const normEmail = normalizeUserId(email);
  const normPass = normalizePin(password);
  const { data: signData, error: signError } = await supabase.auth.signInWithPassword({ email: normEmail, password: normPass });
  if (!signError && signData?.user) {
    const userId = signData.user.id;
    await supabase.from('profiles').upsert({
      id: userId,
      name,
      email: normEmail,
      role,
      region_id: regionId,
      vendor_id: vendorId,
      active: true
    }, { onConflict: 'id' });
    return;
  }

  const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
    email: normEmail,
    password: normPass,
    options: { data: { name } }
  });

  if (signUpError) {
    throw new Error(signUpError.message || 'Could not create demo account in Supabase Auth');
  }

  const userId = signUpData.user?.id;
  if (userId) {
    await supabase.from('profiles').upsert({
      id: userId,
      name,
      email: normEmail,
      role,
      region_id: regionId,
      vendor_id: vendorId,
      active: true
    }, { onConflict: 'id' });

    if (!signUpData.session) {
      const { error: reSignErr } = await supabase.auth.signInWithPassword({ email: normEmail, password: normPass });
      if (reSignErr) {
        throw new Error('Demo account registered in Supabase. Check your inbox if email confirmation is enabled, or sign in again.');
      }
    }
  }
}

export async function signUp(name, userIdOrEmail, pinOrPassword) {
  const email = normalizeUserId(userIdOrEmail);
  const password = normalizePin(pinOrPassword);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { name } }
  });
  if (error) throw new Error(error.message);
  if (!data.session) {
    throw new Error('Account created! Admin needs to activate your login before access is granted.');
  }
}

export async function createAdminUser(name, userIdInput, pinInput, role, active = true) {
  const email = normalizeUserId(userIdInput);
  const password = normalizePin(pinInput);

  // Try direct Postgres RPC creation first (bypasses GoTrue SMTP rate limits completely!)
  const { data: rpcData, error: rpcError } = await supabase.rpc('admin_create_user', {
    p_name: name.trim(),
    p_user_id: userIdInput.trim(),
    p_pin: password,
    p_role: role
  });

  if (!rpcError && rpcData) {
    return rpcData;
  }

  if (rpcError && rpcError.message && rpcError.message.includes('already exists')) {
    throw new Error(rpcError.message);
  }

  // Fallback to client side signUp if RPC function is not yet created in SQL
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id, email')
    .eq('email', email.toLowerCase())
    .maybeSingle();

  if (existingProfile) {
    throw new Error(`A user with User ID / Email "${userIdInput}" already exists.`);
  }

  const tempClient = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  const { data: signUpData, error: signUpError } = await tempClient.auth.signUp({
    email,
    password,
    options: { data: { name: name.trim() } }
  });

  if (signUpError) {
    if (signUpError.message?.toLowerCase().includes('rate limit')) {
      throw new Error('Supabase email rate limit hit. Run `supabase/schema.sql` in your Supabase SQL Editor to enable direct Admin user creation without emails.');
    }
    throw new Error(signUpError.message || 'Could not create user account in auth system');
  }

  const newUserId = signUpData.user?.id;
  if (!newUserId) {
    throw new Error('User creation failed. No User ID returned.');
  }

  const { error: profileErr } = await supabase.from('profiles').upsert({
    id: newUserId,
    name: name.trim(),
    email: email.toLowerCase(),
    role: role,
    active: active,
    region_id: 'REG-MALDA',
    vendor_id: (role === 'Vendor' || role === 'Turnkey') ? 'VEND-512589' : 'VEND-NONE'
  }, { onConflict: 'id' });

  if (profileErr) {
    throw new Error(profileErr.message || 'Account created in Auth, but profile failed to save.');
  }

  return { id: newUserId, name: name.trim(), email: email.toLowerCase(), role, active };
}

export async function adminSetUserPin(userId, pinInput) {
  const password = normalizePin(pinInput);
  const { error } = await supabase.rpc('admin_set_user_pin', {
    target_user_id: userId,
    new_pin: password
  });
  if (error) throw new Error(error.message || 'Could not update PIN/Password');
}

export async function signOut() {
  clearCache();
  stopListen();
  await supabase.auth.signOut();
}

export async function profile() {
  const { data: auth } = await supabase.auth.getUser();
  const id = auth.user?.id;
  if (!id) return { name: '', role: '', active: false, email: '' };
  const { data, error } = await supabase.from('profiles').select('id,name,email,role,active').eq('id', id).maybeSingle();
  if (error) throw wrap(error);
  if (!data) return { name: '', role: '', active: false, email: auth.user.email || '' };
  data.role = String(data.role || '').trim();
  return data;
}

export function cachedRegister(includePeople) {
  const cache = readCache();
  if (!cache?.rows?.items) return null;
  return mapRegister(cache.rows, includePeople ? cache.people || [] : []);
}

export async function loadRegister(includePeople) {
  const cache = readCache() || { versions: {}, rows: {}, people: [] };
  const versions = await fetchVersions();
  const rows = { ...cache.rows };
  const needed = DATA_TABLES.filter((table) => !versions || cache.versions?.[table] !== versions[table] || !rows[table]);
  if (needed.length) {
    const results = await Promise.all(needed.map((table) => supabase.from(table).select('*')));
    results.forEach((result, index) => {
      if (result.error) {
        if ((needed[index] === 'site_activities' || needed[index] === 'project_contract') && (result.error.code === '42P01' || result.error.code === 'PGRST205' || /could not find the table/i.test(result.error.message || ''))) {
          rows[needed[index]] = [];
          return;
        }
        throw wrap(result.error);
      }
      rows[needed[index]] = result.data || [];
    });
  }
  let people = cache.people || [];
  const peopleStale = includePeople && (!versions || cache.versions?.profiles !== versions.profiles || !Array.isArray(cache.people));
  if (peopleStale) {
    const peopleResult = await supabase.from('profiles').select('id,name,email,role,active').order('name');
    if (peopleResult.error) throw wrap(peopleResult.error);
    people = peopleResult.data || [];
  }
  if (needed.length || peopleStale || !readCache()) {
    writeCache({
      versions: versions || {},
      rows,
      people
    });
  }
  return mapRegister(rows, includePeople ? people : []);
}

function mapRegister(rows, people) {
  const items = rows.items || [];
  const approvals = rows.approvals || [];
  const offers = rows.offers || [];
  const dis = rows.di || [];
  const receipts = rows.receipts || [];
  const logs = rows.logs || [];
  const itemBySl = new Map(items.map((item) => [item.sl_no, item]));
  const offerById = new Map(offers.map((offer) => [offer.id, offer]));
  const vendorMap = new Map();
  approvals.filter((row) => (row.kind === 'vendor' || row.kind === 'gtp_vendor') && row.vendor).forEach((row) => {
    const list = vendorMap.get(row.item_sl) || [];
    if (!list.includes(row.vendor)) list.push(row.vendor);
    vendorMap.set(row.item_sl, list);
  });
  const vendorBySl = new Map([...vendorMap.entries()].map(([sl, list]) => [sl, { vendor: list.join(', ') }]));
  return {
    items: items.map(toItem).sort((a, b) => a.slNo - b.slNo),
    approvals: approvals.map(toApproval),
    offers: offers.map((row) => toOffer(row, itemBySl)).sort(newestFirst),
    dis: dis.map((row) => toDi(row, itemBySl, offerById, vendorBySl)).sort(newestFirst),
    receipts: receipts.map((row) => toReceipt(row, itemBySl)).sort(newestFirst),
    invoices: mapInvoices(rows.invoices || [], rows.invoice_lines || [], itemBySl),
    logs: logs.map((row) => toLog(row, itemBySl)).sort(newestFirst),
    activities: (rows.site_activities || []).map(toActivity).sort(newestFirst),
    contract: toContract(rows.project_contract?.[0]),
    people
  };
}

async function fetchVersions() {
  const { data, error } = await supabase.from('versions').select('name,version');
  if (error) {
    if (error.code === '42P01' || error.code === 'PGRST205' || /could not find the table/i.test(error.message || '')) return null;
    throw wrap(error);
  }
  const versions = {};
  (data || []).forEach((row) => {
    versions[row.name] = Number(row.version) || 0;
  });
  return versions;
}

function readCache() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CACHE_KEY) || '');
    if (!parsed || typeof parsed !== 'object' || !parsed.rows) return null;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(cache) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache));
  } catch {
    // The browser copy is optional. The register still loads from Supabase.
  }
}

function clearCache() {
  localStorage.removeItem(CACHE_KEY);
}

export function listen(onChange) {
  stopListen();
  channel = supabase.channel('register');
  ['items', 'approvals', 'offers', 'di', 'receipts', 'invoices', 'invoice_lines', 'logs', 'profiles'].forEach((table) => {
    channel.on('postgres_changes', { event: '*', schema: 'public', table }, () => onChange());
  });
  channel.subscribe();
}

export function stopListen() {
  channel?.unsubscribe();
  channel = null;
}

export async function saveItem(item) {
  const { error } = await supabase.from('items').upsert(toItemRow(item), { onConflict: 'sl_no' });
  if (error) throw wrap(error);
}

export async function saveItemFields(slNo, fields) {
  const { error } = await supabase.from('items').update(fields).eq('sl_no', slNo);
  if (error) throw wrap(error);
}

export async function removeItem(slNo) {
  const { error } = await supabase.from('items').delete().eq('sl_no', slNo);
  if (error) throw wrap(error);
}

export async function removeApproval(itemSl, kind, letterNo) {
  let query = supabase.from('approvals').delete().eq('item_sl', itemSl).eq('kind', kind);
  if (letterNo) query = query.eq('letter_no', letterNo);
  const { error } = await query;
  if (error) throw wrap(error);
}

export async function removeApprovalLetter(kind, letterNo) {
  const { error } = await supabase.from('approvals').delete().eq('kind', kind).eq('letter_no', letterNo);
  if (error) throw wrap(error);
}

export async function rectifyApproval(oldKind, oldLetterNo, newKind, newLetterNo, newVendor, newSubDate = null, itemSl = null) {
  const { error } = await supabase.rpc('admin_rectify_approval', {
    p_old_kind: oldKind,
    p_old_letter_no: oldLetterNo,
    p_new_kind: newKind,
    p_new_letter_no: newLetterNo,
    p_new_vendor: newVendor,
    p_new_sub_date: newSubDate || null,
    p_item_sl: itemSl || null
  });

  if (!error) return;

  // Fallback if RPC is not present or restricted
  let selectQuery = supabase.from('approvals').select('*').eq('kind', oldKind).eq('letter_no', oldLetterNo);
  if (itemSl) selectQuery = selectQuery.eq('item_sl', itemSl);
  const { data: rows, error: selErr } = await selectQuery;
  if (selErr) throw wrap(selErr);
  if (!rows || rows.length === 0) return;

  if (oldKind !== newKind) {
    let delQuery = supabase.from('approvals').delete().eq('kind', oldKind).eq('letter_no', oldLetterNo);
    if (itemSl) delQuery = delQuery.eq('item_sl', itemSl);
    const { error: delErr } = await delQuery;
    if (delErr) throw wrap(delErr);

    const newRows = rows.map((r) => ({
      ...r,
      kind: newKind,
      letter_no: newLetterNo.trim(),
      vendor: newVendor.trim(),
      sub_date: newSubDate || r.sub_date
    }));
    const { error: insErr } = await supabase.from('approvals').insert(newRows);
    if (insErr) throw wrap(insErr);
  } else {
    let updQuery = supabase.from('approvals').update({
      letter_no: newLetterNo.trim(),
      vendor: newVendor.trim(),
      ...(newSubDate ? { sub_date: newSubDate } : {})
    }).eq('kind', oldKind).eq('letter_no', oldLetterNo);
    if (itemSl) updQuery = updQuery.eq('item_sl', itemSl);
    const { error: updErr } = await updQuery;
    if (updErr) throw wrap(updErr);
  }
}

export async function removeInvoice(id) {
  const { error } = await supabase.from('invoices').delete().eq('id', id);
  if (error) throw wrap(error);
}

export async function saveApproval(record) {
  const row = toApprovalRow(record);
  if (row.status === 'Approved' || row.status === 'Rejected') {
    // A decision on an approval MUST use .update() so PostgreSQL receives TG_OP = 'UPDATE'.
    // Calling .upsert() performs INSERT ... ON CONFLICT, which fires BEFORE INSERT trigger
    // with TG_OP = 'INSERT' and triggers the PostgreSQL exception 'Select a submitted item'.
    let updateQuery = supabase
      .from('approvals')
      .update(row)
      .eq('item_sl', row.item_sl)
      .eq('kind', row.kind);

    if (row.letter_no) {
      updateQuery = updateQuery.eq('letter_no', row.letter_no);
    }

    const { data, error } = await updateQuery.select();
    if (error) throw wrap(error);

    // If an existing row was found and updated, we are done!
    if (data && data.length > 0) return;

    // If no row existed yet (e.g. direct approval of an unsubmitted item):
    // Insert with status 'Submitted' first to satisfy the trigger, then update to decision.
    const letterRef = row.letter_no || (row.memo_no ? `MEMO-${row.memo_no}` : `APPR-SL${row.item_sl}`);
    const vendorName = row.vendor || 'Approved Manufacturer';
    const subDate = row.sub_date || row.action_date || new Date().toISOString().slice(0, 10);

    const subRow = {
      item_sl: row.item_sl,
      kind: row.kind,
      status: 'Submitted',
      vendor: vendorName,
      letter_no: letterRef,
      sub_date: subDate,
      approved_qty: null,
      appr_date: null,
      action_date: null,
      memo_no: '',
      remarks: '',
      action_by: ''
    };

    const { error: insErr } = await supabase.from('approvals').insert(subRow);
    if (insErr) throw wrap(insErr);

    const updateData = {
      ...row,
      vendor: vendorName,
      letter_no: letterRef,
      sub_date: subDate
    };

    const { error: updErr } = await supabase
      .from('approvals')
      .update(updateData)
      .eq('item_sl', updateData.item_sl)
      .eq('kind', updateData.kind)
      .eq('letter_no', updateData.letter_no);
    if (updErr) throw wrap(updErr);
    return;
  }

  if (row.status === 'Submitted') {
    let updateQuery = supabase
      .from('approvals')
      .update(row)
      .eq('item_sl', row.item_sl)
      .eq('kind', row.kind);
    if (row.letter_no) updateQuery = updateQuery.eq('letter_no', row.letter_no);
    const { data, error: updErr } = await updateQuery.select();
    if (!updErr && data && data.length > 0) return;
  }

  // New submission by vendor/turnkey agency
  const { error } = await supabase.from('approvals').upsert(row, { onConflict: 'item_sl,kind,letter_no' });
  if (error) throw wrap(error);
}

// Many items under one letter / memo reference are saved in a single round trip.
export async function saveApprovals(records) {
  if (!records.length) return;
  const isDecision = records.some((r) => r.status === 'Approved' || r.status === 'Rejected');
  if (isDecision) {
    for (const record of records) {
      await saveApproval(record);
    }
    return;
  }
  const { error } = await supabase.from('approvals').upsert(records.map(toApprovalRow), { onConflict: 'item_sl,kind,letter_no' });
  if (error) throw wrap(error);
}

export async function saveOffer(offer) {
  const { error } = await supabase.from('offers').insert(toOfferRow(offer));
  if (error) throw wrap(error);
}

export async function saveOffers(offers) {
  if (!offers.length) return;
  const { error } = await supabase.from('offers').insert(offers.map(toOfferRow));
  if (error) throw wrap(error);
}

export async function saveOfferAction(offer) {
  const { error } = await supabase.from('offers').update({
    status: offer.status,
    action_date: offer.actionDate || null,
    memo_no: offer.memoNo || '',
    action_remarks: offer.actionRemarks || '',
    action_by: offer.actionBy || ''
  }).eq('id', offer.id);
  if (error) throw wrap(error);
}

export async function saveOfferActions(updates) {
  if (!updates.length) return;
  const promises = updates.map((offer) =>
    supabase.from('offers').update({
      status: offer.status,
      action_date: offer.actionDate || null,
      memo_no: offer.memoNo || '',
      action_remarks: offer.actionRemarks || '',
      action_by: offer.actionBy || ''
    }).eq('id', offer.id)
  );
  const results = await Promise.all(promises);
  const failed = results.find((r) => r.error);
  if (failed) throw wrap(failed.error);
}

export async function saveDi(row) {
  const { error } = await supabase.from('di').insert({
    id: row.id,
    item_sl: row.itemSl,
    offer_id: row.offerId,
    di_no: row.diNo,
    di_date: row.date,
    qty: row.qty,
    by_name: row.by || ''
  });
  if (error) throw wrap(error);
}

export async function saveReceipt(row) {
  const { error } = await supabase.from('receipts').insert({
    id: row.id,
    item_sl: row.itemSl,
    srv_no: row.srvNo,
    srv_date: row.date,
    qty: row.qty,
    by_name: row.by || ''
  });
  if (error) throw wrap(error);
}

export async function saveInvoice(invoice) {
  const { error } = await supabase.rpc('save_invoice', {
    header: {
      id: invoice.id,
      invoice_no: invoice.invoiceNo,
      invoice_date: invoice.date,
      bill_type: invoice.type,
      by_name: invoice.by || ''
    },
    lines: invoice.lines.map((line) => ({
      id: line.id,
      item_sl: line.itemSl,
      qty: line.qty
    }))
  });
  if (error) throw wrap(error);
}

export async function markBillPaid(id) {
  const { error } = await supabase.from('invoices').update({ pay_status: 'Paid' }).eq('id', id);
  if (error) throw wrap(error);
}

export async function saveLog(row) {
  const { error } = await supabase.from('logs').insert({
    id: row.id,
    item_sl: row.itemSl,
    log_date: row.date,
    feeder: row.feeder,
    location: row.location,
    qty: row.executedQty,
    remarks: row.remarks || '',
    site_engineer: row.siteEngineer || '',
    approval_status: 'Pending',
    inspector: ''
  });
  if (error) throw wrap(error);
}

export async function verifyLog(id, inspector) {
  const { error } = await supabase.from('logs').update({
    approval_status: 'Approved',
    inspector
  }).eq('id', id);
  if (error) throw wrap(error);
}

export async function saveSiteActivity(activity) {
  const row = {
    id: activity.id,
    activity_date: activity.date,
    activity_type: activity.activityType,
    agency_rep: activity.agencyRep || '',
    wbsedcl_rep: activity.wbsedclRep || '',
    other_rep: activity.otherRep || '',
    qty: activity.qty || '',
    description: activity.description || '',
    created_by: activity.createdBy || ''
  };
  const { error } = await supabase.from('site_activities').upsert(row);
  if (error) throw wrap(error);
}

export async function removeSiteActivity(id) {
  const { error } = await supabase.from('site_activities').delete().eq('id', id);
  if (error) throw wrap(error);
}

export async function saveContractOverview(contract) {
  const row = {
    id: contract.id || 'MALDA-UG-MAIN',
    loa_no: contract.loaNo || 'WBSEDCL/RE/Malda/UG/2023-24/01',
    loa_date: contract.loaDate || null,
    acceptance_date: contract.acceptanceDate || null,
    acceptance_ref: contract.acceptanceRef || '',
    schedule_sub_date: contract.scheduleSubDate || null,
    schedule_sub_ref: contract.scheduleSubRef || '',
    schedule_sub_remarks: contract.scheduleSubRemarks || '',
    schedule_appr_date: contract.scheduleApprDate || null,
    schedule_appr_ref: contract.scheduleApprRef || '',
    schedule_appr_status: contract.scheduleApprStatus || 'Pending',
    schedule_appr_remarks: contract.scheduleApprRemarks || '',
    target_completion_date: contract.targetCompletionDate || '2025-07-15',
    bg_entries: contract.bgEntries || [],
    eot_entries: contract.eotEntries || [],
    remarks: contract.remarks || '',
    updated_by: contract.updatedBy || '',
    updated_at: new Date().toISOString()
  };
  const { error } = await supabase.from('project_contract').upsert(row, { onConflict: 'id' });
  if (error) throw wrap(error);
}

export async function saveProfile(id, fields) {
  const { error } = await supabase.from('profiles').update(fields).eq('id', id);
  if (error) throw wrap(error);
}

export async function seedItems(items) {
  const { error } = await supabase.from('items').upsert(items.map(toItemRow), { onConflict: 'sl_no' });
  if (error) throw wrap(error);
}

export async function resetToLoa(items) {
  const rows = items.map((item) => ({
    sl_no: item.slNo,
    part: item.part,
    category: item.category,
    description: item.description,
    unit: item.unit,
    loa_qty: item.loaQty,
    revised_qty: item.revisedQty,
    rate: item.rate
  }));
  const { error } = await supabase.rpc('reset_loa', { rows });
  if (error) throw wrap(error);
}

function toItem(row) {
  return {
    slNo: row.sl_no,
    part: row.part,
    category: row.category,
    description: row.description,
    unit: row.unit,
    rate: num(row.rate),
    loaQty: num(row.loa_qty),
    revisedQty: num(row.revised_qty),
    surveyQty: row.survey_qty == null ? undefined : num(row.survey_qty),
    supplyClass: row.supply_class || undefined,
    totalAmount: num(row.revised_qty) * num(row.rate),
    pipeline: {}
  };
}

function toItemRow(item) {
  return {
    sl_no: item.slNo,
    part: item.part,
    category: item.category,
    description: item.description,
    unit: item.unit,
    loa_qty: num(item.loaQty),
    survey_qty: item.surveyQty == null || item.surveyQty === '' ? null : num(item.surveyQty),
    revised_qty: num(item.revisedQty),
    rate: num(item.rate),
    supply_class: item.supplyClass === 'Local' || item.supplyClass === 'Central' ? item.supplyClass : null
  };
}

function toApproval(row) {
  return {
    itemSl: row.item_sl,
    kind: row.kind,
    status: row.status,
    vendor: row.vendor || '',
    letterNo: row.letter_no || '',
    subDate: row.sub_date || '',
    apprDate: row.appr_date || '',
    approvedQty: row.approved_qty == null ? '' : num(row.approved_qty),
    actionDate: row.action_date || '',
    memoNo: row.memo_no || '',
    remarks: row.remarks || '',
    actionBy: row.action_by || ''
  };
}

function toApprovalRow(record) {
  return {
    item_sl: record.itemSl,
    kind: record.kind,
    status: record.status,
    vendor: record.vendor || '',
    letter_no: record.letterNo || '',
    sub_date: record.subDate || null,
    approved_qty: record.approvedQty === '' || record.approvedQty == null ? null : num(record.approvedQty),
    appr_date: record.apprDate || null,
    action_date: record.actionDate || null,
    memo_no: record.memoNo || '',
    remarks: record.remarks || '',
    action_by: record.actionBy || ''
  };
}

function toOffer(row, itemBySl) {
  const item = itemBySl.get(row.item_sl);
  return {
    id: row.id,
    offerNo: row.offer_no,
    date: row.offer_date,
    itemSl: row.item_sl,
    itemName: item?.description || '',
    qty: num(row.qty),
    unit: item?.unit || '',
    manufacturer: row.manufacturer,
    premises: row.premises,
    remarks: row.remarks || '',
    class: row.class,
    status: row.status,
    actionDate: row.action_date || '',
    memoNo: row.memo_no || '',
    actionRemarks: row.action_remarks || '',
    actionBy: row.action_by || '',
    by: row.by_name || '',
    createdAt: row.created_at
  };
}

function toOfferRow(offer) {
  return {
    id: offer.id,
    item_sl: offer.itemSl,
    offer_no: offer.offerNo,
    offer_date: offer.date,
    qty: num(offer.qty),
    manufacturer: offer.manufacturer,
    premises: offer.premises,
    remarks: offer.remarks || '',
    class: offer.class,
    status: offer.status || 'Offered',
    by_name: offer.by || ''
  };
}

function toDi(row, itemBySl, offerById, vendorBySl) {
  const item = itemBySl.get(row.item_sl);
  const offer = offerById.get(row.offer_id);
  return {
    id: row.id,
    diNo: row.di_no,
    date: row.di_date,
    itemSl: row.item_sl,
    itemName: item?.description || '',
    qty: num(row.qty),
    unit: item?.unit || '',
    vendor: vendorBySl.get(row.item_sl)?.vendor || '',
    by: row.by_name || '',
    offerId: row.offer_id,
    offerNo: offer?.offer_no || '',
    class: offer?.class || '',
    createdAt: row.created_at
  };
}

function toReceipt(row, itemBySl) {
  const item = itemBySl.get(row.item_sl);
  return {
    id: row.id,
    srvNo: row.srv_no,
    date: row.srv_date,
    itemSl: row.item_sl,
    itemName: item?.description || '',
    qty: num(row.qty),
    unit: item?.unit || '',
    by: row.by_name || '',
    createdAt: row.created_at
  };
}

function mapInvoices(invoiceRows, lineRows, itemBySl) {
  const linesByInvoice = new Map();
  lineRows.forEach((row) => {
    const item = itemBySl.get(row.item_sl);
    const line = {
      id: row.id,
      itemSl: row.item_sl,
      itemName: item?.description || '',
      unit: item?.unit || '',
      qty: num(row.qty),
      gross: num(row.gross),
      gst: num(row.gst),
      sd: num(row.sd),
      net: num(row.net)
    };
    const list = linesByInvoice.get(row.invoice_id) || [];
    list.push(line);
    linesByInvoice.set(row.invoice_id, list);
  });
  return invoiceRows.map((row) => ({
    id: row.id,
    invoiceNo: row.invoice_no,
    date: row.invoice_date,
    type: row.bill_type,
    payStatus: row.pay_status,
    by: row.by_name || '',
    createdAt: row.created_at,
    lines: linesByInvoice.get(row.id) || []
  })).sort(newestFirst);
}

function toLog(row, itemBySl) {
  const item = itemBySl.get(row.item_sl);
  return {
    id: row.id,
    date: row.log_date,
    feeder: row.feeder,
    location: row.location,
    itemSl: row.item_sl,
    itemDesc: item?.description || '',
    unit: item?.unit || '',
    executedQty: num(row.qty),
    siteEngineer: row.site_engineer || '',
    remarks: row.remarks || '',
    approvalStatus: row.approval_status,
    inspector: row.inspector || '',
    createdAt: row.created_at
  };
}

function toActivity(row) {
  return {
    id: row.id,
    date: row.activity_date,
    activityType: row.activity_type,
    agencyRep: row.agency_rep || '',
    wbsedclRep: row.wbsedcl_rep || '',
    otherRep: row.other_rep || '',
    qty: row.qty || '',
    description: row.description || '',
    createdBy: row.created_by || '',
    createdAt: row.created_at
  };
}

function toContract(row) {
  if (!row) {
    return {
      id: 'MALDA-UG-MAIN',
      loaNo: 'WBSEDCL/RE/Malda/UG/2023-24/01',
      loaDate: '2024-01-16',
      acceptanceDate: '',
      acceptanceRef: '',
      scheduleSubDate: '',
      scheduleSubRef: '',
      scheduleSubRemarks: '',
      scheduleApprDate: '',
      scheduleApprRef: '',
      scheduleApprStatus: 'Pending',
      scheduleApprRemarks: '',
      targetCompletionDate: '2025-07-15',
      bgEntries: [],
      eotEntries: [],
      remarks: '',
      updatedBy: '',
      updatedAt: ''
    };
  }
  return {
    id: row.id || 'MALDA-UG-MAIN',
    loaNo: row.loa_no || 'WBSEDCL/RE/Malda/UG/2023-24/01',
    loaDate: row.loa_date || '2024-01-16',
    acceptanceDate: row.acceptance_date || '',
    acceptanceRef: row.acceptance_ref || '',
    scheduleSubDate: row.schedule_sub_date || '',
    scheduleSubRef: row.schedule_sub_ref || '',
    scheduleSubRemarks: row.schedule_sub_remarks || '',
    scheduleApprDate: row.schedule_appr_date || '',
    scheduleApprRef: row.schedule_appr_ref || '',
    scheduleApprStatus: row.schedule_appr_status || 'Pending',
    scheduleApprRemarks: row.schedule_appr_remarks || '',
    targetCompletionDate: row.target_completion_date || '2025-07-15',
    bgEntries: Array.isArray(row.bg_entries) ? row.bg_entries : [],
    eotEntries: Array.isArray(row.eot_entries) ? row.eot_entries : [],
    remarks: row.remarks || '',
    updatedBy: row.updated_by || '',
    updatedAt: row.updated_at || ''
  };
}

function newestFirst(a, b) {
  return String(b.createdAt || '').localeCompare(String(a.createdAt || ''));
}

function num(value) {
  return Number(value) || 0;
}

function wrap(error) {
  let message = error.message || 'Could not save';
  if (error.code === '23503') message = 'This line still has records, so it cannot be deleted.';
  if (error.code === '23505') message = 'That number was just used. Try the save again.';
  if (error.code === '42P01' || /could not find the table/i.test(message)) {
    message = 'The Supabase tables are not created yet. Run supabase/schema.sql in the SQL editor, then sign in again.';
  }
  return new Error(message);
}
