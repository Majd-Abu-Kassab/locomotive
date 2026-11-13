'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import Link from 'next/link';
import { Clock, FileText, ArrowRight, Calendar, Loader2, Pencil, Eye, Check, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSupabase } from '@/contexts/SupabaseContext';
import { useAbortController, isAbortError } from '@/hooks/useAbortController';
import { useToast } from '@/components/Toast';
import { getTestResults, renameTestResult, TestResultRow } from '@/lib/api';

// Reopens a past test in the exam page's results and review screens.
const reviewHref = (id: string) => `/test/review?result=${encodeURIComponent(id)}`;

export default function PreviousTestsPage() {
    const { user } = useAuth();
    const supabase = useSupabase();
    const { getSignal } = useAbortController();
    const { addToast } = useToast();
    const [tests, setTests] = useState<TestResultRow[]>([]);
    const [loading, setLoading] = useState(true);
    // Inline rename: which test is being renamed, and the name being typed.
    const [renamingId, setRenamingId] = useState<string | null>(null);
    const [draftName, setDraftName] = useState('');
    const [savingName, setSavingName] = useState(false);

    const startRename = (test: TestResultRow) => {
        setRenamingId(test.id);
        setDraftName(test.name);
    };

    const saveRename = async () => {
        const name = draftName.trim();
        if (!renamingId || !name) return;
        setSavingName(true);
        const { error } = await renameTestResult(supabase, renamingId, name);
        setSavingName(false);
        if (error) {
            addToast('Couldn’t rename the test. Please try again.', 'error');
            return;
        }
        setTests(prev => prev.map(t => t.id === renamingId ? { ...t, name } : t));
        setRenamingId(null);
    };

    useEffect(() => {
        // Wait for auth to actually resolve a user before deciding we're done
        // loading. On first mount `user` is null while the session is still
        // being fetched — flipping loading off here would flash "No tests yet"
        // at a logged-in student until auth resolves and this effect re-runs.
        if (!user?.id) return;
        const userId = user.id;
        const signal = getSignal();
        async function load() {
            try {
                const data = await getTestResults(supabase, userId, signal);
                setTests(data);
            } catch (err) {
                if (isAbortError(err)) return;
                console.error('Error fetching test results:', err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [user?.id, supabase, getSignal]);

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
                    <p>Review your past tests question by question, rename them, and track improvement</p>
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
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {tests.map(test => (
                                        <tr key={test.id}>
                                            <td style={{ fontWeight: 500 }}>
                                                {renamingId === test.id ? (
                                                    <form
                                                        style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)' }}
                                                        onSubmit={e => { e.preventDefault(); saveRename(); }}
                                                    >
                                                        <input
                                                            className="input"
                                                            value={draftName}
                                                            onChange={e => setDraftName(e.target.value)}
                                                            onKeyDown={e => { if (e.key === 'Escape') setRenamingId(null); }}
                                                            maxLength={120}
                                                            autoFocus
                                                            aria-label="Test name"
                                                            style={{ minWidth: 200, padding: '4px 8px' }}
                                                        />
                                                        <button type="submit" className="btn btn-ghost btn-sm" disabled={savingName || !draftName.trim()} aria-label="Save name" title="Save">
                                                            {savingName ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Check size={14} />}
                                                        </button>
                                                        <button type="button" className="btn btn-ghost btn-sm" onClick={() => setRenamingId(null)} aria-label="Cancel rename" title="Cancel">
                                                            <X size={14} />
                                                        </button>
                                                    </form>
                                                ) : (
                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                                        <FileText size={14} style={{ color: 'var(--text-tertiary)' }} />
                                                        <Link href={reviewHref(test.id)} style={{ color: 'inherit', textDecoration: 'none' }} title="Review this test">
                                                            {test.name}
                                                        </Link>
                                                        <button className="btn btn-ghost btn-sm" onClick={() => startRename(test)} aria-label={`Rename ${test.name}`} title="Rename" style={{ padding: 4 }}>
                                                            <Pencil size={12} />
                                                        </button>
                                                    </div>
                                                )}
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
                                            <td>
                                                <Link href={reviewHref(test.id)} className="btn btn-secondary btn-sm" style={{ whiteSpace: 'nowrap' }}>
                                                    <Eye size={14} /> Review
                                                </Link>
                                            </td>
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
