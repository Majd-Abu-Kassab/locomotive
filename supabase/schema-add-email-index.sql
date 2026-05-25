-- ============================================
-- LOCOMOTIVE LMS - Performance Optimization
-- Run this in Supabase SQL Editor to improve user search performance
-- ============================================

-- Add an index on the email column of the profiles table to make email lookups fast
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles (email);
