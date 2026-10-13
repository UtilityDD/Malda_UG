-- ==============================================================================
-- MALDA UG PROJECT: Feeder-wise Survey Summary & Divisional User Migration
-- Safe & idempotent script: Run in Supabase Dashboard -> SQL Editor -> Run
-- ==============================================================================

-- 1. Ensure public.project_contract table exists
CREATE TABLE IF NOT EXISTS public.project_contract (
  id TEXT PRIMARY KEY DEFAULT 'MALDA-UG-MAIN',
  loa_no TEXT NOT NULL DEFAULT 'WBSEDCL/RE/Malda/UG/2023-24/01',
  loa_date DATE DEFAULT '2024-01-16',
  acceptance_date DATE,
  acceptance_ref TEXT NOT NULL DEFAULT '',
  schedule_sub_date DATE,
  schedule_sub_ref TEXT NOT NULL DEFAULT '',
  schedule_sub_remarks TEXT NOT NULL DEFAULT '',
  schedule_appr_date DATE,
  schedule_appr_ref TEXT NOT NULL DEFAULT '',
  schedule_appr_status TEXT NOT NULL DEFAULT 'Pending',
  schedule_appr_remarks TEXT NOT NULL DEFAULT '',
  target_completion_date DATE DEFAULT '2025-07-15',
  bg_entries JSONB NOT NULL DEFAULT '[]'::jsonb,
  eot_entries JSONB NOT NULL DEFAULT '[]'::jsonb,
  feeder_surveys JSONB NOT NULL DEFAULT '[]'::jsonb,
  remarks TEXT NOT NULL DEFAULT '',
  updated_by TEXT NOT NULL DEFAULT '',
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. Ensure feeder_surveys column exists for existing tables
ALTER TABLE public.project_contract 
  ADD COLUMN IF NOT EXISTS feeder_surveys JSONB NOT NULL DEFAULT '[]'::jsonb;

-- 3. Seed / Ensure singleton row exists with empty feeder_surveys array
INSERT INTO public.project_contract (id, loa_no, loa_date, target_completion_date, feeder_surveys)
VALUES ('MALDA-UG-MAIN', 'WBSEDCL/RE/Malda/UG/2023-24/01', '2024-01-16', '2025-07-15', '[]'::jsonb)
ON CONFLICT (id) DO UPDATE 
  SET feeder_surveys = COALESCE(public.project_contract.feeder_surveys, '[]'::jsonb);

-- 4. Allow 'Division' role in public.profiles table
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
  CHECK (role IN ('Vendor', 'Region', 'Turnkey', 'WBSEDCL', 'Store', 'Viewer', 'Admin', 'Division'));

-- 5. Update public.my_role() helper to recognize 'Division' and 'WBSEDCL' with Region-level authority
CREATE OR REPLACE FUNCTION public.my_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT CASE
    WHEN p.role = 'Turnkey' THEN 'Vendor'
    WHEN p.role IN ('WBSEDCL', 'Division') THEN 'Region'
    ELSE p.role
  END
  FROM public.profiles p
  WHERE p.id = auth.uid() AND coalesce(p.active, true);
$$;

-- 6. Configure Row Level Security (RLS) for project_contract
ALTER TABLE public.project_contract ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS project_contract_select ON public.project_contract;
CREATE POLICY project_contract_select ON public.project_contract 
  FOR SELECT TO authenticated 
  USING (public.my_role() IS NOT NULL);

DROP POLICY IF EXISTS project_contract_insert ON public.project_contract;
CREATE POLICY project_contract_insert ON public.project_contract 
  FOR INSERT TO authenticated 
  WITH CHECK (public.my_role() IN ('Region', 'Admin'));

DROP POLICY IF EXISTS project_contract_update ON public.project_contract;
CREATE POLICY project_contract_update ON public.project_contract 
  FOR UPDATE TO authenticated
  USING (public.my_role() IN ('Region', 'Admin'))
  WITH CHECK (public.my_role() IN ('Region', 'Admin'));

DROP POLICY IF EXISTS project_contract_delete ON public.project_contract;
CREATE POLICY project_contract_delete ON public.project_contract 
  FOR DELETE TO authenticated 
  USING (public.my_role() = 'Admin');

-- 7. Grant table access to authenticated users
GRANT SELECT, INSERT, UPDATE ON public.project_contract TO authenticated;
REVOKE ALL ON public.project_contract FROM anon;

-- Verification query: check that the table and feeder_surveys column are ready
SELECT id, loa_no, jsonb_array_length(feeder_surveys) as feeder_count, updated_at 
FROM public.project_contract 
WHERE id = 'MALDA-UG-MAIN';
