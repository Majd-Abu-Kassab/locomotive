'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface Toast {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning';
    duration?: number;
}

interface ToastContextType {
    toasts: Toast[];
    addToast: (message: string, type?: Toast['type'], duration?: number) => void;
    removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const addToast = useCallback((message: string, type: Toast['type'] = 'info', duration = 4000) => {
        const id = crypto.randomUUID();
        setToasts(prev => [...prev, { id, message, type, duration }]);
        if (duration > 0) {
            setTimeout(() => removeToast(id), duration);
        }
    }, [removeToast]);

    const iconMap: Record<string, string> = {
        success: '✓',
        error: '✗',
        warning: '⚠',
        info: 'ℹ',
    };

    const colorMap: Record<string, string> = {
        success: 'var(--color-success)',
        error: 'var(--color-danger)',
        warning: 'var(--color-warning)',
        info: 'var(--brand-accent-light)',
    };

    const bgMap: Record<string, string> = {
        success: 'rgba(16,185,129,0.15)',
        error: 'rgba(239,68,68,0.15)',
        warning: 'rgba(245,158,11,0.15)',
        info: 'rgba(37,99,235,0.15)',
    };

    return (
        <ToastContext.Provider value={{ toasts, addToast, removeToast }}>
            {children}
            {/* Toast container */}
            <div style={{
                position: 'fixed', bottom: 'var(--space-6)', right: 'var(--space-6)',
                display: 'flex', flexDirection: 'column', gap: 'var(--space-3)',
                zIndex: 10000, maxWidth: '400px',
            }}>
                {toasts.map(toast => (
                    <div
                        key={toast.id}
                        style={{
                            display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                            padding: 'var(--space-3) var(--space-4)',
                            background: 'var(--bg-card)',
                            backdropFilter: 'blur(20px)',
                            border: `1px solid ${colorMap[toast.type]}33`,
                            borderRadius: 'var(--radius-lg)',
                            boxShadow: 'var(--shadow-lg)',
                            animation: 'toast-in 0.3s ease-out',
                            cursor: 'pointer',
                            minWidth: '280px',
                        }}
                        onClick={() => removeToast(toast.id)}
                    >
                        <div style={{
                            width: 28, height: 28, borderRadius: 'var(--radius-sm)',
                            background: bgMap[toast.type],
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: colorMap[toast.type], fontWeight: 700, fontSize: 'var(--fs-sm)',
                            flexShrink: 0,
                        }}>
                            {iconMap[toast.type]}
                        </div>
                        <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-primary)', lineHeight: 1.4 }}>
                            {toast.message}
                        </span>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
}

export function useToast() {
    const context = useContext(ToastContext);
    if (!context) throw new Error('useToast must be used within ToastProvider');
    return context;
}
