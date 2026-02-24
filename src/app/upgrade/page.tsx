'use client';

import AppLayout from '@/components/AppLayout';
import { Check, Crown, Zap, Star } from 'lucide-react';
import './upgrade.css';

const plans = [
    {
        name: 'Free Trial',
        price: '€0',
        period: '3 days',
        current: true,
        features: [
            '5 practice tests',
            'Basic course access',
            'Limited question pool',
            'Dashboard & analytics',
        ],
        missingFeatures: [
            'Full course library',
            'IMAT simulation mode',
            'Priority support',
            'Offline access',
        ],
    },
    {
        name: 'Monthly',
        price: '€29',
        period: '/month',
        popular: true,
        features: [
            'Unlimited practice tests',
            'Full 7-course library',
            'All question pools (3000+)',
            'IMAT simulation mode',
            'Performance analytics',
            'Study planner',
            'Priority support',
        ],
        missingFeatures: [],
    },
    {
        name: 'Yearly',
        price: '€199',
        period: '/year',
        savings: 'Save 43%',
        features: [
            'Everything in Monthly',
            '12 months access',
            'Exclusive study guides',
            'Early access to new content',
            'Community forum access',
            'Certificate of completion',
            '1-on-1 tutor session',
        ],
        missingFeatures: [],
    },
];

export default function UpgradePage() {
    return (
        <AppLayout>
            <div className="page-wrapper">
                <div className="page-header" style={{ textAlign: 'center' }}>
                    <h1>Upgrade Your Plan</h1>
                    <p>Unlock the full LOCOMOTIVE experience and ace your IMAT exam</p>
                </div>

                <div className="pricing-grid">
                    {plans.map(plan => (
                        <div key={plan.name} className={`pricing-card ${plan.popular ? 'popular' : ''} ${plan.current ? 'current' : ''}`}>
                            {plan.popular && <div className="popular-badge"><Star size={12} /> Most Popular</div>}
                            {plan.savings && <div className="savings-badge">{plan.savings}</div>}
                            <div className="pricing-header">
                                <h3>{plan.name}</h3>
                                <div className="pricing-price">
                                    <span className="price">{plan.price}</span>
                                    <span className="period">{plan.period}</span>
                                </div>
                            </div>
                            <div className="pricing-features">
                                {plan.features.map((f, i) => (
                                    <div key={i} className="feature-item included">
                                        <Check size={16} /> <span>{f}</span>
                                    </div>
                                ))}
                                {plan.missingFeatures.map((f, i) => (
                                    <div key={i} className="feature-item excluded">
                                        <span style={{ width: 16, textAlign: 'center' }}>✗</span> <span>{f}</span>
                                    </div>
                                ))}
                            </div>
                            <button className={`btn ${plan.current ? 'btn-secondary' : plan.popular ? 'btn-primary' : 'btn-secondary'} btn-lg`} style={{ width: '100%' }} disabled={plan.current}>
                                {plan.current ? 'Current Plan' : (<><Crown size={16} /> Upgrade</>)}
                            </button>
                        </div>
                    ))}
                </div>

                {/* Guarantee */}
                <div className="card" style={{ textAlign: 'center', marginTop: 'var(--space-8)' }}>
                    <Zap size={24} style={{ color: 'var(--color-warning)', marginBottom: 'var(--space-3)' }} />
                    <h3 style={{ fontSize: 'var(--fs-lg)', fontWeight: 600, marginBottom: 'var(--space-2)' }}>
                        30-Day Money-Back Guarantee
                    </h3>
                    <p className="text-secondary text-sm">
                        Not satisfied? Get a full refund within 30 days, no questions asked.
                    </p>
                </div>
            </div>
        </AppLayout>
    );
}
