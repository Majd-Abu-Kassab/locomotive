'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { User, Mail, Lock, CreditCard, Save, Loader2, CheckCircle, Target, Calendar, BookOpen } from 'lucide-react';
import { useSupabase } from '@/contexts/SupabaseContext';

export default function ProfilePage() {
    const { profile, updateProfile } = useAuth();
    const supabase = useSupabase();
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

    // Study preferences state
    const [focusSubjects, setFocusSubjects] = useState<string[]>([]);
    const [examDate, setExamDate] = useState('');
    const [studyHours, setStudyHours] = useState('2');
    const [prefSaving, setPrefSaving] = useState(false);
    const [prefSaved, setPrefSaved] = useState(false);

    const ALL_SUBJECTS = ['Biology', 'Chemistry', 'Physics', 'Mathematics', 'Logic', 'General Knowledge', 'Reading'];

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

    const displayName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'User';

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
                    <button className="btn btn-secondary btn-sm" style={{ marginLeft: 'auto' }}>Change Photo</button>
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
                                {ALL_SUBJECTS.map(s => {
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

                {/* Payment */}
                <div className="card">
                    <h3 style={{ fontSize: 'var(--fs-md)', fontWeight: 600, marginBottom: 'var(--space-5)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <CreditCard size={18} /> Payment Methods
                    </h3>
                    <div style={{
                        padding: 'var(--space-5)', background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)',
                        border: '1px dashed var(--border-primary)', textAlign: 'center',
                    }}>
                        <p className="text-secondary text-sm" style={{ marginBottom: 'var(--space-3)' }}>
                            No payment method on file
                        </p>
                        <button className="btn btn-secondary btn-sm">
                            <CreditCard size={14} /> Add Payment Method
                        </button>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
