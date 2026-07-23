-- Migration: Enable Row Level Security (RLS) on subscriptions table
-- Description: Restricts authenticated users to only read their own subscription rows
-- Created: 2026-07-23

-- 1) Ensure RLS is enabled
ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;

-- 2) Allow authenticated users to read only their own subscription row
DROP POLICY IF EXISTS "subscriptions_select_own" ON public.subscriptions;

CREATE POLICY "subscriptions_select_own"
ON public.subscriptions
FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- 3) Ensure authenticated users cannot write directly (optional but recommended)
DROP POLICY IF EXISTS "subscriptions_write_own" ON public.subscriptions;

-- (No write policies created on purpose.)

-- 4) Grants for Data API / PostgREST access
-- authenticated can select (RLS will still restrict rows)
GRANT SELECT ON public.subscriptions TO authenticated;

-- service_role bypasses RLS but still needs table privileges
GRANT ALL ON public.subscriptions TO service_role;

-- If you want anon to never read anything:
REVOKE ALL ON public.subscriptions FROM anon;
