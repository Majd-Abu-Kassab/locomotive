'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { User, Mail, Lock, CreditCard, Save, Loader2, CheckCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase';

export default function ProfilePage() {
    const { profile, updateProfile } = useAuth();
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

    useEffect(() => {
        if (profile) {
            setFirstName(profile.first_name || '');
            setLastName(profile.last_name || '');
            setEmail(profile.email || '');
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
        const supabase = createClient();
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
                                ? `Free Trial • ${profile.trial_days_remaining} days remaining`
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
