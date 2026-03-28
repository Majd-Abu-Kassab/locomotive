'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import AppLayout from '@/components/AppLayout';
import { Check, Crown, Zap, Star, Tag, Loader2, Lock, Unlock, CreditCard, CheckCircle } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { getCourses, getCourseSections, validateCoupon, createPaymentRecord, CourseWithModules, CourseSection } from '@/lib/api';
import './upgrade.css';

function UpgradeContent() {
    const { user } = useAuth();
    const { addToast } = useToast();
    const searchParams = useSearchParams();

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
    const [paypalLoading, setPaypalLoading] = useState(false);
    const [loading, setLoading] = useState(true);

    // Handle post-payment redirect
    const status = searchParams.get('status');

    useEffect(() => {
        if (status === 'success') addToast('Payment successful! Access granted.', 'success');
        if (status === 'cancelled') addToast('Payment cancelled.', 'info');
    }, [status, addToast]);

    useEffect(() => {
        getCourses(user?.id).then(c => { setCourses(c); setLoading(false); });
    }, [user]);

    useEffect(() => {
        if (selectedCourseId) {
            getCourseSections(selectedCourseId, user?.id).then(s => {
                setSections(s);
                setSelectedSection(null);
            });
        }
    }, [selectedCourseId, user]);

    const finalPrice = selectedSection ? Math.max(0, selectedSection.price - discount) : 0;

    const handleApplyCoupon = async () => {
        if (!couponCode.trim() || !selectedSection) return;
        setCouponLoading(true);
        const result = await validateCoupon(couponCode, selectedSection.price);
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
        setCouponLoading(false);
    };

    const handlePayWithPayPal = async () => {
        if (!selectedSection || !user) {
            addToast('Please select a section and ensure you are logged in.', 'error');
            return;
        }

        setPaypalLoading(true);
        try {
            // 1. Create PayPal order
            const orderRes = await fetch('/api/paypal/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    amount: finalPrice,
                    currency: selectedSection.currency || 'EUR',
                    description: `${courses.find(c => c.id === selectedCourseId)?.name} — ${selectedSection.name}`,
                }),
            });
            const orderData = await orderRes.json();

            if (!orderData.orderId) {
                addToast('Failed to create PayPal order. Please try again.', 'error');
                setPaypalLoading(false);
                return;
            }

            // 2. Create pending payment record in our DB
            await createPaymentRecord({
                user_id: user.id,
                section_id: selectedSection.id,
                amount: finalPrice,
                currency: selectedSection.currency || 'EUR',
                paypal_order_id: orderData.orderId,
                coupon_id: couponId,
                discount_amount: discount,
            });

            // 3. Redirect to PayPal
            window.location.href = orderData.approvalUrl;
        } catch (err) {
            console.error(err);
            addToast('Something went wrong. Please try again.', 'error');
            setPaypalLoading(false);
        }
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

    return (
        <AppLayout>
            <div className="page-wrapper">
                <div className="page-header" style={{ textAlign: 'center' }}>
                    <h1>Unlock Course Access</h1>
                    <p>Pay per section and retain access to everything you&apos;ve paid for until the exam date</p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 400px', gap: 'var(--space-8)', alignItems: 'start' }}>

                    {/* Left: Course + Section selector */}
                    <div>
                        {/* Step 1: Choose course */}
                        <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
                            <h3 style={{ fontSize: 'var(--fs-md)', fontWeight: 600, marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                <span style={{ background: 'var(--brand-accent)', color: 'white', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--fs-xs)', fontWeight: 700, flexShrink: 0 }}>1</span>
                                Choose a Course
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 'var(--space-3)' }}>
                                {courses.map(course => (
                                    <button
                                        key={course.id}
                                        onClick={() => setSelectedCourseId(course.id)}
                                        style={{
                                            padding: 'var(--space-3)',
                                            border: `2px solid ${selectedCourseId === course.id ? course.color : 'var(--border-primary)'}`,
                                            borderRadius: 'var(--radius-md)',
                                            background: selectedCourseId === course.id ? `${course.color}11` : 'var(--bg-glass)',
                                            cursor: 'pointer',
                                            textAlign: 'left',
                                            transition: 'all var(--transition-base)',
                                        }}
                                    >
                                        <div style={{ fontSize: '1.5rem', marginBottom: 'var(--space-1)' }}>{course.icon}</div>
                                        <div style={{ fontWeight: 600, fontSize: 'var(--fs-sm)', color: selectedCourseId === course.id ? course.color : 'var(--text-primary)' }}>{course.name}</div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Step 2: Choose section */}
                        {selectedCourseId && (
                            <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
                                <h3 style={{ fontSize: 'var(--fs-md)', fontWeight: 600, marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                    <span style={{ background: 'var(--brand-accent)', color: 'white', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'var(--fs-xs)', fontWeight: 700, flexShrink: 0 }}>2</span>
                                    Choose a Section / Installment
                                </h3>
                                {sections.length === 0 ? (
                                    <p className="text-secondary text-sm">No sections configured for this course yet. Contact support.</p>
                                ) : (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                                        {sections.map(section => (
                                            <button
                                                key={section.id}
                                                onClick={() => { if (!section.unlocked) { setSelectedSection(section); setDiscount(0); setCouponCode(''); setCouponValid(null); setCouponMsg(''); } }}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
                                                    padding: 'var(--space-4)',
                                                    border: `2px solid ${selectedSection?.id === section.id ? 'var(--brand-accent)' : section.unlocked ? 'var(--color-success)' : 'var(--border-primary)'}`,
                                                    borderRadius: 'var(--radius-md)',
                                                    background: section.unlocked ? 'rgba(16,185,129,0.05)' : selectedSection?.id === section.id ? 'rgba(37,99,235,0.07)' : 'var(--bg-glass)',
                                                    cursor: section.unlocked ? 'default' : 'pointer',
                                                    textAlign: 'left', width: '100%',
                                                    transition: 'all var(--transition-base)',
                                                }}
                                            >
                                                <div style={{
                                                    width: 40, height: 40, borderRadius: 'var(--radius-md)', flexShrink: 0,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
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
                                                <div style={{ fontWeight: 700, fontSize: 'var(--fs-lg)', color: section.unlocked ? 'var(--color-success)' : 'var(--text-primary)', whiteSpace: 'nowrap' }}>
                                                    {section.unlocked ? <CheckCircle size={20} /> : `€${Number(section.price).toFixed(2)}`}
                                                </div>
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}

                        {/* What&apos;s included */}
                        <div className="card">
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

                    {/* Right: Checkout panel */}
                    <div style={{ position: 'sticky', top: 'var(--space-6)' }}>
                        <div className="card">
                            <h3 style={{ fontSize: 'var(--fs-md)', fontWeight: 600, marginBottom: 'var(--space-5)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                <CreditCard size={18} /> Checkout
                            </h3>

                            {!selectedSection ? (
                                <div style={{ textAlign: 'center', padding: 'var(--space-8) 0', color: 'var(--text-tertiary)' }}>
                                    <Crown size={32} style={{ margin: '0 auto var(--space-3)', opacity: 0.3 }} />
                                    <p className="text-sm">Select a course and section to continue</p>
                                </div>
                            ) : (
                                <>
                                    {/* Order summary */}
                                    <div style={{ background: 'var(--bg-glass)', borderRadius: 'var(--radius-md)', padding: 'var(--space-4)', marginBottom: 'var(--space-5)' }}>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                                            <span className="text-sm text-secondary">Course</span>
                                            <span className="text-sm font-semibold">{courses.find(c => c.id === selectedCourseId)?.name}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)' }}>
                                            <span className="text-sm text-secondary">Section</span>
                                            <span className="text-sm font-semibold">{selectedSection.name}</span>
                                        </div>
                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: discount > 0 ? 'var(--space-2)' : 0 }}>
                                            <span className="text-sm text-secondary">Price</span>
                                            <span className="text-sm font-semibold">€{Number(selectedSection.price).toFixed(2)}</span>
                                        </div>
                                        {discount > 0 && (
                                            <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                                                <span className="text-sm" style={{ color: 'var(--color-success)' }}>Discount</span>
                                                <span className="text-sm font-semibold" style={{ color: 'var(--color-success)' }}>−€{discount.toFixed(2)}</span>
                                            </div>
                                        )}
                                        <div style={{ borderTop: '1px solid var(--border-primary)', marginTop: 'var(--space-3)', paddingTop: 'var(--space-3)', display: 'flex', justifyContent: 'space-between' }}>
                                            <span style={{ fontWeight: 700 }}>Total</span>
                                            <span style={{ fontWeight: 700, fontSize: 'var(--fs-xl)', color: 'var(--brand-accent-light)' }}>€{finalPrice.toFixed(2)}</span>
                                        </div>
                                    </div>

                                    {/* Coupon */}
                                    <div style={{ marginBottom: 'var(--space-5)' }}>
                                        <label style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                                            <Tag size={14} /> Coupon Code
                                        </label>
                                        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
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
                                            <p style={{ fontSize: 'var(--fs-xs)', marginTop: 'var(--space-1)', color: couponValid ? 'var(--color-success)' : 'var(--color-danger)' }}>
                                                {couponMsg}
                                            </p>
                                        )}
                                    </div>

                                    {/* PayPal button */}
                                    <button
                                        className="btn btn-primary btn-lg"
                                        style={{ width: '100%', marginBottom: 'var(--space-3)' }}
                                        onClick={handlePayWithPayPal}
                                        disabled={paypalLoading || !user}
                                    >
                                        {paypalLoading ? (
                                            <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Processing...</>
                                        ) : (
                                            <><Star size={16} /> Pay €{finalPrice.toFixed(2)} with PayPal</>
                                        )}
                                    </button>
                                    <p className="text-xs text-secondary" style={{ textAlign: 'center' }}>
                                        🔒 Secured by PayPal. No card stored on our servers.
                                    </p>

                                    {/* Trust badges */}
                                    <div style={{ display: 'flex', justifyContent: 'center', gap: 'var(--space-4)', marginTop: 'var(--space-4)', flexWrap: 'wrap' }}>
                                        {['Access until exam date', 'Keep paid sections forever', 'Instant unlock'].map((t, i) => (
                                            <span key={i} style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)', display: 'flex', alignItems: 'center', gap: 4 }}>
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
