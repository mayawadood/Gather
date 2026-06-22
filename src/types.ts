export interface TimeOption {
  id: string;
  date: string; // ISO date string YYYY-MM-DD
  time: string; // HH:mm
  votes: string[]; // userIds
  cantMakeIt: string[]; // userIds — Feature 2
}

export interface LocationOption {
  id: string;
  value: string;
  votes: string[]; // userIds
}

export type EventStatus = 'pending' | 'finalized';

export interface GatherEvent {
  id: string;
  name: string;
  createdBy: string;
  createdByName: string;
  groupId: string;

  // Feature 4: emoji cover
  cover: string;

  // Location: either fixed string or voteable options
  locationFixed: string;
  locationOptions: LocationOption[];
  locationFinalized: string;

  // Date/time: either fixed or voteable options
  timeOptions: TimeOption[];
  finalizedDate: string;
  finalizedTime: string;

  // Feature 5: availability grid
  availabilityDates: string[]; // YYYY-MM-DD[]
  availabilitySlots: Record<string, string[]>; // userId → "YYYY-MM-DD HH:mm"[]

  // Feature 6: recurring
  recurring: null | { frequency: 'weekly' | 'biweekly' | 'monthly'; occurrences: number };

  status: EventStatus;
  gcalEventId: string;
  createdAt: number;
  voterNames?: Record<string, string>; // userId → display name (for attendee display)
}

export interface GatherUser {
  uid: string;
  displayName: string;
  email: string;
  photoURL: string;
  gcalConnected: boolean;
}

export interface Group {
  id: string;
  name: string;
  members: string[]; // userIds
  memberNames?: Record<string, string>; // userId → display name
  createdBy: string;
  inviteCode: string;
}

// Feature 7: Wishlist
export interface WishlistItem {
  id: string;
  groupId: string;
  title: string;
  createdBy: string;
  createdByName: string;
  emoji: string;
  createdAt: number;
  promoted: boolean;
}

// Feature 9: Reminders
export interface Reminder {
  eventId: string;
  eventName: string;
  date: string;
  time: string;
  notifyAt: number; // timestamp ms
}
