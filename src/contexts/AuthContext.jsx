import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../lib/firebase';
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signOut,
    onAuthStateChanged
} from 'firebase/auth';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [currentUser, setCurrentUser] = useState(null);
    const [studentSession, setStudentSession] = useState(null);
    const [loading, setLoading] = useState(true);
    const [authError, setAuthError] = useState(null);


    useEffect(() => {
        // Check local storage for student session
        const savedStudent = sessionStorage.getItem('studentSession');
        if (savedStudent) setStudentSession(JSON.parse(savedStudent));

        // Listen to Firebase Auth state for teacher
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
            setLoading(false);
        }, (error) => {
            setAuthError(error.message);
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const loginTeacher = async (email, password) => {
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential' || error.code === 'auth/wrong-password') {
                // Auto-register for testing purposes if user doesn't exist or we want to reset
                try {
                    await createUserWithEmailAndPassword(auth, email, password);
                } catch (createError) {
                    throw createError;
                }
            } else {
                throw error;
            }
        }
    };

    const logoutTeacher = () => {
        return signOut(auth);
    };

    const loginStudent = (classId, studentName) => {
        const session = { classId, studentName, role: 'student' };
        setStudentSession(session);
        sessionStorage.setItem('studentSession', JSON.stringify(session));
    };

    const logoutStudent = () => {
        setStudentSession(null);
        sessionStorage.removeItem('studentSession');
    };

    const value = {
        currentUser,
        studentSession,
        loginTeacher,
        logoutTeacher,
        loginStudent,
        logoutStudent,
    };

    return (
        <AuthContext.Provider value={value}>
            {loading ? (
                <div className="flex items-center justify-center min-h-screen">
                    <p className="text-academic-500">Loading BridgeviewPrep...</p>
                </div>
            ) : authError ? (
                <div className="flex flex-col items-center justify-center min-h-screen p-4">
                    <div className="bg-feedback-errorLight text-feedback-error p-4 rounded-xl border border-red-200 max-w-md text-center">
                        <h2 className="text-lg font-bold mb-2">Authentication Error</h2>
                        <p className="text-sm mb-4">{authError}</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="bg-feedback-error text-white px-4 py-2 rounded-lg text-sm font-medium"
                        >
                            Retry
                        </button>
                    </div>
                </div>
            ) : (
                children
            )}
        </AuthContext.Provider>
    );
};
