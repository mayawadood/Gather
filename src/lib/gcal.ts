// Google Calendar integration via the Calendar API
// Uses the OAuth access token obtained during Google sign-in

export async function addEventToGCal(
  accessToken: string,
  event: { name: string; location: string; date: string; time: string }
): Promise<string> {
  const [year, month, day] = event.date.split('-').map(Number);
  const [hour, minute] = event.time.split(':').map(Number);

  const start = new Date(year, month - 1, day, hour, minute);
  const end = new Date(start.getTime() + 60 * 60 * 1000); // default 1 hour

  const body = {
    summary: event.name,
    location: event.location,
    start: { dateTime: start.toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
    end: { dateTime: end.toISOString(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone },
  };

  const res = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error?.message || 'Failed to create Google Calendar event');
  }

  const data = await res.json();
  return data.id as string;
}
