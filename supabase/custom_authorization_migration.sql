-- ==============================================================================
-- MALDA UG PROJECT: Custom Granular User Authorizations Migration
-- Safe & idempotent script: Run in Supabase Dashboard -> SQL Editor -> Run
-- ==============================================================================

-- 1. Add permissions JSONB column to public.profiles table
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS permissions JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 2. Populate existing users with their role's default authorizations if currently empty
UPDATE public.profiles
SET permissions = CASE
  WHEN role = 'Admin' THEN '{
    "survey_entry": true, "boq_edit": true, "gtp_submit": true, "gtp_approve": true,
    "di_offer": true, "di_issue": true, "receive_record": true, "billing_submit": true,
    "billing_pay": true, "daily_log": true, "daily_verify": true, "users_manage": true
  }'::jsonb
  WHEN role IN ('Division', 'Divisional') THEN '{
    "survey_entry": true, "boq_edit": false, "gtp_submit": false, "gtp_approve": true,
    "di_offer": false, "di_issue": true, "receive_record": false, "billing_submit": false,
    "billing_pay": false, "daily_log": true, "daily_verify": true, "users_manage": false
  }'::jsonb
  WHEN role IN ('Region', 'WBSEDCL') THEN '{
    "survey_entry": true, "boq_edit": true, "gtp_submit": false, "gtp_approve": true,
    "di_offer": false, "di_issue": true, "receive_record": false, "billing_submit": false,
    "billing_pay": true, "daily_log": false, "daily_verify": true, "users_manage": false
  }'::jsonb
  WHEN role IN ('Vendor', 'Turnkey') THEN '{
    "survey_entry": false, "boq_edit": false, "gtp_submit": true, "gtp_approve": false,
    "di_offer": true, "di_issue": false, "receive_record": false, "billing_submit": true,
    "billing_pay": false, "daily_log": true, "daily_verify": false, "users_manage": false
  }'::jsonb
  WHEN role = 'Store' THEN '{
    "survey_entry": false, "boq_edit": false, "gtp_submit": false, "gtp_approve": false,
    "di_offer": false, "di_issue": false, "receive_record": true, "billing_submit": false,
    "billing_pay": false, "daily_log": false, "daily_verify": false, "users_manage": false
  }'::jsonb
  ELSE '{
    "survey_entry": false, "boq_edit": false, "gtp_submit": false, "gtp_approve": false,
    "di_offer": false, "di_issue": false, "receive_record": false, "billing_submit": false,
    "billing_pay": false, "daily_log": false, "daily_verify": false, "users_manage": false
  }'::jsonb
END
WHERE permissions IS NULL OR permissions = '{}'::jsonb;

-- 3. Verify permissions column
SELECT id, name, email, role, permissions 
FROM public.profiles 
ORDER BY name 
LIMIT 10;
