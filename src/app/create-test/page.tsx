'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import { useRouter } from 'next/navigation';
import { Clock, Infinity, Check, ArrowRight, Loader2, Lock } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getCourses, getQuestions, CourseWithModules } from '@/lib/api';
import './create-test.css';

export default function CreateTestPage() {
    const router = useRouter();
    const { profile } = useAuth();
    const isPaidPlan = profile?.plan && profile.plan !== 'free-trial';
    const [mode, setMode] = useState<'timed' | 'untimed'>('timed');
    const [selectedSubjects, setSelectedSubjects] = useState<string[]>([]);
    const [questionCount, setQuestionCount] = useState(60);
    const [difficulty, setDifficulty] = useState<'all' | 'easy' | 'medium' | 'hard'>('all');
    const [source, setSource] = useState<'all' | 'official-imat' | 'locomotive-original' | 'italian-medical'>('all');
    const [courses, setCourses] = useState<CourseWithModules[]>([]);
    const [loading, setLoading] = useState(true);
    const [starting, setStarting] = useState(false);

    useEffect(() => {
        async function load() {
            const data = await getCourses();
            setCourses(data);
            setLoading(false);
        }
        load();
    }, []);

    const toggleSubject = (name: string) => {
        setSelectedSubjects(prev =>
            prev.includes(name) ? prev.filter(s => s !== name) : [...prev, name]
        );
    };

    const startTest = async () => {
        setStarting(true);
        // Fetch questions matching filters
        const subjectNames = selectedSubjects.length > 0 ? selectedSubjects : undefined;
        const questions = await getQuestions({
            subjects: subjectNames,
            difficulty: difficulty,
            source: source,
            limit: questionCount * 2, // Overfetch slightly to allow client-side filtering if needed
        });

        // Filter out premium questions if user is on free plan
        let finalQuestions = questions;
        if (!isPaidPlan) {
            finalQuestions = finalQuestions.filter(q => q.source !== 'locomotive-original');
        }
        
        finalQuestions = finalQuestions.slice(0, questionCount);

        // Store questions in sessionStorage for the test page
        sessionStorage.setItem('test_questions', JSON.stringify(finalQuestions));
        sessionStorage.setItem('test_mode', mode);
        sessionStorage.setItem('test_name', `Custom Test - ${selectedSubjects.length > 0 ? selectedSubjects.join(', ') : 'All Subjects'}`);
        router.push('/test/custom');
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

                {/* Subject Selection */}
                <div className="ct-section">
                    <h2 className="ct-section-title">Subjects</h2>
                    <p className="text-sm text-secondary" style={{ marginBottom: 'var(--space-4)' }}>Select one or more subjects</p>
                    <div className="ct-subjects-grid">
                        {courses.map(course => (
                            <button
                                key={course.id}
                                className={`ct-subject-btn ${selectedSubjects.includes(course.name) ? 'active' : ''}`}
                                onClick={() => toggleSubject(course.name)}
                                style={{ '--subject-color': course.color } as React.CSSProperties}
                            >
                                <span className="ct-subject-icon">{course.icon}</span>
                                <span>{course.name}</span>
                                {selectedSubjects.includes(course.name) && (
                                    <div className="ct-subject-check"><Check size={12} /></div>
                                )}
                            </button>
                        ))}
                    </div>
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

                {/* Summary */}
                <div className="ct-summary">
                    <div className="ct-summary-info">
                        <h3>Test Summary</h3>
                        <div className="ct-summary-details">
                            <span>{questionCount} questions</span>
                            <span>•</span>
                            <span>{mode === 'timed' ? `${Math.round(questionCount * 100 / 60)} min` : 'Untimed'}</span>
                            <span>•</span>
                            <span>{selectedSubjects.length === 0 ? 'All subjects' : `${selectedSubjects.length} subjects`}</span>
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
