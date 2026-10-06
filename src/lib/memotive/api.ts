import type { SupabaseClient } from '@supabase/supabase-js';
import { cardOrds, NoteType } from './content';
import { schedule, Rating, Schedule, CardState } from './scheduler';

// ===== TYPES =====
export interface MemotiveStatus {
    unlimited: boolean;
    noteCount: number;
    freeLimit: number;
}

export interface DeckRow {
    id: string;
    user_id: string;
    name: string;
    created_at: string;
}

export interface NoteRow {
    id: string;
    user_id: string;
    deck_id: string;
    note_type: NoteType;
    front: string;
    back: string;
    source_question_id: string | null;
    created_at: string;
    updated_at: string;
}

export interface CardRow extends Schedule {
    id: string;
    user_id: string;
    note_id: string;
    ord: number;
    last_reviewed_at: string | null;
    created_at: string;
}

export interface StudyCard extends CardRow {
    note: NoteRow;
}

/** Minimal card info used for the due counts (bubble badge, deck list). */
export interface DueCardRow {
    id: string;
    state: CardState;
    due: string;
    note: { deck_id: string };
}

export interface MemotiveSettings {
    user_id: string;
    reminders_enabled: boolean;
    reminder_hour: number;
    new_per_day: number;
    last_reminded_on: string | null;
}

export const DEFAULT_SETTINGS: Omit<MemotiveSettings, 'user_id'> = {
    reminders_enabled: true,
    reminder_hour: 18,
    new_per_day: 20,
    last_reminded_on: null,
};

/** Thrown when the database's free-limit / lapsed-access triggers refuse a write. */
export class MemotiveAccessError extends Error {
    constructor(public reason: 'limit' | 'locked') {
        super(reason === 'limit'
            ? 'You’ve used all your free Memotive cards.'
            : 'Studying is paused — you have more cards than the free plan allows.');
    }
}

function toError(error: { message: string } | null): Error | null {
    if (!error) return null;
    if (error.message.includes('MEMOTIVE_LIMIT_REACHED')) return new MemotiveAccessError('limit');
    if (error.message.includes('MEMOTIVE_LOCKED')) return new MemotiveAccessError('locked');
    return new Error(error.message);
}

/**
 * Read every row of a query, page by page. Supabase caps a single response
 * (1,000 rows by default), and a long-time student can easily have more
 * cards than that. The first page asks for the exact total so a typical
 * student still costs one request. `page` must apply a stable order.
 */
async function fetchAll<T>(
    page: (from: number, to: number) => PromiseLike<{ data: unknown[] | null; error: { message: string } | null; count: number | null }>,
): Promise<T[]> {
    const PAGE = 1000;
    const out: T[] = [];
    let total: number | null = null;
    // Continue from however many rows actually arrived, so a server cap
    // below PAGE can't make us skip rows.
    while (total === null || out.length < total) {
        const from = out.length;
        const { data, error, count } = await page(from, from + PAGE - 1);
        if (error) throw toError(error);
        if (total === null) total = count ?? 0;
        if (!data?.length) break;
        out.push(...(data as T[]));
    }
    return out;
}

// ===== STATUS =====
export async function getMemotiveStatus(supabase: SupabaseClient): Promise<MemotiveStatus> {
    const { data, error } = await supabase.rpc('memotive_status');
    if (error) throw toError(error);
    const row = Array.isArray(data) ? data[0] : data;
    return {
        unlimited: !!row?.unlimited,
        noteCount: row?.note_count ?? 0,
        freeLimit: row?.free_limit ?? 10,
    };
}

// ===== DECKS =====
export async function getDecks(supabase: SupabaseClient, userId: string): Promise<DeckRow[]> {
    const { data, error } = await supabase
        .from('memotive_decks')
        .select('*')
        .eq('user_id', userId)
        .order('name');
    if (error) throw toError(error);
    return data || [];
}

export async function createDeck(supabase: SupabaseClient, userId: string, name: string): Promise<DeckRow> {
    const { data, error } = await supabase
        .from('memotive_decks')
        .insert({ user_id: userId, name: name.trim() })
        .select('*')
        .single();
    if (error) {
        if (error.code === '23505') throw new Error('You already have a subject with that name.');
        throw toError(error);
    }
    return data;
}

/** Find a deck by name (case-insensitive) or create it. */
export async function getOrCreateDeck(supabase: SupabaseClient, userId: string, name: string): Promise<DeckRow> {
    const { data } = await supabase
        .from('memotive_decks')
        .select('*')
        .eq('user_id', userId)
        .ilike('name', name.trim().replace(/[%_\\]/g, '\\$&'))
        .maybeSingle();
    return data ?? createDeck(supabase, userId, name);
}

export async function renameDeck(supabase: SupabaseClient, deckId: string, name: string): Promise<void> {
    const { error } = await supabase.from('memotive_decks').update({ name: name.trim() }).eq('id', deckId);
    if (error) {
        if (error.code === '23505') throw new Error('You already have a subject with that name.');
        throw toError(error);
    }
}

export async function deleteDeck(supabase: SupabaseClient, deckId: string): Promise<void> {
    const { error } = await supabase.from('memotive_decks').delete().eq('id', deckId);
    if (error) throw toError(error);
}

// ===== NOTES =====
export async function getNotes(supabase: SupabaseClient, userId: string, deckId?: string): Promise<NoteRow[]> {
    return fetchAll<NoteRow>((from, to) => {
        let q = supabase.from('memotive_notes').select('*', { count: from === 0 ? 'exact' : undefined }).eq('user_id', userId);
        if (deckId) q = q.eq('deck_id', deckId);
        return q.order('created_at', { ascending: false }).order('id').range(from, to);
    });
}

/**
 * Create or update a note, then make its cards match its type: add cards for
 * new ords (e.g. a new cloze), delete cards whose ord disappeared, and keep
 * the schedule of every card that still exists.
 */
export async function saveNote(supabase: SupabaseClient, userId: string, note: {
    id?: string;
    deck_id: string;
    note_type: NoteType;
    front: string;
    back: string;
    source_question_id?: string | null;
}): Promise<NoteRow> {
    const fields = {
        deck_id: note.deck_id,
        note_type: note.note_type,
        front: note.front,
        back: note.back,
    };

    const { data: saved, error } = note.id
        ? await supabase.from('memotive_notes')
            .update({ ...fields, updated_at: new Date().toISOString() })
            .eq('id', note.id)
            .select('*').single()
        : await supabase.from('memotive_notes')
            .insert({ ...fields, user_id: userId, source_question_id: note.source_question_id ?? null })
            .select('*').single();
    if (error) throw toError(error);

    const wanted = cardOrds(note.note_type, note.front);
    const { data: existing, error: cardsErr } = await supabase
        .from('memotive_cards').select('id, ord').eq('note_id', saved.id);
    if (cardsErr) throw toError(cardsErr);

    const have = new Set((existing || []).map(c => c.ord));
    const stale = (existing || []).filter(c => !wanted.includes(c.ord)).map(c => c.id);
    const missing = wanted.filter(o => !have.has(o));

    if (stale.length) {
        const { error: delErr } = await supabase.from('memotive_cards').delete().in('id', stale);
        if (delErr) throw toError(delErr);
    }
    if (missing.length) {
        const { error: insErr } = await supabase.from('memotive_cards').insert(
            missing.map(ord => ({ user_id: userId, note_id: saved.id, ord })),
        );
        if (insErr) throw toError(insErr);
    }
    return saved;
}

export async function deleteNote(supabase: SupabaseClient, noteId: string): Promise<void> {
    const { error } = await supabase.from('memotive_notes').delete().eq('id', noteId);
    if (error) throw toError(error);
}

// ===== STUDY =====
// New cards, or anything due before midnight. The timestamp is quoted so its
// ':' and '.' can't be misread by PostgREST's or() syntax.
function dueFilter(endOfDay: Date): string {
    return `state.eq.new,due.lte."${endOfDay.toISOString()}"`;
}

/** Cards that could be studied today (new, or due before midnight). */
export async function getDueCards(supabase: SupabaseClient, userId: string, endOfDay: Date): Promise<DueCardRow[]> {
    return fetchAll<DueCardRow>((from, to) => supabase
        .from('memotive_cards')
        .select('id, state, due, note:memotive_notes!inner(deck_id)', { count: from === 0 ? 'exact' : undefined })
        .eq('user_id', userId)
        .or(dueFilter(endOfDay))
        .order('id')
        .range(from, to));
}

/** Same set as getDueCards, with full note content, for a study session. */
export async function getStudyCards(supabase: SupabaseClient, userId: string, endOfDay: Date, deckId?: string): Promise<StudyCard[]> {
    return fetchAll<StudyCard>((from, to) => {
        let q = supabase
            .from('memotive_cards')
            .select('*, note:memotive_notes!inner(*)', { count: from === 0 ? 'exact' : undefined })
            .eq('user_id', userId)
            .or(dueFilter(endOfDay));
        if (deckId) q = q.eq('note.deck_id', deckId);
        return q.order('created_at').order('ord').order('id').range(from, to);
    });
}

/** How many new cards were introduced today — counts against new_per_day. */
export async function getNewStudiedToday(supabase: SupabaseClient, userId: string, startOfDay: Date): Promise<number> {
    const { count, error } = await supabase
        .from('memotive_reviews')
        .select('id', { count: 'exact', head: true })
        .eq('user_id', userId)
        .eq('state_before', 'new')
        .gte('reviewed_at', startOfDay.toISOString());
    if (error) throw toError(error);
    return count ?? 0;
}

export async function answerCard(supabase: SupabaseClient, card: CardRow, rating: Rating, now: Date = new Date()): Promise<Schedule> {
    const next = schedule(card, rating, now);
    const { error } = await supabase
        .from('memotive_cards')
        .update({ ...next, last_reviewed_at: now.toISOString() })
        .eq('id', card.id);
    if (error) throw toError(error);
    // The log only feeds the daily new-card count; a failed insert shouldn't
    // undo an answer that already saved.
    const { error: logErr } = await supabase.from('memotive_reviews').insert({
        user_id: card.user_id,
        card_id: card.id,
        rating,
        state_before: card.state,
        interval_after: next.interval_days,
        reviewed_at: now.toISOString(),
    });
    if (logErr) console.error('Memotive review log failed:', logErr.message);
    return next;
}

// ===== SETTINGS & REMINDERS =====
export async function getSettings(supabase: SupabaseClient, userId: string): Promise<MemotiveSettings> {
    const { data, error } = await supabase
        .from('memotive_settings').select('*').eq('user_id', userId).maybeSingle();
    if (error) throw toError(error);
    return data ?? { user_id: userId, ...DEFAULT_SETTINGS };
}

export async function saveSettings(supabase: SupabaseClient, settings: MemotiveSettings): Promise<void> {
    const { error } = await supabase.from('memotive_settings').upsert(settings, { onConflict: 'user_id' });
    if (error) throw toError(error);
}

/**
 * Post today's "cards due" reminder to the bell, once per day, after the
 * student's reminder hour. Claiming the day first (a conditional update)
 * means two open tabs can't both post it. Returns true if one was posted.
 */
export async function sendReminderIfDue(
    supabase: SupabaseClient, settings: MemotiveSettings, dueCount: number, now: Date = new Date(),
): Promise<boolean> {
    if (!settings.reminders_enabled || dueCount === 0 || now.getHours() < settings.reminder_hour) return false;
    const today = localDate(now);
    if (settings.last_reminded_on === today) return false;

    // Make sure a settings row exists to claim against.
    await supabase.from('memotive_settings').upsert(
        { user_id: settings.user_id }, { onConflict: 'user_id', ignoreDuplicates: true },
    );
    const { data: claimed } = await supabase
        .from('memotive_settings')
        .update({ last_reminded_on: today })
        .eq('user_id', settings.user_id)
        .or(`last_reminded_on.is.null,last_reminded_on.neq.${today}`)
        .select('user_id');
    if (!claimed?.length) return false;

    const { error } = await supabase.from('notifications').insert({
        user_id: settings.user_id,
        title: 'Memotive review',
        message: `You have ${dueCount} card${dueCount === 1 ? '' : 's'} to review today.`,
        type: 'memotive',
        link: '/memotive',
    });
    return !error;
}

export function localDate(d: Date): string {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
