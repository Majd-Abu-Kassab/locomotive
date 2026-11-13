-- ============================================
-- LOCOMOTIVE — Put questions into specific quizzes
-- Run this ENTIRE file in the Supabase SQL Editor. Safe to re-run.
-- ============================================
--
-- Until now a question only knew its course (questions.subject = course
-- name), so every quiz lesson in a course used every question in it. Now a
-- question can belong to one quiz lesson (a row in public.topics with
-- lesson_type = 'quiz'):
--   lesson_id set   → it's in that quiz (and still in the course bank for
--                     Create Test practice)
--   lesson_id null  → course bank only
-- A quiz shows only its own questions; a quiz with none is empty. (It used to
-- fall back to the whole course bank, which made every empty quiz repeat
-- another quiz's questions.) Re-run this file to apply that change.

-- ===== 1. The link =====
ALTER TABLE public.questions
    ADD COLUMN IF NOT EXISTS lesson_id text REFERENCES public.topics(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS questions_lesson_id_idx ON public.questions (lesson_id);

-- ===== 2. Quiz question counts are calculated, not typed =====
-- topics.question_count is what students see ("12 questions"): the number of
-- questions placed in that quiz.
CREATE OR REPLACE FUNCTION public.recount_quiz_questions()
RETURNS void AS $$
BEGIN
    WITH counts AS (
        SELECT t.id,
               (SELECT count(*) FROM public.questions q WHERE q.lesson_id = t.id)::int AS n
        FROM public.topics t
        WHERE t.lesson_type = 'quiz'
    )
    UPDATE public.topics t
    SET question_count = counts.n
    FROM counts
    WHERE t.id = counts.id AND t.question_count IS DISTINCT FROM counts.n;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.recount_quiz_questions() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.refresh_quiz_question_counts()
RETURNS trigger AS $$
BEGIN
    -- The recount UPDATEs topics, which fires the topics trigger below; stop there.
    IF pg_trigger_depth() = 1 THEN
        PERFORM public.recount_quiz_questions();
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Once per statement, so a 500-question import recounts once, not 500 times.
DROP TRIGGER IF EXISTS trg_questions_refresh_quiz_counts ON public.questions;
CREATE TRIGGER trg_questions_refresh_quiz_counts
    AFTER INSERT OR UPDATE OR DELETE ON public.questions
    FOR EACH STATEMENT EXECUTE FUNCTION public.refresh_quiz_question_counts();

-- New quiz lessons, lessons switched to/from quiz, or moved between modules.
DROP TRIGGER IF EXISTS trg_topics_refresh_quiz_counts ON public.topics;
CREATE TRIGGER trg_topics_refresh_quiz_counts
    AFTER INSERT OR UPDATE ON public.topics
    FOR EACH STATEMENT EXECUTE FUNCTION public.refresh_quiz_question_counts();

-- ===== 3. Correct today's counts =====
SELECT public.recount_quiz_questions();
