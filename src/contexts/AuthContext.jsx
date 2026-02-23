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

    useEffect(() => {
        // Check local storage for student session
        const savedStudent = sessionStorage.getItem('studentSession');
        if (savedStudent) setStudentSession(JSON.parse(savedStudent));

        // Listen to Firebase Auth state for teacher
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            setCurrentUser(user);
            setLoading(false);
        });

        return unsubscribe;
    }, []);

    const loginTeacher = async (email, password) => {
        try {
            await signInWithEmailAndPassword(auth, email, password);
        } catch (error) {
            if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
                // Auto-register for testing purposes if user doesn't exist
                await createUserWithEmailAndPassword(auth, email, password);
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
            {!loading && children}
        </AuthContext.Provider>
    );
};
