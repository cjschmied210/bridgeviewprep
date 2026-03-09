import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";


if (!import.meta.env.VITE_FIREBASE_API_KEY) {
    const availableKeys = Object.keys(import.meta.env).filter(key => key.startsWith('VITE_'));
    console.error("VITE_FIREBASE_API_KEY is missing! Available VITE_ keys:", availableKeys);
    console.error("Please ensure you have added VITE_FIREBASE_API_KEY to Vercel and triggered a REDEPLOY.");
}

const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
