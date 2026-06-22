// Feature 9: Reminders
import { notify } from './notifications';
import type { GatherEvent, Reminder } from '../types';

const STORAGE_KEY = 'gather_reminders';

export function getReminders(): Reminder[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]') as Reminder[];
  } catch {
    return [];
  }
}

function saveReminders(reminders: Reminder[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(reminders));
}

export function setReminder(event: GatherEvent, hoursBefore: 1 | 2 | 24): void {
  if (!event.finalizedDate || !event.finalizedTime) return;
  const [y, m, d] = event.finalizedDate.split('-').map(Number);
  const [h, min] = event.finalizedTime.split(':').map(Number);
  const eventMs = new Date(y, m - 1, d, h, min).getTime();
  const notifyAt = eventMs - hoursBefore * 60 * 60 * 1000;

  const reminders = getReminders().filter(r => r.eventId !== event.id);
  reminders.push({
    eventId: event.id,
    eventName: event.name,
    date: event.finalizedDate,
    time: event.finalizedTime,
    notifyAt,
  });
  saveReminders(reminders);
  scheduleReminder({ eventId: event.id, eventName: event.name, date: event.finalizedDate, time: event.finalizedTime, notifyAt });
}

function scheduleReminder(reminder: Reminder) {
  const delay = reminder.notifyAt - Date.now();
  if (delay < 0) return;
  setTimeout(() => {
    notify(`⏰ Reminder: ${reminder.eventName}`, `Coming up on ${reminder.date} at ${reminder.time}`);
    // Remove fired reminder
    const remaining = getReminders().filter(r => r.eventId !== reminder.eventId);
    saveReminders(remaining);
  }, delay);
}

export function initReminders(): void {
  const reminders = getReminders();
  const now = Date.now();
  const valid = reminders.filter(r => r.notifyAt > now);
  if (valid.length !== reminders.length) saveReminders(valid);
  valid.forEach(scheduleReminder);
}
