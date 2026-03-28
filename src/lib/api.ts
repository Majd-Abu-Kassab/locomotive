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
}): Promise<{ error: Error | null }> {
    const dbQ = { ...question, options: JSON.stringify(question.options) };
    const { error } = await supabase.from('questions').upsert(dbQ, { onConflict: 'id' });
    return { error: error ? new Error(error.message) : null };
}

export async function adminDeleteQuestion(questionId: string): Promise<{ error: Error | null }> {
    const { error } = await supabase.from('questions').delete().eq('id', questionId);
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
