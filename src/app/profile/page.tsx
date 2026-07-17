'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { User, Mail, Lock, CreditCard, Save, Loader2, CheckCircle, Target, Calendar, BookOpen, Receipt, ArrowRight } from 'lucide-react';
import { useSupabase } from '@/contexts/SupabaseContext';
import { useAbortController, isAbortError } from '@/hooks/useAbortController';
import { getStudentPayments, StudentPaymentRow, getCourses, CourseWithModules } from '@/lib/api';

export default function ProfilePage() {
    const { profile, updateProfile } = useAuth();
    const supabase = useSupabase();
    const { getSignal } = useAbortController();
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [passwordError, setPasswordError] = useState('');
    const [passwordSaving, setPasswordSaving] = useState(false);
    const [passwordSaved, setPasswordSaved] = useState(false);

    // Billing summary state
    const [payments, setPayments] = useState<StudentPaymentRow[]>([]);
    const [paymentsLoading, setPaymentsLoading] = useState(true);

    // Courses drive the Focus Subjects options (what the site actually offers)
    const [courses, setCourses] = useState<CourseWithModules[]>([]);

    // Study preferences state
    const [focusSubjects, setFocusSubjects] = useState<string[]>([]);
    const [examDate, setExamDate] = useState('');
    const [studyHours, setStudyHours] = useState('2');
    const [prefSaving, setPrefSaving] = useState(false);
    const [prefSaved, setPrefSaved] = useState(false);

    useEffect(() => {
        if (profile) {
            setFirstName(profile.first_name || '');
            setLastName(profile.last_name || '');
            setEmail(profile.email || '');
            setFocusSubjects(profile.focus_subjects || []);
            setExamDate(profile.exam_date || '');
            setStudyHours(String(profile.daily_study_hours || '2'));
        }
    }, [profile]);

    // Load payment history (billing summary) and courses (focus-subject options)
    // together on one abort signal — useAbortController shares a single
    // controller, so two separate getSignal() calls would abort each other.
    useEffect(() => {
        if (!profile?.id) return;
        const userId = profile.id;
        const signal = getSignal();
        async function load() {
            try {
                const [p, c] = await Promise.all([
                    getStudentPayments(supabase, userId, signal),
                    getCourses(supabase, undefined, signal),
                ]);
                setPayments(p);
                setCourses(c);
            } catch (err) {
                if (isAbortError(err)) return;
                console.error('Error loading profile billing/courses:', err);
            } finally {
                setPaymentsLoading(false);
            }
        }
        load();
    }, [profile?.id, supabase, getSignal]);

    const displayName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'User';

    // Focus-subject options come from the site's actual courses. Union in any
    // already-saved selections so a previously-picked subject that is no longer
    // a course still shows (and isn't silently dropped on the next save).
    const subjectOptions = Array.from(new Set([
        ...courses.map(c => c.name),
        ...focusSubjects,
    ]));

    const handleSaveProfile = async () => {
        setSaving(true);
        setSaved(false);
        await updateProfile({ first_name: firstName, last_name: lastName });
        setSaving(false);
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
    };

    const toggleSubject = (s: string) => {
        setFocusSubjects(prev =>
            prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]
        );
    };

    const handleSavePreferences = async () => {
        setPrefSaving(true);
        setPrefSaved(false);
        await updateProfile({
            focus_subjects: focusSubjects,
            exam_date: examDate || null,
            daily_study_hours: parseInt(studyHours),
        });
        setPrefSaving(false);
        setPrefSaved(true);
        setTimeout(() => setPrefSaved(false), 3000);
    };

    const handleUpdatePassword = async () => {
        setPasswordError('');
        if (newPassword !== confirmPassword) {
            setPasswordError('Passwords do not match');
            return;
        }
        if (newPassword.length < 6) {
            setPasswordError('Password must be at least 6 characters');
            return;
        }
        setPasswordSaving(true);
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) {
            setPasswordError(error.message);
        } else {
            setPasswordSaved(true);
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setTimeout(() => setPasswordSaved(false), 3000);
        }
        setPasswordSaving(false);
    };

    if (!profile) {
        return (
            <AppLayout>
                <div className="page-wrapper" style={{ maxWidth: '700px', display: 'flex', justifyContent: 'center', padding: 'var(--space-12)' }}>
                    <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-tertiary)' }} />
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <div className="page-wrapper" style={{ maxWidth: '700px' }}>
                <div className="page-header">
                    <h1>Profile Settings</h1>
                    <p>Manage your account information</p>
                </div>

                {/* Avatar */}
                <div className="card" style={{ marginBottom: 'var(--space-6)', display: 'flex', alignItems: 'center', gap: 'var(--space-6)' }}>
                    <div style={{
                        width: 80, height: 80, borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--brand-accent), var(--brand-accent-light))',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                        <User size={36} color="white" />
                    </div>
                    <div>
                        <h3 style={{ fontSize: 'var(--fs-lg)', fontWeight: 600 }}>{displayName}</h3>
                        <p className="text-secondary text-sm">{email}</p>
                        <p className="text-xs" style={{ color: 'var(--color-warning)', marginTop: 'var(--space-1)' }}>
                            {profile.plan === 'free-trial'
                                ? 'Free Plan'
                                : profile.plan.charAt(0).toUpperCase() + profile.plan.slice(1)
                            }
                        </p>
                    </div>
                </div>

                {/* Personal Info */}
                <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
                    <h3 style={{ fontSize: 'var(--fs-md)', fontWeight: 600, marginBottom: 'var(--space-5)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <User size={18} /> Personal Information
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                            <div className="input-group">
                                <label>First Name</label>
                                <input className="input" value={firstName} onChange={e => setFirstName(e.target.value)} />
                            </div>
                            <div className="input-group">
                                <label>Last Name</label>
                                <input className="input" value={lastName} onChange={e => setLastName(e.target.value)} />
                            </div>
                        </div>
                        <div className="input-group">
                            <label>Email Address</label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                                <input className="input" value={email} readOnly style={{ paddingLeft: 40, opacity: 0.7 }} />
                            </div>
                        </div>
                        <button className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start' }} onClick={handleSaveProfile} disabled={saving}>
                            {saving ? (
                                <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</>
                            ) : saved ? (
                                <><CheckCircle size={14} /> Saved!</>
                            ) : (
                                <><Save size={14} /> Save Changes</>
                            )}
                        </button>
                    </div>
                </div>

                {/* Study Preferences */}
                <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
                    <h3 style={{ fontSize: 'var(--fs-md)', fontWeight: 600, marginBottom: 'var(--space-5)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <Target size={18} /> Study Preferences
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }}>

                        {/* Exam date + study hours */}
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                            <div className="input-group">
                                <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                    <Calendar size={14} /> IMAT Exam Date
                                </label>
                                <input
                                    className="input"
                                    type="date"
                                    value={examDate}
                                    onChange={e => setExamDate(e.target.value)}
                                />
                            </div>
                            <div className="input-group">
                                <label>Daily Study Hours</label>
                                <select className="select" value={studyHours} onChange={e => setStudyHours(e.target.value)}>
                                    <option value="1">1 hour</option>
                                    <option value="2">2 hours</option>
                                    <option value="3">3 hours</option>
                                    <option value="4">4+ hours</option>
                                </select>
                            </div>
                        </div>

                        {/* Focus subjects */}
                        <div>
                            <label style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-3)' }}>
                                <BookOpen size={14} /> Focus Subjects
                            </label>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 'var(--space-2)' }}>
                                {subjectOptions.length === 0 && (
                                    <p className="text-secondary text-sm">No courses available yet.</p>
                                )}
                                {subjectOptions.map(s => {
                                    const active = focusSubjects.includes(s);
                                    return (
                                        <button
                                            key={s}
                                            type="button"
                                            onClick={() => toggleSubject(s)}
                                            style={{
                                                display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                                                padding: 'var(--space-2) var(--space-3)',
                                                background: active ? 'rgba(37,99,235,0.12)' : 'var(--bg-glass)',
                                                border: `1px solid ${active ? 'var(--brand-accent)' : 'var(--border-primary)'}`,
                                                borderRadius: 'var(--radius-md)',
                                                color: active ? 'var(--brand-accent-light)' : 'var(--text-secondary)',
                                                cursor: 'pointer', fontFamily: 'var(--font-sans)',
                                                fontSize: 'var(--fs-sm)', fontWeight: active ? 600 : 400,
                                                transition: 'all var(--transition-fast)',
                                            }}
                                        >
                                            <div style={{
                                                width: 16, height: 16, borderRadius: '3px', flexShrink: 0,
                                                border: `2px solid ${active ? 'var(--brand-accent)' : 'var(--border-primary)'}`,
                                                background: active ? 'var(--brand-accent)' : 'transparent',
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                            }}>
                                                {active && <CheckCircle size={10} color="white" />}
                                            </div>
                                            {s}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        <button
                            className="btn btn-primary btn-sm"
                            style={{ alignSelf: 'flex-start' }}
                            onClick={handleSavePreferences}
                            disabled={prefSaving}
                        >
                            {prefSaving ? (
                                <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</>
                            ) : prefSaved ? (
                                <><CheckCircle size={14} /> Saved!</>
                            ) : (
                                <><Save size={14} /> Save Preferences</>
                            )}
                        </button>
                    </div>
                </div>

                {/* Password */}
                <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
                    <h3 style={{ fontSize: 'var(--fs-md)', fontWeight: 600, marginBottom: 'var(--space-5)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <Lock size={18} /> Change Password
                    </h3>
                    {passwordError && (
                        <div style={{
                            padding: 'var(--space-3) var(--space-4)',
                            background: 'rgba(239, 68, 68, 0.12)',
                            borderRadius: 'var(--radius-md)',
                            border: '1px solid rgba(239, 68, 68, 0.3)',
                            color: 'var(--color-danger-light)',
                            fontSize: 'var(--fs-sm)',
                            marginBottom: 'var(--space-4)',
                        }}>
                            {passwordError}
                        </div>
                    )}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                        <div className="input-group">
                            <label>Current Password</label>
                            <input className="input" type="password" placeholder="Enter current password" value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} />
                        </div>
                        <div className="input-group">
                            <label>New Password</label>
                            <input className="input" type="password" placeholder="Enter new password" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                        </div>
                        <div className="input-group">
                            <label>Confirm New Password</label>
                            <input className="input" type="password" placeholder="Confirm new password" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                        </div>
                        <button className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-start' }} onClick={handleUpdatePassword} disabled={passwordSaving}>
                            {passwordSaving ? (
                                <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Updating...</>
                            ) : passwordSaved ? (
                                <><CheckCircle size={14} /> Updated!</>
                            ) : (
                                'Update Password'
                            )}
                        </button>
                    </div>
                </div>

                {/* Billing */}
                <div className="card">
                    <h3 style={{ fontSize: 'var(--fs-md)', fontWeight: 600, marginBottom: 'var(--space-5)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <CreditCard size={18} /> Billing
                    </h3>

                    {/* Current plan */}
                    <div style={{
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        padding: 'var(--space-4)', background: 'var(--bg-glass)',
                        borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-4)',
                    }}>
                        <div>
                            <div className="text-xs text-secondary">Current Plan</div>
                            <div style={{ fontWeight: 600, fontSize: 'var(--fs-md)' }}>
                                {profile.plan === 'free-trial' ? 'Free Plan' : profile.plan.charAt(0).toUpperCase() + profile.plan.slice(1)}
                            </div>
                        </div>
                        <Link href="/upgrade" className="btn btn-secondary btn-sm">Upgrade <ArrowRight size={14} /></Link>
                    </div>

                    {/* Payment summary (real PayPal history) */}
                    {paymentsLoading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-4)' }}>
                            <Loader2 size={20} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-tertiary)' }} />
                        </div>
                    ) : (() => {
                        const paid = payments.filter(p => p.status === 'paid');
                        const totalSpent = paid.reduce((s, p) => s + Number(p.amount), 0);
                        const lastPaid = paid[0];
                        if (paid.length === 0) {
                            return (
                                <p className="text-secondary text-sm" style={{ textAlign: 'center', padding: 'var(--space-3)' }}>
                                    No payments yet.
                                </p>
                            );
                        }
                        return (
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-3)', marginBottom: 'var(--space-4)' }}>
                                <div className="stat-card">
                                    <div className="stat-value">{paid.length}</div>
                                    <div className="stat-label">Payments</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-value">€{totalSpent.toFixed(2)}</div>
                                    <div className="stat-label">Total Spent</div>
                                </div>
                                <div className="stat-card">
                                    <div className="stat-value" style={{ fontSize: 'var(--fs-md)' }}>
                                        {new Date(lastPaid.paid_at || lastPaid.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                    </div>
                                    <div className="stat-label">Last Payment</div>
                                </div>
                            </div>
                        );
                    })()}

                    <Link href="/order-history" className="btn btn-ghost btn-sm" style={{ width: '100%' }}>
                        <Receipt size={14} /> View Order History
                    </Link>
                    <p className="text-xs text-secondary" style={{ textAlign: 'center', marginTop: 'var(--space-3)' }}>
                        Payments are processed securely through PayPal — no card details are stored here.
                    </p>
                </div>
            </div>
        </AppLayout>
    );
}
