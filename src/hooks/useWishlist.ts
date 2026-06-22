// Feature 7: Wishlist
import { useState, useEffect } from 'react';
import {
  collection, query, where, onSnapshot, addDoc, updateDoc, deleteDoc, doc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { WishlistItem } from '../types';

export function useWishlist(groupId: string | null) {
  const [wishes, setWishes] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId) { setLoading(false); return; }
    const q = query(
      collection(db, 'wishlist'),
      where('groupId', '==', groupId),
    );
    const unsub = onSnapshot(q, snap => {
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as WishlistItem));
      items.sort((a, b) => (b.createdAt ?? 0) - (a.createdAt ?? 0));
      setWishes(items);
      setLoading(false);
    });
    return unsub;
  }, [groupId]);

  async function addWish(groupId: string, userId: string, userName: string, title: string, emoji: string) {
    await addDoc(collection(db, 'wishlist'), {
      groupId,
      title: title.trim(),
      createdBy: userId,
      createdByName: userName,
      emoji,
      createdAt: Date.now(),
      promoted: false,
    });
  }

  async function promoteWish(wishId: string) {
    await updateDoc(doc(db, 'wishlist', wishId), { promoted: true });
  }

  async function deleteWish(wishId: string) {
    await deleteDoc(doc(db, 'wishlist', wishId));
  }

  async function editWish(wishId: string, title: string, emoji: string) {
    await updateDoc(doc(db, 'wishlist', wishId), { title: title.trim(), emoji });
  }

  async function unplanWish(wishId: string) {
    await updateDoc(doc(db, 'wishlist', wishId), { promoted: false });
  }

  return { wishes, loading, addWish, promoteWish, unplanWish, deleteWish, editWish };
}
