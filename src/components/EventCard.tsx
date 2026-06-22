// Feature 3: Countdown chip | Feature 4: Emoji cover
import { format, parseISO, differenceInDays, isToday, isTomorrow } from 'date-fns';
import { MapPin, Users } from 'lucide-react';
import type { GatherEvent } from '../types';

interface Props {
  event: GatherEvent;
  onClick: () => void;
  showCountdown?: boolean;
}

const COVER_EMOJIS = ['🎉', '🎬', '🍕', '🎮', '🏖️', '🎵', '🏃', '🍻', '🎲', '🌮', '☕', '🎤', '🛋️', '🎯', '🌿'];
const COVER_BG = [
  '#fde8ec', '#fde8ec', '#fde8d8', '#fef3cd', '#d8f0f5',
  '#d8f2e8', '#d8f0ed', '#dceeff', '#e8e4ff', '#fde0e4',
];

function getCover(event: GatherEvent): string {
  if (event.cover) return event.cover;
  const idx = event.name.charCodeAt(0) % COVER_EMOJIS.length;
  return COVER_EMOJIS[idx];
}

function getCoverBg(event: GatherEvent): string {
  const idx = event.name.charCodeAt(0) % COVER_BG.length;
  return COVER_BG[idx];
}

export function countdownLabel(finalizedDate: string): string | null {
  try {
    const date = parseISO(finalizedDate);
    if (isToday(date)) return 'today!';
    if (isTomorrow(date)) return 'tomorrow';
    const diff = differenceInDays(date, new Date());
    if (diff < 0) return null;
    if (diff <= 30) return `${diff}d away`;
    return null;
  } catch {
    return null;
  }
}

export function EventCard({ event, onClick, showCountdown }: Props) {
  const isFinalized = event.status === 'finalized';
  const totalVotes = event.timeOptions.reduce((s, o) => s + o.votes.length, 0);
  const cover = getCover(event);
  const coverBg = getCoverBg(event);

  function displayTime() {
    if (isFinalized && event.finalizedDate) {
      try {
        return format(parseISO(`${event.finalizedDate}T${event.finalizedTime || '00:00'}`), 'EEE, MMM d · h:mm a');
      } catch { return ''; }
    }
    if (event.timeOptions.length === 0) return '';
    const best = event.timeOptions.reduce((b, o) => o.votes.length >= b.votes.length ? o : b, event.timeOptions[0]);
    try {
      return format(parseISO(`${best.date}T${best.time}`), 'EEE, MMM d · h:mm a');
    } catch { return ''; }
  }

  const location = isFinalized
    ? event.locationFinalized || event.locationFixed
    : event.locationFixed || (event.locationOptions[0]?.value ?? '');

  const countdown = isFinalized && event.finalizedDate && showCountdown
    ? countdownLabel(event.finalizedDate)
    : null;

  return (
    <button
      onClick={onClick}
      className={`w-full text-left rounded-2xl p-4 transition-all active:scale-[0.98] flex gap-3 ${
        isFinalized
          ? 'bg-white border border-emerald-100'
          : 'bg-white border border-[#f0e4e8] hover:border-rose-200'
      }`}
      style={{boxShadow: isFinalized ? '0 2px 12px rgba(60,160,100,0.08)' : '0 2px 10px rgba(180,80,100,0.07)'}}
    >
      {/* Emoji cover */}
      <div
        className="w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 mt-0.5"
        style={{background: isFinalized ? '#e8f7ef' : coverBg}}
      >
        {cover}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h3 className={`font-bold text-[15px] truncate leading-snug ${isFinalized ? 'text-emerald-900' : 'text-[#1a1014]'}`}>
              {event.name}
            </h3>
            {displayTime() && (
              <p className={`text-sm mt-0.5 ${isFinalized ? 'text-emerald-700' : 'text-[#b07888]'}`}>{displayTime()}</p>
            )}
            {location && (
              <a
                href={`https://maps.google.com/?q=${encodeURIComponent(location)}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={e => e.stopPropagation()}
                className={`text-xs flex items-center gap-1 mt-1 hover:underline ${isFinalized ? 'text-emerald-600' : 'text-[#c4a0a8]'}`}
              >
                <MapPin size={11} /> {location}
              </a>
            )}
          </div>

          <div className="flex flex-col items-end gap-1.5 shrink-0">
            {!isFinalized && totalVotes > 0 && (
              <div className="flex items-center gap-1 text-xs text-[#d4607a] font-semibold bg-rose-50 px-2 py-0.5 rounded-lg">
                <Users size={11} /> {totalVotes}
              </div>
            )}
            {isFinalized && event.gcalEventId && (
              <div className="text-[10px] text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-lg font-medium">GCal ✓</div>
            )}
            {countdown && (
              <span className="text-[11px] font-bold text-sky-500 bg-sky-50 px-2 py-0.5 rounded-full">
                {countdown}
              </span>
            )}
            {isFinalized && !countdown && (
              <span className="text-[10px] text-emerald-600 font-semibold">locked in ✓</span>
            )}
          </div>
        </div>

        {!isFinalized && event.timeOptions.length > 1 && (
          <div className="mt-2 flex flex-wrap gap-1.5">
            {event.timeOptions.slice(0, 3).map(opt => (
              <span key={opt.id} className="text-[11px] bg-[#fdf0f3] text-[#d4607a] px-2 py-0.5 rounded-full font-medium">
                {(() => { try { return format(parseISO(`${opt.date}T${opt.time || '00:00'}`), opt.time && opt.time !== '00:00' ? 'MMM d · h:mm a' : 'MMM d'); } catch { return ''; } })()}
                {opt.votes.length > 0 && ` · ${opt.votes.length}`}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}
