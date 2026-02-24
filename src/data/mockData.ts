// ===== USER DATA =====
export const currentUser = {
    id: 'user-1',
    name: 'Alex Rivera',
    email: 'alex.rivera@example.com',
    avatar: null,
    plan: 'free-trial' as const,
    trialDaysRemaining: 3,
    joinedDate: '2026-01-15',
    studyStreak: 12,
    totalStudyHours: 47,
    estimatedScore: 42.5,
    modulesCompleted: 18,
    totalModules: 72,
};

// ===== COURSES =====
export interface Course {
    id: string;
    name: string;
    icon: string;
    color: string;
    description: string;
    totalLessons: number;
    completedLessons: number;
    totalQuestions: number;
    modules: Module[];
}

export interface Module {
    id: string;
    name: string;
    topics: Topic[];
}

export interface Topic {
    id: string;
    name: string;
    questionCount: number;
    completed: boolean;
    lessonType: 'video' | 'pdf' | 'quiz';
}

export const courses: Course[] = [
    {
        id: 'biology',
        name: 'Biology',
        icon: '🧬',
        color: '#10b981',
        description: 'Cell biology, genetics, anatomy, physiology, and ecology',
        totalLessons: 45,
        completedLessons: 18,
        totalQuestions: 320,
        modules: [
            {
                id: 'bio-cell',
                name: 'Cell Biology',
                topics: [
                    { id: 'bio-cell-1', name: 'Cell Structure & Organelles', questionCount: 25, completed: true, lessonType: 'video' },
                    { id: 'bio-cell-2', name: 'Cell Membrane & Transport', questionCount: 20, completed: true, lessonType: 'video' },
                    { id: 'bio-cell-3', name: 'Cell Division (Mitosis & Meiosis)', questionCount: 30, completed: true, lessonType: 'quiz' },
                    { id: 'bio-cell-4', name: 'Cell Signaling', questionCount: 15, completed: false, lessonType: 'pdf' },
                ],
            },
            {
                id: 'bio-genetics',
                name: 'Genetics',
                topics: [
                    { id: 'bio-gen-1', name: 'DNA Replication', questionCount: 22, completed: true, lessonType: 'video' },
                    { id: 'bio-gen-2', name: 'Transcription & Translation', questionCount: 28, completed: false, lessonType: 'video' },
                    { id: 'bio-gen-3', name: 'Mendelian Genetics', questionCount: 35, completed: false, lessonType: 'quiz' },
                    { id: 'bio-gen-4', name: 'Gene Expression & Regulation', questionCount: 18, completed: false, lessonType: 'pdf' },
                ],
            },
            {
                id: 'bio-anatomy',
                name: 'Human Anatomy & Physiology',
                topics: [
                    { id: 'bio-anat-1', name: 'Cardiovascular System', questionCount: 30, completed: false, lessonType: 'video' },
                    { id: 'bio-anat-2', name: 'Respiratory System', questionCount: 22, completed: false, lessonType: 'video' },
                    { id: 'bio-anat-3', name: 'Nervous System', questionCount: 28, completed: false, lessonType: 'quiz' },
                ],
            },
        ],
    },
    {
        id: 'chemistry',
        name: 'Chemistry',
        icon: '⚗️',
        color: '#f59e0b',
        description: 'General, organic, and biochemistry fundamentals',
        totalLessons: 40,
        completedLessons: 12,
        totalQuestions: 280,
        modules: [
            {
                id: 'chem-general',
                name: 'General Chemistry',
                topics: [
                    { id: 'chem-gen-1', name: 'Atomic Structure', questionCount: 20, completed: true, lessonType: 'video' },
                    { id: 'chem-gen-2', name: 'Chemical Bonding', questionCount: 25, completed: true, lessonType: 'video' },
                    { id: 'chem-gen-3', name: 'Stoichiometry', questionCount: 30, completed: false, lessonType: 'quiz' },
                    { id: 'chem-gen-4', name: 'Thermodynamics', questionCount: 22, completed: false, lessonType: 'pdf' },
                ],
            },
            {
                id: 'chem-organic',
                name: 'Organic Chemistry',
                topics: [
                    { id: 'chem-org-1', name: 'Hydrocarbons', questionCount: 18, completed: true, lessonType: 'video' },
                    { id: 'chem-org-2', name: 'Functional Groups', questionCount: 25, completed: false, lessonType: 'video' },
                    { id: 'chem-org-3', name: 'Reaction Mechanisms', questionCount: 30, completed: false, lessonType: 'quiz' },
                ],
            },
        ],
    },
    {
        id: 'physics',
        name: 'Physics',
        icon: '⚡',
        color: '#8b5cf6',
        description: 'Mechanics, thermodynamics, electromagnetism, and optics',
        totalLessons: 38,
        completedLessons: 8,
        totalQuestions: 260,
        modules: [
            {
                id: 'phys-mechanics',
                name: 'Mechanics',
                topics: [
                    { id: 'phys-mech-1', name: 'Kinematics', questionCount: 22, completed: true, lessonType: 'video' },
                    { id: 'phys-mech-2', name: 'Newton\'s Laws', questionCount: 25, completed: true, lessonType: 'video' },
                    { id: 'phys-mech-3', name: 'Work & Energy', questionCount: 20, completed: false, lessonType: 'quiz' },
                    { id: 'phys-mech-4', name: 'Momentum', questionCount: 18, completed: false, lessonType: 'pdf' },
                ],
            },
            {
                id: 'phys-thermo',
                name: 'Thermodynamics',
                topics: [
                    { id: 'phys-therm-1', name: 'Heat & Temperature', questionCount: 20, completed: false, lessonType: 'video' },
                    { id: 'phys-therm-2', name: 'Laws of Thermodynamics', questionCount: 25, completed: false, lessonType: 'video' },
                ],
            },
        ],
    },
    {
        id: 'mathematics',
        name: 'Mathematics',
        icon: '📐',
        color: '#ec4899',
        description: 'Algebra, calculus, trigonometry, and probability',
        totalLessons: 35,
        completedLessons: 15,
        totalQuestions: 240,
        modules: [
            {
                id: 'math-algebra',
                name: 'Algebra',
                topics: [
                    { id: 'math-alg-1', name: 'Equations & Inequalities', questionCount: 22, completed: true, lessonType: 'video' },
                    { id: 'math-alg-2', name: 'Functions & Graphs', questionCount: 20, completed: true, lessonType: 'video' },
                    { id: 'math-alg-3', name: 'Polynomials', questionCount: 18, completed: true, lessonType: 'quiz' },
                ],
            },
            {
                id: 'math-calc',
                name: 'Calculus',
                topics: [
                    { id: 'math-calc-1', name: 'Limits & Continuity', questionCount: 20, completed: true, lessonType: 'video' },
                    { id: 'math-calc-2', name: 'Derivatives', questionCount: 25, completed: false, lessonType: 'video' },
                    { id: 'math-calc-3', name: 'Integrals', questionCount: 28, completed: false, lessonType: 'quiz' },
                ],
            },
        ],
    },
    {
        id: 'logic',
        name: 'Logic & Problem Solving',
        icon: '🧩',
        color: '#06b6d4',
        description: 'Critical thinking, logical reasoning, and problem solving',
        totalLessons: 30,
        completedLessons: 10,
        totalQuestions: 200,
        modules: [
            {
                id: 'logic-critical',
                name: 'Critical Thinking',
                topics: [
                    { id: 'log-crit-1', name: 'Argument Analysis', questionCount: 25, completed: true, lessonType: 'video' },
                    { id: 'log-crit-2', name: 'Logical Fallacies', questionCount: 20, completed: true, lessonType: 'video' },
                    { id: 'log-crit-3', name: 'Deductive Reasoning', questionCount: 22, completed: false, lessonType: 'quiz' },
                ],
            },
            {
                id: 'logic-problem',
                name: 'Problem Solving',
                topics: [
                    { id: 'log-prob-1', name: 'Pattern Recognition', questionCount: 20, completed: true, lessonType: 'video' },
                    { id: 'log-prob-2', name: 'Numerical Reasoning', questionCount: 25, completed: false, lessonType: 'quiz' },
                ],
            },
        ],
    },
    {
        id: 'general-knowledge',
        name: 'General Knowledge',
        icon: '🌍',
        color: '#f97316',
        description: 'History of medicine, scientific literacy, and current affairs',
        totalLessons: 28,
        completedLessons: 5,
        totalQuestions: 180,
        modules: [
            {
                id: 'gk-history',
                name: 'History of Medicine',
                topics: [
                    { id: 'gk-hist-1', name: 'Major Medical Discoveries', questionCount: 20, completed: true, lessonType: 'video' },
                    { id: 'gk-hist-2', name: 'Nobel Prize Winners in Medicine', questionCount: 15, completed: false, lessonType: 'pdf' },
                ],
            },
            {
                id: 'gk-science',
                name: 'Scientific Literacy',
                topics: [
                    { id: 'gk-sci-1', name: 'Scientific Method', questionCount: 18, completed: true, lessonType: 'video' },
                    { id: 'gk-sci-2', name: 'Ethics in Medicine', questionCount: 22, completed: false, lessonType: 'video' },
                ],
            },
        ],
    },
    {
        id: 'reading-comprehension',
        name: 'Reading Comprehension',
        icon: '📖',
        color: '#a855f7',
        description: 'Text analysis, inference skills, and scientific passage reading',
        totalLessons: 25,
        completedLessons: 7,
        totalQuestions: 160,
        modules: [
            {
                id: 'rc-scientific',
                name: 'Scientific Passages',
                topics: [
                    { id: 'rc-sci-1', name: 'Biology Passages', questionCount: 20, completed: true, lessonType: 'quiz' },
                    { id: 'rc-sci-2', name: 'Chemistry Passages', questionCount: 18, completed: true, lessonType: 'quiz' },
                    { id: 'rc-sci-3', name: 'Physics Passages', questionCount: 15, completed: false, lessonType: 'quiz' },
                ],
            },
            {
                id: 'rc-analysis',
                name: 'Text Analysis',
                topics: [
                    { id: 'rc-ana-1', name: 'Main Idea Identification', questionCount: 22, completed: false, lessonType: 'video' },
                    { id: 'rc-ana-2', name: 'Inference & Deduction', questionCount: 25, completed: false, lessonType: 'quiz' },
                ],
            },
        ],
    },
];

// ===== QUESTIONS =====
export interface Question {
    id: string;
    subject: string;
    topic: string;
    difficulty: 'easy' | 'medium' | 'hard';
    stem: string;
    options: string[];
    correctAnswer: number;
    explanation: string;
    source: 'official-imat' | 'locomotive-original' | 'italian-medical';
    year?: number;
}

export const sampleQuestions: Question[] = [
    {
        id: 'q1',
        subject: 'Biology',
        topic: 'Genetics',
        difficulty: 'medium',
        stem: 'Which of the following is the primary function of DNA helicase during DNA replication?',
        options: [
            'A) To synthesize new DNA strands',
            'B) To unwind and separate the double helix',
            'C) To join Okazaki fragments',
            'D) To add RNA primers',
            'E) To proofread newly synthesized DNA',
        ],
        correctAnswer: 1,
        explanation: 'DNA helicase unwinds the double helix by breaking hydrogen bonds between base pairs, creating replication forks where new strands can be synthesized.',
        source: 'official-imat',
        year: 2023,
    },
    {
        id: 'q2',
        subject: 'Chemistry',
        topic: 'Organic Chemistry',
        difficulty: 'hard',
        stem: 'What is the IUPAC name for the compound CH₃CH₂CH(OH)CH₃?',
        options: [
            'A) 1-Butanol',
            'B) 2-Butanol',
            'C) 2-Methylpropanol',
            'D) Diethyl ether',
            'E) Butanone',
        ],
        correctAnswer: 1,
        explanation: 'The hydroxyl group (-OH) is attached to the second carbon of a four-carbon chain, making it 2-butanol (butan-2-ol).',
        source: 'official-imat',
        year: 2022,
    },
    {
        id: 'q3',
        subject: 'Physics',
        topic: 'Mechanics',
        difficulty: 'easy',
        stem: 'A ball is thrown vertically upward with an initial velocity of 20 m/s. Ignoring air resistance (g = 10 m/s²), what is the maximum height reached?',
        options: [
            'A) 10 m',
            'B) 20 m',
            'C) 30 m',
            'D) 40 m',
            'E) 50 m',
        ],
        correctAnswer: 1,
        explanation: 'Using v² = u² - 2gh, at max height v=0: 0 = 400 - 20h, so h = 20m.',
        source: 'locomotive-original',
    },
    {
        id: 'q4',
        subject: 'Logic',
        topic: 'Critical Thinking',
        difficulty: 'medium',
        stem: 'If all doctors are scientists, and some scientists are musicians, which of the following must be true?',
        options: [
            'A) All doctors are musicians',
            'B) Some doctors are musicians',
            'C) No doctors are musicians',
            'D) Some scientists are doctors',
            'E) All musicians are scientists',
        ],
        correctAnswer: 3,
        explanation: 'Since all doctors are scientists, the set of doctors is a subset of scientists. Therefore, some scientists are indeed doctors.',
        source: 'italian-medical',
    },
    {
        id: 'q5',
        subject: 'Mathematics',
        topic: 'Calculus',
        difficulty: 'medium',
        stem: 'What is the derivative of f(x) = 3x² + 2x - 5?',
        options: [
            'A) 6x + 2',
            'B) 6x - 2',
            'C) 3x + 2',
            'D) 6x² + 2',
            'E) 6x',
        ],
        correctAnswer: 0,
        explanation: 'Using the power rule: d/dx(3x²) = 6x, d/dx(2x) = 2, d/dx(-5) = 0. So f\'(x) = 6x + 2.',
        source: 'locomotive-original',
    },
    {
        id: 'q6',
        subject: 'General Knowledge',
        topic: 'History of Medicine',
        difficulty: 'easy',
        stem: 'Who is credited with the discovery of penicillin?',
        options: [
            'A) Louis Pasteur',
            'B) Robert Koch',
            'C) Alexander Fleming',
            'D) Edward Jenner',
            'E) Joseph Lister',
        ],
        correctAnswer: 2,
        explanation: 'Alexander Fleming discovered penicillin in 1928 when he noticed that mold (Penicillium notatum) inhibited bacterial growth on a culture plate.',
        source: 'official-imat',
        year: 2021,
    },
    {
        id: 'q7',
        subject: 'Biology',
        topic: 'Cell Biology',
        difficulty: 'medium',
        stem: 'Which organelle is responsible for producing ATP through oxidative phosphorylation?',
        options: [
            'A) Nucleus',
            'B) Golgi apparatus',
            'C) Endoplasmic reticulum',
            'D) Mitochondria',
            'E) Lysosome',
        ],
        correctAnswer: 3,
        explanation: 'Mitochondria are the powerhouses of the cell, producing ATP through oxidative phosphorylation in the inner mitochondrial membrane.',
        source: 'locomotive-original',
    },
    {
        id: 'q8',
        subject: 'Chemistry',
        topic: 'General Chemistry',
        difficulty: 'easy',
        stem: 'What is the pH of a neutral solution at 25°C?',
        options: [
            'A) 0',
            'B) 5',
            'C) 7',
            'D) 10',
            'E) 14',
        ],
        correctAnswer: 2,
        explanation: 'At 25°C, a neutral solution has equal concentrations of H⁺ and OH⁻ ions, with a pH of 7.',
        source: 'italian-medical',
    },
    {
        id: 'q9',
        subject: 'Biology',
        topic: 'Genetics',
        difficulty: 'hard',
        stem: 'In a dihybrid cross between two AaBb individuals, what fraction of the offspring would be expected to show both dominant phenotypes?',
        options: [
            'A) 1/16',
            'B) 3/16',
            'C) 9/16',
            'D) 3/4',
            'E) 1/4',
        ],
        correctAnswer: 2,
        explanation: 'In a dihybrid cross (AaBb × AaBb), 9/16 of the offspring show both dominant phenotypes (A_B_), following the 9:3:3:1 ratio.',
        source: 'official-imat',
        year: 2024,
    },
    {
        id: 'q10',
        subject: 'Physics',
        topic: 'Mechanics',
        difficulty: 'medium',
        stem: 'Two forces of 3N and 4N act on an object at right angles to each other. What is the resultant force?',
        options: [
            'A) 1 N',
            'B) 5 N',
            'C) 7 N',
            'D) 12 N',
            'E) 25 N',
        ],
        correctAnswer: 1,
        explanation: 'Using the Pythagorean theorem: R = √(3² + 4²) = √(9 + 16) = √25 = 5N.',
        source: 'locomotive-original',
    },
];

// ===== TEST HISTORY =====
export interface TestResult {
    id: string;
    name: string;
    date: string;
    duration: string;
    mode: 'timed' | 'untimed';
    totalQuestions: number;
    correct: number;
    incorrect: number;
    unanswered: number;
    score: number;
    maxScore: number;
    subjects: string[];
    source: string;
}

export const testHistory: TestResult[] = [
    {
        id: 'test-1',
        name: 'IMAT Full Simulation #1',
        date: '2026-02-20',
        duration: '95 min',
        mode: 'timed',
        totalQuestions: 60,
        correct: 38,
        incorrect: 12,
        unanswered: 10,
        score: 38 * 1.5 - 12 * 0.4,
        maxScore: 90,
        subjects: ['Biology', 'Chemistry', 'Physics', 'Math', 'Logic'],
        source: 'Official IMAT 2024',
    },
    {
        id: 'test-2',
        name: 'Biology Practice',
        date: '2026-02-18',
        duration: '32 min',
        mode: 'untimed',
        totalQuestions: 20,
        correct: 16,
        incorrect: 3,
        unanswered: 1,
        score: 16 * 1.5 - 3 * 0.4,
        maxScore: 30,
        subjects: ['Biology'],
        source: 'LOCOMOTIVE Original',
    },
    {
        id: 'test-3',
        name: 'Chemistry & Physics Mix',
        date: '2026-02-15',
        duration: '45 min',
        mode: 'timed',
        totalQuestions: 30,
        correct: 22,
        incorrect: 5,
        unanswered: 3,
        score: 22 * 1.5 - 5 * 0.4,
        maxScore: 45,
        subjects: ['Chemistry', 'Physics'],
        source: 'Italian Medical',
    },
    {
        id: 'test-4',
        name: 'Logic Drill',
        date: '2026-02-12',
        duration: '25 min',
        mode: 'untimed',
        totalQuestions: 15,
        correct: 13,
        incorrect: 2,
        unanswered: 0,
        score: 13 * 1.5 - 2 * 0.4,
        maxScore: 22.5,
        subjects: ['Logic'],
        source: 'LOCOMOTIVE Original',
    },
    {
        id: 'test-5',
        name: 'IMAT Full Simulation #2',
        date: '2026-02-08',
        duration: '100 min',
        mode: 'timed',
        totalQuestions: 60,
        correct: 35,
        incorrect: 15,
        unanswered: 10,
        score: 35 * 1.5 - 15 * 0.4,
        maxScore: 90,
        subjects: ['Biology', 'Chemistry', 'Physics', 'Math', 'Logic'],
        source: 'Official IMAT 2023',
    },
];

// ===== ANALYTICS DATA =====
export const performanceOverTime = [
    { date: 'Jan W1', score: 28, average: 35 },
    { date: 'Jan W2', score: 32, average: 35 },
    { date: 'Jan W3', score: 35, average: 36 },
    { date: 'Jan W4', score: 38, average: 36 },
    { date: 'Feb W1', score: 36, average: 37 },
    { date: 'Feb W2', score: 42, average: 37 },
    { date: 'Feb W3', score: 45, average: 38 },
    { date: 'Feb W4', score: 52, average: 38 },
];

export const subjectPerformance = [
    { subject: 'Biology', score: 72, questions: 120, color: '#10b981' },
    { subject: 'Chemistry', score: 65, questions: 85, color: '#f59e0b' },
    { subject: 'Physics', score: 58, questions: 70, color: '#8b5cf6' },
    { subject: 'Mathematics', score: 78, questions: 90, color: '#ec4899' },
    { subject: 'Logic', score: 82, questions: 60, color: '#06b6d4' },
    { subject: 'General Knowledge', score: 70, questions: 45, color: '#f97316' },
    { subject: 'Reading', score: 75, questions: 40, color: '#a855f7' },
];

// ===== SCHEDULE DATA =====
export const scheduleEvents = [
    { id: 'ev-1', date: '2026-02-23', title: 'Biology: Genetics', type: 'study' as const, duration: '2h' },
    { id: 'ev-2', date: '2026-02-24', title: 'Chemistry Practice Test', type: 'test' as const, duration: '1h' },
    { id: 'ev-3', date: '2026-02-25', title: 'Physics: Mechanics Review', type: 'study' as const, duration: '1.5h' },
    { id: 'ev-4', date: '2026-02-26', title: 'Day Off', type: 'dayoff' as const, duration: '' },
    { id: 'ev-5', date: '2026-02-27', title: 'Math: Calculus', type: 'study' as const, duration: '2h' },
    { id: 'ev-6', date: '2026-02-28', title: 'Full IMAT Simulation', type: 'test' as const, duration: '100m' },
    { id: 'ev-7', date: '2026-03-01', title: 'Logic & Reading', type: 'study' as const, duration: '1.5h' },
];

// ===== MILESTONES =====
export const milestones = [
    { id: 'm1', title: '🎯 First Test Completed', description: 'Complete your first practice test', unlocked: true, dateUnlocked: '2026-01-20' },
    { id: 'm2', title: '🔥 7-Day Streak', description: 'Study for 7 consecutive days', unlocked: true, dateUnlocked: '2026-01-28' },
    { id: 'm3', title: '📚 3 Modules Complete', description: 'Complete 3 full course modules', unlocked: true, dateUnlocked: '2026-02-05' },
    { id: 'm4', title: '🏆 Simulation Mode', description: 'Unlock full IMAT simulation mode', unlocked: true, dateUnlocked: '2026-02-05' },
    { id: 'm5', title: '⭐ Score 50+', description: 'Achieve 50+ on a practice test', unlocked: false, dateUnlocked: null },
    { id: 'm6', title: '💎 Perfect Score', description: 'Get 100% on any subject test', unlocked: false, dateUnlocked: null },
    { id: 'm7', title: '🚀 Marathon Runner', description: 'Complete 10 practice tests', unlocked: false, dateUnlocked: null },
];

// ===== FAQ DATA =====
export const faqItems = [
    {
        question: 'What is the IMAT exam?',
        answer: 'The IMAT (International Medical Admissions Test) is an entrance exam required for English-taught medical programs in Italy. It consists of 60 questions to be answered in 100 minutes, covering Biology, Chemistry, Physics, Mathematics, Logic, and General Knowledge.',
    },
    {
        question: 'How is the IMAT scored?',
        answer: 'The IMAT uses a specific scoring system: +1.5 points for each correct answer, -0.4 points for each incorrect answer, and 0 points for unanswered questions. The maximum possible score is 90 points.',
    },
    {
        question: 'What study materials are included?',
        answer: 'LOCOMOTIVE includes video lectures, PDF resources, interactive quizzes, official IMAT past papers, Italian medical entrance exam questions translated to English, and our own original practice questions.',
    },
    {
        question: 'Can I study offline?',
        answer: 'Currently, LOCOMOTIVE requires an internet connection. We are working on offline mode for future releases.',
    },
    {
        question: 'How do I upgrade my plan?',
        answer: 'You can upgrade your plan by clicking the "Upgrade Plan" button in the sidebar or visiting the pricing page. We offer monthly and yearly subscription options.',
    },
    {
        question: 'What is the difference between Timed and Untimed modes?',
        answer: 'Timed mode simulates real IMAT conditions with a 100-minute countdown. Untimed mode allows you to practice at your own pace without time pressure.',
    },
];
