import type { SupabaseClient } from '@supabase/supabase-js';

// Dashboard numbers worked out from what students actually do: their tests
// and their active time on study pages (public.study_activity, filled by
// /api/activity). Pure helpers below take the data and today's date.

export interface StudyDay { day: string; minutes: number; }

export async function getStudyActivity(supabase: SupabaseClient, userId: string, signal?: AbortSignal): Promise<StudyDay[]> {
    const { data, error } = await supabase
        .from('study_activity')
        .select('day, minutes')
        .eq('user_id', userId)
        .abortSignal(signal!);
    if (error) {
        if (signal?.aborted) throw error;
        console.error('Error fetching study activity:', error.message);
        return [];
    }
    return data || [];
}

export const IMAT_MAX = 90; // 60 questions × 1.5
const RECENT_TESTS = 5;

/**
 * Estimated IMAT score: the student's last few tests combined and scaled to
 * the real exam's 90 points (so a 20-question quiz and a full mock both
 * count, in proportion to their size). Null until they've taken a test.
 */
export function estimatedScore(tests: { score: number; max_score: number }[]): number | null {
    const recent = tests.slice(0, RECENT_TESTS).filter(t => Number(t.max_score) > 0);
    if (recent.length === 0) return null;
    const score = recent.reduce((s, t) => s + Number(t.score), 0);
    const max = recent.reduce((s, t) => s + Number(t.max_score), 0);
    return Math.round((score / max) * IMAT_MAX * 10) / 10;
}

export function localDay(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Days in a row with any study (active time on study pages, or a test),
 * ending today. If nothing yet today, the streak from yesterday still counts:
 * it only breaks after a whole day with no study.
 */
export function studyStreak(activeDays: Iterable<string>, today: Date = new Date()): number {
    const days = new Set(activeDays);
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    if (!days.has(localDay(d))) d.setDate(d.getDate() - 1);
    let streak = 0;
    while (days.has(localDay(d))) {
        streak++;
        d.setDate(d.getDate() - 1);
    }
    return streak;
}

/** Total hours, one decimal under 10 hours, whole hours above. */
export function studyHours(days: StudyDay[]): string {
    const hours = days.reduce((s, d) => s + d.minutes, 0) / 60;
    return hours < 10 ? String(Math.round(hours * 10) / 10) : String(Math.round(hours));
}
