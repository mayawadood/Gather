import { useState } from 'react';
import { Plus, Hash, LogOut, RefreshCw, Calendar, List, ChevronDown, Lightbulb, Map } from 'lucide-react';
import { parseISO, isFuture } from 'date-fns';
import type { User } from 'firebase/auth';
import type { GatherEvent, Group, WishlistItem } from '../types';
import { EventCard, countdownLabel } from '../components/EventCard';
import { EventVoteModal } from '../components/EventVoteModal';
import { CreateEventModal } from '../components/CreateEventModal';
import { CalendarView } from '../components/CalendarView';
import { CircleModal } from '../components/CircleModal';
import { WishlistTab } from '../components/WishlistTab';
import { MapView } from '../components/MapView';
import { addEventToGCal } from '../lib/gcal';
import { useNotifications } from '../hooks/useNotifications';
import { useWishlist } from '../hooks/useWishlist';

interface Props {
  user: User;
  groups: Group[];
  selectedGroup: Group;
  events: GatherEvent[];
  onSelectGroup: (id: string) => void;
  onCreateEvent: (data: any) => Promise<void>;
  onVoteTime: (eventId: string, optId: string) => Promise<void>;
  onVoteCantMakeIt: (eventId: string, optId: string) => Promise<void>;
  onVoteLocation: (eventId: string, optId: string) => Promise<void>;
  onFinalize: (eventId: string, date: string, time: string, location: string) => Promise<void>;
  onUnfinalize: (eventId: string) => Promise<void>;
  onUpdateGcalId: (eventId: string, gcalId: string) => Promise<void>;
  onFillAvailability: (eventId: string, userId: string, slots: string[]) => Promise<void>;
  onEditEvent: (eventId: string, updates: any, existing: GatherEvent) => Promise<void>;
  onDeleteEvent: (eventId: string) => Promise<void>;
  onLogout: () => Promise<void>;
  onRegenerateCode: () => Promise<void>;
  onCreateGroup: (name: string) => Promise<string>;
  onJoinGroup: (code: string) => Promise<string | null>;
  getAccessToken: () => string | null;
  userName: string;
  profilePhoto?: string;
  onChangeName: (name: string, photo?: string) => void;
}

export function HomePage({
  user, groups, selectedGroup, events,
  onSelectGroup, onCreateEvent, onVoteTime, onVoteCantMakeIt, onVoteLocation,
  onFinalize, onUnfinalize, onUpdateGcalId, onFillAvailability, onEditEvent, onDeleteEvent,
  onLogout, onRegenerateCode, onCreateGroup, onJoinGroup, getAccessToken, userName, profilePhoto, onChangeName
}: Props) {
  const { promoteWish } = useWishlist(selectedGroup.id);
  const [selectedEvent, setSelectedEvent] = useState<GatherEvent | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createInitialTitle, setCreateInitialTitle] = useState('');
  const [showCircles, setShowCircles] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [view, setView] = useState<'list' | 'calendar' | 'ideas' | 'map'>('list');
  const [gcalLoading, setGcalLoading] = useState(false);
  const [gcalError, setGcalError] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(userName);

  // Feature 8: Notifications
  useNotifications(events, user.uid);

  const pending = events.filter(e => e.status === 'pending');
  const finalized = events.filter(e => e.status === 'finalized');

  // Feature 3: "Next up" — soonest upcoming finalized event
  const upcomingFinalized = finalized
    .filter(e => {
      if (!e.finalizedDate) return false;
      try { return isFuture(parseISO(e.finalizedDate)); } catch { return false; }
    })
    .sort((a, b) => a.finalizedDate.localeCompare(b.finalizedDate));
  const nextUp = upcomingFinalized[0] ?? null;
  const nextUpCountdown = nextUp ? countdownLabel(nextUp.finalizedDate) : null;

  async function handleAddToGCal(event: GatherEvent) {
    const token = getAccessToken();
    if (!token) { setGcalError('Sign in again to connect Google Calendar'); return; }
    setGcalLoading(true);
    setGcalError('');
    try {
      const gcalId = await addEventToGCal(token, {
        name: event.name,
        location: event.locationFinalized || event.locationFixed || '',
        date: event.finalizedDate,
        time: event.finalizedTime,
      });
      await onUpdateGcalId(event.id, gcalId);
    } catch (e: any) {
      setGcalError(e.message || 'Failed to add to Google Calendar');
    } finally {
      setGcalLoading(false);
    }
  }

  // Keep selectedEvent in sync if Firestore updates it
  const liveSelectedEvent = selectedEvent
    ? events.find(e => e.id === selectedEvent.id) ?? selectedEvent
    : null;

  const [pendingPromoteId, setPendingPromoteId] = useState<string | null>(null);

  function handleWishlistPromote(wish: WishlistItem) {
    setCreateInitialTitle(wish.title);
    setPendingPromoteId(wish.id);
    setShowCreate(true);
  }

  function handleOpenCreate() {
    setCreateInitialTitle('');
    setShowCreate(true);
  }

  return (
    <div className="min-h-svh bg-[#fff8fa] flex flex-col max-w-lg mx-auto">
      {/* Header */}
      <div className="px-5 pt-12 pb-3">
        <div className="flex items-center justify-between">
          {/* Circle switcher pill */}
          <button
            onClick={() => setShowCircles(true)}
            className="flex items-center gap-2 bg-white border border-gray-200 rounded-2xl px-3.5 py-2 hover:border-[#F2C7C7] hover:bg-[#fff8fa] transition-colors shadow-sm"
          >
            <span className="text-base">🌿</span>
            <span className="font-bold text-gray-900 text-sm max-w-[140px] truncate">{selectedGroup.name}</span>
            <ChevronDown size={14} className="text-gray-400 shrink-0" />
          </button>

          <div className="flex items-center gap-2">
            {/* Name chip */}
            {editingName ? (
              <form onSubmit={e => { e.preventDefault(); if (nameInput.trim()) { onChangeName(nameInput.trim()); setEditingName(false); } }} className="flex gap-1">
                <input
                  autoFocus
                  value={nameInput}
                  onChange={e => setNameInput(e.target.value)}
                  className="w-24 text-sm font-semibold rounded-xl border border-[#FFB7C5] px-2 py-1 bg-[#fff8fa] focus:outline-none focus:ring-2 focus:ring-[#FFB7C5]"
                  maxLength={20}
                />
                <button type="submit" className="text-xs font-bold text-[#d4607a] px-2 py-1 bg-[#fff8fa] rounded-xl border border-[#F2C7C7]">✓</button>
              </form>
            ) : (
              <button
                onClick={() => { setNameInput(userName); setEditingName(true); }}
                className="flex items-center gap-1.5 bg-[#fff8fa] border border-[#fce4e8] px-3 py-1.5 rounded-xl hover:bg-[#fff0f4] transition-colors"
                title="Tap to change your name"
              >
                <div className="w-5 h-5 rounded-full bg-[#F2C7C7] overflow-hidden flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                  {profilePhoto
                    ? <img src={profilePhoto} alt={userName} className="w-full h-full object-cover" />
                    : userName.charAt(0).toUpperCase()
                  }
                </div>
                <span className="text-sm font-semibold text-[#1a1014] max-w-[80px] truncate">{userName}</span>
              </button>
            )}
            <button
              onClick={() => setShowInvite(!showInvite)}
              className="w-9 h-9 rounded-xl bg-[#fff8fa] flex items-center justify-center text-[#d4607a] hover:bg-[#fff0f4] transition-colors"
              title="Invite code"
            >
              <Hash size={16} />
            </button>
            <button
              onClick={onLogout}
              className="w-9 h-9 rounded-xl bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
              title="Sign out"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>

        {/* Invite code panel */}
        {showInvite && (
          <div className="mt-3 bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
            <p className="text-xs text-gray-500 mb-1.5">
              Share this code to invite friends to <strong>{selectedGroup.name}</strong>
            </p>
            <div className="flex items-center gap-3">
              <span className="text-2xl font-black tracking-widest text-[#d4607a] font-mono">
                {selectedGroup.inviteCode}
              </span>
              <button
                onClick={onRegenerateCode}
                className="ml-auto text-xs text-gray-400 flex items-center gap-1 hover:text-gray-600 transition-colors"
              >
                <RefreshCw size={12} /> New code
              </button>
            </div>
          </div>
        )}

        {/* Feature 3: Next up banner */}
        {nextUp && nextUpCountdown && view === 'list' && (
          <div
            className="mt-3 bg-[#FFB7C5] text-[#1a1014] rounded-2xl px-4 py-3 flex items-center gap-3 cursor-pointer hover:bg-[#F2C7C7] transition-colors shadow-md shadow-[#F2C7C7]"
            onClick={() => setSelectedEvent(nextUp)}
          >
            <span className="text-2xl">{nextUp.cover || '🎉'}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider opacity-60">Next up</p>
              <p className="font-bold text-sm truncate">{nextUp.name}</p>
            </div>
            <span className="text-xs font-bold bg-black/10 px-3 py-1 rounded-full shrink-0">{nextUpCountdown}</span>
          </div>
        )}
      </div>

      {/* View toggle + add button */}
      <div className="px-5 flex items-center gap-2 mb-4">
        <div className="flex bg-gray-100 rounded-xl p-1 gap-1">
          <button
            onClick={() => setView('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${view === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
          >
            <List size={14} /> List
          </button>
          <button
            onClick={() => setView('calendar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${view === 'calendar' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
          >
            <Calendar size={14} /> Calendar
          </button>
          <button
            onClick={() => setView('ideas')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${view === 'ideas' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
          >
            <Lightbulb size={14} /> Ideas
          </button>
          <button
            onClick={() => setView('map')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold transition-colors ${view === 'map' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500'}`}
          >
            <Map size={14} /> Map
          </button>
        </div>
        <button
          onClick={handleOpenCreate}
          className="ml-auto flex items-center gap-1.5 bg-[#FFB7C5] text-[#1a1014] px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-[#F2C7C7] active:scale-95 transition-all shadow-md shadow-[#F2C7C7]"
        >
          <Plus size={16} /> New event
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-5 pb-8">
        {view === 'calendar' ? (
          <CalendarView events={events} onEventClick={setSelectedEvent} />
        ) : view === 'ideas' ? (
          <WishlistTab
            groupId={selectedGroup.id}
            userId={user.uid}
            userName={user.displayName || 'Someone'}
            onPromote={handleWishlistPromote}
          />
        ) : view === 'map' ? (
          <MapView events={events} onEventClick={setSelectedEvent} />
        ) : (
          <>
            {pending.length > 0 && (
              <section className="mb-6">
                <h2 className="text-[11px] font-semibold text-[#c4a0a8] uppercase tracking-widest mb-3">figuring out when</h2>
                <div className="flex flex-col gap-2.5">
                  {pending.map(e => (
                    <EventCard key={e.id} event={e} onClick={() => setSelectedEvent(e)} />
                  ))}
                </div>
              </section>
            )}

            {finalized.length > 0 && (
              <section className="mb-6">
                <h2 className="text-[11px] font-semibold text-[#c4a0a8] uppercase tracking-widest mb-3">it's happening ✓</h2>
                <div className="flex flex-col gap-2.5">
                  {finalized.map(e => (
                    <EventCard key={e.id} event={e} onClick={() => setSelectedEvent(e)} showCountdown />
                  ))}
                </div>
              </section>
            )}

            {events.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <span className="text-5xl mb-4">🌿</span>
                <p className="text-[#b07888] font-semibold">nothing planned yet</p>
                <p className="text-sm text-[#d4b0b8] mt-1">hit <strong>+ new event</strong> to get something going</p>
              </div>
            )}
          </>
        )}
      </div>

      {/* GCal error toast */}
      {gcalError && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-red-500 text-white text-sm px-4 py-2.5 rounded-2xl shadow-lg z-50 flex items-center gap-3">
          {gcalError}
          <button onClick={() => setGcalError('')} className="opacity-70 hover:opacity-100">✕</button>
        </div>
      )}

      {/* Modals */}
      {showCircles && (
        <CircleModal
          groups={groups}
          selectedGroupId={selectedGroup.id}
          currentUserId={user.uid}
          onSelect={onSelectGroup}
          onCreateGroup={onCreateGroup}
          onJoinGroup={onJoinGroup}
          onClose={() => setShowCircles(false)}
        />
      )}

      {showCreate && (
        <CreateEventModal
          initialTitle={createInitialTitle}
          autoFill={!!pendingPromoteId}
          pastFinalizedEvents={finalized
            .filter(e => e.finalizedDate && e.finalizedTime)
            .map(e => ({ name: e.name, finalizedDate: e.finalizedDate!, finalizedTime: e.finalizedTime! }))}
          onClose={() => { setShowCreate(false); setPendingPromoteId(null); }}
          onCreate={async (data) => {
            await onCreateEvent(data);
            if (pendingPromoteId) {
              await promoteWish(pendingPromoteId);
              setPendingPromoteId(null);
            }
          }}
        />
      )}

      {liveSelectedEvent && (
        <EventVoteModal
          event={liveSelectedEvent}
          userId={user.uid}
          userName={user.displayName || 'You'}
          photoURL={user.photoURL || ''}
          onClose={() => setSelectedEvent(null)}
          onVoteTime={optId => onVoteTime(liveSelectedEvent.id, optId)}
          onVoteCantMakeIt={optId => onVoteCantMakeIt(liveSelectedEvent.id, optId)}
          onVoteLocation={optId => onVoteLocation(liveSelectedEvent.id, optId)}
          onFinalize={(date, time, loc) => onFinalize(liveSelectedEvent.id, date, time, loc)}
          onUnfinalize={() => onUnfinalize(liveSelectedEvent.id)}
          onAddToGCal={() => handleAddToGCal(liveSelectedEvent)}
          onFillAvailability={(slots) => onFillAvailability(liveSelectedEvent.id, user.uid, slots)}
          onEdit={(updates) => onEditEvent(liveSelectedEvent.id, updates, liveSelectedEvent)}
          onDelete={() => onDeleteEvent(liveSelectedEvent.id)}
          gcalConnected={!!getAccessToken()}
          gcalLoading={gcalLoading}
        />
      )}
    </div>
  );
}
