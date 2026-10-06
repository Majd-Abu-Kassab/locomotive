// Memotive spaced-repetition scheduler — Anki's classic SM-2 variant with its
// default deck options (learning steps 1m 10m, graduating 1d, easy 4d,
// relearning 10m, starting ease 250%). Pure functions: no I/O.

export type CardState = 'new' | 'learning' | 'review' | 'relearning';
export type Rating = 1 | 2 | 3 | 4; // Again, Hard, Good, Easy

export interface Schedule {
    state: CardState;
    due: string; // ISO timestamp
    interval_days: number;
    ease: number;
    step: number;
    reps: number;
    lapses: number;
}

const MINUTE = 60_000;
const DAY = 86_400_000;

const LEARN_STEPS = [1, 10]; // minutes
const RELEARN_STEPS = [10];
const GRADUATING_IVL = 1; // days
const EASY_IVL = 4;
const START_EASE = 2.5;
const MIN_EASE = 1.3;
const HARD_MULT = 1.2;
const EASY_BONUS = 1.3;
const MAX_IVL = 36500;

// Learning cards this close to due are shown now rather than making the
// student wait (Anki's "learn ahead limit").
export const LEARN_AHEAD_MS = 20 * MINUTE;

export const RATING_LABELS: Record<Rating, string> = { 1: 'Again', 2: 'Hard', 3: 'Good', 4: 'Easy' };

export function schedule(card: Schedule, rating: Rating, now: Date = new Date()): Schedule {
    const t = now.getTime();
    const reps = card.reps + 1;
    const inMinutes = (m: number) => new Date(t + m * MINUTE).toISOString();
    const inDays = (d: number) => new Date(t + d * DAY).toISOString();
    const toReview = (ivl: number, ease: number, lapses = card.lapses): Schedule => ({
        state: 'review', due: inDays(ivl), interval_days: ivl, ease, step: 0, reps, lapses,
    });

    // ---- New / learning ----
    if (card.state === 'new' || card.state === 'learning') {
        const ease = card.state === 'new' ? START_EASE : card.ease;
        const step = card.state === 'new' ? 0 : Math.min(card.step, LEARN_STEPS.length - 1);
        const stay = (s: number, delay: number): Schedule => ({
            state: 'learning', due: inMinutes(delay), interval_days: 0, ease, step: s, reps, lapses: card.lapses,
        });
        switch (rating) {
            case 1: return stay(0, LEARN_STEPS[0]);
            case 2: return stay(step, hardDelay(LEARN_STEPS, step));
            case 3: return step + 1 < LEARN_STEPS.length
                ? stay(step + 1, LEARN_STEPS[step + 1])
                : toReview(GRADUATING_IVL, ease);
            case 4: return toReview(EASY_IVL, ease);
        }
    }

    // ---- Relearning (a review card that was forgotten) ----
    if (card.state === 'relearning') {
        const step = Math.min(card.step, RELEARN_STEPS.length - 1);
        const ivl = Math.max(1, card.interval_days);
        const stay = (s: number, delay: number): Schedule => ({
            state: 'relearning', due: inMinutes(delay), interval_days: ivl, ease: card.ease, step: s, reps, lapses: card.lapses,
        });
        switch (rating) {
            case 1: return stay(0, RELEARN_STEPS[0]);
            case 2: return stay(step, hardDelay(RELEARN_STEPS, step));
            case 3: return step + 1 < RELEARN_STEPS.length
                ? stay(step + 1, RELEARN_STEPS[step + 1])
                : toReview(ivl, card.ease);
            case 4: return toReview(ivl + 1, card.ease);
        }
    }

    // ---- Review ----
    const ivl = Math.max(1, card.interval_days);
    const daysLate = Math.max(0, (t - new Date(card.due).getTime()) / DAY);
    const hardIvl = clampIvl(Math.max(ivl + 1, ivl * HARD_MULT));
    const goodIvl = clampIvl(Math.max(hardIvl + 1, (ivl + daysLate / 2) * card.ease));
    const easyIvl = clampIvl(Math.max(goodIvl + 1, (ivl + daysLate) * card.ease * EASY_BONUS));

    switch (rating) {
        case 1: return {
            state: 'relearning', due: inMinutes(RELEARN_STEPS[0]), interval_days: 1,
            ease: Math.max(MIN_EASE, card.ease - 0.2), step: 0, reps, lapses: card.lapses + 1,
        };
        case 2: return toReview(hardIvl, Math.max(MIN_EASE, card.ease - 0.15));
        case 3: return toReview(goodIvl, card.ease);
        case 4: return toReview(easyIvl, card.ease + 0.15);
    }
}

// Anki: Hard on the first step waits halfway between steps 1 and 2; with a
// single step it waits 1.5× that step; otherwise it repeats the current step.
function hardDelay(steps: number[], step: number): number {
    if (step === 0 && steps.length > 1) return (steps[0] + steps[1]) / 2;
    if (steps.length === 1) return steps[0] * 1.5;
    return steps[step];
}

function clampIvl(days: number): number {
    return Math.min(MAX_IVL, Math.round(days));
}

/** Short Anki-style label for how long until a card returns: "1m", "6h", "4d", "1.5mo". */
export function formatDelay(ms: number): string {
    const minutes = Math.max(1, Math.round(ms / MINUTE));
    if (minutes < 60) return `${minutes}m`;
    const hours = minutes / 60;
    if (hours < 24) return `${Math.round(hours)}h`;
    const days = Math.round(ms / DAY);
    if (days < 30) return `${days}d`;
    if (days < 365) return `${trim1(days / 30)}mo`;
    return `${trim1(days / 365)}y`;
}

function trim1(n: number): string {
    return n.toFixed(1).replace(/\.0$/, '');
}

/** The label shown under each answer button. */
export function previewDelays(card: Schedule, now: Date = new Date()): Record<Rating, string> {
    const out = {} as Record<Rating, string>;
    for (const r of [1, 2, 3, 4] as Rating[]) {
        out[r] = formatDelay(new Date(schedule(card, r, now).due).getTime() - now.getTime());
    }
    return out;
}

export function endOfToday(now: Date = new Date()): Date {
    const d = new Date(now);
    d.setHours(23, 59, 59, 999);
    return d;
}

export function startOfToday(now: Date = new Date()): Date {
    const d = new Date(now);
    d.setHours(0, 0, 0, 0);
    return d;
}
