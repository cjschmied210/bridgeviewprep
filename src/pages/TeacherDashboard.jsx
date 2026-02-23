import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { dbService } from '../services/db';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { LogOut, Users, FileText, PlusCircle, Activity, UploadCloud, X, FolderPlus, Trash2, ClipboardList, Radio, CheckCircle2, XCircle, ArrowLeft, ChevronRight, LibraryBig } from 'lucide-react';
import { motion } from 'framer-motion';
import { db } from '../lib/firebase';
import { collection, setDoc, doc } from 'firebase/firestore';
import { aiService } from '../services/ai';

export default function TeacherDashboard() {
    const [classes, setClasses] = useState([]);
    const [activeClassId, setActiveClassId] = useState(null); // start without a class selected
    const [classTests, setClassTests] = useState([]);
    const [loading, setLoading] = useState(true);
    const { currentUser, logoutTeacher } = useAuth();
    const [viewMode, setViewMode] = useState('overview'); // 'overview' | 'import' | 'submissions' | 'live_monitor'

    // Upload State
    const [dragActive, setDragActive] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState([]);
    const [rawText, setRawText] = useState('');
    const [generating, setGenerating] = useState(false);
    const [genSuccess, setGenSuccess] = useState(false);
    const [draftQuiz, setDraftQuiz] = useState(null);
    const [selectedTest, setSelectedTest] = useState(null);
    const [selectedSubmission, setSelectedSubmission] = useState(null);
    const [projectedQuestion, setProjectedQuestion] = useState(null);
    const [answerRevealed, setAnswerRevealed] = useState(false);
    const [testSubmissions, setTestSubmissions] = useState([]);
    const [liveSessions, setLiveSessions] = useState([]);
    const fileInputRef = useRef(null);

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            handleFiles(Array.from(e.dataTransfer.files));
        }
    };

    const handleChange = (e) => {
        e.preventDefault();
        if (e.target.files && e.target.files.length > 0) {
            handleFiles(Array.from(e.target.files));
        }
    };

    const handleFiles = (files) => {
        const validFiles = files.filter(file => file.type.startsWith('image/'));
        if (validFiles.length !== files.length) {
            alert('Some files were not images and were ignored.');
        }
        if (validFiles.length > 0) {
            setSelectedFiles(prev => [...prev, ...validFiles]);
        }
    };

    const removeFile = (e, index) => {
        e.stopPropagation();
        setSelectedFiles(prev => prev.filter((_, i) => i !== index));
        if (fileInputRef.current) fileInputRef.current.value = "";
    };

    const handleCreateClass = async () => {
        const name = prompt("Enter a name for the new class:");
        if (!name) return;
        try {
            const newClass = await dbService.createClass(currentUser.uid, name);
            setClasses([newClass, ...classes]);
            setActiveClassId(newClass.id);
        } catch (err) {
            console.error(err);
            alert("Failed to create class.");
        }
    };

    const handleDeleteClass = async (classId, className, e) => {
        e.stopPropagation(); // prevent entering the class

        if (!window.confirm(`Are you sure you want to delete ${className}? This action cannot be undone.`)) {
            return;
        }

        try {
            await dbService.deleteClass(classId);
            setClasses(classes.filter(c => c.id !== classId));

            // If the deleted class was active, go back to overview
            if (activeClassId === classId) {
                setActiveClassId(null);
                setViewMode('overview');
            }
        } catch (err) {
            console.error("Failed to delete class:", err);
            alert("Failed to delete class.");
        }
    };

    const handleGenerateTest = async () => {
        if (selectedFiles.length === 0 && !rawText.trim()) {
            alert("Please provide either screenshots or raw text to generate a test.");
            return;
        }

        if (!activeClassId) {
            alert("Please select a class first to upload into.");
            return;
        }

        setGenerating(true);

        try {
            const aiGeneratedTest = await aiService.generateTest(selectedFiles, rawText);
            const newTestId = `gen-quiz-${Date.now()}`;

            const newTestConfig = {
                testId: newTestId,
                classId: activeClassId,
                title: aiGeneratedTest.title,
                passage: aiGeneratedTest.passage || [],
                questions: aiGeneratedTest.questions.map((q, idx) => ({
                    ...q,
                    id: idx + 1
                }))
            };

            // Intercept and open the editor instead of saving immediately
            setDraftQuiz(newTestConfig);
            setGenerating(false);

        } catch (error) {
            console.error(error);
            alert(`Failed to generate test: ${error.message || 'Unknown error'}`);
            setGenerating(false);
        }
    };

    const handleSaveDraftQuiz = async () => {
        if (!draftQuiz || !activeClassId) return;

        setGenerating(true); // Re-using generating state for the save-spinner
        try {
            await setDoc(doc(db, 'classes', activeClassId, 'tests', draftQuiz.testId), draftQuiz);

            // Update local tests state instantly
            setClassTests([{ id: draftQuiz.testId, ...draftQuiz }, ...classTests]);

            setGenSuccess(true);
            setTimeout(() => {
                setDraftQuiz(null); // Close editor
                setViewMode('overview'); // Return to class dashboard
                setGenSuccess(false);
                setSelectedFiles([]);
                setRawText('');
                setGenerating(false);
            }, 1000);

        } catch (error) {
            console.error("Failed to save drafted quiz:", error);
            alert("Failed to save quiz: " + error.message);
            setGenerating(false);
        }
    };

    const handleDeleteTest = async (testId) => {
        if (!window.confirm("Are you sure you want to delete this quiz? This action cannot be undone.")) return;

        try {
            await dbService.deleteTest(activeClassId, testId);
            setClassTests(classTests.filter(t => t.id !== testId));
        } catch (err) {
            console.error("Failed to delete test:", err);
            alert("Failed to delete quiz.");
        }
    };

    const handleViewSubmissions = async (test) => {
        try {
            const subs = await dbService.getAllSubmissionsForTest(activeClassId, test.id);
            setTestSubmissions(subs);
            setSelectedTest(test);
            setViewMode('submissions');
        } catch (err) {
            console.error("Failed to load submissions:", err);
            alert("Failed to load submissions.");
        }
    };

    const handleViewLiveMonitor = (test) => {
        setSelectedTest(test);
        setViewMode('live_monitor');
    };

    const handleViewSubmissionDetail = (submission) => {
        setSelectedSubmission(submission);
        setViewMode('submission_detail');
    };

    // Auto-subscribe to live sessions and historical submissions when entering live_monitor view
    useEffect(() => {
        let unsubscribeLive = null;
        let unsubscribeSubmissions = null;

        if (viewMode === 'live_monitor' && selectedTest && activeClassId) {
            unsubscribeLive = dbService.subscribeToLiveSessions(activeClassId, selectedTest.id, (data) => {
                setLiveSessions(data);
            });
            unsubscribeSubmissions = dbService.subscribeToSubmissions(activeClassId, selectedTest.id, (data) => {
                setTestSubmissions(data);
            });
        }
        return () => {
            if (unsubscribeLive) unsubscribeLive();
            if (unsubscribeSubmissions) unsubscribeSubmissions();
        };
    }, [viewMode, selectedTest, activeClassId]);

    useEffect(() => {
        const init = async () => {
            try {
                const data = await dbService.getTeacherClasses(currentUser.uid);
                setClasses(data);
                setLoading(false);
            } catch (err) {
                console.error(err);
                setLoading(false);
            }
        };
        init();
    }, [currentUser]);

    useEffect(() => {
        if (!activeClassId) return;
        const loadClassDetails = async () => {
            try {
                const tests = await dbService.getTestsForClass(activeClassId);
                setClassTests(tests);
            } catch (err) {
                console.error("Failed to load tests", err);
            }
        };
        loadClassDetails();
    }, [activeClassId]);

    const activeClass = classes.find(c => c.id === activeClassId);

    return (
        <div className="min-h-screen bg-academic-50 font-sans">
            <header className="bg-white border-b border-academic-200 sticky top-0 z-20">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                        <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center text-white">
                            <Activity size={18} />
                        </div>
                        <span className="text-xl font-serif font-bold text-academic-900">Teacher Console</span>
                    </div>
                    <div className="flex items-center space-x-4">
                        {activeClassId && (
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-academic-500 hover:text-academic-900 mr-2"
                                onClick={() => {
                                    setActiveClassId(null);
                                    setViewMode('overview'); // ensure we revert to main overview type states
                                }}
                            >
                                <ArrowLeft className="h-4 w-4 mr-1" /> Back to Classes
                            </Button>
                        )}

                        {activeClassId && viewMode === 'overview' ? (
                            <Button variant="ghost" size="sm" onClick={() => setViewMode('import')}>
                                <PlusCircle className="h-4 w-4 mr-2" />
                                Create Quiz
                            </Button>
                        ) : activeClassId && viewMode !== 'overview' && viewMode !== 'classes_home' && viewMode !== 'submission_detail' ? (
                            <Button variant="ghost" size="sm" onClick={() => setViewMode('overview')}>
                                Class Dashboard
                            </Button>
                        ) : null}

                        <Button variant="outline" size="sm" onClick={logoutTeacher}>
                            <LogOut className="h-4 w-4 mr-2" /> Sign Out
                        </Button>
                    </div>
                </div>
            </header>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                {activeClassId === null ? (
                    // CLASSES HOMEPAGE VIEW
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">
                        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-2">
                            <div>
                                <h1 className="text-3xl font-serif font-bold text-academic-900">Welcome back!</h1>
                                <p className="text-lg text-academic-500 mt-2">Manage your classes and assignments.</p>
                            </div>
                            <Button size="lg" onClick={handleCreateClass} className="bg-academic-900 hover:bg-academic-800 shadow-sm shrink-0">
                                <FolderPlus className="h-5 w-5 mr-2" />
                                Create New Class
                            </Button>
                        </div>

                        {classes.length === 0 ? (
                            <div className="py-24 text-center bg-white rounded-2xl border border-academic-200 border-dashed shadow-sm">
                                <FolderPlus className="mx-auto h-16 w-16 text-academic-300 mb-6" />
                                <h3 className="text-2xl font-serif font-medium text-academic-900">No classes yet</h3>
                                <p className="text-academic-500 mt-2 mb-8 text-lg max-w-md mx-auto">Click the button above to create your first class and start assigning quizzes to your students.</p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {classes.map(c => (
                                    <Card
                                        key={c.id}
                                        className="group cursor-pointer hover:shadow-md transition-all duration-200 border-transparent hover:border-primary/30 flex flex-col h-full"
                                        onClick={() => {
                                            setActiveClassId(c.id);
                                            setViewMode('overview');
                                        }}
                                    >
                                        <CardHeader className="pb-4 relative group/header">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="p-3 bg-primary/10 text-primary rounded-xl">
                                                    <Users size={24} />
                                                </div>
                                                <div className="flex items-center space-x-2">
                                                    <span className="text-xs font-mono font-bold tracking-widest bg-academic-100 text-academic-600 px-3 py-1 rounded-full uppercase">
                                                        Code: {c.joinCode}
                                                    </span>
                                                    <button
                                                        onClick={(e) => handleDeleteClass(c.id, c.name, e)}
                                                        className="p-1.5 text-academic-400 hover:bg-red-50 hover:text-red-600 rounded-md opacity-0 group-hover:opacity-100 transition-all"
                                                        title={`Delete ${c.name}`}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            </div>
                                            <CardTitle className="text-xl font-bold text-academic-900 group-hover:text-primary transition-colors">
                                                {c.name}
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent className="mt-auto pt-4 border-t border-academic-100 flex items-center justify-between text-sm font-medium text-academic-500 group-hover:text-primary transition-colors">
                                            <span>Manage Classroom</span>
                                            <ChevronRight className="h-5 w-5 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </motion.div>
                ) : viewMode === 'overview' ? (
                    // CLASS DASHBOARD VIEW
                    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-8">

                        <div className="flex items-center justify-between mb-2">
                            <h2 className="text-2xl font-serif font-bold text-academic-900">
                                {activeClass ? activeClass.name : 'Loading...'}
                            </h2>
                        </div>

                        {activeClass ? (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <Card>
                                        <CardContent className="flex items-center p-6 h-full border-l-4 border-l-primary rounded-l-lg">
                                            <div className="p-3 bg-primary/10 text-primary rounded-xl mr-4">
                                                <Users size={24} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-academic-500">Class Join Code</p>
                                                <p className="text-3xl font-mono tracking-widest font-bold text-academic-900">
                                                    {activeClass.joinCode}
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardContent className="flex items-center p-6 h-full border-l-4 border-l-blue-500 rounded-l-lg">
                                            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl mr-4">
                                                <FileText size={24} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-medium text-academic-500">Total Quizzes Uploaded</p>
                                                <p className="text-3xl font-bold text-academic-900">
                                                    {classTests.length}
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </div>

                                <Card>
                                    <CardHeader className="flex flex-row items-center justify-between py-4">
                                        <CardTitle className="text-academic-900">Assigned Quizzes for {activeClass.name}</CardTitle>
                                        <Button size="sm" variant="outline" onClick={() => setViewMode('import')}>
                                            <PlusCircle className="h-4 w-4 mr-2" /> Add a Quiz
                                        </Button>
                                    </CardHeader>
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-academic-50/50 border-y border-academic-100 text-xs uppercase tracking-wider text-academic-500">
                                                    <th className="px-6 py-4 font-medium">Test ID</th>
                                                    <th className="px-6 py-4 font-medium">Title</th>
                                                    <th className="px-6 py-4 font-medium text-center">Questions</th>
                                                    <th className="px-6 py-4 font-medium text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-academic-100">
                                                {classTests.length === 0 ? (
                                                    <tr>
                                                        <td colSpan="3" className="px-6 py-12 text-center text-academic-500">
                                                            No quizzes have been uploaded to this class yet.
                                                        </td>
                                                    </tr>
                                                ) : (
                                                    classTests.map((t) => (
                                                        <tr key={t.id} className="hover:bg-academic-50 transition-colors">
                                                            <td className="px-6 py-4 text-xs font-mono text-academic-400">{t.id}</td>
                                                            <td className="px-6 py-4 text-sm font-medium text-academic-900">{t.title}</td>
                                                            <td className="px-6 py-4 text-sm text-academic-500 text-center">{t.questions?.length}</td>
                                                            <td className="px-6 py-4 text-right space-x-2">
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="text-feedback-success hover:text-feedback-successDark hover:bg-feedback-successLight p-2"
                                                                    onClick={() => handleViewLiveMonitor(t)}
                                                                    title="Live Monitor"
                                                                >
                                                                    <Radio className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="text-primary hover:text-primary-dark hover:bg-primary/10 p-2"
                                                                    onClick={() => handleViewSubmissions(t)}
                                                                    title="View Submissions"
                                                                >
                                                                    <ClipboardList className="h-4 w-4" />
                                                                </Button>
                                                                <Button
                                                                    variant="ghost"
                                                                    size="sm"
                                                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 p-2"
                                                                    onClick={() => handleDeleteTest(t.id)}
                                                                    title="Delete Quiz"
                                                                >
                                                                    <Trash2 className="h-4 w-4" />
                                                                </Button>
                                                            </td>
                                                        </tr>
                                                    ))
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </Card>
                            </>
                        ) : null}

                    </motion.div>
                ) : viewMode === 'submissions' ? (
                    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="max-w-4xl mx-auto mt-8">
                        <div className="flex items-center justify-between mb-6">
                            <h2 className="text-2xl font-serif font-bold text-academic-900">
                                Submissions: {selectedTest?.title}
                            </h2>
                            <Button variant="outline" size="sm" onClick={() => setViewMode('overview')}>
                                Back to Dashboard
                            </Button>
                        </div>

                        <Card>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="bg-academic-50/50 border-b border-academic-100 text-xs uppercase tracking-wider text-academic-500">
                                            <th className="px-6 py-4 font-medium">Student Name</th>
                                            <th className="px-6 py-4 font-medium text-center">Score</th>
                                            <th className="px-6 py-4 font-medium text-right">Submitted At</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-academic-100">
                                        {testSubmissions.length === 0 ? (
                                            <tr>
                                                <td colSpan="3" className="px-6 py-12 text-center text-academic-500">
                                                    No submissions yet for this quiz.
                                                </td>
                                            </tr>
                                        ) : (
                                            testSubmissions.map((sub) => (
                                                <tr key={sub.id} className="hover:bg-academic-50 transition-colors">
                                                    <td className="px-6 py-4 text-sm font-medium text-academic-900">{sub.studentName}</td>
                                                    <td className="px-6 py-4 text-sm font-bold text-center text-primary">{sub.score}%</td>
                                                    <td className="px-6 py-4 text-xs text-academic-500 text-right">{new Date(sub.timestamp).toLocaleString()}</td>
                                                    <td className="px-6 py-4 text-right">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-primary hover:text-primary-dark hover:bg-primary/10"
                                                            onClick={() => handleViewSubmissionDetail(sub)}
                                                        >
                                                            View Details
                                                        </Button>
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </Card>
                    </motion.div>
                ) : viewMode === 'live_monitor' ? (
                    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="max-w-5xl mx-auto mt-8">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center space-x-3">
                                <h2 className="text-2xl font-serif font-bold text-academic-900">
                                    Live Monitor: {selectedTest?.title}
                                </h2>
                                <span className="flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-feedback-successLight text-feedback-successDark border border-feedback-success/20">
                                    <Radio className="w-3 h-3 mr-1 animate-pulse" /> Live Tracking
                                </span>
                            </div>
                            <Button variant="outline" size="sm" onClick={() => setViewMode('overview')}>
                                Back to Dashboard
                            </Button>
                        </div>

                        <div className="mb-6 bg-white p-4 rounded-xl border border-academic-200 shadow-sm flex gap-6">
                            <div>
                                <p className="text-sm text-academic-500 font-medium">Completed Quizzes</p>
                                <p className="text-2xl font-bold text-academic-900">{testSubmissions.length}</p>
                            </div>
                            <div className="border-l border-academic-200 pl-6">
                                <p className="text-sm text-academic-500 font-medium">Currently Active</p>
                                <p className="text-2xl font-bold text-academic-900">
                                    {liveSessions.filter(s => !testSubmissions.some(ts => ts.studentName === s.studentName)).length}
                                </p>
                            </div>
                            <div className="border-l border-academic-200 pl-6">
                                <p className="text-sm text-academic-500 font-medium">Total Participants</p>
                                <p className="text-2xl font-bold text-primary">
                                    {testSubmissions.length + liveSessions.filter(s => !testSubmissions.some(ts => ts.studentName === s.studentName)).length}
                                </p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {selectedTest?.questions.map((q, idx) => {
                                let answeredCount = 0;
                                let correctCount = 0;
                                let incorrectCount = 0;

                                // 1. Count historical completed submissions
                                const completedStudents = new Set();
                                testSubmissions.forEach(sub => {
                                    completedStudents.add(sub.studentName);
                                    if (sub.answers && sub.answers[q.id]) {
                                        answeredCount++;
                                        if (sub.answers[q.id] === q.correctAnswer) {
                                            correctCount++;
                                        } else {
                                            incorrectCount++;
                                        }
                                    }
                                });

                                // 2. Count live, uncompleted sessions
                                liveSessions.forEach(session => {
                                    if (!completedStudents.has(session.studentName)) {
                                        if (session.answers && session.answers[q.id]) {
                                            answeredCount++;
                                            if (session.answers[q.id] === q.correctAnswer) {
                                                correctCount++;
                                            } else {
                                                incorrectCount++;
                                            }
                                        }
                                    }
                                });

                                const correctPercent = answeredCount > 0 ? Math.round((correctCount / answeredCount) * 100) : 0;
                                const incorrectPercent = answeredCount > 0 ? Math.round((incorrectCount / answeredCount) * 100) : 0;
                                const totalParticipants = testSubmissions.length + liveSessions.filter(s => !completedStudents.has(s.studentName)).length;

                                return (
                                    <Card
                                        key={q.id}
                                        className="flex flex-col h-full border-t-4 border-t-primary cursor-pointer hover:shadow-md transition-all group relative overflow-hidden"
                                        onClick={() => { setProjectedQuestion(q); setAnswerRevealed(false); }}
                                    >
                                        <div className="absolute inset-x-0 top-0 h-full bg-primary/5 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
                                        <div className="p-4 border-b border-academic-100 bg-academic-50/50 flex justify-between items-center relative z-10">
                                            <span className="text-xs font-bold text-academic-500 uppercase tracking-widest">
                                                Question {idx + 1}
                                            </span>
                                            <div className="flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                                <Button variant="ghost" size="sm" className="text-primary hover:text-primary-dark hover:bg-primary/10 h-8 text-xs pointer-events-none">
                                                    <Activity className="h-3 w-3 mr-1.5" /> Project
                                                </Button>
                                            </div>
                                        </div>
                                        <div className="px-5 pt-4">
                                            <h3 className="text-sm font-medium text-academic-900 line-clamp-3 group-hover:text-primary transition-colors" title={q.text}>
                                                {q.text}
                                            </h3>
                                        </div>
                                        <CardContent className="flex-1 px-5 pb-5 pt-3 flex flex-col justify-end relative z-10">
                                            <div className="space-y-4">
                                                <div className="flex justify-between items-end">
                                                    <div>
                                                        <p className="text-xs text-academic-500 font-medium mb-1">Correct</p>
                                                        <p className="text-xl font-bold text-feedback-success">{correctPercent}%</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-xs text-academic-500 font-medium mb-1">Incorrect</p>
                                                        <p className="text-lg font-bold text-feedback-error">{incorrectPercent}%</p>
                                                    </div>
                                                </div>

                                                <div className="w-full h-2.5 bg-academic-100 rounded-full overflow-hidden flex">
                                                    <div
                                                        className="h-full bg-feedback-success transition-all duration-500"
                                                        style={{ width: `${correctPercent}%` }}
                                                    />
                                                    <div
                                                        className="h-full bg-feedback-error transition-all duration-500"
                                                        style={{ width: `${incorrectPercent}%` }}
                                                    />
                                                </div>

                                                <div className="flex justify-between text-[11px] uppercase tracking-wider text-academic-500 font-bold pt-3 border-t border-academic-100">
                                                    <span>{answeredCount} Responses</span>
                                                    <span>{totalParticipants} Total</span>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    </motion.div>
                ) : viewMode === 'submission_detail' && selectedTest && selectedSubmission ? (
                    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="max-w-4xl mx-auto mt-8">
                        <div className="flex items-center justify-between mb-6">
                            <div className="flex items-center space-x-4">
                                <Button variant="ghost" size="sm" onClick={() => setViewMode('submissions')} className="p-2 -ml-2 text-academic-500 hover:text-academic-900">
                                    <ArrowLeft className="h-5 w-5" />
                                </Button>
                                <div>
                                    <h2 className="text-2xl font-serif font-bold text-academic-900">
                                        {selectedSubmission.studentName}'s Score: <span className="text-primary">{selectedSubmission.score}%</span>
                                    </h2>
                                    <p className="text-sm text-academic-500 mt-1">Quiz: {selectedTest.title}</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-6">
                            {selectedTest.questions.map((q, idx) => {
                                const studentAnswer = selectedSubmission.answers?.[q.id];
                                const isCorrect = studentAnswer === q.correctAnswer;
                                const isUnanswered = !studentAnswer;

                                return (
                                    <Card key={q.id} className={`border-l-4 ${isCorrect ? 'border-l-feedback-success' : isUnanswered ? 'border-l-academic-300' : 'border-l-feedback-error'}`}>
                                        <CardContent className="p-6">
                                            <div className="flex justify-between items-start mb-4">
                                                <h3 className="text-lg font-medium text-academic-900 w-5/6 leading-snug">
                                                    <span className="text-academic-500 font-bold mr-2">{idx + 1}.</span>
                                                    {q.text}
                                                </h3>
                                                {isCorrect ? (
                                                    <div className="flex items-center text-feedback-success font-bold text-sm bg-feedback-successLight px-3 py-1 rounded-full">
                                                        <CheckCircle2 className="h-4 w-4 mr-1" /> Correct
                                                    </div>
                                                ) : isUnanswered ? (
                                                    <div className="flex items-center text-academic-500 font-bold text-sm bg-academic-100 px-3 py-1 rounded-full">
                                                        Empty
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center text-feedback-error font-bold text-sm bg-feedback-errorLight px-3 py-1 rounded-full">
                                                        <XCircle className="h-4 w-4 mr-1" /> Incorrect
                                                    </div>
                                                )}
                                            </div>

                                            <div className="space-y-3 pl-6">
                                                {q.options.map(opt => {
                                                    const isSelectedByStudent = opt.label === studentAnswer;
                                                    const isTheCorrectAnswer = opt.label === q.correctAnswer;

                                                    let highlightClass = "border-academic-200 bg-white text-academic-700";
                                                    let Icon = null;

                                                    if (isTheCorrectAnswer) {
                                                        highlightClass = "border-feedback-success bg-feedback-successLight text-feedback-successDark font-medium border-2 shadow-sm relative z-10";
                                                        Icon = <CheckCircle2 className="h-5 w-5 text-feedback-success" />;
                                                    } else if (isSelectedByStudent && !isTheCorrectAnswer) {
                                                        highlightClass = "border-feedback-error bg-feedback-errorLight text-feedback-errorDark font-medium blur-[0.5px] opacity-80 decoration-red-400 line-through";
                                                        Icon = <XCircle className="h-5 w-5 text-feedback-error" />;
                                                    } else {
                                                        highlightClass = "border-academic-200 bg-academic-50 opacity-60 text-academic-500";
                                                    }

                                                    return (
                                                        <div key={opt.label} className={`w-full text-left p-3 rounded-xl border-2 flex items-center justify-between ${highlightClass}`}>
                                                            <div className="flex items-center">
                                                                <span className={`flex items-center justify-center h-7 w-7 rounded-lg mr-4 text-xs font-bold ${isTheCorrectAnswer ? 'bg-feedback-success text-white' : isSelectedByStudent ? 'bg-feedback-error text-white' : 'bg-academic-200 text-academic-600'}`}>
                                                                    {opt.label}
                                                                </span>
                                                                <span className="text-sm">{opt.text}</span>
                                                            </div>
                                                            {Icon}
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </CardContent>
                                    </Card>
                                );
                            })}
                        </div>
                    </motion.div>
                ) : (
                    <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} className="max-w-3xl mx-auto mt-8">
                        <Card>
                            <CardHeader>
                                <CardTitle>Upload Content to: {activeClass?.name}</CardTitle>
                                <p className="text-sm text-academic-500 mt-1">
                                    Paste a reading passage or screenshot. The AI engine will parse the material and assign it to <strong>{activeClass?.name}</strong>.
                                </p>
                            </CardHeader>
                            <CardContent className="p-6 space-y-6">
                                <input
                                    ref={fileInputRef}
                                    type="file"
                                    accept="image/*"
                                    multiple
                                    className="hidden"
                                    onChange={handleChange}
                                />
                                <div
                                    className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-colors ${dragActive ? 'border-primary bg-primary-light' :
                                        selectedFiles.length > 0 ? 'border-feedback-success bg-feedback-successLight' :
                                            'border-academic-300 bg-academic-50 hover:bg-academic-100'
                                        }`}
                                    onDragEnter={handleDrag}
                                    onDragLeave={handleDrag}
                                    onDragOver={handleDrag}
                                    onDrop={handleDrop}
                                    onClick={() => fileInputRef.current?.click()}
                                >
                                    {selectedFiles.length > 0 ? (
                                        <div className="flex flex-col items-center">
                                            <div className="flex flex-wrap justify-center gap-4 mb-3">
                                                {selectedFiles.map((file, idx) => (
                                                    <div key={idx} className="relative group">
                                                        <div className="h-16 w-16 bg-white rounded-xl shadow-sm border border-academic-200 flex items-center justify-center">
                                                            <img src={URL.createObjectURL(file)} alt="Preview" className="h-14 w-14 object-cover rounded-lg" />
                                                        </div>
                                                        <button
                                                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                                                            onClick={(e) => removeFile(e, idx)}
                                                        >
                                                            <X className="h-3 w-3" />
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                            <p className="text-academic-900 font-medium text-sm">{selectedFiles.length} file{selectedFiles.length !== 1 ? 's' : ''} selected</p>
                                            <Button variant="outline" size="sm" className="mt-4" onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedFiles([]);
                                            }}>
                                                <X className="h-4 w-4 mr-1" /> Clear All
                                            </Button>
                                        </div>
                                    ) : (
                                        <>
                                            <UploadCloud className={`h-10 w-10 mx-auto mb-4 ${dragActive ? 'text-primary' : 'text-academic-400'}`} />
                                            <p className="text-academic-700 font-medium tracking-tight">
                                                {dragActive ? "Drop images here..." : "Upload Screenshots or Paste Images"}
                                            </p>
                                            <p className="text-xs text-academic-500 mt-1">PNG, JPG up to 10MB</p>
                                        </>
                                    )}
                                </div>

                                <div className="flex items-center">
                                    <div className="flex-1 h-px bg-academic-200"></div>
                                    <span className="px-4 text-xs font-semibold text-academic-400 uppercase">OR</span>
                                    <div className="flex-1 h-px bg-academic-200"></div>
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-academic-700 mb-2">Paste Raw Text Input</label>
                                    <textarea
                                        value={rawText}
                                        onChange={(e) => setRawText(e.target.value)}
                                        className="w-full h-32 p-3 rounded-xl border border-academic-300 focus:ring-2 focus:ring-primary focus:border-primary outline-none text-sm resize-none"
                                        placeholder="Enter the reading passage here..."
                                    ></textarea>
                                </div>

                                <Button
                                    className="w-full transition-all"
                                    size="lg"
                                    onClick={handleGenerateTest}
                                    disabled={generating || genSuccess || (selectedFiles.length === 0 && !rawText.trim()) || !activeClassId}
                                    variant={genSuccess ? 'success' : 'primary'}
                                >
                                    {generating ? (
                                        <div className="flex items-center">
                                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                                            Parsing Content...
                                        </div>
                                    ) : genSuccess ? (
                                        <>Quiz Generated Successfully!</>
                                    ) : (
                                        <><PlusCircle className="mr-2 h-5 w-5" /> Generate Test & Assign</>
                                    )}
                                </Button>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </main>

            {/* Quiz Editor Modal */}
            {draftQuiz && (
                <div className="fixed inset-0 z-[60] bg-academic-50 overflow-y-auto flex flex-col">
                    <div className="sticky top-0 z-10 bg-white border-b border-academic-200 px-6 py-4 flex justify-between items-center shadow-sm">
                        <div className="flex items-center space-x-3">
                            <Activity className="h-6 w-6 text-primary" />
                            <h2 className="text-2xl font-serif font-bold text-academic-900">Quiz Editor</h2>
                        </div>
                        <div className="flex items-center space-x-4">
                            <Button
                                variant="outline"
                                onClick={() => {
                                    if (window.confirm('Are you sure you want to discard this generated quiz?')) {
                                        setDraftQuiz(null);
                                    }
                                }}
                                disabled={generating || genSuccess}
                            >
                                Discard Draft
                            </Button>
                            <Button
                                onClick={handleSaveDraftQuiz}
                                disabled={generating || genSuccess}
                                variant={genSuccess ? 'success' : 'primary'}
                            >
                                {generating ? 'Saving...' : genSuccess ? 'Saved!' : 'Save & Assign to Class'}
                            </Button>
                        </div>
                    </div>

                    <div className="max-w-5xl mx-auto w-full p-6 md:p-8 space-y-8 pb-32">
                        {/* Title Editor */}
                        <Card className="border-t-4 border-t-primary">
                            <CardHeader className="pb-4">
                                <CardTitle className="text-lg text-academic-500 uppercase tracking-wider text-xs">Quiz Title</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <input
                                    type="text"
                                    value={draftQuiz.title}
                                    onChange={(e) => setDraftQuiz({ ...draftQuiz, title: e.target.value })}
                                    className="w-full text-2xl font-bold p-3 border-2 border-academic-200 rounded-xl focus:border-primary focus:ring-0 outline-none transition-colors"
                                />
                            </CardContent>
                        </Card>

                        {/* Passage Editor removed — passages are now edited per-question below */}

                        {/* Questions Editor */}
                        <div className="space-y-6">
                            <h3 className="text-xl font-serif font-bold text-academic-900 border-b-2 border-academic-200 pb-2">Questions ({draftQuiz.questions.length})</h3>

                            {draftQuiz.questions.map((q, qIndex) => (
                                <Card key={qIndex} className="relative overflow-visible">
                                    <div className="absolute -left-4 top-6 bg-primary text-white font-bold h-8 w-8 rounded-full flex items-center justify-center shadow-md">
                                        {qIndex + 1}
                                    </div>
                                    <CardContent className="p-6 md:p-8 space-y-6 ml-2">

                                        {/* Per-Question Passage */}
                                        <div>
                                            <label className="block text-xs font-bold text-academic-500 uppercase tracking-wider mb-2">Reading Passage for this Question</label>
                                            <textarea
                                                value={(q.passage || []).join('\n\n')}
                                                onChange={(e) => {
                                                    const updatedQuestions = [...draftQuiz.questions];
                                                    const newPassage = e.target.value.split('\n\n').filter(p => p.trim() !== '');
                                                    updatedQuestions[qIndex] = { ...q, passage: newPassage };
                                                    setDraftQuiz({ ...draftQuiz, questions: updatedQuestions });
                                                }}
                                                className="w-full h-40 p-3 text-base font-serif leading-relaxed border-2 border-academic-200 rounded-xl focus:border-primary focus:ring-0 outline-none transition-colors resize-y"
                                                placeholder="Reading passage for this question..."
                                            />
                                        </div>

                                        {/* Question Text */}
                                        <div>
                                            <label className="block text-xs font-bold text-academic-500 uppercase tracking-wider mb-2">Question Text</label>
                                            <textarea
                                                value={q.text}
                                                onChange={(e) => {
                                                    const updatedQuestions = [...draftQuiz.questions];
                                                    updatedQuestions[qIndex] = { ...q, text: e.target.value };
                                                    setDraftQuiz({ ...draftQuiz, questions: updatedQuestions });
                                                }}
                                                className="w-full p-3 font-medium text-lg border-2 border-academic-200 rounded-xl focus:border-primary focus:ring-0 outline-none transition-colors resize-y min-h-[100px]"
                                            />
                                        </div>

                                        {/* Answer Options */}
                                        <div className="space-y-3">
                                            <div className="flex justify-between items-end mb-2">
                                                <label className="block text-xs font-bold text-academic-500 uppercase tracking-wider">Answer Options</label>
                                                <label className="block text-xs font-bold text-primary uppercase tracking-wider text-right w-32">Correct Answer</label>
                                            </div>

                                            {q.options.map((opt, oIndex) => {
                                                const isCorrect = opt.label === q.correctAnswer;
                                                return (
                                                    <div key={oIndex} className={`flex items-start gap-4 p-3 rounded-lg border-2 transition-colors ${isCorrect ? 'border-feedback-success bg-feedback-successLight/30' : 'border-academic-100 bg-academic-50'}`}>
                                                        <div className={`mt-2 flex-shrink-0 flex items-center justify-center h-8 w-8 rounded font-bold ${isCorrect ? 'bg-feedback-success text-white' : 'bg-academic-200 text-academic-600'}`}>
                                                            {opt.label}
                                                        </div>
                                                        <input
                                                            type="text"
                                                            value={opt.text}
                                                            onChange={(e) => {
                                                                const updatedQuestions = [...draftQuiz.questions];
                                                                const updatedOptions = [...q.options];
                                                                updatedOptions[oIndex] = { ...opt, text: e.target.value };
                                                                updatedQuestions[qIndex] = { ...q, options: updatedOptions };
                                                                setDraftQuiz({ ...draftQuiz, questions: updatedQuestions });
                                                            }}
                                                            className={`flex-1 p-2 bg-white border border-academic-200 rounded-lg focus:border-primary focus:ring-0 outline-none ${isCorrect ? 'font-medium text-feedback-successDark' : ''}`}
                                                        />
                                                        <div className="flex flex-col items-center justify-center pt-1 w-32 shrink-0">
                                                            <input
                                                                type="radio"
                                                                name={`correct-${qIndex}`}
                                                                checked={isCorrect}
                                                                onChange={() => {
                                                                    const updatedQuestions = [...draftQuiz.questions];
                                                                    updatedQuestions[qIndex] = { ...q, correctAnswer: opt.label };
                                                                    setDraftQuiz({ ...draftQuiz, questions: updatedQuestions });
                                                                }}
                                                                className="h-5 w-5 text-feedback-success focus:ring-feedback-success border-gray-300 mb-1 cursor-pointer"
                                                            />
                                                            <span className="text-[10px] uppercase font-bold text-academic-400">Mark Correct</span>
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>

                                        {/* Explanation */}
                                        <div className="pt-4 mt-4 border-t border-academic-100">
                                            <label className="block text-xs font-bold text-academic-500 uppercase tracking-wider mb-2 flex items-center">
                                                <LibraryBig className="h-4 w-4 mr-2" /> Explanation
                                            </label>
                                            <textarea
                                                value={q.explanation}
                                                onChange={(e) => {
                                                    const updatedQuestions = [...draftQuiz.questions];
                                                    updatedQuestions[qIndex] = { ...q, explanation: e.target.value };
                                                    setDraftQuiz({ ...draftQuiz, questions: updatedQuestions });
                                                }}
                                                className="w-full p-3 text-sm text-academic-700 bg-blue-50/50 border border-blue-100 rounded-xl focus:border-blue-300 focus:ring-0 outline-none transition-colors resize-y h-24"
                                            />
                                        </div>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Projected Question Modal */}
            {projectedQuestion && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-academic-900/60 backdrop-blur-sm p-4 md:p-8"
                    onClick={() => setProjectedQuestion(null)}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-academic-50 w-full max-w-7xl h-full max-h-[90vh] rounded-2xl shadow-2xl overflow-hidden flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="bg-primary px-6 py-4 flex justify-between items-center shrink-0">
                            <h2 className="text-white font-serif font-bold text-xl flex items-center">
                                <Activity className="h-5 w-5 mr-3" /> Projected Question
                            </h2>
                            <div className="flex items-center gap-3">
                                {!answerRevealed ? (
                                    <button
                                        onClick={() => setAnswerRevealed(true)}
                                        className="bg-white text-primary font-bold px-4 py-2 rounded-lg text-sm hover:bg-academic-50 transition-colors shadow"
                                    >
                                        Reveal Answer
                                    </button>
                                ) : (
                                    <span className="text-white/80 font-medium text-sm flex items-center gap-2">
                                        <CheckCircle2 className="h-4 w-4" /> Answer Revealed
                                    </span>
                                )}
                                <button
                                    onClick={() => setProjectedQuestion(null)}
                                    className="text-white/80 hover:text-white hover:bg-white/20 p-2 rounded-full transition-colors"
                                >
                                    <X className="h-6 w-6" />
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 flex flex-col md:flex-row min-h-0 bg-[#fafaf9]">
                            {/* Left: Reading Pane — uses the projected question's own passage */}
                            {(() => {
                                // Filter out empty strings that old-schema quizzes may have stored
                                const passageParagraphs = (projectedQuestion.passage || []).filter(p => p && p.trim());
                                if (passageParagraphs.length === 0) return null;
                                return (
                                    <div className="w-full md:w-1/2 p-6 md:p-8 overflow-y-auto border-b md:border-b-0 md:border-r border-academic-200 custom-scrollbar">
                                        <h2 className="text-sm font-bold text-academic-400 uppercase tracking-widest mb-6">Reading Passage</h2>
                                        <div className="prose prose-stone max-w-none text-academic-800 leading-relaxed space-y-4">
                                            {passageParagraphs.map((paragraph, i) => (
                                                <p key={i} className="text-lg leading-loose group">
                                                    <span className="font-serif block hover:bg-academic-100/50 p-2 rounded-lg transition-colors cursor-text">
                                                        {paragraph}
                                                    </span>
                                                </p>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })()}

                            {/* Right: Question Pane */}
                            <div className="w-full md:flex-1 p-6 md:p-12 overflow-y-auto flex flex-col justify-center bg-white custom-scrollbar">
                                <div className="max-w-2xl mx-auto w-full">
                                    <h2 className="text-3xl md:text-3xl font-serif font-bold text-academic-900 mb-10 leading-relaxed text-left">
                                        {projectedQuestion.text}
                                    </h2>

                                    <div className="space-y-4 w-full">
                                        {projectedQuestion.options.map(opt => {
                                            const isCorrect = answerRevealed && opt.label === projectedQuestion.correctAnswer;

                                            return (
                                                <div
                                                    key={opt.label}
                                                    className={`
                                                        w-full text-left p-6 rounded-xl border-2 flex items-center justify-between transition-all duration-300
                                                        ${isCorrect
                                                            ? 'border-feedback-success bg-feedback-successLight text-feedback-successDark shadow-md scale-[1.02]'
                                                            : 'border-academic-200 bg-white text-academic-700'
                                                        }
                                                    `}
                                                >
                                                    <div className="flex items-center">
                                                        <span className={`
                                                            flex items-center justify-center h-10 w-10 md:h-12 md:w-12 rounded-lg mr-6 text-xl font-bold
                                                            ${isCorrect ? 'bg-feedback-success text-white' : 'bg-academic-100 text-academic-500'}
                                                        `}>
                                                            {opt.label}
                                                        </span>
                                                        <span className="text-lg md:text-xl font-medium">{opt.text}</span>
                                                    </div>
                                                    {isCorrect && (
                                                        <CheckCircle2 className="h-8 w-8 text-feedback-success animate-in zoom-in duration-300 shrink-0 ml-4" />
                                                    )}
                                                </div>
                                            )
                                        })}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )
            }
        </div >
    );
}
