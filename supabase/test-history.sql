-- ============================================
-- LOCOMOTIVE — Name and review past tests
-- Run this ENTIRE file in the Supabase SQL Editor BEFORE deploying the code
-- that uses it (new tests save each answer's position). Safe to re-run, and
-- safe with the current code.
-- ============================================

-- ===== 1. Students can rename their own tests — the name only =====
-- RLS limits it to their own rows; the column grant stops anyone editing
-- scores or dates through the API.
DROP POLICY IF EXISTS "Users can rename own test results" ON public.test_results;
CREATE POLICY "Users can rename own test results" ON public.test_results FOR UPDATE
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

REVOKE UPDATE ON public.test_results FROM anon, authenticated;
GRANT UPDATE (name) ON public.test_results TO authenticated;

-- NOT VALID: applies to new and renamed tests without re-checking old rows.
ALTER TABLE public.test_results DROP CONSTRAINT IF EXISTS test_results_name_length;
ALTER TABLE public.test_results ADD CONSTRAINT test_results_name_length
    CHECK (char_length(btrim(name)) BETWEEN 1 AND 120) NOT VALID;

-- ===== 2. Keep question order, so a past test reviews in the order it was taken =====
-- Older attempts have no position; they review in a stable but arbitrary order.
ALTER TABLE public.test_answers ADD COLUMN IF NOT EXISTS position int;
