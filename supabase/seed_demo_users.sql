-- Repair the four demo logins.
-- Run once in the Supabase SQL editor.
-- Sign-in fails with "Database error querying schema" when Auth token
-- fields were left null. GoTrue cannot read those rows.

create extension if not exists pgcrypto with schema extensions;

do $$
declare
  col text;
  text_cols text[] := array[
    'confirmation_token',
    'recovery_token',
    'email_change_token_new',
    'email_change',
    'email_change_token_current',
    'phone_change',
    'phone_change_token',
    'reauthentication_token'
  ];
  bool_cols text[] := array['is_sso_user', 'is_anonymous'];
begin
  foreach col in array text_cols loop
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'auth' and table_name = 'users' and column_name = col
    ) then
      execute format(
        'update auth.users set %1$I = coalesce(%1$I, '''') where email like ''%%@malda-ug.gov.in'' and %1$I is null',
        col
      );
    end if;
  end loop;

  foreach col in array bool_cols loop
    if exists (
      select 1 from information_schema.columns
      where table_schema = 'auth' and table_name = 'users' and column_name = col
    ) then
      execute format(
        'update auth.users set %1$I = coalesce(%1$I, false) where email like ''%%@malda-ug.gov.in'' and %1$I is null',
        col
      );
    end if;
  end loop;

  if exists (
    select 1 from information_schema.columns
    where table_schema = 'auth' and table_name = 'users' and column_name = 'email_change_confirm_status'
  ) then
    update auth.users
    set email_change_confirm_status = coalesce(email_change_confirm_status, 0)
    where email like '%@malda-ug.gov.in' and email_change_confirm_status is null;
  end if;
end $$;

update auth.users
set
  aud = coalesce(aud, 'authenticated'),
  role = coalesce(role, 'authenticated'),
  email_confirmed_at = coalesce(email_confirmed_at, now()),
  raw_app_meta_data = coalesce(raw_app_meta_data, '{"provider":"email","providers":["email"]}'::jsonb),
  raw_user_meta_data = coalesce(raw_user_meta_data, '{}'::jsonb),
  encrypted_password = case email
    when 'admin@malda-ug.gov.in' then extensions.crypt('admin123', extensions.gen_salt('bf'))
    when 'wbsedcl.de@malda-ug.gov.in' then extensions.crypt('region123', extensions.gen_salt('bf'))
    when 'tarun.project@malda-ug.gov.in' then extensions.crypt('vendor123', extensions.gen_salt('bf'))
    when 'store.keeper@malda-ug.gov.in' then extensions.crypt('store123', extensions.gen_salt('bf'))
    else encrypted_password
  end
where email in (
  'admin@malda-ug.gov.in',
  'wbsedcl.de@malda-ug.gov.in',
  'tarun.project@malda-ug.gov.in',
  'store.keeper@malda-ug.gov.in'
);

insert into auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
select
  gen_random_uuid(),
  u.id,
  jsonb_build_object('sub', u.id::text, 'email', u.email),
  'email',
  u.id::text,
  now(),
  now(),
  now()
from auth.users u
where u.email in (
  'admin@malda-ug.gov.in',
  'wbsedcl.de@malda-ug.gov.in',
  'tarun.project@malda-ug.gov.in',
  'store.keeper@malda-ug.gov.in'
)
and not exists (
  select 1 from auth.identities i where i.user_id = u.id and i.provider = 'email'
);

-- Placeholder profiles used ids that are not Auth users. Remove those only.
delete from public.profiles
where id in (
  '00000000-0000-0000-0000-000000000001'::uuid,
  '00000000-0000-0000-0000-000000000002'::uuid,
  '00000000-0000-0000-0000-000000000003'::uuid,
  '00000000-0000-0000-0000-000000000004'::uuid
)
and not exists (select 1 from auth.users u where u.id = profiles.id);

insert into public.profiles (id, name, email, role, region_id, vendor_id, active)
select
  u.id,
  case u.email
    when 'admin@malda-ug.gov.in' then 'System Admin'
    when 'wbsedcl.de@malda-ug.gov.in' then 'Divisional Engineer (WBSEDCL)'
    when 'tarun.project@malda-ug.gov.in' then 'M/s Tarun Enterprise'
    else 'Malda Store Keeper'
  end,
  u.email,
  case u.email
    when 'admin@malda-ug.gov.in' then 'Admin'
    when 'wbsedcl.de@malda-ug.gov.in' then 'Region'
    when 'tarun.project@malda-ug.gov.in' then 'Vendor'
    else 'Store'
  end,
  'REG-MALDA',
  case u.email
    when 'tarun.project@malda-ug.gov.in' then 'VEND-512589'
    when 'admin@malda-ug.gov.in' then 'VEND-ALL'
    else 'VEND-NONE'
  end,
  true
from auth.users u
where u.email in (
  'admin@malda-ug.gov.in',
  'wbsedcl.de@malda-ug.gov.in',
  'tarun.project@malda-ug.gov.in',
  'store.keeper@malda-ug.gov.in'
)
on conflict (id) do update set
  name = excluded.name,
  email = excluded.email,
  role = excluded.role,
  region_id = excluded.region_id,
  vendor_id = excluded.vendor_id,
  active = true;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_id_fkey')
     and not exists (
       select 1 from public.profiles p
       left join auth.users u on u.id = p.id
       where u.id is null
     ) then
    alter table public.profiles
      add constraint profiles_id_fkey
      foreign key (id) references auth.users (id) on delete cascade;
  end if;
end $$;
