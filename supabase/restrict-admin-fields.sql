-- ============================================
-- LOCOMOTIVE — Security: Restrict Admin Fields
-- Run this in Supabase SQL Editor
-- ============================================

-- ===== 1. Create a trigger to prevent regular users from
--           updating is_admin or admin_role on their own profile =====
--
-- Logic:
--   - If the caller IS a super_admin, allow role changes (they're managing the team).
--   - If the caller is changing their OWN row's admin columns, block it (no self-escalation).
--   - If the caller is service_role (e.g. admin panel server action), allow it.

CREATE OR REPLACE FUNCTION public.prevent_admin_self_escalation()
RETURNS TRIGGER AS $$
DECLARE
    caller_role text;
    caller_admin_role text;
BEGIN
    -- Allow service_role calls (e.g. from server-side admin actions)
    IF current_setting('role') = 'service_role' THEN
        RETURN NEW;
    END IF;

    -- If admin fields haven't changed, no concern — allow
    IF (NEW.is_admin IS NOT DISTINCT FROM OLD.is_admin) AND
       (NEW.admin_role IS NOT DISTINCT FROM OLD.admin_role) THEN
        RETURN NEW;
    END IF;

    -- Admin fields changed — check if caller is a super_admin
    SELECT admin_role INTO caller_admin_role
    FROM public.profiles
    WHERE id = auth.uid();

    IF caller_admin_role = 'super_admin' THEN
        -- Super admins can change other users' roles (but not their own via RLS)
        RETURN NEW;
    END IF;

    -- Nobody else can change admin columns
    RAISE EXCEPTION 'Permission denied: only super_admin can modify admin privileges';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_prevent_admin_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_admin_escalation
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.prevent_admin_self_escalation();

-- ===== 2. Notes =====
-- This trigger ensures:
--   a) Regular users cannot promote themselves to admin (self-escalation blocked)
--   b) Super admins CAN promote/demote other users via the admin panel
--   c) Service-role calls (e.g. seeding, migrations) are always allowed
--
-- To grant admin access from the SQL Editor (service_role context):
--   UPDATE public.profiles SET admin_role = 'super_admin' WHERE email = 'you@example.com';
