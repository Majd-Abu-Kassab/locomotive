'use client';

import AppLayout from '@/components/AppLayout';
import { Send, Mail, MessageSquare } from 'lucide-react';

export default function ContactPage() {
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

                    <form style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-5)' }} onSubmit={e => e.preventDefault()}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                            <div className="input-group">
                                <label>First Name</label>
                                <input className="input" placeholder="John" />
                            </div>
                            <div className="input-group">
                                <label>Last Name</label>
                                <input className="input" placeholder="Doe" />
                            </div>
                        </div>
                        <div className="input-group">
                            <label>Email</label>
                            <div style={{ position: 'relative' }}>
                                <Mail size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
                                <input className="input" type="email" placeholder="you@example.com" style={{ paddingLeft: 40 }} />
                            </div>
                        </div>
                        <div className="input-group">
                            <label>Subject</label>
                            <select className="select">
                                <option>General Inquiry</option>
                                <option>Technical Issue</option>
                                <option>Billing Question</option>
                                <option>Feature Request</option>
                                <option>Report a Bug</option>
                            </select>
                        </div>
                        <div className="input-group">
                            <label>Message</label>
                            <textarea className="input" placeholder="Describe your issue or question..." style={{ height: '150px', resize: 'vertical' }} />
                        </div>
                        <button type="submit" className="btn btn-primary btn-lg" style={{ alignSelf: 'flex-start' }}>
                            <Send size={16} /> Send Message
                        </button>
                    </form>
                </div>
            </div>
        </AppLayout>
    );
}
