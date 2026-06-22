import { useState, useEffect } from 'react';
import './index.css';
import { isFirebaseConfigured } from './lib/firebase';
import { useAuth } from './hooks/useAuth';
import { useGroups } from './hooks/useGroup';
import { useEvents } from './hooks/useEvents';
import { LoginPage } from './pages/LoginPage';
import { GroupSetupPage } from './pages/GroupSetupPage';
import { HomePage } from './pages/HomePage';
import { SetupPage } from './pages/SetupPage';
import { NameSetupPage } from './pages/NameSetupPage';
import { initReminders } from './lib/reminders';
import { identifyUser, track } from './lib/analytics';
import { InstallBanner } from './components/InstallBanner';

const NAME_KEY = 'gather_display_name';
const PHOTO_KEY = 'gather_profile_photo';

function App() {
  if (!isFirebaseConfigured) return <SetupPage />;

  useEffect(() => { initReminders(); }, []);

  const { user, loading: authLoading, signInWithGoogle, logout, getAccessToken } = useAuth();
  const { groups, loading: groupsLoading, createGroup, joinGroup, regenerateCode } = useGroups(user?.uid ?? null);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);
  const [displayName, setDisplayName] = useState<string | null>(() => localStorage.getItem(NAME_KEY));
  const [profilePhoto, setProfilePhoto] = useState<string | null>(() => localStorage.getItem(PHOTO_KEY));

  // Identify user for analytics once logged in
  useEffect(() => {
    if (user && displayName) identifyUser(user.uid, displayName);
  }, [user?.uid, displayName]);

  // Auto-select group
  useEffect(() => {
    if (groups.length === 0) return;
    const saved = localStorage.getItem('gather_selected_group');
    if (saved && groups.find(g => g.id === saved)) {
      setSelectedGroupId(saved);
    } else {
      setSelectedGroupId(groups[0].id);
    }
  }, [groups]);

  function handleSelectGroup(id: string) {
    setSelectedGroupId(id);
    localStorage.setItem('gather_selected_group', id);
  }

  function handleSaveName(name: string, photo?: string) {
    localStorage.setItem(NAME_KEY, name);
    setDisplayName(name);
    if (photo !== undefined) {
      localStorage.setItem(PHOTO_KEY, photo);
      setProfilePhoto(photo);
    }
  }

  const selectedGroup = groups.find(g => g.id === selectedGroupId) ?? null;
  const userName = displayName || user?.displayName || 'Someone';

  const {
    events, createEvent, updateEvent, deleteEvent,
    voteTimeOption, voteCantMakeIt, voteLocationOption,
    finalizeEvent, unfinalizeEvent, updateGcalId, fillAvailability,
  } = useEvents(selectedGroupId);

  if (authLoading || (user && groupsLoading)) {
    return (
      <div className="min-h-svh flex items-center justify-center bg-[#fdf6ee]">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#FFB7C5] flex items-center justify-center shadow-lg shadow-[#F2C7C7] animate-pulse">
            <span className="text-2xl">🌿</span>
          </div>
          <p className="text-sm text-[#b07888]">loading gather…</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <LoginPage
        loading={signingIn}
        onSignIn={async () => {
          setSigningIn(true);
          try { await signInWithGoogle(); } finally { setSigningIn(false); }
        }}
      />
    );
  }

  // Ask for a name once after sign-in
  if (!displayName) {
    return (
      <NameSetupPage
        suggestedName={user.displayName || ''}
        onSave={handleSaveName}
      />
    );
  }

  // No groups yet — show first-time setup
  if (groups.length === 0) {
    return (
      <GroupSetupPage
        userName={userName.split(' ')[0]}
        onCreateGroup={async name => { await createGroup(name, user.uid, userName); }}
        onJoinGroup={async code => {
          const id = await joinGroup(code, user.uid, userName);
          return id !== null;
        }}
      />
    );
  }

  if (!selectedGroup) return null;

  return (
    <>
    <InstallBanner />
    <HomePage
      user={user}
      groups={groups}
      selectedGroup={selectedGroup}
      events={events}
      onSelectGroup={handleSelectGroup}
      onCreateEvent={data => {
        track('event_created', {
          hasLocation: !!data.locationFixed || data.locationOptions.length > 0,
          locationVote: data.locationOptions.length > 0,
          timeOptionCount: data.timeOptions.length,
          isRecurring: !!data.recurring,
          groupId: selectedGroup.id,
        });
        return createEvent({ ...data, groupId: selectedGroup.id, userId: user.uid, userName, autoFinalizeDate: data.autoFinalizeDate, autoFinalizeTime: data.autoFinalizeTime });
      }}
      onVoteTime={(eventId, optId) => {
        track('vote_cast', { type: 'time', eventId });
        const ev = events.find(e => e.id === eventId)!;
        return voteTimeOption(eventId, optId, user.uid, userName, ev);
      }}
      onVoteCantMakeIt={(eventId, optId) => {
        track('vote_cast', { type: 'cant_make_it', eventId });
        const ev = events.find(e => e.id === eventId)!;
        return voteCantMakeIt(eventId, optId, user.uid, ev);
      }}
      onVoteLocation={(eventId, optId) => {
        track('vote_cast', { type: 'location', eventId });
        const ev = events.find(e => e.id === eventId)!;
        return voteLocationOption(eventId, optId, user.uid, ev);
      }}
      onFinalize={(eventId, ...args) => {
        track('event_finalized', { eventId });
        return finalizeEvent(eventId, ...args);
      }}
      onUnfinalize={unfinalizeEvent}
      onUpdateGcalId={updateGcalId}
      onFillAvailability={fillAvailability}
      onEditEvent={(eventId, updates, existing) => updateEvent(eventId, updates, existing)}
      onDeleteEvent={deleteEvent}
      onLogout={logout}
      onRegenerateCode={() => regenerateCode(selectedGroup.id)}
      onCreateGroup={name => createGroup(name, user.uid, userName)}
      onJoinGroup={code => joinGroup(code, user.uid, userName)}
      getAccessToken={getAccessToken}
      userName={userName}
      profilePhoto={profilePhoto ?? undefined}
      onChangeName={handleSaveName}
    />
    </>
  );
}

export default App;
