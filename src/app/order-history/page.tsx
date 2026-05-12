'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { useAuth } from '@/contexts/AuthContext';
import { getStudentPayments, StudentPaymentRow } from '@/lib/api';
import {
    Loader2, Receipt, CheckCircle2, Clock, XCircle, RotateCcw,
    ShoppingBag, ExternalLink, ArrowLeft,
} from 'lucide-react';
import Link from 'next/link';

const statusConfig: Record<string, { icon: React.ReactNode; label: string; color: string; bg: string }> = {
    paid: {
        icon: <CheckCircle2 size={14} />,
        label: 'Paid',
        color: 'var(--color-success)',
        bg: 'rgba(16,185,129,0.12)',
    },
    pending: {
        icon: <Clock size={14} />,
        label: 'Pending',
        color: 'var(--color-warning)',
        bg: 'rgba(245,158,11,0.12)',
    },
    failed: {
        icon: <XCircle size={14} />,
        label: 'Failed',
        color: 'var(--color-danger)',
        bg: 'rgba(239,68,68,0.12)',
    },
    refunded: {
        icon: <RotateCcw size={14} />,
        label: 'Refunded',
        color: 'var(--color-info)',
        bg: 'rgba(6,182,212,0.12)',
    },
};

function formatDate(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatTime(dateStr: string): string {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

export default function OrderHistoryPage() {
    const { user } = useAuth();
    const [payments, setPayments] = useState<StudentPaymentRow[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user?.id) return;
        getStudentPayments(user.id).then(p => {
            setPayments(p);
            setLoading(false);
        });
    }, [user?.id]);

    if (loading) {
        return (
            <AppLayout>
                <div className="page-wrapper" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                    <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-tertiary)' }} />
                </div>
            </AppLayout>
        );
    }

    const totalSpent = payments
        .filter(p => p.status === 'paid')
        .reduce((sum, p) => sum + Number(p.amount), 0);

    const totalSaved = payments
        .filter(p => p.status === 'paid')
        .reduce((sum, p) => sum + Number(p.discount_amount || 0), 0);

    return (
        <AppLayout>
            <div className="page-wrapper" style={{ maxWidth: '900px' }}>
                <Link href="/dashboard" className="btn btn-ghost btn-sm" style={{ marginBottom: 'var(--space-4)' }}>
                    <ArrowLeft size={16} /> Back to Dashboard
                </Link>

                <div className="page-header">
                    <h1>Order History</h1>
                    <p>View all your purchases and payment records</p>
                </div>

                {/* Stats row */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--space-4)', marginBottom: 'var(--space-6)' }}>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'rgba(37,99,235,0.12)', color: 'var(--brand-accent-light)' }}>
                            <Receipt size={20} />
                        </div>
                        <div className="stat-value">{payments.length}</div>
                        <div className="stat-label">Total Orders</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.12)', color: 'var(--color-success)' }}>
                            <ShoppingBag size={20} />
                        </div>
                        <div className="stat-value">€{totalSpent.toFixed(2)}</div>
                        <div className="stat-label">Total Spent</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.12)', color: 'var(--color-warning)' }}>
                            <RotateCcw size={20} />
                        </div>
                        <div className="stat-value">€{totalSaved.toFixed(2)}</div>
                        <div className="stat-label">Total Saved</div>
                    </div>
                </div>

                {/* Orders list */}
                {payments.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
                        <ShoppingBag size={48} style={{ color: 'var(--text-tertiary)', margin: '0 auto var(--space-4)', opacity: 0.3 }} />
                        <h3 style={{ fontSize: 'var(--fs-lg)', fontWeight: 600, marginBottom: 'var(--space-2)' }}>No orders yet</h3>
                        <p className="text-secondary text-sm" style={{ marginBottom: 'var(--space-5)' }}>
                            Your purchase history will appear here once you buy a course section.
                        </p>
                        <Link href="/upgrade" className="btn btn-primary btn-sm">
                            Browse Courses
                        </Link>
                    </div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                        {payments.map(payment => {
                            const cfg = statusConfig[payment.status] || statusConfig.pending;
                            return (
                                <div
                                    key={payment.id}
                                    className="card"
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 'var(--space-5)',
                                        padding: 'var(--space-4) var(--space-5)',
                                        flexWrap: 'wrap',
                                    }}
                                >
                                    {/* Status icon */}
                                    <div style={{
                                        width: 44, height: 44, borderRadius: 'var(--radius-md)',
                                        background: cfg.bg, color: cfg.color,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        flexShrink: 0,
                                    }}>
                                        <Receipt size={20} />
                                    </div>

                                    {/* Details */}
                                    <div style={{ flex: 1, minWidth: 200 }}>
                                        <div style={{ fontWeight: 600, fontSize: 'var(--fs-sm)', marginBottom: 2 }}>
                                            {payment.course_name || 'Course'} — {payment.section_name || 'Section'}
                                        </div>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)' }}>
                                            <span>{formatDate(payment.created_at)}</span>
                                            <span>•</span>
                                            <span>{formatTime(payment.created_at)}</span>
                                            {payment.paypal_order_id && (
                                                <>
                                                    <span>•</span>
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                                        <ExternalLink size={10} />
                                                        {payment.paypal_order_id.slice(0, 12)}…
                                                    </span>
                                                </>
                                            )}
                                        </div>
                                    </div>

                                    {/* Discount tag */}
                                    {payment.discount_amount > 0 && (
                                        <span style={{
                                            fontSize: 'var(--fs-xs)', color: 'var(--color-success)',
                                            background: 'rgba(16,185,129,0.1)', padding: '2px 8px',
                                            borderRadius: 'var(--radius-full)', fontWeight: 500,
                                        }}>
                                            −€{Number(payment.discount_amount).toFixed(2)} off
                                        </span>
                                    )}

                                    {/* Amount */}
                                    <div style={{ fontWeight: 700, fontSize: 'var(--fs-lg)', whiteSpace: 'nowrap' }}>
                                        €{Number(payment.amount).toFixed(2)}
                                    </div>

                                    {/* Status badge */}
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: 4,
                                        padding: '4px 10px', borderRadius: 'var(--radius-full)',
                                        background: cfg.bg, color: cfg.color,
                                        fontSize: 'var(--fs-xs)', fontWeight: 600,
                                        whiteSpace: 'nowrap',
                                    }}>
                                        {cfg.icon}
                                        {cfg.label}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </AppLayout>
    );
}
