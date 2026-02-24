'use client';

import { useState, useEffect } from 'react';
import AppLayout from '@/components/AppLayout';
import {
    Plus, Trash2, Edit3, Save, X, Loader2, BookOpen, HelpCircle,
    AlertTriangle,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import {
    getCourses, getAllQuestions,
    adminSaveCourse, adminDeleteCourse,
    adminSaveQuestion, adminDeleteQuestion,
    CourseWithModules, QuestionRow,
} from '@/lib/api';

type Tab = 'courses' | 'questions';

export default function AdminPage() {
    const { profile } = useAuth();
    const { addToast } = useToast();
    const [tab, setTab] = useState<Tab>('courses');
    const [loading, setLoading] = useState(true);

    // Courses state
    const [courses, setCourses] = useState<CourseWithModules[]>([]);
    const [editingCourse, setEditingCourse] = useState<Partial<CourseWithModules> | null>(null);
    const [savingCourse, setSavingCourse] = useState(false);

    // Questions state
    const [questions, setQuestions] = useState<QuestionRow[]>([]);
    const [editingQuestion, setEditingQuestion] = useState<Partial<QuestionRow> | null>(null);
    const [savingQuestion, setSavingQuestion] = useState(false);
    const [questionFilter, setQuestionFilter] = useState('');

    useEffect(() => {
        async function load() {
            const [c, q] = await Promise.all([getCourses(), getAllQuestions()]);
            setCourses(c);
            setQuestions(q);
            setLoading(false);
        }
        load();
    }, []);

    // Guard: not admin
    if (!profile?.is_admin) {
        return (
            <AppLayout>
                <div className="page-wrapper" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60vh', textAlign: 'center' }}>
                    <AlertTriangle size={48} style={{ color: 'var(--color-danger)', marginBottom: 'var(--space-4)' }} />
                    <h1 style={{ fontSize: 'var(--fs-2xl)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>Access Denied</h1>
                    <p className="text-secondary">You need admin privileges to access this page.</p>
                </div>
            </AppLayout>
        );
    }

    // ===== COURSE HANDLERS =====
    const handleSaveCourse = async () => {
        if (!editingCourse || !editingCourse.id || !editingCourse.name) return;
        setSavingCourse(true);
        const { error } = await adminSaveCourse({
            id: editingCourse.id,
            name: editingCourse.name,
            icon: editingCourse.icon || '📚',
            color: editingCourse.color || '#2563EB',
            description: editingCourse.description || '',
            total_lessons: editingCourse.total_lessons || 0,
            total_questions: editingCourse.total_questions || 0,
            sort_order: editingCourse.sort_order || courses.length,
        });
        if (error) {
            addToast(error.message, 'error');
        } else {
            addToast('Course saved!', 'success');
            const updated = await getCourses();
            setCourses(updated);
            setEditingCourse(null);
        }
        setSavingCourse(false);
    };

    const handleDeleteCourse = async (courseId: string) => {
        const { error } = await adminDeleteCourse(courseId);
        if (error) {
            addToast(error.message, 'error');
        } else {
            addToast('Course deleted', 'success');
            setCourses(prev => prev.filter(c => c.id !== courseId));
        }
    };

    // ===== QUESTION HANDLERS =====
    const handleSaveQuestion = async () => {
        if (!editingQuestion || !editingQuestion.id || !editingQuestion.stem) return;
        setSavingQuestion(true);
        const { error } = await adminSaveQuestion({
            id: editingQuestion.id,
            subject: editingQuestion.subject || '',
            topic: editingQuestion.topic || '',
            difficulty: editingQuestion.difficulty || 'medium',
            stem: editingQuestion.stem,
            options: editingQuestion.options || ['A) ', 'B) ', 'C) ', 'D) ', 'E) '],
            correct_answer: editingQuestion.correct_answer ?? 0,
            explanation: editingQuestion.explanation || '',
            source: editingQuestion.source || 'locomotive-original',
            year: editingQuestion.year || null,
        });
        if (error) {
            addToast(error.message, 'error');
        } else {
            addToast('Question saved!', 'success');
            const updated = await getAllQuestions();
            setQuestions(updated);
            setEditingQuestion(null);
        }
        setSavingQuestion(false);
    };

    const handleDeleteQuestion = async (qId: string) => {
        const { error } = await adminDeleteQuestion(qId);
        if (error) {
            addToast(error.message, 'error');
        } else {
            addToast('Question deleted', 'success');
            setQuestions(prev => prev.filter(q => q.id !== qId));
        }
    };

    const filteredQuestions = questionFilter
        ? questions.filter(q => q.subject.toLowerCase().includes(questionFilter.toLowerCase()) || q.topic.toLowerCase().includes(questionFilter.toLowerCase()) || q.stem.toLowerCase().includes(questionFilter.toLowerCase()))
        : questions;

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
                    <h1>Admin Panel</h1>
                    <p>Manage courses, questions, and content</p>
                </div>

                {/* Stats */}
                <div className="grid grid-3" style={{ marginBottom: 'var(--space-6)' }}>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'rgba(37,99,235,0.15)', color: 'var(--brand-accent-light)' }}>
                            <BookOpen size={20} />
                        </div>
                        <div className="stat-value">{courses.length}</div>
                        <div className="stat-label">Courses</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--color-success-light)' }}>
                            <HelpCircle size={20} />
                        </div>
                        <div className="stat-value">{questions.length}</div>
                        <div className="stat-label">Questions</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'rgba(168,85,247,0.15)', color: '#c084fc' }}>
                            <BookOpen size={20} />
                        </div>
                        <div className="stat-value">{new Set(questions.map(q => q.subject)).size}</div>
                        <div className="stat-label">Subjects Covered</div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="admin-tabs">
                    <button className={`admin-tab ${tab === 'courses' ? 'active' : ''}`} onClick={() => setTab('courses')}>
                        <BookOpen size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} /> Courses ({courses.length})
                    </button>
                    <button className={`admin-tab ${tab === 'questions' ? 'active' : ''}`} onClick={() => setTab('questions')}>
                        <HelpCircle size={14} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }} /> Questions ({questions.length})
                    </button>
                </div>

                {/* ===== COURSES TAB ===== */}
                {tab === 'courses' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-4)' }}>
                            <button className="btn btn-primary btn-sm" onClick={() => setEditingCourse({ id: '', name: '', icon: '📚', color: '#2563EB', description: '', total_lessons: 0, total_questions: 0, sort_order: courses.length })}>
                                <Plus size={14} /> Add Course
                            </button>
                        </div>

                        <div className="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Icon</th>
                                        <th>Name</th>
                                        <th>ID</th>
                                        <th>Lessons</th>
                                        <th>Questions</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {courses.map(course => (
                                        <tr key={course.id}>
                                            <td>{course.icon}</td>
                                            <td style={{ fontWeight: 500 }}>{course.name}</td>
                                            <td className="text-secondary text-xs">{course.id}</td>
                                            <td>{course.total_lessons}</td>
                                            <td>{course.total_questions}</td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                                                    <button className="btn btn-ghost btn-sm" onClick={() => setEditingCourse(course)}>
                                                        <Edit3 size={14} />
                                                    </button>
                                                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => handleDeleteCourse(course.id)}>
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ===== QUESTIONS TAB ===== */}
                {tab === 'questions' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
                            <input
                                className="input"
                                placeholder="Filter by subject, topic, or keyword..."
                                value={questionFilter}
                                onChange={e => setQuestionFilter(e.target.value)}
                                style={{ maxWidth: 400 }}
                            />
                            <button className="btn btn-primary btn-sm" onClick={() => setEditingQuestion({ id: '', subject: '', topic: '', difficulty: 'medium', stem: '', options: ['A) ', 'B) ', 'C) ', 'D) ', 'E) '], correct_answer: 0, explanation: '', source: 'locomotive-original', year: null })}>
                                <Plus size={14} /> Add Question
                            </button>
                        </div>

                        <div className="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Subject</th>
                                        <th>Topic</th>
                                        <th style={{ maxWidth: 300 }}>Stem</th>
                                        <th>Difficulty</th>
                                        <th>Source</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filteredQuestions.map(q => (
                                        <tr key={q.id}>
                                            <td style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{q.subject}</td>
                                            <td className="text-secondary text-sm">{q.topic}</td>
                                            <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {q.stem}
                                            </td>
                                            <td>
                                                <span className={`badge ${q.difficulty === 'easy' ? 'badge-accent' : q.difficulty === 'hard' ? 'badge-danger' : ''}`}>
                                                    {q.difficulty}
                                                </span>
                                            </td>
                                            <td className="text-xs text-secondary">{q.source}</td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                                                    <button className="btn btn-ghost btn-sm" onClick={() => setEditingQuestion(q)}>
                                                        <Edit3 size={14} />
                                                    </button>
                                                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => handleDeleteQuestion(q.id)}>
                                                        <Trash2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <p className="text-xs text-secondary" style={{ marginTop: 'var(--space-3)' }}>
                            Showing {filteredQuestions.length} of {questions.length} questions
                        </p>
                    </div>
                )}
            </div>

            {/* ===== COURSE EDIT MODAL ===== */}
            {editingCourse && (
                <div className="modal-overlay" onClick={() => setEditingCourse(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 500 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-5)' }}>
                            <h2 style={{ fontSize: 'var(--fs-lg)', fontWeight: 600 }}>{editingCourse.id ? 'Edit Course' : 'New Course'}</h2>
                            <button className="btn btn-ghost btn-sm" onClick={() => setEditingCourse(null)}><X size={16} /></button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                                <div className="input-group">
                                    <label>ID (slug)</label>
                                    <input className="input" value={editingCourse.id || ''} onChange={e => setEditingCourse({ ...editingCourse, id: e.target.value })} placeholder="e.g. biology" />
                                </div>
                                <div className="input-group">
                                    <label>Name</label>
                                    <input className="input" value={editingCourse.name || ''} onChange={e => setEditingCourse({ ...editingCourse, name: e.target.value })} placeholder="e.g. Biology" />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                                <div className="input-group">
                                    <label>Icon (emoji)</label>
                                    <input className="input" value={editingCourse.icon || ''} onChange={e => setEditingCourse({ ...editingCourse, icon: e.target.value })} placeholder="🧬" />
                                </div>
                                <div className="input-group">
                                    <label>Color</label>
                                    <input className="input" type="color" value={editingCourse.color || '#2563EB'} onChange={e => setEditingCourse({ ...editingCourse, color: e.target.value })} />
                                </div>
                            </div>
                            <div className="input-group">
                                <label>Description</label>
                                <input className="input" value={editingCourse.description || ''} onChange={e => setEditingCourse({ ...editingCourse, description: e.target.value })} placeholder="Short description" />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                                <div className="input-group">
                                    <label>Total Lessons</label>
                                    <input className="input" type="number" value={editingCourse.total_lessons || 0} onChange={e => setEditingCourse({ ...editingCourse, total_lessons: parseInt(e.target.value) || 0 })} />
                                </div>
                                <div className="input-group">
                                    <label>Total Questions</label>
                                    <input className="input" type="number" value={editingCourse.total_questions || 0} onChange={e => setEditingCourse({ ...editingCourse, total_questions: parseInt(e.target.value) || 0 })} />
                                </div>
                            </div>
                        </div>

                        <button className="btn btn-primary" style={{ width: '100%', marginTop: 'var(--space-5)' }} onClick={handleSaveCourse} disabled={savingCourse || !editingCourse.id || !editingCourse.name}>
                            {savingCourse ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</> : <><Save size={16} /> Save Course</>}
                        </button>
                    </div>
                </div>
            )}

            {/* ===== QUESTION EDIT MODAL ===== */}
            {editingQuestion && (
                <div className="modal-overlay" onClick={() => setEditingQuestion(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 600, maxHeight: '90vh', overflowY: 'auto' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-5)' }}>
                            <h2 style={{ fontSize: 'var(--fs-lg)', fontWeight: 600 }}>{editingQuestion.id ? 'Edit Question' : 'New Question'}</h2>
                            <button className="btn btn-ghost btn-sm" onClick={() => setEditingQuestion(null)}><X size={16} /></button>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                            <div className="input-group">
                                <label>ID</label>
                                <input className="input" value={editingQuestion.id || ''} onChange={e => setEditingQuestion({ ...editingQuestion, id: e.target.value })} placeholder="e.g. bio-gen-q99" />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                                <div className="input-group">
                                    <label>Subject</label>
                                    <select className="select" value={editingQuestion.subject || ''} onChange={e => setEditingQuestion({ ...editingQuestion, subject: e.target.value })}>
                                        <option value="">Select...</option>
                                        <option value="Biology">Biology</option>
                                        <option value="Chemistry">Chemistry</option>
                                        <option value="Physics">Physics</option>
                                        <option value="Mathematics">Mathematics</option>
                                        <option value="Logic">Logic</option>
                                        <option value="General Knowledge">General Knowledge</option>
                                        <option value="Reading Comprehension">Reading Comprehension</option>
                                    </select>
                                </div>
                                <div className="input-group">
                                    <label>Topic</label>
                                    <input className="input" value={editingQuestion.topic || ''} onChange={e => setEditingQuestion({ ...editingQuestion, topic: e.target.value })} placeholder="e.g. Genetics" />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-4)' }}>
                                <div className="input-group">
                                    <label>Difficulty</label>
                                    <select className="select" value={editingQuestion.difficulty || 'medium'} onChange={e => setEditingQuestion({ ...editingQuestion, difficulty: e.target.value as 'easy' | 'medium' | 'hard' })}>
                                        <option value="easy">Easy</option>
                                        <option value="medium">Medium</option>
                                        <option value="hard">Hard</option>
                                    </select>
                                </div>
                                <div className="input-group">
                                    <label>Source</label>
                                    <select className="select" value={editingQuestion.source || 'locomotive-original'} onChange={e => setEditingQuestion({ ...editingQuestion, source: e.target.value as QuestionRow['source'] })}>
                                        <option value="official-imat">Official IMAT</option>
                                        <option value="locomotive-original">LOCOMOTIVE</option>
                                        <option value="italian-medical">Italian Medical</option>
                                    </select>
                                </div>
                                <div className="input-group">
                                    <label>Year</label>
                                    <input className="input" type="number" value={editingQuestion.year || ''} onChange={e => setEditingQuestion({ ...editingQuestion, year: e.target.value ? parseInt(e.target.value) : null })} placeholder="2024" />
                                </div>
                            </div>
                            <div className="input-group">
                                <label>Question Stem</label>
                                <textarea className="input" rows={3} value={editingQuestion.stem || ''} onChange={e => setEditingQuestion({ ...editingQuestion, stem: e.target.value })} placeholder="Write the question here..." style={{ resize: 'vertical', fontFamily: 'inherit' }} />
                            </div>

                            <div>
                                <label style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-2)', display: 'block' }}>Options (mark correct answer)</label>
                                {(editingQuestion.options || ['', '', '', '', '']).map((opt, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                                        <button
                                            onClick={() => setEditingQuestion({ ...editingQuestion, correct_answer: i })}
                                            style={{
                                                width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                background: editingQuestion.correct_answer === i ? 'var(--color-success)' : 'var(--bg-glass)',
                                                border: `1px solid ${editingQuestion.correct_answer === i ? 'var(--color-success)' : 'var(--border-primary)'}`,
                                                color: editingQuestion.correct_answer === i ? 'white' : 'var(--text-secondary)',
                                                cursor: 'pointer', fontSize: 'var(--fs-xs)', fontWeight: 600,
                                            }}
                                        >
                                            {String.fromCharCode(65 + i)}
                                        </button>
                                        <input
                                            className="input"
                                            value={typeof opt === 'string' ? opt : ''}
                                            onChange={e => {
                                                const newOpts = [...(editingQuestion.options || ['', '', '', '', ''])];
                                                newOpts[i] = e.target.value;
                                                setEditingQuestion({ ...editingQuestion, options: newOpts });
                                            }}
                                            placeholder={`Option ${String.fromCharCode(65 + i)}`}
                                            style={{ flex: 1 }}
                                        />
                                    </div>
                                ))}
                            </div>

                            <div className="input-group">
                                <label>Explanation</label>
                                <textarea className="input" rows={2} value={editingQuestion.explanation || ''} onChange={e => setEditingQuestion({ ...editingQuestion, explanation: e.target.value })} placeholder="Explain why the correct answer is correct..." style={{ resize: 'vertical', fontFamily: 'inherit' }} />
                            </div>
                        </div>

                        <button className="btn btn-primary" style={{ width: '100%', marginTop: 'var(--space-5)' }} onClick={handleSaveQuestion} disabled={savingQuestion || !editingQuestion.id || !editingQuestion.stem}>
                            {savingQuestion ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</> : <><Save size={16} /> Save Question</>}
                        </button>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
