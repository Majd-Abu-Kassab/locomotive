'use client';

import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
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

    const supabase = useSupabase();

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

        // Listen for auth changes
        const { data: { subscription } } = supabase.auth.onAuthStateChange(
            async (event, session) => {
                if (cancelled) return;
                const currentUser = session?.user ?? null;
                setUser(currentUser);

                if (currentUser) {
                    const p = await fetchProfile(currentUser.id);
                    if (!cancelled) setProfile(p);
                } else {
                    setProfile(null);
                }

                if (!cancelled) setLoading(false);
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
        await supabase.auth.signOut();
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
