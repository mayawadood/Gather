import { useState, useEffect } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db, googleProvider } from '../lib/firebase';

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      setLoading(false);
    });
    return unsub;
  }, []);

  async function signInWithGoogle() {
    const result = await signInWithPopup(auth, googleProvider);
    const { GoogleAuthProvider } = await import('firebase/auth');
    const credential = GoogleAuthProvider.credentialFromResult(result);
    const token = credential?.accessToken ?? null;
    setAccessToken(token);
    if (token) sessionStorage.setItem('gcal_token', token);

    // Upsert user doc
    await setDoc(doc(db, 'users', result.user.uid), {
      uid: result.user.uid,
      displayName: result.user.displayName,
      email: result.user.email,
      photoURL: result.user.photoURL,
    }, { merge: true });

    return result.user;
  }

  function getAccessToken(): string | null {
    return accessToken || sessionStorage.getItem('gcal_token');
  }

  async function logout() {
    sessionStorage.removeItem('gcal_token');
    setAccessToken(null);
    await signOut(auth);
  }

  return { user, loading, signInWithGoogle, logout, getAccessToken };
}
