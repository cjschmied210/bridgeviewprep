import { db } from '../lib/firebase';
import {
    collection,
    doc,
    getDoc,
    getDocs,
    setDoc,
    query,
    where,
    onSnapshot,
    addDoc,
    serverTimestamp,
    deleteDoc
} from 'firebase/firestore';

export const dbService = {
    // Teacher calls
    getTeacherClasses: async (teacherId) => {
        const q = query(collection(db, 'classes'), where('teacherId', '==', teacherId));
        const snapshot = await getDocs(q);

        // Auto-create a demo class if none exists for the teacher (for testing the template UI)
        if (snapshot.empty) {
            const demoClass = {
                joinCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
                name: "Demo Class",
                teacherId: teacherId,
                activeTestId: "demo-quiz-1",
                createdAt: serverTimestamp()
            };
            const docRef = await addDoc(collection(db, 'classes'), demoClass);

            const demoTestConfig = {
                testId: "demo-quiz-1",
                classId: docRef.id,
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
            await setDoc(doc(db, 'classes', docRef.id, 'tests', 'demo-quiz-1'), demoTestConfig);

            return [{ id: docRef.id, ...demoClass }];
        }

        const classesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Sort descending locally to ensure the most recently created class is classes[0]
        classesData.sort((a, b) => {
            if (!a.createdAt) return 1;
            if (!b.createdAt) return -1;
            // Handle both Firestore Timestamp objects and regular dates/numbers if they exist
            const timeA = a.createdAt.toMillis ? a.createdAt.toMillis() : a.createdAt;
            const timeB = b.createdAt.toMillis ? b.createdAt.toMillis() : b.createdAt;
            return timeB - timeA;
        });

        return classesData;
    },

    createClass: async (teacherId, className) => {
        const newClass = {
            joinCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
            name: className,
            teacherId: teacherId,
            createdAt: serverTimestamp()
        };
        const docRef = await addDoc(collection(db, 'classes'), newClass);
        return { id: docRef.id, ...newClass };
    },

    deleteClass: async (classId) => {
        await deleteDoc(doc(db, 'classes', classId));
    },

    // Student calls
    joinClass: async (joinCode) => {
        const q = query(collection(db, 'classes'), where('joinCode', '==', joinCode));
        const snapshot = await getDocs(q);
        if (snapshot.empty) throw new Error("Invalid join code.");
        const docData = snapshot.docs[0];
        return { id: docData.id, ...docData.data() };
    },

    getTestsForClass: async (classId) => {
        const testsRef = collection(db, 'classes', classId, 'tests');
        const snapshot = await getDocs(testsRef);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    },

    deleteTest: async (classId, testId) => {
        await deleteDoc(doc(db, 'classes', classId, 'tests', testId));
    },

    getTestConfig: async (classId, testId) => {
        const testDoc = await getDoc(doc(db, 'classes', classId, 'tests', testId));
        if (!testDoc.exists()) throw new Error("Test not found.");
        return testDoc.data();
    },

    submitStudentTest: async (classId, testId, studentName, score, answers) => {
        const submissionsRef = collection(db, 'classes', classId, 'tests', testId, 'submissions');
        const submission = {
            studentName,
            score,
            answers,
            timestamp: new Date().toISOString()
        };
        const docRef = await addDoc(submissionsRef, submission);
        return { id: docRef.id, ...submission };
    },

    getStudentSubmissionsForTest: async (classId, testId, studentName) => {
        const submissionsRef = collection(db, 'classes', classId, 'tests', testId, 'submissions');
        const q = query(submissionsRef, where('studentName', '==', studentName));
        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        // Sort ascending by time (Attempt 1, Attempt 2...)
        data.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
        return data;
    },

    getAllSubmissionsForTest: async (classId, testId) => {
        const submissionsRef = collection(db, 'classes', classId, 'tests', testId, 'submissions');
        const snapshot = await getDocs(submissionsRef);
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp)); // Newest first
        return data;
    },

    // Real-time listener for Teacher Dashboard
    subscribeToSubmissions: (classId, testId, callback) => {
        const submissionsRef = collection(db, 'classes', classId, 'tests', testId, 'submissions');

        const unsubscribe = onSnapshot(submissionsRef, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            // Sort by descending timestamp locally
            data.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
            callback(data);
        });

        return unsubscribe;
    },

    // Teacher Live Monitor calls
    updateLiveSession: async (classId, testId, studentName, currentQ, answers) => {
        const liveSessionRef = doc(db, 'classes', classId, 'tests', testId, 'live_sessions', studentName);
        await setDoc(liveSessionRef, {
            studentName,
            currentQ,
            answers,
            lastUpdated: serverTimestamp()
        }, { merge: true });
    },

    subscribeToLiveSessions: (classId, testId, callback) => {
        const liveSessionsRef = collection(db, 'classes', classId, 'tests', testId, 'live_sessions');
        const unsubscribe = onSnapshot(liveSessionsRef, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));

            // Sort locally (not required but good for consistent ordering)
            data.sort((a, b) => {
                const timeA = a.lastUpdated?.toMillis?.() || 0;
                const timeB = b.lastUpdated?.toMillis?.() || 0;
                return timeB - timeA;
            });
            callback(data);
        });

        return unsubscribe;
    }
};
