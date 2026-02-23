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
        return <div className="min-h-screen flex items-center justify-center bg-academic-50 font-sans">Loading Exam...</div>;
    }

    const question = testConfig.questions[currentQ];
    const isAnswered = !!answers[question.id];

    return (
        <div className="h-screen overflow-hidden bg-academic-50 font-sans flex flex-col">
            <header className="bg-white border-b border-academic-200 sticky top-0 z-20 shadow-sm">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <LibraryBig className="text-primary h-6 w-6" />
                        <h1 className="font-serif font-bold text-lg text-academic-900">{testConfig.title}</h1>
                    </div>
                    <div className="flex items-center space-x-4">
                        <span className="text-sm font-medium text-academic-500">Student: {studentSession.studentName}</span>
                        {mode === 'review' && (
                            <Button variant="outline" size="sm" onClick={() => navigate('/student-dash')}>Exit to Menu</Button>
                        )}
                    </div>
                </div>
            </header>

            <main className="flex-1 min-h-0 max-w-7xl mx-auto w-full p-4 md:p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Left: Reading Pane (Scrollable) */}
                <Card className="h-full flex flex-col min-h-0 border-r shadow-sm relative overflow-hidden bg-[#fafaf9]">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-academic-200 to-transparent"></div>
                    <div className="p-6 border-b border-academic-200 bg-white">
                        <h2 className="text-sm font-bold text-academic-400 uppercase tracking-widest">Reading Passage</h2>
                    </div>
                    <CardContent className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                        <div className="prose prose-stone max-w-none text-academic-800 leading-relaxed space-y-4">
                            {testConfig.passage.map((paragraph, i) => (
                                <p key={i} className="text-lg leading-loose group">
                                    <span className="font-serif block hover:bg-academic-100/50 p-2 rounded-lg transition-colors cursor-text">
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
                        <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="bg-white p-6 rounded-2xl shadow-sm border border-academic-200 mb-6 text-center">
                            <h2 className="text-2xl font-bold text-academic-900 font-serif">Score: {score}%</h2>
                            <p className="text-sm text-academic-500 mt-1">Review Mode Active. Check the explanations below.</p>
                        </motion.div>
                    )}

                    <Card className="flex-1 flex flex-col min-h-0 shadow-sm border-t-4 border-t-primary">
                        <div className="p-6 border-b border-academic-100 flex justify-between items-center bg-white">
                            <span className="text-sm font-semibold text-academic-400 uppercase tracking-widest">
                                Question {currentQ + 1} of {testConfig.questions.length}
                            </span>
                            <div className="flex gap-1">
                                {testConfig.questions.map((_, i) => (
                                    <div key={i} className={`h-1.5 w-6 rounded-full transition-colors ${i === currentQ ? 'bg-primary' : i < currentQ ? 'bg-primary/40' : 'bg-academic-200'}`} />
                                ))}
                            </div>
                        </div>

                        <CardContent className="flex-1 overflow-y-auto p-8 bg-[#fafaf9]">
                            <AnimatePresence mode="wait">
                                <motion.div
                                    key={question.id}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    exit={{ opacity: 0, x: -20 }}
                                    className="max-w-xl mx-auto"
                                >
                                    <h3 className="text-xl font-medium text-academic-900 mb-8 leading-snug">
                                        {question.text}
                                    </h3>

                                    <div className="space-y-3">
                                        {question.options.map(opt => {
                                            const isSelected = answers[question.id] === opt.label;
                                            let btnState = 'outline';
                                            let icon = null;

                                            if (mode === 'exam') {
                                                if (isSelected) btnState = 'border-primary bg-primary/5 text-primary shadow-sm';
                                                else btnState = 'border-academic-300 hover:border-academic-400 hover:bg-white bg-white text-academic-700';
                                            } else if (mode === 'review') {
                                                const isCorrectAnswer = opt.label === question.correctAnswer;
                                                if (isCorrectAnswer) {
                                                    btnState = 'border-feedback-success bg-feedback-successLight text-feedback-success border-2 shadow-sm relative z-10';
                                                    icon = <CheckCircle2 className="h-5 w-5 text-feedback-success" />;
                                                } else if (isSelected && !isCorrectAnswer) {
                                                    btnState = 'border-feedback-error bg-feedback-errorLight text-feedback-error blur-[1px] opacity-70';
                                                    icon = <XCircle className="h-5 w-5 text-feedback-error" />;
                                                } else {
                                                    btnState = 'border-academic-200 bg-academic-50 text-academic-400 opacity-50';
                                                }
                                            }

                                            return (
                                                <button
                                                    key={opt.label}
                                                    onClick={() => handleSelect(question.id, opt.label)}
                                                    disabled={mode === 'review'}
                                                    className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200 flex items-center justify-between group ${btnState}`}
                                                >
                                                    <div className="flex items-center">
                                                        <span className={`flex items-center justify-center h-8 w-8 rounded-lg mr-4 text-sm font-bold transition-colors ${isSelected && mode === 'exam' ? 'bg-primary text-white' : 'bg-academic-100 text-academic-500 group-hover:bg-academic-200'} ${mode === 'review' ? 'opacity-80' : ''}`}>
                                                            {opt.label}
                                                        </span>
                                                        <span className="font-medium text-[15px]">{opt.text}</span>
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

                        <div className="p-6 border-t border-academic-200 bg-white">
                            <Button
                                onClick={handleNext}
                                disabled={!isAnswered && mode === 'exam'}
                                className="w-full flex justify-center text-lg shadow-md"
                                size="lg"
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
