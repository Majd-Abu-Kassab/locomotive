'use client';

import { use, useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import Link from 'next/link';
import { ChevronDown, ChevronRight, Video, FileText, HelpCircle, CheckCircle2, Circle, ArrowLeft, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getCourse, CourseWithModules } from '@/lib/api';

const lessonTypeIcon: Record<string, React.ReactNode> = {
    video: <Video size={14} />,
    pdf: <FileText size={14} />,
    quiz: <HelpCircle size={14} />,
};

const lessonTypeLabel: Record<string, string> = {
    video: 'Video Lecture',
    pdf: 'PDF Resource',
    quiz: 'Interactive Quiz',
};

export default function CourseDetailPage({ params }: { params: Promise<{ courseId: string }> }) {
    const { courseId } = use(params);
    const { user } = useAuth();
    const [course, setCourse] = useState<CourseWithModules | null>(null);
    const [loading, setLoading] = useState(true);
    const [expandedModules, setExpandedModules] = useState<string[]>([]);

    useEffect(() => {
        async function load() {
            const data = await getCourse(courseId, user?.id);
            setCourse(data);
            if (data?.modules[0]?.id) {
                setExpandedModules([data.modules[0].id]);
            }
            setLoading(false);
        }
        load();
    }, [courseId, user?.id]);

    if (loading) {
        return (
            <AppLayout>
                <div className="page-wrapper" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                    <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-tertiary)' }} />
                </div>
            </AppLayout>
        );
    }

    if (!course) {
        return (
            <AppLayout>
                <div className="page-wrapper">
                    <h1>Course not found</h1>
                    <Link href="/courses">Back to courses</Link>
                </div>
            </AppLayout>
        );
    }

    const toggleModule = (id: string) => {
        setExpandedModules(prev =>
            prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
        );
    };

    const totalTopics = course.modules.reduce((acc, m) => acc + m.topics.length, 0);
    const completedTopics = course.modules.reduce((acc, m) => acc + m.topics.filter(t => t.completed).length, 0);
    const pct = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

    return (
        <AppLayout>
            <div className="page-wrapper">
                <Link href="/courses" className="btn btn-ghost btn-sm" style={{ marginBottom: 'var(--space-4)' }}>
                    <ArrowLeft size={16} /> All Courses
                </Link>

                <div style={{
                    display: 'flex', alignItems: 'center', gap: 'var(--space-5)',
                    marginBottom: 'var(--space-8)', padding: 'var(--space-6)',
                    background: 'var(--bg-card)', border: '1px solid var(--border-primary)',
                    borderRadius: 'var(--radius-lg)', position: 'relative', overflow: 'hidden'
                }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: course.color }} />
                    <div style={{ fontSize: '3rem' }}>{course.icon}</div>
                    <div style={{ flex: 1 }}>
                        <h1 style={{ fontSize: 'var(--fs-3xl)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>{course.name}</h1>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-3)' }}>{course.description}</p>
                        <div style={{ display: 'flex', gap: 'var(--space-6)', fontSize: 'var(--fs-sm)' }}>
                            <span className="badge badge-accent">{totalTopics} lessons</span>
                            <span className="badge badge-success">{course.total_questions} questions</span>
                            <span className="badge badge-warning">{pct}% complete</span>
                        </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 'var(--fs-4xl)', fontWeight: 800, color: course.color }}>{pct}%</div>
                        <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)' }}>Progress</div>
                    </div>
                </div>

                {/* Modules */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    {course.modules.map(module => {
                        const isExpanded = expandedModules.includes(module.id);
                        const moduleCompleted = module.topics.filter(t => t.completed).length;
                        return (
                            <div key={module.id} className="accordion-item">
                                <button className="accordion-header" onClick={() => toggleModule(module.id)}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                                        {isExpanded ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
                                        <span style={{ fontWeight: 600 }}>{module.name}</span>
                                        <span className="badge badge-accent" style={{ marginLeft: 'var(--space-2)' }}>{moduleCompleted}/{module.topics.length}</span>
                                    </div>
                                    <div className="progress-bar" style={{ width: '100px' }}>
                                        <div className="progress-bar-fill" style={{ width: `${module.topics.length > 0 ? (moduleCompleted / module.topics.length) * 100 : 0}%`, background: course.color }} />
                                    </div>
                                </button>
                                {isExpanded && (
                                    <div className="accordion-content">
                                        {module.topics.map(topic => (
                                            <Link href={`/courses/${courseId}/${topic.id}`} key={topic.id} style={{
                                                display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                                                padding: 'var(--space-3) var(--space-4)',
                                                borderRadius: 'var(--radius-md)',
                                                color: 'var(--text-primary)', textDecoration: 'none',
                                                transition: 'background var(--transition-fast)',
                                                marginBottom: 'var(--space-1)',
                                            }}
                                                onMouseEnter={e => (e.currentTarget.style.background = 'var(--bg-glass-hover)')}
                                                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                                            >
                                                {topic.completed ? (
                                                    <CheckCircle2 size={18} style={{ color: 'var(--color-success)' }} />
                                                ) : (
                                                    <Circle size={18} style={{ color: 'var(--text-tertiary)' }} />
                                                )}
                                                <span style={{ flex: 1 }}>{topic.name}</span>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-1)', color: 'var(--text-tertiary)', fontSize: 'var(--fs-xs)' }}>
                                                    {lessonTypeIcon[topic.lesson_type]}
                                                    {lessonTypeLabel[topic.lesson_type]}
                                                </span>
                                                <span className="badge badge-accent">{topic.question_count}q</span>
                                            </Link>
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        </AppLayout>
    );
}
