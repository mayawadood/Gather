import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Use the current hostname as authDomain in production so Firebase's auth
// redirect stays same-site (avoids Safari ITP clearing sessionStorage on
// cross-site redirects through firebaseapp.com).
const authDomain = typeof window !== 'undefined' && window.location.hostname !== 'localhost'
  ? window.location.hostname
  : import.meta.env.VITE_FIREBASE_AUTH_DOMAIN;

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

// Expose whether the app is configured so the UI can show a setup screen
export const isFirebaseConfigured = Boolean(
  firebaseConfig.apiKey && firebaseConfig.projectId
);

const app = initializeApp(isFirebaseConfigured ? firebaseConfig : {
  apiKey: 'placeholder', authDomain: 'placeholder', projectId: 'placeholder',
  storageBucket: 'placeholder', messagingSenderId: 'placeholder', appId: 'placeholder',
});

export const auth = getAuth(app);
export const db = getFirestore(app);

export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope('https://www.googleapis.com/auth/calendar.events');
