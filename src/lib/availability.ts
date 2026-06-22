import type { GatherEvent } from '../types';

export interface RankedSlot {
  date: string;        // YYYY-MM-DD
  time: string;        // HH:mm
  freeUsers: string[]; // userIds
  totalRespondents: number;
}

/**
 * Given an event with availabilitySlots, return the top N slots
 * ranked by number of people free, descending.
 * Only considers slots within the event's availabilityDates range.
 */
export function rankAvailabilitySlots(event: GatherEvent, topN = 5): RankedSlot[] {
  const slots = event.availabilitySlots ?? {};
  const respondents = Object.keys(slots);
  if (respondents.length === 0) return [];

  // Build a map: "YYYY-MM-DD HH:mm" → userIds who are free
  const slotMap: Record<string, string[]> = {};
  for (const [userId, userSlots] of Object.entries(slots)) {
    for (const s of userSlots) {
      if (!slotMap[s]) slotMap[s] = [];
      slotMap[s].push(userId);
    }
  }

  // Only keep slots within the declared dates
  const validDates = new Set(event.availabilityDates ?? []);

  const ranked: RankedSlot[] = Object.entries(slotMap)
    .filter(([key]) => {
      const date = key.split(' ')[0];
      return validDates.has(date);
    })
    .map(([key, freeUsers]) => {
      const [date, time] = key.split(' ');
      return { date, time, freeUsers, totalRespondents: respondents.length };
    })
    .sort((a, b) => {
      // Primary: most people free
      if (b.freeUsers.length !== a.freeUsers.length) return b.freeUsers.length - a.freeUsers.length;
      // Secondary: earlier in the day
      return a.time.localeCompare(b.time);
    });

  // De-duplicate: don't show back-to-back 30-min slots for the same winner,
  // just keep the first slot of each "run" per date so results aren't all the same time
  const seen = new Set<string>();
  const deduped: RankedSlot[] = [];
  for (const slot of ranked) {
    const hourKey = `${slot.date}-${slot.time.split(':')[0]}`;
    if (!seen.has(hourKey)) {
      seen.add(hourKey);
      deduped.push(slot);
    }
    if (deduped.length >= topN) break;
  }

  return deduped;
}
