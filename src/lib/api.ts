import { createClient } from '@/lib/supabase';

const supabase = createClient();

// ===== TYPES =====
export interface CourseWithModules {
    id: string;
    name: string;
    icon: string;
    color: string;
    description: string;
    total_lessons: number;
    total_questions: number;
    sort_order: number;
    modules: ModuleWithTopics[];
    completedLessons?: number;
}

export interface ModuleWithTopics {
    id: string;
    course_id: string;
    name: string;
    sort_order: number;
    topics: TopicWithProgress[];
}

export interface TopicWithProgress {
    id: string;
    module_id: string;
    name: string;
    question_count: number;
    lesson_type: 'video' | 'pdf' | 'quiz';
    sort_order: number;
    completed: boolean;
    content_url?: string | null;
    content_type?: string | null;
}

export interface QuestionRow {
    id: string;
    subject: string;
    topic: string;
    difficulty: 'easy' | 'medium' | 'hard';
    stem: string;
    options: string[];
    correct_answer: number;
    explanation: string;
    source: 'official-imat' | 'locomotive-original' | 'italian-medical';
    year: number | null;
    image_url?: string | null;
}

export interface TestResultRow {
    id: string;
    user_id: string;
    name: string;
    date: string;
    duration: string;
    mode: 'timed' | 'untimed';
    total_questions: number;
    correct: number;
    incorrect: number;
    unanswered: number;
    score: number;
    max_score: number;
    subjects: string[];
    source: string;
}

export interface ScheduleEventRow {
    id: string;
    user_id: string;
    date: string;
    title: string;
    type: 'study' | 'test' | 'dayoff';
    duration: string;
}

// ===== COURSES =====
export async function getCourses(userId?: string): Promise<CourseWithModules[]> {
    // Fetch courses, modules, topics
    const { data: coursesData } = await supabase
        .from('courses')
        .select('*')
        .order('sort_order');

    const { data: modulesData } = await supabase
        .from('modules')
        .select('*')
        .order('sort_order');

    const { data: topicsData } = await supabase
        .from('topics')
        .select('*')
        .order('sort_order');

    // Fetch user progress if logged in
    let progressMap: Record<string, boolean> = {};
    if (userId) {
        const { data: progressData } = await supabase
            .from('user_topic_progress')
            .select('topic_id, completed')
            .eq('user_id', userId)
            .eq('completed', true);

        if (progressData) {
            progressData.forEach(p => { progressMap[p.topic_id] = true; });
        }
    }

    if (!coursesData || !modulesData || !topicsData) return [];

    // Assemble nested structure
    return coursesData.map(course => {
        const courseModules = modulesData
            .filter(m => m.course_id === course.id)
            .map(mod => {
                const moduleTopics = topicsData
                    .filter(t => t.module_id === mod.id)
                    .map(topic => ({
                        ...topic,
                        completed: !!progressMap[topic.id],
                    }));
                return { ...mod, topics: moduleTopics };
            });

        const completedLessons = courseModules.reduce(
            (acc, mod) => acc + mod.topics.filter((t: TopicWithProgress) => t.completed).length, 0
        );

        return { ...course, modules: courseModules, completedLessons };
    });
}

export async function getCourse(courseId: string, userId?: string): Promise<CourseWithModules | null> {
    const courses = await getCourses(userId);
    return courses.find(c => c.id === courseId) || null;
}

// ===== QUESTIONS =====
export async function getQuestions(filters?: {
    subjects?: string[];
    difficulty?: string;
    source?: string;
    limit?: number;
}): Promise<QuestionRow[]> {
    let query = supabase.from('questions').select('*');

    if (filters?.subjects && filters.subjects.length > 0) {
        query = query.in('subject', filters.subjects);
    }
    if (filters?.difficulty && filters.difficulty !== 'all') {
        query = query.eq('difficulty', filters.difficulty);
    }
    if (filters?.source && filters.source !== 'all') {
        query = query.eq('source', filters.source);
    }
    if (filters?.limit) {
        query = query.limit(filters.limit);
    }

    const { data, error } = await query;
    if (error) { console.error('Error fetching questions:', error); return []; }

    // Parse options from JSON
    return (data || []).map(q => ({
        ...q,
        options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
    }));
}

// ===== TEST RESULTS =====
export async function getTestResults(userId: string): Promise<TestResultRow[]> {
    const { data, error } = await supabase
        .from('test_results')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false });

    if (error) { console.error('Error fetching test results:', error); return []; }
    return data || [];
}

export async function saveTestResult(result: {
    user_id: string;
    name: string;
    duration: string;
    mode: 'timed' | 'untimed';
    total_questions: number;
    correct: number;
    incorrect: number;
    unanswered: number;
    score: number;
    max_score: number;
    subjects: string[];
    source: string;
}): Promise<{ id: string | null; error: Error | null }> {
    const { data, error } = await supabase
        .from('test_results')
        .insert(result)
        .select('id')
        .single();

    return {
        id: data?.id || null,
        error: error ? new Error(error.message) : null,
    };
}

export async function saveTestAnswers(answers: {
    test_result_id: string;
    question_id: string;
    selected_answer: number | null;
    is_correct: boolean | null;
}[]): Promise<{ error: Error | null }> {
    const { error } = await supabase.from('test_answers').insert(answers);
    return { error: error ? new Error(error.message) : null };
}

// ===== SCHEDULE =====
export async function getScheduleEvents(userId: string): Promise<ScheduleEventRow[]> {
    const { data, error } = await supabase
        .from('schedule_events')
        .select('*')
        .eq('user_id', userId)
        .order('date');

    if (error) { console.error('Error fetching schedule:', error); return []; }
    return data || [];
}

export async function saveScheduleEvent(event: {
    user_id: string;
    date: string;
    title: string;
    type: 'study' | 'test' | 'dayoff';
    duration: string;
}): Promise<{ id: string | null; error: Error | null }> {
    const { data, error } = await supabase
        .from('schedule_events')
        .insert(event)
        .select('id')
        .single();

    return {
        id: data?.id || null,
        error: error ? new Error(error.message) : null,
    };
}

export async function deleteScheduleEvent(eventId: string): Promise<{ error: Error | null }> {
    const { error } = await supabase
        .from('schedule_events')
        .delete()
        .eq('id', eventId);

    return { error: error ? new Error(error.message) : null };
}

// ===== TOPIC PROGRESS =====
export async function markTopicComplete(userId: string, topicId: string): Promise<{ error: Error | null }> {
    const { error } = await supabase
        .from('user_topic_progress')
        .upsert({
            user_id: userId,
            topic_id: topicId,
            completed: true,
            completed_at: new Date().toISOString(),
        }, { onConflict: 'user_id,topic_id' });

    return { error: error ? new Error(error.message) : null };
}

export async function markTopicIncomplete(userId: string, topicId: string): Promise<{ error: Error | null }> {
    const { error } = await supabase
        .from('user_topic_progress')
        .delete()
        .eq('user_id', userId)
        .eq('topic_id', topicId);

    return { error: error ? new Error(error.message) : null };
}

// ===== ADMIN =====
export async function adminSaveCourse(course: {
    id: string;
    name: string;
    icon: string;
    color: string;
    description: string;
    total_lessons: number;
    total_questions: number;
    sort_order: number;
}): Promise<{ error: Error | null }> {
    const { error } = await supabase.from('courses').upsert(course, { onConflict: 'id' });
    return { error: error ? new Error(error.message) : null };
}

export async function adminDeleteCourse(courseId: string): Promise<{ error: Error | null }> {
    const { error } = await supabase.from('courses').delete().eq('id', courseId);
    return { error: error ? new Error(error.message) : null };
}

export async function adminSaveModule(module: {
    id: string;
    course_id: string;
    name: string;
    sort_order: number;
}): Promise<{ error: Error | null }> {
    const { error } = await supabase.from('modules').upsert(module, { onConflict: 'id' });
    return { error: error ? new Error(error.message) : null };
}

export async function adminDeleteModule(moduleId: string): Promise<{ error: Error | null }> {
    const { error } = await supabase.from('modules').delete().eq('id', moduleId);
    return { error: error ? new Error(error.message) : null };
}

export async function adminSaveTopic(topic: {
    id: string;
    module_id: string;
    name: string;
    question_count: number;
    lesson_type: 'video' | 'pdf' | 'quiz';
    sort_order: number;
}): Promise<{ error: Error | null }> {
    const { error } = await supabase.from('topics').upsert(topic, { onConflict: 'id' });
    return { error: error ? new Error(error.message) : null };
}

export async function adminDeleteTopic(topicId: string): Promise<{ error: Error | null }> {
    const { error } = await supabase.from('topics').delete().eq('id', topicId);
    return { error: error ? new Error(error.message) : null };
}

export async function adminSaveQuestion(question: {
    id: string;
    subject: string;
    topic: string;
    difficulty: string;
    stem: string;
    options: string[];
    correct_answer: number;
    explanation: string;
    source: string;
    year: number | null;
    image_url?: string | null;
}): Promise<{ error: Error | null }> {
    const dbQ = { ...question, options: JSON.stringify(question.options) };
    const { error } = await supabase.from('questions').upsert(dbQ, { onConflict: 'id' });
    return { error: error ? new Error(error.message) : null };
}

export async function adminDeleteQuestion(questionId: string): Promise<{ error: Error | null }> {
    const { error } = await supabase.from('questions').delete().eq('id', questionId);
    return { error: error ? new Error(error.message) : null };
}

// ===== FILE UPLOADS =====

export async function adminUploadCourseContent(file: File, courseId: string, topicId: string): Promise<{ url: string | null; error: Error | null }> {
    const ext = file.name.split('.').pop();
    const path = `${courseId}/${topicId}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('course-content').upload(path, file, { upsert: true });
    if (error) return { url: null, error: new Error(error.message) };
    const { data } = supabase.storage.from('course-content').getPublicUrl(path);
    return { url: data.publicUrl, error: null };
}

export async function adminUploadQuestionImage(file: File, questionId: string): Promise<{ url: string | null; error: Error | null }> {
    const ext = file.name.split('.').pop();
    const path = `${questionId}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('question-images').upload(path, file, { upsert: true });
    if (error) return { url: null, error: new Error(error.message) };
    const { data } = supabase.storage.from('question-images').getPublicUrl(path);
    return { url: data.publicUrl, error: null };
}

export async function adminUpdateTopicContent(topicId: string, contentUrl: string | null, contentType: string | null): Promise<{ error: Error | null }> {
    const { error } = await supabase.from('topics').update({ content_url: contentUrl, content_type: contentType }).eq('id', topicId);
    return { error: error ? new Error(error.message) : null };
}

export async function getAllQuestions(): Promise<QuestionRow[]> {
    const { data, error } = await supabase.from('questions').select('*').order('subject').order('topic');
    if (error) { console.error('Error fetching all questions:', error); return []; }
    return (data || []).map(q => ({
        ...q,
        options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
    }));
}

// ===== PAYMENT TYPES =====
export interface CourseSection {
    id: string;
    course_id: string;
    name: string;
    section_number: number;
    price: number;
    currency: string;
    sort_order: number;
    // Joined
    unlocked?: boolean;
    moduleIds?: string[];
}

export interface PaymentRow {
    id: string;
    user_id: string;
    section_id: string;
    amount: number;
    currency: string;
    status: 'pending' | 'paid' | 'failed' | 'refunded';
    paypal_order_id: string | null;
    coupon_id: string | null;
    discount_amount: number;
    notes: string | null;
    created_at: string;
    paid_at: string | null;
    // Joined
    student_email?: string;
    student_name?: string;
    section_name?: string;
    course_name?: string;
}

export interface CouponRow {
    id: string;
    code: string;
    type: 'percentage' | 'fixed';
    value: number;
    max_uses: number | null;
    uses_count: number;
    expires_at: string | null;
    is_active: boolean;
}

export interface StudentAccessRow {
    id: string;
    user_id: string;
    section_id: string;
    status: 'active' | 'free_grant' | 'refunded';
    granted_by_admin: boolean;
    notes: string | null;
    granted_at: string;
    // Joined
    student_email?: string;
    student_name?: string;
    section_name?: string;
    course_name?: string;
}

// ===== SECTIONS =====
export async function getCourseSections(courseId: string, userId?: string): Promise<CourseSection[]> {
    const { data: sections } = await supabase
        .from('course_sections')
        .select('*, section_module_map(module_id)')
        .eq('course_id', courseId)
        .order('sort_order');

    if (!sections) return [];

    let unlockedSectionIds = new Set<string>();
    if (userId) {
        const { data: access } = await supabase
            .from('student_section_access')
            .select('section_id')
            .eq('user_id', userId)
            .eq('status', 'active')
            .in('section_id', sections.map(s => s.id));

        // Also check free_grant
        const { data: grants } = await supabase
            .from('student_section_access')
            .select('section_id')
            .eq('user_id', userId)
            .eq('status', 'free_grant')
            .in('section_id', sections.map(s => s.id));

        (access || []).forEach(a => unlockedSectionIds.add(a.section_id));
        (grants || []).forEach(a => unlockedSectionIds.add(a.section_id));
    }

    return sections.map(s => ({
        id: s.id,
        course_id: s.course_id,
        name: s.name,
        section_number: s.section_number,
        price: s.price,
        currency: s.currency,
        sort_order: s.sort_order,
        unlocked: userId ? unlockedSectionIds.has(s.id) : false,
        moduleIds: (s.section_module_map || []).map((m: { module_id: string }) => m.module_id),
    }));
}

export async function adminSaveSection(section: {
    id?: string;
    course_id: string;
    name: string;
    section_number: number;
    price: number;
    currency: string;
    sort_order: number;
}): Promise<{ id: string | null; error: Error | null }> {
    const payload = section.id ? section : { ...section };
    if (!section.id) delete (payload as Partial<typeof section>).id;
    const { data, error } = await supabase
        .from('course_sections')
        .upsert(payload, { onConflict: section.id ? 'id' : undefined })
        .select('id')
        .single();
    return { id: data?.id ?? null, error: error ? new Error(error.message) : null };
}

export async function adminDeleteSection(sectionId: string): Promise<{ error: Error | null }> {
    const { error } = await supabase.from('course_sections').delete().eq('id', sectionId);
    return { error: error ? new Error(error.message) : null };
}

export async function adminAssignModulesToSection(sectionId: string, moduleIds: string[]): Promise<{ error: Error | null }> {
    // Delete existing mappings then re-insert
    await supabase.from('section_module_map').delete().eq('section_id', sectionId);
    if (moduleIds.length === 0) return { error: null };
    const rows = moduleIds.map(mid => ({ section_id: sectionId, module_id: mid }));
    const { error } = await supabase.from('section_module_map').insert(rows);
    return { error: error ? new Error(error.message) : null };
}

export async function adminUpdateCoursePaymentSettings(courseId: string, settings: {
    expiry_date?: string | null;
    is_installment?: boolean;
}): Promise<{ error: Error | null }> {
    const { error } = await supabase.from('courses').update(settings).eq('id', courseId);
    return { error: error ? new Error(error.message) : null };
}

// ===== STUDENT ACCESS (admin) =====
export async function adminGetAllStudentAccess(): Promise<StudentAccessRow[]> {
    const { data, error } = await supabase
        .from('student_section_access')
        .select(`
            *,
            course_sections!inner(name, courses!inner(name))
        `)
        .order('granted_at', { ascending: false });

    if (error) { console.error(error); return []; }

    return (data || []).map(row => ({
        ...row,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        section_name: (row as any).course_sections?.name,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        course_name: (row as any).course_sections?.courses?.name,
    }));
}

export async function adminGrantAccess(userId: string, sectionId: string, notes?: string): Promise<{ error: Error | null }> {
    const { error } = await supabase.from('student_section_access').upsert({
        user_id: userId,
        section_id: sectionId,
        status: 'free_grant',
        granted_by_admin: true,
        notes: notes || null,
    }, { onConflict: 'user_id,section_id' });
    return { error: error ? new Error(error.message) : null };
}

export async function adminRevokeAccess(userId: string, sectionId: string): Promise<{ error: Error | null }> {
    const { error } = await supabase.from('student_section_access')
        .update({ status: 'refunded' })
        .eq('user_id', userId)
        .eq('section_id', sectionId);
    return { error: error ? new Error(error.message) : null };
}

// ===== PAYMENTS (finance) =====
export async function adminGetAllPayments(): Promise<PaymentRow[]> {
    const { data, error } = await supabase
        .from('payments')
        .select(`*, course_sections(name, courses(name))`)
        .order('created_at', { ascending: false });

    if (error) { console.error(error); return []; }
    return (data || []).map(row => ({
        ...row,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        section_name: (row as any).course_sections?.name,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        course_name: (row as any).course_sections?.courses?.name,
    }));
}

export async function createPaymentRecord(payment: {
    user_id: string;
    section_id: string;
    amount: number;
    currency: string;
    paypal_order_id: string;
    coupon_id?: string | null;
    discount_amount?: number;
}): Promise<{ id: string | null; error: Error | null }> {
    const { data, error } = await supabase.from('payments').insert({
        ...payment,
        status: 'pending',
    }).select('id').single();
    return { id: data?.id ?? null, error: error ? new Error(error.message) : null };
}

export async function updatePaymentStatus(paymentId: string, status: 'paid' | 'failed' | 'refunded', sectionId?: string, userId?: string): Promise<{ error: Error | null }> {
    const updates: Record<string, unknown> = { status };
    if (status === 'paid') updates.paid_at = new Date().toISOString();
    if (status === 'refunded') updates.refunded_at = new Date().toISOString();

    const { error } = await supabase.from('payments').update(updates).eq('id', paymentId);
    if (error) return { error: new Error(error.message) };

    // If paid: grant access
    if (status === 'paid' && sectionId && userId) {
        await supabase.from('student_section_access').upsert({
            user_id: userId,
            section_id: sectionId,
            payment_id: paymentId,
            status: 'active',
            granted_by_admin: false,
        }, { onConflict: 'user_id,section_id' });
    }
    // If refunded: revoke access
    if (status === 'refunded' && sectionId && userId) {
        await supabase.from('student_section_access')
            .update({ status: 'refunded' })
            .eq('user_id', userId)
            .eq('section_id', sectionId);
    }
    return { error: null };
}

// ===== COUPONS =====
export async function adminGetCoupons(): Promise<CouponRow[]> {
    const { data, error } = await supabase.from('coupons').select('*').order('created_at', { ascending: false });
    if (error) { console.error(error); return []; }
    return data || [];
}

export async function adminSaveCoupon(coupon: Omit<CouponRow, 'id' | 'uses_count'>): Promise<{ error: Error | null }> {
    const { error } = await supabase.from('coupons').insert({ ...coupon, uses_count: 0 });
    return { error: error ? new Error(error.message) : null };
}

export async function adminToggleCoupon(couponId: string, isActive: boolean): Promise<{ error: Error | null }> {
    const { error } = await supabase.from('coupons').update({ is_active: isActive }).eq('id', couponId);
    return { error: error ? new Error(error.message) : null };
}

export async function validateCoupon(code: string, price: number): Promise<{ valid: boolean; discount: number; coupon: CouponRow | null; message: string }> {
    const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', code.toUpperCase())
        .eq('is_active', true)
        .single();

    if (error || !data) return { valid: false, discount: 0, coupon: null, message: 'Invalid coupon code' };

    const coupon = data as CouponRow;

    // Check expiry
    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
        return { valid: false, discount: 0, coupon: null, message: 'Coupon has expired' };
    }
    // Check max uses
    if (coupon.max_uses !== null && coupon.uses_count >= coupon.max_uses) {
        return { valid: false, discount: 0, coupon: null, message: 'Coupon usage limit reached' };
    }

    const discount = coupon.type === 'percentage'
        ? Math.min(price * (coupon.value / 100), price)
        : Math.min(coupon.value, price);

    return { valid: true, discount: Math.round(discount * 100) / 100, coupon, message: `${coupon.type === 'percentage' ? coupon.value + '%' : '€' + coupon.value} discount applied!` };
}

// ===== ADMIN ANALYTICS =====

export interface PlatformStats {
    totalStudents: number;
    activeStudents: number; // tested in last 7 days
    totalTests: number;
    avgScore: number;
    avgCorrectRate: number;
    totalTopicsCompleted: number;
}

export interface SubjectPerformance {
    subject: string;
    totalAttempts: number;
    avgScore: number;
    avgCorrectRate: number;
    totalTests: number;
}

export interface QuestionAnalytics {
    id: string;
    subject: string;
    topic: string;
    difficulty: string;
    stem: string;
    totalAttempts: number;
    correctCount: number;
    successRate: number; // 0-100
}

export interface StudentSummary {
    userId: string;
    email: string;
    firstName: string;
    lastName: string;
    totalTests: number;
    avgScore: number;
    avgCorrectRate: number;
    lastTestDate: string | null;
    studyStreak: number;
}

export async function adminGetPlatformStats(): Promise<PlatformStats> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [profilesRes, testsRes, recentUsersRes, progressRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }),
        supabase.from('test_results').select('score, max_score, correct, total_questions'),
        supabase.from('test_results').select('user_id').gte('created_at', sevenDaysAgo),
        supabase.from('user_topic_progress').select('id', { count: 'exact', head: true }).eq('completed', true),
    ]);

    const tests = testsRes.data || [];
    const activeSet = new Set((recentUsersRes.data || []).map(r => r.user_id));

    const avgScore = tests.length > 0
        ? tests.reduce((sum, t) => sum + (t.max_score > 0 ? (t.score / t.max_score) * 100 : 0), 0) / tests.length
        : 0;

    const avgCorrectRate = tests.length > 0
        ? tests.reduce((sum, t) => sum + (t.total_questions > 0 ? (t.correct / t.total_questions) * 100 : 0), 0) / tests.length
        : 0;

    return {
        totalStudents: profilesRes.count ?? 0,
        activeStudents: activeSet.size,
        totalTests: tests.length,
        avgScore: Math.round(avgScore * 10) / 10,
        avgCorrectRate: Math.round(avgCorrectRate * 10) / 10,
        totalTopicsCompleted: progressRes.count ?? 0,
    };
}

export async function adminGetSubjectPerformance(): Promise<SubjectPerformance[]> {
    const { data } = await supabase
        .from('test_results')
        .select('subjects, score, max_score, correct, total_questions');

    if (!data || data.length === 0) return [];

    const subjectMap: Record<string, { scores: number[]; correctRates: number[]; count: number }> = {};

    for (const test of data) {
        const subjects: string[] = Array.isArray(test.subjects) ? test.subjects : [];
        const scoreRate = test.max_score > 0 ? (test.score / test.max_score) * 100 : 0;
        const correctRate = test.total_questions > 0 ? (test.correct / test.total_questions) * 100 : 0;
        for (const subject of subjects) {
            if (!subjectMap[subject]) subjectMap[subject] = { scores: [], correctRates: [], count: 0 };
            subjectMap[subject].scores.push(scoreRate);
            subjectMap[subject].correctRates.push(correctRate);
            subjectMap[subject].count++;
        }
    }

    return Object.entries(subjectMap).map(([subject, { scores, correctRates, count }]) => ({
        subject,
        totalAttempts: count,
        totalTests: count,
        avgScore: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10,
        avgCorrectRate: Math.round((correctRates.reduce((a, b) => a + b, 0) / correctRates.length) * 10) / 10,
    })).sort((a, b) => b.totalAttempts - a.totalAttempts);
}

export async function adminGetQuestionAnalytics(limit = 30, sortBy: 'hardest' | 'easiest' | 'mostAttempted' = 'hardest'): Promise<QuestionAnalytics[]> {
    // Get all test answers with question info
    const { data } = await supabase
        .from('test_answers')
        .select('question_id, is_correct, questions!inner(id, subject, topic, difficulty, stem)');

    if (!data || data.length === 0) return [];

    // Aggregate per question
    const qMap: Record<string, { correct: number; total: number; meta: { subject: string; topic: string; difficulty: string; stem: string } }> = {};

    for (const row of data) {
        const q = row as unknown as { question_id: string; is_correct: boolean; questions: { id: string; subject: string; topic: string; difficulty: string; stem: string } };
        const id = q.question_id;
        if (!qMap[id]) qMap[id] = { correct: 0, total: 0, meta: q.questions };
        qMap[id].total++;
        if (q.is_correct) qMap[id].correct++;
    }

    let results: QuestionAnalytics[] = Object.entries(qMap).map(([id, { correct, total, meta }]) => ({
        id,
        subject: meta.subject,
        topic: meta.topic,
        difficulty: meta.difficulty,
        stem: meta.stem,
        totalAttempts: total,
        correctCount: correct,
        successRate: Math.round((correct / total) * 1000) / 10,
    }));

    if (sortBy === 'hardest') results = results.sort((a, b) => a.successRate - b.successRate);
    else if (sortBy === 'easiest') results = results.sort((a, b) => b.successRate - a.successRate);
    else results = results.sort((a, b) => b.totalAttempts - a.totalAttempts);

    return results.slice(0, limit);
}

export async function adminGetStudentRoster(): Promise<StudentSummary[]> {
    const { data: profiles } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, study_streak')
        .order('created_at', { ascending: false });

    if (!profiles || profiles.length === 0) return [];

    const { data: tests } = await supabase
        .from('test_results')
        .select('user_id, score, max_score, correct, total_questions, created_at')
        .order('created_at', { ascending: false });

    const testsByUser: Record<string, typeof tests> = {};
    for (const t of (tests || [])) {
        if (!testsByUser[t.user_id]) testsByUser[t.user_id] = [];
        testsByUser[t.user_id]!.push(t);
    }

    return profiles.map(p => {
        const userTests = testsByUser[p.id] || [];
        const avgScore = userTests.length > 0
            ? userTests.reduce((sum, t) => sum + (t.max_score > 0 ? (t.score / t.max_score) * 100 : 0), 0) / userTests.length
            : 0;
        const avgCorrectRate = userTests.length > 0
            ? userTests.reduce((sum, t) => sum + (t.total_questions > 0 ? (t.correct / t.total_questions) * 100 : 0), 0) / userTests.length
            : 0;
        return {
            userId: p.id,
            email: p.email || '',
            firstName: p.first_name || '',
            lastName: p.last_name || '',
            totalTests: userTests.length,
            avgScore: Math.round(avgScore * 10) / 10,
            avgCorrectRate: Math.round(avgCorrectRate * 10) / 10,
            lastTestDate: userTests[0]?.created_at || null,
            studyStreak: p.study_streak || 0,
        };
    }).sort((a, b) => b.totalTests - a.totalTests);
}

// ===== STUDENT ORDER HISTORY =====
export interface StudentPaymentRow {
    id: string;
    amount: number;
    currency: string;
    status: 'pending' | 'paid' | 'failed' | 'refunded';
    discount_amount: number;
    paypal_order_id: string | null;
    created_at: string;
    paid_at: string | null;
    section_name?: string;
    course_name?: string;
}

export async function getStudentPayments(userId: string): Promise<StudentPaymentRow[]> {
    const { data, error } = await supabase
        .from('payments')
        .select(`*, course_sections(name, course_id, courses(name))`)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

    if (error) { console.error('Error fetching student payments:', error); return []; }

    return (data || []).map(row => ({
        id: row.id,
        amount: row.amount,
        currency: row.currency,
        status: row.status,
        discount_amount: row.discount_amount || 0,
        paypal_order_id: row.paypal_order_id,
        created_at: row.created_at,
        paid_at: row.paid_at,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        section_name: (row as any).course_sections?.name,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        course_name: (row as any).course_sections?.courses?.name,
    }));
}

// ===== ADMIN ROLES & TEAM =====
export type AdminRole = 'super_admin' | 'content_manager' | 'finance_manager' | 'analyst' | 'support';

export const ADMIN_ROLE_LABELS: Record<AdminRole, string> = {
    super_admin: 'Super Admin',
    content_manager: 'Content Manager',
    finance_manager: 'Finance Manager',
    analyst: 'Analyst',
    support: 'Support Agent',
};

export const ADMIN_ROLE_DESCRIPTIONS: Record<AdminRole, string> = {
    super_admin: 'Full access to everything, including team management',
    content_manager: 'Courses, questions, content uploads, sections & pricing',
    finance_manager: 'Payments, coupons, student access management',
    analyst: 'Analytics dashboards, student roster, question intelligence',
    support: 'Student access management, view payments',
};

// Which admin tabs each role can see
export const ROLE_PERMISSIONS: Record<AdminRole, string[]> = {
    super_admin: ['courses', 'questions', 'sections', 'students', 'finance', 'analytics', 'team'],
    content_manager: ['courses', 'questions', 'sections'],
    finance_manager: ['finance', 'students'],
    analyst: ['analytics'],
    support: ['students', 'finance'],
};

export interface TeamMember {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    admin_role: AdminRole;
    created_at: string;
}

export async function adminGetTeamMembers(): Promise<TeamMember[]> {
    const { data, error } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, admin_role, created_at')
        .not('admin_role', 'is', null)
        .order('created_at');

    if (error) { console.error('Error fetching team:', error); return []; }
    return (data || []) as TeamMember[];
}

export async function adminSetUserRole(userId: string, role: AdminRole): Promise<{ error: Error | null }> {
    const { error } = await supabase
        .from('profiles')
        .update({ admin_role: role, is_admin: true })
        .eq('id', userId);
    return { error: error ? new Error(error.message) : null };
}

export async function adminRemoveUserRole(userId: string): Promise<{ error: Error | null }> {
    const { error } = await supabase
        .from('profiles')
        .update({ admin_role: null, is_admin: false })
        .eq('id', userId);
    return { error: error ? new Error(error.message) : null };
}

export async function adminFindUserByEmail(email: string): Promise<{ id: string; email: string; first_name: string | null; last_name: string | null } | null> {
    const { data, error } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name')
        .eq('email', email.trim().toLowerCase())
        .single();

    if (error || !data) return null;
    return data;
}
