import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { dbService } from '../services/db';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, XCircle, ArrowRight, LibraryBig, SkipForward } from 'lucide-react';

export default function StudentExam() {
    const { studentSession, logoutStudent } = useAuth();
    const { testId } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const [testConfig, setTestConfig] = useState(null);

    // States: 'loading' | 'exam' | 'review'
    const [mode, setMode] = useState('loading');
    const [currentQ, setCurrentQ] = useState(0);
    const [answers, setAnswers] = useState({});
    const [score, setScore] = useState(0);

    useEffect(() => {
        const fetchTest = async () => {
            try {
                const config = await dbService.getTestConfig(studentSession.classId, testId);
                setTestConfig(config);

                if (location.state && location.state.mode === 'review') {
                    setAnswers(location.state.answers);
                    setScore(location.state.score);
                    setMode('review');
                } else {
                    setMode('exam');

                    // Initialize live session
                    dbService.updateLiveSession(
                        studentSession.classId,
                        testId,
                        studentSession.studentName,
                        0,
                        {}
                    ).catch(console.error);
                }
            } catch (err) {
                console.error(err);
            }
        };
        if (studentSession) fetchTest();
    }, [studentSession]);

    const handleSelect = (questionId, label) => {
        if (mode === 'review') return;
        const newAnswers = { ...answers, [questionId]: label };
        setAnswers(newAnswers);

        // Push live updates
        dbService.updateLiveSession(
            studentSession.classId,
            testId,
            studentSession.studentName,
            currentQ,
            newAnswers
        ).catch(console.error);
    };

    const handleNext = () => {
        if (currentQ < testConfig.questions.length - 1) {
            const nextQ = currentQ + 1;
            setCurrentQ(nextQ);

            // Push live updates
            dbService.updateLiveSession(
                studentSession.classId,
                testId,
                studentSession.studentName,
                nextQ,
                answers
            ).catch(console.error);
        } else {
            submitTest();
        }
    };

    const submitTest = async () => {
        setMode('loading');
        let correctCount = 0;
        testConfig.questions.forEach(q => {
            if (answers[q.id] === q.correctAnswer) correctCount++;
        });

        const finalScore = Math.round((correctCount / testConfig.questions.length) * 100);
        setScore(finalScore);

        await dbService.submitStudentTest(
            studentSession.classId,
            testId,
            studentSession.studentName,
            finalScore,
            answers
        );

        setMode('review');
        setCurrentQ(0); // reset to first question for review
    };

    if (mode === 'loading' || !testConfig) {
        return <div className="flex-1 flex items-center justify-center bg-academic-50 font-sans">Loading Exam...</div>;
    }

    const question = testConfig.questions[currentQ];
    const isAnswered = !!answers[question.id];

    return (
        <div className="h-[calc(100vh-56px)] w-full overflow-hidden font-sans flex flex-col relative bg-cover bg-center" style={{ backgroundImage: "url('/campus_bg.png')" }}>
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-0"></div>

            <header className="bg-white/95 backdrop-blur-sm border-b border-academic-200 sticky top-0 z-20 shadow-sm relative">
                <div className="max-w-7xl mx-auto px-4 py-1.5 flex items-center justify-between min-h-[40px]">
                    <div className="flex items-center space-x-2">
                        <LibraryBig className="text-primary h-4 w-4" />
                        <h1 className="font-serif font-bold text-base text-academic-900">{testConfig.title}</h1>
                    </div>
                    <div className="flex items-center space-x-3">
                        <span className="text-xs font-medium text-academic-500">Student: {studentSession.studentName}</span>
                        <Button variant="outline" className="h-7 text-xs px-2 py-0" onClick={() => navigate('/student-dash')}>Exit to Menu</Button>
                    </div>
                </div>
            </header>

            <main className="relative z-10 flex-1 w-full p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-6 overflow-hidden min-h-0">
                {/* Left: Reading Pane (Scrollable) — shows the current question's passage */}
                <Card className="h-full flex flex-col min-h-0 shadow-lg rounded-2xl relative overflow-hidden bg-white border border-academic-200/60">
                    <div className="p-4 md:p-6 border-b border-academic-100 bg-white/50">
                        <h2 className="text-sm font-bold text-academic-400 uppercase tracking-widest">Reading Passage</h2>
                    </div>
                    <CardContent className="flex-1 overflow-y-auto p-4 md:p-8 custom-scrollbar min-h-0 bg-white">
                        <div className="w-full max-w-2xl mx-auto space-y-6">
                            {/* New quizzes: question has its own passage. Legacy quizzes: fall back to top-level passage. */}
                            {(question.passage?.length > 0 ? question.passage : (testConfig.passage || [])).map((paragraph, i) => (
                                <p key={i} className="text-[1.05rem] md:text-[1.15rem] leading-[1.7] text-academic-800 font-serif group">
                                    <span className="block hover:bg-academic-50 p-2 rounded-lg transition-colors cursor-text">
                                        {paragraph}
                                    </span>
                                </p>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Right: Question Pane */}
                <div className="h-full flex flex-col min-h-0 overflow-hidden">
                    {mode === 'review' && (
                        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white p-6 rounded-2xl shadow-md border border-academic-200 mb-6 text-center relative z-10">
                            <h2 className="text-2xl font-bold text-academic-900 font-serif">Score: {score}%</h2>
                            <p className="text-sm text-academic-500 mt-1">Review Mode Active. Check the explanations below.</p>
                        </motion.div>
                    )}

                    <Card className="flex-1 flex flex-col min-h-0 shadow-lg rounded-2xl border border-academic-200/60 relative overflow-hidden bg-white">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-blue-400"></div>
                        <div className="py-2.5 px-4 md:px-6 border-b border-academic-100 flex flex-col gap-1.5 bg-white/50 shrink-0">
                            <span className="text-xs font-semibold text-academic-400 uppercase tracking-widest">
                                Question {currentQ + 1} of {testConfig.questions.length}
                            </span>
                            <div className="flex gap-1 mt-0.5">
                                {testConfig.questions.map((_, i) => (
                                    <div key={i} className={`h-1.5 w-6 rounded-full transition-all duration-300 ${i === currentQ ? 'bg-gradient-to-r from-blue-400 to-primary shadow-[0_0_8px_theme(colors.primary/0.4)]' : i < currentQ ? 'bg-primary/50' : 'bg-academic-200'}`} />
                                ))}
                            </div>
                        </div>

                        <CardContent className="flex-1 overflow-y-auto p-4 md:p-8 bg-white custom-scrollbar min-h-0">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={question.id}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="max-w-xl mx-auto h-full flex flex-col justify-between"
                                >
                                    <div className="flex-shrink flex items-center mb-6">
                                        <h3 className="text-xl font-medium text-academic-900 leading-snug">
                                            {question.text}
                                        </h3>
                                    </div>

                                    <div className="space-y-2 shrink min-h-0 overflow-y-auto custom-scrollbar">
                                        {question.options.map(opt => {
                                            const isSelected = answers[question.id] === opt.label;
                                            let btnState = 'outline';
                                            let icon = null;

                                            let labelState = '';

                                            if (mode === 'exam') {
                                                if (isSelected) {
                                                    btnState = 'border-primary bg-primary text-white shadow-[0_4px_12px_theme(colors.primary/0.2)] hover:bg-blue-600 hover:border-blue-600 scale-[0.99]';
                                                    labelState = 'bg-white/20 text-white';
                                                } else {
                                                    btnState = 'border-academic-200 bg-white text-academic-700 shadow-sm hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5';
                                                    labelState = 'bg-academic-100 text-academic-500 group-hover:bg-primary/10 group-hover:text-primary';
                                                }
                                            } else if (mode === 'review') {
                                                const isCorrectAnswer = opt.label === question.correctAnswer;
                                                if (isCorrectAnswer) {
                                                    btnState = 'border-feedback-success bg-feedback-success text-white shadow-sm relative z-10';
                                                    labelState = 'bg-white/20 text-white';
                                                    icon = <CheckCircle2 className="h-5 w-5 text-white" />;
                                                } else if (isSelected && !isCorrectAnswer) {
                                                    btnState = 'border-feedback-error bg-feedback-errorLight text-feedback-error opacity-70';
                                                    labelState = 'bg-feedback-error/10 text-feedback-error';
                                                    icon = <XCircle className="h-5 w-5 text-feedback-error" />;
                                                } else {
                                                    btnState = 'border-academic-200 bg-academic-50 text-academic-400 opacity-50';
                                                    labelState = 'bg-academic-200/50 text-academic-400';
                                                }
                                            }

                                            return (
                                                <button
                                                    key={opt.label}
                                                    onClick={() => handleSelect(question.id, opt.label)}
                                                    disabled={mode === 'review'}
                                                    className={`w-full text-left py-3 px-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-between group shrink min-h-[44px] outline-none ${btnState}`}
                                                >
                                                    <div className="flex items-center">
                                                        <span className={`flex items-center justify-center shrink-0 h-8 w-8 rounded-lg mr-4 text-sm font-bold transition-colors ${labelState}`}>
                                                            {opt.label}
                                                        </span>
                                                        <span className={`font-medium text-[15px] ${isSelected && mode === 'exam' ? 'font-semibold' : ''}`}>{opt.text}</span>
                                                    </div>
                                                    {icon}
                                                </button>
                                            );
                                        })}
                                    </div>

                                    {mode === 'review' && (
                                        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-8 p-5 bg-blue-50/80 border border-blue-200 rounded-xl relative overflow-hidden">
                                            <div className="absolute top-0 left-0 w-1 h-full bg-primary" />
                                            <h4 className="text-sm font-bold text-primary uppercase tracking-widest mb-2 flex items-center">
                                                <LibraryBig className="h-4 w-4 mr-2" /> Explanation
                                            </h4>
                                            <p className="text-sm text-academic-700 leading-relaxed font-serif">
                                                {question.explanation}
                                            </p>
                                        </motion.div>
                                    )}
                                </motion.div>
                            </AnimatePresence>
                        </CardContent>

                        <div className="py-2 px-4 md:px-6 border-t border-academic-200 bg-white">
                            <Button
                                onClick={handleNext}
                                disabled={!isAnswered && mode === 'exam'}
                                className="w-full flex justify-center text-base font-semibold shadow-sm h-11"
                            >
                                {mode === 'exam' ? (
                                    currentQ === testConfig.questions.length - 1 ? 'Submit Test' : (
                                        <>Next Question <ArrowRight className="ml-2 h-5 w-5" /></>
                                    )
                                ) : (
                                    currentQ === testConfig.questions.length - 1 ? 'Finish Review' : (
                                        <>Next Explanation <SkipForward className="ml-2 h-5 w-5" /></>
                                    )
                                )}
                            </Button>
                        </div>
                    </Card>
                </div>
            </main>
        </div>
    );
}
