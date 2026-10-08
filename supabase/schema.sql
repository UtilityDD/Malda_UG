-- Malda UG register. Run once in the Supabase SQL editor (or via scripts/apply-schema.mjs).

create or replace function public.item_office(class text, category text)
returns text
language sql
immutable
as $$
  select case
    when class in ('Local', 'Central') then class
    when category = 'Hardware' then 'Local'
    else 'Central'
  end
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  name text not null default '',
  email text not null default '',
  role text not null default 'Vendor' check (role in ('Vendor', 'Region', 'Turnkey', 'WBSEDCL', 'Store', 'Viewer', 'Admin')),
  region_id text not null default 'REG-MALDA',
  vendor_id text not null default 'VEND-512589',
  active boolean not null default false
);

ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS name TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS email TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'Vendor',
  ADD COLUMN IF NOT EXISTS region_id TEXT DEFAULT 'REG-MALDA',
  ADD COLUMN IF NOT EXISTS vendor_id TEXT DEFAULT 'VEND-512589',
  ADD COLUMN IF NOT EXISTS sub_role TEXT DEFAULT 'Engineer',
  ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;

create table if not exists public.items (
  sl_no integer primary key,
  part text not null,
  category text not null,
  description text not null,
  unit text not null,
  loa_qty numeric not null check (loa_qty >= 0),
  survey_qty numeric check (survey_qty is null or survey_qty >= 0),
  revised_qty numeric not null check (revised_qty >= 0),
  rate numeric not null check (rate >= 0),
  supply_class text check (supply_class is null or supply_class in ('Local', 'Central')),
  updated_at timestamptz not null default now()
);

create table if not exists public.approvals (
  item_sl integer not null references public.items (sl_no) on delete restrict,
  kind text not null check (kind in ('vendor', 'gtp')),
  status text not null check (status in ('Submitted', 'Approved', 'Hold', 'Rejected')),
  vendor text not null default '',
  letter_no text not null default '',
  sub_date date,
  approved_qty numeric,
  appr_date date,
  action_date date,
  memo_no text not null default '',
  remarks text not null default '',
  action_by text not null default '',
  primary key (item_sl, kind, letter_no)
);

ALTER TABLE public.approvals DROP CONSTRAINT IF EXISTS approvals_pkey;
ALTER TABLE public.approvals ADD PRIMARY KEY (item_sl, kind, letter_no);

create table if not exists public.offers (
  id text primary key,
  item_sl integer not null references public.items (sl_no) on delete restrict,
  offer_no text not null,
  offer_date date not null,
  qty numeric not null check (qty > 0),
  manufacturer text not null,
  premises text not null,
  remarks text not null default '',
  class text not null check (class in ('Local', 'Central')),
  status text not null check (status in ('Offered', 'Cleared', 'Rejected', 'Forwarded')),
  action_date date,
  memo_no text not null default '',
  action_remarks text not null default '',
  action_by text not null default '',
  by_name text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.di (
  id text primary key,
  item_sl integer not null references public.items (sl_no) on delete restrict,
  offer_id text not null references public.offers (id) on delete restrict,
  di_no text not null,
  di_date date not null,
  qty numeric not null check (qty > 0),
  by_name text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.receipts (
  id text primary key,
  item_sl integer not null references public.items (sl_no) on delete restrict,
  srv_no text not null,
  srv_date date not null,
  qty numeric not null check (qty > 0),
  by_name text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.invoices (
  id text primary key,
  invoice_no text not null,
  invoice_date date not null,
  bill_type text not null check (bill_type in ('Supply', 'Erection')),
  pay_status text not null check (pay_status in ('Claimed', 'Paid')),
  by_name text not null default '',
  created_at timestamptz not null default now(),
  unique (invoice_no, bill_type)
);

create table if not exists public.invoice_lines (
  id text primary key,
  invoice_id text not null references public.invoices (id) on delete cascade,
  item_sl integer not null references public.items (sl_no) on delete restrict,
  qty numeric not null check (qty > 0),
  gross numeric not null,
  gst numeric not null,
  sd numeric not null,
  net numeric not null,
  unique (invoice_id, item_sl)
);

create table if not exists public.logs (
  id text primary key,
  item_sl integer not null references public.items (sl_no) on delete restrict,
  log_date date not null,
  feeder text not null,
  location text not null,
  qty numeric not null check (qty > 0),
  remarks text not null default '',
  site_engineer text not null default '',
  approval_status text not null check (approval_status in ('Pending', 'Approved')),
  inspector text not null default '',
  created_at timestamptz not null default now()
);

create index if not exists offers_item_idx on public.offers (item_sl);
create index if not exists di_item_idx on public.di (item_sl);
create index if not exists di_offer_idx on public.di (offer_id);
create index if not exists receipts_item_idx on public.receipts (item_sl);
create index if not exists invoice_lines_item_idx on public.invoice_lines (item_sl);
create index if not exists invoice_lines_invoice_idx on public.invoice_lines (invoice_id);
create index if not exists logs_item_idx on public.logs (item_sl);

create or replace function public.my_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select case
    when p.role = 'Turnkey' then 'Vendor'
    when p.role = 'WBSEDCL' then 'Region'
    else p.role
  end
  from public.profiles p
  where p.id = auth.uid() and coalesce(p.active, true);
$$;

create or replace function public.my_region_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(p.region_id, 'REG-MALDA') from public.profiles p where p.id = auth.uid() and coalesce(p.active, true);
$$;

create or replace function public.my_vendor_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select coalesce(p.vendor_id, 'VEND-512589') from public.profiles p where p.id = auth.uid() and coalesce(p.active, true);
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  existing integer;
begin
  perform pg_advisory_xact_lock(78421);
  select count(*) into existing from public.profiles;
  insert into public.profiles (id, name, email, role, active)
  values (
    new.id,
    coalesce(nullif(trim(new.raw_user_meta_data->>'name'), ''), split_part(new.email, '@', 1)),
    coalesce(new.email, ''),
    case when existing = 0 then 'Admin' else 'Vendor' end,
    existing = 0
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.guard_item()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  role text := public.my_role();
begin
  if tg_op = 'INSERT' then
    if role is distinct from 'Admin' then
      raise exception 'Only Admin can add a BOQ line';
    end if;
    return new;
  end if;
  if role = 'Admin' then
    return new;
  end if;
  if role in ('Region', 'WBSEDCL') then
    if new.part is distinct from old.part
       or new.category is distinct from old.category
       or new.description is distinct from old.description
       or new.unit is distinct from old.unit
       or new.loa_qty is distinct from old.loa_qty
       or new.rate is distinct from old.rate
       or new.revised_qty is distinct from coalesce(new.survey_qty, new.loa_qty)
       or new.sl_no is distinct from old.sl_no
    then
      raise exception 'Survey quantity and office are the fields WBSEDCL can change';
    end if;
    return new;
  end if;
  raise exception 'This login cannot change the BOQ';
end;
$$;

drop trigger if exists guard_items on public.items;
create trigger guard_items
  before insert or update on public.items
  for each row execute function public.guard_item();

create or replace function public.guard_approval()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  role text := public.my_role();
  item record;
begin
  select * into item from public.items where sl_no = new.item_sl;
  if not found or item.part not like '%Material%' then
    raise exception 'Select a material item';
  end if;
  if tg_op = 'UPDATE' then
    if old.status = 'Approved' then
      raise exception 'This record is already approved';
    end if;
    if new.kind is distinct from old.kind or new.item_sl is distinct from old.item_sl then
      raise exception 'The item on this approval cannot change';
    end if;
  end if;

  if new.status = 'Submitted' then
    if role not in ('Vendor', 'Turnkey', 'Admin') then
      raise exception 'This login cannot submit a letter';
    end if;
    if new.letter_no = '' or new.sub_date is null then
      raise exception 'Enter the letter number and submit date';
    end if;
    if new.kind = 'vendor' and new.vendor = '' then
      raise exception 'Enter the vendor name';
    end if;
    new.approved_qty := null;
    new.appr_date := null;
    new.action_date := null;
    new.memo_no := '';
    new.remarks := '';
    new.action_by := '';
    return new;
  end if;

  if role not in ('Region', 'WBSEDCL', 'Admin') then
    raise exception 'This login cannot decide this letter';
  end if;
  if tg_op = 'INSERT' or old.status not in ('Submitted', 'Hold', 'Rejected') then
    raise exception 'Select a submitted item';
  end if;
  if new.status not in ('Approved', 'Hold', 'Rejected') then
    raise exception 'Choose approve, hold, or reject';
  end if;
  if new.memo_no = '' or new.action_date is null or new.remarks = '' then
    raise exception 'Enter the memo number, date, and remarks';
  end if;
  if new.status = 'Approved' then
    new.approved_qty := item.loa_qty;
    new.appr_date := new.action_date;
  else
    new.approved_qty := null;
    new.appr_date := null;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_approvals on public.approvals;
create trigger guard_approvals
  before insert or update on public.approvals
  for each row execute function public.guard_approval();

create or replace function public.guard_offer()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  role text := public.my_role();
  item record;
  vendor_qty numeric;
  gtp_qty numeric;
  approved numeric;
  used numeric;
begin
  if tg_op = 'INSERT' then
    if role not in ('Vendor', 'Turnkey', 'Region', 'WBSEDCL', 'Admin') then
      raise exception 'This login cannot offer inspection';
    end if;
    perform pg_advisory_xact_lock(new.item_sl);
    select * into item from public.items where sl_no = new.item_sl;
    if not found or item.part not like '%Material%' then
      raise exception 'Select a material item';
    end if;
    if new.class is distinct from public.item_office(item.supply_class, item.category) then
      raise exception 'The office on this offer does not match the item';
    end if;
    if new.status is distinct from 'Offered' then
      raise exception 'A new offer starts as offered';
    end if;
    select max(coalesce(approved_qty, item.loa_qty)) into vendor_qty from public.approvals
      where item_sl = new.item_sl and kind = 'vendor' and status = 'Approved';
    select max(coalesce(approved_qty, item.loa_qty)) into gtp_qty from public.approvals
      where item_sl = new.item_sl and kind = 'gtp' and status = 'Approved';
    if vendor_qty is null and gtp_qty is null then
      raise exception 'Approve the vendor or the GTP before offering inspection';
    end if;
    approved := coalesce(least(vendor_qty, gtp_qty), vendor_qty, gtp_qty);
    select coalesce(sum(qty), 0) into used from public.offers
      where item_sl = new.item_sl and status <> 'Rejected';
    if used + new.qty > approved then
      raise exception 'Only %s is left within the approved quantity',
        trim(to_char(greatest(approved - used, 0), 'FM999999990.###'));
    end if;
    return new;
  end if;

  if role not in ('Region', 'WBSEDCL', 'Admin') then
    raise exception 'This login cannot decide an offer';
  end if;
  if old.status is distinct from 'Offered' then
    raise exception 'Select an offer that is still open';
  end if;
  if new.item_sl is distinct from old.item_sl
     or new.offer_no is distinct from old.offer_no
     or new.offer_date is distinct from old.offer_date
     or new.qty is distinct from old.qty
     or new.manufacturer is distinct from old.manufacturer
     or new.premises is distinct from old.premises
     or new.remarks is distinct from old.remarks
     or new.class is distinct from old.class
     or new.by_name is distinct from old.by_name
  then
    raise exception 'Offer details stay as submitted';
  end if;
  if new.class = 'Central' and new.status is distinct from 'Forwarded' then
    raise exception 'Forward this offer to HQ/ZM';
  end if;
  if new.class = 'Local' and new.status not in ('Cleared', 'Rejected') then
    raise exception 'Clear or reject this offer';
  end if;
  if new.memo_no = '' or new.action_date is null or new.action_remarks = '' then
    raise exception 'Enter the memo number, date, and remarks';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_offers on public.offers;
create trigger guard_offers
  before insert or update on public.offers
  for each row execute function public.guard_offer();

create or replace function public.guard_di()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  role text := public.my_role();
  offer record;
  used numeric;
begin
  if tg_op <> 'INSERT' then
    raise exception 'A DI is not edited after it is issued';
  end if;
  if role not in ('Region', 'WBSEDCL', 'Admin') then
    raise exception 'This login cannot issue a DI';
  end if;
  perform pg_advisory_xact_lock(new.item_sl);
  select * into offer from public.offers where id = new.offer_id;
  if not found or offer.item_sl is distinct from new.item_sl then
    raise exception 'Select an offer that is cleared or forwarded';
  end if;
  if offer.class = 'Local' and offer.status is distinct from 'Cleared' then
    raise exception 'Clear the offer before issuing a DI';
  end if;
  if offer.class = 'Central' and offer.status is distinct from 'Forwarded' then
    raise exception 'Forward the offer before recording a DI';
  end if;
  select coalesce(sum(qty), 0) into used from public.di where offer_id = new.offer_id;
  if used + new.qty > offer.qty then
    raise exception 'Only %s is left on this offer',
      trim(to_char(greatest(offer.qty - used, 0), 'FM999999990.###'));
  end if;
  return new;
end;
$$;

drop trigger if exists guard_di on public.di;
create trigger guard_di
  before insert or update on public.di
  for each row execute function public.guard_di();

create or replace function public.guard_receipt()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  role text := public.my_role();
  item record;
  cleared numeric;
  already numeric;
begin
  if tg_op <> 'INSERT' then
    raise exception 'A receipt is not edited after it is saved';
  end if;
  if role not in ('Store', 'Admin') then
    raise exception 'This login cannot record a receipt';
  end if;
  perform pg_advisory_xact_lock(new.item_sl);
  select * into item from public.items where sl_no = new.item_sl;
  if not found or item.part not like '%Material%' then
    raise exception 'Select a material item';
  end if;
  select coalesce(sum(qty), 0) into cleared from public.di where item_sl = new.item_sl;
  if cleared <= 0 then
    raise exception 'No DI is issued for this item';
  end if;
  select coalesce(sum(qty), 0) into already from public.receipts where item_sl = new.item_sl;
  if already + new.qty > cleared then
    raise exception 'Only %s is left on the DI',
      trim(to_char(greatest(cleared - already, 0), 'FM999999990.###'));
  end if;
  return new;
end;
$$;

drop trigger if exists guard_receipts on public.receipts;
create trigger guard_receipts
  before insert or update on public.receipts
  for each row execute function public.guard_receipt();

create or replace function public.guard_invoice()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;
  if public.my_role() not in ('Region', 'WBSEDCL', 'Admin') then
    raise exception 'This login cannot mark an invoice paid';
  end if;
  if old.pay_status = 'Paid' then
    raise exception 'This invoice is already paid';
  end if;
  if new.pay_status is distinct from 'Paid' then
    raise exception 'Mark the invoice paid';
  end if;
  if new.invoice_no is distinct from old.invoice_no
     or new.invoice_date is distinct from old.invoice_date
     or new.bill_type is distinct from old.bill_type
     or new.by_name is distinct from old.by_name
     or new.id is distinct from old.id
  then
    raise exception 'Invoice details stay as claimed';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_invoices on public.invoices;
create trigger guard_invoices
  before update on public.invoices
  for each row execute function public.guard_invoice();

create or replace function public.save_invoice(header jsonb, lines jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  role text := public.my_role();
  line jsonb;
  item record;
  cap numeric;
  already numeric;
  qty numeric;
  gross numeric;
  gst numeric;
  sd numeric;
begin
  if role not in ('Vendor', 'Turnkey', 'Admin') then
    raise exception 'This login cannot raise an invoice';
  end if;
  if header->>'bill_type' not in ('Supply', 'Erection') then
    raise exception 'Choose Supply or Erection';
  end if;
  if nullif(trim(header->>'invoice_no'), '') is null or nullif(header->>'invoice_date', '') is null then
    raise exception 'Enter the invoice number and date';
  end if;
  if lines is null or jsonb_typeof(lines) <> 'array' or jsonb_array_length(lines) < 1 then
    raise exception 'Add at least one item';
  end if;
  if (select count(*) from jsonb_array_elements(lines))
     is distinct from (select count(distinct value->>'item_sl') from jsonb_array_elements(lines)) then
    raise exception 'Each item belongs on the invoice once';
  end if;

  insert into public.invoices (id, invoice_no, invoice_date, bill_type, pay_status, by_name)
  values (
    header->>'id',
    trim(header->>'invoice_no'),
    (header->>'invoice_date')::date,
    header->>'bill_type',
    'Claimed',
    coalesce(header->>'by_name', '')
  );

  for line in select value from jsonb_array_elements(lines)
  loop
    qty := (line->>'qty')::numeric;
    if qty is null or qty <= 0 then
      raise exception 'Enter a quantity for each item';
    end if;
    select * into item from public.items where sl_no = (line->>'item_sl')::integer;
    if not found then
      raise exception 'Select an item';
    end if;
    if header->>'bill_type' = 'Supply' and item.part not like '%Material%' then
      raise exception 'A supply invoice uses material items';
    end if;
    if header->>'bill_type' = 'Erection' and item.part like '%Material%' then
      raise exception 'An erection invoice uses erection items';
    end if;
    perform pg_advisory_xact_lock(item.sl_no);
    cap := case when item.survey_qty is not null then item.survey_qty else item.loa_qty * 0.5 end;
    select coalesce(sum(l.qty), 0) into already
    from public.invoice_lines l
    where l.item_sl = item.sl_no;
    if already + qty > cap + 0.0001 then
      raise exception 'Only %s %s is left on Sl %s',
        trim(to_char(greatest(cap - already, 0), 'FM999999990.###')),
        item.unit,
        item.sl_no;
    end if;
    gross := qty * item.rate;
    gst := gross * 0.18;
    sd := gross * 0.03;
    insert into public.invoice_lines (id, invoice_id, item_sl, qty, gross, gst, sd, net)
    values (
      line->>'id',
      header->>'id',
      item.sl_no,
      qty,
      gross,
      gst,
      sd,
      gross + gst - sd
    );
  end loop;
end;
$$;

revoke all on function public.save_invoice(jsonb, jsonb) from public;
grant execute on function public.save_invoice(jsonb, jsonb) to authenticated;

create or replace function public.guard_log()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  role text := public.my_role();
  item record;
  done numeric;
begin
  if tg_op = 'UPDATE' then
    if role not in ('Region', 'WBSEDCL', 'Admin') then
      raise exception 'This login cannot verify a daily entry';
    end if;
    if old.approval_status = 'Approved' then
      raise exception 'This entry is already verified';
    end if;
    if new.approval_status is distinct from 'Approved' then
      raise exception 'Verify the daily entry';
    end if;
    if new.inspector = '' then
      raise exception 'Enter your name before verifying';
    end if;
    if new.item_sl is distinct from old.item_sl
       or new.log_date is distinct from old.log_date
       or new.feeder is distinct from old.feeder
       or new.location is distinct from old.location
       or new.qty is distinct from old.qty
       or new.remarks is distinct from old.remarks
       or new.site_engineer is distinct from old.site_engineer
    then
      raise exception 'The daily quantity stays as entered';
    end if;
    return new;
  end if;

  if role not in ('Vendor', 'Turnkey', 'Admin') then
    raise exception 'This login cannot enter daily progress';
  end if;
  perform pg_advisory_xact_lock(new.item_sl);
  select * into item from public.items where sl_no = new.item_sl;
  if not found then
    raise exception 'Select an item';
  end if;
  if new.approval_status is distinct from 'Pending' then
    raise exception 'A new daily entry starts as pending';
  end if;
  select coalesce(sum(qty), 0) into done from public.logs where item_sl = new.item_sl;
  if done + new.qty > coalesce(item.survey_qty, item.loa_qty) then
    raise exception 'Only %s is left on this item',
      trim(to_char(greatest(coalesce(item.survey_qty, item.loa_qty) - done, 0), 'FM999999990.###'));
  end if;
  return new;
end;
$$;

drop trigger if exists guard_logs on public.logs;
create trigger guard_logs
  before insert or update on public.logs
  for each row execute function public.guard_log();

create or replace function public.reset_loa(rows jsonb)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if public.my_role() is distinct from 'Admin' then
    raise exception 'Only Admin can reset';
  end if;
  delete from public.logs;
  delete from public.invoice_lines;
  delete from public.invoices;
  delete from public.receipts;
  delete from public.di;
  delete from public.offers;
  delete from public.approvals;
  delete from public.items;
  insert into public.items (sl_no, part, category, description, unit, loa_qty, survey_qty, revised_qty, rate, supply_class)
  select sl_no, part, category, description, unit, loa_qty, null, revised_qty, rate, null
  from jsonb_to_recordset(rows) as x(
    sl_no integer,
    part text,
    category text,
    description text,
    unit text,
    loa_qty numeric,
    revised_qty numeric,
    rate numeric
  );
end;
$$;

revoke all on function public.reset_loa(jsonb) from public;
grant execute on function public.reset_loa(jsonb) to authenticated;

alter table public.profiles enable row level security;
alter table public.items enable row level security;
alter table public.approvals enable row level security;
alter table public.offers enable row level security;
alter table public.di enable row level security;
alter table public.receipts enable row level security;
alter table public.invoices enable row level security;
alter table public.invoice_lines enable row level security;
alter table public.logs enable row level security;

drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select to authenticated
  using (id = auth.uid() or public.my_role() = 'Admin');

drop policy if exists profiles_update on public.profiles;
create policy profiles_update on public.profiles
  for update to authenticated
  using (public.my_role() = 'Admin')
  with check (public.my_role() = 'Admin');

drop policy if exists items_select on public.items;
create policy items_select on public.items for select to authenticated using (public.my_role() is not null);
drop policy if exists items_insert on public.items;
create policy items_insert on public.items for insert to authenticated with check (public.my_role() = 'Admin');
drop policy if exists items_update on public.items;
create policy items_update on public.items for update to authenticated
  using (public.my_role() in ('Admin', 'Region', 'WBSEDCL'))
  with check (public.my_role() in ('Admin', 'Region', 'WBSEDCL'));
drop policy if exists items_delete on public.items;
create policy items_delete on public.items for delete to authenticated using (public.my_role() = 'Admin');

drop policy if exists approvals_select on public.approvals;
create policy approvals_select on public.approvals for select to authenticated using (public.my_role() is not null);
drop policy if exists approvals_insert on public.approvals;
create policy approvals_insert on public.approvals for insert to authenticated with check (public.my_role() in ('Vendor', 'Turnkey', 'Admin'));
drop policy if exists approvals_update on public.approvals;
create policy approvals_update on public.approvals for update to authenticated
  using (public.my_role() in ('Vendor', 'Turnkey', 'Region', 'WBSEDCL', 'Admin'))
  with check (public.my_role() in ('Vendor', 'Turnkey', 'Region', 'WBSEDCL', 'Admin'));
drop policy if exists approvals_delete on public.approvals;
create policy approvals_delete on public.approvals for delete to authenticated using (public.my_role() = 'Admin');

drop policy if exists offers_select on public.offers;
create policy offers_select on public.offers for select to authenticated using (public.my_role() is not null);
drop policy if exists offers_insert on public.offers;
create policy offers_insert on public.offers for insert to authenticated with check (public.my_role() in ('Vendor', 'Turnkey', 'Region', 'WBSEDCL', 'Admin'));
drop policy if exists offers_update on public.offers;
create policy offers_update on public.offers for update to authenticated
  using (public.my_role() in ('Region', 'WBSEDCL', 'Admin'))
  with check (public.my_role() in ('Region', 'WBSEDCL', 'Admin'));
drop policy if exists offers_delete on public.offers;
create policy offers_delete on public.offers for delete to authenticated using (public.my_role() = 'Admin');

drop policy if exists di_select on public.di;
create policy di_select on public.di for select to authenticated using (public.my_role() is not null);
drop policy if exists di_insert on public.di;
create policy di_insert on public.di for insert to authenticated with check (public.my_role() in ('Region', 'WBSEDCL', 'Admin'));
drop policy if exists di_delete on public.di;
create policy di_delete on public.di for delete to authenticated using (public.my_role() = 'Admin');

drop policy if exists receipts_select on public.receipts;
create policy receipts_select on public.receipts for select to authenticated using (public.my_role() is not null);
drop policy if exists receipts_insert on public.receipts;
create policy receipts_insert on public.receipts for insert to authenticated with check (public.my_role() in ('Store', 'Admin'));
drop policy if exists receipts_delete on public.receipts;
create policy receipts_delete on public.receipts for delete to authenticated using (public.my_role() = 'Admin');

drop policy if exists invoices_select on public.invoices;
create policy invoices_select on public.invoices for select to authenticated using (public.my_role() is not null);
drop policy if exists invoices_update on public.invoices;
create policy invoices_update on public.invoices for update to authenticated
  using (public.my_role() in ('Region', 'WBSEDCL', 'Admin'))
  with check (public.my_role() in ('Region', 'WBSEDCL', 'Admin'));
drop policy if exists invoices_delete on public.invoices;
create policy invoices_delete on public.invoices for delete to authenticated using (public.my_role() = 'Admin');

drop policy if exists invoice_lines_select on public.invoice_lines;
create policy invoice_lines_select on public.invoice_lines for select to authenticated using (public.my_role() is not null);
drop policy if exists invoice_lines_delete on public.invoice_lines;
create policy invoice_lines_delete on public.invoice_lines for delete to authenticated using (public.my_role() = 'Admin');

drop policy if exists logs_select on public.logs;
create policy logs_select on public.logs for select to authenticated using (public.my_role() is not null);
drop policy if exists logs_insert on public.logs;
create policy logs_insert on public.logs for insert to authenticated with check (public.my_role() in ('Vendor', 'Turnkey', 'Admin'));
drop policy if exists logs_update on public.logs;
create policy logs_update on public.logs for update to authenticated
  using (public.my_role() in ('Region', 'WBSEDCL', 'Admin'))
  with check (public.my_role() in ('Region', 'WBSEDCL', 'Admin'));
drop policy if exists logs_delete on public.logs;
create policy logs_delete on public.logs for delete to authenticated using (public.my_role() = 'Admin');

grant select, update on public.profiles to authenticated;
grant select, insert, update, delete on public.items to authenticated;
grant select, insert, update, delete on public.approvals to authenticated;
grant select, insert, update, delete on public.offers to authenticated;
grant select, insert, delete on public.di to authenticated;
grant select, insert, delete on public.receipts to authenticated;
grant select, update, delete on public.invoices to authenticated;
grant select, delete on public.invoice_lines to authenticated;
grant select, insert, update, delete on public.logs to authenticated;

revoke all on public.profiles from anon;
revoke all on public.items from anon;
revoke all on public.approvals from anon;
revoke all on public.offers from anon;
revoke all on public.di from anon;
revoke all on public.receipts from anon;
revoke all on public.invoices from anon;
revoke all on public.invoice_lines from anon;
revoke all on public.logs from anon;

create table if not exists public.versions (
  name text primary key,
  version bigint not null default 0
);

insert into public.versions (name) values
  ('items'),
  ('approvals'),
  ('offers'),
  ('di'),
  ('receipts'),
  ('invoices'),
  ('invoice_lines'),
  ('logs'),
  ('profiles')
on conflict (name) do nothing;

create or replace function public.bump_version()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.versions (name, version)
  values (tg_table_name, 1)
  on conflict (name) do update
  set version = public.versions.version + 1;
  return null;
end;
$$;

revoke all on function public.bump_version() from public;
grant execute on function public.bump_version() to authenticated;

do $$
declare
  name text;
begin
  foreach name in array array['items', 'approvals', 'offers', 'di', 'receipts', 'invoices', 'invoice_lines', 'logs', 'profiles']
  loop
    execute format('drop trigger if exists bump_version on public.%I', name);
    execute format(
      'create trigger bump_version after insert or update or delete on public.%I for each row execute function public.bump_version()',
      name
    );
  end loop;
end $$;

alter table public.versions enable row level security;
drop policy if exists versions_select on public.versions;
create policy versions_select on public.versions
  for select to authenticated
  using (public.my_role() is not null);

grant select on public.versions to authenticated;
revoke all on public.versions from anon;

do $$
begin
  if to_regclass('public.bills') is not null
     and exists (
       select 1 from information_schema.columns
       where table_schema = 'public' and table_name = 'bills' and column_name = 'item_sl'
     ) then
    insert into public.invoices (id, invoice_no, invoice_date, bill_type, pay_status, by_name, created_at)
    select id, bill_no, bill_date, bill_type, pay_status, by_name, created_at
    from public.bills
    on conflict (id) do nothing;
    insert into public.invoice_lines (id, invoice_id, item_sl, qty, gross, gst, sd, net)
    select id || '-line', id, item_sl, qty, gross, gst, sd, net
    from public.bills
    on conflict (id) do nothing;
    drop table public.bills cascade;
  end if;
end $$;

do $$
declare
  name text;
begin
  foreach name in array array['items', 'approvals', 'offers', 'di', 'receipts', 'invoices', 'invoice_lines', 'logs', 'profiles']
  loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', name);
    exception
      when duplicate_object then null;
    end;
  end loop;
end $$;

create extension if not exists pgcrypto with schema extensions;

create or replace function public.admin_set_user_pin(target_user_id uuid, new_pin text)
returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  caller_role text;
begin
  select role into caller_role from public.profiles where id = auth.uid();
  if caller_role is distinct from 'Admin' then
    raise exception 'Only Admin can set or reset user PIN';
  end if;

  if length(trim(new_pin)) < 4 then
    raise exception 'PIN or Password must be at least 4 characters long';
  end if;

  update auth.users
  set encrypted_password = extensions.crypt(trim(new_pin), extensions.gen_salt('bf'))
  where id = target_user_id;
end;
$$;

grant execute on function public.admin_set_user_pin(uuid, text) to authenticated;

create or replace function public.admin_create_user(
  p_name text,
  p_user_id text,
  p_pin text,
  p_role text default 'Vendor'
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  caller_role text;
  v_user_id uuid;
  v_email text;
  v_encrypted_pw text;
begin
  select role into caller_role from public.profiles where id = auth.uid();
  if caller_role is distinct from 'Admin' then
    raise exception 'Only Admin can create user accounts';
  end if;

  if trim(p_name) = '' or trim(p_user_id) = '' or length(trim(p_pin)) < 4 then
    raise exception 'Invalid input. Provide Name, User ID, and PIN (min 4 chars).';
  end if;

  if position('@' in p_user_id) > 0 then
    v_email := lower(trim(p_user_id));
  else
    v_email := lower(trim(p_user_id)) || '@malda-ug.gov.in';
  end if;

  if exists (select 1 from auth.users where lower(email) = v_email) then
    raise exception 'A user with User ID or Email % already exists', v_email;
  end if;

  v_user_id := gen_random_uuid();
  v_encrypted_pw := extensions.crypt(trim(p_pin), extensions.gen_salt('bf'));

  insert into auth.users (
    id,
    instance_id,
    email,
    encrypted_password,
    email_confirmed_at,
    raw_app_meta_data,
    raw_user_meta_data,
    created_at,
    updated_at,
    aud,
    role,
    confirmation_token,
    recovery_token,
    email_change,
    email_change_token_new,
    email_change_token_current,
    phone_change,
    phone_change_token,
    reauthentication_token,
    email_change_confirm_status,
    is_sso_user,
    is_anonymous
  ) values (
    v_user_id,
    '00000000-0000-0000-0000-000000000000'::uuid,
    v_email,
    v_encrypted_pw,
    now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('name', trim(p_name)),
    now(),
    now(),
    'authenticated',
    'authenticated',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    '',
    0,
    false,
    false
  );

  insert into auth.identities (
    id,
    user_id,
    identity_data,
    provider,
    provider_id,
    last_sign_in_at,
    created_at,
    updated_at
  ) values (
    v_user_id,
    v_user_id,
    jsonb_build_object('sub', v_user_id::text, 'email', v_email, 'email_verified', true, 'phone_verified', false),
    'email',
    v_user_id::text,
    now(),
    now(),
    now()
  );

  insert into public.profiles (
    id,
    name,
    email,
    role,
    active,
    region_id,
    vendor_id
  ) values (
    v_user_id,
    trim(p_name),
    v_email,
    trim(p_role),
    true,
    'REG-MALDA',
    case when trim(p_role) in ('Vendor', 'Turnkey') then 'VEND-512589' else 'VEND-NONE' end
  ) on conflict (id) do update set
    name = excluded.name,
    email = excluded.email,
    role = excluded.role,
    active = true;

  return jsonb_build_object('id', v_user_id, 'email', v_email, 'name', p_name, 'role', p_role);
end;
$$;

grant execute on function public.admin_create_user(text, text, text, text) to authenticated;

-- Immediate repair script for existing users (like user DD) created via direct SQL
update auth.users
set
  confirmation_token = coalesce(confirmation_token, ''),
  recovery_token = coalesce(recovery_token, ''),
  email_change = coalesce(email_change, ''),
  email_change_token_new = coalesce(email_change_token_new, ''),
  email_change_token_current = coalesce(email_change_token_current, ''),
  phone_change = coalesce(phone_change, ''),
  phone_change_token = coalesce(phone_change_token, ''),
  reauthentication_token = coalesce(reauthentication_token, ''),
  email_change_confirm_status = coalesce(email_change_confirm_status, 0),
  is_sso_user = coalesce(is_sso_user, false),
  is_anonymous = coalesce(is_anonymous, false)
where confirmation_token is null
   or recovery_token is null
   or email_change is null
   or email_change_token_new is null
   or is_sso_user is null
   or is_anonymous is null;



