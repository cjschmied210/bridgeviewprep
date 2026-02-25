import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { dbService } from '../services/db';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { LibraryBig, LogOut, FileText, ChevronRight, RotateCcw, Eye } from 'lucide-react';
import { motion } from 'framer-motion';

export default function StudentDashboard() {
    const { studentSession, logoutStudent } = useAuth();
    const navigate = useNavigate();
    const [tests, setTests] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchTests = async () => {
            if (studentSession?.classId) {
                try {
                    const availableTests = await dbService.getTestsForClass(studentSession.classId);

                    const testsWithSubmissions = await Promise.all(availableTests.map(async (test) => {
                        const subs = await dbService.getStudentSubmissionsForTest(studentSession.classId, test.id, studentSession.studentName);
                        return { ...test, submissions: subs };
                    }));

                    setTests(testsWithSubmissions);
                } catch (err) {
                    console.error("Failed to load class tests:", err);
                } finally {
                    setLoading(false);
                }
            }
        };
        fetchTests();
    }, [studentSession]);

    const handleLogout = () => {
        logoutStudent();
        navigate('/');
    };

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center bg-academic-50 font-sans">
                <div className="animate-pulse text-academic-500 font-medium">Loading Dashboard...</div>
            </div>
        );
    }

    return (
        <div className="flex-1 bg-[url('/campus_bg.png')] bg-cover bg-center bg-fixed font-sans flex flex-col relative overflow-x-hidden">
            {/* Soft white gradient overlay for readability */}
            <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-0"></div>

            <header className="bg-white/90 backdrop-blur-md border-b border-academic-200 sticky top-0 z-20 shadow-sm relative">
                <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <LibraryBig className="text-primary h-6 w-6" />
                        <h1 className="font-serif font-bold text-lg text-academic-900">Student Dashboard</h1>
                    </div>
                    <div className="flex items-center space-x-4">
                        <span className="text-sm font-medium text-academic-500">Student: {studentSession.studentName}</span>
                        <Button variant="outline" size="sm" onClick={handleLogout}>
                            <LogOut className="h-4 w-4 mr-2" />
                            Exit Class
                        </Button>
                    </div>
                </div>
            </header>

            <main className="flex-1 max-w-4xl mx-auto w-full p-4 md:p-8 relative z-10 flex flex-col">
                <div className="mb-6">
                    <h2 className="text-3xl font-serif font-extrabold text-academic-900 tracking-tight">Assigned Quizzes</h2>
                    <p className="text-academic-600 mt-2 font-medium">Select a quiz below to begin.</p>
                </div>

                {tests.length === 0 ? (
                    <Card className="border-dashed border-2 bg-transparent shadow-none">
                        <CardContent className="flex flex-col items-center justify-center py-16">
                            <FileText className="h-12 w-12 text-academic-300 mb-4" />
                            <p className="text-lg font-medium text-academic-700">No quizzes assigned yet.</p>
                            <p className="text-sm text-academic-500">Wait for your teacher to upload content.</p>
                        </CardContent>
                    </Card>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {tests.map((test, index) => (
                            <motion.div
                                key={test.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: index * 0.05 }}
                            >
                                <Card
                                    className="cursor-pointer group bg-white/95 backdrop-blur-sm shadow-md hover:shadow-xl hover:-translate-y-1 transition-all duration-300 border-transparent hover:border-primary/20"
                                    onClick={() => navigate(`/exam/${test.id}`)}
                                >
                                    <CardContent className="p-6 flex flex-col h-full">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center space-x-4">
                                                <div className="h-14 w-14 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:bg-primary group-hover:text-white group-hover:shadow-md transition-all duration-300">
                                                    <FileText size={24} />
                                                </div>
                                                <div>
                                                    <h3 className="text-xl font-bold text-academic-900 group-hover:text-primary transition-colors">{test.title || "Untitled Quiz"}</h3>
                                                    <p className="text-sm font-medium text-academic-500">{test.questions?.length || 0} Questions</p>
                                                </div>
                                            </div>

                                            <div className="h-10 w-10 rounded-full flex items-center justify-center bg-academic-50 text-academic-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors group-hover:translate-x-1 duration-300">
                                                <ChevronRight size={20} />
                                            </div>
                                        </div>

                                        {test.submissions && test.submissions.length > 0 && (
                                            <div className="mt-5 pt-4 border-t border-academic-100/60 flex flex-col gap-2 relative">
                                                {test.submissions.map((sub, idx) => (
                                                    <div key={sub.id} className="flex items-center justify-between text-sm bg-academic-50/80 p-3 md:px-4 rounded-xl border border-academic-100">
                                                        <div className="flex items-center gap-3 font-medium text-academic-800">
                                                            <span className="bg-academic-200/50 text-academic-700 font-bold text-xs px-2.5 py-1 rounded-md uppercase tracking-wider">Attempt {idx + 1}</span>
                                                            <span className="font-bold">Score: <span className="text-primary">{sub.score}%</span></span>
                                                        </div>
                                                        <Button variant="ghost" size="sm" className="text-primary hover:text-primary-dark hover:bg-primary/10 shadow-sm bg-white" onClick={(e) => {
                                                            e.stopPropagation();
                                                            navigate(`/exam/${test.id}`, { state: { mode: 'review', answers: sub.answers, score: sub.score } });
                                                        }}>
                                                            <Eye className="h-4 w-4 mr-2" /> Review
                                                        </Button>
                                                    </div>
                                                ))}
                                                <Button variant="outline" className="w-full mt-3 border-academic-300 text-academic-700 hover:border-primary hover:text-primary hover:bg-primary/5 shadow-sm group-hover:border-primary/50 transition-all font-medium" onClick={(e) => {
                                                    e.stopPropagation();
                                                    navigate(`/exam/${test.id}`);
                                                }}>
                                                    <RotateCcw className="h-4 w-4 mr-2" /> Retake Quiz
                                                </Button>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            </motion.div>
                        ))}
                    </div>
                )}
            </main>
        </div>
    );
}
