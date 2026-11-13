-- ============================================
-- LOCOMOTIVE — Make lesson videos, PDFs and slides private
-- Run in the Supabase SQL Editor ONLY AFTER the code with
-- /api/lesson-media is deployed and live — before that, the live site still
-- uses the public addresses and every lesson file would stop loading.
-- Safe to re-run.
-- ============================================
--
-- Until now 'course-content' was a public bucket: anyone with a file's
-- address could watch or download it, signed in or not, paid or not, and the
-- addresses were readable from the topics table. After this, files can only
-- be opened through short-lived links the server signs for students who have
-- access to that lesson (src/app/api/lesson-media/route.ts).

-- 1. No public addresses.
UPDATE storage.buckets SET public = false WHERE id = 'course-content';

-- 2. No public reads.
DROP POLICY IF EXISTS "Public can read course content" ON storage.objects;

-- 3. Admins can still read (their uploads overwrite with upsert, which needs it).
DROP POLICY IF EXISTS "Admins can read course content" ON storage.objects;
CREATE POLICY "Admins can read course content" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'course-content'
        AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    );

-- To undo (make the files public again):
--   UPDATE storage.buckets SET public = true WHERE id = 'course-content';
--   CREATE POLICY "Public can read course content" ON storage.objects
--       FOR SELECT USING (bucket_id = 'course-content');
