-- ============================================
-- LOCOMOTIVE -- Unify Admin RLS for all CRUD operations
-- Run this in Supabase SQL Editor
-- ============================================
-- This fixes the issue where admins couldn't save/edit courses, questions, etc.
-- It ensures ALL core tables have a clean, non-recursive Admin policy.

-- 1. COURSES
DROP POLICY IF EXISTS "Admins can insert courses" ON public.courses;
DROP POLICY IF EXISTS "Admins can update courses" ON public.courses;
DROP POLICY IF EXISTS "Admins can delete courses" ON public.courses;
DROP POLICY IF EXISTS "Admins can manage courses" ON public.courses;
CREATE POLICY "Admins can manage courses" ON public.courses FOR ALL USING (public.is_any_admin());

-- 2. MODULES
DROP POLICY IF EXISTS "Admins can manage modules" ON public.modules;
CREATE POLICY "Admins can manage modules" ON public.modules FOR ALL USING (public.is_any_admin());

-- 3. TOPICS
DROP POLICY IF EXISTS "Admins can manage topics" ON public.topics;
CREATE POLICY "Admins can manage topics" ON public.topics FOR ALL USING (public.is_any_admin());

-- 4. QUESTIONS (This was missing entirely before!)
DROP POLICY IF EXISTS "Admins can manage questions" ON public.questions;
CREATE POLICY "Admins can manage questions" ON public.questions FOR ALL USING (public.is_any_admin());

-- 5. COURSE SECTIONS
DROP POLICY IF EXISTS "Admins can manage sections" ON public.course_sections;
CREATE POLICY "Admins can manage sections" ON public.course_sections FOR ALL USING (public.is_any_admin());

-- 6. SECTION MODULE MAP
DROP POLICY IF EXISTS "Admins can manage section map" ON public.section_module_map;
CREATE POLICY "Admins can manage section map" ON public.section_module_map FOR ALL USING (public.is_any_admin());

-- 7. COUPONS
DROP POLICY IF EXISTS "Admins can manage coupons" ON public.coupons;
CREATE POLICY "Admins can manage coupons" ON public.coupons FOR ALL USING (public.is_any_admin());

-- 8. PAYMENTS
DROP POLICY IF EXISTS "Admins can view all payments" ON public.payments;
DROP POLICY IF EXISTS "Admins can manage all payments" ON public.payments;
CREATE POLICY "Admins can manage all payments" ON public.payments FOR ALL USING (public.is_any_admin());

-- 9. STUDENT ACCESS
DROP POLICY IF EXISTS "Admins can manage all access" ON public.student_section_access;
CREATE POLICY "Admins can manage all access" ON public.student_section_access FOR ALL USING (public.is_any_admin());

-- Ensure the public read policies still exist just in case
DROP POLICY IF EXISTS "Courses are publicly readable" ON public.courses;
CREATE POLICY "Courses are publicly readable" ON public.courses FOR SELECT USING (true);

DROP POLICY IF EXISTS "Modules are publicly readable" ON public.modules;
CREATE POLICY "Modules are publicly readable" ON public.modules FOR SELECT USING (true);

DROP POLICY IF EXISTS "Topics are publicly readable" ON public.topics;
CREATE POLICY "Topics are publicly readable" ON public.topics FOR SELECT USING (true);

DROP POLICY IF EXISTS "Questions are publicly readable" ON public.questions;
CREATE POLICY "Questions are publicly readable" ON public.questions FOR SELECT USING (true);

