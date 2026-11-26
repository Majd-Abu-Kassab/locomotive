import type { SupabaseClient } from '@supabase/supabase-js';

function isAbort(error: any) {
    if (!error) return false;
    if (error.name === 'AbortError') return true;
    if (typeof error.message === 'string' && (
        error.message === 'AbortError' ||
        error.message.includes('AbortError') ||
        error.message.includes('aborted')
    )) return true;
    if (typeof error.details === 'string' && error.details.includes('AbortError')) return true;
    return false;
}

function throwIfAborted(error: unknown, signal?: AbortSignal): void {
    if (isAbort(error) || signal?.aborted) {
        throw (error instanceof Error ? error : new DOMException('Aborted', 'AbortError'));
    }
}

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
    /** Students may download this lesson's file (off by default; slide decks always). */
    allow_download?: boolean;
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
    /** The quiz lesson (topics.id) this question is in; null = course bank only. */
    lesson_id?: string | null;
    /** Create Test topic (question_topics.id); null = untagged. */
    topic_id?: string | null;
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
export interface NotificationRow {
    id: string;
    user_id: string;
    title: string;
    message: string;
    type: string;
    link: string | null;
    is_read: boolean;
    created_at: string;
}

// ===== COURSES =====
export async function getCourses(supabase: SupabaseClient, userId?: string, signal?: AbortSignal): Promise<CourseWithModules[]> {
    // Run all database fetches concurrently to eliminate sequential lag
    const [{ data: coursesData }, { data: modulesData }, { data: topicsData }, { data: progressData }] = await Promise.all([
        supabase.from('courses').select('*').order('sort_order').abortSignal(signal!),
        supabase.from('modules').select('*').order('sort_order').abortSignal(signal!),
        supabase.from('topics').select('*').order('sort_order').abortSignal(signal!),
        userId
            ? supabase.from('user_topic_progress')
                .select('topic_id, completed')
                .eq('user_id', userId)
                .eq('completed', true)
                .abortSignal(signal!)
            : Promise.resolve({ data: null as { topic_id: string; completed: boolean }[] | null }),
    ]);
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

    const progressMap: Record<string, boolean> = {};
    if (progressData) {
        progressData.forEach((p) => { progressMap[p.topic_id] = true; });
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

export async function getCourse(supabase: SupabaseClient, courseId: string, userId?: string, signal?: AbortSignal): Promise<CourseWithModules | null> {
    const courses = await getCourses(supabase, userId, signal);
    return courses.find(c => c.id === courseId) || null;
}

// ===== QUESTIONS =====
export async function getQuestions(supabase: SupabaseClient, filters?: {
    subjects?: string[];
    difficulty?: string;
    source?: string;
    lessonId?: string;
    limit?: number;
}, signal?: AbortSignal): Promise<QuestionRow[]> {
    let query = supabase.from('questions').select('*');

    if (filters?.lessonId) {
        query = query.eq('lesson_id', filters.lessonId);
    }

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

    const { data, error } = await query.abortSignal(signal!);
    if (error) {
        throwIfAborted(error, signal);
        console.error('Error fetching questions:', error);
        return [];
    }

    // Parse options from JSON
    return (data || []).map(q => ({
        ...q,
        options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
    }));
}

// ===== CREATE TEST: COURSE › SUBJECT › TOPIC =====
// Question tags (supabase/question-topics.sql), separate from the lesson structure.

export interface PickerTopic { id: string; name: string; count: number | null }
export interface PickerSubject { id: string; name: string; topics: PickerTopic[] }
export interface PickerCourse {
    id: string;
    name: string;
    icon: string;
    color: string;
    subjects: PickerSubject[];
    /** Questions in this course with no topic; null if counts couldn't load. */
    untagged: number | null;
}

/** Courses with their subjects and topics, leaving out anything with no questions. */
export async function getQuestionTopicTree(supabase: SupabaseClient, signal?: AbortSignal): Promise<PickerCourse[]> {
    const [courses, subjects, topics, counts] = await Promise.all([
        supabase.from('courses').select('id, name, icon, color').order('sort_order').abortSignal(signal!),
        supabase.from('question_subjects').select('id, course_id, name').order('sort_order').order('name').abortSignal(signal!),
        supabase.from('question_topics').select('id, subject_id, name').order('sort_order').order('name').abortSignal(signal!),
        supabase.from('question_topic_counts').select('course_name, topic_id, questions').abortSignal(signal!),
    ]);
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
    if (courses.error) throw courses.error;

    // Without counts (e.g. before the migration has run) show every course whole.
    const known = !counts.error;
    const byTopic = new Map<string, number>();
    const untaggedByCourse = new Map<string, number>();
    for (const r of counts.data ?? []) {
        const map = r.topic_id ? byTopic : untaggedByCourse;
        const key = r.topic_id ?? r.course_name;
        map.set(key, (map.get(key) ?? 0) + r.questions);
    }

    return (courses.data ?? []).map(c => {
        const courseSubjects = (subjects.data ?? [])
            .filter(s => s.course_id === c.id)
            .map(s => ({
                id: s.id,
                name: s.name,
                topics: (topics.data ?? [])
                    .filter(t => t.subject_id === s.id)
                    .map(t => ({ id: t.id, name: t.name, count: known ? byTopic.get(t.id) ?? 0 : null }))
                    .filter(t => t.count !== 0),
            }))
            .filter(s => s.topics.length > 0);
        return {
            id: c.id, name: c.name, icon: c.icon, color: c.color,
            subjects: courseSubjects,
            untagged: known ? untaggedByCourse.get(c.name) ?? 0 : null,
        };
    }).filter(c => c.subjects.length > 0 || c.untagged !== 0);
}

/** What a student picked: whole courses, single topics, and courses' untagged questions. */
export interface QuestionPick {
    courses: string[];
    topicIds: string[];
    untaggedCourses: string[];
}

const PREMIUM_SOURCE = 'locomotive-original';

/** PostgREST filter value in double quotes, so names with commas or brackets work. */
const pgQuote = (s: string) => `"${s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"`;

/**
 * A random set of questions for Create Test. `pick` null = every topic.
 * `matched` counts questions matching the filters before premium ones are
 * dropped, so the caller can tell "nothing matched" from "all premium".
 */
export async function drawQuestions(supabase: SupabaseClient, opts: {
    pick: QuestionPick | null;
    difficulty: string;
    source: string;
    count: number;
    includePremium: boolean;
}): Promise<{ questions: QuestionRow[]; matched: number }> {
    const parts = opts.pick && [
        ...opts.pick.courses.map(c => `subject.eq.${pgQuote(c)}`),
        ...(opts.pick.topicIds.length ? [`topic_id.in.(${opts.pick.topicIds.join(',')})`] : []),
        ...opts.pick.untaggedCourses.map(c => `and(subject.eq.${pgQuote(c)},topic_id.is.null)`),
    ];
    if (parts && parts.length === 0) return { questions: [], matched: 0 };

    // Every matching id (light), then a random draw, then the full rows of the
    // drawn ones. Paged because the API returns at most 1000 rows at a time.
    const PAGE = 1000;
    const pool: { id: string; source: string }[] = [];
    for (let from = 0; ; from += PAGE) {
        let q = supabase.from('questions').select('id, source');
        if (parts) q = q.or(parts.join(','));
        if (opts.difficulty !== 'all') q = q.eq('difficulty', opts.difficulty);
        if (opts.source !== 'all') q = q.eq('source', opts.source);
        const { data, error } = await q.order('id').range(from, from + PAGE - 1);
        if (error) throw new Error(error.message);
        pool.push(...data);
        if (data.length < PAGE) break;
    }

    const eligible = opts.includePremium ? pool : pool.filter(q => q.source !== PREMIUM_SOURCE);
    for (let i = eligible.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [eligible[i], eligible[j]] = [eligible[j], eligible[i]];
    }
    const ids = eligible.slice(0, opts.count).map(q => q.id);
    if (ids.length === 0) return { questions: [], matched: pool.length };

    const { data, error } = await supabase.from('questions').select('*').in('id', ids);
    if (error) throw new Error(error.message);
    const byId = new Map((data ?? []).map(q => [q.id, {
        ...q,
        options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
    } as QuestionRow]));
    return { questions: ids.flatMap(id => byId.get(id) ?? []), matched: pool.length };
}

// ===== TEST RESULTS =====
export async function getTestResults(supabase: SupabaseClient, userId: string, signal?: AbortSignal): Promise<TestResultRow[]> {
    const { data, error } = await supabase
        .from('test_results')
        .select('*')
        .eq('user_id', userId)
        .order('date', { ascending: false })
        .abortSignal(signal!);

    if (error) {
        throwIfAborted(error, signal);
        console.error('Error fetching test results:', error);
        return [];
    }
    return data || [];
}

export async function saveTestResult(supabase: SupabaseClient, result: {
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

export async function saveTestAnswers(supabase: SupabaseClient, answers: {
    test_result_id: string;
    question_id: string;
    selected_answer: number | null;
    is_correct: boolean | null;
    /** Order the question appeared in, so the test can be reviewed in that order. */
    position: number;
}[]): Promise<{ error: Error | null }> {
    const { error } = await supabase.from('test_answers').insert(answers);
    return { error: error ? new Error(error.message) : null };
}

export async function renameTestResult(supabase: SupabaseClient, resultId: string, name: string): Promise<{ error: Error | null }> {
    const { error } = await supabase.from('test_results').update({ name: name.trim() }).eq('id', resultId);
    return { error: error ? new Error(error.message) : null };
}

/**
 * A past test rebuilt for review: its questions in the order they were taken
 * and the answer given to each (null = skipped). Questions deleted from the
 * bank since are left out.
 */
export async function getTestReview(supabase: SupabaseClient, resultId: string): Promise<{
    result: TestResultRow;
    questions: QuestionRow[];
    answers: (number | null)[];
} | null> {
    const [{ data: result }, { data: rows }] = await Promise.all([
        supabase.from('test_results').select('*').eq('id', resultId).maybeSingle(),
        supabase.from('test_answers')
            .select('question_id, selected_answer, position')
            .eq('test_result_id', resultId)
            .order('position', { nullsFirst: false })
            .order('id'),
    ]);
    if (!result || !rows) return null;

    const ids = rows.map(r => r.question_id);
    const { data: qs } = ids.length
        ? await supabase.from('questions').select('*').in('id', ids)
        : { data: [] };
    const byId = new Map((qs || []).map(q => [q.id, {
        ...q,
        options: typeof q.options === 'string' ? JSON.parse(q.options) : q.options,
    } as QuestionRow]));

    const questions: QuestionRow[] = [];
    const answers: (number | null)[] = [];
    for (const r of rows) {
        const q = byId.get(r.question_id);
        if (!q) continue;
        questions.push(q);
        answers.push(r.selected_answer);
    }
    return { result, questions, answers };
}

// ===== SCHEDULE =====
export async function getScheduleEvents(supabase: SupabaseClient, userId: string, signal?: AbortSignal): Promise<ScheduleEventRow[]> {
    const { data, error } = await supabase
        .from('schedule_events')
        .select('*')
        .eq('user_id', userId)
        .order('date')
        .abortSignal(signal!);

    if (error) {
        throwIfAborted(error, signal);
        console.error('Error fetching schedule:', error);
        return [];
    }
    return data || [];
}

export async function saveScheduleEvent(supabase: SupabaseClient, event: {
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

export async function deleteScheduleEvent(supabase: SupabaseClient, eventId: string): Promise<{ error: Error | null }> {
    const { error } = await supabase
        .from('schedule_events')
        .delete()
        .eq('id', eventId);

    return { error: error ? new Error(error.message) : null };
}

// ===== TOPIC PROGRESS =====
export async function markTopicComplete(supabase: SupabaseClient, userId: string, topicId: string): Promise<{ error: Error | null }> {
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

export async function markTopicIncomplete(supabase: SupabaseClient, userId: string, topicId: string): Promise<{ error: Error | null }> {
    const { error } = await supabase
        .from('user_topic_progress')
        .delete()
        .eq('user_id', userId)
        .eq('topic_id', topicId);

    return { error: error ? new Error(error.message) : null };
}

// ===== ADMIN =====
export async function adminSaveCourse(supabase: SupabaseClient, course: {
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

export async function adminDeleteCourse(supabase: SupabaseClient, courseId: string): Promise<{ error: Error | null }> {
    const { error } = await supabase.from('courses').delete().eq('id', courseId);
    return { error: error ? new Error(error.message) : null };
}

export async function adminSaveModule(supabase: SupabaseClient, module: {
    id: string;
    course_id: string;
    name: string;
    sort_order: number;
}): Promise<{ error: Error | null }> {
    const { error } = await supabase.from('modules').upsert(module, { onConflict: 'id' });
    return { error: error ? new Error(error.message) : null };
}

export async function adminDeleteModule(supabase: SupabaseClient, moduleId: string): Promise<{ error: Error | null }> {
    const { error } = await supabase.from('modules').delete().eq('id', moduleId);
    return { error: error ? new Error(error.message) : null };
}

export async function adminSaveTopic(supabase: SupabaseClient, topic: {
    id: string;
    module_id: string;
    name: string;
    question_count: number;
    lesson_type: 'video' | 'pdf' | 'quiz';
    sort_order: number;
    allow_download: boolean;
}): Promise<{ error: Error | null }> {
    const { error } = await supabase.from('topics').upsert(topic, { onConflict: 'id' });
    return { error: error ? new Error(error.message) : null };
}

export async function adminDeleteTopic(supabase: SupabaseClient, topicId: string): Promise<{ error: Error | null }> {
    const { error } = await supabase.from('topics').delete().eq('id', topicId);
    return { error: error ? new Error(error.message) : null };
}

export async function adminSaveQuestion(supabase: SupabaseClient, question: {
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
    lesson_id?: string | null;
    topic_id?: string | null;
}): Promise<{ error: Error | null }> {
    const dbQ = { ...question, options: JSON.stringify(question.options) };
    const { error } = await supabase.from('questions').upsert(dbQ, { onConflict: 'id' });
    return { error: error ? new Error(error.message) : null };
}

export async function adminDeleteQuestion(supabase: SupabaseClient, questionId: string): Promise<{ error: Error | null }> {
    const { error } = await supabase.from('questions').delete().eq('id', questionId);
    return { error: error ? new Error(error.message) : null };
}

// Bulk-insert questions (e.g. from a JSON import). Upserts by id so a re-run
// with the same ids updates rather than duplicates.
export async function adminBulkImportQuestions(
    supabase: SupabaseClient,
    questions: {
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
        lesson_id?: string | null;
        topic_id?: string | null;
    }[]
): Promise<{ imported: number; error: Error | null }> {
    if (questions.length === 0) return { imported: 0, error: null };
    const rows = questions.map(q => ({ ...q, options: JSON.stringify(q.options) }));
    const { error } = await supabase.from('questions').upsert(rows, { onConflict: 'id' });
    return { imported: error ? 0 : questions.length, error: error ? new Error(error.message) : null };
}

/** Ids in groups of 100, so the list (sent in the URL) stays a safe length. */
function chunks<T>(items: T[], size = 100): T[][] {
    const out: T[][] = [];
    for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
    return out;
}

/**
 * Move questions into a quiz (or back to the course bank with lessonId null).
 * Questions coming from another course lose their topic, which belongs to
 * that other course.
 */
export async function adminMoveQuestions(
    supabase: SupabaseClient,
    questionIds: string[],
    target: { subject: string; lessonId: string | null },
): Promise<{ error: Error | null }> {
    for (const ids of chunks(questionIds)) {
        const fromOther = await supabase.from('questions')
            .update({ subject: target.subject, lesson_id: target.lessonId, topic_id: null })
            .in('id', ids).neq('subject', target.subject);
        if (fromOther.error) return { error: new Error(fromOther.error.message) };
        const sameCourse = await supabase.from('questions')
            .update({ lesson_id: target.lessonId })
            .in('id', ids).eq('subject', target.subject);
        if (sameCourse.error) return { error: new Error(sameCourse.error.message) };
    }
    return { error: null };
}

/** Permanently delete questions (and students' saved answers to them). */
export async function adminDeleteQuestions(supabase: SupabaseClient, questionIds: string[]): Promise<{ error: Error | null }> {
    for (const ids of chunks(questionIds)) {
        const { error } = await supabase.from('questions').delete().in('id', ids);
        if (error) return { error: new Error(error.message) };
    }
    return { error: null };
}

// ===== ADMIN: QUESTION SUBJECTS & TOPICS (supabase/question-topics.sql) =====
export interface QuestionSubjectRow { id: string; course_id: string; name: string; sort_order: number }
export interface QuestionTopicRow { id: string; subject_id: string; name: string; sort_order: number }

/** Every subject and topic, including empty ones. Empty lists if the tables aren't there yet. */
export async function getQuestionTaxonomy(supabase: SupabaseClient, signal?: AbortSignal): Promise<{ subjects: QuestionSubjectRow[]; topics: QuestionTopicRow[] }> {
    const [s, t] = await Promise.all([
        supabase.from('question_subjects').select('id, course_id, name, sort_order').order('sort_order').order('name').abortSignal(signal!),
        supabase.from('question_topics').select('id, subject_id, name, sort_order').order('sort_order').order('name').abortSignal(signal!),
    ]);
    if (s.error) throwIfAborted(s.error, signal);
    if (t.error) throwIfAborted(t.error, signal);
    if (s.error || t.error) console.error('Error fetching subjects and topics:', s.error ?? t.error);
    return { subjects: s.data ?? [], topics: t.data ?? [] };
}

function nameError(error: { code?: string; message: string }, what: string): Error {
    return new Error(error.code === '23505' ? `There's already a ${what} with that name.` : error.message);
}

/** Add a subject to a course, or rename one (with id). */
export async function adminSaveQuestionSubject(supabase: SupabaseClient, subject: { id?: string; course_id: string; name: string }): Promise<{ error: Error | null }> {
    const name = subject.name.trim();
    const { error } = subject.id
        ? await supabase.from('question_subjects').update({ name }).eq('id', subject.id)
        : await supabase.from('question_subjects').insert({ course_id: subject.course_id, name });
    return { error: error ? nameError(error, 'subject in this course') : null };
}

/** Deletes the subject and its topics; their questions stay, untagged. */
export async function adminDeleteQuestionSubject(supabase: SupabaseClient, id: string): Promise<{ error: Error | null }> {
    const { error } = await supabase.from('question_subjects').delete().eq('id', id);
    return { error: error ? new Error(error.message) : null };
}

/** Add a topic to a subject, or rename one (with id). */
export async function adminSaveQuestionTopic(supabase: SupabaseClient, topic: { id?: string; subject_id: string; name: string }): Promise<{ error: Error | null }> {
    const name = topic.name.trim();
    const { error } = topic.id
        ? await supabase.from('question_topics').update({ name }).eq('id', topic.id)
        : await supabase.from('question_topics').insert({ subject_id: topic.subject_id, name });
    if (error) return { error: nameError(error, 'topic in this subject') };
    // Keep the questions' topic text (shown in analytics) in step with a rename.
    if (topic.id) {
        const sync = await supabase.from('questions').update({ topic: name }).eq('topic_id', topic.id);
        if (sync.error) return { error: new Error(sync.error.message) };
    }
    return { error: null };
}

/** Deletes the topic; its questions stay, untagged. */
export async function adminDeleteQuestionTopic(supabase: SupabaseClient, id: string): Promise<{ error: Error | null }> {
    const { error } = await supabase.from('question_topics').delete().eq('id', id);
    return { error: error ? new Error(error.message) : null };
}

/** How subject and topic names are compared: ignoring case and extra spaces. */
export const taxonomyKey = (name: string) => name.trim().replace(/\s+/g, ' ').toLowerCase();
/** One key for a Subject › Topic pair. */
export const subjectTopicKey = (subject: string, topic: string) => `${taxonomyKey(subject)}\u0000${taxonomyKey(topic)}`;

/**
 * For a question import: makes sure each Subject › Topic exists in the
 * course, adding the missing ones (an existing name in different case is
 * reused, not duplicated), and returns each pair's topic by subjectTopicKey.
 */
export async function adminEnsureQuestionTopics(
    supabase: SupabaseClient,
    courseId: string,
    pairs: { subject: string; topic: string }[],
): Promise<{ topics: Map<string, { id: string; name: string }>; addedSubjects: number; addedTopics: number; error: Error | null }> {
    const topics = new Map<string, { id: string; name: string }>();
    const fail = (message: string) => ({ topics, addedSubjects: 0, addedTopics: 0, error: new Error(message) });
    if (pairs.length === 0) return { topics, addedSubjects: 0, addedTopics: 0, error: null };

    // Subjects: find each one in the course, adding the ones that are missing.
    const loadSubjects = () => supabase.from('question_subjects').select('id, name').eq('course_id', courseId);
    let subj = await loadSubjects();
    if (subj.error) return fail(subj.error.message);
    const missingSubjects = [...new Map(pairs
        .filter(p => !subj.data!.some(s => taxonomyKey(s.name) === taxonomyKey(p.subject)))
        .map(p => [taxonomyKey(p.subject), p.subject.trim().replace(/\s+/g, ' ')])).values()];
    if (missingSubjects.length) {
        const add = await supabase.from('question_subjects')
            .upsert(missingSubjects.map(name => ({ course_id: courseId, name })), { onConflict: 'course_id,name', ignoreDuplicates: true });
        if (add.error) return fail(add.error.message);
        subj = await loadSubjects();
        if (subj.error) return fail(subj.error.message);
    }
    const subjectId = new Map(subj.data!.map(s => [taxonomyKey(s.name), s.id]));

    // Topics: the same, within each subject.
    const subjectIds = [...new Set(pairs.map(p => subjectId.get(taxonomyKey(p.subject))).filter((id): id is string => !!id))];
    const loadTopics = () => supabase.from('question_topics').select('id, subject_id, name').in('subject_id', subjectIds);
    let top = await loadTopics();
    if (top.error) return fail(top.error.message);
    const find = (p: { subject: string; topic: string }) => {
        const sid = subjectId.get(taxonomyKey(p.subject));
        return top.data!.find(t => t.subject_id === sid && taxonomyKey(t.name) === taxonomyKey(p.topic));
    };
    const missingTopics = [...new Map(pairs.filter(p => !find(p)).map(p => [subjectTopicKey(p.subject, p.topic), {
        subject_id: subjectId.get(taxonomyKey(p.subject))!,
        name: p.topic.trim().replace(/\s+/g, ' '),
    }])).values()];
    if (missingTopics.some(t => !t.subject_id)) return fail('Couldn’t add a subject for these questions.');
    if (missingTopics.length) {
        const add = await supabase.from('question_topics').upsert(missingTopics, { onConflict: 'subject_id,name', ignoreDuplicates: true });
        if (add.error) return fail(add.error.message);
        top = await loadTopics();
        if (top.error) return fail(top.error.message);
    }

    for (const p of pairs) {
        const t = find(p);
        if (!t) return fail(`Couldn’t add the topic “${p.subject} › ${p.topic}”.`);
        topics.set(subjectTopicKey(p.subject, p.topic), { id: t.id, name: t.name });
    }
    return { topics, addedSubjects: missingSubjects.length, addedTopics: missingTopics.length, error: null };
}

/**
 * Put questions in a topic, or take them out of theirs (target null). A topic
 * belongs to one course, so questions from another course move to that
 * course too, leaving their old course's quiz.
 */
export async function adminSetQuestionsTopic(
    supabase: SupabaseClient,
    questionIds: string[],
    target: { topicId: string; topicName: string; courseName: string } | null,
): Promise<{ error: Error | null }> {
    for (const ids of chunks(questionIds)) {
        if (!target) {
            const { error } = await supabase.from('questions').update({ topic_id: null }).in('id', ids);
            if (error) return { error: new Error(error.message) };
            continue;
        }
        const tag = { topic_id: target.topicId, topic: target.topicName };
        const fromOther = await supabase.from('questions')
            .update({ ...tag, subject: target.courseName, lesson_id: null })
            .in('id', ids).neq('subject', target.courseName);
        if (fromOther.error) return { error: new Error(fromOther.error.message) };
        const sameCourse = await supabase.from('questions').update(tag).in('id', ids).eq('subject', target.courseName);
        if (sameCourse.error) return { error: new Error(sameCourse.error.message) };
    }
    return { error: null };
}

// ===== FILE UPLOADS =====

export async function adminUploadCourseContent(supabase: SupabaseClient, file: File, courseId: string, topicId: string): Promise<{ url: string | null; error: Error | null }> {
    const ext = file.name.split('.').pop();
    const path = `${courseId}/${topicId}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('course-content').upload(path, file, { upsert: true });
    if (error) return { url: null, error: new Error(error.message) };
    const { data } = supabase.storage.from('course-content').getPublicUrl(path);
    return { url: data.publicUrl, error: null };
}

export async function adminUploadQuestionImage(supabase: SupabaseClient, file: File, questionId: string): Promise<{ url: string | null; error: Error | null }> {
    const ext = file.name.split('.').pop();
    const path = `${questionId}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('question-images').upload(path, file, { upsert: true });
    if (error) return { url: null, error: new Error(error.message) };
    const { data } = supabase.storage.from('question-images').getPublicUrl(path);
    return { url: data.publicUrl, error: null };
}

export async function adminUpdateTopicContent(supabase: SupabaseClient, topicId: string, contentUrl: string | null, contentType: string | null): Promise<{ error: Error | null }> {
    const { error } = await supabase.from('topics').update({ content_url: contentUrl, content_type: contentType }).eq('id', topicId);
    return { error: error ? new Error(error.message) : null };
}

export async function getAllQuestions(supabase: SupabaseClient, signal?: AbortSignal): Promise<QuestionRow[]> {
    // The API returns at most 1000 rows per request, so page through them all.
    const PAGE = 1000;
    const data: QuestionRow[] = [];
    for (let from = 0; ; from += PAGE) {
        const { data: page, error } = await supabase.from('questions').select('*')
            .order('subject').order('topic').order('id')
            .range(from, from + PAGE - 1)
            .abortSignal(signal!);
        if (error) {
            throwIfAborted(error, signal);
            console.error('Error fetching all questions:', error);
            return [];
        }
        data.push(...page);
        if (page.length < PAGE) break;
    }
    return data.map(q => ({
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
    includes_memotive?: boolean;
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
    paypal_subscription_id: string | null;
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
export async function getCourseSections(supabase: SupabaseClient, courseId: string, userId?: string, signal?: AbortSignal): Promise<CourseSection[]> {
    const [{ data: sections }, { data: access }] = await Promise.all([
        supabase
            .from('course_sections')
            .select('*, section_module_map(module_id)')
            .eq('course_id', courseId)
            .order('sort_order')
            .abortSignal(signal!),
        userId
            ? supabase
                .from('student_section_access')
                .select('section_id')
                .eq('user_id', userId)
                .in('status', ['active', 'free_grant'])
                .abortSignal(signal!)
            : Promise.resolve({ data: null as { section_id: string }[] | null }),
    ]);

    if (!sections) return [];

    const unlockedSectionIds = new Set<string>((access || []).map(a => a.section_id));

    return sections.map(s => ({
        id: s.id,
        course_id: s.course_id,
        name: s.name,
        section_number: s.section_number,
        price: s.price,
        currency: s.currency,
        sort_order: s.sort_order,
        includes_memotive: !!s.includes_memotive,
        unlocked: userId ? unlockedSectionIds.has(s.id) : false,
        moduleIds: (s.section_module_map || []).map((m: { module_id: string }) => m.module_id),
    }));
}

export async function adminSaveSection(supabase: SupabaseClient, section: {
    id?: string;
    course_id: string;
    name: string;
    section_number: number;
    price: number;
    currency: string;
    sort_order: number;
    includes_memotive: boolean;
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

export async function adminDeleteSection(supabase: SupabaseClient, sectionId: string): Promise<{ error: Error | null }> {
    const { error } = await supabase.from('course_sections').delete().eq('id', sectionId);
    return { error: error ? new Error(error.message) : null };
}

export async function adminAssignModulesToSection(supabase: SupabaseClient, sectionId: string, moduleIds: string[]): Promise<{ error: Error | null }> {
    // Delete existing mappings then re-insert
    await supabase.from('section_module_map').delete().eq('section_id', sectionId);
    if (moduleIds.length === 0) return { error: null };
    const rows = moduleIds.map(mid => ({ section_id: sectionId, module_id: mid }));
    const { error } = await supabase.from('section_module_map').insert(rows);
    return { error: error ? new Error(error.message) : null };
}

export async function adminUpdateCoursePaymentSettings(supabase: SupabaseClient, courseId: string, settings: {
    expiry_date?: string | null;
    is_installment?: boolean;
}): Promise<{ error: Error | null }> {
    const { error } = await supabase.from('courses').update(settings).eq('id', courseId);
    return { error: error ? new Error(error.message) : null };
}

// ===== STUDENT ACCESS (admin) =====
export async function adminGetAllStudentAccess(supabase: SupabaseClient, signal?: AbortSignal): Promise<StudentAccessRow[]> {
    const { data, error } = await supabase
        .from('student_section_access')
        .select(`
            *,
            course_sections!inner(name, courses!inner(name))
        `)
        .order('granted_at', { ascending: false })
        .abortSignal(signal!);

    if (error) {
        throwIfAborted(error, signal);
        console.error(error);
        return [];
    }

    return (data || []).map(row => ({
        ...row,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        section_name: (row as any).course_sections?.name,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        course_name: (row as any).course_sections?.courses?.name,
    }));
}

export async function adminGrantAccess(supabase: SupabaseClient, userId: string, sectionId: string, notes?: string): Promise<{ error: Error | null }> {
    const { error } = await supabase.from('student_section_access').upsert({
        user_id: userId,
        section_id: sectionId,
        status: 'free_grant',
        granted_by_admin: true,
        notes: notes || null,
    }, { onConflict: 'user_id,section_id' });
    return { error: error ? new Error(error.message) : null };
}

export async function adminRevokeAccess(supabase: SupabaseClient, userId: string, sectionId: string): Promise<{ error: Error | null }> {
    const { error } = await supabase.from('student_section_access')
        .update({ status: 'refunded' })
        .eq('user_id', userId)
        .eq('section_id', sectionId);
    return { error: error ? new Error(error.message) : null };
}

// ===== PAYMENTS (finance) =====
export async function adminGetAllPayments(supabase: SupabaseClient, signal?: AbortSignal): Promise<PaymentRow[]> {
    const { data, error } = await supabase
        .from('payments')
        .select(`*, course_sections(name, courses(name))`)
        .order('created_at', { ascending: false })
        .abortSignal(signal!);

    if (error) {
        throwIfAborted(error, signal);
        console.error(error);
        return [];
    }
    return (data || []).map(row => ({
        ...row,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        section_name: (row as any).course_sections?.name,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        course_name: (row as any).course_sections?.courses?.name,
    }));
}

export async function createPaymentRecord(supabase: SupabaseClient, payment: {
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

export async function updatePaymentStatus(supabase: SupabaseClient, paymentId: string, status: 'paid' | 'failed' | 'refunded', sectionId?: string, userId?: string): Promise<{ error: Error | null }> {
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
export async function adminGetCoupons(supabase: SupabaseClient, signal?: AbortSignal): Promise<CouponRow[]> {
    const { data, error } = await supabase.from('coupons').select('*').order('created_at', { ascending: false }).abortSignal(signal!);
    if (error) {
        throwIfAborted(error, signal);
        console.error(error);
        return [];
    }
    return data || [];
}

export async function adminSaveCoupon(supabase: SupabaseClient, coupon: Omit<CouponRow, 'id' | 'uses_count'>): Promise<{ error: Error | null }> {
    const { error } = await supabase.from('coupons').insert({ ...coupon, uses_count: 0 });
    return { error: error ? new Error(error.message) : null };
}

export async function adminToggleCoupon(supabase: SupabaseClient, couponId: string, isActive: boolean): Promise<{ error: Error | null }> {
    const { error } = await supabase.from('coupons').update({ is_active: isActive }).eq('id', couponId);
    return { error: error ? new Error(error.message) : null };
}

export async function validateCoupon(supabase: SupabaseClient, code: string, price: number, signal?: AbortSignal): Promise<{ valid: boolean; discount: number; coupon: CouponRow | null; message: string }> {
    const { data, error } = await supabase
        .from('coupons')
        .select('*')
        .eq('code', code.toUpperCase())
        .eq('is_active', true)
        .abortSignal(signal!)
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

export async function adminGetPlatformStats(supabase: SupabaseClient, signal?: AbortSignal): Promise<PlatformStats> {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();

    const [profilesRes, testsRes, recentUsersRes, progressRes] = await Promise.all([
        supabase.from('profiles').select('id', { count: 'exact', head: true }).abortSignal(signal!),
        supabase.from('test_results').select('score, max_score, correct, total_questions').abortSignal(signal!),
        supabase.from('test_results').select('user_id').gte('created_at', sevenDaysAgo).abortSignal(signal!),
        supabase.from('user_topic_progress').select('id', { count: 'exact', head: true }).eq('completed', true).abortSignal(signal!),
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

export async function adminGetSubjectPerformance(supabase: SupabaseClient, signal?: AbortSignal): Promise<SubjectPerformance[]> {
    const { data } = await supabase
        .from('test_results')
        .select('subjects, score, max_score, correct, total_questions')
        .abortSignal(signal!);

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

export async function adminGetQuestionAnalytics(supabase: SupabaseClient, limit = 30, sortBy: 'hardest' | 'easiest' | 'mostAttempted' = 'hardest', signal?: AbortSignal): Promise<QuestionAnalytics[]> {
    // Get all test answers with question info
    const { data } = await supabase
        .from('test_answers')
        .select('question_id, is_correct, questions!inner(id, subject, topic, difficulty, stem)')
        .abortSignal(signal!);

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

export async function adminGetStudentRoster(supabase: SupabaseClient, signal?: AbortSignal): Promise<StudentSummary[]> {
    const [{ data: profiles }, { data: tests }] = await Promise.all([
        supabase
            .from('profiles')
            .select('id, email, first_name, last_name, study_streak')
            .order('created_at', { ascending: false })
            .abortSignal(signal!),
        supabase
            .from('test_results')
            .select('user_id, score, max_score, correct, total_questions, created_at')
            .order('created_at', { ascending: false })
            .abortSignal(signal!),
    ]);

    if (!profiles || profiles.length === 0) return [];

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

export async function getStudentPayments(supabase: SupabaseClient, userId: string, signal?: AbortSignal): Promise<StudentPaymentRow[]> {
    const { data, error } = await supabase
        .from('payments')
        .select(`*, course_sections(name, course_id, courses(name))`)
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .abortSignal(signal!);

    if (error) {
        throwIfAborted(error, signal);
        console.error('Error fetching student payments:', error);
        return [];
    }

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
    super_admin: ['courses', 'questions', 'sections', 'students', 'finance', 'analytics', 'team', 'notifications', 'support'],
    content_manager: ['courses', 'questions', 'sections'],
    finance_manager: ['finance', 'students'],
    analyst: ['analytics'],
    support: ['students', 'finance', 'support'],
};

export interface TeamMember {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
    admin_role: AdminRole;
    created_at: string;
}

export async function adminGetTeamMembers(supabase: SupabaseClient, signal?: AbortSignal): Promise<TeamMember[]> {
    const { data, error } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name, admin_role, created_at')
        .not('admin_role', 'is', null)
        .order('created_at')
        .abortSignal(signal!);

    if (error) {
        throwIfAborted(error, signal);
        console.error('Error fetching team:', error);
        return [];
    }
    return (data || []) as TeamMember[];
}

export async function adminSetUserRole(supabase: SupabaseClient, userId: string, role: AdminRole): Promise<{ error: Error | null }> {
    const { error } = await supabase
        .from('profiles')
        .update({ admin_role: role, is_admin: true })
        .eq('id', userId);
    return { error: error ? new Error(error.message) : null };
}

export async function adminRemoveUserRole(supabase: SupabaseClient, userId: string): Promise<{ error: Error | null }> {
    const { error } = await supabase
        .from('profiles')
        .update({ admin_role: null, is_admin: false })
        .eq('id', userId);
    return { error: error ? new Error(error.message) : null };
}

export async function adminFindUserByEmail(supabase: SupabaseClient, email: string, signal?: AbortSignal): Promise<{ id: string; email: string; first_name: string | null; last_name: string | null } | null> {
    const { data, error } = await supabase
        .from('profiles')
        .select('id, email, first_name, last_name')
        .ilike('email', email.trim())
        .abortSignal(signal!)
        .single();

    if (error || !data) return null;
    return data;
}

// ===== SUPPORT MESSAGES =====
export interface SupportMessageRow {
    id: string;
    user_id: string | null;
    first_name: string | null;
    last_name: string | null;
    email: string;
    subject: string;
    message: string;
    status: 'open' | 'resolved';
    created_at: string;
    resolved_at: string | null;
}

// Submit a contact-support message. Works for logged-out visitors too (the
// RLS insert policy allows anyone); user_id is attached when available.
export async function submitSupportMessage(
    supabase: SupabaseClient,
    payload: {
        user_id?: string | null;
        first_name?: string | null;
        last_name?: string | null;
        email: string;
        subject: string;
        message: string;
    }
): Promise<{ error: Error | null }> {
    const { error } = await supabase.from('support_messages').insert({
        user_id: payload.user_id ?? null,
        first_name: payload.first_name ?? null,
        last_name: payload.last_name ?? null,
        email: payload.email,
        subject: payload.subject,
        message: payload.message,
    });
    return { error: error ? new Error(error.message) : null };
}

export async function adminGetSupportMessages(supabase: SupabaseClient, signal?: AbortSignal): Promise<SupportMessageRow[]> {
    const { data, error } = await supabase
        .from('support_messages')
        .select('*')
        .order('created_at', { ascending: false })
        .abortSignal(signal!);

    if (error) {
        throwIfAborted(error, signal);
        console.error('Error fetching support messages:', error);
        return [];
    }
    return (data || []) as SupportMessageRow[];
}

export async function adminUpdateSupportMessageStatus(
    supabase: SupabaseClient,
    id: string,
    status: 'open' | 'resolved'
): Promise<{ error: Error | null }> {
    const { error } = await supabase
        .from('support_messages')
        .update({ status, resolved_at: status === 'resolved' ? new Date().toISOString() : null })
        .eq('id', id);
    return { error: error ? new Error(error.message) : null };
}

// ===== NOTIFICATIONS =====
export async function getNotifications(supabase: SupabaseClient, userId: string, signal?: AbortSignal): Promise<NotificationRow[]> {
    const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(20)
        .abortSignal(signal!);

    if (error) {
        throwIfAborted(error, signal);
        console.error('Error fetching notifications:', error);
        return [];
    }
    return data || [];
}

export async function markNotificationAsRead(supabase: SupabaseClient, notificationId: string): Promise<{ error: Error | null }> {
    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('id', notificationId);
    return { error: error ? new Error(error.message) : null };
}

export async function markAllNotificationsAsRead(supabase: SupabaseClient, userId: string): Promise<{ error: Error | null }> {
    const { error } = await supabase
        .from('notifications')
        .update({ is_read: true })
        .eq('user_id', userId)
        .eq('is_read', false);
    return { error: error ? new Error(error.message) : null };
}

// ===== NOTIFICATIONS (ADMIN) =====
export async function adminSendNotification(
    supabase: SupabaseClient,
    payload: { title: string; message: string; type: string; link: string; targetUserId: string }
): Promise<{ error: Error | null; recipientCount?: number }> {
    try {
        if (payload.targetUserId === 'all') {
            // Fetch all user IDs to broadcast.
            // REQUIRES: "Admins can view all profiles" RLS policy to be applied
            // (run fix-admin-rls.sql in Supabase SQL Editor if this returns only 1 user).
            const { data: users, error: fetchError } = await supabase
                .from('profiles')
                .select('id');

            if (fetchError) return { error: new Error(fetchError.message) };
            if (!users || users.length === 0) return { error: null, recipientCount: 0 };

            const notificationRows = users.map(u => ({
                user_id: u.id,
                title: payload.title,
                message: payload.message,
                type: payload.type,
                link: payload.link || null,
            }));

            // Batch in groups of 500 to stay well within Supabase's request size limits
            const BATCH_SIZE = 500;
            for (let i = 0; i < notificationRows.length; i += BATCH_SIZE) {
                const batch = notificationRows.slice(i, i + BATCH_SIZE);
                const { error } = await supabase.from('notifications').insert(batch);
                if (error) return { error: new Error(error.message) };
            }

            return { error: null, recipientCount: users.length };
        } else {
            // Send to a single user
            const { error } = await supabase.from('notifications').insert({
                user_id: payload.targetUserId,
                title: payload.title,
                message: payload.message,
                type: payload.type,
                link: payload.link || null,
            });
            return { error: error ? new Error(error.message) : null, recipientCount: error ? 0 : 1 };
        }
    } catch (e: any) {
        return { error: new Error(e.message) };
    }
}
