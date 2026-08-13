'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { Send, Mail, MessageSquare, Loader2, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSupabase } from '@/contexts/SupabaseContext';
import { useToast } from '@/components/Toast';
import { submitSupportMessage } from '@/lib/api';

const SUBJECTS = ['General Inquiry', 'Technical Issue', 'Billing Question', 'Feature Request', 'Report a Bug'];

export default function ContactPage() {
    const { profile, user } = useAuth();
    const supabase = useSupabase();
    const { addToast } = useToast();

    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [email, setEmail] = useState('');
    const [subject, setSubject] = useState(SUBJECTS[0]);
    const [message, setMessage] = useState('');
    const [sending, setSending] = useState(false);
    const [sent, setSent] = useState(false);

    // Prefill from the signed-in profile once it loads (don't clobber edits).
    useEffect(() => {
        if (profile) {
            setFirstName(prev => prev || profile.first_name || '');
            setLastName(prev => prev || profile.last_name || '');
            setEmail(prev => prev || profile.email || '');
        }
    }, [profile]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!email.trim() || !message.trim()) {
            addToast('Please add your email and a message.', 'warning');
            return;
        }

        setSending(true);
        const { error } = await submitSupportMessage(supabase, {
            user_id: user?.id ?? null,
            first_name: firstName.trim() || null,
            last_name: lastName.trim() || null,
            email: email.trim(),
            subject,
            message: message.trim(),
        });
        setSending(false);

        if (error) {
            addToast('Something went wrong sending your message. Please try again.', 'error');
            return;
        }

        setSent(true);
        setMessage('');
        addToast('Message sent — we’ll get back to you soon!', 'success');
    };

    return (
        <AppLayout>
            <div className="page-wrapper" style={{ maxWidth: '700px' }}>
                <div className="page-header">
                    <h1>Contact Support</h1>
                    <p>We&apos;re here to help you succeed</p>
                </div>

                <div className="card">
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-6)' }}>
                        <div style={{
                            width: 48, height: 48, borderRadius: 'var(--radius-md)',
                            background: 'rgba(37,99,235,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: 'var(--brand-accent-light)',
                        }}>
                            <MessageSquare size={24} />
                        </div>
                        <div>
                            <h2 style={{ fontSize: 'var(--fs-lg)', fontWeight: 600 }}>Send us a message</h2>
                            <p className="text-sm text-secondary">We typically respond within 24 hours</p>
                        </div>
                    </div>

                    {sent ? (
                        <div style={{ textAlign: 'center', padding: 'var(--space-8) 0' }}>
                            <CheckCircle2 size={48} style={{ color: 'var(--color-success)', margin: '0 auto var(--space-4)' }} />
                            <h3 style={{ fontSize: 'var(--fs-lg)', fontWeight: 600, marginBottom: 'var(--space-2)' }}>Message sent!</h3>
                            <p className="text-sm text-secondary" style={{ marginBottom: 'var(--space-6)' }}>
                                Thanks for reaching out. Our team will get back to you at <strong>{email}</strong> within 24 hours.
                            </p>
                            <button className="btn btn-secondary" onClick={() => setSent(false)}>
                                Send another message
                            </button>
                        </div>
                    ) : (
                        <form style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }} onSubmit={handleSubmit}>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 'var(--space-4)' }}>
                                <div className="input-group">
                                    <label>First Name</label>
                                    <input className="input" placeholder="John" value={firstName} onChange={e => setFirstName(e.target.value)} disabled={sending} />
                                </div>
                                <div className="input-group">
                                    <label>Last Name</label>
                                    <input className="input" placeholder="Doe" value={lastName} onChange={e => setLastName(e.target.value)} disabled={sending} />
                                </div>
                            </div>
                            <div className="input-group">
                                <label>Email</label>
                                <div style={{ position: 'relative' }}>
                                    <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                                    <input className="input" type="email" placeholder="you@example.com" style={{ paddingLeft: 40 }} value={email} onChange={e => setEmail(e.target.value)} required disabled={sending} />
                                </div>
                            </div>
                            <div className="input-group">
                                <label>Subject</label>
                                <select className="select" value={subject} onChange={e => setSubject(e.target.value)} disabled={sending}>
                                    {SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}
                                </select>
                            </div>
                            <div className="input-group">
                                <label>Message</label>
                                <textarea className="input" placeholder="Describe your issue or question..." style={{ height: '150px', resize: 'vertical' }} value={message} onChange={e => setMessage(e.target.value)} required disabled={sending} />
                            </div>
                            <button type="submit" className="btn btn-primary btn-lg" style={{ alignSelf: 'flex-start' }} disabled={sending}>
                                {sending ? (
                                    <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Sending...</>
                                ) : (
                                    <><Send size={16} /> Send Message</>
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
