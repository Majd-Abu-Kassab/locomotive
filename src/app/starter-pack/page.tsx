'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import Link from 'next/link';
import {
    Rocket, BookOpen, FileText, Play, CheckCircle2, ArrowRight, Star,
    Clock, Target, Zap, Brain, Trophy, ChevronDown, ChevronUp
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { getCourses, getTestResults, CourseWithModules, TestResultRow } from '@/lib/api';

interface StarterItem {
    id: string;
    title: string;
    description: string;
    type: 'info' | 'video' | 'pdf' | 'quiz' | 'action';
    duration: string;
    content?: string[];
    actionLabel?: string;
    actionHref?: string;
}

const starterItems: StarterItem[] = [
    {
        id: 'welcome',
        title: 'What is the IMAT?',
        description: 'The International Medical Admissions Test is used by Italian universities for enrollment in English-taught Medicine & Surgery programs.',
        type: 'info',
        duration: '3 min',
        content: [
            '60 multiple-choice questions in 100 minutes',
            'Sections: Logic (10), General Knowledge (12), Biology (18), Chemistry (12), Physics & Maths (8)',
            'Scoring: +1.5 correct, −0.4 incorrect, 0 unanswered',
            'Maximum possible score: 90 points',
            'Held once per year, usually in September',
        ],
    },
    {
        id: 'scoring',
        title: 'Scoring Strategy',
        description: 'Master the IMAT scoring system to maximize your points.',
        type: 'info',
        duration: '5 min',
        content: [
            '✅ Answer confidently — each correct = +1.5 points',
            '❌ Avoid guessing — each wrong = −0.4 points',
            '⏭️ Skip uncertain questions — unanswered = 0 points',
            '🎯 Eliminate 2+ options? Worth guessing (expected value positive)',
            '⏱️ ~100 seconds per question — manage your time wisely',
            '📊 Competitive scores typically 40-50+ points',
        ],
    },
    {
        id: 'structure',
        title: 'Exam Structure Breakdown',
        description: 'Understanding the subject distribution and time management.',
        type: 'pdf',
        duration: '5 min read',
        content: [
            'Section 1: Logical Reasoning — 10 questions (critical thinking, problem solving)',
            'Section 2: General Knowledge — 12 questions (culture, history of medicine, citizenship)',
            'Section 3: Biology — 18 questions (cell biology, genetics, anatomy, physiology)',
            'Section 4: Chemistry — 12 questions (general & organic chemistry)',
            'Section 5: Physics & Mathematics — 8 questions (mechanics, thermodynamics, algebra, calculus)',
        ],
    },
    {
        id: 'study-plan',
        title: 'Build Your Study Plan',
        description: 'Set up your personalized study schedule with target dates and daily goals.',
        type: 'action',
        duration: '5 min',
        actionLabel: 'Go to Schedule',
        actionHref: '/schedule',
    },
    {
        id: 'explore-subjects',
        title: 'Explore Your Subjects',
        description: 'Browse all 7 IMAT subjects and their topics. Start with your weakest area.',
        type: 'action',
        duration: '10 min',
        actionLabel: 'Browse Courses',
        actionHref: '/courses',
    },
    {
        id: 'first-test',
        title: 'Take Your First Practice Test',
        description: 'Get a baseline score with a quick 10-question practice test. No pressure!',
        type: 'quiz',
        duration: '15 min',
        actionLabel: 'Create Test',
        actionHref: '/create-test',
    },
];

export default function StarterPackPage() {
    const { user } = useAuth();
    const { addToast } = useToast();
    const [courses, setCourses] = useState<CourseWithModules[]>([]);
    const [testsTaken, setTestsTaken] = useState(0);
    const [expandedItem, setExpandedItem] = useState<string | null>('welcome');
    const [completedItems, setCompletedItems] = useState<Set<string>>(new Set());

    useEffect(() => {
        async function load() {
            const c = await getCourses(user?.id);
            setCourses(c);
            if (user) {
                const tests = await getTestResults(user.id);
                setTestsTaken(tests.length);
            }

            // Load completion from localStorage
            const saved = localStorage.getItem('starter_completed');
            if (saved) setCompletedItems(new Set(JSON.parse(saved)));
        }
        load();
    }, [user]);

    const markComplete = (id: string) => {
        const updated = new Set(completedItems);
        if (updated.has(id)) updated.delete(id); else updated.add(id);
        setCompletedItems(updated);
        localStorage.setItem('starter_completed', JSON.stringify([...updated]));
        if (updated.has(id)) addToast('Step marked complete!', 'success');
    };

    const completedCount = completedItems.size;
    const progress = Math.round((completedCount / starterItems.length) * 100);

    const typeConfig: Record<string, { icon: React.ReactNode; color: string }> = {
        info: { icon: <Brain size={18} />, color: '#2563EB' },
        video: { icon: <Play size={18} />, color: '#8b5cf6' },
        pdf: { icon: <FileText size={18} />, color: '#f59e0b' },
        quiz: { icon: <Star size={18} />, color: '#10b981' },
        action: { icon: <Zap size={18} />, color: '#f43f5e' },
    };

    return (
        <AppLayout>
            <div className="page-wrapper" style={{ maxWidth: '800px' }}>
                <div className="page-header">
                    <h1>🚀 IMAT Starter Pack</h1>
                    <p>Everything you need to kickstart your IMAT preparation</p>
                </div>

                {/* Quick Stats */}
                <div className="grid grid-3" style={{ marginBottom: 'var(--space-6)' }}>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'rgba(37,99,235,0.15)', color: 'var(--brand-accent-light)' }}>
                            <Target size={20} />
                        </div>
                        <div className="stat-value">{courses.length}</div>
                        <div className="stat-label">Subjects to Cover</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--color-success-light)' }}>
                            <CheckCircle2 size={20} />
                        </div>
                        <div className="stat-value">{testsTaken}</div>
                        <div className="stat-label">Tests Completed</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.15)', color: 'var(--color-warning-light)' }}>
                            <Trophy size={20} />
                        </div>
                        <div className="stat-value">{completedCount}/{starterItems.length}</div>
                        <div className="stat-label">Steps Done</div>
                    </div>
                </div>

                {/* Progress */}
                <div className="card" style={{ marginBottom: 'var(--space-6)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-3)' }}>
                        <span className="text-sm text-secondary">Getting Started Progress</span>
                        <span className="text-sm font-semibold">{progress}%</span>
                    </div>
                    <div className="progress-bar" style={{ height: '8px' }}>
                        <div className="progress-bar-fill" style={{ width: `${progress}%`, transition: 'width 0.5s ease' }} />
                    </div>
                    {progress === 100 && (
                        <p style={{ marginTop: 'var(--space-3)', fontSize: 'var(--fs-sm)', color: 'var(--color-success)' }}>
                            🎉 You&apos;ve completed the Starter Pack! You&apos;re ready to dive deep.
                        </p>
                    )}
                </div>

                {/* Steps */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    {starterItems.map((item, i) => {
                        const isExpanded = expandedItem === item.id;
                        const isComplete = completedItems.has(item.id);
                        const cfg = typeConfig[item.type];

                        return (
                            <div key={item.id} className="card" style={{
                                opacity: isComplete ? 0.75 : 1,
                                borderLeft: `3px solid ${isComplete ? 'var(--color-success)' : cfg.color}`,
                                transition: 'all var(--transition-base)',
                            }}>
                                <div
                                    style={{
                                        display: 'flex', alignItems: 'center', gap: 'var(--space-4)',
                                        cursor: 'pointer',
                                    }}
                                    onClick={() => setExpandedItem(isExpanded ? null : item.id)}
                                >
                                    <div style={{
                                        width: 40, height: 40, borderRadius: 'var(--radius-md)',
                                        background: isComplete ? 'rgba(16,185,129,0.15)' : `${cfg.color}22`,
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        color: isComplete ? 'var(--color-success)' : cfg.color,
                                        flexShrink: 0,
                                    }}>
                                        {isComplete ? <CheckCircle2 size={20} /> : cfg.icon}
                                    </div>
                                    <div style={{ flex: 1 }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                            <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)', fontWeight: 600 }}>
                                                STEP {i + 1}
                                            </span>
                                            <span className="badge badge-accent" style={{ fontSize: 'var(--fs-xs)' }}>
                                                <Clock size={10} /> {item.duration}
                                            </span>
                                        </div>
                                        <h3 style={{ fontSize: 'var(--fs-md)', fontWeight: 600, marginTop: 2 }}>{item.title}</h3>
                                    </div>
                                    {isExpanded ? <ChevronUp size={16} style={{ color: 'var(--text-tertiary)' }} /> : <ChevronDown size={16} style={{ color: 'var(--text-tertiary)' }} />}
                                </div>

                                {isExpanded && (
                                    <div style={{ marginTop: 'var(--space-4)', paddingLeft: 56 }}>
                                        <p className="text-secondary text-sm" style={{ marginBottom: 'var(--space-4)' }}>
                                            {item.description}
                                        </p>

                                        {item.content && (
                                            <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)', marginBottom: 'var(--space-4)' }}>
                                                {item.content.map((line, j) => (
                                                    <li key={j} style={{
                                                        display: 'flex', alignItems: 'start', gap: 'var(--space-2)',
                                                        padding: 'var(--space-2) var(--space-3)',
                                                        background: 'var(--bg-glass)', borderRadius: 'var(--radius-sm)',
                                                        fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)',
                                                    }}>
                                                        {line}
                                                    </li>
                                                ))}
                                            </ul>
                                        )}

                                        <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                                            {item.actionHref && (
                                                <Link href={item.actionHref} className="btn btn-primary btn-sm">
                                                    {item.actionLabel || 'Start'} <ArrowRight size={14} />
                                                </Link>
                                            )}
                                            <button
                                                className={`btn btn-sm ${isComplete ? 'btn-ghost' : 'btn-secondary'}`}
                                                onClick={(e) => { e.stopPropagation(); markComplete(item.id); }}
                                            >
                                                {isComplete ? '↩ Undo' : '✓ Mark Done'}
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>

                {/* Bottom CTA */}
                <div style={{ textAlign: 'center', marginTop: 'var(--space-8)' }}>
                    <Link href="/courses" className="btn btn-primary btn-lg">
                        <BookOpen size={16} /> Explore Full Courses <ArrowRight size={16} />
                    </Link>
                </div>
            </div>
        </AppLayout>
    );
}
