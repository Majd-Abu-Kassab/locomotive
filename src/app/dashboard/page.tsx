'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
    TrendingUp, Flame, BookOpen, Target, ArrowRight, Play,
    Clock, FileText, Zap, Award, Loader2
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { getCourses, getTestResults, CourseWithModules, TestResultRow } from '@/lib/api';
import './dashboard.css';

export default function DashboardPage() {
    const { profile, user, loading } = useAuth();
    const router = useRouter();
    const [courses, setCourses] = useState<CourseWithModules[]>([]);
    const [lastTest, setLastTest] = useState<TestResultRow | null>(null);
    const [dataLoading, setDataLoading] = useState(true);

    useEffect(() => {
        if (!loading && !user) {
            router.push('/login');
            return;
        }
        async function load() {
            if (user) {
                const [coursesData, testsData] = await Promise.all([
                    getCourses(user.id),
                    getTestResults(user.id),
                ]);
                setCourses(coursesData);
                if (testsData.length > 0) setLastTest(testsData[0]);
            }
            setDataLoading(false);
        }
        if (!loading) load();
    }, [user, loading]);

    if (loading || dataLoading) {
        return (
            <AppLayout>
                <div className="page-wrapper" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                    <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-tertiary)' }} />
                </div>
            </AppLayout>
        );
    }

    const displayName = profile?.first_name || 'Student';
    const totalTopics = courses.reduce((acc, c) => acc + c.modules.reduce((a, m) => a + m.topics.length, 0), 0);
    const completedTopics = courses.reduce((acc, c) => acc + c.modules.reduce((a, m) => a + m.topics.filter(t => t.completed).length, 0), 0);
    const completionPercent = totalTopics > 0 ? Math.round((completedTopics / totalTopics) * 100) : 0;

    return (
        <AppLayout>
            <div className="page-wrapper">
                {/* Greeting */}
                <div className="page-header">
                    <h1>Welcome back, {displayName}! 👋</h1>
                    <p>Keep up the momentum — you&apos;re making great progress.</p>
                </div>

                {/* Stats */}
                <div className="grid grid-4 dash-stats">
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'rgba(37, 99, 235, 0.15)', color: 'var(--brand-accent-light)' }}>
                            <Target size={20} />
                        </div>
                        <div className="stat-value">{profile?.estimated_score || 0}</div>
                        <div className="stat-label">Estimated IMAT Score</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'rgba(239, 68, 68, 0.15)', color: 'var(--color-danger-light)' }}>
                            <Flame size={20} />
                        </div>
                        <div className="stat-value">{profile?.study_streak || 0} days</div>
                        <div className="stat-label">Study Streak 🔥</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)', color: 'var(--color-success-light)' }}>
                            <BookOpen size={20} />
                        </div>
                        <div className="stat-value">{completionPercent}%</div>
                        <div className="stat-label">Topics Completed ({completedTopics}/{totalTopics})</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'rgba(168, 85, 247, 0.15)', color: '#c084fc' }}>
                            <Clock size={20} />
                        </div>
                        <div className="stat-value">{profile?.total_study_hours || 0}h</div>
                        <div className="stat-label">Total Study Hours</div>
                    </div>
                </div>

                {/* Main Row: Resume + Last Exam */}
                <div className="dash-row">
                    {/* Resume Section */}
                    <div className="card dash-resume">
                        <div className="dash-card-header">
                            <h2><Play size={18} /> Continue Learning</h2>
                        </div>
                        <div className="resume-content">
                            {courses.length > 0 ? (() => {
                                const firstIncomplete = courses.find(c => (c.completedLessons || 0) < c.total_lessons) || courses[0];
                                return (
                                    <>
                                        <div className="resume-course-badge" style={{ background: `${firstIncomplete.color}22`, color: firstIncomplete.color }}>
                                            {firstIncomplete.icon} {firstIncomplete.name}
                                        </div>
                                        <h3>Pick up where you left off</h3>
                                        <p className="text-secondary text-sm">{firstIncomplete.description}</p>
                                        <div className="progress-bar" style={{ marginTop: 'var(--space-3)' }}>
                                            <div className="progress-bar-fill" style={{
                                                width: `${firstIncomplete.total_lessons > 0 ? Math.round(((firstIncomplete.completedLessons || 0) / firstIncomplete.total_lessons) * 100) : 0}%`,
                                                background: firstIncomplete.color,
                                            }} />
                                        </div>
                                        <p className="text-xs text-secondary" style={{ marginTop: 'var(--space-1)' }}>
                                            {firstIncomplete.completedLessons || 0}/{firstIncomplete.total_lessons} lessons
                                        </p>
                                        <Link href={`/courses/${firstIncomplete.id}`} className="btn btn-primary" style={{ marginTop: 'var(--space-4)', width: '100%' }}>
                                            Continue Learning <ArrowRight size={16} />
                                        </Link>
                                    </>
                                );
                            })() : (
                                <p className="text-secondary">No courses available yet</p>
                            )}
                        </div>
                    </div>

                    {/* Last Exam */}
                    <div className="card dash-last-exam">
                        <div className="dash-card-header">
                            <h2><FileText size={18} /> Last Exam</h2>
                            {lastTest && <span className="badge badge-accent">{lastTest.mode}</span>}
                        </div>
                        <div className="last-exam-content">
                            {lastTest ? (
                                <>
                                    <h3>{lastTest.name}</h3>
                                    <p className="text-secondary text-sm">
                                        {new Date(lastTest.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })} • {lastTest.duration}
                                    </p>
                                    <div className="exam-score-display">
                                        <div className="score-big">{Number(lastTest.score).toFixed(1)}</div>
                                        <div className="score-max">/ {Number(lastTest.max_score).toFixed(1)}</div>
                                    </div>
                                    <div className="exam-breakdown">
                                        <div className="breakdown-item">
                                            <span className="text-sm" style={{ color: 'var(--color-success)' }}>✓ {lastTest.correct}</span>
                                            <span className="text-xs text-secondary">Correct</span>
                                        </div>
                                        <div className="breakdown-item">
                                            <span className="text-sm" style={{ color: 'var(--color-danger)' }}>✗ {lastTest.incorrect}</span>
                                            <span className="text-xs text-secondary">Incorrect</span>
                                        </div>
                                        <div className="breakdown-item">
                                            <span className="text-sm" style={{ color: 'var(--text-tertiary)' }}>— {lastTest.unanswered}</span>
                                            <span className="text-xs text-secondary">Skipped</span>
                                        </div>
                                    </div>
                                    <Link href="/previous-tests" className="btn btn-secondary" style={{ marginTop: 'var(--space-4)', width: '100%' }}>
                                        Review Exam <ArrowRight size={16} />
                                    </Link>
                                </>
                            ) : (
                                <div style={{ textAlign: 'center', padding: 'var(--space-6) 0' }}>
                                    <p className="text-secondary text-sm" style={{ marginBottom: 'var(--space-4)' }}>No tests taken yet</p>
                                    <Link href="/create-test" className="btn btn-primary">
                                        Take Your First Test <ArrowRight size={16} />
                                    </Link>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                {/* Practice Modes */}
                <div className="dash-section">
                    <div className="dash-section-header">
                        <h2><Zap size={20} /> Practice Modes</h2>
                        <Link href="/create-test" className="btn btn-ghost btn-sm">View All <ArrowRight size={14} /></Link>
                    </div>
                    <div className="grid" style={{ gridTemplateColumns: '1fr', gap: 'var(--space-4)' }}>
                        <Link href="/create-test" className="practice-card" style={{ '--practice-color': '#2563EB' } as React.CSSProperties}>
                            <div className="practice-icon">📝</div>
                            <h3>Custom Test</h3>
                            <p>Build your own test from any subject</p>
                        </Link>
                        <Link href="/create-test" className="practice-card" style={{ '--practice-color': '#10b981' } as React.CSSProperties}>
                            <div className="practice-icon">🏛️</div>
                            <h3>Official IMAT</h3>
                            <p>Past papers from real IMAT exams</p>
                        </Link>
                        <Link href="/create-test" className="practice-card" style={{ '--practice-color': '#f59e0b' } as React.CSSProperties}>
                            <div className="practice-icon">🇮🇹</div>
                            <h3>Italian Medical</h3>
                            <p>Translated Italian medical tests</p>
                        </Link>
                        <Link href="/create-test" className="practice-card" style={{ '--practice-color': '#8b5cf6' } as React.CSSProperties}>
                            <div className="practice-icon">🚂</div>
                            <h3>LOCOMOTIVE</h3>
                            <p>Our exclusive original questions</p>
                        </Link>
                    </div>
                </div>

                {/* Courses Quick Access */}
                <div className="dash-section">
                    <div className="dash-section-header">
                        <h2><TrendingUp size={20} /> Your Courses</h2>
                        <Link href="/courses" className="btn btn-ghost btn-sm">See All <ArrowRight size={14} /></Link>
                    </div>
                    <div className="grid" style={{ gridTemplateColumns: '1fr', gap: 'var(--space-4)' }}>
                        {courses.slice(0, 4).map(course => (
                            <Link href={`/courses/${course.id}`} key={course.id} className="course-mini-card">
                                <div className="course-mini-icon">{course.icon}</div>
                                <div className="course-mini-info">
                                    <h4>{course.name}</h4>
                                    <div className="progress-bar" style={{ maxWidth: '120px' }}>
                                        <div className="progress-bar-fill" style={{
                                            width: `${course.total_lessons > 0 ? Math.round(((course.completedLessons || 0) / course.total_lessons) * 100) : 0}%`,
                                            background: course.color,
                                        }} />
                                    </div>
                                    <span className="text-xs text-secondary">{course.completedLessons || 0}/{course.total_lessons} lessons</span>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Milestones */}
                <div className="dash-section">
                    <div className="dash-section-header">
                        <h2><Award size={20} /> Milestones</h2>
                        <span className="text-sm text-secondary">
                            {[
                                !!lastTest,
                                profile?.study_streak && profile.study_streak >= 3,
                                profile?.study_streak && profile.study_streak >= 7,
                                completedTopics >= 5,
                                completedTopics >= 20,
                                lastTest && lastTest.mode === 'timed',
                                lastTest && Number(lastTest.score) >= 30,
                                lastTest && Number(lastTest.score) >= 50,
                                lastTest && Number(lastTest.correct) === lastTest.total_questions,
                                completionPercent >= 50,
                            ].filter(Boolean).length} / 10 unlocked
                        </span>
                    </div>
                    <div className="milestones-row">
                        {[
                            { icon: '🎯', label: 'First Test', unlocked: !!lastTest, tooltip: 'Complete your first test' },
                            { icon: '🔥', label: '3-Day Streak', unlocked: !!(profile?.study_streak && profile.study_streak >= 3), tooltip: 'Study for 3 days in a row' },
                            { icon: '🔥', label: '7-Day Streak', unlocked: !!(profile?.study_streak && profile.study_streak >= 7), tooltip: 'Study for 7 days straight' },
                            { icon: '📚', label: '5 Topics', unlocked: completedTopics >= 5, tooltip: 'Complete 5 topics' },
                            { icon: '📖', label: '20 Topics', unlocked: completedTopics >= 20, tooltip: 'Complete 20 topics' },
                            { icon: '⏱️', label: 'Simulation', unlocked: !!(lastTest && lastTest.mode === 'timed'), tooltip: 'Complete a timed exam simulation' },
                            { icon: '🏅', label: 'Score 30+', unlocked: !!(lastTest && Number(lastTest.score) >= 30), tooltip: 'Score 30+ points on a test' },
                            { icon: '🏆', label: 'Score 50+', unlocked: !!(lastTest && Number(lastTest.score) >= 50), tooltip: 'Score 50+ points — competitive!' },
                            { icon: '⭐', label: 'Perfect', unlocked: !!(lastTest && Number(lastTest.correct) === lastTest.total_questions), tooltip: 'Get 100% on any test' },
                            { icon: '🚀', label: 'Halfway', unlocked: completionPercent >= 50, tooltip: 'Complete 50% of all topics' },
                        ].map((m, i) => (
                            <div key={i} className={`milestone ${m.unlocked ? 'unlocked' : 'locked'}`} title={m.tooltip}>
                                <span className="milestone-icon">{m.icon}</span>
                                <span className="text-xs">{m.label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </AppLayout>
    );
}
