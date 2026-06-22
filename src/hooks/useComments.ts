// Feature 1: Comments
import { useState, useEffect } from 'react';
import {
  collection, query, orderBy, onSnapshot, addDoc, serverTimestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';

export interface Comment {
  id: string;
  userId: string;
  userName: string;
  photoURL: string;
  text: string;
  createdAt: number;
}

export function useComments(eventId: string | null) {
  const [comments, setComments] = useState<Comment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!eventId) { setLoading(false); return; }
    const q = query(
      collection(db, 'events', eventId, 'comments'),
      orderBy('createdAt', 'asc')
    );
    const unsub = onSnapshot(q, snap => {
      setComments(snap.docs.map(d => {
        const data = d.data();
        return {
          id: d.id,
          userId: data.userId,
          userName: data.userName,
          photoURL: data.photoURL,
          text: data.text,
          createdAt: data.createdAt?.toMillis?.() ?? Date.now(),
        };
      }));
      setLoading(false);
    });
    return unsub;
  }, [eventId]);

  async function postComment(eventId: string, userId: string, userName: string, photoURL: string, text: string) {
    await addDoc(collection(db, 'events', eventId, 'comments'), {
      userId,
      userName,
      photoURL,
      text: text.trim(),
      createdAt: serverTimestamp(),
    });
  }

  return { comments, loading, postComment };
}
