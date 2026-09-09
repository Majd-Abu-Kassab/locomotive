'use client';

import { use, useState, useEffect, useMemo } from 'react';
import AppLayout from '@/components/AppLayout';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    ArrowLeft, ArrowRight, Play, FileText, CheckCircle2, Circle,
    Loader2, Video, HelpCircle, ChevronRight, Download, Lock
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useSupabase } from '@/contexts/SupabaseContext';
import { useAbortController, isAbortError } from '@/hooks/useAbortController';
import { getCourse, getCourseSections, getQuestions, markTopicComplete, markTopicIncomplete, CourseWithModules, TopicWithProgress, CourseSection } from '@/lib/api';
import { decodeParam } from '@/lib/params';

export default function LessonPage({ params }: { params: Promise<{ courseId: string; lessonId: string }> }) {
    const resolved = use(params);
    const courseId = decodeParam(resolved.courseId);
    const lessonId = decodeParam(resolved.lessonId);
    const { user, loading: authLoading } = useAuth();
    const supabase = useSupabase();
    const { getSignal } = useAbortController();
    const router = useRouter();
    const [course, setCourse] = useState<CourseWithModules | null>(null);
    const [sections, setSections] = useState<CourseSection[]>([]);
    const [loading, setLoading] = useState(true);
    const [completing, setCompleting] = useState(false);
    const [topicCompleted, setTopicCompleted] = useState(false);

    // Quiz — launched via the full-screen exam simulator
    const [quizLoading, setQuizLoading] = useState(false);

    useEffect(() => {
        // Wait for auth to resolve before fetching. Section unlock status is
        // keyed on the user's access — fetching with user?.id undefined returns
        // everything locked, briefly showing paid content as locked to a
        // student who owns it until auth resolves and this effect re-runs.
        if (authLoading) return;
        const signal = getSignal();
        async function load() {
            try {
                const [data, sects] = await Promise.all([
                    getCourse(supabase, courseId, user?.id, signal),
                    getCourseSections(supabase, courseId, user?.id, signal),
                ]);
                setCourse(data);
                setSections(sects);
            } catch (err) {
                if (isAbortError(err)) return;
                console.error('Error loading lesson details:', err);
            } finally {
                setLoading(false);
            }
        }
        load();
    }, [courseId, authLoading, user?.id, supabase, getSignal]);

    // Find topic + navigation info
    const { topic, moduleName, moduleId, prevTopic, nextTopic, allTopics } = useMemo(() => {
        if (!course) return { topic: null, moduleName: '', moduleId: '', prevTopic: null, nextTopic: null, allTopics: [] as TopicWithProgress[] };

        const all: { topic: TopicWithProgress; moduleName: string; moduleId: string }[] = [];
        for (const m of course.modules) {
            for (const t of m.topics) {
                all.push({ topic: t, moduleName: m.name, moduleId: m.id });
            }
        }

        const idx = all.findIndex(a => a.topic.id === lessonId);
        if (idx === -1) return { topic: null, moduleName: '', moduleId: '', prevTopic: null, nextTopic: null, allTopics: all.map(a => a.topic) };

        return {
            topic: all[idx].topic,
            moduleName: all[idx].moduleName,
            moduleId: all[idx].moduleId,
            prevTopic: idx > 0 ? all[idx - 1].topic : null,
            nextTopic: idx < all.length - 1 ? all[idx + 1].topic : null,
            allTopics: all.map(a => a.topic),
        };
    }, [course, lessonId]);

    // Check lock status
    const isLocked = useMemo(() => {
        if (!moduleId || sections.length === 0) return false;
        
        let targetSection = null;
        for (const s of sections) {
            if (s.moduleIds?.includes(moduleId)) {
                targetSection = s;
                break;
            }
        }
        
        if (!targetSection) return false; // Not in any section = free
        return !targetSection.unlocked;
    }, [moduleId, sections]);

    // Set initial completion state
    useEffect(() => {
        if (topic) setTopicCompleted(topic.completed);
    }, [topic]);

    // Launch the practice quiz in the full-screen exam simulator (same layout,
    // timer, and results as a real test) by handing it the questions.
    const startExamQuiz = async () => {
        if (!course || !topic) return;
        setQuizLoading(true);
        try {
            const questions = await getQuestions(supabase, {
                subjects: [course.name],
                limit: 5,
            });
            if (questions.length === 0) {
                setQuizLoading(false);
                return;
            }
            sessionStorage.setItem('test_questions', JSON.stringify(questions));
            sessionStorage.setItem('test_mode', 'timed');
            sessionStorage.setItem('test_timer_mode', 'per-question'); // 100s per question
            sessionStorage.setItem('test_name', `${topic.name} — Practice Quiz`);
            router.push('/test/quiz');
        } catch (err) {
            console.error('Error starting quiz:', err);
            setQuizLoading(false);
        }
    };

    const handleToggleComplete = async () => {
        if (!user || !topic) return;
        setCompleting(true);
        try {
            if (topicCompleted) {
                await markTopicIncomplete(supabase, user.id, topic.id);
                setTopicCompleted(false);
            } else {
                await markTopicComplete(supabase, user.id, topic.id);
                setTopicCompleted(true);
            }
        } catch (err) {
            console.error('Error toggling topic completion status:', err);
        } finally {
            setCompleting(false);
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
                
                {isLocked ? (
                    <div className="card" style={{ marginBottom: 'var(--space-6)', textAlign: 'center', padding: 'var(--space-8) var(--space-4)' }}>
                        <div style={{
                            width: '80px', height: '80px', borderRadius: '50%',
                            background: 'rgba(245,158,11,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto var(--space-4)'
                        }}>
                            <Lock size={36} style={{ color: 'var(--color-warning)' }} />
                        </div>
                        <h2 style={{ fontSize: 'var(--fs-2xl)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>Premium Content</h2>
                        <p className="text-secondary" style={{ marginBottom: 'var(--space-6)', maxWidth: 450, margin: '0 auto var(--space-6)' }}>
                            This lesson is part of a premium section. Please unlock the section to access this content.
                        </p>
                        <Link href={`/courses/${courseId}`} className="btn btn-primary btn-lg" style={{ display: 'inline-flex' }}>
                            View Course Options
                        </Link>
                    </div>
                ) : (
                    <>
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

                {/* Quiz — launches the full-screen exam simulator */}
                {topic.lesson_type === 'quiz' && (
                    <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
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
                                Take this quiz in the full exam interface — timed, one question at a time, with a review at the end.
                            </p>
                            <button className="btn btn-primary btn-lg" onClick={startExamQuiz} disabled={quizLoading}>
                                {quizLoading
                                    ? <><Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} /> Starting…</>
                                    : <>Start Quiz <ArrowRight size={18} /></>}
                            </button>
                        </div>
                    </div>
                )}
                    </>
                )}

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
