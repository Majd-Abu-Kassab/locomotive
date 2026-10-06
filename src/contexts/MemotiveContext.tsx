'use client';

import { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef, ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useSupabase } from '@/contexts/SupabaseContext';
import {
    getMemotiveStatus, getDecks, getDueCards, getNewStudiedToday, getSettings, sendReminderIfDue, localDate,
    MemotiveStatus, DeckRow, DueCardRow, MemotiveSettings,
} from '@/lib/memotive/api';
import { endOfToday, startOfToday } from '@/lib/memotive/scheduler';

export interface DueCounts {
    new: number;
    learn: number;
    review: number;
    total: number;
}

interface MemotiveContextType {
    /** False until the Memotive tables exist (migration not run) or while signed out. */
    available: boolean;
    /** True once the first load attempt has finished (success or not). */
    loaded: boolean;
    status: MemotiveStatus | null;
    decks: DeckRow[];
    settings: MemotiveSettings | null;
    totalDue: DueCounts;
    dueForDeck: (deckId: string) => DueCounts;
    /** Can add another note (unlimited, or under the free limit). */
    canAdd: boolean;
    /** Can study (unlimited, or at/under the free limit — lapsed students over it can't). */
    canStudy: boolean;
    refresh: () => Promise<void>;
    panelOpen: boolean;
    setPanelOpen: (open: boolean) => void;
}

const EMPTY: DueCounts = { new: 0, learn: 0, review: 0, total: 0 };
const MemotiveContext = createContext<MemotiveContextType | undefined>(undefined);

// Fired after Memotive posts a reminder so the Topbar bell can reload.
export const NOTIFICATIONS_CHANGED_EVENT = 'loco:notifications-changed';

function countDue(cards: DueCardRow[], newAllowance: number, endOfDay: Date): DueCounts {
    let n = 0, learn = 0, review = 0;
    const cutoff = endOfDay.getTime();
    for (const c of cards) {
        if (c.state === 'new') n++;
        else if (new Date(c.due).getTime() <= cutoff) {
            if (c.state === 'review') review++; else learn++;
        }
    }
    n = Math.min(n, newAllowance);
    return { new: n, learn, review, total: n + learn + review };
}

export function MemotiveProvider({ children }: { children: ReactNode }) {
    const { user } = useAuth();
    const supabase = useSupabase();
    const [available, setAvailable] = useState(false);
    const [loaded, setLoaded] = useState(false);
    const [status, setStatus] = useState<MemotiveStatus | null>(null);
    const [decks, setDecks] = useState<DeckRow[]>([]);
    const [dueCards, setDueCards] = useState<DueCardRow[]>([]);
    const [newToday, setNewToday] = useState(0);
    const [settings, setSettings] = useState<MemotiveSettings | null>(null);
    const [panelOpen, setPanelOpen] = useState(false);
    const lastRefresh = useRef(0);
    const userId = user?.id;

    const refresh = useCallback(async () => {
        if (!userId) return;
        lastRefresh.current = Date.now();
        const now = new Date();
        try {
            const [st, dk, due, nt, se] = await Promise.all([
                getMemotiveStatus(supabase),
                getDecks(supabase, userId),
                getDueCards(supabase, userId, endOfToday(now)),
                getNewStudiedToday(supabase, userId, startOfToday(now)),
                getSettings(supabase, userId),
            ]);
            setStatus(st);
            setDecks(dk);
            setDueCards(due);
            setNewToday(nt);
            setSettings(se);
            setAvailable(true);

            const due0 = countDue(due, Math.max(0, se.new_per_day - nt), endOfToday(now));
            if (await sendReminderIfDue(supabase, se, due0.total, now)) {
                setSettings({ ...se, last_reminded_on: localDate(now) });
                window.dispatchEvent(new Event(NOTIFICATIONS_CHANGED_EVENT));
            }
        } catch (err) {
            // Most likely the migration hasn't been run yet — keep Memotive
            // hidden rather than breaking the page.
            console.error('Memotive unavailable:', err);
            setAvailable(false);
        } finally {
            setLoaded(true);
        }
    }, [supabase, userId]);

    useEffect(() => {
        if (!userId) {
            setAvailable(false);
            setLoaded(false);
            setStatus(null);
            setDecks([]);
            setDueCards([]);
            setSettings(null);
            setPanelOpen(false);
            return;
        }
        refresh();
    }, [userId, refresh]);

    // Counts drift as time passes (learning cards come due, a new day starts),
    // so re-check when the student comes back to the tab.
    useEffect(() => {
        if (!userId) return;
        const onFocus = () => {
            if (Date.now() - lastRefresh.current > 60_000) refresh();
        };
        window.addEventListener('focus', onFocus);
        return () => window.removeEventListener('focus', onFocus);
    }, [userId, refresh]);

    const value = useMemo<MemotiveContextType>(() => {
        const endOfDay = endOfToday();
        const allowance = Math.max(0, (settings?.new_per_day ?? 20) - newToday);
        const totalDue = countDue(dueCards, allowance, endOfDay);
        const byDeck = new Map<string, DueCardRow[]>();
        for (const c of dueCards) {
            const list = byDeck.get(c.note.deck_id) ?? [];
            list.push(c);
            byDeck.set(c.note.deck_id, list);
        }
        const unlimited = !!status?.unlimited;
        const noteCount = status?.noteCount ?? 0;
        const limit = status?.freeLimit ?? 10;
        return {
            available,
            loaded,
            status,
            decks,
            settings,
            totalDue,
            dueForDeck: (deckId: string) => {
                const list = byDeck.get(deckId);
                return list ? countDue(list, allowance, endOfDay) : EMPTY;
            },
            canAdd: unlimited || noteCount < limit,
            canStudy: unlimited || noteCount <= limit,
            refresh,
            panelOpen,
            setPanelOpen,
        };
    }, [available, loaded, status, decks, settings, dueCards, newToday, refresh, panelOpen]);

    return <MemotiveContext.Provider value={value}>{children}</MemotiveContext.Provider>;
}

export function useMemotive() {
    const ctx = useContext(MemotiveContext);
    if (!ctx) throw new Error('useMemotive must be used within MemotiveProvider');
    return ctx;
}
