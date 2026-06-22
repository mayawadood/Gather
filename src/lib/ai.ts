/**
 * AI-powered scheduling features for Gather.
 *
 * ⚠️  Security note: The API key lives in VITE_ANTHROPIC_API_KEY and is
 * bundled into the client. This is acceptable for a private friend-group
 * app but don't share the build publicly with a high-budget key.
 */

import Anthropic from '@anthropic-ai/sdk';
import { format, addDays } from 'date-fns';

// ─── Client ────────────────────────────────────────────────────────────────

const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY as string | undefined;

// Only consider configured if key looks like a real Anthropic key
export const isAIConfigured = Boolean(apiKey && apiKey.startsWith('sk-ant-'));

let _client: Anthropic | null = null;
function getClient(): Anthropic {
  if (!_client) {
    if (!apiKey) throw new Error('VITE_ANTHROPIC_API_KEY not set');
    _client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
  }
  return _client;
}

// ─── Types ─────────────────────────────────────────────────────────────────

export interface AISuggestedTime {
  date: string;   // YYYY-MM-DD
  time: string;   // HH:mm  (24-h)
  label: string;  // "Saturday evening"
  reason: string; // one sentence
}

export interface AIEventParse {
  name?: string;
  dates?: Array<{ date: string; time: string }>;  // multiple time options for voting
  date?: string;      // YYYY-MM-DD (single, fallback)
  time?: string;      // HH:mm (single, fallback)
  location?: string;          // single fixed location
  locations?: string[];       // multiple locations → let friends vote
  cover?: string;     // single emoji
}

// ─── Helpers ───────────────────────────────────────────────────────────────

function extractJSON<T>(text: string, fallback: T): T {
  // Try object first (most specific), then array
  try {
    const obj = text.match(/\{[\s\S]*\}/);
    if (obj) return JSON.parse(obj[0]) as T;
  } catch { }
  try {
    const arr = text.match(/\[[\s\S]*\]/);
    if (arr) return JSON.parse(arr[0]) as T;
  } catch { }
  return fallback;
}

function todayStr() {
  return format(new Date(), 'yyyy-MM-dd');
}

// ─── Feature 1: Smart time suggestions ────────────────────────────────────
// Looks at your group's past finalized events and suggests 3 good times
// for a new one — factoring in day-of-week and time-of-day preferences.

export async function suggestTimesFromHistory(
  pastEvents: Array<{ name: string; finalizedDate: string; finalizedTime: string }>,
  eventName: string,
): Promise<AISuggestedTime[]> {
  const client = getClient();
  const today = todayStr();

  const historyText = pastEvents
    .slice(0, 20)
    .map(e => `• "${e.name}" → ${e.finalizedDate} at ${e.finalizedTime}`)
    .join('\n');

  const historySection = pastEvents.length > 0
    ? `Here are this friend group's recent events (most recent first):\n${historyText}\n\nNote any patterns (favorite days, times, frequency).`
    : 'No prior event history available.';

  const prompt =
    `You are a scheduling assistant for a friend group.\n` +
    `${historySection}\n\n` +
    `Today is ${today}. Suggest 3 good upcoming times for a new event called "${eventName}".\n\n` +
    `Rules:\n` +
    `- All dates must be after today (${today})\n` +
    `- Spread the options across different weeks where possible\n` +
    `- Prefer evenings/weekends unless the history suggests otherwise\n` +
    `- Include a variety (e.g. one this week, one next week, one further out)\n\n` +
    `Respond with ONLY a valid JSON array of exactly 3 objects, no extra text:\n` +
    `[{"date":"YYYY-MM-DD","time":"HH:mm","label":"Fri evening","reason":"One sentence."}]`;

  const response = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 512,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = response.content[0].type === 'text' ? response.content[0].text : '[]';
  const suggestions = extractJSON<AISuggestedTime[]>(raw, []);

  // Validate dates are actually in the future
  const valid = suggestions.filter(s => {
    try { return s.date > today && /^\d{2}:\d{2}$/.test(s.time); } catch { return false; }
  });

  return valid.slice(0, 3);
}

// ─── Feature 2: Natural-language event creation ───────────────────────────
// Type "dinner this saturday around 7" → AI fills in the form fields.

export async function parseNaturalLanguageEvent(
  input: string,
): Promise<AIEventParse> {
  const client = getClient();
  const today = todayStr();
  const nextWeek = format(addDays(new Date(), 7), 'yyyy-MM-dd');

  const prompt =
    `Today is ${today} (a ${format(new Date(), 'EEEE')}). Next week starts ${nextWeek}.\n\n` +
    `Parse this event description: "${input}"\n\n` +
    `You MUST respond with exactly this JSON structure (no other text):\n` +
    `{"name":"...","location":"...","locations":["...","..."],"cover":"🎉","dates":[{"date":"YYYY-MM-DD","time":"HH:mm"}]}\n\n` +
    `Rules:\n` +
    `- "name": short event title (e.g. "Dinner", "Game night")\n` +
    `- LOCATION — pick ONE of these:\n` +
    `  - "location": single place name, if only one location mentioned\n` +
    `  - "locations": array of place names, if multiple locations mentioned ("at X or Y", "location 1 or location 2") — omit "location"\n` +
    `  - Omit both if no location mentioned\n` +
    `- "cover": single relevant emoji\n` +
    `- "dates": ALWAYS include this array with at least one entry\n` +
    `  - If multiple times/days mentioned ("Friday or Saturday", "7pm or 8pm"), add one entry per option\n` +
    `  - DATE: use the next upcoming occurrence of any mentioned day. If no day mentioned, use tomorrow ${format(addDays(new Date(), 1), 'yyyy-MM-dd')}\n` +
    `  - TIME: convert to HH:mm 24-hour. If no time mentioned, use "00:00"\n` +
    `  - All dates must be on or after ${today}\n\n` +
    `Examples:\n` +
    `- "dinner saturday 7pm at sarah's" → {"name":"Dinner","location":"Sarah's","cover":"🍽️","dates":[{"date":"2026-06-21","time":"19:00"}]}\n` +
    `- "drinks friday at the fox or the anchor" → {"name":"Drinks","locations":["The Fox","The Anchor"],"cover":"🍻","dates":[{"date":"2026-06-20","time":"00:00"}]}`;


  const response = await client.messages.create({
    model: 'claude-haiku-4-5',
    max_tokens: 256,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = response.content[0].type === 'text' ? response.content[0].text : '{}';
  let result = extractJSON<any>(raw, {});
  // Claude sometimes returns a bare dates array instead of wrapping it in an object
  if (Array.isArray(result)) result = { dates: result };
  return result as AIEventParse;
}
