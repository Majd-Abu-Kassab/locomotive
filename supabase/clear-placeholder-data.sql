-- ============================================
-- LOCOMOTIVE LMS - Clear Placeholder Data
-- Run this in Supabase SQL Editor
-- WARNING: THIS DELETES ALL COURSES, QUESTIONS, TESTS, PAYMENTS AND COUPONS
-- ============================================

-- TRUNCATE deletes all rows from a table.
-- CASCADE automatically drops rows in other tables that reference these rows via foreign keys.
-- We are not truncating public.profiles to keep user accounts and admin roles intact.

TRUNCATE TABLE public.test_answers CASCADE;
TRUNCATE TABLE public.test_results CASCADE;
TRUNCATE TABLE public.user_topic_progress CASCADE;
TRUNCATE TABLE public.student_section_access CASCADE;
TRUNCATE TABLE public.payments CASCADE;
TRUNCATE TABLE public.coupons CASCADE;
TRUNCATE TABLE public.schedule_events CASCADE;
TRUNCATE TABLE public.section_module_map CASCADE;
TRUNCATE TABLE public.course_sections CASCADE;
TRUNCATE TABLE public.topics CASCADE;
TRUNCATE TABLE public.modules CASCADE;
TRUNCATE TABLE public.questions CASCADE;
TRUNCATE TABLE public.courses CASCADE;

-- Note: The profiles and auth.users tables are left intact. 
-- Your admin roles and test users will still exist.
