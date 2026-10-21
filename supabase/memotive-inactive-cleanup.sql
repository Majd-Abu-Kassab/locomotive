-- ============================================
-- LOCOMOTIVE — Memotive: delete cards of inactive students
-- Run this ENTIRE file in the Supabase SQL Editor (after schema-memotive.sql).
-- Safe to re-run.
-- ============================================
--
-- Every night, anyone who hasn't signed in or used the site for 3 months
-- loses all their Memotive subjects, cards and review history. This applies
-- to every account, free or paid (client decision, Oct 2026). Students are
-- told in Memotive and the FAQ, and can download a PDF backup anytime.
--
-- "Last active" is the latest of:
--   auth.users.last_sign_in_at      — every sign-in
--   profiles.session_last_seen      — heartbeat every 30s while a tab is open
--                                     (SingleSessionGuard), so a student who
--                                     never signs out still counts as active
--   auth.users.created_at           — fallback for accounts that never did either
--
-- The 3-month window is also stated in the app (INACTIVE_DELETE_MONTHS in
-- src/lib/memotive/content.ts). Change both together.

-- ===== 1. The cleanup =====
CREATE OR REPLACE FUNCTION public.memotive_delete_inactive()
RETURNS int AS $$
DECLARE
    purged int;
BEGIN
    -- Deleting a subject cascades to its cards, their schedules and reviews.
    WITH inactive AS (
        SELECT u.id
        FROM auth.users u
        LEFT JOIN public.profiles p ON p.id = u.id
        WHERE GREATEST(u.last_sign_in_at, p.session_last_seen, u.created_at) < now() - interval '3 months'
    ), gone AS (
        DELETE FROM public.memotive_decks d
        USING inactive i
        WHERE d.user_id = i.id
        RETURNING d.user_id
    )
    SELECT count(DISTINCT user_id) INTO purged FROM gone;
    RETURN purged;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Only the scheduler (and you, in the SQL Editor) may run it.
REVOKE EXECUTE ON FUNCTION public.memotive_delete_inactive() FROM PUBLIC, anon, authenticated;

-- ===== 2. Run it every night at 03:00 UTC =====
-- Supabase Cron (pg_cron). Re-running this file updates the same job.
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
    'memotive-delete-inactive',
    '0 3 * * *',
    $$SELECT public.memotive_delete_inactive()$$
);

-- ===== Handy queries (run separately; not part of the setup) =====
--
-- Preview who would lose cards tonight, and how many:
--   SELECT u.email,
--          GREATEST(u.last_sign_in_at, p.session_last_seen, u.created_at) AS last_active,
--          (SELECT count(*) FROM public.memotive_notes n WHERE n.user_id = u.id) AS cards
--   FROM auth.users u
--   LEFT JOIN public.profiles p ON p.id = u.id
--   WHERE GREATEST(u.last_sign_in_at, p.session_last_seen, u.created_at) < now() - interval '3 months'
--     AND EXISTS (SELECT 1 FROM public.memotive_decks d WHERE d.user_id = u.id);
--
-- Run the cleanup now (returns how many students were cleaned up):
--   SELECT public.memotive_delete_inactive();
--
-- See the job's recent runs:
--   SELECT status, return_message, start_time FROM cron.job_run_details
--   WHERE jobid = (SELECT jobid FROM cron.job WHERE jobname = 'memotive-delete-inactive')
--   ORDER BY start_time DESC LIMIT 10;
--
-- Turn the automatic deletion off:
--   SELECT cron.unschedule('memotive-delete-inactive');
