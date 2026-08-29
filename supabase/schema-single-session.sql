-- ============================================
-- LOCOMOTIVE — Single active session (one browser at a time)
-- Run this in the Supabase SQL Editor.
-- ============================================

-- Marks which browser/session is currently the "active" one for a user, plus
-- a heartbeat so we can tell whether that session is still live. Enforcement
-- is client-side (SingleSessionGuard): a browser whose local id no longer
-- matches active_session_id signs itself out.
ALTER TABLE public.profiles
    ADD COLUMN IF NOT EXISTS active_session_id TEXT,
    ADD COLUMN IF NOT EXISTS session_last_seen TIMESTAMP WITH TIME ZONE;

-- No new RLS needed: the existing "Users can update own profile" policy already
-- lets a user write these on their own row, and the admin-escalation trigger
-- only blocks is_admin / admin_role changes.
