import { useState } from 'react';
import { Plus, Trash2, MapPin, Clock, Calendar } from 'lucide-react';
import { Modal } from './Modal';
import type { GatherEvent, TimeOption, LocationOption } from '../types';

const COVER_EMOJIS = ['🎉', '🎬', '🍕', '🎮', '🏖️', '🎵', '🏃', '🍻', '🎲', '🌮', '☕', '🎤', '🛋️', '🎯', '🌿'];

interface Props {
  event: GatherEvent;
  onClose: () => void;
  zIndex?: number;
  onSave: (updates: {
    name: string;
    cover: string;
    locationFixed: string;
    locationOptions: Omit<LocationOption, 'votes'>[];
    timeOptions: Omit<TimeOption, 'votes' | 'cantMakeIt'>[];
  }) => Promise<void>;
}

let idCounter = 100;
function uid() { return `opt_${++idCounter}_${Date.now()}`; }

export function EditEventModal({ event, onClose, onSave, zIndex }: Props) {
  const [name, setName] = useState(event.name);
  const [cover, setCover] = useState(event.cover || COVER_EMOJIS[0]);

  const hasLocOptions = event.locationOptions.length > 0;
  const [locMode, setLocMode] = useState<'fixed' | 'vote'>(hasLocOptions ? 'vote' : 'fixed');
  const [locationFixed, setLocationFixed] = useState(event.locationFixed);
  const [locationOptions, setLocationOptions] = useState(
    hasLocOptions
      ? event.locationOptions.map(o => ({ id: o.id, value: o.value }))
      : [{ id: uid(), value: '' }, { id: uid(), value: '' }]
  );

  const [timeOptions, setTimeOptions] = useState(
    event.timeOptions.length > 0
      ? event.timeOptions.map(o => ({ id: o.id, date: o.date, time: o.time }))
      : [{ id: uid(), date: '', time: '' }]
  );

  const [saving, setSaving] = useState(false);

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
  const canSave = name.trim() && filledTimeOptions.length > 0;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSave) return;
    setSaving(true);
    try {
      await onSave({
        name: name.trim(),
        cover,
        locationFixed: locMode === 'fixed' ? locationFixed.trim() : '',
        locationOptions: locMode === 'vote'
          ? locationOptions.filter(o => o.value.trim()).map(o => ({ id: o.id, value: o.value.trim() }))
          : [],
        timeOptions: filledTimeOptions,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  const hasVotes = event.timeOptions.some(o => o.votes.length > 0);

  return (
    <Modal title="Edit Event" onClose={onClose} fullScreen zIndex={zIndex}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-5">

        {/* Votes warning */}
        {hasVotes && (
          <div className="bg-amber-50 border border-sky-100 rounded-xl px-4 py-3 text-xs text-sky-500">
            ⚠️ This event has votes. Existing votes are preserved on unchanged options — new or removed options start fresh.
          </div>
        )}

        {/* Emoji cover */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Cover</label>
          <div className="flex gap-1.5 overflow-x-auto pb-1">
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

        {/* Name */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Event name</label>
          <input
            className="w-full rounded-xl border border-gray-200 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-rose-300 bg-rose-50"
            value={name}
            onChange={e => setName(e.target.value)}
            required
          />
        </div>

        {/* Location */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Location</label>
          <div className="flex gap-2 mb-3">
            <button type="button" onClick={() => setLocMode('fixed')}
              className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${locMode === 'fixed' ? 'bg-[#FFB7C5] text-[#1a1014] border-[#FFB7C5]' : 'bg-white text-gray-600 border-gray-200'}`}>
              Set location
            </button>
            <button type="button" onClick={() => setLocMode('vote')}
              className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors ${locMode === 'vote' ? 'bg-[#FFB7C5] text-[#1a1014] border-[#FFB7C5]' : 'bg-white text-gray-600 border-gray-200'}`}>
              Let friends vote
            </button>
          </div>

          {locMode === 'fixed' ? (
            <div className="relative">
              <MapPin size={16} className="absolute left-3 top-3.5 text-gray-400" />
              <input
                className="w-full rounded-xl border border-gray-200 pl-9 pr-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-rose-300 bg-rose-50"
                placeholder="Enter location (optional)"
                value={locationFixed}
                onChange={e => setLocationFixed(e.target.value)}
              />
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {locationOptions.map(opt => (
                <div key={opt.id} className="flex gap-2">
                  <div className="relative flex-1">
                    <MapPin size={16} className="absolute left-3 top-3.5 text-gray-400" />
                    <input
                      className="w-full rounded-xl border border-gray-200 pl-9 pr-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-rose-300 bg-rose-50"
                      placeholder={`Option ${locationOptions.indexOf(opt) + 1}`}
                      value={opt.value}
                      onChange={e => setLocationOptions(prev => prev.map(o => o.id === opt.id ? { ...o, value: e.target.value } : o))}
                    />
                  </div>
                  {locationOptions.length > 2 && (
                    <button type="button" onClick={() => removeLocOption(opt.id)} className="text-gray-400 hover:text-red-400 px-2">
                      <Trash2 size={16} />
                    </button>
                  )}
                </div>
              ))}
              <button type="button" onClick={addLocOption} className="flex items-center gap-1 text-[#d4607a] text-sm font-medium mt-1">
                <Plus size={15} /> Add option
              </button>
            </div>
          )}
        </div>

        {/* Time options */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Date & time options</label>
          <div className="flex flex-col gap-3">
            {timeOptions.map(opt => (
              <div key={opt.id} className="flex gap-2 items-start">
                <div className="flex-1 flex flex-col gap-2">
                  <div className="relative">
                    <Calendar size={16} className="absolute left-3 top-3.5 text-gray-400" />
                    <input
                      type="date"
                      className="w-full rounded-xl border border-gray-200 pl-9 pr-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-rose-300 bg-rose-50"
                      value={opt.date}
                      onChange={e => setTimeOptions(prev => prev.map(o => o.id === opt.id ? { ...o, date: e.target.value } : o))}
                    />
                  </div>
                  <div className="relative">
                    <Clock size={16} className="absolute left-3 top-3.5 text-gray-400" />
                    <input
                      type="time"
                      className="w-full rounded-xl border border-gray-200 pl-9 pr-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-rose-300 bg-rose-50"
                      value={opt.time}
                      onChange={e => setTimeOptions(prev => prev.map(o => o.id === opt.id ? { ...o, time: e.target.value } : o))}
                    />
                  </div>
                </div>
                {timeOptions.length > 1 && (
                  <button type="button" onClick={() => removeTimeOption(opt.id)} className="text-gray-400 hover:text-red-400 px-1 pt-3">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button type="button" onClick={addTimeOption} className="flex items-center gap-1 text-[#d4607a] text-sm font-medium mt-3">
            <Plus size={15} /> Add another time option
          </button>
        </div>

        <button
          type="submit"
          disabled={!canSave || saving}
          className="w-full py-4 rounded-2xl bg-[#FFB7C5] text-[#1a1014] font-bold text-base disabled:opacity-40 hover:bg-[#F2C7C7] transition-all mt-2"
        >
          {saving ? 'Saving…' : 'Save changes'}
        </button>
      </form>
    </Modal>
  );
}
