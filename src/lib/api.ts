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
