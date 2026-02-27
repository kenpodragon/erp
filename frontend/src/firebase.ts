import { initializeApp, getApp, getApps } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Defensive check: If API key is missing, don't initialize but don't crash the whole JS bundle
let auth: any = null;
let googleProvider: any = null;

if (firebaseConfig.apiKey) {
    try {
        const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
        auth = getAuth(app);
        googleProvider = new GoogleAuthProvider();
        console.log("Firebase initialized successfully");
    } catch (error) {
        console.error("Firebase initialization error:", error);
    }
} else {
    console.warn("Firebase API Key is missing. SSO will not work.");
}

export { auth, googleProvider };
