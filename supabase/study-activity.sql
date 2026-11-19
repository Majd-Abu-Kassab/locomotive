-- ============================================
-- LOCOMOTIVE — Study time per day (dashboard hours and streak)
-- Run in the Supabase SQL Editor BEFORE deploying the code that uses it.
-- Safe to re-run, and safe with the current live code.
-- ============================================
--
-- While a student is active on a study page (lessons, tests, Memotive, the
-- planner…), the app's activity ping (/api/activity, at most every 5
-- minutes of interaction) adds 5 minutes to that student's day here. The
-- dashboard sums it for Total Study Hours and counts consecutive days for
-- the Study Streak. "Day" is the student's own calendar day, not the server's.

CREATE TABLE IF NOT EXISTS public.study_activity (
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    day date NOT NULL,
    minutes int NOT NULL DEFAULT 0 CHECK (minutes BETWEEN 0 AND 1440),
    PRIMARY KEY (user_id, day)
);

ALTER TABLE public.study_activity ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can view own study activity" ON public.study_activity;
CREATE POLICY "Users can view own study activity" ON public.study_activity FOR SELECT
    USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "Admins can view study activity" ON public.study_activity;
CREATE POLICY "Admins can view study activity" ON public.study_activity FOR SELECT
    USING (public.is_any_admin());

-- The only way in: adds minutes to the caller's own day. Students can't write
-- the table directly, so they can't set arbitrary totals.
CREATE OR REPLACE FUNCTION public.log_study_minutes(p_day date, p_minutes int)
RETURNS void AS $$
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN;
    END IF;
    -- The student's local day can be one either side of the server's.
    IF p_day NOT BETWEEN current_date - 1 AND current_date + 1 THEN
        RETURN;
    END IF;
    INSERT INTO public.study_activity (user_id, day, minutes)
    VALUES (auth.uid(), p_day, least(greatest(p_minutes, 0), 15))
    ON CONFLICT (user_id, day)
    DO UPDATE SET minutes = least(public.study_activity.minutes + excluded.minutes, 1440);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

REVOKE EXECUTE ON FUNCTION public.log_study_minutes(date, int) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.log_study_minutes(date, int) TO authenticated;
