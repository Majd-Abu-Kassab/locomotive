'use client';

import { use, useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import Link from 'next/link';
import {
    ChevronDown, ChevronRight, Video, FileText, HelpCircle,
    CheckCircle2, Circle, ArrowLeft, Loader2, Lock, Unlock,
    CreditCard, Layers,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getCourse, getCourseSections, CourseWithModules, CourseSection } from '@/lib/api';

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
    const [sections, setSections] = useState<CourseSection[]>([]);
    const [loading, setLoading] = useState(true);
    const [expandedModules, setExpandedModules] = useState<string[]>([]);

    useEffect(() => {
        async function load() {
            const [data, sects] = await Promise.all([
                getCourse(courseId, user?.id),
                getCourseSections(courseId, user?.id),
            ]);
            setCourse(data);
            setSections(sects);
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

    // Build section → module mapping
    const hasSections = sections.length > 0;

    // Map of moduleId → section (null = free/no sections)
    const moduleToSection: Record<string, CourseSection> = {};
    sections.forEach(s => {
        (s.moduleIds || []).forEach(mid => {
            moduleToSection[mid] = s;
        });
    });

    // Group modules: sectioned vs ungrouped
    const unlockedSectionIds = new Set(sections.filter(s => s.unlocked).map(s => s.id));

    function isModuleLocked(moduleId: string): boolean {
        if (!hasSections) return false;
        const sec = moduleToSection[moduleId];
        if (!sec) return false; // not assigned to any section = free
        return !unlockedSectionIds.has(sec.id);
    }

    return (
        <AppLayout>
            <div className="page-wrapper">
                <Link href="/courses" className="btn btn-ghost btn-sm" style={{ marginBottom: 'var(--space-4)' }}>
                    <ArrowLeft size={16} /> All Courses
                </Link>

                {/* Course hero */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: 'var(--space-5)',
                    marginBottom: 'var(--space-6)', padding: 'var(--space-6)',
                    background: 'var(--bg-card)', border: '1px solid var(--border-primary)',
                    borderRadius: 'var(--radius-lg)', position: 'relative', overflow: 'hidden'
                }}>
                    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: course.color }} />
                    <div style={{ fontSize: '3rem' }}>{course.icon}</div>
                    <div style={{ flex: 1 }}>
                        <h1 style={{ fontSize: 'var(--fs-3xl)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>{course.name}</h1>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: 'var(--space-3)' }}>{course.description}</p>
                        <div style={{ display: 'flex', gap: 'var(--space-6)', fontSize: 'var(--fs-sm)', flexWrap: 'wrap' }}>
                            <span className="badge badge-accent">{totalTopics} lessons</span>
                            <span className="badge badge-success">{course.total_questions} questions</span>
                            <span className="badge badge-warning">{pct}% complete</span>
                            {hasSections && (
                                <span className="badge" style={{ background: 'rgba(168,85,247,0.15)', color: '#c084fc' }}>
                                    <Layers size={10} style={{ display: 'inline', marginRight: 4 }} />
                                    {unlockedSectionIds.size}/{sections.length} sections unlocked
                                </span>
                            )}
                        </div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: 'var(--fs-4xl)', fontWeight: 800, color: course.color }}>{pct}%</div>
                        <div style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)' }}>Progress</div>
                    </div>
                </div>

                {/* Section callouts — show locked sections with upgrade CTA */}
                {hasSections && sections.some(s => !s.unlocked) && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)', marginBottom: 'var(--space-5)' }}>
                        {sections.filter(s => !s.unlocked).map(s => (
                            <div key={s.id} style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: 'var(--space-4) var(--space-5)',
                                background: 'rgba(245,158,11,0.06)',
                                border: '1px dashed rgba(245,158,11,0.3)',
                                borderRadius: 'var(--radius-md)',
                                gap: 'var(--space-4)',
                                flexWrap: 'wrap',
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                                    <Lock size={16} style={{ color: 'var(--color-warning)', flexShrink: 0 }} />
                                    <div>
                                        <span style={{ fontWeight: 600, fontSize: 'var(--fs-sm)' }}>
                                            Section {s.section_number}: {s.name}
                                        </span>
                                        <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--fs-xs)', marginLeft: 8 }}>
                                            {(s.moduleIds || []).length} modules locked
                                        </span>
                                    </div>
                                </div>
                                <Link href="/upgrade" className="btn btn-sm" style={{
                                    background: 'var(--color-warning)', color: '#000',
                                    fontWeight: 700, whiteSpace: 'nowrap',
                                }}>
                                    <CreditCard size={14} /> Unlock for €{Number(s.price).toFixed(2)}
                                </Link>
                            </div>
                        ))}
                    </div>
                )}

                {/* Modules list */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    {course.modules.map(module => {
                        const isExpanded = expandedModules.includes(module.id);
                        const moduleCompleted = module.topics.filter(t => t.completed).length;
                        const locked = isModuleLocked(module.id);
                        const section = moduleToSection[module.id];

                        return (
                            <div key={module.id} className="accordion-item" style={{
                                opacity: locked ? 0.7 : 1,
                                transition: 'opacity var(--transition-base)',
                            }}>
                                <button
                                    className="accordion-header"
                                    onClick={() => !locked && toggleModule(module.id)}
                                    style={{ cursor: locked ? 'default' : 'pointer' }}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', flex: 1 }}>
                                        {locked ? (
                                            <Lock size={16} style={{ color: 'var(--color-warning)', flexShrink: 0 }} />
                                        ) : isExpanded ? (
                                            <ChevronDown size={18} />
                                        ) : (
                                            <ChevronRight size={18} />
                                        )}
                                        <span style={{ fontWeight: 600 }}>{module.name}</span>
                                        {!locked && (
                                            <span className="badge badge-accent" style={{ marginLeft: 'var(--space-2)' }}>
                                                {moduleCompleted}/{module.topics.length}
                                            </span>
                                        )}
                                        {locked && section && (
                                            <span style={{
                                                fontSize: 'var(--fs-xs)', background: 'rgba(245,158,11,0.15)',
                                                color: 'var(--color-warning)', padding: '2px 8px',
                                                borderRadius: 'var(--radius-sm)', fontWeight: 500,
                                            }}>
                                                Requires Section {section.section_number}
                                            </span>
                                        )}
                                    </div>
                                    {!locked && (
                                        <div className="progress-bar" style={{ width: '100px' }}>
                                            <div className="progress-bar-fill" style={{
                                                width: `${module.topics.length > 0 ? (moduleCompleted / module.topics.length) * 100 : 0}%`,
                                                background: course.color,
                                            }} />
                                        </div>
                                    )}
                                    {locked && (
                                        <Link
                                            href="/upgrade"
                                            onClick={e => e.stopPropagation()}
                                            className="btn btn-sm"
                                            style={{ background: 'rgba(245,158,11,0.15)', color: 'var(--color-warning)', border: '1px solid rgba(245,158,11,0.3)', whiteSpace: 'nowrap' }}
                                        >
                                            <Unlock size={12} /> Unlock
                                        </Link>
                                    )}
                                </button>

                                {/* Locked placeholder */}
                                {locked && (
                                    <div style={{
                                        padding: 'var(--space-5)',
                                        textAlign: 'center',
                                        color: 'var(--text-tertiary)',
                                        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 'var(--space-2)',
                                    }}>
                                        <Lock size={20} style={{ opacity: 0.4 }} />
                                        <span style={{ fontSize: 'var(--fs-sm)' }}>
                                            {module.topics.length} lesson{module.topics.length !== 1 ? 's' : ''} in this module —
                                            <Link href="/upgrade" style={{ color: 'var(--color-warning)', marginLeft: 4 }}>
                                                unlock Section {section?.section_number} to access
                                            </Link>
                                        </span>
                                    </div>
                                )}

                                {/* Topics (only when unlocked and expanded) */}
                                {!locked && isExpanded && (
                                    <div className="accordion-content">
                                        {module.topics.map(topic => (
                                            <Link
                                                href={`/courses/${courseId}/${topic.id}`}
                                                key={topic.id}
                                                style={{
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

                {/* No sections configured = free access notice */}
                {!hasSections && (
                    <p className="text-xs text-secondary" style={{ textAlign: 'center', marginTop: 'var(--space-4)' }}>
                        All content is freely accessible for this course.
                    </p>
                )}
            </div>
        </AppLayout>
    );
}
