import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCvdqkpgvgzQx7GgFIVGqgyNZ8YgvO3zYg",
    authDomain: "quizapp-47b13.firebaseapp.com",
    projectId: "quizapp-47b13",
    storageBucket: "quizapp-47b13.firebasestorage.app",
    messagingSenderId: "588560219356",
    appId: "1:588560219356:web:1cf01fb188c7673cd14819",
    measurementId: "G-PW57QSXM66"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
