-- ============================================
-- LOCOMOTIVE — Admin Analytics Access
-- Run in Supabase SQL Editor
-- ============================================

-- Admins can read all test results (for analytics)
DROP POLICY IF EXISTS "Admins can view all test results" ON public.test_results;
CREATE POLICY "Admins can view all test results" ON public.test_results
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    );

-- Admins can read all test answers (for question difficulty analysis)
DROP POLICY IF EXISTS "Admins can view all test answers" ON public.test_answers;
CREATE POLICY "Admins can view all test answers" ON public.test_answers
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    );

-- Admins can read all topic progress (for completion metrics)
DROP POLICY IF EXISTS "Admins can view all topic progress" ON public.user_topic_progress;
CREATE POLICY "Admins can view all topic progress" ON public.user_topic_progress
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    );

-- Admins can read all profiles (for student roster)
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
    FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.profiles p2 WHERE p2.id = auth.uid() AND p2.is_admin = true)
    );
