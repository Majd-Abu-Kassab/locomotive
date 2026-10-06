-- ============================================
-- LOCOMOTIVE — Memotive (Anki-style flashcards)
-- Run this ENTIRE file in the Supabase SQL Editor.
-- Safe to re-run.
-- ============================================
--
-- Model (mirrors Anki):
--   deck  → a student-named subject ("Biology", "Organic chem"…)
--   note  → what the student writes (front/back, or cloze text). The free
--           limit counts NOTES: a reversed note or a 3-blank cloze is 1.
--   card  → what gets reviewed. One note makes 1+ cards (reversed = 2,
--           cloze = one per {{cN::…}} number). Holds the SRS schedule.
--   review→ append-only log of every answer (daily new-card limit, stats).
--
-- Access:
--   Free: up to 10 notes, fully working.
--   Unlimited: owns a course part (course_sections) ticked "Includes
--   Memotive", or is staff. Subscriptions plug into memotive_has_unlimited()
--   later.
--   Lapsed (over 10 notes, no unlimited): can view/edit/delete/export, but
--   can't add or study until back at 10 or below. Enforced by triggers so a
--   client can't bypass it.

-- ===== 1. Course parts can include Memotive =====
ALTER TABLE public.course_sections
    ADD COLUMN IF NOT EXISTS includes_memotive boolean NOT NULL DEFAULT false;

-- ===== 2. SECURITY: students must not be able to grant themselves access =====
-- Access rows are written only by the PayPal capture route (service role)
-- and by admins. This policy let any signed-in user insert an 'active' row
-- for any section — i.e. unlock any course part (and Memotive) for free.
DROP POLICY IF EXISTS "Users can insert own access" ON public.student_section_access;

-- ===== 3. Tables =====
CREATE TABLE IF NOT EXISTS public.memotive_decks (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    name text NOT NULL CHECK (char_length(trim(name)) BETWEEN 1 AND 80),
    created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS memotive_decks_user_name_idx
    ON public.memotive_decks (user_id, lower(name));

CREATE TABLE IF NOT EXISTS public.memotive_notes (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    deck_id uuid REFERENCES public.memotive_decks(id) ON DELETE CASCADE NOT NULL,
    note_type text NOT NULL CHECK (note_type IN ('basic', 'reversed', 'type_in', 'cloze')),
    front text NOT NULL CHECK (char_length(front) <= 20000),
    back text NOT NULL DEFAULT '' CHECK (char_length(back) <= 20000),
    source_question_id text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS memotive_notes_user_deck_idx ON public.memotive_notes (user_id, deck_id);

CREATE TABLE IF NOT EXISTS public.memotive_cards (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    note_id uuid REFERENCES public.memotive_notes(id) ON DELETE CASCADE NOT NULL,
    ord int NOT NULL DEFAULT 0,
    state text NOT NULL DEFAULT 'new' CHECK (state IN ('new', 'learning', 'review', 'relearning')),
    due timestamptz NOT NULL DEFAULT now(),
    interval_days numeric(10,2) NOT NULL DEFAULT 0,
    ease numeric(5,3) NOT NULL DEFAULT 2.5,
    step int NOT NULL DEFAULT 0,
    reps int NOT NULL DEFAULT 0,
    lapses int NOT NULL DEFAULT 0,
    last_reviewed_at timestamptz,
    created_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (note_id, ord)
);
CREATE INDEX IF NOT EXISTS memotive_cards_user_due_idx ON public.memotive_cards (user_id, due);

CREATE TABLE IF NOT EXISTS public.memotive_reviews (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    card_id uuid REFERENCES public.memotive_cards(id) ON DELETE CASCADE NOT NULL,
    rating smallint NOT NULL CHECK (rating BETWEEN 1 AND 4),
    state_before text NOT NULL,
    interval_after numeric(10,2) NOT NULL,
    reviewed_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS memotive_reviews_user_time_idx ON public.memotive_reviews (user_id, reviewed_at DESC);

CREATE TABLE IF NOT EXISTS public.memotive_settings (
    user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    reminders_enabled boolean NOT NULL DEFAULT true,
    reminder_hour smallint NOT NULL DEFAULT 18 CHECK (reminder_hour BETWEEN 0 AND 23),
    new_per_day int NOT NULL DEFAULT 20 CHECK (new_per_day BETWEEN 0 AND 999),
    last_reminded_on date
);

-- ===== 4. Access helpers =====
CREATE OR REPLACE FUNCTION public.memotive_has_unlimited(uid uuid)
RETURNS boolean AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.student_section_access ssa
        JOIN public.course_sections cs ON cs.id = ssa.section_id
        WHERE ssa.user_id = uid
          AND ssa.status IN ('active', 'free_grant')
          AND cs.includes_memotive
    ) OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = uid AND admin_role IS NOT NULL
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

-- Internal only: don't let clients probe other users' entitlement.
REVOKE EXECUTE ON FUNCTION public.memotive_has_unlimited(uuid) FROM PUBLIC, anon, authenticated;

-- What the app reads: the caller's own status.
CREATE OR REPLACE FUNCTION public.memotive_status()
RETURNS TABLE (unlimited boolean, note_count int, free_limit int) AS $$
    SELECT
        public.memotive_has_unlimited(auth.uid()),
        (SELECT count(*)::int FROM public.memotive_notes WHERE user_id = auth.uid()),
        10;
$$ LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public;

GRANT EXECUTE ON FUNCTION public.memotive_status() TO authenticated;

-- ===== 5. Enforcement triggers =====
-- Free limit on new notes. The advisory lock serialises one user's
-- concurrent inserts so two tabs can't both squeeze in note #10.
CREATE OR REPLACE FUNCTION public.memotive_enforce_note_limit()
RETURNS trigger AS $$
BEGIN
    PERFORM pg_advisory_xact_lock(hashtext('memotive:' || NEW.user_id::text));
    IF NOT public.memotive_has_unlimited(NEW.user_id)
       AND (SELECT count(*) FROM public.memotive_notes WHERE user_id = NEW.user_id) >= 10 THEN
        RAISE EXCEPTION 'MEMOTIVE_LIMIT_REACHED';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_memotive_note_limit ON public.memotive_notes;
CREATE TRIGGER trg_memotive_note_limit
    BEFORE INSERT ON public.memotive_notes
    FOR EACH ROW EXECUTE FUNCTION public.memotive_enforce_note_limit();

-- Studying (changing a card's schedule) needs ≤10 notes or unlimited.
-- Editing a note's text never touches these columns, so it stays allowed.
CREATE OR REPLACE FUNCTION public.memotive_enforce_study_access()
RETURNS trigger AS $$
BEGIN
    IF (NEW.due, NEW.state, NEW.interval_days, NEW.ease, NEW.step, NEW.reps, NEW.lapses)
       IS DISTINCT FROM
       (OLD.due, OLD.state, OLD.interval_days, OLD.ease, OLD.step, OLD.reps, OLD.lapses)
       AND NOT public.memotive_has_unlimited(NEW.user_id)
       AND (SELECT count(*) FROM public.memotive_notes WHERE user_id = NEW.user_id) > 10 THEN
        RAISE EXCEPTION 'MEMOTIVE_LOCKED';
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

DROP TRIGGER IF EXISTS trg_memotive_study_access ON public.memotive_cards;
CREATE TRIGGER trg_memotive_study_access
    BEFORE UPDATE ON public.memotive_cards
    FOR EACH ROW EXECUTE FUNCTION public.memotive_enforce_study_access();

-- ===== 6. Row Level Security: students only ever see their own data =====
ALTER TABLE public.memotive_decks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memotive_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memotive_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memotive_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.memotive_settings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Own decks" ON public.memotive_decks;
CREATE POLICY "Own decks" ON public.memotive_decks FOR ALL
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Own notes" ON public.memotive_notes;
CREATE POLICY "Own notes" ON public.memotive_notes FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (SELECT 1 FROM public.memotive_decks d WHERE d.id = deck_id AND d.user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Own cards" ON public.memotive_cards;
CREATE POLICY "Own cards" ON public.memotive_cards FOR ALL
    USING (auth.uid() = user_id)
    WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (SELECT 1 FROM public.memotive_notes n WHERE n.id = note_id AND n.user_id = auth.uid())
    );

DROP POLICY IF EXISTS "Own reviews" ON public.memotive_reviews;
CREATE POLICY "Own reviews" ON public.memotive_reviews FOR ALL
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Own settings" ON public.memotive_settings;
CREATE POLICY "Own settings" ON public.memotive_settings FOR ALL
    USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ===== 7. Daily reminder notifications =====
-- The app writes the student's own "cards due" reminder once a day after
-- their reminder hour. Limited to type 'memotive' so this can't be used to
-- forge system/payment notifications.
DROP POLICY IF EXISTS "Users can insert own memotive reminders" ON public.notifications;
CREATE POLICY "Users can insert own memotive reminders" ON public.notifications FOR INSERT
    WITH CHECK (auth.uid() = user_id AND type = 'memotive');
