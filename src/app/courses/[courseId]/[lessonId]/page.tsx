'use client';

import { use, useState, useEffect, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import Link from 'next/link';
import {
    ArrowLeft, ArrowRight, Play, FileText, CheckCircle2, Circle,
    Loader2, Video, HelpCircle, BookOpen, ChevronRight
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getCourse, getQuestions, markTopicComplete, markTopicIncomplete, CourseWithModules, TopicWithProgress, QuestionRow } from '@/lib/api';

export default function LessonPage({ params }: { params: Promise<{ courseId: string; lessonId: string }> }) {
    const { courseId, lessonId } = use(params);
    const { user } = useAuth();
    const [course, setCourse] = useState<CourseWithModules | null>(null);
    const [loading, setLoading] = useState(true);
    const [completing, setCompleting] = useState(false);
    const [topicCompleted, setTopicCompleted] = useState(false);

    // Quiz state
    const [quizQuestions, setQuizQuestions] = useState<QuestionRow[]>([]);
    const [quizLoading, setQuizLoading] = useState(false);
    const [currentQuizQ, setCurrentQuizQ] = useState(0);
    const [quizAnswer, setQuizAnswer] = useState<number | null>(null);
    const [quizRevealed, setQuizRevealed] = useState(false);
    const [quizScore, setQuizScore] = useState({ correct: 0, total: 0 });
    const [quizFinished, setQuizFinished] = useState(false);

    useEffect(() => {
        async function load() {
            const data = await getCourse(courseId, user?.id);
            setCourse(data);
            setLoading(false);
        }
        load();
    }, [courseId, user?.id]);

    // Find topic + navigation info
    const { topic, moduleName, prevTopic, nextTopic, allTopics } = useMemo(() => {
        if (!course) return { topic: null, moduleName: '', prevTopic: null, nextTopic: null, allTopics: [] as TopicWithProgress[] };

        const all: { topic: TopicWithProgress; moduleName: string }[] = [];
        for (const m of course.modules) {
            for (const t of m.topics) {
                all.push({ topic: t, moduleName: m.name });
            }
        }

        const idx = all.findIndex(a => a.topic.id === lessonId);
        if (idx === -1) return { topic: null, moduleName: '', prevTopic: null, nextTopic: null, allTopics: all.map(a => a.topic) };

        return {
            topic: all[idx].topic,
            moduleName: all[idx].moduleName,
            prevTopic: idx > 0 ? all[idx - 1].topic : null,
            nextTopic: idx < all.length - 1 ? all[idx + 1].topic : null,
            allTopics: all.map(a => a.topic),
        };
    }, [course, lessonId]);

    // Set initial completion state
    useEffect(() => {
        if (topic) setTopicCompleted(topic.completed);
    }, [topic]);

    // Load quiz questions when it's a quiz topic
    const loadQuiz = async () => {
        if (!course) return;
        setQuizLoading(true);
        const questions = await getQuestions({
            subjects: [course.name],
            limit: 5,
        });
        setQuizQuestions(questions);
        setCurrentQuizQ(0);
        setQuizAnswer(null);
        setQuizRevealed(false);
        setQuizScore({ correct: 0, total: 0 });
        setQuizFinished(false);
        setQuizLoading(false);
    };

    const handleToggleComplete = async () => {
        if (!user || !topic) return;
        setCompleting(true);
        if (topicCompleted) {
            await markTopicIncomplete(user.id, topic.id);
            setTopicCompleted(false);
        } else {
            await markTopicComplete(user.id, topic.id);
            setTopicCompleted(true);
        }
        setCompleting(false);
    };

    const handleQuizAnswer = (idx: number) => {
        if (quizRevealed) return;
        setQuizAnswer(idx);
    };

    const handleQuizReveal = () => {
        if (quizAnswer === null) return;
        setQuizRevealed(true);
        const isCorrect = quizAnswer === quizQuestions[currentQuizQ].correct_answer;
        setQuizScore(prev => ({
            correct: prev.correct + (isCorrect ? 1 : 0),
            total: prev.total + 1,
        }));
    };

    const handleQuizNext = () => {
        if (currentQuizQ >= quizQuestions.length - 1) {
            setQuizFinished(true);
            return;
        }
        setCurrentQuizQ(prev => prev + 1);
        setQuizAnswer(null);
        setQuizRevealed(false);
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

    if (!course || !topic) {
        return (
            <AppLayout>
                <div className="page-wrapper">
                    <h1>Lesson not found</h1>
                    <Link href={`/courses/${courseId}`}>Back to course</Link>
                </div>
            </AppLayout>
        );
    }

    const lessonTypeConfig: Record<string, { icon: React.ReactNode; label: string; gradient: string }> = {
        video: { icon: <Video size={16} />, label: 'Video Lecture', gradient: 'rgba(37,99,235,0.1), rgba(37,99,235,0.03)' },
        pdf: { icon: <FileText size={16} />, label: 'PDF Resource', gradient: 'rgba(245,158,11,0.1), rgba(245,158,11,0.03)' },
        quiz: { icon: <HelpCircle size={16} />, label: 'Interactive Quiz', gradient: 'rgba(16,185,129,0.1), rgba(16,185,129,0.03)' },
    };

    const config = lessonTypeConfig[topic.lesson_type];

    return (
        <AppLayout>
            <div className="page-wrapper" style={{ maxWidth: '900px' }}>
                {/* Breadcrumb */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--fs-sm)', color: 'var(--text-tertiary)', marginBottom: 'var(--space-4)' }}>
                    <Link href="/courses" style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>Courses</Link>
                    <ChevronRight size={14} />
                    <Link href={`/courses/${courseId}`} style={{ color: 'var(--text-tertiary)', textDecoration: 'none' }}>{course.name}</Link>
                    <ChevronRight size={14} />
                    <span style={{ color: 'var(--text-secondary)' }}>{topic.name}</span>
                </div>

                {/* Header */}
                <div style={{ marginBottom: 'var(--space-2)' }}>
                    <span className="badge badge-accent">{moduleName}</span>
                    <span className="badge" style={{ marginLeft: 'var(--space-2)', background: `${course.color}22`, color: course.color }}>
                        {config.icon} {config.label}
                    </span>
                </div>

                <h1 style={{
                    fontSize: 'var(--fs-3xl)', fontWeight: 700, marginBottom: 'var(--space-2)',
                    background: 'linear-gradient(135deg, var(--text-primary), var(--text-accent))',
                    WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text',
                }}>
                    {topic.name}
                </h1>

                <div style={{ display: 'flex', gap: 'var(--space-4)', alignItems: 'center', marginBottom: 'var(--space-6)', fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)' }}>
                    <span>{topic.question_count} questions</span>
                    <span>•</span>
                    <button
                        onClick={handleToggleComplete}
                        disabled={completing}
                        style={{
                            background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                            display: 'flex', alignItems: 'center', gap: '4px', fontSize: 'var(--fs-sm)',
                            color: topicCompleted ? 'var(--color-success)' : 'var(--text-tertiary)',
                            transition: 'color var(--transition-fast)',
                        }}
                    >
                        {completing ? (
                            <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} />
                        ) : topicCompleted ? (
                            <CheckCircle2 size={14} />
                        ) : (
                            <Circle size={14} />
                        )}
                        {topicCompleted ? 'Completed' : 'Mark Complete'}
                    </button>
                </div>

                {/* ===== CONTENT AREA ===== */}

                {/* Video Content */}
                {topic.lesson_type === 'video' && (
                    <div className="card" style={{
                        marginBottom: 'var(--space-6)',
                        aspectRatio: '16/9',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: `linear-gradient(135deg, ${config.gradient})`,
                        cursor: 'pointer', position: 'relative', overflow: 'hidden',
                    }}>
                        <div style={{
                            position: 'absolute', inset: 0,
                            background: 'radial-gradient(circle at center, transparent 30%, rgba(0,0,0,0.3) 100%)',
                        }} />
                        <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
                            <div style={{
                                width: '72px', height: '72px', borderRadius: '50%',
                                background: 'var(--brand-accent)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto var(--space-4)', boxShadow: '0 0 40px rgba(37,99,235,0.5)',
                                transition: 'transform var(--transition-base), box-shadow var(--transition-base)',
                            }}>
                                <Play size={32} fill="white" color="white" />
                            </div>
                            <p style={{ fontSize: 'var(--fs-lg)', fontWeight: 600 }}>Video Lecture</p>
                            <p className="text-sm text-secondary">Click to play • Estimated 15–20 min</p>
                        </div>
                    </div>
                )}

                {/* PDF Content */}
                {topic.lesson_type === 'pdf' && (
                    <div className="card" style={{
                        marginBottom: 'var(--space-6)',
                        minHeight: '400px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        background: `linear-gradient(135deg, ${config.gradient})`,
                    }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{
                                width: '80px', height: '100px', borderRadius: 'var(--radius-md)',
                                background: 'rgba(245,158,11,0.15)', border: '2px solid rgba(245,158,11,0.3)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto var(--space-4)',
                            }}>
                                <FileText size={36} style={{ color: 'var(--color-warning)' }} />
                            </div>
                            <p style={{ fontSize: 'var(--fs-lg)', fontWeight: 600 }}>PDF Study Material</p>
                            <p className="text-sm text-secondary" style={{ marginBottom: 'var(--space-4)' }}>
                                Comprehensive notes for {topic.name}
                            </p>
                            <button className="btn btn-primary" style={{ gap: 'var(--space-2)' }}>
                                <BookOpen size={16} /> Open PDF
                            </button>
                        </div>
                    </div>
                )}

                {/* Quiz Content */}
                {topic.lesson_type === 'quiz' && (
                    <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
                        {quizQuestions.length === 0 && !quizLoading && !quizFinished ? (
                            /* Quiz start screen */
                            <div style={{ textAlign: 'center', padding: 'var(--space-8) var(--space-4)' }}>
                                <div style={{
                                    width: '64px', height: '64px', borderRadius: '50%',
                                    background: 'rgba(16,185,129,0.15)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    margin: '0 auto var(--space-4)',
                                }}>
                                    <HelpCircle size={28} style={{ color: 'var(--color-success)' }} />
                                </div>
                                <h3 style={{ fontSize: 'var(--fs-xl)', fontWeight: 600, marginBottom: 'var(--space-2)' }}>
                                    Practice Quiz — {topic.name}
                                </h3>
                                <p className="text-secondary" style={{ marginBottom: 'var(--space-6)' }}>
                                    Test your knowledge with 5 questions. Answers are revealed one at a time.
                                </p>
                                <button className="btn btn-primary btn-lg" onClick={loadQuiz}>
                                    Start Quiz <ArrowRight size={18} />
                                </button>
                            </div>
                        ) : quizLoading ? (
                            <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-8)' }}>
                                <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-tertiary)' }} />
                            </div>
                        ) : quizFinished ? (
                            /* Quiz results */
                            <div style={{ textAlign: 'center', padding: 'var(--space-8) var(--space-4)' }}>
                                <h3 style={{ fontSize: 'var(--fs-xl)', fontWeight: 600, marginBottom: 'var(--space-4)' }}>
                                    Quiz Complete! 🎉
                                </h3>
                                <div style={{
                                    fontSize: 'var(--fs-4xl)', fontWeight: 800, marginBottom: 'var(--space-2)',
                                    color: quizScore.correct / quizScore.total >= 0.7 ? 'var(--color-success)' : quizScore.correct / quizScore.total >= 0.4 ? 'var(--color-warning)' : 'var(--color-danger)',
                                }}>
                                    {quizScore.correct}/{quizScore.total}
                                </div>
                                <p className="text-secondary" style={{ marginBottom: 'var(--space-6)' }}>
                                    {quizScore.correct === quizScore.total ? 'Perfect score! Outstanding!' :
                                        quizScore.correct / quizScore.total >= 0.7 ? 'Great job! Keep it up!' :
                                            'Keep practicing, you\'ll improve!'}
                                </p>
                                <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'center' }}>
                                    <button className="btn btn-secondary" onClick={loadQuiz}>Try Again</button>
                                    {!topicCompleted && (
                                        <button className="btn btn-primary" onClick={handleToggleComplete}>
                                            <CheckCircle2 size={16} /> Mark Complete
                                        </button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            /* Quiz question */
                            <div style={{ padding: 'var(--space-2)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-5)' }}>
                                    <h3 style={{ fontSize: 'var(--fs-lg)', fontWeight: 600 }}>
                                        Question {currentQuizQ + 1} of {quizQuestions.length}
                                    </h3>
                                    <span className="text-sm text-secondary">
                                        Score: {quizScore.correct}/{quizScore.total}
                                    </span>
                                </div>

                                {/* Progress dots */}
                                <div style={{ display: 'flex', gap: 'var(--space-1)', marginBottom: 'var(--space-5)' }}>
                                    {quizQuestions.map((_, i) => (
                                        <div key={i} style={{
                                            flex: 1, height: 4, borderRadius: 2,
                                            background: i < currentQuizQ ? 'var(--color-success)' :
                                                i === currentQuizQ ? 'var(--brand-accent)' : 'var(--border-primary)',
                                            transition: 'background var(--transition-fast)',
                                        }} />
                                    ))}
                                </div>

                                <p style={{ fontSize: 'var(--fs-md)', marginBottom: 'var(--space-5)', lineHeight: 1.6 }}>
                                    {quizQuestions[currentQuizQ].stem}
                                </p>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-5)' }}>
                                    {quizQuestions[currentQuizQ].options.map((opt, i) => {
                                        const isSelected = quizAnswer === i;
                                        const isCorrect = i === quizQuestions[currentQuizQ].correct_answer;
                                        const optLabel = typeof opt === 'string' && opt.match(/^[A-E]\) /) ? opt.substring(3) : opt;

                                        let bg = 'var(--bg-glass)';
                                        let border = 'var(--border-primary)';
                                        if (quizRevealed) {
                                            if (isCorrect) { bg = 'rgba(16,185,129,0.12)'; border = 'var(--color-success)'; }
                                            else if (isSelected && !isCorrect) { bg = 'rgba(239,68,68,0.12)'; border = 'var(--color-danger)'; }
                                        } else if (isSelected) {
                                            bg = 'rgba(37,99,235,0.12)'; border = 'var(--brand-accent)';
                                        }

                                        return (
                                            <button
                                                key={i}
                                                onClick={() => handleQuizAnswer(i)}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                                                    padding: 'var(--space-3) var(--space-4)',
                                                    background: bg, border: `1px solid ${border}`,
                                                    borderRadius: 'var(--radius-md)', cursor: quizRevealed ? 'default' : 'pointer',
                                                    textAlign: 'left', fontSize: 'var(--fs-sm)', color: 'var(--text-primary)',
                                                    transition: 'all var(--transition-fast)',
                                                }}
                                            >
                                                <span style={{
                                                    width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: 'var(--fs-xs)', fontWeight: 600,
                                                    background: isSelected ? (quizRevealed ? (isCorrect ? 'var(--color-success)' : 'var(--color-danger)') : 'var(--brand-accent)') : 'var(--bg-secondary)',
                                                    color: isSelected ? 'white' : 'var(--text-secondary)',
                                                }}>
                                                    {String.fromCharCode(65 + i)}
                                                </span>
                                                <span>{optLabel}</span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Explanation */}
                                {quizRevealed && (
                                    <div style={{
                                        padding: 'var(--space-4)',
                                        background: 'rgba(37,99,235,0.06)',
                                        border: '1px solid rgba(37,99,235,0.15)',
                                        borderRadius: 'var(--radius-md)',
                                        marginBottom: 'var(--space-4)',
                                    }}>
                                        <p style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, marginBottom: 'var(--space-1)', color: 'var(--brand-accent-light)' }}>
                                            💡 Explanation
                                        </p>
                                        <p className="text-sm text-secondary">{quizQuestions[currentQuizQ].explanation}</p>
                                    </div>
                                )}

                                {/* Action buttons */}
                                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-3)' }}>
                                    {!quizRevealed ? (
                                        <button className="btn btn-primary" onClick={handleQuizReveal} disabled={quizAnswer === null}>
                                            Check Answer
                                        </button>
                                    ) : (
                                        <button className="btn btn-primary" onClick={handleQuizNext}>
                                            {currentQuizQ >= quizQuestions.length - 1 ? 'See Results' : 'Next Question'} <ArrowRight size={16} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Key Points */}
                <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
                    <h3 style={{ fontSize: 'var(--fs-lg)', fontWeight: 600, marginBottom: 'var(--space-4)' }}>Key Points</h3>
                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                        {[
                            'Core concept and definitions',
                            'Important formulas and relationships',
                            'Common exam questions on this topic',
                            'Clinical applications and examples',
                        ].map((point, i) => (
                            <li key={i} style={{ display: 'flex', alignItems: 'start', gap: 'var(--space-3)', padding: 'var(--space-2) 0' }}>
                                <CheckCircle2 size={16} style={{ color: 'var(--color-success)', marginTop: '2px', flexShrink: 0 }} />
                                <span className="text-secondary">{point}</span>
                            </li>
                        ))}
                    </ul>
                </div>

                {/* Prev / Next Navigation */}
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-4)' }}>
                    {prevTopic ? (
                        <Link href={`/courses/${courseId}/${prevTopic.id}`} className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>
                            <ArrowLeft size={16} /> {prevTopic.name}
                        </Link>
                    ) : (
                        <Link href={`/courses/${courseId}`} className="btn btn-secondary" style={{ flex: 1, justifyContent: 'center' }}>
                            <ArrowLeft size={16} /> Back to Course
                        </Link>
                    )}
                    {nextTopic ? (
                        <Link href={`/courses/${courseId}/${nextTopic.id}`} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                            {nextTopic.name} <ArrowRight size={16} />
                        </Link>
                    ) : (
                        <Link href={`/courses/${courseId}`} className="btn btn-primary" style={{ flex: 1, justifyContent: 'center' }}>
                            Course Complete! <ArrowRight size={16} />
                        </Link>
                    )}
                </div>
            </div>
        </AppLayout>
    );
}
