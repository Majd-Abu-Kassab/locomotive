'use client';

import { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { useSupabase } from '@/contexts/SupabaseContext';
import type { User, AuthError } from '@supabase/supabase-js';

export interface Profile {
    id: string;
    first_name: string | null;
    last_name: string | null;
    email: string | null;
    avatar_url: string | null;
    plan: string;
    trial_days_remaining: number;
    joined_date: string;
    study_streak: number;
    total_study_hours: number;
    estimated_score: number;
    modules_completed: number;
    total_modules: number;
    exam_date: string | null;
    daily_study_hours: number;
    focus_subjects: string[];
    is_admin: boolean;
    admin_role: 'super_admin' | 'content_manager' | 'finance_manager' | 'analyst' | 'support' | null;
    created_at: string;
    updated_at: string;
}

interface AuthContextType {
    user: User | null;
    profile: Profile | null;
    loading: boolean;
    signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
    signUp: (email: string, password: string, metadata?: Record<string, unknown>) => Promise<{ error: AuthError | null }>;
    signInWithGoogle: () => Promise<{ error: AuthError | null }>;
    resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
    updatePassword: (password: string) => Promise<{ error: AuthError | null }>;
    signOut: () => Promise<void>;
    updateProfile: (updates: Partial<Profile>) => Promise<{ error: Error | null }>;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<User | null>(null);
    const [profile, setProfile] = useState<Profile | null>(null);
    const [loading, setLoading] = useState(true);
    // Mirrors of state for the auth listener, which is registered once and
    // can't read fresh state from its closure.
    const userIdRef = useRef<string | null>(null);
    const hasProfileRef = useRef(false);

    const supabase = useSupabase();

    useEffect(() => { hasProfileRef.current = !!profile; }, [profile]);

    const fetchProfile = useCallback(async (userId: string) => {
        const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', userId)
            .maybeSingle();

        if (error) {
            console.error('Error fetching profile details:', error.message, error.code, error.details, JSON.stringify(error));
            return null;
        }
        return data as Profile;
    }, [supabase]);

    const refreshProfile = useCallback(async () => {
        if (user) {
            const p = await fetchProfile(user.id);
            if (p) setProfile(p);
        }
    }, [user, fetchProfile]);

    useEffect(() => {
        let cancelled = false;

        // Failsafe: the Supabase auth client serializes session reads behind a
        // navigator lock. If a tab is closed mid-read, the next tab's
        // getSession() can hang — and since `loading` only clears once that
        // call resolves, the app is stuck on the loading spinner forever.
        // Never let loading stay true beyond this cap; the onAuthStateChange
        // listener below still fills in the user/profile if the read lands late.
        const failsafe = setTimeout(() => {
            if (!cancelled) setLoading(false);
        }, 8000);

        // Get initial session
        const initAuth = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (cancelled) return;
                const currentUser = session?.user ?? null;
                userIdRef.current = currentUser?.id ?? null;
                setUser(currentUser);

                if (currentUser) {
                    const p = await fetchProfile(currentUser.id);
                    if (!cancelled) setProfile(p);
                }
            } catch (error) {
                console.error('Auth initialization error:', error);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        initAuth();

        // Listen for auth changes.
        // The callback MUST stay synchronous: Supabase invokes it while holding
        // its auth lock (e.g. the SIGNED_IN it fires every time the tab becomes
        // visible again). Any Supabase call awaited in here needs that same
        // lock to read the access token, so awaiting it deadlocks the client —
        // every later query hangs and the whole app sits on a loading spinner.
        // Defer the profile fetch until after the lock is released.
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            (event, session) => {
                if (cancelled) return;
                const currentUser = session?.user ?? null;

                // Supabase re-announces the session for the SAME user every
                // time the tab becomes visible again (SIGNED_IN) and when it
                // refreshes the token (TOKEN_REFRESHED). Swapping in a new
                // user object re-ran every effect that depends on it, so the
                // whole app refetched its data on each tab switch. If it's the
                // same user and their profile is loaded, there's nothing new.
                // USER_UPDATED and anything else still go through in full.
                const isRepeat = event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'INITIAL_SESSION';
                if (isRepeat && currentUser && currentUser.id === userIdRef.current && hasProfileRef.current) {
                    setLoading(false);
                    return;
                }

                userIdRef.current = currentUser?.id ?? null;
                setUser(currentUser);

                if (currentUser) {
                    setTimeout(async () => {
                        const p = await fetchProfile(currentUser.id);
                        if (!cancelled) {
                            setProfile(p);
                            setLoading(false);
                        }
                    }, 0);
                } else {
                    setProfile(null);
                    setLoading(false);
                }
            }
        );

        return () => {
            cancelled = true;
            clearTimeout(failsafe);
            subscription.unsubscribe();
        };
    }, [supabase, fetchProfile]);

    const signIn = async (email: string, password: string) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        return { error };
    };

    const signUp = async (email: string, password: string, metadata?: Record<string, unknown>) => {
        const { error } = await supabase.auth.signUp({
            email,
            password,
            options: { data: metadata },
        });
        return { error };
    };

    const signInWithGoogle = async () => {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: `${window.location.origin}/auth/callback`,
            },
        });
        return { error };
    };

    // Send a password-recovery email. The link routes through /auth/callback
    // (which exchanges the recovery code for a session) and then lands the user
    // on /reset-password to choose a new password.
    const resetPassword = async (email: string) => {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
            redirectTo: `${window.location.origin}/auth/callback?next=/reset-password`,
        });
        return { error };
    };

    // Set a new password for the currently authenticated session (used by the
    // reset-password page once the recovery session is active).
    const updatePassword = async (password: string) => {
        const { error } = await supabase.auth.updateUser({ password });
        return { error };
    };

    const signOut = async () => {
        // Release our single-session marker so a later sign-in on this browser
        // isn't prompted. Only clear it if it's still ours (match on the id) so
        // we never wipe another device's active claim.
        try {
            const local = typeof window !== 'undefined' ? localStorage.getItem('loco_session_id') : null;
            if (user && local) {
                await supabase
                    .from('profiles')
                    .update({ active_session_id: null, session_last_seen: null })
                    .eq('id', user.id)
                    .eq('active_session_id', local);
            }
            if (typeof window !== 'undefined') localStorage.removeItem('loco_session_id');
        } catch {
            // best-effort — don't block sign-out on marker cleanup
        }
        await supabase.auth.signOut();
        userIdRef.current = null;
        setUser(null);
        setProfile(null);
    };

    const updateProfile = async (updates: Partial<Profile>) => {
        if (!user) return { error: new Error('Not authenticated') };

        // H4 security: strip privilege-escalation fields — these can only be
        // changed by a DB admin via the service role or Supabase dashboard.
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { is_admin: _ia, admin_role: _ar, ...safeUpdates } = updates;

        const { error } = await supabase
            .from('profiles')
            .update(safeUpdates)
            .eq('id', user.id);

        if (!error) {
            // Refresh profile after update
            const p = await fetchProfile(user.id);
            if (p) setProfile(p);
        }

        return { error: error ? new Error(error.message) : null };
    };

    return (
        <AuthContext.Provider value={{
            user, profile, loading,
            signIn, signUp, signInWithGoogle, resetPassword, updatePassword, signOut,
            updateProfile, refreshProfile,
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
