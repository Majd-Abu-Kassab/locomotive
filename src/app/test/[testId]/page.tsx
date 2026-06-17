'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    Clock, Flag, FlagOff, AlertTriangle, StickyNote, ChevronLeft, ChevronRight, Send, X, Loader2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSupabase } from '@/contexts/SupabaseContext';
import { useAbortController, isAbortError } from '@/hooks/useAbortController';
import { saveTestResult, saveTestAnswers, QuestionRow, getQuestions } from '@/lib/api';
import './test-sim.css';

type AnswerState = { [qIndex: number]: number | null };
type MarkedState = { [qIndex: number]: boolean };
type NoteState = { [qIndex: number]: string };

export default function TestSimulationPage() {
    const router = useRouter();
    const { user } = useAuth();
    const supabase = useSupabase();
    const { getSignal } = useAbortController();
    const [questions, setQuestions] = useState<QuestionRow[]>([]);
    const [testMode, setTestMode] = useState<'timed' | 'untimed'>('timed');
    const [testName, setTestName] = useState('Practice Test');
    const [loading, setLoading] = useState(true);
    const [currentQ, setCurrentQ] = useState(0);
    const [answers, setAnswers] = useState<AnswerState>({});
    const [marked, setMarked] = useState<MarkedState>({});
    const [notes, setNotes] = useState<NoteState>({});
    const [showNotes, setShowNotes] = useState(false);
    const [showReport, setShowReport] = useState(false);
    const [timeLeft, setTimeLeft] = useState(100 * 60);
    const [submitted, setSubmitted] = useState(false);
    const [highlightMode, setHighlightMode] = useState(false);
    const [saving, setSaving] = useState(false);
    const [startTime] = useState(Date.now());

    // Load questions from sessionStorage or fallback to DB
    useEffect(() => {
        async function load() {
            const stored = sessionStorage.getItem('test_questions');
            const storedMode = sessionStorage.getItem('test_mode') as 'timed' | 'untimed' | null;
            const storedName = sessionStorage.getItem('test_name');

            if (stored) {
                const parsed = JSON.parse(stored);
                setQuestions(parsed);
                if (storedMode) setTestMode(storedMode);
                if (storedName) setTestName(storedName);
                if (storedMode === 'untimed') setTimeLeft(0);
                else setTimeLeft(parsed.length * 100); // 100 seconds per question (IMAT rule)
                // Clean up
                sessionStorage.removeItem('test_questions');
                sessionStorage.removeItem('test_mode');
                sessionStorage.removeItem('test_name');
            } else {
                // Fallback: load random questions
                const signal = getSignal();
                try {
                    const data = await getQuestions(supabase, { limit: 10 }, signal);
                    setQuestions(data);
                } catch (err) {
                    if (isAbortError(err)) return;
                    console.error('Error fetching fallback questions:', err);
                }
            }
            setLoading(false);
        }
        load();
    }, [supabase, getSignal]);

    // Timer
    useEffect(() => {
        if (submitted || testMode === 'untimed') return;
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 0) { clearInterval(timer); return 0; }
                return prev - 1;
            });
        }, 1000);
        return () => clearInterval(timer);
    }, [submitted, testMode]);

    const formatTime = useCallback((seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }, []);

    const selectAnswer = (qIndex: number, optionIndex: number) => {
        if (submitted) return;
        setAnswers(prev => ({
            ...prev,
            [qIndex]: prev[qIndex] === optionIndex ? null : optionIndex,
        }));
    };

    const toggleMark = (qIndex: number) => {
        setMarked(prev => ({ ...prev, [qIndex]: !prev[qIndex] }));
    };

    const handleSubmit = async () => {
        if (!submitted && confirm('Are you sure you want to submit? You cannot change your answers after submission.')) {
            setSubmitted(true);
            setSaving(true);

            if (user) {
                const result = getScore();
                const elapsed = Math.round((Date.now() - startTime) / 1000);
                const m = Math.floor(elapsed / 60);
                const s = elapsed % 60;
                const durationStr = `${m}m ${s}s`;

                const subjects = [...new Set(questions.map(q => q.subject))];

                try {
                    const { id: testResultId } = await saveTestResult(supabase, {
                        user_id: user.id,
                        name: testName,
                        duration: durationStr,
                        mode: testMode,
                        total_questions: questions.length,
                        correct: result.correct,
                        incorrect: result.incorrect,
                        unanswered: result.unanswered,
                        score: result.score,
                        max_score: result.maxScore,
                        subjects,
                        source: 'mixed',
                    });

                    if (testResultId) {
                        const testAnswers = questions.map((q, i) => ({
                            test_result_id: testResultId,
                            question_id: q.id,
                            selected_answer: answers[i] ?? null,
                            is_correct: answers[i] !== undefined && answers[i] !== null ? answers[i] === q.correct_answer : null,
                        }));
                        await saveTestAnswers(supabase, testAnswers);
                    }
                } catch (err) {
                    console.error('Error saving test results:', err);
                }
            }
            setSaving(false);
        }
    };

    const getScore = () => {
        let correct = 0, incorrect = 0, unanswered = 0;
        questions.forEach((q, i) => {
            if (answers[i] === undefined || answers[i] === null) unanswered++;
            else if (answers[i] === q.correct_answer) correct++;
            else incorrect++;
        });
        const score = correct * 1.5 - incorrect * 0.4;
        return { correct, incorrect, unanswered, score, maxScore: questions.length * 1.5 };
    };

    const getQuestionStatus = (i: number) => {
        if (submitted) {
            if (answers[i] === undefined || answers[i] === null) return 'unanswered';
            return answers[i] === questions[i].correct_answer ? 'correct' : 'incorrect';
        }
        if (marked[i]) return 'marked';
        if (answers[i] !== undefined && answers[i] !== null) return 'answered';
        return 'unanswered';
    };

    const handleTextSelection = () => {
        if (!highlightMode) return;
        const selection = window.getSelection();
        if (selection && selection.rangeCount > 0 && selection.toString().trim()) {
            const range = selection.getRangeAt(0);
            const span = document.createElement('span');
            span.className = 'text-highlight';
            range.surroundContents(span);
            selection.removeAllRanges();
        }
    };

    if (loading) {
        return (
            <div className="test-sim" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
                <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-tertiary)' }} />
            </div>
        );
    }

    if (questions.length === 0) {
        return (
            <div className="test-sim" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '100vh', gap: 'var(--space-4)' }}>
                <h2>No questions available</h2>
                <p className="text-secondary">Try adjusting your filters or add more questions to the database.</p>
                <button className="btn btn-primary" onClick={() => router.push('/create-test')}>Back to Create Test</button>
            </div>
        );
    }

    const q = questions[currentQ];
    const result = submitted ? getScore() : null;

    if (submitted && result) {
        return (
            <div className="test-results-page">
                <div className="test-results-card animate-scale-in">
                    <h1 style={{ fontSize: 'var(--fs-3xl)', fontWeight: 700, marginBottom: 'var(--space-2)', textAlign: 'center' }}>
                        Test Complete! 🎉
                    </h1>
                    <p style={{ textAlign: 'center', color: 'var(--text-secondary)', marginBottom: 'var(--space-8)' }}>
                        {saving ? 'Saving your results...' : 'Here are your results'}
                    </p>

                    <div className="results-score-circle">
                        <div className="score-circle">
                            <span className="score-number">{result.score.toFixed(1)}</span>
                            <span className="score-total">/ {result.maxScore.toFixed(1)}</span>
                        </div>
                    </div>

                    <div className="results-breakdown">
                        <div className="results-stat correct">
                            <span className="results-stat-value">{result.correct}</span>
                            <span className="results-stat-label">Correct (+{(result.correct * 1.5).toFixed(1)})</span>
                        </div>
                        <div className="results-stat incorrect">
                            <span className="results-stat-value">{result.incorrect}</span>
                            <span className="results-stat-label">Incorrect ({(result.incorrect * -0.4).toFixed(1)})</span>
                        </div>
                        <div className="results-stat skipped">
                            <span className="results-stat-value">{result.unanswered}</span>
                            <span className="results-stat-label">Unanswered (0.0)</span>
                        </div>
                    </div>

                    <div style={{ marginTop: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
                        <h3 style={{ fontSize: 'var(--fs-md)', fontWeight: 600, marginBottom: 'var(--space-4)' }}>IMAT Scoring</h3>
                        <div className="card-glass" style={{ padding: 'var(--space-4)' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)', fontSize: 'var(--fs-sm)' }}>
                                <span className="text-secondary">Correct ({result.correct} × 1.5)</span>
                                <span style={{ color: 'var(--color-success)' }}>+{(result.correct * 1.5).toFixed(1)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)', fontSize: 'var(--fs-sm)' }}>
                                <span className="text-secondary">Incorrect ({result.incorrect} × -0.4)</span>
                                <span style={{ color: 'var(--color-danger)' }}>{(result.incorrect * -0.4).toFixed(1)}</span>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-2)', fontSize: 'var(--fs-sm)' }}>
                                <span className="text-secondary">Unanswered ({result.unanswered} × 0)</span>
                                <span>0.0</span>
                            </div>
                            <div className="divider" style={{ margin: 'var(--space-3) 0' }} />
                            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--fs-md)', fontWeight: 600 }}>
                                <span>Total Score</span>
                                <span style={{ color: 'var(--brand-accent-light)' }}>{result.score.toFixed(1)}</span>
                            </div>
                        </div>
                    </div>

                    {/* Review questions */}
                    <h3 style={{ fontSize: 'var(--fs-md)', fontWeight: 600, marginBottom: 'var(--space-4)' }}>Review</h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', maxHeight: '400px', overflowY: 'auto' }}>
                        {questions.map((question, i) => {
                            const userAnswer = answers[i];
                            const isCorrect = userAnswer === question.correct_answer;
                            return (
                                <div key={i} className="card-glass" style={{ padding: 'var(--space-4)' }}>
                                    <div style={{ display: 'flex', alignItems: 'start', gap: 'var(--space-3)' }}>
                                        <span style={{
                                            width: 24, height: 24, borderRadius: '50%', fontSize: 'var(--fs-xs)', fontWeight: 600,
                                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                                            background: userAnswer === null || userAnswer === undefined ? 'var(--gray-700)' : isCorrect ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)',
                                            color: userAnswer === null || userAnswer === undefined ? 'var(--text-tertiary)' : isCorrect ? 'var(--color-success)' : 'var(--color-danger)',
                                        }}>
                                            {i + 1}
                                        </span>
                                        <div style={{ flex: 1 }}>
                                            <p style={{ fontSize: 'var(--fs-sm)', marginBottom: 'var(--space-2)' }}>{question.stem}</p>
                                            <p style={{ fontSize: 'var(--fs-xs)', color: isCorrect ? 'var(--color-success)' : 'var(--color-danger)' }}>
                                                {userAnswer === null || userAnswer === undefined
                                                    ? 'Unanswered'
                                                    : isCorrect ? '✓ Correct' : `✗ Your answer: ${question.options[userAnswer!]}`}
                                            </p>
                                            {!isCorrect && <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-success)', marginTop: '2px' }}>
                                                Correct: {question.options[question.correct_answer]}
                                            </p>}
                                            <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)', marginTop: 'var(--space-2)', fontStyle: 'italic' }}>
                                                {question.explanation}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <div style={{ display: 'flex', gap: 'var(--space-4)', marginTop: 'var(--space-8)' }}>
                        <button className="btn btn-secondary btn-lg" style={{ flex: 1 }} onClick={() => router.push('/dashboard')}>
                            Back to Dashboard
                        </button>
                        <button className="btn btn-primary btn-lg" style={{ flex: 1 }} onClick={() => router.push('/create-test')}>
                            Take Another Test
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="test-sim">
            {/* Top Bar */}
            <div className="test-topbar">
                <div className="test-topbar-left">
                    <button className="btn btn-ghost btn-sm" onClick={() => router.push('/dashboard')}>
                        <X size={16} /> Exit
                    </button>
                    <span className="test-title">{testName}</span>
                </div>
                {testMode === 'timed' && (
                    <div className="test-timer" style={{ color: timeLeft < 300 ? 'var(--color-danger)' : 'var(--text-primary)' }}>
                        <Clock size={18} />
                        <span>{formatTime(timeLeft)}</span>
                    </div>
                )}
                <div className="test-topbar-right">
                    <button
                        className={`btn btn-sm ${highlightMode ? 'btn-primary' : 'btn-ghost'}`}
                        onClick={() => setHighlightMode(!highlightMode)}
                        title="Highlight Mode"
                    >
                        🖍️ Highlight
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setShowNotes(!showNotes)}>
                        <StickyNote size={16} /> Notes
                    </button>
                    <button className="btn btn-ghost btn-sm" onClick={() => setShowReport(true)}>
                        <AlertTriangle size={16} /> Report
                    </button>
                    <button className="btn btn-primary btn-sm" onClick={handleSubmit}>
                        <Send size={16} /> Submit
                    </button>
                </div>
            </div>

            {/* Main Area */}
            <div className="test-body">
                <div className="test-question-area" onMouseUp={handleTextSelection}>
                    <div className="test-question-header">
                        <div className="test-q-number">
                            Question {currentQ + 1} of {questions.length}
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                            <span className="badge badge-accent">{q.subject}</span>
                            <span className={`badge ${q.difficulty === 'easy' ? 'badge-success' : q.difficulty === 'hard' ? 'badge-danger' : 'badge-warning'}`}>
                                {q.difficulty}
                            </span>
                        </div>
                    </div>

                    <div className="test-question-stem">{q.stem}</div>

                    <div className="test-options">
                        {q.options.map((opt, i) => (
                            <button
                                key={i}
                                className={`test-option ${answers[currentQ] === i ? 'selected' : ''}`}
                                onClick={() => selectAnswer(currentQ, i)}
                            >
                                <span className="test-option-letter">{String.fromCharCode(65 + i)}</span>
                                <span>{typeof opt === 'string' && opt.match(/^[A-E]\) /) ? opt.substring(3) : opt}</span>
                            </button>
                        ))}
                    </div>

                    <div className="test-question-actions">
                        <button className={`btn btn-sm ${marked[currentQ] ? 'btn-primary' : 'btn-ghost'}`} onClick={() => toggleMark(currentQ)}>
                            {marked[currentQ] ? <><FlagOff size={14} /> Unmark</> : <><Flag size={14} /> Mark for Review</>}
                        </button>
                    </div>

                    <div className="test-nav-buttons">
                        <button className="btn btn-secondary" disabled={currentQ === 0} onClick={() => setCurrentQ(prev => prev - 1)}>
                            <ChevronLeft size={16} /> Previous
                        </button>
                        <button className="btn btn-primary" disabled={currentQ === questions.length - 1} onClick={() => setCurrentQ(prev => prev + 1)}>
                            Next <ChevronRight size={16} />
                        </button>
                    </div>
                </div>

                {showNotes && (
                    <div className="test-notes-panel animate-slide-in">
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
                            <h3 style={{ fontSize: 'var(--fs-md)', fontWeight: 600 }}>Notes - Q{currentQ + 1}</h3>
                            <button className="btn btn-ghost btn-sm" onClick={() => setShowNotes(false)}><X size={14} /></button>
                        </div>
                        <textarea
                            className="input"
                            style={{ height: '200px', resize: 'vertical' }}
                            placeholder="Add your notes here..."
                            value={notes[currentQ] || ''}
                            onChange={(e) => setNotes(prev => ({ ...prev, [currentQ]: e.target.value }))}
                        />
                    </div>
                )}
            </div>

            {/* Bottom Question Nav */}
            <div className="test-bottom-bar">
                <div className="test-q-grid">
                    {questions.map((_, i) => (
                        <button
                            key={i}
                            className={`test-q-btn ${getQuestionStatus(i)} ${i === currentQ ? 'current' : ''}`}
                            onClick={() => setCurrentQ(i)}
                        >
                            {i + 1}
                        </button>
                    ))}
                </div>
                <div className="test-q-legend">
                    <span><span className="legend-dot answered" /> Answered</span>
                    <span><span className="legend-dot marked" /> Marked</span>
                    <span><span className="legend-dot unanswered" /> Unanswered</span>
                </div>
            </div>

            {/* Report Modal */}
            {showReport && (
                <div className="modal-overlay" onClick={() => setShowReport(false)}>
                    <div className="modal" onClick={e => e.stopPropagation()}>
                        <h2 style={{ fontSize: 'var(--fs-lg)', fontWeight: 600, marginBottom: 'var(--space-4)' }}>
                            Report Question {currentQ + 1}
                        </h2>
                        <div className="input-group" style={{ marginBottom: 'var(--space-4)' }}>
                            <label>Issue Type</label>
                            <select className="select">
                                <option>Incorrect answer</option>
                                <option>Unclear wording</option>
                                <option>Missing information</option>
                                <option>Other</option>
                            </select>
                        </div>
                        <div className="input-group" style={{ marginBottom: 'var(--space-6)' }}>
                            <label>Details</label>
                            <textarea className="input" placeholder="Describe the issue..." style={{ height: '120px' }} />
                        </div>
                        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
                            <button className="btn btn-secondary" onClick={() => setShowReport(false)}>Cancel</button>
                            <button className="btn btn-primary" onClick={() => setShowReport(false)}>Submit Report</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
