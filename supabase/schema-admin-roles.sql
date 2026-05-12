-- ============================================
-- LOCOMOTIVE LMS - Admin Roles Migration
-- Run this in Supabase SQL Editor
-- ============================================

-- ===== 1. Add admin_role column to profiles =====
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS admin_role text
    CHECK (admin_role IS NULL OR admin_role IN ('super_admin', 'content_manager', 'finance_manager', 'analyst', 'support'));

-- ===== 2. Migrate existing admins to super_admin =====
-- Anyone with is_admin = true gets promoted to super_admin
UPDATE public.profiles
SET admin_role = 'super_admin'
WHERE is_admin = true AND admin_role IS NULL;

-- ===== 3. Trigger to keep is_admin in sync =====
-- When admin_role is set, is_admin = true; when cleared, is_admin = false
-- This ensures all existing RLS policies (which check is_admin) keep working
CREATE OR REPLACE FUNCTION sync_is_admin_from_role()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.admin_role IS NOT NULL THEN
        NEW.is_admin := true;
    ELSE
        NEW.is_admin := false;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_sync_admin_role ON public.profiles;
CREATE TRIGGER trg_sync_admin_role
    BEFORE INSERT OR UPDATE OF admin_role ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION sync_is_admin_from_role();
