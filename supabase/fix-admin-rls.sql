-- ============================================
-- LOCOMOTIVE -- Fix Admin RLS Policies (v2 -- no recursion)
-- Run this ENTIRE block in Supabase SQL Editor
-- ============================================
-- IMPORTANT: The previous version caused infinite recursion.
-- This version uses SECURITY DEFINER helper functions to check
-- admin status without querying profiles inside a profiles policy.
-- ============================================

-- ===== STEP 1: Create non-recursive helper functions =====
-- These functions run as the table owner (SECURITY DEFINER), so they
-- bypass RLS entirely -- no recursion possible.

CREATE OR REPLACE FUNCTION public.get_my_admin_role()
RETURNS text AS $$
DECLARE
  my_role text;
BEGIN
  SELECT admin_role INTO my_role
  FROM public.profiles
  WHERE id = auth.uid();
  RETURN my_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_any_admin()
RETURNS boolean AS $$
BEGIN
  RETURN public.get_my_admin_role() IS NOT NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean AS $$
BEGIN
  RETURN public.get_my_admin_role() = 'super_admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ===== STEP 2: Drop ALL existing profiles policies and rebuild cleanly =====
-- (avoids conflicts with any leftover policies from previous migrations)
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN SELECT policyname FROM pg_policies
             WHERE schemaname = 'public' AND tablename = 'profiles'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.profiles', pol.policyname);
  END LOOP;
END $$;

-- Own row: users can always read and update their own profile
CREATE POLICY "Users can view own profile"
ON public.profiles FOR SELECT
USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
ON public.profiles FOR UPDATE
USING (auth.uid() = id);

-- Insert: needed for sign-up trigger / service role
CREATE POLICY "Service role can insert profiles"
ON public.profiles FOR INSERT
WITH CHECK (true);

-- Admins can read ALL profiles (for team list, notifications, find-by-email)
-- Uses SECURITY DEFINER function -- no recursion
CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
USING (public.is_any_admin());

-- Super admins can update OTHER users' profiles (role assignment)
-- Uses SECURITY DEFINER function -- no recursion
CREATE POLICY "Super admins can update any profile"
ON public.profiles FOR UPDATE
USING (public.is_super_admin());

-- ===== STEP 3: Fix notifications INSERT policy =====
-- Uses the same SECURITY DEFINER function -- no recursion
DROP POLICY IF EXISTS "Admins can insert notifications" ON public.notifications;
CREATE POLICY "Admins can insert notifications"
ON public.notifications FOR INSERT
WITH CHECK (public.is_any_admin());

-- ===== Done =====
-- After running this:
--   a) Regular users: can read + update only their own profile
--   b) Any role-based admin: can read ALL profiles (team list, notifications, find user)
--   c) super_admin only: can update other users' profiles (role assignment)
--   d) Any admin: can INSERT notifications for any user
--   e) No infinite recursion -- all admin checks use SECURITY DEFINER functions
