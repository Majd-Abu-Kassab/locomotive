-- ============================================
-- LOCOMOTIVE — Per-lesson "students can download" switch
-- Run in the Supabase SQL Editor BEFORE deploying the code that uses it
-- (saving a lesson in the admin writes this column). Safe to re-run.
-- ============================================
--
-- By default students can view lesson PDFs but not download them (client
-- decision). An admin can allow downloading for individual lessons.
-- Slide decks (.pptx) can only be opened by downloading, so they're always
-- downloadable regardless of this switch.

ALTER TABLE public.topics
    ADD COLUMN IF NOT EXISTS allow_download boolean NOT NULL DEFAULT false;
