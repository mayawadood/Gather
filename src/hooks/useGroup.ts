import { useState, useEffect } from 'react';
import {
  collection, query, where, onSnapshot, addDoc, updateDoc,
  doc, getDocs, deleteDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { Group } from '../types';

function randomCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export function useGroups(userId: string | null) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    const q = query(collection(db, 'groups'), where('members', 'array-contains', userId));
    const unsub = onSnapshot(q, snap => {
      setGroups(snap.docs.map(d => ({ id: d.id, ...d.data() } as Group)));
      setLoading(false);
    });
    return unsub;
  }, [userId]);

  async function createGroup(name: string, userId: string, displayName?: string): Promise<string> {
    const ref = await addDoc(collection(db, 'groups'), {
      name,
      members: [userId],
      memberNames: displayName ? { [userId]: displayName } : {},
      createdBy: userId,
      inviteCode: randomCode(),
    });
    return ref.id;
  }

  async function joinGroup(code: string, userId: string, displayName?: string): Promise<string | null> {
    const q = query(collection(db, 'groups'), where('inviteCode', '==', code.toUpperCase()));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    const gDoc = snap.docs[0];
    const members: string[] = gDoc.data().members;
    const memberNames: Record<string, string> = gDoc.data().memberNames ?? {};
    const updates: any = {};
    if (!members.includes(userId)) {
      updates.members = [...members, userId];
    }
    if (displayName) {
      updates.memberNames = { ...memberNames, [userId]: displayName };
    }
    if (Object.keys(updates).length > 0) {
      await updateDoc(doc(db, 'groups', gDoc.id), updates);
    }
    return gDoc.id;
  }

  async function regenerateCode(groupId: string) {
    await updateDoc(doc(db, 'groups', groupId), { inviteCode: randomCode() });
  }

  async function leaveGroup(groupId: string, userId: string) {
    const group = groups.find(g => g.id === groupId);
    if (!group) return;
    const remaining = group.members.filter(m => m !== userId);
    if (remaining.length === 0) {
      // Last member — delete the group entirely
      await deleteDoc(doc(db, 'groups', groupId));
    } else {
      await updateDoc(doc(db, 'groups', groupId), { members: remaining });
    }
  }

  async function deleteGroup(groupId: string) {
    await deleteDoc(doc(db, 'groups', groupId));
  }

  return { groups, loading, createGroup, joinGroup, regenerateCode, leaveGroup, deleteGroup };
}
