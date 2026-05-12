-- ============================================
-- LOCOMOTIVE LMS - Admin RLS for Modules & Topics
-- Run this in Supabase SQL Editor
-- ============================================

-- ===== 1. MODULES RLS =====
-- The public read policy already exists from schema.sql
-- CREATE POLICY "Modules are publicly readable" on public.modules for select using (true);

DROP POLICY IF EXISTS "Admins can manage modules" ON public.modules;
CREATE POLICY "Admins can manage modules" ON public.modules FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));


-- ===== 2. TOPICS RLS =====
-- The public read policy already exists from schema.sql
-- CREATE POLICY "Topics are publicly readable" on public.topics for select using (true);

DROP POLICY IF EXISTS "Admins can manage topics" ON public.topics;
CREATE POLICY "Admins can manage topics" ON public.topics FOR ALL
    USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true));

-- Also add a policy for user_topic_progress if admins need to manage progress,
-- but for now, we just need to manage the topics themselves.
