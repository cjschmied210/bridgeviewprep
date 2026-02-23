export const TEST_CONFIG_TEMPLATE = {
    testId: "quiz-001",
    classId: "class-123",
    title: "The Roman Empire - Reading Check",
    passage: [
        "(1) The Roman Empire was one of the largest and most influential empires in world history.",
        "(2) At its height under Trajan, it spanned from Britannia to Egypt, deeply impacting modern culture.",
        "(3) One of its most lasting legacies is its extensive network of roads and aqueducts.",
        "(4) These feats of engineering not only facilitated trade and military movement but also supplied major cities with fresh water."
    ],
    questions: [
        {
            id: 1,
            text: "According to the passage, what did the Roman aqueducts and roads facilitate?",
            options: [
                { label: "A", text: "The rise of a new emperor." },
                { label: "B", text: "Trade and military movement." },
                { label: "C", text: "The defeat of Egypt." },
                { label: "D", text: "The discovery of Britannia." }
            ],
            correctAnswer: "B",
            explanation: "Sentence 4 explicitly states that these engineering feats facilitated trade and military movement."
        },
        {
            id: 2,
            text: "Which of the following best describes the scope of the Roman Empire at its height?",
            options: [
                { label: "A", text: "It was confined to modern-day Italy." },
                { label: "B", text: "It stretched from Britannia to Egypt." },
                { label: "C", text: "It only impacted its immediate neighbors." },
                { label: "D", text: "It was primarily a maritime empire." }
            ],
            correctAnswer: "B",
            explanation: "Sentence 2 states that at its height, the empire spanned from Britannia to Egypt."
        }
    ]
};

export const mockClasses = [
    {
        id: "class-123",
        joinCode: "ROMAN-2026",
        name: "World History 101",
        teacherId: "teacher-1",
        activeTestId: "quiz-001"
    }
];

export const mockTests = [
    TEST_CONFIG_TEMPLATE
];

export let mockSubmissions = [
    {
        id: "sub-1",
        classId: "class-123",
        testId: "quiz-001",
        studentName: "Alice Smith",
        score: 100, // percentage
        answers: { 1: "B", 2: "B" },
        timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString()
    },
    {
        id: "sub-2",
        classId: "class-123",
        testId: "quiz-001",
        studentName: "Bob Jones",
        score: 50,
        answers: { 1: "B", 2: "C" },
        timestamp: new Date(Date.now() - 1000 * 60 * 2).toISOString()
    }
];
