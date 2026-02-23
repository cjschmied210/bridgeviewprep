import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { dbService } from '../services/db';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { BookOpen, LogIn, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function Landing() {
    const [view, setView] = useState('student'); // 'student' | 'teacher'
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const { loginTeacher, loginStudent } = useAuth();
    const navigate = useNavigate();

    // Student Form
    const [joinCode, setJoinCode] = useState('');
    const [studentName, setStudentName] = useState('');

    // Teacher Form
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');

    const handleStudentJoin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const cls = await dbService.joinClass(joinCode.toUpperCase());
            loginStudent(cls.id, studentName);
            navigate('/student-dash');
        } catch (err) {
            setError(err.message || 'Failed to join class. Check code.');
        } finally {
            setLoading(false);
        }
    };

    const handleTeacherLogin = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            await loginTeacher(email, password);
            navigate('/dashboard');
        } catch (err) {
            setError('Invalid credentials.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center p-4 bg-academic-50 relative overflow-hidden">
            {/* Background decorations */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-feedback-success/10 rounded-full blur-3xl pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="glass-panel w-full max-w-md p-8 relative z-10"
            >
                <div className="flex flex-col items-center mb-8">
                    <div className="h-14 w-14 bg-primary text-white rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-primary/30">
                        <BookOpen size={28} />
                    </div>
                    <h1 className="text-3xl font-serif font-bold text-academic-900 tracking-tight">BridgeviewPrep</h1>
                    <p className="text-academic-500 mt-2 text-center text-sm">
                        Engage, learn, and test your knowledge.
                    </p>
                </div>

                <div className="flex bg-academic-100 rounded-xl p-1 mb-8">
                    <button
                        onClick={() => setView('student')}
                        className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${view === 'student' ? 'bg-white shadow-sm text-academic-900' : 'text-academic-500 hover:text-academic-700'}`}
                    >
                        Student Join
                    </button>
                    <button
                        onClick={() => setView('teacher')}
                        className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${view === 'teacher' ? 'bg-white shadow-sm text-academic-900' : 'text-academic-500 hover:text-academic-700'}`}
                    >
                        Teacher Login
                    </button>
                </div>

                {error && (
                    <div className="bg-feedback-errorLight text-feedback-error p-3 rounded-lg mb-6 text-sm border border-red-100">
                        {error}
                    </div>
                )}

                <AnimatePresence mode="wait">
                    {view === 'student' ? (
                        <motion.form
                            key="student-form"
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 20 }}
                            transition={{ duration: 0.2 }}
                            onSubmit={handleStudentJoin} className="space-y-4"
                        >
                            <div>
                                <label className="block text-sm font-medium text-academic-700 mb-1.5">Class Code</label>
                                <Input
                                    required
                                    placeholder="e.g. ROMAN-2026"
                                    value={joinCode}
                                    onChange={(e) => setJoinCode(e.target.value)}
                                    className="uppercase font-mono tracking-wider"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-academic-700 mb-1.5">Your Name</label>
                                <Input
                                    required
                                    placeholder="First Last"
                                    value={studentName}
                                    onChange={(e) => setStudentName(e.target.value)}
                                />
                            </div>
                            <Button type="submit" size="lg" className="w-full mt-2" disabled={loading}>
                                {loading ? 'Joining...' : 'Enter Classroom'} <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                        </motion.form>
                    ) : (
                        <motion.form
                            key="teacher-form"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            transition={{ duration: 0.2 }}
                            onSubmit={handleTeacherLogin} className="space-y-4"
                        >
                            <div>
                                <label className="block text-sm font-medium text-academic-700 mb-1.5">Email</label>
                                <Input
                                    required
                                    type="email"
                                    placeholder="teacher@school.edu"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-academic-700 mb-1.5">Password</label>
                                <Input
                                    required
                                    type="password"
                                    placeholder="••••••••"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                />
                            </div>
                            <Button type="submit" size="lg" className="w-full mt-2" disabled={loading}>
                                {loading ? 'Authenticating...' : 'Sign In'} <LogIn className="ml-2 h-5 w-5" />
                            </Button>
                            <p className="text-xs text-center text-academic-400 mt-4">
                                Mock login: just press Sign In.
                            </p>
                        </motion.form>
                    )}
                </AnimatePresence>
            </motion.div>
        </div>
    );
}
