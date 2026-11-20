import type { PickerCourse, QuestionPick } from '@/lib/api';

// What can be picked in Create Test: each topic ("t:<id>"), and each course's
// questions that have no topic ("u:<course name>"). Ticking a course or a
// subject ticks all of its topics.

export const topicKey = (id: string) => `t:${id}`;
export const untaggedKey = (course: string) => `u:${course}`;
export const subjectKeys = (s: PickerCourse['subjects'][number]) => s.topics.map(t => topicKey(t.id));
export const courseKeys = (c: PickerCourse) => [
    ...c.subjects.flatMap(subjectKeys),
    ...(c.untagged !== 0 ? [untaggedKey(c.name)] : []),
];

/** The question filter for what's ticked; null = nothing ticked = every topic. */
export function pickFrom(tree: PickerCourse[], selected: Set<string>): QuestionPick | null {
    if (selected.size === 0) return null;
    const pick: QuestionPick = { courses: [], topicIds: [], untaggedCourses: [] };
    for (const c of tree) {
        const keys = courseKeys(c);
        if (keys.every(k => selected.has(k))) { pick.courses.push(c.name); continue; }
        for (const s of c.subjects) for (const t of s.topics) if (selected.has(topicKey(t.id))) pick.topicIds.push(t.id);
        if (selected.has(untaggedKey(c.name))) pick.untaggedCourses.push(c.name);
    }
    return pick;
}

/** "Mathematics, Kinematics +2 more": whole courses and subjects by their own name. */
export function pickLabel(tree: PickerCourse[], selected: Set<string>): string {
    if (selected.size === 0) return 'All Topics';
    const parts: string[] = [];
    for (const c of tree) {
        if (courseKeys(c).every(k => selected.has(k))) { parts.push(c.name); continue; }
        for (const s of c.subjects) {
            if (subjectKeys(s).every(k => selected.has(k))) parts.push(s.name);
            else parts.push(...s.topics.filter(t => selected.has(topicKey(t.id))).map(t => t.name));
        }
        if (selected.has(untaggedKey(c.name))) parts.push(`${c.name} (other)`);
    }
    return parts.length > 3 ? `${parts.slice(0, 3).join(', ')} +${parts.length - 3} more` : parts.join(', ');
}
