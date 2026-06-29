'use client';

import { useState, useEffect, useRef } from 'react';
import AppLayout from '@/components/AppLayout';
import {
    Plus, Trash2, Edit3, Save, X, Loader2, BookOpen, HelpCircle,
    AlertTriangle, Layers, Users, CreditCard, Tag, CheckCircle, XCircle,
    Gift, BarChart2, TrendingUp, TrendingDown, Activity, Award,
    Upload, FileText, Image as ImageIcon, Shield, UserCog, Search, Crown,
    ArrowLeft, FolderTree, Video, FileQuestion, Bell, Send
} from 'lucide-react';
import { RichTextToolbar, RichTextPreview } from '@/components/RichTextEditor';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/components/Toast';
import { useSupabase } from '@/contexts/SupabaseContext';
import { isAbortError } from '@/hooks/useAbortController';
import {
    getCourses, getAllQuestions,
    adminSaveCourse, adminDeleteCourse,
    adminSaveQuestion, adminDeleteQuestion,
    adminSaveSection, adminDeleteSection, adminAssignModulesToSection, adminUpdateCoursePaymentSettings,
    adminGetAllStudentAccess, adminGrantAccess, adminRevokeAccess,
    adminGetAllPayments, adminGetCoupons, adminSaveCoupon, adminToggleCoupon,
    adminGetPlatformStats, adminGetSubjectPerformance, adminGetQuestionAnalytics, adminGetStudentRoster,
    adminUploadQuestionImage, adminUploadCourseContent, adminUpdateTopicContent,
    adminGetTeamMembers, adminSetUserRole, adminRemoveUserRole, adminFindUserByEmail,
    adminSaveModule, adminDeleteModule, adminSaveTopic, adminDeleteTopic,
    getCourseSections,
    CourseWithModules, ModuleWithTopics, TopicWithProgress, QuestionRow, CourseSection, PaymentRow, CouponRow, StudentAccessRow,
    PlatformStats, SubjectPerformance, QuestionAnalytics, StudentSummary,
    AdminRole, ADMIN_ROLE_LABELS, ADMIN_ROLE_DESCRIPTIONS, ROLE_PERMISSIONS, TeamMember, adminSendNotification
} from '@/lib/api';

type Tab = 'courses' | 'questions' | 'sections' | 'students' | 'finance' | 'analytics' | 'team' | 'notifications';

export default function AdminPage() {
    const { profile } = useAuth();
    const { addToast } = useToast();
    const supabase = useSupabase();

    const [tab, setTab] = useState<Tab>('courses');
    const [loading, setLoading] = useState(true);
    // Keep a ref to courses so the tab-data effect can read it without depending on it
    const coursesRef = useRef<CourseWithModules[]>([]);

    // Courses tab
    const [courses, setCourses] = useState<CourseWithModules[]>([]);
    // Keep ref in sync with state
    useEffect(() => { coursesRef.current = courses; }, [courses]);
    const [editingCourse, setEditingCourse] = useState<Partial<CourseWithModules> | null>(null);
    const [savingCourse, setSavingCourse] = useState(false);

    // Modules/Topics state
    const [managingCourseStructure, setManagingCourseStructure] = useState<string | null>(null);
    const [editingModule, setEditingModule] = useState<Partial<ModuleWithTopics> | null>(null);
    const [savingModule, setSavingModule] = useState(false);
    const [editingTopic, setEditingTopic] = useState<Partial<TopicWithProgress> | null>(null);
    const [savingTopic, setSavingTopic] = useState(false);

    // Questions tab
    const [questions, setQuestions] = useState<QuestionRow[]>([]);
    const [editingQuestion, setEditingQuestion] = useState<Partial<QuestionRow> | null>(null);
    const [savingQuestion, setSavingQuestion] = useState(false);
    const [questionFilter, setQuestionFilter] = useState('');
    const stemRef = useRef<HTMLTextAreaElement>(null);
    const explanationRef = useRef<HTMLTextAreaElement>(null);

    // Content upload state
    const [uploadingContent, setUploadingContent] = useState(false);
    const [contentCourseId, setContentCourseId] = useState('');
    const [contentTopicId, setContentTopicId] = useState('');

    // Sections tab
    const [selectedCourseId, setSelectedCourseId] = useState('');
    const [sections, setSections] = useState<CourseSection[]>([]);
    const [editingSection, setEditingSection] = useState<Partial<CourseSection> | null>(null);
    const [savingSection, setSavingSection] = useState(false);
    const [courseExpiry, setCourseExpiry] = useState('');
    const [courseInstallment, setCourseInstallment] = useState(false);

    // Students tab
    const [studentAccess, setStudentAccess] = useState<StudentAccessRow[]>([]);
    const [allSections, setAllSections] = useState<(CourseSection & { courseName: string })[]>([]);
    const [grantUserId, setGrantUserId] = useState('');
    const [grantSectionId, setGrantSectionId] = useState('');
    const [grantNotes, setGrantNotes] = useState('');
    const [grantLoading, setGrantLoading] = useState(false);

    // Finance tab
    const [payments, setPayments] = useState<PaymentRow[]>([]);
    const [coupons, setCoupons] = useState<CouponRow[]>([]);
    const [financeSubTab, setFinanceSubTab] = useState<'payments' | 'coupons'>('payments');
    const [paymentFilter, setPaymentFilter] = useState<string>('all');
    const [newCoupon, setNewCoupon] = useState<Partial<CouponRow>>({ type: 'percentage', value: 10, is_active: true });
    const [savingCoupon, setSavingCoupon] = useState(false);

    // Analytics tab
    const [platformStats, setPlatformStats] = useState<PlatformStats | null>(null);
    const [subjectPerf, setSubjectPerf] = useState<SubjectPerformance[]>([]);
    const [questionAnalytics, setQuestionAnalytics] = useState<QuestionAnalytics[]>([]);
    const [studentRoster, setStudentRoster] = useState<StudentSummary[]>([]);
    const [qSortBy, setQSortBy] = useState<'hardest' | 'easiest' | 'mostAttempted'>('hardest');
    const [analyticsLoading, setAnalyticsLoading] = useState(false);

    // Team tab
    const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
    const [teamEmail, setTeamEmail] = useState('');
    const [teamRole, setTeamRole] = useState<AdminRole>('content_manager');
    const [teamSearchResult, setTeamSearchResult] = useState<{ id: string; email: string; first_name: string | null; last_name: string | null } | null>(null);
    const [teamSearching, setTeamSearching] = useState(false);
    const [teamSaving, setTeamSaving] = useState(false);

    // Notifications tab
    const [notificationPayload, setNotificationPayload] = useState({ title: '', message: '', type: 'system', link: '', targetUserId: 'all' });
    const [sendingNotification, setSendingNotification] = useState(false);

    // Role-based permissions
    const userRole = profile?.admin_role as AdminRole | null;
    const allowedTabs = userRole ? ROLE_PERMISSIONS[userRole] || [] : [];
    const canSeeTab = (t: string) => allowedTabs.includes(t);

    // Set initial tab to first allowed tab
    useEffect(() => {
        if (allowedTabs.length > 0 && !canSeeTab(tab)) {
            setTab(allowedTabs[0] as Tab);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [userRole]);

    useEffect(() => {
        const controller = new AbortController();
        async function load() {
            try {
                const [c, q] = await Promise.all([
                    getCourses(supabase, undefined, controller.signal),
                    getAllQuestions(supabase, controller.signal)
                ]);
                setCourses(c);
                setQuestions(q);
                setLoading(false);
            } catch (err) {
                if (isAbortError(err)) return;
                console.error('Admin init load error:', err);
            }
        }
        load();
        return () => controller.abort('AbortError');
    }, [supabase]);

    // Load sections when course changes
    useEffect(() => {
        if (!selectedCourseId) return;
        const controller = new AbortController();
        async function loadSections() {
            try {
                const sects = await getCourseSections(supabase, selectedCourseId, undefined, controller.signal);
                setSections(sects);
            } catch (err) {
                if (isAbortError(err)) return;
                console.error('Load sections error:', err);
            }
        }
        loadSections();
        const course = courses.find(c => c.id === selectedCourseId) as (CourseWithModules & { expiry_date?: string; is_installment?: boolean }) | undefined;
        if (course) {
            setCourseExpiry((course.expiry_date as string | undefined) || '');
            setCourseInstallment((course.is_installment as boolean | undefined) || false);
        }
        return () => controller.abort('AbortError');
    }, [selectedCourseId, courses, supabase]);

    // Load students and finance data on tab switch
    // NOTE: We intentionally exclude `courses` from deps and read it via coursesRef
    // to prevent this effect from re-running every time a course/module is saved.
    useEffect(() => {
        const controller = new AbortController();
        const signal = controller.signal;
        async function loadTabData() {
            try {
                if (tab === 'students') {
                    const access = await adminGetAllStudentAccess(supabase, signal);
                    setStudentAccess(access);
                    // Read latest courses from ref — avoids stale closure without adding
                    // courses as a reactive dependency (which caused cascading re-fetches)
                    const results = await Promise.all(
                        coursesRef.current.map(c =>
                            getCourseSections(supabase, c.id, undefined, signal).then(sects =>
                                sects.map(s => ({ ...s, courseName: c.name }))
                            )
                        )
                    );
                    setAllSections(results.flat());
                }
                if (tab === 'finance') {
                    const [p, c] = await Promise.all([
                        adminGetAllPayments(supabase, signal),
                        adminGetCoupons(supabase, signal),
                    ]);
                    setPayments(p);
                    setCoupons(c);
                }
                if (tab === 'analytics') {
                    setAnalyticsLoading(true);
                    const [stats, subj, qana, roster] = await Promise.all([
                        adminGetPlatformStats(supabase, signal),
                        adminGetSubjectPerformance(supabase, signal),
                        adminGetQuestionAnalytics(supabase, 30, qSortBy, signal),
                        adminGetStudentRoster(supabase, signal),
                    ]);
                    setPlatformStats(stats);
                    setSubjectPerf(subj);
                    setQuestionAnalytics(qana);
                    setStudentRoster(roster);
                    setAnalyticsLoading(false);
                }
                if (tab === 'team') {
                    const members = await adminGetTeamMembers(supabase, signal);
                    setTeamMembers(members);
                }
            } catch (err) {
                // Always reset analytics loading flag — even on abort — so the
                // spinner is never left stuck after a quick tab switch.
                setAnalyticsLoading(false);
                if (isAbortError(err)) return;
                console.error('Tab data load error:', err);
            }
        }
        loadTabData();
        return () => controller.abort('AbortError');
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [tab, qSortBy, supabase]);

    if (!profile?.admin_role) {
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
        const { error } = await adminSaveCourse(supabase, {
            id: editingCourse.id,
            name: editingCourse.name,
            icon: editingCourse.icon || '📚',
            color: editingCourse.color || '#2563EB',
            description: editingCourse.description || '',
            total_lessons: editingCourse.total_lessons || 0,
            total_questions: editingCourse.total_questions || 0,
            sort_order: editingCourse.sort_order || courses.length,
        });
        if (error) { addToast(error.message, 'error'); } else {
            addToast('Course saved!', 'success');
            setCourses(await getCourses(supabase));
            setEditingCourse(null);
        }
        setSavingCourse(false);
    };

    const handleDeleteCourse = async (courseId: string) => {
        if (!confirm('Delete this course and all its data?')) return;
        const { error } = await adminDeleteCourse(supabase, courseId);
        if (error) { addToast(error.message, 'error'); } else {
            addToast('Course deleted', 'success');
            setCourses(prev => prev.filter(c => c.id !== courseId));
        }
    };

    // ===== MODULE HANDLERS =====
    const handleSaveModule = async () => {
        if (!editingModule || !managingCourseStructure || !editingModule.name) return;
        setSavingModule(true);
        const id = editingModule.id || editingModule.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const { error } = await adminSaveModule(supabase, {
            id,
            course_id: managingCourseStructure,
            name: editingModule.name,
            sort_order: editingModule.sort_order || 0,
        });
        if (error) { addToast(error.message, 'error'); } else {
            addToast('Module saved', 'success');
            setCourses(await getCourses(supabase));
            setEditingModule(null);
        }
        setSavingModule(false);
    };

    const handleDeleteModule = async (moduleId: string) => {
        if (!confirm('Delete this module and all its topics?')) return;
        const { error } = await adminDeleteModule(supabase, moduleId);
        if (error) { addToast(error.message, 'error'); } else {
            addToast('Module deleted', 'success');
            setCourses(await getCourses(supabase));
        }
    };

    // ===== TOPIC HANDLERS =====
    const handleSaveTopic = async () => {
        if (!editingTopic || !editingTopic.module_id || !editingTopic.name) return;
        setSavingTopic(true);
        const id = editingTopic.id || editingTopic.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
        const { error } = await adminSaveTopic(supabase, {
            id,
            module_id: editingTopic.module_id,
            name: editingTopic.name,
            lesson_type: editingTopic.lesson_type || 'video',
            question_count: editingTopic.question_count || 0,
            sort_order: editingTopic.sort_order || 0,
        });
        if (error) { addToast(error.message, 'error'); } else {
            addToast('Topic saved', 'success');
            setCourses(await getCourses(supabase));
            setEditingTopic(null);
        }
        setSavingTopic(false);
    };

    const handleDeleteTopic = async (topicId: string) => {
        if (!confirm('Delete this topic?')) return;
        const { error } = await adminDeleteTopic(supabase, topicId);
        if (error) { addToast(error.message, 'error'); } else {
            addToast('Topic deleted', 'success');
            setCourses(await getCourses(supabase));
        }
    };

    // ===== QUESTION HANDLERS =====
    const handleSaveQuestion = async () => {
        if (!editingQuestion || !editingQuestion.id || !editingQuestion.stem) return;
        setSavingQuestion(true);
        const { error } = await adminSaveQuestion(supabase, {
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
            image_url: editingQuestion.image_url || null,
        });
        if (error) { addToast(error.message, 'error'); } else {
            addToast('Question saved!', 'success');
            setQuestions(await getAllQuestions(supabase));
            setEditingQuestion(null);
        }
        setSavingQuestion(false);
    };

    const handleDeleteQuestion = async (qId: string) => {
        const { error } = await adminDeleteQuestion(supabase, qId);
        if (error) { addToast(error.message, 'error'); } else {
            addToast('Question deleted', 'success');
            setQuestions(prev => prev.filter(q => q.id !== qId));
        }
    };

    const handleQuestionImageUpload = async (file: File): Promise<string | null> => {
        if (!editingQuestion?.id) { addToast('Save question ID first', 'error'); return null; }
        const { url, error } = await adminUploadQuestionImage(supabase, file, editingQuestion.id);
        if (error) { addToast(error.message, 'error'); return null; }
        if (url) setEditingQuestion(prev => prev ? { ...prev, image_url: url } : prev);
        addToast('Image uploaded!', 'success');
        return url;
    };

    const handleContentUpload = async (file: File) => {
        if (!contentCourseId || !contentTopicId) { addToast('Select course and topic first', 'error'); return; }
        setUploadingContent(true);
        const { url, error } = await adminUploadCourseContent(supabase, file, contentCourseId, contentTopicId);
        if (error) { addToast(error.message, 'error'); setUploadingContent(false); return; }
        if (url) {
            const ext = file.name.split('.').pop()?.toLowerCase();
            const contentType = ext === 'pdf' ? 'pdf' : (ext === 'pptx' || ext === 'ppt') ? 'presentation' : ['mp4', 'webm', 'mov', 'avi', 'mkv'].includes(ext || '') ? 'video' : 'file';
            const { error: updateErr } = await adminUpdateTopicContent(supabase, contentTopicId, url, contentType);
            if (updateErr) { addToast(updateErr.message, 'error'); }
            else {
                const label = contentType === 'pdf' ? 'PDF' : contentType === 'video' ? 'Video' : 'Presentation';
                addToast(`${label} uploaded successfully!`, 'success');
                setCourses(await getCourses(supabase));
            }
        }
        setUploadingContent(false);
    };

    // ===== SECTION HANDLERS =====
    const handleSaveSection = async (moduleIds?: string[]) => {
        if (!editingSection || !editingSection.name || !selectedCourseId) return;
        setSavingSection(true);
        const { id, error } = await adminSaveSection(supabase, {
            id: editingSection.id,
            course_id: selectedCourseId,
            name: editingSection.name,
            section_number: editingSection.section_number || sections.length + 1,
            price: editingSection.price || 0,
            currency: editingSection.currency || 'EUR',
            sort_order: editingSection.sort_order || sections.length,
        });
        
        if (error) { addToast(error.message, 'error'); } 
        else {
            if (id && moduleIds) {
                await adminAssignModulesToSection(supabase, id, moduleIds);
            }
            addToast('Section saved!', 'success');
            setSections(await getCourseSections(supabase, selectedCourseId));
            setEditingSection(null);
        }
        setSavingSection(false);
    };

    const handleSaveCourseSettings = async () => {
        if (!selectedCourseId) return;
        const { error } = await adminUpdateCoursePaymentSettings(supabase, selectedCourseId, {
            expiry_date: courseExpiry || null,
            is_installment: courseInstallment,
        });
        if (error) { addToast(error.message, 'error'); } else { addToast('Course settings saved!', 'success'); }
    };

    // ===== GRANT ACCESS HANDLER =====
    const handleGrantAccess = async () => {
        if (!grantUserId || !grantSectionId) return;
        setGrantLoading(true);
        const { error } = await adminGrantAccess(supabase, grantUserId, grantSectionId, grantNotes);

        if (error) { addToast(error.message, 'error'); } else {
            addToast('Access granted!', 'success');
            setGrantUserId(''); setGrantSectionId(''); setGrantNotes('');
            setStudentAccess(await adminGetAllStudentAccess(supabase));
        }
        setGrantLoading(false);
    };

    const handleRevokeAccess = async (userId: string, sectionId: string) => {
        const { error } = await adminRevokeAccess(supabase, userId, sectionId);
        if (error) { addToast(error.message, 'error'); } else {
            addToast('Access revoked', 'info');
            setStudentAccess(await adminGetAllStudentAccess(supabase));
        }
    };

    // ===== COUPON HANDLERS =====
    const handleSaveCoupon = async () => {
        if (!newCoupon.code || !newCoupon.value) return;
        setSavingCoupon(true);
        const { error } = await adminSaveCoupon(supabase, {
            code: newCoupon.code.toUpperCase(),
            type: newCoupon.type || 'percentage',
            value: newCoupon.value || 0,
            max_uses: newCoupon.max_uses || null,
            expires_at: newCoupon.expires_at || null,
            is_active: true,
        });
        if (error) { addToast(error.message, 'error'); } else {
            addToast('Coupon created!', 'success');
            setCoupons(await adminGetCoupons(supabase));
            setNewCoupon({ type: 'percentage', value: 10, is_active: true });
        }
        setSavingCoupon(false);
    };

    // ===== NOTIFICATION HANDLER =====
    const handleSendNotification = async () => {
        if (!notificationPayload.title || !notificationPayload.message) {
            addToast('Title and message are required', 'error');
            return;
        }
        setSendingNotification(true);
        const { error, recipientCount } = await adminSendNotification(supabase, notificationPayload);
        if (error) { addToast(error.message, 'error'); } else {
            const target = notificationPayload.targetUserId === 'all'
                ? `${recipientCount ?? '?'} users`
                : '1 user';
            addToast(`Notification sent to ${target}!`, 'success');
            setNotificationPayload({ title: '', message: '', type: 'system', link: '', targetUserId: 'all' });
        }
        setSendingNotification(false);
    };

    const filteredQuestions = questionFilter
        ? questions.filter(q => q.subject.toLowerCase().includes(questionFilter.toLowerCase()) || q.topic.toLowerCase().includes(questionFilter.toLowerCase()) || q.stem.toLowerCase().includes(questionFilter.toLowerCase()))
        : questions;

    const filteredPayments = paymentFilter === 'all' ? payments : payments.filter(p => p.status === paymentFilter);
    const totalRevenue = payments.filter(p => p.status === 'paid').reduce((sum, p) => sum + p.amount, 0);

    if (loading) {
        return (
            <AppLayout>
                <div className="page-wrapper" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
                    <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-tertiary)' }} />
                </div>
            </AppLayout>
        );
    }

    const selectedCourse = courses.find(c => c.id === selectedCourseId);

    return (
        <AppLayout>
            <div className="page-wrapper">
                <div className="page-header">
                    <h1>Admin Panel</h1>
                    <p style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        Manage courses, payments, access, and content
                        {userRole && (
                            <span className="badge" style={{ background: 'rgba(168,85,247,0.15)', color: '#c084fc', marginLeft: 'var(--space-2)' }}>
                                <Shield size={10} style={{ display: 'inline', marginRight: 2 }} />
                                {ADMIN_ROLE_LABELS[userRole]}
                            </span>
                        )}
                    </p>
                </div>

                {/* Stats */}
                <div className="grid grid-4" style={{ marginBottom: 'var(--space-6)' }}>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'rgba(37,99,235,0.15)', color: 'var(--brand-accent-light)' }}><BookOpen size={20} /></div>
                        <div className="stat-value">{courses.length}</div>
                        <div className="stat-label">Courses</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.15)', color: 'var(--color-success-light)' }}><HelpCircle size={20} /></div>
                        <div className="stat-value">{questions.length}</div>
                        <div className="stat-label">Questions</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.15)', color: 'var(--color-warning-light)' }}><CreditCard size={20} /></div>
                        <div className="stat-value">€{totalRevenue.toFixed(0)}</div>
                        <div className="stat-label">Total Revenue</div>
                    </div>
                    <div className="stat-card">
                        <div className="stat-icon" style={{ background: 'rgba(168,85,247,0.15)', color: '#c084fc' }}><Users size={20} /></div>
                        <div className="stat-value">{payments.filter(p => p.status === 'paid').length}</div>
                        <div className="stat-label">Paid Students</div>
                    </div>
                </div>

                {/* Tabs — filtered by role */}
                <div className="admin-tabs" style={{ flexWrap: 'wrap' }}>
                    {([
                        { key: 'courses', label: 'Courses', icon: <BookOpen size={14} /> },
                        { key: 'questions', label: `Questions (${questions.length})`, icon: <HelpCircle size={14} /> },
                        { key: 'sections', label: 'Sections & Pricing', icon: <Layers size={14} /> },
                        { key: 'students', label: 'Student Access', icon: <Users size={14} /> },
                        { key: 'finance', label: 'Finance', icon: <CreditCard size={14} /> },
                        { key: 'analytics', label: 'Analytics', icon: <BarChart2 size={14} /> },
                        { key: 'team', label: 'Team', icon: <UserCog size={14} /> },
                        { key: 'notifications', label: 'Notifications', icon: <Bell size={14} /> },
                    ] as { key: Tab; label: string; icon: React.ReactNode }[]).filter(t => canSeeTab(t.key)).map(t => (
                        <button key={t.key} className={`admin-tab ${tab === t.key ? 'active' : ''}`} onClick={() => setTab(t.key)}>
                            <span style={{ display: 'inline', verticalAlign: 'middle', marginRight: 6 }}>{t.icon}</span>{t.label}
                        </button>
                    ))}
                </div>

                {/* ===== COURSES TAB ===== */}
                {tab === 'courses' && (
                    <div>
                        {managingCourseStructure ? (() => {
                            const course = courses.find(c => c.id === managingCourseStructure);
                            if (!course) return null;
                            return (
                                <div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-6)' }}>
                                        <button className="btn btn-secondary btn-sm" onClick={() => setManagingCourseStructure(null)}>
                                            <ArrowLeft size={14} /> Back to Courses
                                        </button>
                                        <h2 style={{ fontSize: 'var(--fs-xl)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                            {course.icon} {course.name} Structure
                                        </h2>
                                        <button className="btn btn-primary btn-sm" onClick={() => setEditingModule({ id: '', course_id: course.id, name: '', sort_order: (course.modules?.length || 0) + 1 })}>
                                            <Plus size={14} /> Add Module
                                        </button>
                                    </div>

                                    {(!course.modules || course.modules.length === 0) ? (
                                        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-tertiary)' }}>
                                            <FolderTree size={32} style={{ margin: '0 auto var(--space-3)' }} />
                                            <p>No modules yet. Add a module to start organizing your course.</p>
                                        </div>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                                            {course.modules.sort((a, b) => a.sort_order - b.sort_order).map(mod => (
                                                <div key={mod.id} className="card" style={{ padding: 'var(--space-4)' }}>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-primary)', paddingBottom: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                                                        <h3 style={{ fontSize: 'var(--fs-md)', fontWeight: 700, display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                                            <FolderTree size={16} style={{ color: 'var(--brand-accent)' }} /> {mod.name}
                                                        </h3>
                                                        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                                                            <button className="btn btn-secondary btn-sm" onClick={() => setEditingTopic({ id: '', module_id: mod.id, name: '', lesson_type: 'video', question_count: 0, sort_order: (mod.topics?.length || 0) + 1 })}>
                                                                <Plus size={14} /> Add Topic
                                                            </button>
                                                            <button className="btn btn-ghost btn-sm" onClick={() => setEditingModule(mod)}><Edit3 size={14} /></button>
                                                            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => handleDeleteModule(mod.id)}><Trash2 size={14} /></button>
                                                        </div>
                                                    </div>

                                                    {(!mod.topics || mod.topics.length === 0) ? (
                                                        <p className="text-secondary text-sm" style={{ padding: 'var(--space-2)', textAlign: 'center', fontStyle: 'italic' }}>No topics in this module yet.</p>
                                                    ) : (
                                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                                                            {mod.topics.sort((a, b) => a.sort_order - b.sort_order).map(topic => (
                                                                <div key={topic.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-glass)', padding: 'var(--space-2) var(--space-4)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-primary)' }}>
                                                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                                                                        {topic.lesson_type === 'video' ? <Video size={14} style={{ color: '#ef4444' }} /> : topic.lesson_type === 'pdf' ? <FileText size={14} style={{ color: '#3b82f6' }} /> : <FileQuestion size={14} style={{ color: '#10b981' }} />}
                                                                        <span style={{ fontWeight: 500, fontSize: 'var(--fs-sm)' }}>{topic.name}</span>
                                                                        {topic.lesson_type === 'quiz' && <span className="badge badge-success" style={{ fontSize: 9 }}>{topic.question_count} Qs</span>}
                                                                        {topic.content_url && <span className="badge badge-accent" style={{ fontSize: 9 }}>Content Uploaded</span>}
                                                                    </div>
                                                                    <div style={{ display: 'flex', gap: 'var(--space-1)' }}>
                                                                        <button className="btn btn-ghost btn-sm" style={{ padding: '4px' }} onClick={() => setEditingTopic(topic)}><Edit3 size={14} /></button>
                                                                        <button className="btn btn-ghost btn-sm" style={{ padding: '4px', color: 'var(--color-danger)' }} onClick={() => handleDeleteTopic(topic.id)}><Trash2 size={14} /></button>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            );
                        })() : (
                            <>
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 'var(--space-4)' }}>
                                    <button className="btn btn-primary btn-sm" onClick={() => setEditingCourse({ id: '', name: '', icon: '📚', color: '#2563EB', description: '', total_lessons: 0, total_questions: 0, sort_order: courses.length })}>
                                        <Plus size={14} /> Add Course
                                    </button>
                                </div>
                                <div className="table-wrapper">
                                    <table>
                                        <thead><tr><th>Icon</th><th>Name</th><th>ID</th><th>Lessons</th><th>Questions</th><th>Actions</th></tr></thead>
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
                                                            <button className="btn btn-secondary btn-sm" onClick={() => setManagingCourseStructure(course.id)}><FolderTree size={14} /> Structure</button>
                                                            <button className="btn btn-ghost btn-sm" onClick={() => setEditingCourse(course)}><Edit3 size={14} /></button>
                                                            <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => handleDeleteCourse(course.id)}><Trash2 size={14} /></button>
                                                        </div>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </>
                        )}

                        {/* Content Upload */}
                        <div className="card" style={{ marginTop: 'var(--space-6)' }}>
                            <h3 style={{ fontSize: 'var(--fs-md)', fontWeight: 600, marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                <Upload size={18} /> Upload Content (Videos, PDFs, Presentations)
                            </h3>
                            <p className="text-secondary text-sm" style={{ marginBottom: 'var(--space-4)' }}>
                                Upload videos, PDF study materials, or PowerPoint presentations to any topic. Max 50MB per file.
                            </p>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
                                <div className="input-group">
                                    <label>Course</label>
                                    <select className="select" value={contentCourseId} onChange={e => { setContentCourseId(e.target.value); setContentTopicId(''); }}>
                                        <option value="">Select course...</option>
                                        {courses.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                                    </select>
                                </div>
                                <div className="input-group">
                                    <label>Topic</label>
                                    <select className="select" value={contentTopicId} onChange={e => setContentTopicId(e.target.value)} disabled={!contentCourseId}>
                                        <option value="">Select topic...</option>
                                        {contentCourseId && courses.find(c => c.id === contentCourseId)?.modules.flatMap(m =>
                                            m.topics.map(t => (
                                                <option key={t.id} value={t.id}>{m.name} → {t.name} ({t.lesson_type})</option>
                                            ))
                                        )}
                                    </select>
                                </div>
                            </div>
                            <div
                                style={{
                                    border: '2px dashed var(--border-primary)',
                                    borderRadius: 'var(--radius-md)',
                                    padding: 'var(--space-8)',
                                    textAlign: 'center',
                                    background: 'var(--bg-glass)',
                                    cursor: contentCourseId && contentTopicId ? 'pointer' : 'not-allowed',
                                    opacity: contentCourseId && contentTopicId ? 1 : 0.5,
                                    transition: 'all 0.15s ease',
                                    position: 'relative',
                                }}
                                onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--brand-accent)'; }}
                                onDragLeave={e => { e.currentTarget.style.borderColor = 'var(--border-primary)'; }}
                                onDrop={e => {
                                    e.preventDefault();
                                    e.currentTarget.style.borderColor = 'var(--border-primary)';
                                    const file = e.dataTransfer.files[0];
                                    if (file) handleContentUpload(file);
                                }}
                                onClick={() => {
                                    if (!contentCourseId || !contentTopicId) return;
                                    const input = document.createElement('input');
                                    input.type = 'file';
                                    input.accept = '.pdf,.pptx,.ppt,.mp4,.webm,.mov,.avi,.mkv';
                                    input.onchange = (e) => {
                                        const file = (e.target as HTMLInputElement).files?.[0];
                                        if (file) handleContentUpload(file);
                                    };
                                    input.click();
                                }}
                            >
                                {uploadingContent ? (
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 'var(--space-3)' }}>
                                        <Loader2 size={24} style={{ animation: 'spin 1s linear infinite', color: 'var(--brand-accent-light)' }} />
                                        <span>Uploading...</span>
                                    </div>
                                ) : (
                                    <>
                                        <Upload size={32} style={{ color: 'var(--text-tertiary)', marginBottom: 'var(--space-2)' }} />
                                        <p style={{ fontWeight: 600, marginBottom: 'var(--space-1)' }}>Drop file here or click to browse</p>
                                        <p className="text-xs text-secondary">MP4, WebM, MOV, PDF, PPTX • Max 50MB</p>
                                    </>
                                )}
                            </div>

                            {/* Show topics with uploaded content */}
                            {contentCourseId && (() => {
                                const c = courses.find(cc => cc.id === contentCourseId);
                                const uploaded = c?.modules.flatMap(m => m.topics.filter(t => t.content_url)) || [];
                                if (uploaded.length === 0) return null;
                                return (
                                    <div style={{ marginTop: 'var(--space-4)' }}>
                                        <label style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)', marginBottom: 'var(--space-2)', display: 'block' }}>
                                            Uploaded Content ({uploaded.length} files)
                                        </label>
                                        {uploaded.map(t => (
                                            <div key={t.id} style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                padding: 'var(--space-2) var(--space-3)', background: 'var(--bg-glass)',
                                                borderRadius: 'var(--radius-sm)', marginBottom: 'var(--space-1)',
                                                fontSize: 'var(--fs-xs)',
                                            }}>
                                                <span style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                                    {t.content_type === 'video' ? <Video size={14} style={{ color: '#ef4444' }} /> : <FileText size={14} style={{ color: 'var(--color-warning)' }} />}
                                                    <strong>{t.name}</strong>
                                                    <span className="badge" style={{ fontSize: 9 }}>{t.content_type}</span>
                                                </span>
                                                <a href={t.content_url!} target="_blank" rel="noopener noreferrer" className="text-accent" style={{ fontSize: 'var(--fs-xs)' }}>
                                                    View ↗
                                                </a>
                                            </div>
                                        ))}
                                    </div>
                                );
                            })()}
                        </div>
                    </div>
                )}

                {/* ===== QUESTIONS TAB ===== */}
                {tab === 'questions' && (
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 'var(--space-4)', marginBottom: 'var(--space-4)' }}>
                            <input className="input" placeholder="Filter by subject, topic, or keyword..." value={questionFilter} onChange={e => setQuestionFilter(e.target.value)} style={{ maxWidth: 400 }} />
                            <button className="btn btn-primary btn-sm" onClick={() => setEditingQuestion({ id: '', subject: '', topic: '', difficulty: 'medium', stem: '', options: ['A) ', 'B) ', 'C) ', 'D) ', 'E) '], correct_answer: 0, explanation: '', source: 'locomotive-original', year: null })}>
                                <Plus size={14} /> Add Question
                            </button>
                        </div>
                        <div className="table-wrapper">
                            <table>
                                <thead><tr><th>Subject</th><th>Topic</th><th style={{ maxWidth: 300 }}>Stem</th><th>Difficulty</th><th>Source</th><th>Actions</th></tr></thead>
                                <tbody>
                                    {filteredQuestions.map(q => (
                                        <tr key={q.id}>
                                            <td style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{q.subject}</td>
                                            <td className="text-secondary text-sm">{q.topic}</td>
                                            <td style={{ maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{q.stem}</td>
                                            <td><span className={`badge ${q.difficulty === 'easy' ? 'badge-accent' : q.difficulty === 'hard' ? 'badge-danger' : ''}`}>{q.difficulty}</span></td>
                                            <td className="text-xs text-secondary">{q.source}</td>
                                            <td>
                                                <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                                                    <button className="btn btn-ghost btn-sm" onClick={() => setEditingQuestion(q)}><Edit3 size={14} /></button>
                                                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => handleDeleteQuestion(q.id)}><Trash2 size={14} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <p className="text-xs text-secondary" style={{ marginTop: 'var(--space-3)' }}>Showing {filteredQuestions.length} of {questions.length} questions</p>
                    </div>
                )}

                {/* ===== SECTIONS TAB ===== */}
                {tab === 'sections' && (
                    <div>
                        {/* Course selector */}
                        <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
                            <h3 style={{ fontSize: 'var(--fs-md)', fontWeight: 600, marginBottom: 'var(--space-4)' }}>Course Payment Settings</h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr auto', gap: 'var(--space-4)', alignItems: 'end' }}>
                                <div className="input-group">
                                    <label>Select Course</label>
                                    <select className="select" value={selectedCourseId} onChange={e => setSelectedCourseId(e.target.value)}>
                                        <option value="">Choose a course...</option>
                                        {courses.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                                    </select>
                                </div>
                                <div className="input-group">
                                    <label>Exam / Expiry Date</label>
                                    <input className="input" type="date" value={courseExpiry} onChange={e => setCourseExpiry(e.target.value)} disabled={!selectedCourseId} />
                                </div>
                                <div className="input-group">
                                    <label>Mode</label>
                                    <select className="select" value={courseInstallment ? 'installment' : 'single'} onChange={e => setCourseInstallment(e.target.value === 'installment')} disabled={!selectedCourseId}>
                                        <option value="single">Single Payment</option>
                                        <option value="installment">Installments</option>
                                    </select>
                                </div>
                                <button className="btn btn-primary btn-sm" disabled={!selectedCourseId} onClick={handleSaveCourseSettings}><Save size={14} /> Save</button>
                            </div>
                        </div>

                        {selectedCourseId && (
                            <>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)' }}>
                                    <h3 style={{ fontSize: 'var(--fs-md)', fontWeight: 600 }}>
                                        {selectedCourse?.name} — Sections ({sections.length})
                                    </h3>
                                    <button className="btn btn-primary btn-sm" onClick={() => setEditingSection({ name: '', section_number: sections.length + 1, price: 0, currency: 'EUR', sort_order: sections.length })}>
                                        <Plus size={14} /> Add Section
                                    </button>
                                </div>

                                {sections.length === 0 ? (
                                    <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-tertiary)' }}>
                                        <Layers size={32} style={{ margin: '0 auto var(--space-3)' }} />
                                        <p>No sections yet. Add sections to enable payments for this course.</p>
                                    </div>
                                ) : (
                                    <div className="table-wrapper">
                                        <table>
                                            <thead><tr><th>#</th><th>Section Name</th><th>Price</th><th>Currency</th><th>Modules</th><th>Actions</th></tr></thead>
                                            <tbody>
                                                {sections.map(s => (
                                                    <tr key={s.id}>
                                                        <td style={{ fontWeight: 700, color: 'var(--brand-accent-light)' }}>{s.section_number}</td>
                                                        <td style={{ fontWeight: 500 }}>{s.name}</td>
                                                        <td>€{Number(s.price).toFixed(2)}</td>
                                                        <td className="text-secondary text-xs">{s.currency}</td>
                                                        <td className="text-secondary text-xs">{(s.moduleIds || []).length} modules</td>
                                                        <td>
                                                            <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                                                                <button className="btn btn-ghost btn-sm" onClick={() => setEditingSection(s)}><Edit3 size={14} /></button>
                                                                <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={async () => {
                                                                    const { error } = await adminDeleteSection(supabase, s.id);
                                                                    if (error) { addToast(error.message, 'error'); } else {
                                                                        addToast('Section deleted', 'success');
                                                                        setSections(await getCourseSections(supabase, selectedCourseId));
                                                                    }
                                                                }}><Trash2 size={14} /></button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}

                {/* ===== STUDENTS TAB ===== */}
                {tab === 'students' && (
                    <div>
                        {/* Grant access form */}
                        <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
                            <h3 style={{ fontSize: 'var(--fs-md)', fontWeight: 600, marginBottom: 'var(--space-4)' }}>
                                <Gift size={16} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 8 }} />
                                Grant Free Access
                            </h3>
                            <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr 3fr auto', gap: 'var(--space-4)', alignItems: 'end' }}>
                                <div className="input-group">
                                    <label>Student User ID</label>
                                    <input className="input" value={grantUserId} onChange={e => setGrantUserId(e.target.value)} placeholder="UUID from Supabase Auth" />
                                </div>
                                <div className="input-group">
                                    <label>Section</label>
                                    <select className="select" value={grantSectionId} onChange={e => setGrantSectionId(e.target.value)}>
                                        <option value="">Select section...</option>
                                        {allSections.map(s => (
                                            <option key={s.id} value={s.id}>{s.courseName} — {s.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="input-group">
                                    <label>Notes (optional)</label>
                                    <input className="input" value={grantNotes} onChange={e => setGrantNotes(e.target.value)} placeholder="e.g. Scholarship, promotion..." />
                                </div>
                                <button className="btn btn-primary btn-sm" disabled={!grantUserId || !grantSectionId || grantLoading} onClick={handleGrantAccess}>
                                    {grantLoading ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Gift size={14} />} Grant
                                </button>
                            </div>
                        </div>

                        <h3 style={{ fontSize: 'var(--fs-md)', fontWeight: 600, marginBottom: 'var(--space-4)' }}>All Student Access</h3>
                        <div className="table-wrapper">
                            <table>
                                <thead><tr><th>User ID</th><th>Course</th><th>Section</th><th>Status</th><th>Granted</th><th>Notes</th><th>Actions</th></tr></thead>
                                <tbody>
                                    {studentAccess.length === 0 ? (
                                        <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: 'var(--space-6)' }}>No student access records yet</td></tr>
                                    ) : studentAccess.map(a => (
                                        <tr key={a.id}>
                                            <td className="text-xs text-secondary" style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis' }}>{a.user_id}</td>
                                            <td className="text-sm">{a.course_name}</td>
                                            <td className="text-sm">{a.section_name}</td>
                                            <td>
                                                <span className={`badge ${a.status === 'active' ? 'badge-success' : a.status === 'free_grant' ? 'badge-accent' : 'badge-danger'}`}>
                                                    {a.status === 'free_grant' ? '🎁 Free' : a.status}
                                                </span>
                                            </td>
                                            <td className="text-xs text-secondary">{new Date(a.granted_at).toLocaleDateString()}</td>
                                            <td className="text-xs text-secondary">{a.notes || '—'}</td>
                                            <td>
                                                {a.status !== 'refunded' && (
                                                    <button className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)' }} onClick={() => handleRevokeAccess(a.user_id, a.section_id)}>
                                                        <XCircle size={14} /> Revoke
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {/* ===== FINANCE TAB ===== */}
                {tab === 'finance' && (
                    <div>
                        {/* Finance sub-tabs */}
                        <div style={{ display: 'flex', gap: 'var(--space-2)', marginBottom: 'var(--space-5)' }}>
                            <button className={`btn btn-sm ${financeSubTab === 'payments' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFinanceSubTab('payments')}>
                                <CreditCard size={14} /> Payments ({payments.length})
                            </button>
                            <button className={`btn btn-sm ${financeSubTab === 'coupons' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setFinanceSubTab('coupons')}>
                                <Tag size={14} /> Coupons ({coupons.length})
                            </button>
                        </div>

                        {financeSubTab === 'payments' && (
                            <div>
                                {/* Revenue stats */}
                                <div className="grid grid-4" style={{ marginBottom: 'var(--space-5)' }}>
                                    {(['paid', 'pending', 'failed', 'refunded'] as const).map(s => {
                                        const count = payments.filter(p => p.status === s).length;
                                        const rev = payments.filter(p => p.status === s).reduce((sum, p) => sum + p.amount, 0);
                                        const colors: Record<string, string> = { paid: 'var(--color-success)', pending: 'var(--color-warning)', failed: 'var(--color-danger)', refunded: 'var(--text-tertiary)' };
                                        return (
                                            <div key={s} className="stat-card" style={{ cursor: 'pointer', border: paymentFilter === s ? '1px solid var(--brand-accent)' : undefined }} onClick={() => setPaymentFilter(paymentFilter === s ? 'all' : s)}>
                                                <div className="stat-value" style={{ color: colors[s] }}>{count}</div>
                                                <div className="stat-label" style={{ textTransform: 'capitalize' }}>{s} • €{rev.toFixed(0)}</div>
                                            </div>
                                        );
                                    })}
                                </div>

                                <div className="table-wrapper">
                                    <table>
                                        <thead><tr><th>Date</th><th>Student</th><th>Course / Section</th><th>Amount</th><th>Discount</th><th>Status</th><th>PayPal ID</th></tr></thead>
                                        <tbody>
                                            {filteredPayments.length === 0 ? (
                                                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: 'var(--space-6)' }}>No payments found</td></tr>
                                            ) : filteredPayments.map(p => (
                                                <tr key={p.id}>
                                                    <td className="text-xs text-secondary">{new Date(p.created_at).toLocaleDateString()}</td>
                                                    <td className="text-xs text-secondary" style={{ maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.user_id}</td>
                                                    <td className="text-sm">{p.course_name}<br /><span className="text-xs text-secondary">{p.section_name}</span></td>
                                                    <td style={{ fontWeight: 600 }}>€{Number(p.amount).toFixed(2)}</td>
                                                    <td className="text-xs" style={{ color: 'var(--color-success)' }}>{p.discount_amount > 0 ? `-€${Number(p.discount_amount).toFixed(2)}` : '—'}</td>
                                                    <td>
                                                        <span className={`badge ${p.status === 'paid' ? 'badge-success' : p.status === 'pending' ? 'badge-warning' : 'badge-danger'}`}>
                                                            {p.status === 'paid' ? <CheckCircle size={10} style={{ display: 'inline' }} /> : p.status === 'failed' ? <XCircle size={10} style={{ display: 'inline' }} /> : null} {p.status}
                                                        </span>
                                                    </td>
                                                    <td className="text-xs text-secondary" style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.paypal_order_id || '—'}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <p className="text-xs text-secondary" style={{ marginTop: 'var(--space-3)' }}>
                                    Total revenue: <strong>€{totalRevenue.toFixed(2)}</strong> from {payments.filter(p => p.status === 'paid').length} successful payments
                                </p>
                            </div>
                        )}

                        {financeSubTab === 'coupons' && (
                            <div>
                                {/* New coupon form */}
                                <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
                                    <h3 style={{ fontSize: 'var(--fs-md)', fontWeight: 600, marginBottom: 'var(--space-4)' }}>Create Coupon</h3>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr auto', gap: 'var(--space-4)', alignItems: 'end' }}>
                                        <div className="input-group">
                                            <label>Code</label>
                                            <input className="input" value={newCoupon.code || ''} onChange={e => setNewCoupon({ ...newCoupon, code: e.target.value.toUpperCase() })} placeholder="SUMMER20" />
                                        </div>
                                        <div className="input-group">
                                            <label>Type</label>
                                            <select className="select" value={newCoupon.type} onChange={e => setNewCoupon({ ...newCoupon, type: e.target.value as 'percentage' | 'fixed' })}>
                                                <option value="percentage">Percentage (%)</option>
                                                <option value="fixed">Fixed (€)</option>
                                            </select>
                                        </div>
                                        <div className="input-group">
                                            <label>Value</label>
                                            <input className="input" type="number" value={newCoupon.value || ''} onChange={e => setNewCoupon({ ...newCoupon, value: parseFloat(e.target.value) || 0 })} placeholder={newCoupon.type === 'percentage' ? '20' : '10'} />
                                        </div>
                                        <div className="input-group">
                                            <label>Max Uses</label>
                                            <input className="input" type="number" value={newCoupon.max_uses || ''} onChange={e => setNewCoupon({ ...newCoupon, max_uses: parseInt(e.target.value) || undefined })} placeholder="Unlimited" />
                                        </div>
                                        <div className="input-group">
                                            <label>Expires</label>
                                            <input className="input" type="date" value={newCoupon.expires_at || ''} onChange={e => setNewCoupon({ ...newCoupon, expires_at: e.target.value || null })} />
                                        </div>
                                        <button className="btn btn-primary btn-sm" onClick={handleSaveCoupon} disabled={savingCoupon || !newCoupon.code}>
                                            {savingCoupon ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Plus size={14} />} Create
                                        </button>
                                    </div>
                                </div>

                                <div className="table-wrapper">
                                    <table>
                                        <thead><tr><th>Code</th><th>Type</th><th>Value</th><th>Used</th><th>Expires</th><th>Status</th><th>Toggle</th></tr></thead>
                                        <tbody>
                                            {coupons.length === 0 ? (
                                                <tr><td colSpan={7} style={{ textAlign: 'center', color: 'var(--text-tertiary)', padding: 'var(--space-6)' }}>No coupons yet</td></tr>
                                            ) : coupons.map(c => (
                                                <tr key={c.id}>
                                                    <td style={{ fontWeight: 700, fontFamily: 'monospace', color: 'var(--brand-accent-light)' }}>{c.code}</td>
                                                    <td>{c.type === 'percentage' ? `${c.value}%` : `€${c.value}`}</td>
                                                    <td className="text-secondary">{c.type === 'percentage' ? 'Percent' : 'Fixed'}</td>
                                                    <td className="text-secondary">{c.uses_count}{c.max_uses ? `/${c.max_uses}` : ''}</td>
                                                    <td className="text-xs text-secondary">{c.expires_at ? new Date(c.expires_at).toLocaleDateString() : 'Never'}</td>
                                                    <td><span className={`badge ${c.is_active ? 'badge-success' : 'badge-danger'}`}>{c.is_active ? 'Active' : 'Inactive'}</span></td>
                                                    <td>
                                                        <button className={`btn btn-ghost btn-sm`} onClick={async () => {
                                                            const { error } = await adminToggleCoupon(supabase, c.id, !c.is_active);
                                                            if (error) { addToast(error.message, 'error'); } else {
                                                                setCoupons(await adminGetCoupons(supabase));
                                                            }
                                                        }}>
                                                            {c.is_active ? <XCircle size={14} /> : <CheckCircle size={14} />}
                                                            {c.is_active ? ' Deactivate' : ' Activate'}
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        )}
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
                                <div className="input-group"><label>ID (slug)</label><input className="input" value={editingCourse.id || ''} onChange={e => setEditingCourse({ ...editingCourse, id: e.target.value })} placeholder="e.g. biology" /></div>
                                <div className="input-group"><label>Name</label><input className="input" value={editingCourse.name || ''} onChange={e => setEditingCourse({ ...editingCourse, name: e.target.value })} placeholder="e.g. Biology" /></div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                                <div className="input-group"><label>Icon (emoji)</label><input className="input" value={editingCourse.icon || ''} onChange={e => setEditingCourse({ ...editingCourse, icon: e.target.value })} placeholder="🧬" /></div>
                                <div className="input-group"><label>Color</label><input className="input" type="color" value={editingCourse.color || '#2563EB'} onChange={e => setEditingCourse({ ...editingCourse, color: e.target.value })} /></div>
                            </div>
                            <div className="input-group"><label>Description</label><input className="input" value={editingCourse.description || ''} onChange={e => setEditingCourse({ ...editingCourse, description: e.target.value })} /></div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                                <div className="input-group"><label>Total Lessons</label><input className="input" type="number" value={editingCourse.total_lessons || 0} onChange={e => setEditingCourse({ ...editingCourse, total_lessons: parseInt(e.target.value) || 0 })} /></div>
                                <div className="input-group"><label>Total Questions</label><input className="input" type="number" value={editingCourse.total_questions || 0} onChange={e => setEditingCourse({ ...editingCourse, total_questions: parseInt(e.target.value) || 0 })} /></div>
                            </div>
                        </div>
                        <button className="btn btn-primary" style={{ width: '100%', marginTop: 'var(--space-5)' }} onClick={handleSaveCourse} disabled={savingCourse || !editingCourse.id || !editingCourse.name}>
                            {savingCourse ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</> : <><Save size={16} /> Save Course</>}
                        </button>
                    </div>
                </div>
            )}

            {/* ===== SECTION EDIT MODAL ===== */}
            {editingSection && (
                <div className="modal-overlay" onClick={() => setEditingSection(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 480 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-5)' }}>
                            <h2 style={{ fontSize: 'var(--fs-lg)', fontWeight: 600 }}>{editingSection.id ? 'Edit Section' : 'New Section'}</h2>
                            <button className="btn btn-ghost btn-sm" onClick={() => setEditingSection(null)}><X size={16} /></button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                            <div className="input-group"><label>Section Name</label><input className="input" value={editingSection.name || ''} onChange={e => setEditingSection({ ...editingSection, name: e.target.value })} placeholder="e.g. Foundations (Month 1)" /></div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-4)' }}>
                                <div className="input-group"><label>Section #</label><input className="input" type="number" value={editingSection.section_number || 1} onChange={e => setEditingSection({ ...editingSection, section_number: parseInt(e.target.value) || 1 })} /></div>
                                <div className="input-group"><label>Price</label><input className="input" type="number" step="0.01" value={editingSection.price || 0} onChange={e => setEditingSection({ ...editingSection, price: parseFloat(e.target.value) || 0 })} /></div>
                                <div className="input-group">
                                    <label>Currency</label>
                                    <select className="select" value={editingSection.currency || 'EUR'} onChange={e => setEditingSection({ ...editingSection, currency: e.target.value })}>
                                        <option value="EUR">EUR</option>
                                        <option value="USD">USD</option>
                                        <option value="GBP">GBP</option>
                                    </select>
                                </div>
                            </div>
                            {/* Module assignment */}
                            <div>
                                <label style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)', display: 'block', marginBottom: 'var(--space-2)' }}>Assign Modules</label>
                                <div style={{ maxHeight: 200, overflowY: 'auto', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', padding: 'var(--space-2)' }}>
                                    {selectedCourse?.modules.map(mod => {
                                        const isAssigned = (editingSection.moduleIds || []).includes(mod.id);
                                        return (
                                            <label key={mod.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: 'var(--space-2)', cursor: 'pointer', borderRadius: 'var(--radius-sm)', background: isAssigned ? 'rgba(37,99,235,0.1)' : 'transparent' }}>
                                                <input type="checkbox" checked={isAssigned} onChange={() => {
                                                    const current = editingSection.moduleIds || [];
                                                    const updated = isAssigned ? current.filter(id => id !== mod.id) : [...current, mod.id];
                                                    setEditingSection({ ...editingSection, moduleIds: updated });
                                                }} />
                                                <span style={{ fontSize: 'var(--fs-sm)' }}>{mod.name}</span>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>
                        <button className="btn btn-primary" style={{ width: '100%', marginTop: 'var(--space-5)' }} onClick={async () => {
                            await handleSaveSection(editingSection.moduleIds);
                        }} disabled={savingSection || !editingSection.name}>
                            {savingSection ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</> : <><Save size={16} /> Save Section</>}
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
                            <div className="input-group"><label>ID</label><input className="input" value={editingQuestion.id || ''} onChange={e => setEditingQuestion({ ...editingQuestion, id: e.target.value })} placeholder="e.g. bio-gen-q99" /></div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                                <div className="input-group">
                                    <label>Subject</label>
                                    <select className="select" value={editingQuestion.subject || ''} onChange={e => setEditingQuestion({ ...editingQuestion, subject: e.target.value })}>
                                        <option value="">Select...</option>
                                        {['Biology', 'Chemistry', 'Physics', 'Mathematics', 'Logic', 'General Knowledge', 'Reading Comprehension'].map(s => <option key={s}>{s}</option>)}
                                    </select>
                                </div>
                                <div className="input-group"><label>Topic</label><input className="input" value={editingQuestion.topic || ''} onChange={e => setEditingQuestion({ ...editingQuestion, topic: e.target.value })} placeholder="e.g. Genetics" /></div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--space-4)' }}>
                                <div className="input-group">
                                    <label>Difficulty</label>
                                    <select className="select" value={editingQuestion.difficulty || 'medium'} onChange={e => setEditingQuestion({ ...editingQuestion, difficulty: e.target.value as 'easy' | 'medium' | 'hard' })}>
                                        <option value="easy">Easy</option><option value="medium">Medium</option><option value="hard">Hard</option>
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
                                <div className="input-group"><label>Year</label><input className="input" type="number" value={editingQuestion.year || ''} onChange={e => setEditingQuestion({ ...editingQuestion, year: e.target.value ? parseInt(e.target.value) : null })} placeholder="2024" /></div>
                            </div>
                            <div className="input-group">
                                <label>Question Stem</label>
                                <RichTextToolbar
                                    textareaRef={stemRef}
                                    value={editingQuestion.stem || ''}
                                    onChange={val => setEditingQuestion({ ...editingQuestion, stem: val })}
                                    onImageUpload={handleQuestionImageUpload}
                                />
                                <textarea
                                    ref={stemRef}
                                    className="input"
                                    rows={4}
                                    value={editingQuestion.stem || ''}
                                    onChange={e => setEditingQuestion({ ...editingQuestion, stem: e.target.value })}
                                    placeholder="Write the question here... Use **bold**, *italic*, $LaTeX$, ^{sup}, _{sub}"
                                    style={{ resize: 'vertical', fontFamily: 'inherit', borderRadius: '0 0 var(--radius-md) var(--radius-md)' }}
                                />
                                {editingQuestion.stem && (
                                    <div style={{ padding: 'var(--space-3)', background: 'var(--bg-glass)', border: '1px solid var(--border-primary)', borderTop: 'none', borderRadius: '0 0 var(--radius-md) var(--radius-md)', fontSize: 'var(--fs-sm)', lineHeight: 1.6 }}>
                                        <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)', display: 'block', marginBottom: 'var(--space-1)' }}>Preview:</span>
                                        <RichTextPreview text={editingQuestion.stem} />
                                    </div>
                                )}
                            </div>
                            {/* Question image */}
                            {editingQuestion.image_url && (
                                <div style={{ padding: 'var(--space-3)', background: 'var(--bg-glass)', border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--space-2)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                                        <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)' }}><ImageIcon size={12} style={{ display: 'inline', verticalAlign: 'middle' }} /> Attached Image</span>
                                        <button type="button" className="btn btn-ghost btn-sm" style={{ color: 'var(--color-danger)', fontSize: 'var(--fs-xs)' }} onClick={() => setEditingQuestion({ ...editingQuestion, image_url: null })}>Remove</button>
                                    </div>
                                    <img src={editingQuestion.image_url} alt="Question diagram" style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 'var(--radius-sm)', objectFit: 'contain' }} />
                                </div>
                            )}
                            <div>
                                <label style={{ fontSize: 'var(--fs-sm)', color: 'var(--text-secondary)', marginBottom: 'var(--space-2)', display: 'block' }}>Options (click letter = correct)</label>
                                {(editingQuestion.options || ['', '', '', '', '']).map((opt, i) => (
                                    <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                                        <button onClick={() => setEditingQuestion({ ...editingQuestion, correct_answer: i })} style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: editingQuestion.correct_answer === i ? 'var(--color-success)' : 'var(--bg-glass)', border: `1px solid ${editingQuestion.correct_answer === i ? 'var(--color-success)' : 'var(--border-primary)'}`, color: editingQuestion.correct_answer === i ? 'white' : 'var(--text-secondary)', cursor: 'pointer', fontSize: 'var(--fs-xs)', fontWeight: 600 }}>
                                            {String.fromCharCode(65 + i)}
                                        </button>
                                        <input className="input" value={typeof opt === 'string' ? opt : ''} onChange={e => { const newOpts = [...(editingQuestion.options || ['', '', '', '', ''])]; newOpts[i] = e.target.value; setEditingQuestion({ ...editingQuestion, options: newOpts }); }} placeholder={`Option ${String.fromCharCode(65 + i)}`} style={{ flex: 1 }} />
                                    </div>
                                ))}
                            </div>
                            <div className="input-group">
                                <label>Explanation</label>
                                <RichTextToolbar
                                    textareaRef={explanationRef}
                                    value={editingQuestion.explanation || ''}
                                    onChange={val => setEditingQuestion({ ...editingQuestion, explanation: val })}
                                    onImageUpload={handleQuestionImageUpload}
                                />
                                <textarea
                                    ref={explanationRef}
                                    className="input"
                                    rows={2}
                                    value={editingQuestion.explanation || ''}
                                    onChange={e => setEditingQuestion({ ...editingQuestion, explanation: e.target.value })}
                                    style={{ resize: 'vertical', fontFamily: 'inherit', borderRadius: '0 0 var(--radius-md) var(--radius-md)' }}
                                />
                            </div>
                        </div>
                        <button className="btn btn-primary" style={{ width: '100%', marginTop: 'var(--space-5)' }} onClick={handleSaveQuestion} disabled={savingQuestion || !editingQuestion.id || !editingQuestion.stem}>
                            {savingQuestion ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</> : <><Save size={16} /> Save Question</>}
                        </button>
                    </div>
                </div>
            )}

            {/* ===== ANALYTICS TAB ===== */}
            {tab === 'analytics' && canSeeTab('analytics') && (
                <div>
                    {analyticsLoading ? (
                        <div style={{ display: 'flex', justifyContent: 'center', padding: 'var(--space-12)' }}>
                            <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', color: 'var(--text-tertiary)' }} />
                        </div>
                    ) : (
                        <>
                            {/* Platform KPIs */}
                            {platformStats && (
                                <div className="grid grid-4" style={{ marginBottom: 'var(--space-6)', gap: 'var(--space-4)' }}>
                                    {[
                                        { label: 'Total Students', value: platformStats.totalStudents, icon: <Users size={18} />, color: '#60a5fa' },
                                        { label: 'Active This Week', value: platformStats.activeStudents, icon: <Activity size={18} />, color: '#34d399' },
                                        { label: 'Avg Score %', value: `${platformStats.avgScore}%`, icon: <Award size={18} />, color: '#f59e0b' },
                                        { label: 'Avg Correct Rate', value: `${platformStats.avgCorrectRate}%`, icon: <TrendingUp size={18} />, color: '#a78bfa' },
                                        { label: 'Total Tests Taken', value: platformStats.totalTests, icon: <BarChart2 size={18} />, color: '#fb7185' },
                                        { label: 'Topics Completed', value: platformStats.totalTopicsCompleted, icon: <CheckCircle size={18} />, color: '#34d399' },
                                    ].map(({ label, value, icon, color }) => (
                                        <div key={label} className="stat-card">
                                            <div className="stat-icon" style={{ background: `${color}22`, color }}>{icon}</div>
                                            <div className="stat-value">{value}</div>
                                            <div className="stat-label">{label}</div>
                                        </div>
                                    ))}
                                </div>
                            )}

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)', marginBottom: 'var(--space-6)' }}>
                                {/* Subject Performance */}
                                <div className="card">
                                    <h3 style={{ fontSize: 'var(--fs-md)', fontWeight: 600, marginBottom: 'var(--space-5)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                        <BarChart2 size={18} /> Subject Performance
                                    </h3>
                                    {subjectPerf.length === 0 ? (
                                        <p className="text-secondary text-sm">No test data yet.</p>
                                    ) : (
                                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                                            {subjectPerf.map(s => {
                                                const rate = s.avgCorrectRate;
                                                const barColor = rate >= 70 ? '#34d399' : rate >= 50 ? '#f59e0b' : '#fb7185';
                                                return (
                                                    <div key={s.subject}>
                                                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 'var(--space-1)' }}>
                                                            <span style={{ fontWeight: 600, fontSize: 'var(--fs-sm)' }}>{s.subject}</span>
                                                            <span style={{ fontSize: 'var(--fs-xs)', color: 'var(--text-tertiary)' }}>
                                                                {s.avgCorrectRate}% correct · {s.totalTests} tests
                                                            </span>
                                                        </div>
                                                        <div className="progress-bar" style={{ height: 8 }}>
                                                            <div className="progress-bar-fill" style={{ width: `${s.avgCorrectRate}%`, background: barColor, transition: 'width 0.6s ease' }} />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    )}
                                </div>

                                {/* Student Roster */}
                                <div className="card" style={{ overflow: 'hidden' }}>
                                    <h3 style={{ fontSize: 'var(--fs-md)', fontWeight: 600, marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                        <Users size={18} /> Student Roster
                                    </h3>
                                    <div style={{ overflowX: 'auto', maxHeight: 350, overflowY: 'auto' }}>
                                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--fs-xs)' }}>
                                            <thead>
                                                <tr style={{ borderBottom: '1px solid var(--border-primary)' }}>
                                                    {['Student', 'Tests', 'Avg Score', 'Correct%', 'Streak', 'Last Test'].map(h => (
                                                        <th key={h} style={{ padding: 'var(--space-2)', textAlign: 'left', color: 'var(--text-tertiary)', fontWeight: 600, whiteSpace: 'nowrap' }}>{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {studentRoster.length === 0 ? (
                                                    <tr><td colSpan={6} style={{ textAlign: 'center', padding: 'var(--space-6)', color: 'var(--text-tertiary)' }}>No students yet.</td></tr>
                                                ) : studentRoster.map(s => (
                                                    <tr key={s.userId} style={{ borderBottom: '1px solid var(--border-primary)' }}>
                                                        <td style={{ padding: 'var(--space-2)' }}>
                                                            <div style={{ fontWeight: 600 }}>{s.firstName} {s.lastName}</div>
                                                            <div style={{ color: 'var(--text-tertiary)', fontSize: 10 }}>{s.email}</div>
                                                        </td>
                                                        <td style={{ padding: 'var(--space-2)', textAlign: 'center' }}>{s.totalTests}</td>
                                                        <td style={{ padding: 'var(--space-2)', textAlign: 'center', color: s.avgScore >= 60 ? '#34d399' : '#fb7185', fontWeight: 600 }}>{s.avgScore}%</td>
                                                        <td style={{ padding: 'var(--space-2)', textAlign: 'center' }}>{s.avgCorrectRate}%</td>
                                                        <td style={{ padding: 'var(--space-2)', textAlign: 'center' }}>🔥 {s.studyStreak}</td>
                                                        <td style={{ padding: 'var(--space-2)', color: 'var(--text-tertiary)', whiteSpace: 'nowrap' }}>
                                                            {s.lastTestDate ? new Date(s.lastTestDate).toLocaleDateString() : '—'}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </div>

                            {/* Question Analytics */}
                            <div className="card">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-4)', flexWrap: 'wrap', gap: 'var(--space-3)' }}>
                                    <h3 style={{ fontSize: 'var(--fs-md)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                        <HelpCircle size={18} /> Question Intelligence
                                    </h3>
                                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                                        {(['hardest', 'easiest', 'mostAttempted'] as const).map(s => (
                                            <button key={s} className={`btn btn-sm ${qSortBy === s ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setQSortBy(s)}>
                                                {s === 'hardest' ? <><TrendingDown size={12} /> Hardest</> : s === 'easiest' ? <><TrendingUp size={12} /> Easiest</> : <><Activity size={12} /> Most Attempted</>}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                                {questionAnalytics.length === 0 ? (
                                    <p className="text-secondary text-sm">No answer data yet — questions appear here once students take tests.</p>
                                ) : (
                                    <div className="table-wrapper">
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th>Subject</th>
                                                    <th>Topic</th>
                                                    <th style={{ maxWidth: 280 }}>Question</th>
                                                    <th>Difficulty</th>
                                                    <th>Attempts</th>
                                                    <th>Success Rate</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {questionAnalytics.map(q => {
                                                    const rateColor = q.successRate >= 70 ? '#34d399' : q.successRate >= 40 ? '#f59e0b' : '#fb7185';
                                                    return (
                                                        <tr key={q.id}>
                                                            <td style={{ fontWeight: 500, whiteSpace: 'nowrap' }}>{q.subject}</td>
                                                            <td className="text-secondary text-sm">{q.topic}</td>
                                                            <td style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: 'var(--fs-xs)' }}>{q.stem}</td>
                                                            <td><span className={`badge ${q.difficulty === 'easy' ? 'badge-success' : q.difficulty === 'hard' ? 'badge-danger' : ''}`}>{q.difficulty}</span></td>
                                                            <td style={{ textAlign: 'center' }}>{q.totalAttempts}</td>
                                                            <td>
                                                                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                                                                    <div className="progress-bar" style={{ width: 60, height: 6 }}>
                                                                        <div className="progress-bar-fill" style={{ width: `${q.successRate}%`, background: rateColor }} />
                                                                    </div>
                                                                    <span style={{ fontWeight: 700, color: rateColor, fontSize: 'var(--fs-xs)' }}>{q.successRate}%</span>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </>
                    )}
                </div>
            )}
            {/* ===== TEAM TAB ===== */}
            {tab === 'team' && canSeeTab('team') && (
                <div>
                    {/* Role assignment form */}
                    <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
                        <h3 style={{ fontSize: 'var(--fs-md)', fontWeight: 600, marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                            <UserCog size={18} /> Assign Admin Role
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                            {/* Step 1: Find user by email */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 'var(--space-3)', alignItems: 'end' }}>
                                <div className="input-group">
                                    <label>User Email</label>
                                    <input
                                        className="input"
                                        value={teamEmail}
                                        onChange={e => { setTeamEmail(e.target.value); setTeamSearchResult(null); }}
                                        placeholder="Enter user's email address"
                                        onKeyDown={e => e.key === 'Enter' && teamEmail.trim() && (async () => {
                                            setTeamSearching(true);
                                            const r = await adminFindUserByEmail(supabase, teamEmail);

                                            setTeamSearchResult(r);
                                            setTeamSearching(false);
                                            if (!r) addToast('User not found with that email', 'error');
                                        })()}
                                    />
                                </div>
                                <button
                                    className="btn btn-secondary btn-sm"
                                    disabled={!teamEmail.trim() || teamSearching}
                                    onClick={async () => {
                                        setTeamSearching(true);
                                        const r = await adminFindUserByEmail(supabase, teamEmail);

                                        setTeamSearchResult(r);
                                        setTeamSearching(false);
                                        if (!r) addToast('User not found with that email', 'error');
                                    }}
                                >
                                    {teamSearching ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Search size={14} />}
                                    Find User
                                </button>
                            </div>

                            {/* Step 2: Found user — assign role */}
                            {teamSearchResult && (
                                <div style={{
                                    padding: 'var(--space-4)', background: 'rgba(16,185,129,0.06)',
                                    border: '1px solid rgba(16,185,129,0.2)', borderRadius: 'var(--radius-md)',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)', marginBottom: 'var(--space-3)' }}>
                                        <CheckCircle size={16} style={{ color: 'var(--color-success)' }} />
                                        <div>
                                            <div style={{ fontWeight: 600, fontSize: 'var(--fs-sm)' }}>
                                                {teamSearchResult.first_name || ''} {teamSearchResult.last_name || ''}
                                            </div>
                                            <div className="text-xs text-secondary">{teamSearchResult.email}</div>
                                        </div>
                                    </div>
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: 'var(--space-3)', alignItems: 'end' }}>
                                        <div className="input-group">
                                            <label>Role</label>
                                            <select className="select" value={teamRole} onChange={e => setTeamRole(e.target.value as AdminRole)}>
                                                {(Object.keys(ADMIN_ROLE_LABELS) as AdminRole[]).map(r => (
                                                    <option key={r} value={r}>{ADMIN_ROLE_LABELS[r]}</option>
                                                ))}
                                            </select>
                                        </div>
                                        <button
                                            className="btn btn-primary btn-sm"
                                            disabled={teamSaving}
                                            onClick={async () => {
                                                setTeamSaving(true);
                                                const { error } = await adminSetUserRole(supabase, teamSearchResult.id, teamRole);

                                                if (error) { addToast(error.message, 'error'); }
                                                else {
                                                    addToast(`${ADMIN_ROLE_LABELS[teamRole]} role assigned!`, 'success');
                                                    setTeamEmail('');
                                                    setTeamSearchResult(null);
                                                    setTeamMembers(await adminGetTeamMembers(supabase));

                                                }
                                                setTeamSaving(false);
                                            }}
                                        >
                                            {teamSaving ? <Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> : <Shield size={14} />}
                                            Assign Role
                                        </button>
                                    </div>
                                    <p className="text-xs text-secondary" style={{ marginTop: 'var(--space-2)' }}>
                                        {ADMIN_ROLE_DESCRIPTIONS[teamRole]}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Role reference */}
                    <div className="card" style={{ marginBottom: 'var(--space-5)' }}>
                        <h3 style={{ fontSize: 'var(--fs-md)', fontWeight: 600, marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                            <Shield size={18} /> Role Permissions
                        </h3>
                        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-3)' }}>
                            {(Object.keys(ADMIN_ROLE_LABELS) as AdminRole[]).map(r => (
                                <div key={r} style={{
                                    padding: 'var(--space-4)', background: 'var(--bg-glass)',
                                    border: '1px solid var(--border-primary)', borderRadius: 'var(--radius-md)',
                                }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', marginBottom: 'var(--space-2)' }}>
                                        <Crown size={14} style={{ color: r === 'super_admin' ? '#f59e0b' : 'var(--brand-accent-light)' }} />
                                        <span style={{ fontWeight: 600, fontSize: 'var(--fs-sm)' }}>{ADMIN_ROLE_LABELS[r]}</span>
                                    </div>
                                    <p className="text-xs text-secondary" style={{ marginBottom: 'var(--space-2)' }}>
                                        {ADMIN_ROLE_DESCRIPTIONS[r]}
                                    </p>
                                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-1)' }}>
                                        {ROLE_PERMISSIONS[r].map(p => (
                                            <span key={p} className="badge badge-accent" style={{ fontSize: 9, textTransform: 'capitalize' }}>{p}</span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Team members list */}
                    <h3 style={{ fontSize: 'var(--fs-md)', fontWeight: 600, marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                        <Users size={18} /> Team Members ({teamMembers.length})
                    </h3>
                    {teamMembers.length === 0 ? (
                        <div className="card" style={{ textAlign: 'center', padding: 'var(--space-8)', color: 'var(--text-tertiary)' }}>
                            <Users size={32} style={{ margin: '0 auto var(--space-3)', opacity: 0.3 }} />
                            <p>No team members yet. Assign roles above.</p>
                        </div>
                    ) : (
                        <div className="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Member</th>
                                        <th>Email</th>
                                        <th>Role</th>
                                        <th>Access</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {teamMembers.map(m => (
                                        <tr key={m.id}>
                                            <td style={{ fontWeight: 500 }}>
                                                {m.first_name || ''} {m.last_name || ''}
                                                {m.id === profile?.id && (
                                                    <span className="badge badge-accent" style={{ marginLeft: 'var(--space-2)', fontSize: 9 }}>You</span>
                                                )}
                                            </td>
                                            <td className="text-sm text-secondary">{m.email}</td>
                                            <td>
                                                <span className="badge" style={{
                                                    background: m.admin_role === 'super_admin' ? 'rgba(245,158,11,0.15)' : 'rgba(37,99,235,0.15)',
                                                    color: m.admin_role === 'super_admin' ? 'var(--color-warning-light)' : 'var(--brand-accent-light)',
                                                }}>
                                                    {m.admin_role === 'super_admin' && <Crown size={10} style={{ display: 'inline', marginRight: 2 }} />}
                                                    {ADMIN_ROLE_LABELS[m.admin_role]}
                                                </span>
                                            </td>
                                            <td className="text-xs text-secondary">
                                                {ROLE_PERMISSIONS[m.admin_role]?.join(', ')}
                                            </td>
                                            <td>
                                                {m.id !== profile?.id && (
                                                    <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                                                        <select
                                                            className="select"
                                                            value={m.admin_role}
                                                            style={{ padding: '4px 8px', fontSize: 'var(--fs-xs)', minWidth: 120 }}
                                                            onChange={async (e) => {
                                                                const newRole = e.target.value as AdminRole;
                                                                const { error } = await adminSetUserRole(supabase, m.id, newRole);

                                                                if (error) { addToast(error.message, 'error'); }
                                                                else {
                                                                    addToast(`Role updated to ${ADMIN_ROLE_LABELS[newRole]}`, 'success');
                                                                    setTeamMembers(await adminGetTeamMembers(supabase));

                                                                }
                                                            }}
                                                        >
                                                            {(Object.keys(ADMIN_ROLE_LABELS) as AdminRole[]).map(r => (
                                                                <option key={r} value={r}>{ADMIN_ROLE_LABELS[r]}</option>
                                                            ))}
                                                        </select>
                                                        <button
                                                            className="btn btn-ghost btn-sm"
                                                            style={{ color: 'var(--color-danger)' }}
                                                            onClick={async () => {
                                                                if (!confirm(`Remove admin access for ${m.email}?`)) return;
                                                                const { error } = await adminRemoveUserRole(supabase, m.id);
                                                                if (error) { addToast(error.message, 'error'); }
                                                                else {
                                                                    addToast('Admin access removed', 'info');
                                                                    setTeamMembers(await adminGetTeamMembers(supabase));
                                                                }
                                                            }}
                                                        >
                                                            <XCircle size={14} /> Remove
                                                        </button>
                                                    </div>
                                                )}
                                                {m.id === profile?.id && (
                                                    <span className="text-xs text-secondary">Cannot modify own role</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            )}

            {/* ===== NOTIFICATIONS TAB ===== */}
            {tab === 'notifications' && (
                <div>
                    <div className="card" style={{ maxWidth: 600, margin: '0 auto' }}>
                        <h3 style={{ fontSize: 'var(--fs-md)', fontWeight: 600, marginBottom: 'var(--space-4)', display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                            <Bell size={18} /> Send Notification
                        </h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                            <div className="input-group">
                                <label>Target User</label>
                                <select className="select" value={notificationPayload.targetUserId} onChange={e => setNotificationPayload({ ...notificationPayload, targetUserId: e.target.value })}>
                                    <option value="all">Broadcast to All Users</option>
                                    <option value="specific">Specific User (Requires ID setup)</option>
                                </select>
                            </div>
                            {notificationPayload.targetUserId !== 'all' && (
                                <div className="input-group">
                                    <label>Specific User ID</label>
                                    <input className="input" placeholder="Paste user UUID here" value={notificationPayload.targetUserId === 'specific' ? '' : notificationPayload.targetUserId} onChange={e => setNotificationPayload({ ...notificationPayload, targetUserId: e.target.value })} />
                                </div>
                            )}
                            <div className="input-group">
                                <label>Notification Type</label>
                                <select className="select" value={notificationPayload.type} onChange={e => setNotificationPayload({ ...notificationPayload, type: e.target.value })}>
                                    <option value="system">System Announcement</option>
                                    <option value="course">Course Update</option>
                                    <option value="payment">Payment Alert</option>
                                    <option value="promotional">Promotional</option>
                                </select>
                            </div>
                            <div className="input-group">
                                <label>Title</label>
                                <input className="input" placeholder="e.g. New Biology Module Released!" value={notificationPayload.title} onChange={e => setNotificationPayload({ ...notificationPayload, title: e.target.value })} />
                            </div>
                            <div className="input-group">
                                <label>Message</label>
                                <textarea className="input" rows={4} placeholder="Write your notification message here..." value={notificationPayload.message} onChange={e => setNotificationPayload({ ...notificationPayload, message: e.target.value })} />
                            </div>
                            <div className="input-group">
                                <label>Action Link (Optional)</label>
                                <input className="input" placeholder="e.g. /courses/biology" value={notificationPayload.link} onChange={e => setNotificationPayload({ ...notificationPayload, link: e.target.value })} />
                            </div>
                            <button className="btn btn-primary" style={{ width: '100%', marginTop: 'var(--space-2)' }} onClick={handleSendNotification} disabled={sendingNotification || !notificationPayload.title || !notificationPayload.message}>
                                {sendingNotification ? <><Loader2 size={16} style={{ animation: 'spin 1s linear infinite' }} /> Sending...</> : <><Send size={16} /> Send Notification</>}
                            </button>
                        </div>
                    </div>
                </div>
            )}
            
            {/* ===== MODULE EDIT MODAL ===== */}
            {editingModule && (
                <div className="modal-overlay" onClick={() => setEditingModule(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-5)' }}>
                            <h2 style={{ fontSize: 'var(--fs-lg)', fontWeight: 600 }}>{editingModule.id ? 'Edit Module' : 'New Module'}</h2>
                            <button className="btn btn-ghost btn-sm" onClick={() => setEditingModule(null)}><X size={16} /></button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                            <div className="input-group">
                                <label>Name</label>
                                <input className="input" value={editingModule.name || ''} onChange={e => setEditingModule({ ...editingModule, name: e.target.value })} placeholder="e.g. The Cell" />
                            </div>
                            <div className="input-group">
                                <label>ID (slug)</label>
                                <input className="input" value={editingModule.id || ''} onChange={e => setEditingModule({ ...editingModule, id: e.target.value })} placeholder="Leave empty to auto-generate" />
                            </div>
                            <div className="input-group">
                                <label>Sort Order</label>
                                <input className="input" type="number" value={editingModule.sort_order || 0} onChange={e => setEditingModule({ ...editingModule, sort_order: parseInt(e.target.value) || 0 })} />
                            </div>
                        </div>
                        <button className="btn btn-primary" style={{ width: '100%', marginTop: 'var(--space-5)' }} onClick={handleSaveModule} disabled={savingModule || !editingModule.name}>
                            {savingModule ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</> : <><Save size={16} /> Save Module</>}
                        </button>
                    </div>
                </div>
            )}

            {/* ===== TOPIC EDIT MODAL ===== */}
            {editingTopic && (
                <div className="modal-overlay" onClick={() => setEditingTopic(null)}>
                    <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 450 }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-5)' }}>
                            <h2 style={{ fontSize: 'var(--fs-lg)', fontWeight: 600 }}>{editingTopic.id ? 'Edit Topic' : 'New Topic'}</h2>
                            <button className="btn btn-ghost btn-sm" onClick={() => setEditingTopic(null)}><X size={16} /></button>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                            <div className="input-group">
                                <label>Name</label>
                                <input className="input" value={editingTopic.name || ''} onChange={e => setEditingTopic({ ...editingTopic, name: e.target.value })} placeholder="e.g. Mitochondria" />
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                                <div className="input-group">
                                    <label>ID (slug)</label>
                                    <input className="input" value={editingTopic.id || ''} onChange={e => setEditingTopic({ ...editingTopic, id: e.target.value })} placeholder="Auto-generates" />
                                </div>
                                <div className="input-group">
                                    <label>Sort Order</label>
                                    <input className="input" type="number" value={editingTopic.sort_order || 0} onChange={e => setEditingTopic({ ...editingTopic, sort_order: parseInt(e.target.value) || 0 })} />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                                <div className="input-group">
                                    <label>Lesson Type</label>
                                    <select className="select" value={editingTopic.lesson_type || 'video'} onChange={e => setEditingTopic({ ...editingTopic, lesson_type: e.target.value as 'video' | 'pdf' | 'quiz' })}>
                                        <option value="video">Video</option>
                                        <option value="pdf">PDF</option>
                                        <option value="quiz">Quiz</option>
                                    </select>
                                </div>
                                <div className="input-group">
                                    <label>Question Count</label>
                                    <input className="input" type="number" value={editingTopic.question_count || 0} onChange={e => setEditingTopic({ ...editingTopic, question_count: parseInt(e.target.value) || 0 })} disabled={editingTopic.lesson_type !== 'quiz'} />
                                </div>
                            </div>
                        </div>
                        <button className="btn btn-primary" style={{ width: '100%', marginTop: 'var(--space-5)' }} onClick={handleSaveTopic} disabled={savingTopic || !editingTopic.name}>
                            {savingTopic ? <><Loader2 size={14} style={{ animation: 'spin 1s linear infinite' }} /> Saving...</> : <><Save size={16} /> Save Topic</>}
                        </button>
                    </div>
                </div>
            )}
        </AppLayout>
    );
}
