'use client';

import { useState, useEffect, Suspense } from 'react';
import AppLayout from '@/components/AppLayout';
import {
    Check, Crown, Zap, Star, Tag, Loader2, Lock, Unlock,
    CreditCard, CheckCircle, ShieldCheck,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { useSupabase } from '@/contexts/SupabaseContext';
import { useAbortController, isAbortError } from '@/hooks/useAbortController';
import {
    getCourses, getCourseSections, validateCoupon, createPaymentRecord,
    CourseWithModules, CourseSection,
} from '@/lib/api';
import { PayPalScriptProvider, PayPalButtons } from '@paypal/react-paypal-js';
import './upgrade.css';

/* ─── PayPal wrapper ─── */
// Note: price and coupon are now validated SERVER-SIDE.
// The client only passes sectionId + couponCode; the server resolves the final price.
function PayPalCheckoutButtons({
    sectionCurrency,
    sectionId,
    couponCode,
    onSuccess,
    onError,
}: {
    sectionCurrency: string;
    sectionId: string;
    couponCode: string;
    onSuccess: () => void;
    onError: (msg: string) => void;
}) {
    const supabase = useSupabase();

    return (
        <PayPalScriptProvider
            options={{
                clientId: process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID || '',
                currency: sectionCurrency,
                intent: 'capture',
            }}
        >
            <div className="paypal-buttons-wrapper">
                <PayPalButtons
                    style={{
                        layout: 'vertical',
                        color: 'blue',
                        shape: 'rect',
                        label: 'pay',
                        height: 48,
                    }}
                    fundingSource={undefined}
                    createOrder={async () => {
                        // Server resolves price from sectionId (client cannot manipulate amount)
                        const res = await fetch('/api/paypal/create-order', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                sectionId,
                                currency: sectionCurrency,
                                couponCode: couponCode || undefined,
                            }),
                        });
                        const data = await res.json();
                        if (!data.orderId) {
                            const errMsg = data.error || data.details?.message || 'Failed to create PayPal order';
                            onError(`PayPal error: ${errMsg} (status ${res.status})`);
                            throw new Error('No orderId: ' + JSON.stringify(data));
                        }

                        // Create pending payment record using server-computed values
                        await createPaymentRecord(supabase, {
                            // user_id will be resolved from session server-side;
                            // we pass a placeholder here and the capture route will use the verified user
                            user_id: '',  // filled in by server via session
                            section_id: sectionId,
                            amount: data.finalPrice,
                            currency: sectionCurrency,
                            paypal_order_id: data.orderId,
                            coupon_id: data.couponId || null,
                            discount_amount: data.discountAmount || 0,
                        });

                        return data.orderId;
                    }}
                    onApprove={async (data) => {
                        try {
                            // userId is NOT sent — server uses the authenticated session
                            const captureRes = await fetch('/api/paypal/capture-order', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                    orderId: data.orderID,
                                    sectionId,
                                }),
                            });
                            const captureData = await captureRes.json();
                            if (captureData.success) {
                                onSuccess();
                            } else {
                                onError('Payment received but access grant failed. Contact support.');
                            }
                        } catch {
                            onError('Payment processing error. Contact support.');
                        }
                    }}
                    onError={() => {
                        onError('PayPal encountered an error. Please try again.');
                    }}
                    onCancel={() => {
                        onError('Payment cancelled.');
                    }}
                />
            </div>
        </PayPalScriptProvider>
    );
}

/* ─── Main Page ─── */
function UpgradeContent() {
    const { user } = useAuth();
    const { addToast } = useToast();
    const supabase = useSupabase();
    const { getSignal } = useAbortController();

    const [courses, setCourses] = useState<CourseWithModules[]>([]);
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [sections, setSections] = useState<CourseSection[]>([]);
    const [selectedSection, setSelectedSection] = useState<CourseSection | null>(null);
    const [couponCode, setCouponCode] = useState('');
    const [couponLoading, setCouponLoading] = useState(false);
    const [discount, setDiscount] = useState(0);
    const [couponId, setCouponId] = useState<string | null>(null);
    const [couponMsg, setCouponMsg] = useState('');
    const [couponValid, setCouponValid] = useState<boolean | null>(null);
    const [loading, setLoading] = useState(true);
    const [paymentSuccess, setPaymentSuccess] = useState(false);

    useEffect(() => {
        const signal = getSignal();
        async function fetchCourses() {
            try {
                const c = await getCourses(supabase, user?.id, signal);
                setCourses(c);
            } catch (err) {
                if (isAbortError(err)) return;
                console.error('Error fetching courses:', err);
            } finally {
                setLoading(false);
            }
        }
        fetchCourses();
    }, [user, supabase, getSignal]);

    useEffect(() => {
        if (!selectedCourseId) return;
        const signal = getSignal();
        async function fetchSections() {
            try {
                const s = await getCourseSections(supabase, selectedCourseId, user?.id, signal);
                setSections(s);
                setSelectedSection(null);
            } catch (err) {
                if (isAbortError(err)) return;
                console.error('Error fetching course sections:', err);
            }
        }
        fetchSections();
    }, [selectedCourseId, user, supabase, getSignal]);

    const finalPrice = selectedSection ? Math.max(0, selectedSection.price - discount) : 0;

    const handleApplyCoupon = async () => {
        if (!couponCode.trim() || !selectedSection) return;
        setCouponLoading(true);
        try {
            const result = await validateCoupon(supabase, couponCode, selectedSection.price);
            setCouponValid(result.valid);
            setCouponMsg(result.message);
            if (result.valid) {
                setDiscount(result.discount);
                setCouponId(result.coupon?.id || null);
                addToast(result.message, 'success');
            } else {
                setDiscount(0);
                setCouponId(null);
            }
        } catch (err) {
            console.error('Error validating coupon:', err);
            addToast('Error validating coupon', 'error');
        } finally {
            setCouponLoading(false);
        }
    };

    const handlePaymentSuccess = () => {
        setPaymentSuccess(true);
        addToast('Payment successful! Section access granted. 🎉', 'success');
    };

    const handlePaymentError = (msg: string) => {
        addToast(msg, 'error');
    };

    if (loading) {
        return (
            <AppLayout>
                <div className="page-wrapper" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                    <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-tertiary)' }} />
                </div>
            </AppLayout>
        );
    }

    // Success state
    if (paymentSuccess) {
        return (
            <AppLayout>
                <div className="page-wrapper" style={{ maxWidth: '600px', margin: '0 auto', textAlign: 'center', paddingTop: 'var(--space-16)' }}>
                    <div style={{
                        width: 80, height: 80, borderRadius: '50%',
                        background: 'rgba(16,185,129,0.15)', color: 'var(--color-success)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        margin: '0 auto var(--space-5)',
                        animation: 'scaleIn 0.4s ease-out',
                    }}>
                        <CheckCircle size={40} />
                    </div>
                    <h1 style={{ fontSize: 'var(--fs-3xl)', fontWeight: 700, marginBottom: 'var(--space-3)' }}>
                        Payment Successful! 🎉
                    </h1>
                    <p className="text-secondary" style={{ marginBottom: 'var(--space-6)', fontSize: 'var(--fs-md)' }}>
                        Your section has been unlocked. You can now access all the lessons and materials.
                    </p>
                    <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center' }}>
                        <a href={`/courses/${selectedCourseId}`} className="btn btn-primary">
                            Go to Course
                        </a>
                        <button className="btn btn-secondary" onClick={() => { setPaymentSuccess(false); setSelectedSection(null); }}>
                            Buy Another Section
                        </button>
                    </div>
                </div>
            </AppLayout>
        );
    }

    return (
        <AppLayout>
            <div className="page-wrapper">
                <div className="page-header" style={{ textAlign: 'center' }}>
                    <h1>Unlock Course Access</h1>
                    <p>Pay per section and retain access to everything you&apos;ve paid for until the exam date</p>
                </div>

                <div className="checkout-grid">

                    {/* ═══ Left Column ═══ */}
                    <div className="checkout-main">

                        {/* Step 1: Choose course */}
                        <div className="card checkout-step">
                            <h3 className="checkout-step-title">
                                <span className="step-number">1</span>
                                Choose a Course
                            </h3>
                            <div className="course-grid">
                                {courses.map(course => (
                                    <button
                                        key={course.id}
                                        onClick={() => setSelectedCourseId(course.id)}
                                        className={`course-card ${selectedCourseId === course.id ? 'selected' : ''}`}
                                        style={{
                                            borderColor: selectedCourseId === course.id ? course.color : undefined,
                                            background: selectedCourseId === course.id ? `${course.color}11` : undefined,
                                        }}
                                    >
                                        <div style={{ fontSize: '1.5rem', marginBottom: 'var(--space-1)' }}>{course.icon}</div>
                                        <div style={{
                                            fontWeight: 600, fontSize: 'var(--fs-sm)',
                                            color: selectedCourseId === course.id ? course.color : 'var(--text-primary)',
                                        }}>{course.name}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Step 2: Choose section */}
                        {selectedCourseId && (
                            <div className="card checkout-step">
                                <h3 className="checkout-step-title">
                                    <span className="step-number">2</span>
                                    Choose a Section / Installment
                                </h3>
                                {sections.length === 0 ? (
                                    <p className="text-secondary text-sm">No sections configured for this course yet. Contact support.</p>
                                ) : (
                                    <div className="section-list">
                                        {sections.map(section => (
                                            <button
                                                key={section.id}
                                                onClick={() => {
                                                    if (!section.unlocked) {
                                                        setSelectedSection(section);
                                                        setDiscount(0);
                                                        setCouponCode('');
                                                        setCouponValid(null);
                                                        setCouponMsg('');
                                                    }
                                                }}
                                                className={`section-card ${selectedSection?.id === section.id ? 'selected' : ''} ${section.unlocked ? 'unlocked' : ''}`}
                                            >
                                                <div className="section-icon-wrap" style={{
                                                    background: section.unlocked ? 'rgba(16,185,129,0.15)' : 'rgba(37,99,235,0.1)',
                                                    color: section.unlocked ? 'var(--color-success)' : 'var(--brand-accent-light)',
                                                }}>
                                                    {section.unlocked ? <Unlock size={18} /> : <Lock size={18} />}
                                                </div>
                                                <div style={{ flex: 1 }}>
                                                    <div style={{ fontWeight: 600, fontSize: 'var(--fs-sm)', marginBottom: 2 }}>
                                                        Section {section.section_number}: {section.name}
                                                    </div>
                                                    <div className="text-xs text-secondary">
                                                        {section.unlocked ? '✅ Access granted until exam date' : `${(section.moduleIds || []).length} modules included`}
                                                    </div>
                                                </div>
                                                <div style={{
                                                    fontWeight: 700, fontSize: 'var(--fs-lg)',
                                                    color: section.unlocked ? 'var(--color-success)' : 'var(--text-primary)',
                                                    whiteSpace: 'nowrap',
                                                }}>
                                                    {section.unlocked ? <CheckCircle size={20} /> : `€${Number(section.price).toFixed(2)}`}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Step 3: Payment */}
                        {selectedSection && (
                            <div className="card checkout-step">
                                <h3 className="checkout-step-title">
                                    <span className="step-number">3</span>
                                    Payment
                                </h3>

                                <p className="text-sm text-secondary" style={{ marginBottom: 'var(--space-4)' }}>
                                    Choose your preferred payment method. Both PayPal and Credit/Debit card are accepted.
                                </p>

                                {/* PayPal Buttons */}
                                {user && (
                                    <PayPalCheckoutButtons
                                        sectionCurrency={selectedSection.currency || 'EUR'}
                                        sectionId={selectedSection.id}
                                        couponCode={couponCode}
                                        onSuccess={handlePaymentSuccess}
                                        onError={handlePaymentError}
                                    />
                                )}

                                {/* Security note */}
                                <div className="security-note">
                                    <ShieldCheck size={16} />
                                    <span>Secured by PayPal. Card details are never stored on our servers.</span>
                                </div>
                            </div>
                        )}

                        {/* What's included */}
                        <div className="card checkout-step">
                            <h3 style={{ fontSize: 'var(--fs-md)', fontWeight: 600, marginBottom: 'var(--space-4)' }}>What&apos;s included in every section</h3>
                            {[
                                'Access to all lessons in the section (videos, PDFs, quizzes)',
                                'Unlimited practice questions for covered topics',
                                'Access retained until the exam expiry date',
                                'Studying stops when you stop paying — content you paid for is always yours',
                                'Full test simulation with IMAT scoring (+1.5/−0.4/0)',
                            ].map((f, i) => (
                                <div key={i} style={{ display: 'flex', gap: 'var(--space-3)', marginBottom: 'var(--space-3)', alignItems: 'start' }}>
                                    <Check size={16} style={{ color: 'var(--color-success)', flexShrink: 0, marginTop: 2 }} />
                                    <span style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)' }}>{f}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ═══ Right Column: Order Summary ═══ */}
                    <div className="checkout-sidebar">
                        <div className="card checkout-summary">
                            <h3 className="summary-title">
                                <CreditCard size={18} /> Order Summary
                            </h3>

                            {!selectedSection ? (
                                <div className="summary-empty">
                                    <Crown size={32} style={{ opacity: 0.3, marginBottom: 'var(--space-3)' }} />
                                    <p className="text-sm">Select a course and section to continue</p>
                                </div>
                            ) : (
                                <>
                                    {/* Line items */}
                                    <div className="summary-items">
                                        <div className="summary-row">
                                            <span className="text-sm text-secondary">Course</span>
                                            <span className="text-sm font-semibold">{courses.find(c => c.id === selectedCourseId)?.name}</span>
                                        </div>
                                        <div className="summary-row">
                                            <span className="text-sm text-secondary">Section</span>
                                            <span className="text-sm font-semibold">{selectedSection.name}</span>
                                        </div>
                                        <div className="summary-row">
                                            <span className="text-sm text-secondary">Price</span>
                                            <span className="text-sm font-semibold">€{Number(selectedSection.price).toFixed(2)}</span>
                                        </div>
                                        {discount > 0 && (
                                            <div className="summary-row">
                                                <span className="text-sm" style={{ color: 'var(--color-success)' }}>Discount</span>
                                                <span className="text-sm font-semibold" style={{ color: 'var(--color-success)' }}>−€{discount.toFixed(2)}</span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Total */}
                                    <div className="summary-total">
                                        <span style={{ fontWeight: 700 }}>Total</span>
                                        <span className="summary-total-price">€{finalPrice.toFixed(2)}</span>
                                    </div>

                                    {/* Coupon */}
                                    <div className="coupon-section">
                                        <label className="coupon-label">
                                            <Tag size={14} /> Coupon Code
                                        </label>
                                        <div className="coupon-input-row">
                                            <input
                                                className="input"
                                                value={couponCode}
                                                onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponValid(null); setCouponMsg(''); }}
                                                placeholder="e.g. SUMMER20"
                                                style={{ flex: 1, textTransform: 'uppercase' }}
                                                onKeyDown={e => e.key === 'Enter' && handleApplyCoupon()}
                                            />
                                            <button className="btn btn-secondary btn-sm" onClick={handleApplyCoupon} disabled={couponLoading || !couponCode.trim()}>
                                                {couponLoading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : 'Apply'}
                                            </button>
                                        </div>
                                        {couponMsg && (
                                            <p className="coupon-msg" style={{ color: couponValid ? 'var(--color-success)' : 'var(--color-danger)' }}>
                                                {couponMsg}
                                            </p>
                                        )}
                                    </div>

                                    {/* Trust badges */}
                                    <div className="trust-badges">
                                        {['Access until exam date', 'Keep paid sections forever', 'Instant unlock'].map((t, i) => (
                                            <span key={i} className="trust-badge">
                                                <Zap size={10} style={{ color: 'var(--color-warning)' }} /> {t}
                                            </span>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}

export default function UpgradePage() {
    return (
        <Suspense fallback={
            <AppLayout>
                <div className="page-wrapper" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                    <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-tertiary)' }} />
                </div>
            </AppLayout>
        }>
            <UpgradeContent />
        </Suspense>
    );
}
