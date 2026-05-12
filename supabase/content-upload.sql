-- ============================================
-- LOCOMOTIVE — Content Upload & Rich Questions
-- Run in Supabase SQL Editor
-- ============================================

-- Add content_url to topics for PDF/video uploads
ALTER TABLE public.topics
    ADD COLUMN IF NOT EXISTS content_url text,
    ADD COLUMN IF NOT EXISTS content_type text; -- 'pdf', 'video_url', 'presentation'

-- Add image_url to questions for diagrams
ALTER TABLE public.questions
    ADD COLUMN IF NOT EXISTS image_url text;

-- Create Supabase Storage bucket for course content
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'course-content',
    'course-content',
    true,
    52428800, -- 50MB max
    '{application/pdf,image/png,image/jpeg,image/webp,image/gif,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation,video/mp4}'
)
ON CONFLICT (id) DO NOTHING;

-- Storage policies: anyone can read, admins can upload/delete
DROP POLICY IF EXISTS "Public can read course content" ON storage.objects;
CREATE POLICY "Public can read course content" ON storage.objects
    FOR SELECT USING (bucket_id = 'course-content');

DROP POLICY IF EXISTS "Admins can upload course content" ON storage.objects;
CREATE POLICY "Admins can upload course content" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'course-content'
        AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    );

DROP POLICY IF EXISTS "Admins can update course content" ON storage.objects;
CREATE POLICY "Admins can update course content" ON storage.objects
    FOR UPDATE USING (
        bucket_id = 'course-content'
        AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    );

DROP POLICY IF EXISTS "Admins can delete course content" ON storage.objects;
CREATE POLICY "Admins can delete course content" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'course-content'
        AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    );

-- Storage bucket for question images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'question-images',
    'question-images',
    true,
    5242880, -- 5MB max
    '{image/png,image/jpeg,image/webp,image/gif,image/svg+xml}'
)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public can read question images" ON storage.objects;
CREATE POLICY "Public can read question images" ON storage.objects
    FOR SELECT USING (bucket_id = 'question-images');

DROP POLICY IF EXISTS "Admins can upload question images" ON storage.objects;
CREATE POLICY "Admins can upload question images" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'question-images'
        AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    );

DROP POLICY IF EXISTS "Admins can delete question images" ON storage.objects;
CREATE POLICY "Admins can delete question images" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'question-images'
        AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
    );
