# Gather

A mobile-first progressive web app for scheduling events with friend groups. Gather eliminates the back-and-forth of group planning — friends vote on times and locations, the app tracks availability, and everything syncs in real time.

**Live demo:** [your-url-here.vercel.app]

---

## Features

**Event scheduling**
- Create events with multiple date/time options for friends to vote on
- Location voting — propose multiple venues and let the group decide
- Availability polling — share a date range and friends fill in when they're free
- If only one time option is set, the event finalizes automatically with no vote needed
- Recurring events (weekly, biweekly, monthly)

**AI assistant (Claude)**
- Natural language event creation — type "dinner at Blue Ribbon Saturday 8pm" and the form auto-fills
- Parses multiple locations ("drinks at The Fox or The Anchor") and creates a location vote automatically
- AI-suggested times based on your group's historical event patterns
- Auto-fills the create form when promoting an idea to an event

**Map view**
- Upcoming finalized events displayed as pins on an interactive map (OpenStreetMap + CartoDB Positron)
- Click a pin to zoom in and expand the corresponding event card
- Google Maps deep links on every event

**Ideas board**
- Shared wishlist for the group — propose ideas before they become real events
- Promote an idea directly to an event (AI parses the idea title automatically)
- Edit, delete, or move planned ideas back to the ideas list

**Integrations**
- Google Calendar sync via OAuth 2.0
- Google Maps Places autocomplete on all location inputs
- Real-time sync across all group members via Firebase Firestore

**Other**
- Google Sign-In authentication
- Group management — create groups, join via invite code, switch between groups
- Optional profile photo (resized to 200×200 via Canvas API, stored locally)
- PostHog analytics (event creation funnel, vote tracking, feature usage)
- PWA — installable on iOS and Android from the browser

---

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS v4 |
| Database | Firebase Firestore (real-time listeners) |
| Auth | Firebase Authentication (Google OAuth) |
| AI | Anthropic Claude (`claude-haiku-4-5`) via `@anthropic-ai/sdk` |
| Maps | Leaflet + OpenStreetMap + CartoDB Positron tiles |
| Geocoding | Nominatim (free, no API key required) |
| Places autocomplete | Google Places API (New) REST endpoint |
| Analytics | PostHog |
| Deployment | Vercel |

---

## Getting started

### Prerequisites
- Node.js 18+
- A Firebase project with Firestore and Google Authentication enabled
- An Anthropic API key (optional — AI features degrade gracefully without it)

### Setup

```bash
git clone https://github.com/YOUR_USERNAME/gather.git
cd gather
npm install
```

Create a `.env` file in the root:

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

VITE_ANTHROPIC_API_KEY=        # optional — enables AI features
VITE_GOOGLE_MAPS_API_KEY=      # optional — enables Places autocomplete
VITE_POSTHOG_KEY=              # optional — enables analytics
VITE_POSTHOG_HOST=https://us.i.posthog.com
```

```bash
npm run dev
```

### Firebase setup

1. Enable **Firestore** and **Google Authentication** in the Firebase console
2. Add your local (`localhost`) and production domains to **Authentication → Authorized domains**

---

## Architecture notes

**Real-time sync** — All event and group state is driven by Firestore `onSnapshot` listeners. No polling, no manual refresh — changes made by any group member appear instantly for everyone.

**AI parsing** — `src/lib/ai.ts` sends a structured prompt to Claude that returns a typed JSON object. The parser handles single dates, multiple date options, single locations, and multi-location vote scenarios from a single free-text input — with graceful fallback if the key is missing.

**Places autocomplete** — `src/lib/places.ts` uses the Places API (New) REST endpoint directly via `fetch` rather than the JS SDK, avoiding script-loading timing issues and HMR conflicts in Vite.

**Security note** — API keys are bundled in the client build. This is intentional for a private friend-group app where the user controls who has access. For a public product, AI and Maps calls should be proxied through a backend function.

---

## Product decisions

- **Nominatim over Google Maps for geocoding** — free, no API key, accurate enough for city-level pin placement on the map tab
- **CartoDB Positron map tiles** — minimal, clean aesthetic compared to default OpenStreetMap; better suited to a social app
- **Ideas don't move to "Planned" until the event is actually created** — clicking "Plan it" opens the create form but does not mark the idea as planned until the user follows through and clicks "Create event"
- **Auto-finalize on a single time option** — if a creator sets exactly one time there is no need for a vote; the event finalizes immediately so friends see a confirmed time rather than an open poll

---

## What I'd build next

- **Expense splitting** — log costs per event and track who owes whom across the group
- **Push notifications** — Firebase Cloud Messaging for vote reminders and finalization alerts
- **Public availability link** — shareable link for non-members to fill in availability without joining the group
- **Event comments** — threaded discussion per event so planning conversation stays in one place

---

## License

MIT
