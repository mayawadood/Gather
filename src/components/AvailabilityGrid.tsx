import { useState } from 'react';
import { format, parseISO, eachDayOfInterval } from 'date-fns';
import { Zap, Check } from 'lucide-react';
import type { GatherEvent } from '../types';
import { rankAvailabilitySlots } from '../lib/availability';

interface Props {
  event: GatherEvent;
  userId: string;
  isCreator: boolean;
  onFillAvailability: (slots: string[]) => Promise<void>;
  onFinalize: (date: string, time: string, location: string) => Promise<void>;
}

function generateTimeSlots(): string[] {
  const slots: string[] = [];
  for (let h = 8; h < 23; h++) {
    slots.push(`${String(h).padStart(2, '0')}:00`);
    slots.push(`${String(h).padStart(2, '0')}:30`);
  }
  slots.push('23:00');
  return slots;
}

const TIME_SLOTS = generateTimeSlots();

function slotKey(date: string, time: string) { return `${date} ${time}`; }

function overlapColor(count: number, total: number): string {
  if (count === 0) return '';
  const ratio = count / Math.max(total, 1);
  if (ratio < 0.34) return 'bg-emerald-100';
  if (ratio < 0.67) return 'bg-emerald-300';
  return 'bg-emerald-500';
}

function formatSlotTime(time: string) {
  try { return format(parseISO(`2000-01-01T${time}`), 'h:mm a'); } catch { return time; }
}
function formatSlotDate(date: string) {
  try { return format(parseISO(date), 'EEE, MMM d'); } catch { return date; }
}

export function AvailabilityGrid({ event, userId, isCreator, onFillAvailability, onFinalize }: Props) {
  const [localSlots, setLocalSlots] = useState<Set<string>>(
    new Set(event.availabilitySlots?.[userId] ?? [])
  );
  const [isDragging, setIsDragging] = useState(false);
  const [dragMode, setDragMode] = useState<'add' | 'remove'>('add');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [pickedSlot, setPickedSlot] = useState<string | null>(null); // "date time"

  if (!event.availabilityDates?.length) return null;

  const dates = eachDayOfInterval({
    start: parseISO(event.availabilityDates[0]),
    end: parseISO(event.availabilityDates[event.availabilityDates.length - 1]),
  });

  // Build overlap counts from saved data (not local — shows real responses)
  const slotCounts: Record<string, string[]> = {};
  for (const [uid, slots] of Object.entries(event.availabilitySlots ?? {})) {
    for (const s of slots) {
      if (!slotCounts[s]) slotCounts[s] = [];
      slotCounts[s].push(uid);
    }
  }
  const totalRespondents = Object.keys(event.availabilitySlots ?? {}).length;

  // Ranked best slots
  const ranked = rankAvailabilitySlots(event, 5);

  function handleMouseDown(date: string, time: string) {
    const key = slotKey(date, time);
    const mode = localSlots.has(key) ? 'remove' : 'add';
    setDragMode(mode);
    setIsDragging(true);
    setSaved(false);
    setLocalSlots(prev => {
      const next = new Set(prev);
      mode === 'remove' ? next.delete(key) : next.add(key);
      return next;
    });
  }

  function handleMouseEnter(date: string, time: string) {
    if (!isDragging) return;
    const key = slotKey(date, time);
    setSaved(false);
    setLocalSlots(prev => {
      const next = new Set(prev);
      dragMode === 'remove' ? next.delete(key) : next.add(key);
      return next;
    });
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onFillAvailability(Array.from(localSlots));
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  async function handleAutoFinalize() {
    if (!ranked[0]) return;
    const best = ranked[0];
    setFinalizing(true);
    try {
      await onFinalize(best.date, best.time, event.locationFinalized || event.locationFixed || '');
    } finally {
      setFinalizing(false);
    }
  }

  async function handleManualFinalize() {
    if (!pickedSlot) return;
    const [date, time] = pickedSlot.split(' ');
    setFinalizing(true);
    try {
      await onFinalize(date, time, event.locationFinalized || event.locationFixed || '');
    } finally {
      setFinalizing(false);
    }
  }

  return (
    <div
      className="flex flex-col gap-4"
      onMouseUp={() => setIsDragging(false)}
      onMouseLeave={() => setIsDragging(false)}
    >
      {/* Section header */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-700">
          Availability
          {totalRespondents > 0 && (
            <span className="ml-2 text-xs font-normal text-gray-400">
              {totalRespondents} response{totalRespondents !== 1 ? 's' : ''}
            </span>
          )}
        </h3>
        <button
          onClick={handleSave}
          disabled={saving}
          className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
            saved
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-[#FFB7C5] text-[#1a1014] hover:bg-[#F2C7C7] disabled:opacity-40'
          }`}
        >
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save availability'}
        </button>
      </div>

      <p className="text-xs text-gray-400 -mt-2">Tap or drag to mark when you're free. Darker green = more people free.</p>

      {/* Grid */}
      <div className="overflow-x-auto -mx-1 px-1">
        <div className="inline-block min-w-full">
          {/* Date headers */}
          <div className="flex">
            <div className="w-10 shrink-0" />
            {dates.map(d => (
              <div key={d.toISOString()} className="flex-1 min-w-[38px] text-center text-[9px] font-semibold text-gray-500 pb-1">
                <div>{format(d, 'EEE')}</div>
                <div>{format(d, 'M/d')}</div>
              </div>
            ))}
          </div>

          {/* Time rows */}
          {TIME_SLOTS.map((time, ti) => (
            <div key={time} className="flex items-center">
              <div className="w-10 shrink-0 text-[9px] text-gray-400 pr-1 text-right leading-none">
                {time.endsWith(':00') ? format(parseISO(`2000-01-01T${time}`), 'ha') : ''}
              </div>
              {dates.map(d => {
                const date = format(d, 'yyyy-MM-dd');
                const key = slotKey(date, time);
                const isMine = localSlots.has(key);
                const othersHere = (slotCounts[key] ?? []).filter(u => u !== userId);
                const totalHere = (isMine ? 1 : 0) + othersHere.length;
                const isPicked = pickedSlot === key;

                return (
                  <div
                    key={key}
                    onMouseDown={() => handleMouseDown(date, time)}
                    onMouseEnter={() => handleMouseEnter(date, time)}
                    className={`flex-1 min-w-[38px] h-[14px] border-b border-r border-gray-100 cursor-pointer select-none transition-colors
                      ${isPicked ? 'ring-2 ring-inset ring-rose-400' : ''}
                      ${isMine ? 'bg-rose-300' : overlapColor(othersHere.length, totalRespondents)}
                      ${ti === 0 ? 'border-t' : ''}
                    `}
                    title={totalHere > 0 ? `${totalHere}/${totalRespondents} free` : undefined}
                  />
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-3 text-[10px] text-gray-400 flex-wrap">
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-rose-300 inline-block" /> You</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-emerald-100 inline-block" /> Some</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-emerald-300 inline-block" /> Most</span>
        <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-sm bg-emerald-500 inline-block" /> All</span>
      </div>

      {/* ── Best times panel ── */}
      {ranked.length > 0 && (
        <div className="border border-gray-100 rounded-2xl overflow-hidden">
          <div className="bg-gray-50 px-4 py-2.5 flex items-center justify-between">
            <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Best times</p>
            {totalRespondents > 0 && (
              <p className="text-[10px] text-gray-400">{totalRespondents} responded</p>
            )}
          </div>

          <div className="divide-y divide-gray-50">
            {ranked.map((slot, i) => {
              const key = slotKey(slot.date, slot.time);
              const isPicked = pickedSlot === key;
              const pct = Math.round((slot.freeUsers.length / slot.totalRespondents) * 100);
              const allFree = slot.freeUsers.length === slot.totalRespondents;

              return (
                <button
                  key={key}
                  onClick={() => isCreator && setPickedSlot(isPicked ? null : key)}
                  className={`w-full flex items-center gap-3 px-4 py-3 transition-colors text-left ${
                    isCreator ? 'hover:bg-rose-50 cursor-pointer' : 'cursor-default'
                  } ${isPicked ? 'bg-rose-50' : ''}`}
                >
                  {/* Rank badge */}
                  <span className={`text-xs font-black w-5 shrink-0 ${i === 0 ? 'text-[#d4607a]' : 'text-gray-300'}`}>
                    #{i + 1}
                  </span>

                  {/* Date + time */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">
                      {formatSlotDate(slot.date)}
                    </p>
                    <p className="text-xs text-gray-500">{formatSlotTime(slot.time)}</p>
                  </div>

                  {/* Overlap badge */}
                  <div className="flex flex-col items-end gap-0.5 shrink-0">
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                      allFree ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'
                    }`}>
                      {slot.freeUsers.length}/{slot.totalRespondents} free
                    </span>
                    {/* Mini bar */}
                    <div className="w-16 h-1.5 rounded-full bg-gray-100 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${allFree ? 'bg-emerald-400' : 'bg-rose-300'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>

                  {isPicked && <Check size={14} className="text-[#d4607a] shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Finalize controls — creator only */}
          {isCreator && (
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100 flex gap-2">
              <button
                onClick={handleAutoFinalize}
                disabled={finalizing || ranked.length === 0}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-[#FFB7C5] text-[#1a1014] text-sm font-bold hover:bg-[#F2C7C7] disabled:opacity-40 transition-colors"
              >
                <Zap size={14} /> Auto-pick best
              </button>
              <button
                onClick={handleManualFinalize}
                disabled={!pickedSlot || finalizing}
                className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gray-200 text-gray-700 text-sm font-bold hover:bg-gray-300 disabled:opacity-40 transition-colors"
              >
                {pickedSlot ? 'Confirm pick' : 'Tap to pick'}
              </button>
            </div>
          )}
        </div>
      )}

      {ranked.length === 0 && totalRespondents === 0 && (
        <p className="text-xs text-gray-400 text-center py-2">
          No responses yet — be the first to fill in your availability!
        </p>
      )}
    </div>
  );
}
