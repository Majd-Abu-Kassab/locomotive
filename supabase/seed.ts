import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';
import { resolve } from 'path';

// Load .env.local since this runs outside of Next.js
config({ path: resolve(process.cwd(), '.env.local') });

// Use the same env vars - run with: npx tsx supabase/seed.ts
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

// For seeding, we need service_role key to bypass RLS
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY is missing from .env.local');
    console.error('   Go to Supabase Dashboard → Settings → API → copy the service_role key');
    console.error('   Then add this line to .env.local:');
    console.error('   SUPABASE_SERVICE_ROLE_KEY=your-key-here');
    process.exit(1);
}

console.log('🔑 Using service_role key:', serviceRoleKey.substring(0, 20) + '...');
const supabase = createClient(supabaseUrl, serviceRoleKey);

// ===== COURSE DATA =====
const courses = [
    { id: 'biology', name: 'Biology', icon: '🧬', color: '#10b981', description: 'Cell biology, genetics, anatomy, physiology, and ecology', total_lessons: 45, total_questions: 320, sort_order: 0 },
    { id: 'chemistry', name: 'Chemistry', icon: '⚗️', color: '#f59e0b', description: 'General, organic, and biochemistry fundamentals', total_lessons: 40, total_questions: 280, sort_order: 1 },
    { id: 'physics', name: 'Physics', icon: '⚡', color: '#8b5cf6', description: 'Mechanics, thermodynamics, electromagnetism, and optics', total_lessons: 38, total_questions: 260, sort_order: 2 },
    { id: 'mathematics', name: 'Mathematics', icon: '📐', color: '#ec4899', description: 'Algebra, calculus, trigonometry, and probability', total_lessons: 35, total_questions: 240, sort_order: 3 },
    { id: 'logic', name: 'Logic & Problem Solving', icon: '🧩', color: '#06b6d4', description: 'Critical thinking, logical reasoning, and problem solving', total_lessons: 30, total_questions: 200, sort_order: 4 },
    { id: 'general-knowledge', name: 'General Knowledge', icon: '🌍', color: '#f97316', description: 'History of medicine, scientific literacy, and current affairs', total_lessons: 28, total_questions: 180, sort_order: 5 },
    { id: 'reading-comprehension', name: 'Reading Comprehension', icon: '📖', color: '#a855f7', description: 'Text analysis, inference skills, and scientific passage reading', total_lessons: 25, total_questions: 160, sort_order: 6 },
];

const modules = [
    // Biology
    { id: 'bio-cell', course_id: 'biology', name: 'Cell Biology', sort_order: 0 },
    { id: 'bio-genetics', course_id: 'biology', name: 'Genetics', sort_order: 1 },
    { id: 'bio-anatomy', course_id: 'biology', name: 'Human Anatomy & Physiology', sort_order: 2 },
    // Chemistry
    { id: 'chem-general', course_id: 'chemistry', name: 'General Chemistry', sort_order: 0 },
    { id: 'chem-organic', course_id: 'chemistry', name: 'Organic Chemistry', sort_order: 1 },
    // Physics
    { id: 'phys-mechanics', course_id: 'physics', name: 'Mechanics', sort_order: 0 },
    { id: 'phys-thermo', course_id: 'physics', name: 'Thermodynamics', sort_order: 1 },
    // Mathematics
    { id: 'math-algebra', course_id: 'mathematics', name: 'Algebra', sort_order: 0 },
    { id: 'math-calc', course_id: 'mathematics', name: 'Calculus', sort_order: 1 },
    // Logic
    { id: 'logic-critical', course_id: 'logic', name: 'Critical Thinking', sort_order: 0 },
    { id: 'logic-problem', course_id: 'logic', name: 'Problem Solving', sort_order: 1 },
    // GK
    { id: 'gk-history', course_id: 'general-knowledge', name: 'History of Medicine', sort_order: 0 },
    { id: 'gk-science', course_id: 'general-knowledge', name: 'Scientific Literacy', sort_order: 1 },
    // Reading
    { id: 'rc-scientific', course_id: 'reading-comprehension', name: 'Scientific Passages', sort_order: 0 },
    { id: 'rc-analysis', course_id: 'reading-comprehension', name: 'Text Analysis', sort_order: 1 },
];

const topics = [
    // Biology - Cell Biology
    { id: 'bio-cell-1', module_id: 'bio-cell', name: 'Cell Structure & Organelles', question_count: 25, lesson_type: 'video', sort_order: 0 },
    { id: 'bio-cell-2', module_id: 'bio-cell', name: 'Cell Membrane & Transport', question_count: 20, lesson_type: 'video', sort_order: 1 },
    { id: 'bio-cell-3', module_id: 'bio-cell', name: 'Cell Division (Mitosis & Meiosis)', question_count: 30, lesson_type: 'quiz', sort_order: 2 },
    { id: 'bio-cell-4', module_id: 'bio-cell', name: 'Cell Signaling', question_count: 15, lesson_type: 'pdf', sort_order: 3 },
    // Biology - Genetics
    { id: 'bio-gen-1', module_id: 'bio-genetics', name: 'DNA Replication', question_count: 22, lesson_type: 'video', sort_order: 0 },
    { id: 'bio-gen-2', module_id: 'bio-genetics', name: 'Transcription & Translation', question_count: 28, lesson_type: 'video', sort_order: 1 },
    { id: 'bio-gen-3', module_id: 'bio-genetics', name: 'Mendelian Genetics', question_count: 35, lesson_type: 'quiz', sort_order: 2 },
    { id: 'bio-gen-4', module_id: 'bio-genetics', name: 'Gene Expression & Regulation', question_count: 18, lesson_type: 'pdf', sort_order: 3 },
    // Biology - Anatomy
    { id: 'bio-anat-1', module_id: 'bio-anatomy', name: 'Cardiovascular System', question_count: 30, lesson_type: 'video', sort_order: 0 },
    { id: 'bio-anat-2', module_id: 'bio-anatomy', name: 'Respiratory System', question_count: 22, lesson_type: 'video', sort_order: 1 },
    { id: 'bio-anat-3', module_id: 'bio-anatomy', name: 'Nervous System', question_count: 28, lesson_type: 'quiz', sort_order: 2 },
    // Chemistry - General
    { id: 'chem-gen-1', module_id: 'chem-general', name: 'Atomic Structure', question_count: 20, lesson_type: 'video', sort_order: 0 },
    { id: 'chem-gen-2', module_id: 'chem-general', name: 'Chemical Bonding', question_count: 25, lesson_type: 'video', sort_order: 1 },
    { id: 'chem-gen-3', module_id: 'chem-general', name: 'Stoichiometry', question_count: 30, lesson_type: 'quiz', sort_order: 2 },
    { id: 'chem-gen-4', module_id: 'chem-general', name: 'Thermodynamics', question_count: 22, lesson_type: 'pdf', sort_order: 3 },
    // Chemistry - Organic
    { id: 'chem-org-1', module_id: 'chem-organic', name: 'Hydrocarbons', question_count: 18, lesson_type: 'video', sort_order: 0 },
    { id: 'chem-org-2', module_id: 'chem-organic', name: 'Functional Groups', question_count: 25, lesson_type: 'video', sort_order: 1 },
    { id: 'chem-org-3', module_id: 'chem-organic', name: 'Reaction Mechanisms', question_count: 30, lesson_type: 'quiz', sort_order: 2 },
    // Physics - Mechanics
    { id: 'phys-mech-1', module_id: 'phys-mechanics', name: 'Kinematics', question_count: 22, lesson_type: 'video', sort_order: 0 },
    { id: 'phys-mech-2', module_id: 'phys-mechanics', name: "Newton's Laws", question_count: 25, lesson_type: 'video', sort_order: 1 },
    { id: 'phys-mech-3', module_id: 'phys-mechanics', name: 'Work & Energy', question_count: 20, lesson_type: 'quiz', sort_order: 2 },
    { id: 'phys-mech-4', module_id: 'phys-mechanics', name: 'Momentum', question_count: 18, lesson_type: 'pdf', sort_order: 3 },
    // Physics - Thermodynamics
    { id: 'phys-therm-1', module_id: 'phys-thermo', name: 'Heat & Temperature', question_count: 20, lesson_type: 'video', sort_order: 0 },
    { id: 'phys-therm-2', module_id: 'phys-thermo', name: 'Laws of Thermodynamics', question_count: 25, lesson_type: 'video', sort_order: 1 },
    // Math - Algebra
    { id: 'math-alg-1', module_id: 'math-algebra', name: 'Equations & Inequalities', question_count: 22, lesson_type: 'video', sort_order: 0 },
    { id: 'math-alg-2', module_id: 'math-algebra', name: 'Functions & Graphs', question_count: 20, lesson_type: 'video', sort_order: 1 },
    { id: 'math-alg-3', module_id: 'math-algebra', name: 'Polynomials', question_count: 18, lesson_type: 'quiz', sort_order: 2 },
    // Math - Calculus
    { id: 'math-calc-1', module_id: 'math-calc', name: 'Limits & Continuity', question_count: 20, lesson_type: 'video', sort_order: 0 },
    { id: 'math-calc-2', module_id: 'math-calc', name: 'Derivatives', question_count: 25, lesson_type: 'video', sort_order: 1 },
    { id: 'math-calc-3', module_id: 'math-calc', name: 'Integrals', question_count: 28, lesson_type: 'quiz', sort_order: 2 },
    // Logic - Critical Thinking
    { id: 'log-crit-1', module_id: 'logic-critical', name: 'Argument Analysis', question_count: 25, lesson_type: 'video', sort_order: 0 },
    { id: 'log-crit-2', module_id: 'logic-critical', name: 'Logical Fallacies', question_count: 20, lesson_type: 'video', sort_order: 1 },
    { id: 'log-crit-3', module_id: 'logic-critical', name: 'Deductive Reasoning', question_count: 22, lesson_type: 'quiz', sort_order: 2 },
    // Logic - Problem Solving
    { id: 'log-prob-1', module_id: 'logic-problem', name: 'Pattern Recognition', question_count: 20, lesson_type: 'video', sort_order: 0 },
    { id: 'log-prob-2', module_id: 'logic-problem', name: 'Numerical Reasoning', question_count: 25, lesson_type: 'quiz', sort_order: 1 },
    // GK - History
    { id: 'gk-hist-1', module_id: 'gk-history', name: 'Major Medical Discoveries', question_count: 20, lesson_type: 'video', sort_order: 0 },
    { id: 'gk-hist-2', module_id: 'gk-history', name: 'Nobel Prize Winners in Medicine', question_count: 15, lesson_type: 'pdf', sort_order: 1 },
    // GK - Science
    { id: 'gk-sci-1', module_id: 'gk-science', name: 'Scientific Method', question_count: 18, lesson_type: 'video', sort_order: 0 },
    { id: 'gk-sci-2', module_id: 'gk-science', name: 'Ethics in Medicine', question_count: 22, lesson_type: 'video', sort_order: 1 },
    // Reading - Scientific
    { id: 'rc-sci-1', module_id: 'rc-scientific', name: 'Biology Passages', question_count: 20, lesson_type: 'quiz', sort_order: 0 },
    { id: 'rc-sci-2', module_id: 'rc-scientific', name: 'Chemistry Passages', question_count: 18, lesson_type: 'quiz', sort_order: 1 },
    { id: 'rc-sci-3', module_id: 'rc-scientific', name: 'Physics Passages', question_count: 15, lesson_type: 'quiz', sort_order: 2 },
    // Reading - Analysis
    { id: 'rc-ana-1', module_id: 'rc-analysis', name: 'Main Idea Identification', question_count: 22, lesson_type: 'video', sort_order: 0 },
    { id: 'rc-ana-2', module_id: 'rc-analysis', name: 'Inference & Deduction', question_count: 25, lesson_type: 'quiz', sort_order: 1 },
];

const questions = [
    {
        id: 'q1', subject: 'Biology', topic: 'Genetics', difficulty: 'medium',
        stem: 'Which of the following is the primary function of DNA helicase during DNA replication?',
        options: ['A) To synthesize new DNA strands', 'B) To unwind and separate the double helix', 'C) To join Okazaki fragments', 'D) To add RNA primers', 'E) To proofread newly synthesized DNA'],
        correct_answer: 1,
        explanation: 'DNA helicase unwinds the double helix by breaking hydrogen bonds between base pairs, creating replication forks where new strands can be synthesized.',
        source: 'official-imat', year: 2023,
    },
    {
        id: 'q2', subject: 'Chemistry', topic: 'Organic Chemistry', difficulty: 'hard',
        stem: 'What is the IUPAC name for the compound CH₃CH₂CH(OH)CH₃?',
        options: ['A) 1-Butanol', 'B) 2-Butanol', 'C) 2-Methylpropanol', 'D) Diethyl ether', 'E) Butanone'],
        correct_answer: 1,
        explanation: 'The hydroxyl group (-OH) is attached to the second carbon of a four-carbon chain, making it 2-butanol (butan-2-ol).',
        source: 'official-imat', year: 2022,
    },
    {
        id: 'q3', subject: 'Physics', topic: 'Mechanics', difficulty: 'easy',
        stem: 'A ball is thrown vertically upward with an initial velocity of 20 m/s. Ignoring air resistance (g = 10 m/s²), what is the maximum height reached?',
        options: ['A) 10 m', 'B) 20 m', 'C) 30 m', 'D) 40 m', 'E) 50 m'],
        correct_answer: 1,
        explanation: 'Using v² = u² - 2gh, at max height v=0: 0 = 400 - 20h, so h = 20m.',
        source: 'locomotive-original', year: null,
    },
    {
        id: 'q4', subject: 'Logic', topic: 'Critical Thinking', difficulty: 'medium',
        stem: 'If all doctors are scientists, and some scientists are musicians, which of the following must be true?',
        options: ['A) All doctors are musicians', 'B) Some doctors are musicians', 'C) No doctors are musicians', 'D) Some scientists are doctors', 'E) All musicians are scientists'],
        correct_answer: 3,
        explanation: 'Since all doctors are scientists, the set of doctors is a subset of scientists. Therefore, some scientists are indeed doctors.',
        source: 'italian-medical', year: null,
    },
    {
        id: 'q5', subject: 'Mathematics', topic: 'Calculus', difficulty: 'medium',
        stem: 'What is the derivative of f(x) = 3x² + 2x - 5?',
        options: ['A) 6x + 2', 'B) 6x - 2', 'C) 3x + 2', 'D) 6x² + 2', 'E) 6x'],
        correct_answer: 0,
        explanation: "Using the power rule: d/dx(3x²) = 6x, d/dx(2x) = 2, d/dx(-5) = 0. So f'(x) = 6x + 2.",
        source: 'locomotive-original', year: null,
    },
    {
        id: 'q6', subject: 'General Knowledge', topic: 'History of Medicine', difficulty: 'easy',
        stem: 'Who is credited with the discovery of penicillin?',
        options: ['A) Louis Pasteur', 'B) Robert Koch', 'C) Alexander Fleming', 'D) Edward Jenner', 'E) Joseph Lister'],
        correct_answer: 2,
        explanation: 'Alexander Fleming discovered penicillin in 1928 when he noticed that mold (Penicillium notatum) inhibited bacterial growth on a culture plate.',
        source: 'official-imat', year: 2021,
    },
    {
        id: 'q7', subject: 'Biology', topic: 'Cell Biology', difficulty: 'medium',
        stem: 'Which organelle is responsible for producing ATP through oxidative phosphorylation?',
        options: ['A) Nucleus', 'B) Golgi apparatus', 'C) Endoplasmic reticulum', 'D) Mitochondria', 'E) Lysosome'],
        correct_answer: 3,
        explanation: 'Mitochondria are the powerhouses of the cell, producing ATP through oxidative phosphorylation in the inner mitochondrial membrane.',
        source: 'locomotive-original', year: null,
    },
    {
        id: 'q8', subject: 'Chemistry', topic: 'General Chemistry', difficulty: 'easy',
        stem: 'What is the pH of a neutral solution at 25°C?',
        options: ['A) 0', 'B) 5', 'C) 7', 'D) 10', 'E) 14'],
        correct_answer: 2,
        explanation: 'At 25°C, a neutral solution has equal concentrations of H⁺ and OH⁻ ions, with a pH of 7.',
        source: 'italian-medical', year: null,
    },
    {
        id: 'q9', subject: 'Biology', topic: 'Genetics', difficulty: 'hard',
        stem: 'In a dihybrid cross between two AaBb individuals, what fraction of the offspring would be expected to show both dominant phenotypes?',
        options: ['A) 1/16', 'B) 3/16', 'C) 9/16', 'D) 3/4', 'E) 1/4'],
        correct_answer: 2,
        explanation: 'In a dihybrid cross (AaBb × AaBb), 9/16 of the offspring show both dominant phenotypes (A_B_), following the 9:3:3:1 ratio.',
        source: 'official-imat', year: 2024,
    },
    {
        id: 'q10', subject: 'Physics', topic: 'Mechanics', difficulty: 'medium',
        stem: 'Two forces of 3N and 4N act on an object at right angles to each other. What is the resultant force?',
        options: ['A) 1 N', 'B) 5 N', 'C) 7 N', 'D) 12 N', 'E) 25 N'],
        correct_answer: 1,
        explanation: 'Using the Pythagorean theorem: R = √(3² + 4²) = √(9 + 16) = √25 = 5N.',
        source: 'locomotive-original', year: null,
    },
];

async function seed() {
    console.log('🌱 Seeding LOCOMOTIVE database...\n');

    // 1. Courses
    console.log('📚 Inserting courses...');
    const { error: coursesError } = await supabase.from('courses').upsert(courses, { onConflict: 'id' });
    if (coursesError) { console.error('  ❌ Courses error:', coursesError.message); return; }
    console.log(`  ✅ ${courses.length} courses`);

    // 2. Modules
    console.log('📦 Inserting modules...');
    const { error: modulesError } = await supabase.from('modules').upsert(modules, { onConflict: 'id' });
    if (modulesError) { console.error('  ❌ Modules error:', modulesError.message); return; }
    console.log(`  ✅ ${modules.length} modules`);

    // 3. Topics
    console.log('📝 Inserting topics...');
    const { error: topicsError } = await supabase.from('topics').upsert(topics, { onConflict: 'id' });
    if (topicsError) { console.error('  ❌ Topics error:', topicsError.message); return; }
    console.log(`  ✅ ${topics.length} topics`);

    // 4. Questions
    console.log('❓ Inserting questions...');
    const questionsForDb = questions.map(q => ({
        ...q,
        options: JSON.stringify(q.options),
    }));
    const { error: questionsError } = await supabase.from('questions').upsert(questionsForDb, { onConflict: 'id' });
    if (questionsError) { console.error('  ❌ Questions error:', questionsError.message); return; }
    console.log(`  ✅ ${questions.length} questions`);

    console.log('\n🎉 Seeding complete!');
}

seed().catch(console.error);
