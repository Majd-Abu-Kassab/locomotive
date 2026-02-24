'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import Link from 'next/link';
import { Clock, FileText, ArrowRight, Calendar, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getTestResults, TestResultRow } from '@/lib/api';

export default function PreviousTestsPage() {
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

    const formatDate = (dateStr: string) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    };

    return (
        <AppLayout>
            <div className="page-wrapper">
                <div className="page-header">
                    <h1>Previous Tests</h1>
                    <p>Review your past test attempts and track improvement</p>
                </div>

                {tests.length === 0 ? (
                    <div className="card" style={{ textAlign: 'center', padding: 'var(--space-12)' }}>
                        <FileText size={48} style={{ color: 'var(--text-tertiary)', marginBottom: 'var(--space-4)' }} />
                        <h3 style={{ marginBottom: 'var(--space-2)' }}>No tests yet</h3>
                        <p className="text-secondary text-sm" style={{ marginBottom: 'var(--space-6)' }}>Take your first test to see results here</p>
                        <Link href="/create-test" className="btn btn-primary">Create Test <ArrowRight size={16} /></Link>
                    </div>
                ) : (
                    <>
                        <div className="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Test Name</th>
                                        <th>Date</th>
                                        <th>Duration</th>
                                        <th>Mode</th>
                                        <th>Score</th>
                                        <th>Correct</th>
                                        <th>Incorrect</th>
                                        <th>Skipped</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tests.map(test => (
                                        <tr key={test.id}>
                                            <td style={{ fontWeight: 500 }}>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                                    <FileText size={14} style={{ color: 'var(--text-tertiary)' }} />
                                                    {test.name}
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--text-secondary)' }}>
                                                    <Calendar size={12} /> {formatDate(test.date)}
                                                </div>
                                            </td>
                                            <td>
                                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', color: 'var(--text-secondary)' }}>
                                                    <Clock size={12} /> {test.duration}
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`badge ${test.mode === 'timed' ? 'badge-danger' : 'badge-accent'}`}>
                                                    {test.mode}
                                                </span>
                                            </td>
                                            <td style={{ fontWeight: 600, color: 'var(--brand-accent-light)' }}>
                                                {Number(test.score).toFixed(1)} / {Number(test.max_score).toFixed(1)}
                                            </td>
                                            <td style={{ color: 'var(--color-success)' }}>{test.correct}</td>
                                            <td style={{ color: 'var(--color-danger)' }}>{test.incorrect}</td>
                                            <td className="text-secondary">{test.unanswered}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {/* Summary */}
                        <div className="grid grid-3" style={{ marginTop: 'var(--space-6)' }}>
                            <div className="stat-card">
                                <div className="stat-value">{tests.length}</div>
                                <div className="stat-label">Tests Completed</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-value">
                                    {(tests.reduce((acc, t) => acc + Number(t.score), 0) / tests.length).toFixed(1)}
                                </div>
                                <div className="stat-label">Average Score</div>
                            </div>
                            <div className="stat-card">
                                <div className="stat-value">
                                    {Math.max(...tests.map(t => Number(t.score))).toFixed(1)}
                                </div>
                                <div className="stat-label">Best Score</div>
                            </div>
                        </div>
                    </>
                )}
            </div>
        </AppLayout>
    );
}
