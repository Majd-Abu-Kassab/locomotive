'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, User, Eye, EyeOff, ArrowRight, ArrowLeft, Check, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

export default function RegisterPage() {
    const router = useRouter();
    const { signUp, signInWithGoogle, updateProfile } = useAuth();
    const [step, setStep] = useState(1);
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        firstName: '', lastName: '', email: '', password: '',
        examDate: '', studyHours: '2', subjects: [] as string[],
    });

    const subjects = ['Biology', 'Chemistry', 'Physics', 'Mathematics', 'Logic', 'General Knowledge', 'Reading'];

    const toggleSubject = (s: string) => {
        setFormData(prev => ({
            ...prev,
            subjects: prev.subjects.includes(s) ? prev.subjects.filter(x => x !== s) : [...prev.subjects, s],
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (step < 3) {
            setStep(step + 1);
            return;
        }

        // Final step — create account
        setLoading(true);

        const { error: signUpError } = await signUp(formData.email, formData.password, {
            first_name: formData.firstName,
            last_name: formData.lastName,
        });

        if (signUpError) {
            setError(signUpError.message);
            setLoading(false);
            return;
        }

        // Wait a moment for the trigger to create the profile, then update it
        await new Promise(resolve => setTimeout(resolve, 1000));

        await updateProfile({
            first_name: formData.firstName,
            last_name: formData.lastName,
            exam_date: formData.examDate || null,
            daily_study_hours: parseInt(formData.studyHours),
            focus_subjects: formData.subjects,
        });

        router.push('/dashboard');
    };

    const handleGoogleSignUp = async () => {
        setError('');
        const { error } = await signInWithGoogle();
        if (error) {
            setError(error.message);
        }
    };

    return (
        <div className="auth-layout">
            <div className="auth-card animate-scale-in" style={{ maxWidth: '480px' }}>
                <div className="logo-section">
                    <h1>LOCOMOTIVE</h1>
                    <p>Create your account</p>
                </div>

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

                {/* Progress bar */}
                <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-8)' }}>
                    {[1, 2, 3].map(i => (
                        <div key={i} style={{
                            flex: 1, height: '4px', borderRadius: 'var(--radius-full)',
                            background: i <= step ? 'var(--brand-accent)' : 'var(--bg-input)',
                            transition: 'background var(--transition-base)',
                        }} />
                    ))}
                </div>

                <form className="auth-form" onSubmit={handleSubmit}>
                    {step === 1 && (
                        <>
                            <h2 style={{ fontSize: 'var(--fs-lg)', fontWeight: 600, marginBottom: 'var(--space-2)' }}>
                                Account Details
                            </h2>
                            <button type="button" className="google-btn" onClick={handleGoogleSignUp}>
                                <svg width="18" height="18" viewBox="0 0 24 24">
                                    <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" />
                                    <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                                    <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                                    <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
                                </svg>
                                Sign up with Google
                            </button>
                            <div className="divider-text">or use email</div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                                <div className="input-group">
                                    <label>First Name</label>
                                    <div style={{ position: 'relative' }}>
                                        <User size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                                        <input className="input" placeholder="John" value={formData.firstName} onChange={e => setFormData(p => ({ ...p, firstName: e.target.value }))} style={{ paddingLeft: '40px' }} required />
                                    </div>
                                </div>
                                <div className="input-group">
                                    <label>Last Name</label>
                                    <input className="input" placeholder="Doe" value={formData.lastName} onChange={e => setFormData(p => ({ ...p, lastName: e.target.value }))} required />
                                </div>
                            </div>
                            <div className="input-group">
                                <label>Email</label>
                                <div style={{ position: 'relative' }}>
                                    <Mail size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                                    <input className="input" type="email" placeholder="you@example.com" value={formData.email} onChange={e => setFormData(p => ({ ...p, email: e.target.value }))} style={{ paddingLeft: '40px' }} required />
                                </div>
                            </div>
                            <div className="input-group">
                                <label>Password</label>
                                <div style={{ position: 'relative' }}>
                                    <Lock size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                                    <input className="input" type={showPassword ? 'text' : 'password'} placeholder="Min 6 characters" value={formData.password} onChange={e => setFormData(p => ({ ...p, password: e.target.value }))} style={{ paddingLeft: '40px', paddingRight: '40px' }} required minLength={6} />
                                    <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-tertiary)', cursor: 'pointer' }}>
                                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                                    </button>
                                </div>
                            </div>
                        </>
                    )}

                    {step === 2 && (
                        <>
                            <h2 style={{ fontSize: 'var(--fs-lg)', fontWeight: 600, marginBottom: 'var(--space-2)' }}>
                                Exam Information
                            </h2>
                            <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
                                Help us personalize your study plan
                            </p>
                            <div className="input-group">
                                <label>When is your IMAT exam?</label>
                                <input className="input" type="date" value={formData.examDate} onChange={e => setFormData(p => ({ ...p, examDate: e.target.value }))} />
                            </div>
                            <div className="input-group">
                                <label>Daily study hours</label>
                                <select className="select" value={formData.studyHours} onChange={e => setFormData(p => ({ ...p, studyHours: e.target.value }))}>
                                    <option value="1">1 hour</option>
                                    <option value="2">2 hours</option>
                                    <option value="3">3 hours</option>
                                    <option value="4">4+ hours</option>
                                </select>
                            </div>
                        </>
                    )}

                    {step === 3 && (
                        <>
                            <h2 style={{ fontSize: 'var(--fs-lg)', fontWeight: 600, marginBottom: 'var(--space-2)' }}>
                                Focus Areas
                            </h2>
                            <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>
                                Select subjects you want to focus on
                            </p>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                                {subjects.map(s => (
                                    <button key={s} type="button" onClick={() => toggleSubject(s)} style={{
                                        display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                                        padding: 'var(--space-3) var(--space-4)',
                                        background: formData.subjects.includes(s) ? 'rgba(37, 99, 235, 0.12)' : 'var(--bg-glass)',
                                        border: `1px solid ${formData.subjects.includes(s) ? 'var(--brand-accent)' : 'var(--border-primary)'}`,
                                        borderRadius: 'var(--radius-md)',
                                        color: formData.subjects.includes(s) ? 'var(--brand-accent-light)' : 'var(--text-secondary)',
                                        cursor: 'pointer', fontFamily: 'var(--font-sans)', fontSize: 'var(--fs-base)',
                                        transition: 'all var(--transition-fast)',
                                    }}>
                                        <div style={{
                                            width: '20px', height: '20px', borderRadius: '4px',
                                            border: `2px solid ${formData.subjects.includes(s) ? 'var(--brand-accent)' : 'var(--border-primary)'}`,
                                            background: formData.subjects.includes(s) ? 'var(--brand-accent)' : 'transparent',
                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        }}>
                                            {formData.subjects.includes(s) && <Check size={12} color="white" />}
                                        </div>
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </>
                    )}

                    <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
                        {step > 1 && (
                            <button type="button" className="btn btn-secondary" onClick={() => setStep(step - 1)} style={{ flex: 1 }} disabled={loading}>
                                <ArrowLeft size={16} /> Back
                            </button>
                        )}
                        <button type="submit" className="btn btn-primary btn-lg" style={{ flex: 1 }} disabled={loading}>
                            {step < 3 ? (
                                <>Continue <ArrowRight size={16} /></>
                            ) : loading ? (
                                <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Creating account...</>
                            ) : (
                                <>Get Started <ArrowRight size={16} /></>
                            )}
                        </button>
                    </div>
                </form>

                <p style={{ textAlign: 'center', marginTop: 'var(--space-6)', fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)' }}>
                    Already have an account?{' '}
                    <Link href="/login" style={{ fontWeight: 600 }}>Sign in</Link>
                </p>
            </div>
        </div>
    );
}
