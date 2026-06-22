import { useState, useEffect } from 'react';
import {
  collection, query, where, onSnapshot,
  addDoc, updateDoc, deleteDoc, doc
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { GatherEvent, TimeOption, LocationOption } from '../types';

export function useEvents(groupId: string | null) {
  const [events, setEvents] = useState<GatherEvent[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!groupId) { setLoading(false); return; }
    const q = query(
      collection(db, 'events'),
      where('groupId', '==', groupId)
    );
    const unsub = onSnapshot(q, snap => {
      const all = snap.docs.map(d => ({ id: d.id, ...d.data() } as GatherEvent));
      // Sort newest first client-side (avoids needing a Firestore composite index)
      all.sort((a, b) => b.createdAt - a.createdAt);
      setEvents(all);
      setLoading(false);
    });
    return unsub;
  }, [groupId]);

  async function createEvent(data: {
    name: string;
    cover: string;
    locationFixed: string;
    locationOptions: Omit<LocationOption, 'votes'>[];
    timeOptions: Omit<TimeOption, 'votes' | 'cantMakeIt'>[];
    availabilityDates: string[];
    groupId: string;
    userId: string;
    userName: string;
    recurring: null | { frequency: 'weekly' | 'biweekly' | 'monthly'; occurrences: number };
    autoFinalizeDate?: string;
    autoFinalizeTime?: string;
  }) {
    const timeOpts: TimeOption[] = data.timeOptions.map(o => ({ ...o, votes: [], cantMakeIt: [] }));
    const locOpts: LocationOption[] = data.locationOptions.map(o => ({ ...o, votes: [] }));

    const base = {
      name: data.name,
      cover: data.cover,
      createdBy: data.userId,
      createdByName: data.userName,
      groupId: data.groupId,
      locationFixed: data.locationFixed,
      locationOptions: locOpts,
      locationFinalized: '',
      timeOptions: timeOpts,
      finalizedDate: data.autoFinalizeDate || '',
      finalizedTime: data.autoFinalizeTime || '',
      availabilityDates: data.availabilityDates,
      availabilitySlots: {},
      recurring: data.recurring,
      status: data.autoFinalizeDate ? 'finalized' : 'pending',
      gcalEventId: '',
      createdAt: Date.now(),
    };

    // Recurring: only for single fixed time option (not availability mode)
    if (data.recurring && timeOpts.length === 1 && data.availabilityDates.length === 0) {
      const { frequency, occurrences } = data.recurring;
      const [y, m, d] = timeOpts[0].date.split('-').map(Number);
      const autoFinalize = !!data.autoFinalizeDate;
      for (let i = 0; i < occurrences; i++) {
        let occDate: string;
        if (frequency === 'monthly') {
          occDate = new Date(y, m - 1 + i, d).toISOString().slice(0, 10);
        } else {
          const offsetDays = frequency === 'weekly' ? i * 7 : i * 14;
          occDate = new Date(new Date(y, m - 1, d).getTime() + offsetDays * 86400000).toISOString().slice(0, 10);
        }
        const occOpts: TimeOption[] = [{ ...timeOpts[0], date: occDate, votes: [], cantMakeIt: [] }];
        await addDoc(collection(db, 'events'), {
          ...base,
          timeOptions: occOpts,
          finalizedDate: autoFinalize ? occDate : '',
          finalizedTime: autoFinalize ? (data.autoFinalizeTime || '') : '',
          status: autoFinalize ? 'finalized' : 'pending',
          createdAt: Date.now() + i,
        });
      }
    } else {
      await addDoc(collection(db, 'events'), base);
    }
  }

  async function voteTimeOption(eventId: string, optionId: string, userId: string, userName: string, event: GatherEvent) {
    const opts = event.timeOptions.map(o => {
      if (o.id === optionId) {
        const hasVote = o.votes.includes(userId);
        return {
          ...o,
          votes: hasVote ? o.votes.filter(v => v !== userId) : [...o.votes, userId],
          cantMakeIt: (o.cantMakeIt ?? []).filter(v => v !== userId),
        };
      }
      return o;
    });
    // Track voter name so we can show attendees
    const voterNames = { ...(event.voterNames ?? {}), [userId]: userName };
    await updateDoc(doc(db, 'events', eventId), { timeOptions: opts, voterNames });
  }

  async function voteCantMakeIt(eventId: string, optionId: string, userId: string, event: GatherEvent) {
    const opts = event.timeOptions.map(o => {
      if (o.id === optionId) {
        const has = (o.cantMakeIt ?? []).includes(userId);
        return {
          ...o,
          cantMakeIt: has ? (o.cantMakeIt ?? []).filter(v => v !== userId) : [...(o.cantMakeIt ?? []), userId],
          // Remove from yes votes if marking can't make it
          votes: o.votes.filter(v => v !== userId),
        };
      }
      return o;
    });
    await updateDoc(doc(db, 'events', eventId), { timeOptions: opts });
  }

  async function voteLocationOption(eventId: string, optionId: string, userId: string, event: GatherEvent) {
    const opts = event.locationOptions.map(o => {
      const hasVote = o.votes.includes(userId);
      if (o.id === optionId) {
        return { ...o, votes: hasVote ? o.votes.filter(v => v !== userId) : [...o.votes, userId] };
      }
      return o;
    });
    await updateDoc(doc(db, 'events', eventId), { locationOptions: opts });
  }

  async function finalizeEvent(
    eventId: string,
    finalizedDate: string,
    finalizedTime: string,
    finalizedLocation: string,
    gcalEventId = ''
  ) {
    await updateDoc(doc(db, 'events', eventId), {
      status: 'finalized',
      finalizedDate,
      finalizedTime,
      locationFinalized: finalizedLocation,
      gcalEventId,
    });
  }

  async function unfinalizeEvent(eventId: string) {
    await updateDoc(doc(db, 'events', eventId), {
      status: 'pending',
      finalizedDate: '',
      finalizedTime: '',
      locationFinalized: '',
      gcalEventId: '',
    });
  }

  async function updateGcalId(eventId: string, gcalEventId: string) {
    await updateDoc(doc(db, 'events', eventId), { gcalEventId });
  }

  async function deleteEvent(eventId: string) {
    await deleteDoc(doc(db, 'events', eventId));
  }

  async function updateEvent(eventId: string, updates: {
    name: string;
    cover: string;
    locationFixed: string;
    locationOptions: Omit<LocationOption, 'votes'>[];
    timeOptions: Omit<TimeOption, 'votes' | 'cantMakeIt'>[];
  }, existingEvent: GatherEvent) {
    // Preserve votes on time options that still exist (matched by id), reset new ones
    const timeOpts: TimeOption[] = updates.timeOptions.map(o => {
      const existing = existingEvent.timeOptions.find(e => e.id === o.id);
      return existing
        ? { ...existing, date: o.date, time: o.time }
        : { ...o, votes: [], cantMakeIt: [] };
    });
    // Preserve votes on location options that still exist
    const locOpts: LocationOption[] = updates.locationOptions.map(o => {
      const existing = existingEvent.locationOptions.find(e => e.id === o.id);
      return existing ? { ...existing, value: o.value } : { ...o, votes: [] };
    });
    await updateDoc(doc(db, 'events', eventId), {
      name: updates.name,
      cover: updates.cover,
      locationFixed: updates.locationFixed,
      locationOptions: locOpts,
      timeOptions: timeOpts,
    });
  }

  async function fillAvailability(eventId: string, userId: string, slots: string[]) {
    await updateDoc(doc(db, 'events', eventId), {
      [`availabilitySlots.${userId}`]: slots,
    });
  }

  return {
    events, loading, createEvent, updateEvent, deleteEvent,
    voteTimeOption, voteCantMakeIt, voteLocationOption,
    finalizeEvent, unfinalizeEvent, updateGcalId, fillAvailability,
  };
}
