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
        <div className="flex-1 flex items-center justify-center p-4 relative overflow-hidden bg-cover bg-center" style={{ backgroundImage: "url('/campus_bg.png')" }}>
            {/* Soft gradient wash over the background image */}
            <div className="absolute inset-0 bg-white/70 backdrop-blur-[2px]"></div>

            {/* Background decorations */}
            <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-feedback-success/20 rounded-full blur-3xl pointer-events-none" />

            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                className="glass-panel w-full max-w-md p-8 relative z-10 shadow-2xl shadow-academic-200/50"
            >
                <div className="flex flex-col items-center mb-8">
                    <div className="h-16 w-16 bg-primary text-white rounded-full flex items-center justify-center mb-5 shadow-lg shadow-primary/40 ring-4 ring-primary/10">
                        <BookOpen size={32} />
                    </div>
                    <h1 className="text-4xl font-serif font-extrabold text-blue-950 tracking-tight">BridgeviewPrep</h1>
                    <p className="text-academic-500 mt-2 text-center text-sm font-medium">
                        Engage, learn, and test your knowledge.
                    </p>
                </div>

                <div className="flex bg-academic-100 rounded-xl p-1 mb-8 relative">
                    <button
                        onClick={() => setView('student')}
                        className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-300 ${view === 'student' ? 'bg-white shadow-[0_4px_12px_theme(colors.amber.500/0.15)] text-blue-950 border-b-2 border-amber-500' : 'text-academic-500 hover:text-academic-700'}`}
                    >
                        Student Join
                    </button>
                    <button
                        onClick={() => setView('teacher')}
                        className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all duration-300 ${view === 'teacher' ? 'bg-white shadow-[0_4px_12px_theme(colors.amber.500/0.15)] text-blue-950 border-b-2 border-amber-500' : 'text-academic-500 hover:text-academic-700'}`}
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
