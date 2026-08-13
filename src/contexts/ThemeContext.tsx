'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

type Theme = 'dark' | 'light';

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
    setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

// Persist in a cookie (not localStorage) so the server can read it on the next
// request and render the correct `data-theme` in the SSR HTML — that's what
// keeps the theme flash-free and hydration-safe. Also mirror it onto <html>
// immediately for the current page.
function apply(t: Theme) {
    if (typeof document === 'undefined') return;
    document.documentElement.setAttribute('data-theme', t);
    document.cookie = `loco_theme=${t}; path=/; max-age=31536000; SameSite=Lax`;
}

export function ThemeProvider({
    children,
    initialTheme,
}: {
    children: ReactNode;
    initialTheme: Theme;
}) {
    // Seeded from the server-read cookie, so client and server agree from the
    // first render — no hydration mismatch.
    const [theme, setThemeState] = useState<Theme>(initialTheme);

    const setTheme = useCallback((t: Theme) => {
        setThemeState(t);
        apply(t);
    }, []);

    const toggleTheme = useCallback(() => {
        setThemeState(prev => {
            const next: Theme = prev === 'dark' ? 'light' : 'dark';
            apply(next);
            return next;
        });
    }, []);

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const ctx = useContext(ThemeContext);
    if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
    return ctx;
}
