-- ============================================
-- LOCOMOTIVE — Subjects and topics for the question bank
-- Run this ENTIRE file in the Supabase SQL Editor BEFORE deploying the code
-- that uses it. Safe to re-run, and safe with the code that's live now.
-- ============================================
--
-- Create Test picks questions by Course › Subject › Topic, e.g.
-- Physics and Math › Mathematics › Number System. Each course has its own
-- subjects, each subject its own topics, and a question can be tagged with
-- one topic (questions.topic_id). A question with no topic is still in its
-- course; Create Test lists those as the course's "other questions".
--
-- This is separate from the lesson structure (modules and quiz lessons): a
-- question sitting in a quiz can be tagged with any topic, and past-paper
-- questions that are in no quiz can be tagged too.

-- ===== 1. Subjects and topics =====
CREATE TABLE IF NOT EXISTS public.question_subjects (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id text NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
    name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 120),
    sort_order int NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (course_id, name)
);

CREATE TABLE IF NOT EXISTS public.question_topics (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    subject_id uuid NOT NULL REFERENCES public.question_subjects(id) ON DELETE CASCADE,
    name text NOT NULL CHECK (length(btrim(name)) BETWEEN 1 AND 120),
    sort_order int NOT NULL DEFAULT 0,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (subject_id, name)
);

-- Deleting a topic (or its subject or course) untags its questions; it never
-- deletes them.
ALTER TABLE public.questions
    ADD COLUMN IF NOT EXISTS topic_id uuid REFERENCES public.question_topics(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS questions_topic_id_idx ON public.questions (topic_id);
CREATE INDEX IF NOT EXISTS questions_subject_idx ON public.questions (subject);

-- ===== 2. Who can see and change them =====
-- Everyone can read them (like the questions themselves); admins manage them.
ALTER TABLE public.question_subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.question_topics ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Question subjects are publicly readable" ON public.question_subjects;
CREATE POLICY "Question subjects are publicly readable" ON public.question_subjects FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage question subjects" ON public.question_subjects;
CREATE POLICY "Admins can manage question subjects" ON public.question_subjects FOR ALL
    USING (public.is_any_admin()) WITH CHECK (public.is_any_admin());

DROP POLICY IF EXISTS "Question topics are publicly readable" ON public.question_topics;
CREATE POLICY "Question topics are publicly readable" ON public.question_topics FOR SELECT USING (true);
DROP POLICY IF EXISTS "Admins can manage question topics" ON public.question_topics;
CREATE POLICY "Admins can manage question topics" ON public.question_topics FOR ALL
    USING (public.is_any_admin()) WITH CHECK (public.is_any_admin());

-- ===== 3. Question counts for the Create Test picker =====
-- One row per course and topic; topic_id null = the course's untagged
-- questions. Runs with the reader's permissions (questions are public).
CREATE OR REPLACE VIEW public.question_topic_counts
WITH (security_invoker = true) AS
SELECT subject AS course_name, topic_id, count(*)::int AS questions
FROM public.questions
GROUP BY subject, topic_id;

GRANT SELECT ON public.question_topic_counts TO anon, authenticated;

-- ===== 4. Tag the questions we already have =====
-- Imported questions carry their quiz title as text, written
-- "Subject · Topic" (e.g. "IMAT Mathematics · Number System"). Turn those into
-- a subject ("Mathematics": a leading "IMAT " is dropped) and a topic
-- ("Number System") under the question's course. Questions whose text has no
-- "·" stay untagged for an admin to sort. Only untagged questions are touched,
-- so re-running this never overrides a tag an admin set.
DO $$
BEGIN
    DROP TABLE IF EXISTS pg_temp.qt_backfill;
    CREATE TEMP TABLE qt_backfill AS
    SELECT q.id AS question_id,
           c.id AS course_id,
           btrim(regexp_replace(split_part(q.topic, '·', 1), '^\s*IMAT\s+', '', 'i')) AS subject_name,
           btrim(substr(q.topic, strpos(q.topic, '·') + 1)) AS topic_name
    FROM public.questions q
    JOIN public.courses c ON c.name = q.subject
    WHERE q.topic_id IS NULL AND strpos(q.topic, '·') > 0;

    DELETE FROM qt_backfill
    WHERE length(subject_name) NOT BETWEEN 1 AND 120 OR length(topic_name) NOT BETWEEN 1 AND 120;

    INSERT INTO public.question_subjects (course_id, name)
    SELECT DISTINCT course_id, subject_name FROM qt_backfill
    ON CONFLICT (course_id, name) DO NOTHING;

    INSERT INTO public.question_topics (subject_id, name)
    SELECT DISTINCT s.id, b.topic_name
    FROM qt_backfill b
    JOIN public.question_subjects s ON s.course_id = b.course_id AND s.name = b.subject_name
    ON CONFLICT (subject_id, name) DO NOTHING;

    UPDATE public.questions q
    SET topic_id = t.id
    FROM qt_backfill b
    JOIN public.question_subjects s ON s.course_id = b.course_id AND s.name = b.subject_name
    JOIN public.question_topics t ON t.subject_id = s.id AND t.name = b.topic_name
    WHERE q.id = b.question_id;

    DROP TABLE qt_backfill;
END $$;

-- ===== 5. Check =====
-- Each course's subjects and topics with their question counts.
SELECT c.name AS course, s.name AS subject, t.name AS topic,
       (SELECT count(*) FROM public.questions q WHERE q.topic_id = t.id) AS questions
FROM public.question_topics t
JOIN public.question_subjects s ON s.id = t.subject_id
JOIN public.courses c ON c.id = s.course_id
ORDER BY c.sort_order, s.sort_order, s.name, t.sort_order, t.name;
