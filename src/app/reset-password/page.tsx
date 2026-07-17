'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lock, Eye, EyeOff, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function ResetPasswordPage() {
    const router = useRouter();
    const { user, loading: authLoading, updatePassword } = useAuth();
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [done, setDone] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (password.length < 6) {
            setError('Password must be at least 6 characters.');
            return;
        }
        if (password !== confirm) {
            setError('Passwords do not match.');
            return;
        }

        setLoading(true);
        const { error } = await updatePassword(password);
        setLoading(false);

        if (error) {
            setError(error.message);
        } else {
            setDone(true);
            // The recovery session is now a full session — send them into the app.
            setTimeout(() => router.replace('/dashboard'), 1500);
        }
    };

    return (
        <div className="auth-layout">
            <div className="auth-card animate-scale-in">
                <div className="logo-section">
                    <h1>LOCOMOTIVE</h1>
                    <p>Choose a new password</p>
                </div>

                {authLoading ? (
                    <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-8)' }}>
                        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-tertiary)' }} />
                    </div>
                ) : done ? (
                    <div style={{ textAlign: 'center' }}>
                        <CheckCircle2 size={48} style={{ color: 'var(--color-success)', margin: '0 auto var(--space-4)' }} />
                        <h2 style={{ fontSize: 'var(--fs-lg)', fontWeight: 600, marginBottom: 'var(--space-2)' }}>Password updated</h2>
                        <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)' }}>
                            Redirecting you to your dashboard&hellip;
                        </p>
                    </div>
                ) : !user ? (
                    <div style={{ textAlign: 'center' }}>
                        <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-6)' }}>
                            This password reset link is invalid or has expired. Request a new one to continue.
                        </p>
                        <Link href="/forgot-password" className="btn btn-primary" style={{ width: '100%' }}>
                            Request a new link
                        </Link>
                        <Link href="/login" className="btn btn-ghost btn-sm" style={{ width: '100%', marginTop: 'var(--space-3)' }}>
                            <ArrowLeft size={16} /> Back to sign in
                        </Link>
                    </div>
                ) : (
                    <>
                        {error && (
                            <div style={{
                                padding: 'var(--space-3) var(--space-4)',
                                background: 'rgba(239, 68, 68, 0.12)',
                                borderRadius: 'var(--radius-md)',
                                border: '1px solid rgba(239, 68, 68, 0.3)',
                                color: 'var(--color-danger-light)',
                                fontSize: 'var(--fs-sm)',
                                marginBottom: 'var(--space-4)',
                            }}>
                                {error}
                            </div>
                        )}

                        <form className="auth-form" onSubmit={handleSubmit}>
                            <div className="input-group">
                                <label htmlFor="password">New Password</label>
                                <div style={{ position: 'relative' }}>
                                    <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                                    <input
                                        id="password"
                                        type={showPassword ? 'text' : 'password'}
                                        className="input"
                                        placeholder="At least 6 characters"
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        style={{ paddingLeft: '40px', paddingRight: '40px' }}
                                        required
                                        disabled={loading}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        style={{
                                            position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
                                            background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer',
                                        }}
                                    >
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>

                            <div className="input-group">
                                <label htmlFor="confirm">Confirm New Password</label>
                                <div style={{ position: 'relative' }}>
                                    <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                                    <input
                                        id="confirm"
                                        type={showPassword ? 'text' : 'password'}
                                        className="input"
                                        placeholder="Re-enter your new password"
                                        value={confirm}
                                        onChange={(e) => setConfirm(e.target.value)}
                                        style={{ paddingLeft: '40px' }}
                                        required
                                        disabled={loading}
                                    />
                                </div>
                            </div>

                            <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
                                {loading ? (
                                    <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Updating...</>
                                ) : (
                                    'Update password'
                                )}
                            </button>
                        </form>
                    </>
                )}
            </div>
        </div>
    );
}
