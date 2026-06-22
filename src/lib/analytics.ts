import posthog from 'posthog-js';

const key = import.meta.env.VITE_POSTHOG_KEY as string | undefined;

export function initAnalytics() {
  if (!key) return;
  posthog.init(key, {
    api_host: import.meta.env.VITE_POSTHOG_HOST ?? 'https://us.i.posthog.com',
    person_profiles: 'identified_only',
    capture_pageview: true,
  });
}

export function identifyUser(userId: string, name: string) {
  if (!key) return;
  posthog.identify(userId, { name });
}

export function track(event: string, props?: Record<string, any>) {
  if (!key) return;
  posthog.capture(event, props);
}
