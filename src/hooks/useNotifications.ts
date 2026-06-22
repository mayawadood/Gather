// Feature 8: Notification triggers
import { useEffect, useRef } from 'react';
import { notify, requestNotificationPermission } from '../lib/notifications';
import type { GatherEvent } from '../types';

export function useNotifications(events: GatherEvent[], userId: string | null) {
  const prevEventsRef = useRef<GatherEvent[]>([]);
  const initialized = useRef(false);

  useEffect(() => {
    if (!userId) return;
    requestNotificationPermission();
  }, [userId]);

  useEffect(() => {
    if (!userId || events.length === 0) {
      prevEventsRef.current = events;
      return;
    }

    // Skip the very first load to avoid notification spam on mount
    if (!initialized.current) {
      initialized.current = true;
      prevEventsRef.current = events;
      return;
    }

    const prev = prevEventsRef.current;
    const prevIds = new Set(prev.map(e => e.id));
    const prevMap = new Map(prev.map(e => [e.id, e]));

    for (const event of events) {
      if (!prevIds.has(event.id)) {
        // New event
        if (event.createdBy !== userId && Date.now() - event.createdAt < 10000) {
          notify(`New event: ${event.name}`, `${event.createdByName} just created a new event`);
        }
      } else {
        const old = prevMap.get(event.id)!;
        // Someone voted on your event
        if (event.createdBy === userId) {
          const oldVotes = old.timeOptions.reduce((s, o) => s + o.votes.length, 0);
          const newVotes = event.timeOptions.reduce((s, o) => s + o.votes.length, 0);
          if (newVotes > oldVotes) {
            notify(`Vote on ${event.name}`, 'Someone voted on a time option');
          }
        }
        // Event finalized and you're in it
        if (old.status !== 'finalized' && event.status === 'finalized') {
          const allVoterIds = new Set(event.timeOptions.flatMap(o => o.votes));
          if (allVoterIds.has(userId) || event.createdBy === userId) {
            notify(`${event.name} is set! 🎉`, `Locked in for ${event.finalizedDate} at ${event.finalizedTime}`);
          }
        }
      }
    }

    prevEventsRef.current = events;
  }, [events, userId]);
}
