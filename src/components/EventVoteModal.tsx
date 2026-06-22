import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { Check, MapPin, Zap, Settings2, CalendarPlus, RotateCcw, MessageCircle, Bell, Pencil, Trash2 } from 'lucide-react';
import { Modal } from './Modal';
import { CommentsModal } from './CommentsModal';
import { AvailabilityGrid } from './AvailabilityGrid';
import { EditEventModal } from './EditEventModal';
import { setReminder } from '../lib/reminders';
import type { GatherEvent, TimeOption, LocationOption } from '../types';

interface Props {
  event: GatherEvent;
  userId: string;
  userName: string;
  photoURL?: string;
  onClose: () => void;
  onVoteTime: (optId: string) => Promise<void>;
  onVoteCantMakeIt: (optId: string) => Promise<void>;
  onVoteLocation: (optId: string) => Promise<void>;
  onFinalize: (date: string, time: string, location: string) => Promise<void>;
  onUnfinalize: () => Promise<void>;
  onAddToGCal: () => Promise<void>;
  onFillAvailability: (slots: string[]) => Promise<void>;
  onEdit: (updates: {
    name: string; cover: string; locationFixed: string;
    locationOptions: Omit<LocationOption, 'votes'>[];
    timeOptions: Omit<TimeOption, 'votes' | 'cantMakeIt'>[];
  }) => Promise<void>;
  onDelete: () => Promise<void>;
  gcalConnected?: boolean;
  gcalLoading: boolean;
}

function formatDateTime(date: string, time: string) {
  try {
    const d = parseISO(`${date}T${time}`);
    return format(d, 'EEE, MMM d · h:mm a');
  } catch {
    return `${date} ${time}`;
  }
}

function topVoted<T extends { votes: string[] }>(opts: T[]): T | null {
  if (!opts.length) return null;
  return opts.reduce((best, o) => o.votes.length >= best.votes.length ? o : best, opts[0]);
}

const REMINDER_OPTIONS: { label: string; hours: 1 | 2 | 24 }[] = [
  { label: '1 hour before', hours: 1 },
  { label: '2 hours before', hours: 2 },
  { label: '1 day before', hours: 24 },
];

export function EventVoteModal({
  event, userId, userName, photoURL = '', onClose, onVoteTime, onVoteCantMakeIt, onVoteLocation,
  onFinalize, onUnfinalize, onAddToGCal, onFillAvailability, onEdit, onDelete, gcalLoading
}: Props) {
  const [finalizeMode, setFinalizeMode] = useState<null | 'pick'>(null);
  const [pickedTime, setPickedTime] = useState<string>('');
  const [pickedLoc, setPickedLoc] = useState<string>('');
  const [saving, setSaving] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const isCreator = event.createdBy === userId;
  const [showReminderPicker, setShowReminderPicker] = useState(false);
  const [reminderSet, setReminderSet] = useState(false);

  const isFinalized = event.status === 'finalized';
  const hasAvailability = (event.availabilityDates ?? []).length > 0;

  async function handleAutoFinalize() {
    const bestTime = topVoted(event.timeOptions);
    if (!bestTime) return;
    const bestLoc = event.locationOptions.length ? topVoted(event.locationOptions) : null;
    const loc = bestLoc?.value || event.locationFixed || '';
    setSaving(true);
    try { await onFinalize(bestTime.date, bestTime.time, loc); } finally { setSaving(false); }
  }

  async function handleManualFinalize() {
    if (!pickedTime) return;
    const chosen = event.timeOptions.find(o => o.id === pickedTime);
    if (!chosen) return;
    const loc = event.locationOptions.length
      ? (event.locationOptions.find(o => o.id === pickedLoc)?.value || event.locationFixed || '')
      : event.locationFixed || '';
    setSaving(true);
    try { await onFinalize(chosen.date, chosen.time, loc); } finally { setSaving(false); }
  }

  function handleSetReminder(hours: 1 | 2 | 24) {
    setReminder(event, hours);
    setReminderSet(true);
    setShowReminderPicker(false);
  }

  async function handleDelete() {
    setDeleting(true);
    try { await onDelete(); onClose(); } finally { setDeleting(false); }
  }

  return (
    <>
      {showEdit && (
        <EditEventModal
          event={event}
          onClose={() => setShowEdit(false)}
          onSave={async (updates) => { await onEdit(updates); setShowEdit(false); }}
          zIndex={60}
        />
      )}

      <Modal title={event.name} onClose={onClose} fullScreen>
        <div className="flex flex-col gap-5">

          {/* Creator actions: edit + delete */}
          {isCreator && (
            <div className="flex gap-2 -mt-1">
              <button
                onClick={() => setShowEdit(true)}
                className="flex items-center gap-1.5 text-sm font-medium text-gray-600 bg-gray-100 px-3 py-2 rounded-xl hover:bg-gray-200 transition-colors"
              >
                <Pencil size={13} /> Edit
              </button>
              {!showDeleteConfirm ? (
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="flex items-center gap-1.5 text-sm font-medium text-red-500 bg-red-50 px-3 py-2 rounded-xl hover:bg-red-100 transition-colors ml-auto"
                >
                  <Trash2 size={13} /> Delete
                </button>
              ) : (
                <div className="ml-auto flex items-center gap-2">
                  <span className="text-xs text-red-500 font-medium">Sure?</span>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="text-sm font-bold text-white bg-red-500 px-3 py-2 rounded-xl hover:bg-red-600 disabled:opacity-50 transition-colors"
                  >
                    {deleting ? 'Deleting…' : 'Yes, delete'}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="text-sm text-gray-500 px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Finalized banner */}
          {isFinalized && (
            <div className="rounded-2xl bg-emerald-50 border border-emerald-200 p-4">
              <div className="flex items-center gap-2 mb-1">
                <Check size={16} className="text-emerald-600" />
                <span className="font-semibold text-emerald-700 text-sm">Finalized!</span>
              </div>
              <p className="text-sm text-emerald-800 font-medium">{formatDateTime(event.finalizedDate, event.finalizedTime)}</p>
              {(event.locationFinalized || event.locationFixed) && (
                <a
                  href={`https://maps.google.com/?q=${encodeURIComponent(event.locationFinalized || event.locationFixed || '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-emerald-700 flex items-center gap-1 mt-1 hover:underline"
                >
                  <MapPin size={13} /> {event.locationFinalized || event.locationFixed}
                </a>
              )}
              <div className="flex gap-2 mt-3 flex-wrap">
                {!event.gcalEventId && (
                  <button
                    onClick={onAddToGCal}
                    disabled={gcalLoading}
                    className="flex items-center gap-1.5 text-sm font-medium text-[#d4607a] bg-rose-50 border border-rose-200 px-3 py-2 rounded-xl hover:bg-rose-100 transition-colors disabled:opacity-50"
                  >
                    <CalendarPlus size={14} />
                    {gcalLoading ? 'Adding…' : '+ Add to Google Calendar'}
                  </button>
                )}
                {event.gcalEventId && (
                  <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium">
                    <Check size={14} /> Added to GCal
                  </span>
                )}
                {/* Feature 9: Remind me */}
                <div className="relative ml-auto">
                  {!reminderSet ? (
                    <button
                      onClick={() => setShowReminderPicker(v => !v)}
                      className="flex items-center gap-1.5 text-sm text-gray-500 px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors"
                    >
                      <Bell size={14} /> Remind me
                    </button>
                  ) : (
                    <span className="flex items-center gap-1.5 text-sm text-emerald-600 font-medium px-3 py-2">
                      <Bell size={14} /> Reminder set
                    </span>
                  )}
                  {showReminderPicker && (
                    <div className="absolute right-0 bottom-10 bg-white border border-gray-200 rounded-2xl shadow-xl p-3 flex flex-col gap-1 z-10 min-w-[160px]">
                      {REMINDER_OPTIONS.map(opt => (
                        <button
                          key={opt.hours}
                          onClick={() => handleSetReminder(opt.hours)}
                          className="text-sm text-left px-3 py-2 rounded-xl hover:bg-rose-50 hover:text-[#c45070] transition-colors"
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={onUnfinalize}
                  className="flex items-center gap-1.5 text-sm text-gray-500 px-3 py-2 rounded-xl hover:bg-gray-100 transition-colors"
                >
                  <RotateCcw size={14} /> Unfinalize
                </button>
              </div>
            </div>
          )}

          {/* Attendees */}
          {(() => {
            const voterNames = event.voterNames ?? {};
            const allVoterIds = Array.from(new Set(
              event.timeOptions.flatMap(o => o.votes)
            ));
            if (allVoterIds.length === 0) return null;
            return (
              <div>
                <p className="text-[11px] font-semibold text-[#c4a0a8] uppercase tracking-widest mb-2">
                  going ({allVoterIds.length})
                </p>
                <div className="flex flex-wrap gap-2">
                  {allVoterIds.map(uid => {
                    const name = voterNames[uid] || (uid === userId ? userName : 'someone');
                    const initial = name.charAt(0).toUpperCase();
                    const isMe = uid === userId;
                    return (
                      <div key={uid} className="flex items-center gap-1.5 bg-rose-50 border border-rose-100 rounded-full pl-1 pr-3 py-1">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${isMe ? 'bg-rose-400 text-white' : 'bg-rose-200 text-rose-700'}`}>
                          {initial}
                        </div>
                        <span className="text-xs font-medium text-[#1a1014]">{isMe ? 'you' : name.split(' ')[0]}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}

          {/* Availability grid (Feature 5) */}
          {hasAvailability && (
            <AvailabilityGrid
              event={event}
              userId={userId}
              isCreator={isCreator}
              onFillAvailability={onFillAvailability}
              onFinalize={(date, time, loc) => onFinalize(date, time, loc)}
            />
          )}

          {/* Location display (fixed) */}
          {!isFinalized && event.locationFixed && !event.locationOptions.length && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <MapPin size={14} /> <span>{event.locationFixed}</span>
            </div>
          )}

          {/* Location voting */}
          {!isFinalized && event.locationOptions.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Vote on location</h3>
              <div className="flex flex-col gap-2">
                {event.locationOptions.map(opt => {
                  const voted = opt.votes.includes(userId);
                  const pct = event.locationOptions.reduce((s, o) => s + o.votes.length, 0) === 0
                    ? 0
                    : Math.round(opt.votes.length / event.locationOptions.reduce((s, o) => s + o.votes.length, 1) * 100);
                  return (
                    <VoteRow
                      key={opt.id}
                      label={opt.value}
                      votes={opt.votes.length}
                      pct={pct}
                      voted={voted}
                      onVote={() => onVoteLocation(opt.id)}
                      icon={<MapPin size={14} />}
                    />
                  );
                })}
              </div>
            </div>
          )}

          {/* Time voting (Feature 2: can't make it) */}
          {!isFinalized && !hasAvailability && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-2">
                {event.timeOptions.length === 1 ? 'Time' : 'Vote on time'}
              </h3>
              <div className="flex flex-col gap-2">
                {event.timeOptions.map(opt => {
                  const voted = opt.votes.includes(userId);
                  const cantMakeIt = (opt.cantMakeIt ?? []).includes(userId);
                  const total = event.timeOptions.reduce((s, o) => s + o.votes.length, 0);
                  const pct = total === 0 ? 0 : Math.round(opt.votes.length / total * 100);
                  return (
                    <div key={opt.id} className="flex flex-col gap-1">
                      <VoteRow
                        label={formatDateTime(opt.date, opt.time)}
                        votes={opt.votes.length}
                        pct={pct}
                        voted={voted}
                        onVote={() => onVoteTime(opt.id)}
                      />
                      <div className="flex items-center justify-end gap-2 px-1">
                        <button
                          onClick={() => onVoteCantMakeIt(opt.id)}
                          className={`text-xs px-2 py-0.5 rounded-full transition-colors flex items-center gap-1 ${
                            cantMakeIt
                              ? 'bg-red-100 text-red-600 font-semibold'
                              : 'text-gray-400 hover:text-red-400 hover:bg-red-50'
                          }`}
                        >
                          ✕ Can't do this
                        </button>
                        {(opt.cantMakeIt ?? []).length > 0 && (
                          <span className="text-[11px] text-red-400 font-medium">
                            {(opt.cantMakeIt ?? []).length} can't make it
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Finalize controls */}
          {!isFinalized && !hasAvailability && (
            <div className="border-t border-gray-100 pt-4">
              {finalizeMode === null ? (
                <div className="flex gap-2">
                  <button
                    onClick={handleAutoFinalize}
                    disabled={saving || event.timeOptions.length === 0}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-[#FFB7C5] text-[#1a1014] font-semibold text-sm hover:bg-[#F2C7C7] disabled:opacity-40 transition-colors"
                  >
                    <Zap size={15} /> Auto-finalize
                  </button>
                  <button
                    onClick={() => setFinalizeMode('pick')}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-gray-100 text-gray-700 font-semibold text-sm hover:bg-gray-200 transition-colors"
                  >
                    <Settings2 size={15} /> Manual
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <p className="text-sm font-semibold text-gray-700">Pick the final time</p>
                  <div className="flex flex-col gap-2">
                    {event.timeOptions.map(opt => (
                      <label key={opt.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${pickedTime === opt.id ? 'border-rose-300 bg-rose-50' : 'border-gray-200 bg-white'}`}>
                        <input type="radio" name="time" value={opt.id} checked={pickedTime === opt.id} onChange={() => setPickedTime(opt.id)} className="accent-rose-500" />
                        <span className="text-sm">{formatDateTime(opt.date, opt.time)}</span>
                        <span className="ml-auto text-xs text-gray-400">{opt.votes.length} vote{opt.votes.length !== 1 ? 's' : ''}</span>
                      </label>
                    ))}
                  </div>

                  {event.locationOptions.length > 0 && (
                    <>
                      <p className="text-sm font-semibold text-gray-700 mt-1">Pick the final location</p>
                      <div className="flex flex-col gap-2">
                        {event.locationOptions.map(opt => (
                          <label key={opt.id} className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-colors ${pickedLoc === opt.id ? 'border-rose-300 bg-rose-50' : 'border-gray-200 bg-white'}`}>
                            <input type="radio" name="loc" value={opt.id} checked={pickedLoc === opt.id} onChange={() => setPickedLoc(opt.id)} className="accent-rose-500" />
                            <span className="text-sm">{opt.value}</span>
                            <span className="ml-auto text-xs text-gray-400">{opt.votes.length} vote{opt.votes.length !== 1 ? 's' : ''}</span>
                          </label>
                        ))}
                      </div>
                    </>
                  )}

                  <div className="flex gap-2 mt-1">
                    <button onClick={() => setFinalizeMode(null)} className="flex-1 py-3 rounded-2xl bg-gray-100 text-gray-600 font-semibold text-sm">
                      Cancel
                    </button>
                    <button
                      onClick={handleManualFinalize}
                      disabled={!pickedTime || saving}
                      className="flex-1 py-3 rounded-2xl bg-[#FFB7C5] text-[#1a1014] font-semibold text-sm disabled:opacity-40 hover:bg-[#F2C7C7] transition-colors"
                    >
                      {saving ? 'Finalizing…' : 'Confirm'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Feature 1: Chat button */}
          <div className="border-t border-gray-100 pt-3">
            <button
              onClick={() => setShowComments(true)}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-2xl bg-gray-100 text-gray-700 font-semibold text-sm hover:bg-gray-200 transition-colors"
            >
              <MessageCircle size={16} /> 💬 Chat
            </button>
          </div>
        </div>
      </Modal>

      {showComments && (
        <CommentsModal
          eventId={event.id}
          eventName={event.name}
          userId={userId}
          userName={userName}
          photoURL={photoURL}
          onClose={() => setShowComments(false)}
        />
      )}
    </>
  );
}

function VoteRow({
  label, votes, pct, voted, onVote, icon
}: {
  label: string; votes: number; pct: number; voted: boolean; onVote: () => void; icon?: React.ReactNode;
}) {
  return (
    <button
      onClick={onVote}
      className={`relative w-full text-left rounded-xl border overflow-hidden transition-colors ${voted ? 'border-rose-300' : 'border-gray-200'}`}
    >
      <div
        className={`absolute inset-0 rounded-xl transition-all ${voted ? 'bg-rose-100' : 'bg-gray-50'}`}
        style={{ width: `${pct}%`, minWidth: pct > 0 ? '6px' : '0' }}
      />
      <div className="relative flex items-center gap-2 px-4 py-3">
        {icon && <span className={voted ? 'text-rose-400' : 'text-gray-400'}>{icon}</span>}
        <span className={`flex-1 text-sm font-medium ${voted ? 'text-[#c45070]' : 'text-gray-700'}`}>{label}</span>
        <span className={`text-xs ${voted ? 'text-rose-400' : 'text-gray-400'}`}>{votes} vote{votes !== 1 ? 's' : ''}</span>
        {voted && <Check size={14} className="text-[#d4607a] ml-1" />}
      </div>
    </button>
  );
}
