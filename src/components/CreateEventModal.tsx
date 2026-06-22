import { useState, useEffect, useRef } from 'react';
import { Plus, Trash2, MapPin, Clock, Calendar, Repeat, Sparkles, Wand2, Loader2 } from 'lucide-react';
import { Modal } from './Modal';
import { addDays, format } from 'date-fns';
import type { TimeOption, LocationOption } from '../types';
import { suggestTimesFromHistory, parseNaturalLanguageEvent, isAIConfigured, type AISuggestedTime } from '../lib/ai';
import { getPlaceSuggestions, getUserLocation, isPlacesConfigured, type PlaceSuggestion } from '../lib/places';

// ── Reusable location input with Places dropdown ──────────────────────────────
function LocationInput({
  value,
  onChange,
  placeholder = 'Enter location (optional)',
  userLocation,
  className = '',
}: {
  value: string;
  onChange: (val: string, place?: PlaceSuggestion) => void;
  placeholder?: string;
  userLocation: React.MutableRefObject<{ lat: number; lng: number } | null>;
  className?: string;
}) {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounce = useRef<ReturnType<typeof setTimeout> | null>(null);

  async function fetch(query: string, immediate = false) {
    if (debounce.current) clearTimeout(debounce.current);
    if (!isPlacesConfigured || query.trim().length < 2) {
      setSuggestions([]);
      setOpen(false);
      return;
    }
    setLoading(true);
    const run = async () => {
      const res = await getPlaceSuggestions(query, userLocation.current ?? undefined);
      setSuggestions(res);
      setOpen(res.length > 0);
      setLoading(false);
    };
    if (immediate) { run(); }
    else { debounce.current = setTimeout(run, 350); }
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    onChange(e.target.value);
    fetch(e.target.value);
  }

  function handleFocus() {
    if (suggestions.length > 0) { setOpen(true); return; }
    if (value.trim().length >= 2) fetch(value, true);
  }

  function handleBlur() {
    setTimeout(() => setOpen(false), 150);
  }

  function selectPlace(place: PlaceSuggestion) {
    onChange(place.fullText, place);
    setSuggestions([]);
    setOpen(false);
  }

  return (
    <div className={`relative ${className}`}>
      <MapPin size={16} className="absolute left-3 top-3.5 text-gray-400 z-10 pointer-events-none" />
      {loading && (
        <Loader2 size={14} className="absolute right-3 top-3.5 text-[#FFB7C5] animate-spin z-10 pointer-events-none" />
      )}
      <input
        className="w-full rounded-xl border border-gray-200 pl-9 pr-8 py-3 text-base focus:outline-none focus:ring-2 focus:ring-[#FFB7C5] bg-[#fff8fa]"
        placeholder={placeholder}
        value={value}
        onChange={handleChange}
        onFocus={handleFocus}
        onBlur={handleBlur}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-1 bg-white rounded-2xl border border-[#fce4e8] shadow-lg z-50 overflow-hidden">
          {suggestions.map((place, i) => (
            <button
              key={place.placeId}
              type="button"
              onMouseDown={() => selectPlace(place)}
              className={`w-full flex items-start gap-3 px-4 py-3 text-left hover:bg-[#fff8fa] transition-colors ${i > 0 ? 'border-t border-[#fce4e8]' : ''}`}
            >
              <MapPin size={14} className="text-[#FFB7C5] shrink-0 mt-0.5" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-[#1a1014] truncate">{place.name}</p>
                {place.address && <p className="text-xs text-[#b07888] truncate">{place.address}</p>}
              </div>
            </button>
          ))}
          <div className="px-4 py-2 border-t border-[#fce4e8]">
            <img src="https://maps.gstatic.com/mapfiles/api-3/images/powered-by-google-on-white3.png" alt="Powered by Google" className="h-4 opacity-60" />
          </div>
        </div>
      )}
    </div>
  );
}

const COVER_EMOJIS = ['🎉', '🎬', '🍕', '🎮', '🏖️', '🎵', '🏃', '🍻', '🎲', '🌮', '☕', '🎤', '🛋️', '🎯', '🌿'];

interface Props {
  onClose: () => void;
  initialTitle?: string;
  autoFill?: boolean;
  pastFinalizedEvents?: Array<{ name: string; finalizedDate: string; finalizedTime: string }>;
  onCreate: (data: {
    name: string;
    cover: string;
    locationFixed: string;
    locationOptions: Omit<LocationOption, 'votes'>[];
    timeOptions: Omit<TimeOption, 'votes' | 'cantMakeIt'>[];
    availabilityDates: string[];
    recurring: null | { frequency: 'weekly' | 'biweekly' | 'monthly'; occurrences: number };
    autoFinalizeDate?: string;
    autoFinalizeTime?: string;
  }) => Promise<void>;
}

let idCounter = 0;
function uid() { return `opt_${++idCounter}_${Date.now()}`; }

export function CreateEventModal({ onClose, onCreate, initialTitle = '', autoFill = false, pastFinalizedEvents = [] }: Props) {
  const [name, setName] = useState(initialTitle);
  const [cover, setCover] = useState(COVER_EMOJIS[0]);
  const [locMode, setLocMode] = useState<'fixed' | 'vote'>('fixed');
  const [locationFixed, setLocationFixed] = useState('');
  const userLocationRef = useRef<{ lat: number; lng: number } | null>(null);
  const [locationOptions, setLocationOptions] = useState<{ id: string; value: string }[]>([
    { id: uid(), value: '' },
    { id: uid(), value: '' },
  ]);
  const [timeMode, setTimeMode] = useState<'vote' | 'availability'>('vote');
  const [timeOptions, setTimeOptions] = useState<{ id: string; date: string; time: string }[]>([
    { id: uid(), date: '', time: '' },
  ]);
  const [availStart, setAvailStart] = useState('');
  const [availEnd, setAvailEnd] = useState('');
  const [recurring, setRecurring] = useState(false);
  const [recurFreq, setRecurFreq] = useState<'weekly' | 'biweekly' | 'monthly'>('weekly');
  const [recurCount, setRecurCount] = useState(4);
  const [saving, setSaving] = useState(false);

  // ── AI: natural language input ──────────────────────────────────────────
  const [nlInput, setNlInput] = useState('');
  const [nlLoading, setNlLoading] = useState(false);
  const [nlError, setNlError] = useState('');
  const [nlSuccess, setNlSuccess] = useState('');
  const [showNL, setShowNL] = useState(false);

  // ── AI: time suggestions ─────────────────────────────────────────────────
  const [aiSuggestions, setAISuggestions] = useState<AISuggestedTime[]>([]);
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState('');
  const [suggestionsVisible, setSuggestionsVisible] = useState(false);

  // ── Helpers ──────────────────────────────────────────────────────────────

  function addTimeOption() {
    setTimeOptions(prev => [...prev, { id: uid(), date: '', time: '' }]);
  }
  function removeTimeOption(id: string) {
    setTimeOptions(prev => prev.filter(o => o.id !== id));
  }
  function addLocOption() {
    setLocationOptions(prev => [...prev, { id: uid(), value: '' }]);
  }
  function removeLocOption(id: string) {
    setLocationOptions(prev => prev.filter(o => o.id !== id));
  }

  const filledTimeOptions = timeOptions.filter(o => o.date && o.time);

  // Grab user location once on mount for better place suggestions
  useEffect(() => {
    if (isPlacesConfigured) {
      getUserLocation().then(loc => { userLocationRef.current = loc; });
    }
  }, []);

  function getAvailabilityDates(): string[] {
    if (timeMode !== 'availability' || !availStart || !availEnd) return [];
    const start = new Date(availStart);
    const end = new Date(availEnd);
    if (end < start) return [];
    const dates: string[] = [];
    let cur = start;
    let count = 0;
    while (cur <= end && count < 14) {
      dates.push(format(cur, 'yyyy-MM-dd'));
      cur = addDays(cur, 1);
      count++;
    }
    return dates;
  }

  const availDates = getAvailabilityDates();
  const canSubmit = name.trim() && (
    timeMode === 'vote' ? filledTimeOptions.length > 0 : availDates.length > 0
  );

  // ── AI handlers ──────────────────────────────────────────────────────────

  // Auto-fill from idea title on mount
  useEffect(() => {
    if (autoFill && isAIConfigured && initialTitle.trim()) {
      handleNLFill(initialTitle.trim());
    }
  }, []);

  async function handleNLFill(overrideInput?: string) {
    const input = overrideInput ?? nlInput;
    if (!input.trim()) return;
    setNlLoading(true);
    setNlError('');
    setNlSuccess('');
    try {
      const parsed = await parseNaturalLanguageEvent(input.trim());

      const filled: string[] = [];

      if (parsed.name) { setName(parsed.name); filled.push(`name: "${parsed.name}"`); }
      if (parsed.cover) {
        const emojiMatch = [...parsed.cover].find(c => COVER_EMOJIS.includes(c));
        if (emojiMatch) { setCover(emojiMatch); filled.push(`cover: ${emojiMatch}`); }
      }
      if (parsed.locations && parsed.locations.length > 1) {
        // Multiple locations → switch to vote mode
        setLocMode('vote');
        setLocationOptions(parsed.locations.map(v => ({ id: uid(), value: v })));
        filled.push(`locations: ${parsed.locations.map(l => `"${l}"`).join(', ')}`);
      } else if (parsed.location) {
        setLocMode('fixed');
        setLocationFixed(parsed.location);
        filled.push(`location: "${parsed.location}"`);
      }
      // Prefer multi-date array (e.g. "either Friday or Saturday"); fall back to single
      if (parsed.dates && parsed.dates.length > 0) {
        setTimeMode('vote');
        setTimeOptions(parsed.dates.map(d => ({ id: uid(), date: d.date, time: d.time })));
        filled.push(`${parsed.dates.length} time option${parsed.dates.length > 1 ? 's' : ''}`);
      } else if (parsed.date || parsed.time) {
        setTimeMode('vote');
        setTimeOptions([{ id: uid(), date: parsed.date || '', time: parsed.time || '' }]);
        filled.push('time option');
      }

      if (filled.length === 0) {
        setNlError('Nothing recognised — try something like "dinner Saturday 7pm at Sarah\'s"');
        return;
      }

      setNlSuccess(`✓ Filled: ${filled.join(', ')}`);
      setNlInput('');
    } catch (e: any) {
      const msg = String(e?.message || e || '');
      setNlError(`Error: ${msg || 'unknown — check browser console for details'}`);
    } finally {
      setNlLoading(false);
    }
  }

  async function handleSuggestTimes() {
    setSuggestionsLoading(true);
    setSuggestionsError('');
    setSuggestionsVisible(true);
    try {
      const suggestions = await suggestTimesFromHistory(pastFinalizedEvents, name.trim() || 'hangout');
      if (suggestions.length === 0) {
        setSuggestionsError('Couldn\'t generate suggestions — try again');
      } else {
        setAISuggestions(suggestions);
      }
    } catch (e: any) {
      const msg = e?.message || '';
      if (msg.includes('401') || msg.includes('auth') || msg.includes('API key') || msg.includes('api_key')) {
        setSuggestionsError('Invalid API key — check VITE_ANTHROPIC_API_KEY in your .env file');
      } else {
        setSuggestionsError('AI suggestions failed — try again');
      }
    } finally {
      setSuggestionsLoading(false);
    }
  }

  function applyAISuggestion(s: AISuggestedTime) {
    setTimeOptions(prev => {
      // Fill the first empty slot, or add a new one
      const emptyIdx = prev.findIndex(o => !o.date && !o.time);
      if (emptyIdx >= 0) {
        return prev.map((o, i) => i === emptyIdx ? { ...o, date: s.date, time: s.time } : o);
      }
      return [...prev, { id: uid(), date: s.date, time: s.time }];
    });
    setSuggestionsVisible(false);
  }

  // ── Submit ────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;
    setSaving(true);
    try {
      const singleTime = timeMode === 'vote' && filledTimeOptions.length === 1;
      await onCreate({
        name: name.trim(),
        cover,
        locationFixed: locMode === 'fixed' ? locationFixed.trim() : '',
        locationOptions: locMode === 'vote'
          ? locationOptions.filter(o => o.value.trim()).map(o => ({ id: o.id, value: o.value.trim() }))
          : [],
        timeOptions: timeMode === 'vote' ? filledTimeOptions : [],
        availabilityDates: availDates,
        recurring: recurring && timeMode === 'vote' ? { frequency: recurFreq, occurrences: recurCount } : null,
        autoFinalizeDate: singleTime ? filledTimeOptions[0].date : undefined,
        autoFinalizeTime: singleTime ? filledTimeOptions[0].time : undefined,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  // ── Format helper for suggestion display ─────────────────────────────────
  function fmtSuggestionDate(date: string) {
    try { return format(new Date(date + 'T12:00:00'), 'EEE, MMM d'); } catch { return date; }
  }
  function fmtSuggestionTime(time: string) {
    try {
      const [h, m] = time.split(':').map(Number);
      const suffix = h >= 12 ? 'pm' : 'am';
      return `${h % 12 || 12}${m ? ':' + String(m).padStart(2, '0') : ''}${suffix}`;
    } catch { return time; }
  }

  return (
    <Modal title="New Event" onClose={onClose} fullScreen>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">

        {/* ── Auto-fill banner (when opened from "Plan it") ───────────── */}
        {autoFill && isAIConfigured && (nlLoading || nlSuccess) && (
          <div className={`flex items-center gap-2.5 px-4 py-3 rounded-2xl text-sm font-medium ${nlLoading ? 'bg-[#fff0f4] text-[#d4607a] border border-[#fce4e8]' : 'bg-[#f0fdf4] text-emerald-700 border border-emerald-200'}`}>
            {nlLoading
              ? <><Loader2 size={15} className="animate-spin shrink-0" /> AI is reading your idea…</>
              : <><Sparkles size={15} className="shrink-0" /> {nlSuccess}</>
            }
          </div>
        )}

        {/* ── AI Natural Language Bar ─────────────────────────────────── */}
        {isAIConfigured && (
          <div>
            {!showNL ? (
              <button
                type="button"
                onClick={() => setShowNL(true)}
                className="w-full flex items-center gap-2 py-3 px-4 rounded-2xl border border-dashed border-rose-200 bg-rose-50 text-[#d4607a] text-sm font-semibold hover:bg-rose-100 transition-colors"
              >
                <Sparkles size={15} />
                ✨ Describe in plain English to auto-fill…
              </button>
            ) : (
              <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 flex flex-col gap-3">
                <div className="flex items-center gap-2 text-[#c45070] text-xs font-bold uppercase tracking-wider">
                  <Sparkles size={13} />
                  AI quick-fill
                </div>
                <input
                  autoFocus
                  className="w-full rounded-xl border border-rose-200 bg-white px-4 py-3 text-base placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-rose-300"
                  placeholder="e.g. 'dinner Saturday 7pm at Maya's place'"
                  value={nlInput}
                  onChange={e => setNlInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), handleNLFill())}
                />
                {nlError && <p className="text-xs text-red-500">{nlError}</p>}
                {nlSuccess && (
                  <p className="text-xs text-emerald-600 font-medium bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2">
                    {nlSuccess}
                  </p>
                )}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handleNLFill()}
                    disabled={nlLoading || !nlInput.trim()}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-[#FFB7C5] text-[#1a1014] text-sm font-bold disabled:opacity-40 hover:bg-[#F2C7C7] transition-colors"
                  >
                    {nlLoading ? <Loader2 size={15} className="animate-spin" /> : <Wand2 size={15} />}
                    {nlLoading ? 'Filling…' : 'Auto-fill form'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowNL(false); setNlError(''); setNlInput(''); setNlSuccess(''); }}
                    className={`px-4 py-2.5 rounded-xl text-sm transition-colors ${nlSuccess ? 'bg-emerald-600 text-white hover:bg-emerald-700 font-bold' : 'bg-white border border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                  >
                    {nlSuccess ? 'Done ✓' : 'Cancel'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── Emoji cover picker ──────────────────────────────────────── */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Pick a cover</label>
          <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
            {COVER_EMOJIS.map(e => (
              <button
                key={e}
                type="button"
                onClick={() => setCover(e)}
                className={`w-10 h-10 flex items-center justify-center rounded-xl text-xl shrink-0 transition-all ${
                  cover === e ? 'bg-rose-100 ring-2 ring-rose-300 scale-110' : 'bg-gray-100 hover:bg-gray-200'
                }`}
              >
                {e}
              </button>
            ))}
          </div>
        </div>

        {/* ── Name ───────────────────────────────────────────────────── */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Event name</label>
          <input
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-rose-300 bg-rose-50"
            placeholder="e.g. Game night"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
        </div>

        {/* ── Location ───────────────────────────────────────────────── */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Location</label>
          <div className="flex gap-2 mb-3">
            <button type="button" onClick={() => setLocMode('fixed')} className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${locMode === 'fixed' ? 'bg-[#FFB7C5] text-[#1a1014] border-[#FFB7C5]' : 'bg-white text-gray-600 border-gray-200'}`}>Set location</button>
            <button type="button" onClick={() => setLocMode('vote')} className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${locMode === 'vote' ? 'bg-[#FFB7C5] text-[#1a1014] border-[#FFB7C5]' : 'bg-white text-gray-600 border-gray-200'}`}>Let friends vote</button>
          </div>

          {locMode === 'fixed' ? (
            <LocationInput
              value={locationFixed}
              onChange={val => setLocationFixed(val)}
              userLocation={userLocationRef}
            />
          ) : (
            <div className="flex flex-col gap-2">
              {locationOptions.map((opt, idx) => (
                <div key={opt.id} className="flex gap-2 items-start">
                  <LocationInput
                    className="flex-1"
                    value={opt.value}
                    onChange={val => setLocationOptions(prev => prev.map(o => o.id === opt.id ? { ...o, value: val } : o))}
                    placeholder={`Option ${idx + 1}`}
                    userLocation={userLocationRef}
                  />
                  {locationOptions.length > 2 && (
                    <button type="button" onClick={() => removeLocOption(opt.id)} className="text-gray-400 hover:text-red-400 px-2 pt-3.5"><Trash2 size={16} /></button>
                  )}
                </div>
              ))}
              <button type="button" onClick={addLocOption} className="flex items-center gap-1 text-[#d4607a] text-sm font-medium mt-1"><Plus size={15} /> Add option</button>
            </div>
          )}
        </div>

        {/* ── When ───────────────────────────────────────────────────── */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">When</label>
          <div className="flex gap-2 mb-4">
            <button type="button" onClick={() => setTimeMode('vote')} className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${timeMode === 'vote' ? 'bg-[#FFB7C5] text-[#1a1014] border-[#FFB7C5]' : 'bg-white text-gray-600 border-gray-200'}`}>Vote on options</button>
            <button type="button" onClick={() => setTimeMode('availability')} className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${timeMode === 'availability' ? 'bg-[#FFB7C5] text-[#1a1014] border-[#FFB7C5]' : 'bg-white text-gray-600 border-gray-200'}`}>Availability poll</button>
          </div>

          {timeMode === 'vote' && (
            <>
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs text-gray-400">
                  {filledTimeOptions.length === 1
                    ? '✓ one time set — will be scheduled directly, no poll'
                    : 'Add one or more options — friends will vote on them'}
                </p>
                {/* AI suggest button */}
                {isAIConfigured && (
                  <button
                    type="button"
                    onClick={handleSuggestTimes}
                    disabled={suggestionsLoading}
                    className="flex items-center gap-1.5 text-xs font-bold text-[#d4607a] bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg hover:bg-rose-100 disabled:opacity-50 transition-colors shrink-0 ml-2"
                  >
                    {suggestionsLoading
                      ? <Loader2 size={11} className="animate-spin" />
                      : <Sparkles size={11} />}
                    {suggestionsLoading ? 'Thinking…' : '✨ Suggest'}
                  </button>
                )}
              </div>

              {/* AI suggestions panel */}
              {suggestionsVisible && (
                <div className="mb-4 rounded-2xl border border-rose-200 bg-rose-50 overflow-hidden">
                  <div className="px-4 py-2.5 bg-rose-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-[#c45070] uppercase tracking-wide">
                      ✨ AI picks — based on your group's history
                    </span>
                    <button type="button" onClick={() => setSuggestionsVisible(false)} className="text-rose-300 hover:text-[#d4607a] text-lg leading-none">×</button>
                  </div>

                  {suggestionsLoading && (
                    <div className="px-4 py-6 text-center text-rose-400 text-sm flex items-center justify-center gap-2">
                      <Loader2 size={16} className="animate-spin" />
                      Analyzing your group's schedule…
                    </div>
                  )}

                  {suggestionsError && (
                    <p className="px-4 py-4 text-sm text-red-500">{suggestionsError}</p>
                  )}

                  {!suggestionsLoading && aiSuggestions.length > 0 && (
                    <div className="divide-y divide-rose-100">
                      {aiSuggestions.map((s, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => applyAISuggestion(s)}
                          className="w-full flex items-start gap-3 px-4 py-3 hover:bg-rose-100 transition-colors text-left"
                        >
                          <span className="text-lg mt-0.5 shrink-0">{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-gray-900">{s.label}</p>
                            <p className="text-xs text-[#d4607a] font-medium">{fmtSuggestionDate(s.date)} · {fmtSuggestionTime(s.time)}</p>
                            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{s.reason}</p>
                          </div>
                          <span className="text-xs font-bold text-rose-400 bg-white border border-rose-200 px-2 py-1 rounded-lg shrink-0 mt-0.5">Add →</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div className="flex flex-col gap-3">
                {timeOptions.map((opt) => (
                  <div key={opt.id} className="flex gap-2 items-start">
                    <div className="flex-1 flex flex-col gap-2">
                      <div className="relative">
                        <Calendar size={16} className="absolute left-3 top-3.5 text-gray-400" />
                        <input type="date" className="w-full rounded-xl border border-gray-200 pl-9 pr-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-rose-300 bg-rose-50" value={opt.date} onChange={e => setTimeOptions(prev => prev.map(o => o.id === opt.id ? { ...o, date: e.target.value } : o))} />
                      </div>
                      <div className="relative">
                        <Clock size={16} className="absolute left-3 top-3.5 text-gray-400" />
                        <input type="time" className="w-full rounded-xl border border-gray-200 pl-9 pr-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-rose-300 bg-rose-50" value={opt.time} onChange={e => setTimeOptions(prev => prev.map(o => o.id === opt.id ? { ...o, time: e.target.value } : o))} />
                        {opt.time === '00:00' && (
                          <span className="absolute right-3 top-3 text-xs font-semibold text-rose-300 bg-rose-100 px-2 py-0.5 rounded-lg pointer-events-none">All day</span>
                        )}
                      </div>
                    </div>
                    {timeOptions.length > 1 && (
                      <button type="button" onClick={() => removeTimeOption(opt.id)} className="text-gray-400 hover:text-red-400 px-1 pt-3"><Trash2 size={16} /></button>
                    )}
                  </div>
                ))}
              </div>
              <button type="button" onClick={addTimeOption} className="flex items-center gap-1 text-[#d4607a] text-sm font-medium mt-3">
                <Plus size={15} /> Add another time option
              </button>
            </>
          )}

          {timeMode === 'availability' && (
            <div className="flex flex-col gap-3">
              <p className="text-xs text-gray-400">Pick a date range (max 14 days). Friends will fill in when they're free.</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Start date</label>
                  <div className="relative">
                    <Calendar size={16} className="absolute left-3 top-3.5 text-gray-400" />
                    <input type="date" className="w-full rounded-xl border border-gray-200 pl-9 pr-2 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 bg-rose-50" value={availStart} onChange={e => setAvailStart(e.target.value)} />
                  </div>
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">End date</label>
                  <div className="relative">
                    <Calendar size={16} className="absolute left-3 top-3.5 text-gray-400" />
                    <input type="date" className="w-full rounded-xl border border-gray-200 pl-9 pr-2 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 bg-rose-50" value={availEnd} min={availStart} onChange={e => setAvailEnd(e.target.value)} />
                  </div>
                </div>
              </div>
              {availDates.length > 0 && (
                <p className="text-xs text-emerald-600 font-medium">{availDates.length} day{availDates.length !== 1 ? 's' : ''} selected</p>
              )}
            </div>
          )}
        </div>

        {/* ── Repeat ─────────────────────────────────────────────────── */}
        {timeMode === 'vote' && (
          <div className="border border-gray-200 rounded-2xl p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Repeat size={16} className="text-gray-500" />
                <span className="text-sm font-semibold text-gray-700">Repeat event</span>
              </div>
              <button type="button" onClick={() => setRecurring(v => !v)} className={`relative w-10 h-6 rounded-full transition-colors ${recurring ? 'bg-[#FFB7C5]' : 'bg-gray-200'}`}>
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white shadow transition-all ${recurring ? 'left-5' : 'left-1'}`} />
              </button>
            </div>
            {recurring && (
              <div className="flex flex-col gap-3 pt-1">
                <div className="flex gap-2">
                  {(['weekly', 'biweekly', 'monthly'] as const).map(f => (
                    <button key={f} type="button" onClick={() => setRecurFreq(f)} className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-colors ${recurFreq === f ? 'bg-[#FFB7C5] text-[#1a1014] border-[#FFB7C5]' : 'bg-white text-gray-600 border-gray-200'}`}>
                      {f === 'weekly' ? 'Weekly' : f === 'biweekly' ? 'Every 2 wks' : 'Monthly'}
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-gray-600">Occurrences:</span>
                  <input type="number" min={2} max={12} value={recurCount} onChange={e => setRecurCount(Math.min(12, Math.max(2, Number(e.target.value))))} className="w-16 rounded-xl border border-gray-200 px-3 py-2 text-sm text-center focus:outline-none focus:ring-2 focus:ring-rose-300 bg-rose-50" />
                </div>
              </div>
            )}
          </div>
        )}

        <button type="submit" disabled={!canSubmit || saving} className="w-full py-4 rounded-2xl bg-[#FFB7C5] text-[#1a1014] font-bold text-base disabled:opacity-40 hover:bg-[#F2C7C7] active:scale-[0.98] transition-all mt-2">
          {saving ? 'Creating…' : 'Create event'}
        </button>
      </form>
    </Modal>
  );
}
