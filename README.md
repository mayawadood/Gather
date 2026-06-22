# Gather

An AI-assisted group scheduling PWA. Describe an event in plain English, invite your friends, and let everyone vote on times and locations — everything syncs in real time.

Prototyped in Figma, built with Claude Code, and piloted with a live friend group.

**Live:** [gather-nine-umber.vercel.app](https://gather-nine-umber.vercel.app)

---

## What it does

**AI-assisted event creation**
Type something like "dinner at Blue Ribbon Saturday 8pm" and Claude parses it into a structured event — name, location, date, time, and cover emoji. If you mention multiple locations ("drinks at The Fox or The Anchor"), it automatically creates a location vote.

**Group voting**
Friends vote on proposed times and locations. Once a majority picks one, the event finalizes. If only one time option is added, it finalizes automatically with no vote needed.

**Map view**
Upcoming finalized events appear as pins on an interactive map. Tap a pin to zoom in and see event details. Every event links directly to Google Maps.

**Ideas board**
A shared wishlist for the group. Propose ideas before they're real events, promote them when the group is ready, and the AI pre-fills the create form from the idea title.

**Google Calendar sync**
Once an event is finalized, any member can add it directly to their Google Calendar via OAuth.

**Circles**
Create a group, share an invite code, and friends join. Switch between multiple circles from the header.

---

## Stack

| | |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS v4 |
| Database | Firebase Firestore |
| Auth | Firebase Authentication (Google OAuth) |
| AI | Anthropic Claude (`claude-haiku-4-5`) |
| Maps | Leaflet + CartoDB Positron tiles |
| Places | Google Places API (New) |
| Analytics | PostHog |
| Deployment | Vercel |

---

## Running locally

```bash
git clone https://github.com/mayawadood/Gather.git
cd Gather
npm install
```

Create a `.env` file:

```
VITE_FIREBASE_API_KEY=
VITE_FIREBASE_AUTH_DOMAIN=
VITE_FIREBASE_PROJECT_ID=
VITE_FIREBASE_STORAGE_BUCKET=
VITE_FIREBASE_MESSAGING_SENDER_ID=
VITE_FIREBASE_APP_ID=

VITE_ANTHROPIC_API_KEY=       # optional — enables AI parsing
VITE_GOOGLE_MAPS_API_KEY=     # optional — enables Places autocomplete
VITE_POSTHOG_KEY=             # optional — enables analytics
VITE_POSTHOG_HOST=https://us.i.posthog.com
```

```bash
npm run dev
```

Firebase setup: enable Firestore and Google Auth, then add `localhost` and your production domain to **Authentication → Authorized domains**.

---

## A few decisions worth noting

**Nominatim instead of Google Maps for geocoding** — the map tab uses Nominatim (free, no key) to plot pins. Accurate enough for city-level placement and avoids another paid API.

**Places API (New) via REST instead of the JS SDK** — calling the endpoint directly with `fetch` sidesteps script-loading race conditions and HMR conflicts that broke the JS SDK in Vite.

**Ideas don't mark as "planned" until the event is actually created** — clicking "Plan it" opens the create form but only marks the idea as promoted once the user follows through. Avoids false positives in the ideas board.

**API keys are client-side** — intentional for a private friend-group app. For a public product these would be proxied through a backend function.

---

## What's next

- Expense splitting per event
- Push notifications via Firebase Cloud Messaging
- Shareable availability link for non-members

---

## License

MIT
