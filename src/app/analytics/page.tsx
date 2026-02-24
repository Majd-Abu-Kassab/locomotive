'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { TrendingUp, Target, Award, BarChart3, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getTestResults, TestResultRow } from '@/lib/api';

interface SubjectPerf {
    subject: string;
    score: number;
    questions: number;
    color: string;
}

const subjectColors: Record<string, string> = {
    'Biology': '#10b981',
    'Chemistry': '#f59e0b',
    'Physics': '#8b5cf6',
    'Mathematics': '#ec4899',
    'Logic': '#06b6d4',
    'General Knowledge': '#f97316',
    'Reading Comprehension': '#a855f7',
};

export default function AnalyticsPage() {
    const { user } = useAuth();
    const [tests, setTests] = useState<TestResultRow[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            if (user) {
                const data = await getTestResults(user.id);
                setTests(data);
            }
            setLoading(false);
        }
        load();
    }, [user]);

    if (loading) {
        return (
            <AppLayout>
                <div className="page-wrapper" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                    <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-tertiary)' }} />
                </div>
            </AppLayout>
        );
    }

    // Compute stats from test results
    const totalQuestions = tests.reduce((acc, t) => acc + t.total_questions, 0);
    const avgScore = tests.length > 0 ? tests.reduce((acc, t) => acc + Number(t.score), 0) / tests.length : 0;
    const bestScore = tests.length > 0 ? Math.max(...tests.map(t => Number(t.score))) : 0;
    const worstScore = tests.length > 0 ? Math.min(...tests.map(t => Number(t.score))) : 0;
    const improvement = tests.length > 1 ? Number(tests[0].score) - Number(tests[tests.length - 1].score) : 0;

    // Performance over time (last 10 tests, oldest first)
    const recentTests = [...tests].reverse().slice(-10);

    // Subject performance
    const subjectMap: Record<string, { totalScore: number; totalMax: number; count: number }> = {};
    tests.forEach(t => {
        if (t.subjects) {
            t.subjects.forEach(sub => {
                if (!subjectMap[sub]) subjectMap[sub] = { totalScore: 0, totalMax: 0, count: 0 };
                subjectMap[sub].totalScore += Number(t.score);
                subjectMap[sub].totalMax += Number(t.max_score);
                subjectMap[sub].count += t.total_questions;
            });
        }
    });

    const subjectPerformance: SubjectPerf[] = Object.entries(subjectMap).map(([subject, data]) => ({
        subject,
        score: data.totalMax > 0 ? Math.round((data.totalScore / data.totalMax) * 100) : 0,
        questions: data.count,
        color: subjectColors[subject] || '#64748b',
    })).sort((a, b) => b.score - a.score);

    // Chart dimensions
    const chartHeight = 200;
    const maxChartScore = recentTests.length > 0 ? Math.max(...recentTests.map(t => Number(t.score)), ...recentTests.map(t => Number(t.max_score))) : 90;

    return (
        <AppLayout>
            <div className="page-wrapper">
                <div className="page-header">
                    <h1>Performance Analytics</h1>
                    <p>Track your progress and identify areas for improvement</p>
                </div>

                {tests.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
                        <BarChart3 size={48} style={{ color: 'var(--text-tertiary)', marginBottom: 'var(--space-4)' }} />
                        <h3 style={{ marginBottom: 'var(--space-2)' }}>No data yet</h3>
                        <p className="text-secondary text-sm">Take some tests to see your performance analytics</p>
                    </div>
                ) : (
                    <>
                        {/* Score Trend Chart */}
                        {recentTests.length > 1 && (
                            <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-5)' }}>
                                    <TrendingUp size={20} style={{ color: 'var(--brand-accent-light)' }} />
                                    <h2 style={{ fontSize: 'var(--fs-lg)', fontWeight: 600 }}>Score Trend</h2>
                                </div>
                                <div style={{ position: 'relative', height: chartHeight + 40 }}>
                                    <svg width="100%" height={chartHeight + 40} viewBox={`0 0 700 ${chartHeight + 40}`} preserveAspectRatio="none">
                                        {[0, 0.25, 0.5, 0.75, 1].map((ratio, i) => (
                                            <g key={i}>
                                                <line x1="40" y1={20 + chartHeight * (1 - ratio)} x2="680" y2={20 + chartHeight * (1 - ratio)} stroke="rgba(255,255,255,0.05)" strokeWidth="1" />
                                                <text x="0" y={25 + chartHeight * (1 - ratio)} fill="var(--text-tertiary)" fontSize="10" fontFamily="Inter">
                                                    {Math.round(maxChartScore * ratio)}
                                                </text>
                                            </g>
                                        ))}
                                        <polyline
                                            points={recentTests.map((t, i) => `${40 + i * (640 / Math.max(recentTests.length - 1, 1))},${20 + chartHeight * (1 - Number(t.score) / maxChartScore)}`).join(' ')}
                                            fill="none" stroke="var(--brand-accent)" strokeWidth="3" strokeLinejoin="round"
                                        />
                                        {recentTests.map((t, i) => (
                                            <circle key={i} cx={40 + i * (640 / Math.max(recentTests.length - 1, 1))} cy={20 + chartHeight * (1 - Number(t.score) / maxChartScore)}
                                                r="4" fill="var(--brand-accent)" stroke="var(--bg-primary)" strokeWidth="2" />
                                        ))}
                                        {recentTests.map((t, i) => (
                                            <text key={i} x={40 + i * (640 / Math.max(recentTests.length - 1, 1))} y={chartHeight + 38}
                                                fill="var(--text-tertiary)" fontSize="10" textAnchor="middle" fontFamily="Inter">
                                                {new Date(t.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                            </text>
                                        ))}
                                    </svg>
                                </div>
                            </div>
                        )}

                        {/* Subject Performance */}
                        {subjectPerformance.length > 0 && (
                            <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-5)' }}>
                                    <BarChart3 size={20} style={{ color: 'var(--brand-accent-light)' }} />
                                    <h2 style={{ fontSize: 'var(--fs-lg)', fontWeight: 600 }}>Subject Performance</h2>
                                </div>
                                <div className="table-wrapper">
                                    <table>
                                        <thead>
                                            <tr>
                                                <th>Subject</th>
                                                <th>Score</th>
                                                <th>Progress</th>
                                                <th>Questions Attempted</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {subjectPerformance.map(s => (
                                                <tr key={s.subject}>
                                                    <td style={{ fontWeight: 500 }}>{s.subject}</td>
                                                    <td>
                                                        <span style={{ color: s.score >= 70 ? 'var(--color-success)' : s.score >= 50 ? 'var(--color-warning)' : 'var(--color-danger)', fontWeight: 600 }}>
                                                            {s.score}%
                                                        </span>
                                                    </td>
                                                    <td style={{ width: '200px' }}>
                                                        <div className="progress-bar">
                                                            <div className="progress-bar-fill" style={{ width: `${s.score}%`, background: s.color }} />
                                                        </div>
                                                    </td>
                                                    <td className="text-secondary">{s.questions}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}

                        {/* Stats Summary */}
                        <div className="grid grid-3" style={{ marginBottom: 'var(--space-6)' }}>
                            <div className="stat-card">
                                <div className="stat-icon" style={{ background: 'rgba(37,99,235,0.15)', color: 'var(--brand-accent-light)' }}>
                                    <Target size={20} />
                                </div>
                                <div className="stat-value">{avgScore.toFixed(1)}</div>
                                <div className="stat-label">Average Score</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--color-success-light)' }}>
                                    <TrendingUp size={20} />
                                </div>
                                <div className="stat-value">{improvement >= 0 ? '+' : ''}{improvement.toFixed(1)}</div>
                                <div className="stat-label">Score Change (first → latest)</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-icon" style={{ background: 'rgba(168,85,247,0.15)', color: '#c084fc' }}>
                                    <BarChart3 size={20} />
                                </div>
                                <div className="stat-value">{totalQuestions}</div>
                                <div className="stat-label">Total Questions Attempted</div>
                            </div>
                        </div>

                        {/* Milestones */}
                        <div className="card">
                            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-5)' }}>
                                <Award size={20} style={{ color: 'var(--color-warning-light)' }} />
                                <h2 style={{ fontSize: 'var(--fs-lg)', fontWeight: 600 }}>Milestones</h2>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
                                {[
                                    { emoji: '🎯', title: 'First Test', description: 'Complete your first test', unlocked: tests.length >= 1 },
                                    { emoji: '📝', title: '5 Tests', description: 'Complete 5 tests', unlocked: tests.length >= 5 },
                                    { emoji: '📚', title: '10 Tests', description: 'Complete 10 tests', unlocked: tests.length >= 10 },
                                    { emoji: '⭐', title: 'Score 50+', description: 'Score above 50 on a test', unlocked: bestScore >= 50 },
                                    { emoji: '🏆', title: 'Score 70+', description: 'Score above 70 on a test', unlocked: bestScore >= 70 },
                                    { emoji: '💎', title: 'Perfect Score', description: 'Get a perfect score', unlocked: tests.some(t => Number(t.score) === Number(t.max_score)) },
                                ].map((m, i) => (
                                    <div key={i} style={{
                                        padding: 'var(--space-4)',
                                        background: m.unlocked ? 'rgba(37,99,235,0.08)' : 'var(--bg-glass)',
                                        border: `1px solid ${m.unlocked ? 'rgba(37,99,235,0.2)' : 'var(--border-primary)'}`,
                                        borderRadius: 'var(--radius-lg)',
                                        opacity: m.unlocked ? 1 : 0.5,
                                    }}>
                                        <div style={{ fontSize: '1.5rem', marginBottom: 'var(--space-2)' }}>{m.emoji}</div>
                                        <div style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, marginBottom: 'var(--space-1)' }}>{m.title}</div>
                                        <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)' }}>{m.description}</div>
                                        {m.unlocked && (
                                            <div style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-success)', marginTop: 'var(--space-2)' }}>
                                                ✓ Unlocked
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </>
                )}
            </div>
        </AppLayout>
    );
}
