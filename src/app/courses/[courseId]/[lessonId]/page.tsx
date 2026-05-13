'use client';

import { use, useState, useEffect, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import Link from 'next/link';
import {
    ArrowLeft, ArrowRight, Play, FileText, CheckCircle2, Circle,
    Loader2, Video, HelpCircle, BookOpen, ChevronRight, Download, Clock
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getCourse, getQuestions, markTopicComplete, markTopicIncomplete, CourseWithModules, TopicWithProgress, QuestionRow } from '@/lib/api';
import { RichTextPreview } from '@/components/RichTextEditor';
import 'katex/dist/katex.min.css';

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
    const [quizScore, setQuizScore] = useState({ correct: 0, total: 0 });
    const [quizFinished, setQuizFinished] = useState(false);
    const [quizTimer, setQuizTimer] = useState(100);
    const [quizAnswers, setQuizAnswers] = useState<Record<number, number | null>>({});

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
        setQuizScore({ correct: 0, total: 0 });
        setQuizFinished(false);
        setQuizTimer(100);
        setQuizAnswers({});
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
        setQuizAnswer(idx);
    };

    const handleQuizAdvance = () => {
        // Save current answer
        setQuizAnswers(prev => ({ ...prev, [currentQuizQ]: quizAnswer }));
        if (currentQuizQ >= quizQuestions.length - 1) {
            // Calculate final score
            const finalAnswers = { ...quizAnswers, [currentQuizQ]: quizAnswer };
            let correct = 0;
            quizQuestions.forEach((q, i) => {
                if (finalAnswers[i] !== null && finalAnswers[i] !== undefined && finalAnswers[i] === q.correct_answer) correct++;
            });
            setQuizScore({ correct, total: quizQuestions.length });
            setQuizFinished(true);
            return;
        }
        setCurrentQuizQ(prev => prev + 1);
        setQuizAnswer(null);
        setQuizTimer(100);
    };

    // Quiz per-question countdown timer — auto-advance on expiry
    useEffect(() => {
        if (quizQuestions.length === 0 || quizFinished || quizLoading) return;
        if (quizTimer <= 0) {
            handleQuizAdvance();
            return;
        }
        const interval = setInterval(() => {
            setQuizTimer(prev => prev - 1);
        }, 1000);
        return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [quizTimer, quizFinished, quizLoading, quizQuestions.length]);

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
            <div className="page-wrapper">
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
                        overflow: 'hidden',
                    }}>
                        {topic.content_url && topic.content_type === 'video' ? (
                            <>
                                <div style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: 'var(--space-3) var(--space-4)',
                                    background: 'rgba(37,99,235,0.08)',
                                    borderBottom: '1px solid var(--border-primary)',
                                }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontWeight: 600, fontSize: 'var(--fs-sm)' }}>
                                        <Video size={16} style={{ color: 'var(--brand-accent-light)' }} />
                                        Video Lecture
                                    </span>
                                    <a href={topic.content_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" download>
                                        <Download size={14} /> Download
                                    </a>
                                </div>
                                <video
                                    controls
                                    controlsList="nodownload"
                                    preload="metadata"
                                    style={{
                                        width: '100%',
                                        maxHeight: '70vh',
                                        background: '#000',
                                        display: 'block',
                                    }}
                                >
                                    <source src={topic.content_url} />
                                    Your browser does not support the video tag.
                                </video>
                            </>
                        ) : (
                            <div style={{
                                aspectRatio: '16/9',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                background: `linear-gradient(135deg, ${config.gradient})`,
                                position: 'relative',
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
                                    }}>
                                        <Play size={32} fill="white" color="white" />
                                    </div>
                                    <p style={{ fontSize: 'var(--fs-lg)', fontWeight: 600 }}>Video Lecture</p>
                                    <p className="text-sm text-secondary">Coming soon — check back later</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* PDF Content */}
                {topic.lesson_type === 'pdf' && (
                    <div className="card" style={{
                        marginBottom: 'var(--space-6)',
                        overflow: 'hidden',
                    }}>
                        {topic.content_url ? (
                            <>
                                <div style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    padding: 'var(--space-3) var(--space-4)',
                                    background: 'rgba(245,158,11,0.08)',
                                    borderBottom: '1px solid var(--border-primary)',
                                }}>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontWeight: 600, fontSize: 'var(--fs-sm)' }}>
                                        <FileText size={16} style={{ color: 'var(--color-warning)' }} />
                                        {topic.content_type === 'presentation' ? 'Presentation' : 'PDF Study Material'}
                                    </span>
                                    <a href={topic.content_url} target="_blank" rel="noopener noreferrer" className="btn btn-secondary btn-sm" download>
                                        <Download size={14} /> Download
                                    </a>
                                </div>
                                {topic.content_type === 'pdf' ? (
                                    <iframe
                                        src={topic.content_url}
                                        style={{ width: '100%', height: '600px', border: 'none' }}
                                        title={`${topic.name} - PDF`}
                                    />
                                ) : (
                                    <div style={{ textAlign: 'center', padding: 'var(--space-8)' }}>
                                        <FileText size={48} style={{ color: 'var(--color-warning)', marginBottom: 'var(--space-3)' }} />
                                        <p style={{ fontWeight: 600, marginBottom: 'var(--space-2)' }}>Presentation Available</p>
                                        <p className="text-sm text-secondary" style={{ marginBottom: 'var(--space-4)' }}>
                                            Download to view in PowerPoint or Google Slides
                                        </p>
                                        <a href={topic.content_url} target="_blank" rel="noopener noreferrer" className="btn btn-primary">
                                            <Download size={16} /> Download Presentation
                                        </a>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div style={{
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
                                    <p className="text-sm text-secondary">
                                        Content coming soon — check back later
                                    </p>
                                </div>
                            </div>
                        )}
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
                            <div style={{ padding: 'var(--space-6) var(--space-4)' }}>
                                <div style={{ textAlign: 'center', marginBottom: 'var(--space-6)' }}>
                                    <h3 style={{ fontSize: 'var(--fs-xl)', fontWeight: 600, marginBottom: 'var(--space-4)' }}>
                                        Quiz Complete! 🎉
                                    </h3>
                                    <div style={{
                                        fontSize: 'var(--fs-4xl)', fontWeight: 800, marginBottom: 'var(--space-2)',
                                        color: quizScore.correct / quizScore.total >= 0.7 ? 'var(--color-success)' : quizScore.correct / quizScore.total >= 0.4 ? 'var(--color-warning)' : 'var(--color-danger)',
                                    }}>
                                        {quizScore.correct}/{quizScore.total}
                                    </div>
                                    <p className="text-secondary" style={{ marginBottom: 'var(--space-4)' }}>
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

                                {/* Question Review */}
                                <div style={{
                                    borderTop: '1px solid var(--border-primary)',
                                    paddingTop: 'var(--space-6)',
                                }}>
                                    <h4 style={{ fontSize: 'var(--fs-lg)', fontWeight: 600, marginBottom: 'var(--space-4)' }}>
                                        📋 Review Answers
                                    </h4>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                                        {quizQuestions.map((question, qIdx) => {
                                            const userPick = quizAnswers[qIdx] ?? null;
                                            const correctIdx = question.correct_answer;
                                            const isCorrect = userPick !== null && userPick === correctIdx;
                                            const wasUnanswered = userPick === null;

                                            return (
                                                <div key={qIdx} style={{
                                                    padding: 'var(--space-4)',
                                                    background: isCorrect ? 'rgba(16,185,129,0.06)' : 'rgba(239,68,68,0.06)',
                                                    border: `1px solid ${isCorrect ? 'rgba(16,185,129,0.2)' : 'rgba(239,68,68,0.2)'}`,
                                                    borderRadius: 'var(--radius-lg)',
                                                }}>
                                                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                                                        <span style={{
                                                            width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                                                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                            fontSize: 'var(--fs-xs)', fontWeight: 700,
                                                            background: isCorrect ? 'var(--color-success)' : 'var(--color-danger)',
                                                            color: 'white', marginTop: 2,
                                                        }}>
                                                            {isCorrect ? '✓' : '✗'}
                                                        </span>
                                                        <div style={{ flex: 1 }}>
                                                            <p style={{ fontSize: 'var(--fs-sm)', fontWeight: 600, marginBottom: 'var(--space-1)' }}>
                                                                Q{qIdx + 1}. <RichTextPreview text={question.stem} />
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-1)', marginLeft: 'calc(28px + var(--space-3))' }}>
                                                        {question.options.map((opt, oIdx) => {
                                                            const optLabel = typeof opt === 'string' && opt.match(/^[A-E]\) /) ? opt.substring(3) : opt;
                                                            const isThisCorrect = oIdx === correctIdx;
                                                            const isThisUserPick = oIdx === userPick;
                                                            let optBg = 'transparent';
                                                            let optColor = 'var(--text-secondary)';
                                                            let optWeight = 400;
                                                            if (isThisCorrect) {
                                                                optBg = 'rgba(16,185,129,0.12)';
                                                                optColor = 'var(--color-success)';
                                                                optWeight = 600;
                                                            } else if (isThisUserPick && !isThisCorrect) {
                                                                optBg = 'rgba(239,68,68,0.12)';
                                                                optColor = 'var(--color-danger)';
                                                                optWeight = 600;
                                                            }
                                                            return (
                                                                <div key={oIdx} style={{
                                                                    display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                                                                    padding: '4px 8px', borderRadius: 'var(--radius-sm)',
                                                                    background: optBg,
                                                                    fontSize: 'var(--fs-sm)', color: optColor, fontWeight: optWeight,
                                                                }}>
                                                                    <span style={{ width: 18, textAlign: 'center', fontWeight: 600 }}>
                                                                        {String.fromCharCode(65 + oIdx)}
                                                                    </span>
                                                                    <span>{optLabel}</span>
                                                                    {isThisCorrect && <span style={{ marginLeft: 'auto', fontSize: 'var(--fs-xs)' }}>✓ Correct</span>}
                                                                    {isThisUserPick && !isThisCorrect && <span style={{ marginLeft: 'auto', fontSize: 'var(--fs-xs)' }}>✗ Your answer</span>}
                                                                </div>
                                                            );
                                                        })}
                                                        {wasUnanswered && (
                                                            <p style={{ fontSize: 'var(--fs-xs)', color: 'var(--color-warning)', marginTop: 'var(--space-1)' }}>
                                                                ⏱ Time expired — no answer selected
                                                            </p>
                                                        )}
                                                        {question.explanation && (
                                                            <div style={{
                                                                marginTop: 'var(--space-2)', padding: 'var(--space-2) var(--space-3)',
                                                                background: 'rgba(37,99,235,0.06)', borderRadius: 'var(--radius-sm)',
                                                                fontSize: 'var(--fs-xs)', color: 'var(--text-secondary)',
                                                            }}>
                                                                💡 <RichTextPreview text={question.explanation} />
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            </div>
                        ) : (
                            /* Quiz question */
                            <div style={{ padding: 'var(--space-2)' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-3)' }}>
                                    <h3 style={{ fontSize: 'var(--fs-lg)', fontWeight: 600 }}>
                                        Question {currentQuizQ + 1} of {quizQuestions.length}
                                    </h3>
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: 'var(--space-2)',
                                        padding: '4px 12px',
                                        background: quizTimer <= 10 ? 'rgba(239,68,68,0.12)' : quizTimer <= 30 ? 'rgba(245,158,11,0.12)' : 'rgba(37,99,235,0.08)',
                                        border: `1px solid ${quizTimer <= 10 ? 'rgba(239,68,68,0.3)' : quizTimer <= 30 ? 'rgba(245,158,11,0.3)' : 'rgba(37,99,235,0.2)'}`,
                                        borderRadius: 'var(--radius-full)',
                                        fontVariantNumeric: 'tabular-nums',
                                        transition: 'all var(--transition-fast)',
                                    }}>
                                        <Clock size={14} style={{
                                            color: quizTimer <= 10 ? 'var(--color-danger)' : quizTimer <= 30 ? 'var(--color-warning)' : 'var(--brand-accent-light)',
                                            animation: quizTimer <= 10 ? 'pulse 1s infinite' : 'none',
                                        }} />
                                        <span style={{
                                            fontSize: 'var(--fs-sm)', fontWeight: 700,
                                            color: quizTimer <= 10 ? 'var(--color-danger)' : quizTimer <= 30 ? 'var(--color-warning)' : 'var(--text-primary)',
                                        }}>
                                            {quizTimer}s
                                        </span>
                                    </div>
                                </div>

                                {/* Timer progress bar */}
                                <div style={{
                                    width: '100%', height: '3px', borderRadius: '2px',
                                    background: 'var(--border-primary)', marginBottom: 'var(--space-5)',
                                    overflow: 'hidden',
                                }}>
                                    <div style={{
                                        height: '100%',
                                        width: `${(quizTimer / 100) * 100}%`,
                                        borderRadius: '2px',
                                        background: quizTimer <= 10 ? 'var(--color-danger)' : quizTimer <= 30 ? 'var(--color-warning)' : 'var(--brand-accent)',
                                        transition: 'width 1s linear, background var(--transition-fast)',
                                    }} />
                                </div>

                                {/* Progress dots */}
                                <div style={{ display: 'flex', gap: 'var(--space-1)', marginBottom: 'var(--space-5)' }}>
                                    {quizQuestions.map((_, i) => (
                                        <div key={i} style={{
                                            flex: 1, height: 4, borderRadius: 2,
                                            background: i < currentQuizQ ? 'var(--brand-accent-light)' :
                                                i === currentQuizQ ? 'var(--brand-accent)' : 'var(--border-primary)',
                                            transition: 'background var(--transition-fast)',
                                        }} />
                                    ))}
                                </div>

                                <div style={{ fontSize: 'var(--fs-md)', marginBottom: 'var(--space-5)', lineHeight: 1.6 }}>
                                    <RichTextPreview text={quizQuestions[currentQuizQ].stem} />
                                </div>

                                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-5)' }}>
                                    {quizQuestions[currentQuizQ].options.map((opt, i) => {
                                        const isSelected = quizAnswer === i;
                                        const optLabel = typeof opt === 'string' && opt.match(/^[A-E]\) /) ? opt.substring(3) : opt;

                                        return (
                                            <button
                                                key={i}
                                                onClick={() => handleQuizAnswer(i)}
                                                style={{
                                                    display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                                                    padding: 'var(--space-3) var(--space-4)',
                                                    background: isSelected ? 'rgba(37,99,235,0.12)' : 'var(--bg-glass)',
                                                    border: `1px solid ${isSelected ? 'var(--brand-accent)' : 'var(--border-primary)'}`,
                                                    borderRadius: 'var(--radius-md)', cursor: 'pointer',
                                                    textAlign: 'left', fontSize: 'var(--fs-sm)', color: 'var(--text-primary)',
                                                    transition: 'all var(--transition-fast)',
                                                }}
                                            >
                                                <span style={{
                                                    width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    fontSize: 'var(--fs-xs)', fontWeight: 600,
                                                    background: isSelected ? 'var(--brand-accent)' : 'var(--bg-secondary)',
                                                    color: isSelected ? 'white' : 'var(--text-secondary)',
                                                }}>
                                                    {String.fromCharCode(65 + i)}
                                                </span>
                                                <span>{optLabel}</span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {/* Next / Finish button */}
                                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                                    <button className="btn btn-primary" onClick={handleQuizAdvance}>
                                        {currentQuizQ >= quizQuestions.length - 1 ? 'Finish Quiz' : 'Next Question'} <ArrowRight size={16} />
                                    </button>
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
