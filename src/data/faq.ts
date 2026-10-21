// ===== FAQ CONTENT =====
// Supplied by the client (LOCOMOTIVE-IMAT-FAQs.docx).
// Each answer block is a paragraph (string) or a bulleted list (string[]).
// Links use [label](url).

import { INACTIVE_DELETE_MONTHS } from '@/lib/memotive/content';

export type FaqBlock = string | string[];

export interface FaqItem {
    question: string;
    answer: FaqBlock[];
}

export interface FaqCategory {
    title: string;
    items: FaqItem[];
}

const SITE = 'https://thisislocomotive.com';
const UNIVERSITALY = 'https://www.universitaly.it';

export const faqCategories: FaqCategory[] = [
    {
        title: 'General',
        items: [
            {
                question: 'What is the IMAT Exam?',
                answer: [
                    'The IMAT (International Medical Admissions Test) is a paper-based entrance exam for students who wish to apply to English-taught Medicine and Surgery programs at public universities in Italy.',
                    'The exam is held once a year, typically in September or October, and is required for both EU and non-EU students applying to these programs.',
                    'Each year, the Italian Ministry of University and Research (MUR) sets the guidelines and content for the exam. These are published in an official decree, usually released in the summer.',
                ],
            },
            {
                question: 'What makes studying medicine in Italy — and preparing for the IMAT — worth it?',
                answer: [
                    'Italy offers one of the most unique opportunities in medical education: world-class, English-taught programs at public universities with affordable tuition and global recognition. Students from every corner of the world come to Italy not just for the degree, but for the chance to study in an international environment that blends tradition, innovation, and accessibility.',
                    'The only challenge standing between you and that opportunity is the IMAT — a single exam that defines your path to medical or dental school. It\'s not about memorizing facts, but about thinking under pressure, reasoning logically, and staying sharp throughout the test.',
                    'That\'s where LOCOMOTIVE steps in. We don\'t just prepare you for the IMAT — we teach you to master it. With structured guidance, real-exam simulations, and proven strategies, we help you turn the IMAT from an obstacle into your gateway to studying medicine in Italy.',
                ],
            },
            {
                question: 'Who is eligible to take the IMAT exam?',
                answer: [
                    'The IMAT is open to any EU or non-EU student who wishes to apply to an English-taught Medicine and Surgery program at Italian public universities, provided they have completed their secondary education and meet the admission requirements set by the universities and the Italian Ministry.',
                ],
            },
            {
                question: 'How many times can I take the IMAT?',
                answer: [
                    'The IMAT is offered once a year, but there is no limit on the number of times you can take it, as long as you register each year.',
                ],
            },
            {
                question: 'Where is the IMAT exam conducted?',
                answer: [
                    'The IMAT is conducted worldwide at designated test centers. The list of centers is usually published about a month before the exam.',
                ],
            },
            {
                question: 'Which universities in Italy offer Medicine and Dentistry in English?',
                answer: [
                    'As of the most recent academic cycle, the public universities offering Medicine and Surgery in English are:',
                    [
                        'University of Pavia',
                        'University of Bologna',
                        'University of Turin',
                        'University of Milan',
                        'University of Bari "Aldo Moro"',
                        'University of Rome Tor Vergata',
                        'University of Padua',
                        'University of Parma',
                        'University of Naples Federico II',
                        'University of Campania "Luigi Vanvitelli"',
                        'University of Siena',
                    ],
                    'Two public universities offer Dentistry and Dental Prosthodontics in English: Sapienza University of Rome and the University of Siena.',
                    'Among private universities, Medicine in English is also offered by Humanitas University (Hunimed), Vita-Salute San Raffaele University (UniSR), and Saint Camillus International University of Health and Medical Sciences (UniCamillus).',
                    `[Compare all Italian medical schools →](${SITE}/italian-medical-schools/)`,
                ],
            },
            {
                question: 'How much is the IMAT registration fee?',
                answer: [
                    'The fee is usually around €130, though it can vary slightly by location. Payment is made online during registration on the Universitaly portal.',
                ],
            },
            {
                question: 'Are there scholarships available for IMAT students?',
                answer: [
                    'Yes. Italian regions and universities offer regional (need-based) and merit-based scholarships, which can cover tuition, accommodation, and meals. You apply after admission, and awards depend on proof of financial status or academic merit.',
                    `[See regional scholarships and deadlines →](${SITE}/scholarships-news-and-updates/)`,
                ],
            },
            {
                question: 'When do classes start after the IMAT exam?',
                answer: [
                    'First-year classes typically begin in October or November, depending on the university and how quickly the ranking (scrolling) process moves.',
                ],
            },
            {
                question: 'Is there an age limit for taking the IMAT exam?',
                answer: [
                    'No. There is no age limit. Anyone who has completed secondary education and meets the eligibility criteria can sit the exam.',
                ],
            },
        ],
    },
    {
        title: 'Exam Structure and Scoring',
        items: [
            {
                question: 'What subjects are covered in the IMAT exam?',
                answer: [
                    [
                        'Biology',
                        'Chemistry',
                        'Physics and Mathematics',
                        'General Knowledge and reading skills',
                        'Logical Reasoning',
                    ],
                ],
            },
            {
                question: 'How many questions are in the IMAT, and what is the format?',
                answer: [
                    'The IMAT has 60 multiple-choice questions:',
                    [
                        'Logical Reasoning and General Knowledge — 9 questions. Critical thinking, problem solving, and knowledge of culture, history, current events, and general facts.',
                        'Biology — 23 questions. Cell biology, genetics, evolution, physiology, and ecology.',
                        'Chemistry — 15 questions. Atomic structure, chemical reactions, periodic properties, and organic chemistry.',
                        'Physics and Mathematics — 13 questions. Mechanics, electricity, thermodynamics, algebra, geometry, and statistics.',
                    ],
                    `[Full IMAT exam information →](${SITE}/imat-2026/)`,
                ],
            },
            {
                question: 'Does the IMAT exam have a time limit?',
                answer: [
                    'Yes. You have 100 minutes to answer all 60 questions. Because questions vary in difficulty and cover different subjects, time management is crucial.',
                ],
            },
            {
                question: 'What is the scoring system for the IMAT?',
                answer: [
                    [
                        'Correct answer: +1.5 points',
                        'Incorrect answer: −0.4 points',
                        'Unanswered: 0 points',
                    ],
                    'The maximum score is 90 points.',
                    `[Score a past paper with the IMAT Score Calculator →](${SITE}/imat-exam-calculator/)`,
                ],
            },
            {
                question: 'What is the passing score for the IMAT?',
                answer: [
                    'There is no fixed passing score. Admission depends on your rank compared to other candidates. Each university\'s cut-off depends on its number of seats and the level of competition that year.',
                    `[See past IMAT thresholds →](${SITE}/imat-thresholds/)`,
                ],
            },
            {
                question: 'How are the results calculated and when will they be available?',
                answer: [
                    `Your score is calculated with the official scoring rules and published on the [Universitaly platform](${UNIVERSITALY}), typically 3–4 weeks after the exam. Rankings follow afterwards.`,
                ],
            },
            {
                question: 'Can I bring a calculator or notes to the IMAT?',
                answer: [
                    'No. Calculators, notes, and electronic devices are strictly forbidden. Only your ID document and the materials provided at the center are allowed.',
                ],
            },
            {
                question: 'What should I bring to the exam center?',
                answer: [
                    [
                        'Your passport or ID (the same one used at registration)',
                        'Your registration confirmation',
                        'Any local documents mentioned in your confirmation email',
                    ],
                    'You may also bring a bottle of water and small snacks, but all labels must be removed. Pens are usually provided by the test center.',
                ],
            },
            {
                question: 'How long are IMAT results valid?',
                answer: [
                    'Your score is valid only for that academic year. To reapply, you must retake the IMAT the following year.',
                ],
            },
            {
                question: 'Can I apply to Italian private medical universities with the IMAT score?',
                answer: [
                    'No. Private universities (such as Humanitas, San Raffaele, and UniCamillus) run their own entrance exams and do not accept IMAT results.',
                ],
            },
            {
                question: 'What happens if I miss the IMAT exam date?',
                answer: [
                    'If you don\'t show up, your registration is cancelled and the fee is not refunded. You will need to wait for the next year\'s exam.',
                ],
            },
        ],
    },
    {
        title: 'Preparation and Study Resources',
        items: [
            {
                question: 'What are the best resources to prepare for the IMAT?',
                answer: [
                    'Start with the official IMAT past papers to learn the format and the level of the questions, alongside resources that cover the full syllabus.',
                    'LOCOMOTIVE also offers structured IMAT courses with study planners, weekly tests, and mock exams that mirror the real exam, so you arrive on test day prepared and confident.',
                    `[IMAT official past papers →](${SITE}/imat-past-papers/)  ·  [IMAT 2027 Program →](${SITE}/imat-course/)`,
                ],
            },
            {
                question: 'How long should I prepare for the IMAT?',
                answer: [
                    'It varies, but we recommend starting at least 4–6 months before the exam, working on both the science subjects and logical reasoning.',
                ],
            },
            {
                question: 'Which past IMAT papers should I practice for the best preparation?',
                answer: [
                    'Practice every official IMAT paper from 2011 to the most recent year. Focus most on the recent papers, since they best reflect the current format and difficulty. Older papers (2011–2016) are still useful for logic and critical thinking.',
                    'We also recommend practicing the Italian admission tests (TOLC and the Italian medicine test).',
                    `[Worked solutions for every IMAT question →](${SITE}/imat-worked-solution/)  ·  [Italian exam official papers →](${SITE}/tolc-past-papers/)`,
                ],
            },
            {
                question: 'How many mock exams should I take before the real IMAT?',
                answer: [
                    'Aim for at least 8–10 full-length mocks under timed conditions, and review every mistake to understand the reasoning behind the correct answer.',
                ],
            },
            {
                question: 'Can I get one-to-one advice on my IMAT plan?',
                answer: [
                    'Yes. LOCOMOTIVE offers a private IMAT consultation: a 45-minute one-to-one Zoom call for €39, tailored to your situation (EU or non-EU status, previous attempts, target universities, and how many hours a week you can study).',
                    [
                        'Pre-enrollment vs. pre-registration, key deadlines, and required documents',
                        'Choosing and ranking universities',
                        'A study plan built around your timeline',
                        'Section-by-section tactics for reasoning, biology, chemistry, physics, and maths',
                    ],
                    'The Zoom link is emailed after you book. Cancellations must be made at least 24 hours before your slot. Scholarship guidance is not included.',
                    `[Book an IMAT consultation →](${SITE}/imat-consultation/)`,
                ],
            },
            {
                question: 'Who can benefit most from LOCOMOTIVE IMAT Courses?',
                answer: [
                    'LOCOMOTIVE IMAT is for students who want more than test preparation — it\'s for those building a clear path to medical or dental school in Italy. Whether you\'re starting from zero or refining your final strategy, LOCOMOTIVE gives you the structure, mentorship, and precision to turn your IMAT goals into results.',
                ],
            },
            {
                question: 'Is LOCOMOTIVE IMAT Course right for me?',
                answer: [
                    'If you\'re determined to study medicine or dentistry in Italy and want guidance from students who have already made it, yes. LOCOMOTIVE is a complete system that takes you from confusion to clarity, covering every topic, strategy, and exam-day detail you need to secure your place.',
                ],
            },
            {
                question: 'Who joins LOCOMOTIVE IMAT Course?',
                answer: [
                    'Our students come from all over the world, united by one goal: studying medicine or dentistry in Italy. LOCOMOTIVE supports beginners, re-takers, and high scorers alike with a proven roadmap, expert feedback, and resources designed to help you perform at your best.',
                ],
            },
        ],
    },
    {
        title: 'Application and Enrollment Process',
        items: [
            {
                question: 'How many universities can I apply to?',
                answer: [
                    'EU students can select all universities and rank them in order of preference on the Universitaly portal.',
                    'Non-EU students can choose only one university at registration, and their application is considered only for that university, so choose carefully.',
                    `[Compare options with the University Choice Tracker →](${SITE}/imat-university-choice-tracker/)  ·  [Get one-to-one help choosing →](${SITE}/imat-consultation/)`,
                ],
            },
            {
                question: 'Who is considered an EU candidate for the IMAT exam?',
                answer: [
                    [
                        'EU citizens — citizens of any EU member state.',
                        'EEA citizens — Norway, Iceland, and Liechtenstein.',
                        'Swiss citizens — Switzerland is not in the EU, but its citizens are treated like EU nationals for education purposes in Italy.',
                        'Non-EU nationals with EU-equivalent status — for example, non-EU citizens holding certain legal residence permits in Italy.',
                    ],
                    'Some universities, such as Parma and Siena, no longer treat certain EU-equivalent candidates as EU candidates. Always check each university\'s latest call before you apply.',
                ],
            },
            {
                question: 'What is the pre-enrollment process?',
                answer: [
                    `Pre-enrollment is a mandatory step for non-EU students applying from abroad. It is done on the [Universitaly portal](${UNIVERSITALY}) and is used to verify eligibility and to support your study visa application.`,
                ],
            },
            {
                question: 'How can I do the pre-enrollment process?',
                answer: [
                    'Submit a pre-enrollment application on Universitaly, selecting your university and program, and upload the required documents: your educational qualifications, passport, and proof of language proficiency if required.',
                    '[Watch: Pre-enrollment for the IMAT exam (video) →](https://youtu.be/puF5oaV0KSU)',
                ],
            },
            {
                question: 'How can I register for the IMAT exam?',
                answer: [
                    [
                        `Create an account on the [Universitaly website](${UNIVERSITALY}) when registration opens, usually in the summer.`,
                        'Open the IMAT section and fill in the form: personal details, test center, and university preferences (non-EU students choose one university; EU students rank several).',
                        'Pay the registration fee (around €130) through Universitaly.',
                        'Wait for the confirmation email with your exam details.',
                    ],
                    `[Latest official dates and updates →](${SITE}/imat-2026-news-and-updates/)`,
                ],
            },
            {
                question: 'Do I need my school diploma to study medicine in Italy?',
                answer: [
                    'Yes. You need a high school diploma or an equivalent qualification that meets the admission standards set by the university and the Italian Ministry.',
                ],
            },
            {
                question: 'Do I need to pre-register before the IMAT exam?',
                answer: [
                    'Some universities require all applicants, or only non-EU applicants, to pre-register on the university\'s own portal so they can evaluate your documents. This is separate from Universitaly pre-enrollment, so check each university\'s requirements before the exam.',
                ],
            },
            {
                question: 'Can I change my test center after registration?',
                answer: [
                    'No. Once your registration is submitted and paid, the test center cannot be changed. Choose carefully before confirming.',
                ],
            },
        ],
    },
    {
        title: 'Documents and Visa Requirements',
        items: [
            {
                question: 'When should I apply for the visa?',
                answer: [
                    'Apply for your student visa after the results are published and you are admitted. Processing times vary by country, so check the requirements of the Italian embassy in your country early.',
                ],
            },
            {
                question: 'What is DOV?',
                answer: [
                    'A DOV (Declaration of Value) is an official document issued by the Italian embassy or consulate in the country where you obtained your diploma. It certifies that your qualification gives access to university in that country, which is what makes it valid for admission to Italian universities.',
                ],
            },
            {
                question: 'How can I get the DOV?',
                answer: [
                    'Contact the Italian embassy or consulate in the country where you obtained your diploma.',
                ],
            },
            {
                question: 'What is CIMEA?',
                answer: [
                    'CIMEA (Information Centre on Academic Mobility and Equivalence) issues the Statement of Comparability, which compares your qualification to the Italian education system. Many universities accept it in place of, or alongside, the DOV.',
                ],
            },
            {
                question: 'Do I need an English certificate like IELTS for the IMAT exam?',
                answer: [
                    'No certificate is needed to sit the IMAT. The exam itself is in English, so it already tests your ability to work in the language, and most universities accept that.',
                    'Some universities may still ask non-native speakers for proof such as IELTS or TOEFL, especially if your previous education was not in English. Check your chosen university\'s language requirements.',
                ],
            },
        ],
    },
    {
        // Platform policy, not part of the client's IMAT FAQ document.
        title: 'Memotive Flashcards',
        items: [
            {
                question: 'Are my Memotive flashcards ever deleted?',
                answer: [
                    `Yes. If you don't sign in to LOCOMOTIVE for ${INACTIVE_DELETE_MONTHS} months, all your Memotive subjects and cards are deleted automatically, including their review history. This applies to every account, free or paid, and can't be undone.`,
                    'To keep a copy, download a [PDF backup](/memotive/print) of all your cards anytime.',
                ],
            },
        ],
    },
];
