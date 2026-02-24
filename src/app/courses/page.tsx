'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import Link from 'next/link';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getCourses, CourseWithModules } from '@/lib/api';

export default function CoursesPage() {
    const { user } = useAuth();
    const [courses, setCourses] = useState<CourseWithModules[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function load() {
            const data = await getCourses(user?.id);
            setCourses(data);
            setLoading(false);
        }
        load();
    }, [user?.id]);

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
                    <h1>Your Courses</h1>
                    <p>7 subjects to master for the IMAT exam</p>
                </div>
                <div className="grid grid-3" style={{ gap: 'var(--space-6)' }}>
                    {courses.map(course => {
                        const pct = course.total_lessons > 0
                            ? Math.round(((course.completedLessons || 0) / course.total_lessons) * 100)
                            : 0;
                        return (
                            <Link href={`/courses/${course.id}`} key={course.id} className="card" style={{ textDecoration: 'none', color: 'var(--text-primary)', position: 'relative', overflow: 'hidden' }}>
                                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: '3px', background: course.color }} />
                                <div style={{ fontSize: '2.5rem', marginBottom: 'var(--space-4)' }}>{course.icon}</div>
                                <h3 style={{ fontSize: 'var(--fs-lg)', fontWeight: 600, marginBottom: 'var(--space-2)' }}>{course.name}</h3>
                                <p style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-4)' }}>{course.description}</p>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-2)' }}>
                                    <span>{course.completedLessons || 0}/{course.total_lessons} lessons</span>
                                    <span>{pct}%</span>
                                </div>
                                <div className="progress-bar">
                                    <div className="progress-bar-fill" style={{ width: `${pct}%`, background: course.color }} />
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'var(--space-4)' }}>
                                    <span className="badge badge-accent">{course.total_questions} questions</span>
                                    <ArrowRight size={16} style={{ color: 'var(--text-secondary)' }} />
                                </div>
                            </Link>
                        );
                    })}
                </div>
            </div>
        </AppLayout>
    );
}
