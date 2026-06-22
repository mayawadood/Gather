/**
 * MapView — shows upcoming finalized events as pins on an OpenStreetMap.
 * Uses Nominatim (free, no API key) to geocode location strings.
 * Clicking a pin zooms in, centers on it, and highlights the event card below.
 */
import { useEffect, useState, useRef, useCallback } from 'react';
import { MapPin, ExternalLink } from 'lucide-react';
import L from 'leaflet';
import type { GatherEvent } from '../types';
import { isFuture, parseISO, format } from 'date-fns';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

interface Props {
  events: GatherEvent[];
  onEventClick: (event: GatherEvent) => void;
}

interface GeoEvent {
  event: GatherEvent;
  lat: number;
  lng: number;
  location: string;
}

async function geocode(query: string): Promise<{ lat: number; lng: number } | null> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`;
    const res = await fetch(url, { headers: { 'Accept-Language': 'en' } });
    const data = await res.json();
    if (data[0]) return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
  } catch { }
  return null;
}

function pinHtml(cover: string, active: boolean) {
  return `<div style="
    width:${active ? 52 : 44}px;height:${active ? 52 : 44}px;
    border-radius:50% 50% 50% 0;
    background:${active ? '#d4607a' : '#FFB7C5'};
    border:3px solid #fff;
    transform:rotate(-45deg);
    display:flex;align-items:center;justify-content:center;
    box-shadow:0 4px ${active ? 20 : 14}px rgba(180,80,100,${active ? 0.45 : 0.30});
    transition:all 0.2s;
  ">
    <span style="transform:rotate(45deg);font-size:${active ? 22 : 20}px;line-height:1">${cover}</span>
  </div>`;
}

export function MapView({ events, onEventClick }: Props) {
  const mapRef = useRef<L.Map | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const markersRef = useRef<Map<string, L.Marker>>(new Map());
  const cardRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [geoEvents, setGeoEvents] = useState<GeoEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);

  const upcomingWithLocation = events.filter(e => {
    if (e.status !== 'finalized') return false;
    const loc = e.locationFinalized || e.locationFixed;
    if (!loc) return false;
    try { return isFuture(parseISO(e.finalizedDate)); } catch { return false; }
  });

  // Geocode
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setGeoEvents([]);
    setActiveId(null);

    async function load() {
      const results: GeoEvent[] = [];
      for (const ev of upcomingWithLocation) {
        const loc = ev.locationFinalized || ev.locationFixed || '';
        const coords = await geocode(loc);
        if (coords && !cancelled) {
          results.push({ event: ev, lat: coords.lat, lng: coords.lng, location: loc });
        }
      }
      if (!cancelled) { setGeoEvents(results); setLoading(false); }
    }

    load();
    return () => { cancelled = true; };
  }, [events.map(e => e.id + e.locationFinalized + e.locationFixed).join(',')]);

  // Click handler — zoom + highlight
  const handlePinClick = useCallback((ge: GeoEvent) => {
    setActiveId(ge.event.id);

    // Zoom & pan the map
    if (mapRef.current) {
      const currentZoom = mapRef.current.getZoom();
      const targetZoom = Math.max(currentZoom, 15);
      mapRef.current.flyTo([ge.lat, ge.lng], targetZoom, { animate: true, duration: 0.6 });
    }

    // Scroll the card into view
    setTimeout(() => {
      const card = cardRefs.current.get(ge.event.id);
      card?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 100);
  }, []);

  // Update marker icons when activeId changes
  useEffect(() => {
    geoEvents.forEach(ge => {
      const marker = markersRef.current.get(ge.event.id);
      if (!marker) return;
      const active = ge.event.id === activeId;
      const size = active ? 52 : 44;
      marker.setIcon(L.divIcon({
        html: pinHtml(ge.event.cover || '📍', active),
        className: '',
        iconSize: [size, size],
        iconAnchor: [size / 2, size],
      }));
    });
  }, [activeId, geoEvents]);

  // Mount / update Leaflet map
  useEffect(() => {
    if (loading || !containerRef.current) return;

    if (mapRef.current) { mapRef.current.remove(); mapRef.current = null; }
    markersRef.current.clear();

    const map = L.map(containerRef.current, { zoomControl: true, scrollWheelZoom: false });
    mapRef.current = map;

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> © <a href="https://carto.com/">CARTO</a>',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    if (geoEvents.length === 0) { map.setView([20, 0], 2); return; }

    const bounds: [number, number][] = [];

    geoEvents.forEach(ge => {
      const active = ge.event.id === activeId;
      const size = active ? 52 : 44;
      const marker = L.marker([ge.lat, ge.lng], {
        icon: L.divIcon({
          html: pinHtml(ge.event.cover || '📍', active),
          className: '',
          iconSize: [size, size],
          iconAnchor: [size / 2, size],
        }),
      });
      marker.on('click', () => handlePinClick(ge));
      marker.addTo(map);
      markersRef.current.set(ge.event.id, marker);
      bounds.push([ge.lat, ge.lng]);
    });

    if (bounds.length === 1) {
      map.setView(bounds[0], 13);
    } else {
      map.fitBounds(bounds as L.LatLngBoundsExpression, { padding: [40, 40] });
    }

    return () => { map.remove(); mapRef.current = null; markersRef.current.clear(); };
  }, [geoEvents, loading]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="w-10 h-10 border-2 border-[#F2C7C7] border-t-[#FFB7C5] rounded-full animate-spin" />
        <p className="text-sm text-[#b07888]">finding your plans on the map…</p>
      </div>
    );
  }

  if (geoEvents.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center gap-3">
        <MapPin size={32} className="text-[#F2C7C7]" />
        <p className="text-[#b07888] font-semibold">no mappable locations yet</p>
        <p className="text-sm text-[#c4a0a8] max-w-[260px]">finalize events with a real address and they'll show up here</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div
        ref={containerRef}
        className="w-full rounded-2xl overflow-hidden border border-[#fce4e8]"
        style={{ height: 320 }}
      />

      <div className="flex flex-col gap-2">
        {geoEvents.map(ge => {
          const isActive = ge.event.id === activeId;
          return (
            <div
              key={ge.event.id}
              ref={el => { if (el) cardRefs.current.set(ge.event.id, el); }}
              style={{
                transition: 'border-color 0.2s, box-shadow 0.2s, background 0.2s',
                borderColor: isActive ? '#FFB7C5' : undefined,
                boxShadow: isActive ? '0 0 0 3px #FFB7C540, 0 4px 16px rgba(180,80,100,0.12)' : undefined,
                background: isActive ? '#fff8fa' : undefined,
              }}
              className={`rounded-2xl border px-4 py-3 ${isActive ? 'border-[#FFB7C5]' : 'border-[#fce4e8] bg-white'}`}
            >
              {/* Collapsed row — always visible */}
              <button
                onClick={() => {
                  if (isActive) {
                    setActiveId(null);
                    if (mapRef.current && geoEvents.length > 1) {
                      const bounds = geoEvents.map(g => [g.lat, g.lng] as [number, number]);
                      mapRef.current.flyToBounds(bounds as L.LatLngBoundsExpression, { padding: [40, 40], animate: true, duration: 0.6 });
                    }
                  } else {
                    handlePinClick(ge);
                  }
                }}
                className="w-full flex items-center gap-3 text-left"
              >
                <span className={`text-xl shrink-0 transition-transform duration-200 ${isActive ? 'scale-125' : ''}`}>
                  {ge.event.cover || '📍'}
                </span>
                <div className="flex-1 min-w-0">
                  <p className={`font-semibold text-sm truncate transition-colors ${isActive ? 'text-[#d4607a]' : 'text-[#1a1014]'}`}>
                    {ge.event.name}
                  </p>
                  <p className="text-xs text-[#b07888]">
                    {ge.event.finalizedDate ? format(parseISO(ge.event.finalizedDate), 'EEE, MMM d') : ''}
                    {ge.event.finalizedTime ? ' · ' + ge.event.finalizedTime : ''}
                  </p>
                </div>
                <span className={`text-xs text-[#c4a0a8] transition-transform duration-200 ${isActive ? 'rotate-180' : ''}`}>▾</span>
              </button>

              {/* Expanded detail */}
              {isActive && (
                <div className="mt-3 pt-3 border-t border-[#fce4e8] flex items-center justify-between gap-3">
                  <p className="text-xs text-[#b07888] flex items-center gap-1 min-w-0 truncate">
                    <MapPin size={11} className="shrink-0 text-[#FFB7C5]" />
                    {ge.location}
                  </p>
                  <a
                    href={`https://maps.google.com/?q=${encodeURIComponent(ge.location)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-[10px] font-bold text-[#d4607a] bg-[#fff0f4] border border-[#fce4e8] px-2.5 py-1.5 rounded-lg hover:bg-[#FFB7C5] hover:text-white transition-colors shrink-0"
                  >
                    <ExternalLink size={10} /> Open in Maps
                  </a>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
