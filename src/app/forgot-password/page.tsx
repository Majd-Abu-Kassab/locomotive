'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Mail, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function ForgotPasswordPage() {
    const { resetPassword } = useAuth();
    const [email, setEmail] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [sent, setSent] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const { error } = await resetPassword(email);

        setLoading(false);
        if (error) {
            setError(error.message);
        } else {
            // Always show success — don't reveal whether an account exists.
            setSent(true);
        }
    };

    return (
        <div className="auth-layout">
            <div className="auth-card animate-scale-in">
                <div className="logo-section">
                    <h1>LOCOMOTIVE</h1>
                    <p>Reset your password</p>
                </div>

                {sent ? (
                    <div style={{ textAlign: 'center' }}>
                        <CheckCircle2 size={48} style={{ color: 'var(--color-success)', margin: '0 auto var(--space-4)' }} />
                        <h2 style={{ fontSize: 'var(--fs-lg)', fontWeight: 600, marginBottom: 'var(--space-2)' }}>Check your email</h2>
                        <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-6)' }}>
                            If an account exists for <strong>{email}</strong>, we&apos;ve sent a link to reset your password. The link expires in 1 hour.
                        </p>
                        <Link href="/login" className="btn btn-secondary" style={{ width: '100%' }}>
                            <ArrowLeft size={16} /> Back to sign in
                        </Link>
                    </div>
                ) : (
                    <>
                        <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-5)', textAlign: 'center' }}>
                            Enter your email address and we&apos;ll send you a link to reset your password.
                        </p>

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
                                <label htmlFor="email">Email Address</label>
                                <div style={{ position: 'relative' }}>
                                    <Mail size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                                    <input
                                        id="email"
                                        type="email"
                                        className="input"
                                        placeholder="you@example.com"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        style={{ paddingLeft: '40px' }}
                                        required
                                        disabled={loading}
                                    />
                                </div>
                            </div>

                            <button type="submit" className="btn btn-primary btn-lg" style={{ width: '100%' }} disabled={loading}>
                                {loading ? (
                                    <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Sending...</>
                                ) : (
                                    'Send reset link'
                                )}
                            </button>
                        </form>

                        <p style={{ textAlign: 'center', marginTop: 'var(--space-6)', fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)' }}>
                            Remembered it?{' '}
                            <Link href="/login" style={{ fontWeight: 600 }}>Back to sign in</Link>
                        </p>
                    </>
                )}
            </div>
        </div>
    );
}
