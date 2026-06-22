/**
 * Google Places Autocomplete via the Places API (New) REST endpoint.
 * No JS SDK needed — just fetch with the API key.
 * Requires "Places API (New)" enabled in Google Cloud Console.
 */

const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined;
export const isPlacesConfigured = Boolean(apiKey && apiKey.length > 10);

export interface PlaceSuggestion {
  placeId: string;
  name: string;
  address: string;
  fullText: string;
  mapsUrl: string;
}

export async function getPlaceSuggestions(
  query: string,
  userLocation?: { lat: number; lng: number },
): Promise<PlaceSuggestion[]> {
  if (!isPlacesConfigured || query.trim().length < 2) return [];

  const body: Record<string, any> = {
    input: query,
    includedPrimaryTypes: ['establishment'],
    languageCode: 'en',
  };

  if (userLocation) {
    body.locationBias = {
      circle: {
        center: { latitude: userLocation.lat, longitude: userLocation.lng },
        radius: 50000,
      },
    };
  }

  try {
    const res = await fetch('https://places.googleapis.com/v1/places:autocomplete', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Goog-Api-Key': apiKey!,
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.warn('[Places] API error:', res.status, err?.error?.message ?? '');
      return [];
    }

    const data = await res.json();
    const suggestions = (data.suggestions ?? []) as any[];

    return suggestions.slice(0, 5).map((s: any) => {
      const p = s.placePrediction;
      const name = p?.structuredFormat?.mainText?.text ?? p?.text?.text ?? '';
      const address = p?.structuredFormat?.secondaryText?.text ?? '';
      const placeId = p?.placeId ?? '';
      return {
        placeId,
        name,
        address,
        fullText: address ? `${name}, ${address}` : name,
        mapsUrl: `https://www.google.com/maps/place/?q=place_id:${placeId}`,
      };
    }).filter(s => s.name);
  } catch (e) {
    console.warn('[Places] fetch failed:', e);
    return [];
  }
}

export function getUserLocation(): Promise<{ lat: number; lng: number } | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) { resolve(null); return; }
    navigator.geolocation.getCurrentPosition(
      pos => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 5000 },
    );
  });
}
