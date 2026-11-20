'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { useRouter } from 'next/navigation';
import { Clock, Infinity, Check, ArrowRight, Loader2, Lock, ChevronDown } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSupabase } from '@/contexts/SupabaseContext';
import { useAbortController, isAbortError } from '@/hooks/useAbortController';
import { getQuestionTopicTree, drawQuestions, PickerCourse } from '@/lib/api';
import { topicKey, untaggedKey, subjectKeys, courseKeys, pickFrom, pickLabel } from './topicPick';
import './create-test.css';

/** Checkbox for a group of keys: ticked, empty, or a dash when partly picked. */
function GroupCheckbox({ keys, selected, onToggle, label }: {
    keys: string[];
    selected: Set<string>;
    onToggle: (keys: string[]) => void;
    label: string;
}) {
    const n = keys.filter(k => selected.has(k)).length;
    return (
        <input
            type="checkbox"
            className="ct-check"
            aria-label={label}
            checked={n > 0 && n === keys.length}
            ref={el => { if (el) el.indeterminate = n > 0 && n < keys.length; }}
            onChange={() => onToggle(keys)}
        />
    );
}

const countLabel = (n: number | null) => n === null ? '' : `${n} question${n === 1 ? '' : 's'}`;

export default function CreateTestPage() {
    const router = useRouter();
    const { profile } = useAuth();
    const supabase = useSupabase();
    const { getSignal } = useAbortController();
    // Admins get a preview privilege: they can access all questions (incl.
    // premium-sourced ones) regardless of plan, so they can QA content.
    const isPaidPlan = !!profile?.admin_role || (!!profile?.plan && profile.plan !== 'free-trial');
    const [mode, setMode] = useState<'timed' | 'untimed'>('timed');
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [expanded, setExpanded] = useState<Set<string>>(new Set());
    const [questionCount, setQuestionCount] = useState(60);
    const [difficulty, setDifficulty] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');
    const [source, setSource] = useState<'all' | 'official-imat' | 'locomotive-original' | 'italian-medical'>('all');
    const [tree, setTree] = useState<PickerCourse[]>([]);
    const [loading, setLoading] = useState(true);
    const [starting, setStarting] = useState(false);
    // Why a test couldn't start, so we explain instead of dead-ending on an
    // empty test page. `upgrade` distinguishes "all matches are premium" from
    // "nothing matched these filters".
    const [notice, setNotice] = useState<{ text: string; upgrade: boolean } | null>(null);
    // Optional; blank uses the generated name below. Renamable later in Previous Tests.
    const [testName, setTestName] = useState('');
    const label = pickLabel(tree, selected);
    const defaultName = `Custom Test - ${label}`;

    useEffect(() => {
        const signal = getSignal();
        async function load() {
            try {
                const data = await getQuestionTopicTree(supabase, signal);
                setTree(data);
                // With a single course, open it so its topics are in view.
                if (data.length === 1) setExpanded(new Set([data[0].id]));
            } catch (err) {
                if (isAbortError(err)) return;
                console.error('Error fetching topics:', err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [supabase, getSignal]);

    /** Tick every key in the group, or untick them all if they're all ticked. */
    const toggleKeys = (keys: string[]) => {
        setNotice(null);
        setSelected(prev => {
            const next = new Set(prev);
            const all = keys.every(k => next.has(k));
            for (const k of keys) {
                if (all) next.delete(k);
                else next.add(k);
            }
            return next;
        });
    };

    const toggleExpanded = (id: string) => setExpanded(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
    });

    const startTest = async () => {
        setStarting(true);
        setNotice(null);
        try {
            const { questions: finalQuestions, matched } = await drawQuestions(supabase, {
                pick: pickFrom(tree, selected),
                difficulty,
                source,
                count: questionCount,
                // Free plans don't get LOCOMOTIVE Original questions.
                includePremium: isPaidPlan,
            });

            // Nothing to start — explain why instead of pushing the user to an
            // empty test page. If raw matches existed but the premium filter
            // removed them all, point to unlocking rather than "no questions".
            if (finalQuestions.length === 0) {
                setNotice(matched > 0
                    ? { text: 'These questions are premium — unlock this course to practice them.', upgrade: true }
                    : { text: 'No questions match these filters yet. Try different topics or difficulty.', upgrade: false });
                setStarting(false);
                return;
            }

            // Store questions in sessionStorage for the test page
            sessionStorage.setItem('test_questions', JSON.stringify(finalQuestions));
            sessionStorage.setItem('test_mode', mode);
            sessionStorage.removeItem('test_lesson_id'); // a custom test isn't a lesson quiz
            sessionStorage.setItem('test_name', testName.trim() || defaultName);
            router.push('/test/custom');
        } catch (err) {
            console.error('Error starting test:', err);
        } finally {
            setStarting(false);
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
                <div className="page-header">
                    <h1>Create Test</h1>
                    <p>Build a custom exam tailored to your study needs</p>
                </div>

                {/* Name */}
                <div className="ct-section">
                    <h2 className="ct-section-title">Test Name</h2>
                    <p className="text-sm text-secondary" style={{ marginBottom: 'var(--space-3)' }}>
                        Optional. Helps you find this test later in Previous Tests, where you can also rename it.
                    </p>
                    <input
                        className="input"
                        value={testName}
                        onChange={e => setTestName(e.target.value)}
                        placeholder={defaultName}
                        maxLength={120}
                        style={{ maxWidth: 480 }}
                    />
                </div>

                {/* Mode Selection */}
                <div className="ct-section">
                    <h2 className="ct-section-title">Test Mode</h2>
                    <div className="ct-mode-grid">
                        <button
                            className={`ct-mode-card ${mode === 'timed' ? 'active' : ''}`}
                            onClick={() => setMode('timed')}
                        >
                            <Clock size={24} />
                            <h3>Timed (IMAT Mode)</h3>
                            <p>100 minutes for 60 questions. Simulates real exam conditions.</p>
                            {mode === 'timed' && <div className="ct-mode-check"><Check size={16} /></div>}
                        </button>
                        <button
                            className={`ct-mode-card ${mode === 'untimed' ? 'active' : ''}`}
                            onClick={() => setMode('untimed')}
                        >
                            <Infinity size={24} />
                            <h3>Untimed (Practice)</h3>
                            <p>No time pressure. Focus on learning and understanding.</p>
                            {mode === 'untimed' && <div className="ct-mode-check"><Check size={16} /></div>}
                        </button>
                    </div>
                </div>

                {/* Topic Selection: Course › Subject › Topic */}
                <div className="ct-section">
                    <div className="ct-section-head">
                        <h2 className="ct-section-title">Topics</h2>
                        {selected.size > 0 && (
                            <button className="btn btn-ghost btn-sm" onClick={() => setSelected(new Set())}>Clear</button>
                        )}
                    </div>
                    <p className="text-sm text-secondary" style={{ marginBottom: 'var(--space-4)' }}>
                        Pick whole courses, subjects or single topics. Leave everything unticked to use all topics.
                    </p>
                    {tree.length === 0 ? (
                        <p className="text-sm text-secondary">No questions yet.</p>
                    ) : (
                        <div className="ct-topic-tree">
                            {tree.map(course => {
                                const keys = courseKeys(course);
                                const picked = keys.filter(k => selected.has(k)).length;
                                const total = course.untagged === null ? null
                                    : course.untagged + course.subjects.reduce((n, s) => n + s.topics.reduce((m, t) => m + (t.count ?? 0), 0), 0);
                                const canExpand = course.subjects.length > 0;
                                const open = canExpand && expanded.has(course.id);
                                const bodyId = `ct-course-${course.id}`;
                                return (
                                    <div
                                        key={course.id}
                                        className={`ct-course ${picked > 0 ? 'picked' : ''}`}
                                        style={{ '--subject-color': course.color } as React.CSSProperties}
                                    >
                                        <div className="ct-course-head">
                                            <GroupCheckbox keys={keys} selected={selected} onToggle={toggleKeys} label={`All of ${course.name}`} />
                                            <button
                                                className="ct-course-name"
                                                onClick={() => canExpand ? toggleExpanded(course.id) : toggleKeys(keys)}
                                                aria-expanded={canExpand ? open : undefined}
                                                aria-controls={canExpand ? bodyId : undefined}
                                            >
                                                <span className="ct-subject-icon">{course.icon}</span>
                                                <span className="ct-course-title">{course.name}</span>
                                                {picked > 0 && picked < keys.length && (
                                                    <span className="ct-course-picked">{picked} of {keys.length} picked</span>
                                                )}
                                                <span className="ct-count">{countLabel(total)}</span>
                                                {canExpand && <ChevronDown size={18} className={`ct-chevron ${open ? 'open' : ''}`} />}
                                            </button>
                                        </div>
                                        {open && (
                                            <div className="ct-course-body" id={bodyId}>
                                                {course.subjects.map(subject => (
                                                    <div key={subject.id} className="ct-subject">
                                                        <label className="ct-subject-head">
                                                            <GroupCheckbox keys={subjectKeys(subject)} selected={selected} onToggle={toggleKeys} label={`All of ${subject.name}`} />
                                                            <span>{subject.name}</span>
                                                        </label>
                                                        <div className="ct-topic-chips">
                                                            {subject.topics.map(topic => {
                                                                const on = selected.has(topicKey(topic.id));
                                                                return (
                                                                    <button
                                                                        key={topic.id}
                                                                        className={`ct-topic-chip ${on ? 'active' : ''}`}
                                                                        aria-pressed={on}
                                                                        onClick={() => toggleKeys([topicKey(topic.id)])}
                                                                    >
                                                                        {on && <Check size={12} />}
                                                                        {topic.name}
                                                                        {topic.count !== null && <span className="ct-count">{topic.count}</span>}
                                                                    </button>
                                                                );
                                                            })}
                                                        </div>
                                                    </div>
                                                ))}
                                                {course.untagged !== 0 && (() => {
                                                    const on = selected.has(untaggedKey(course.name));
                                                    return (
                                                        <div className="ct-topic-chips">
                                                            <button
                                                                className={`ct-topic-chip ct-topic-other ${on ? 'active' : ''}`}
                                                                aria-pressed={on}
                                                                onClick={() => toggleKeys([untaggedKey(course.name)])}
                                                                title="Questions in this course that aren't in a topic yet"
                                                            >
                                                                {on && <Check size={12} />}
                                                                Other {course.name} questions
                                                                {course.untagged !== null && <span className="ct-count">{course.untagged}</span>}
                                                            </button>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Question Pool */}
                <div className="ct-section">
                    <h2 className="ct-section-title">Question Pool</h2>
                    <div className="ct-pool-grid">
                        {[
                            { value: 'all', label: 'All Questions', desc: 'Mix from all sources', premium: false },
                            { value: 'official-imat', label: 'Official IMAT', desc: 'Past exam papers', premium: false },
                            { value: 'locomotive-original', label: 'LOCOMOTIVE Original', desc: 'Our exclusive questions', premium: true },
                            { value: 'italian-medical', label: 'Italian Medical', desc: 'Translated papers', premium: false },
                        ].map(pool => {
                            const isLocked = pool.premium && !isPaidPlan;
                            return (
                            <button
                                key={pool.value}
                                className={`ct-pool-btn ${source === pool.value ? 'active' : ''}`}
                                onClick={() => !isLocked && setSource(pool.value as typeof source)}
                                style={{ opacity: isLocked ? 0.6 : 1, cursor: isLocked ? 'not-allowed' : 'pointer' }}
                            >
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                                    <strong>{pool.label}</strong>
                                    {isLocked && <Lock size={14} style={{ color: 'var(--color-warning)' }} />}
                                </div>
                                <span className="text-xs text-secondary">{pool.desc}</span>
                                {source === pool.value && !isLocked && <div className="ct-mode-check"><Check size={14} /></div>}
                            </button>
                        )})}
                    </div>
                </div>

                {/* Settings Row */}
                <div className="ct-section">
                    <div className="ct-settings-row">
                        <div className="ct-setting">
                            <label>Number of Questions</label>
                            <div className="ct-counter">
                                <button className="btn btn-secondary btn-sm" onClick={() => setQuestionCount(Math.max(5, questionCount - 5))}>−</button>
                                <span className="ct-counter-value">{questionCount}</span>
                                <button className="btn btn-secondary btn-sm" onClick={() => setQuestionCount(Math.min(60, questionCount + 5))}>+</button>
                            </div>
                        </div>
                        <div className="ct-setting">
                            <label>Difficulty</label>
                            <div className="ct-difficulty">
                                {(['all', 'easy', 'medium', 'hard'] as const).map(d => (
                                    <button
                                        key={d}
                                        className={`ct-diff-btn ${difficulty === d ? 'active' : ''}`}
                                        onClick={() => setDifficulty(d)}
                                    >
                                        {d.charAt(0).toUpperCase() + d.slice(1)}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {notice && (
                    <div
                        role="status"
                        style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 'var(--space-3)',
                            padding: 'var(--space-3) var(--space-4)', marginBottom: 'var(--space-3)',
                            border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)',
                            background: 'var(--bg-glass)', fontSize: 'var(--fs-sm)',
                        }}
                    >
                        <span>{notice.text}</span>
                        {notice.upgrade && (
                            <button className="btn btn-primary btn-sm" onClick={() => router.push('/upgrade')}>
                                <Lock size={14} /> Unlock course
                            </button>
                        )}
                    </div>
                )}

                {/* Summary */}
                <div className="ct-summary">
                    <div className="ct-summary-info">
                        <h3>Test Summary</h3>
                        <div className="ct-summary-details">
                            <span>{questionCount} questions</span>
                            <span>•</span>
                            <span>{mode === 'timed' ? `${Math.round(questionCount * 100 / 60)} min` : 'Untimed'}</span>
                            <span>•</span>
                            <span>{label}</span>
                        </div>
                    </div>
                    <button className="btn btn-primary btn-lg" onClick={startTest} disabled={starting}>
                        {starting ? (
                            <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Loading...</>
                        ) : (
                            <>Start Test <ArrowRight size={18} /></>
                        )}
                    </button>
                </div>
            </div>
        </AppLayout>
    );
}
