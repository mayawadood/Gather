import { useState } from 'react';
import { Plus, Hash } from 'lucide-react';

interface Props {
  onCreateGroup: (name: string) => Promise<void>;
  onJoinGroup: (code: string) => Promise<boolean>;
  userName: string;
}

export function GroupSetupPage({ onCreateGroup, onJoinGroup, userName }: Props) {
  const [mode, setMode] = useState<'choose' | 'create' | 'join'>('choose');
  const [groupName, setGroupName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!groupName.trim()) return;
    setLoading(true);
    try { await onCreateGroup(groupName.trim()); } finally { setLoading(false); }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError('');
    try {
      const ok = await onJoinGroup(code.trim());
      if (!ok) setError('No group found with that code. Check with your friend!');
    } finally { setLoading(false); }
  }

  return (
    <div className="min-h-svh flex flex-col items-center justify-center bg-gradient-to-br from-rose-50 via-white to-rose-50 px-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-3xl bg-[#FFB7C5] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-200">
          <span className="text-3xl">🌿</span>
        </div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">gather</h1>
        <p className="text-gray-500 mt-1 text-sm">Hey {userName}! Let's get you set up.</p>
      </div>

      <div className="w-full max-w-sm bg-white rounded-3xl shadow-xl shadow-gray-100 p-7 border border-gray-100">
        {mode === 'choose' && (
          <div className="flex flex-col gap-3">
            <h2 className="text-lg font-bold text-gray-900 mb-2">Join or create a group</h2>
            <button
              onClick={() => setMode('create')}
              className="flex items-center gap-3 p-4 rounded-2xl border border-gray-200 hover:border-rose-200 hover:bg-rose-50 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                <Plus size={18} className="text-[#d4607a]" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">Create a new group</p>
                <p className="text-xs text-gray-500">Start fresh with your friends</p>
              </div>
            </button>
            <button
              onClick={() => setMode('join')}
              className="flex items-center gap-3 p-4 rounded-2xl border border-gray-200 hover:border-rose-200 hover:bg-rose-50 transition-colors text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center">
                <Hash size={18} className="text-[#d4607a]" />
              </div>
              <div>
                <p className="font-semibold text-gray-900 text-sm">Join with invite code</p>
                <p className="text-xs text-gray-500">Your friend has a 6-letter code</p>
              </div>
            </button>
          </div>
        )}

        {mode === 'create' && (
          <form onSubmit={handleCreate} className="flex flex-col gap-4">
            <button type="button" onClick={() => setMode('choose')} className="text-sm text-gray-400 hover:text-gray-600 text-left">← Back</button>
            <h2 className="text-lg font-bold text-gray-900">Name your group</h2>
            <input
              autoFocus
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-rose-300 bg-rose-50"
              placeholder='e.g. "The crew"'
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              required
            />
            <button
              type="submit"
              disabled={loading || !groupName.trim()}
              className="w-full py-3.5 rounded-2xl bg-[#FFB7C5] text-[#1a1014] font-bold disabled:opacity-40 hover:bg-[#F2C7C7] transition-colors"
            >
              {loading ? 'Creating…' : 'Create group'}
            </button>
          </form>
        )}

        {mode === 'join' && (
          <form onSubmit={handleJoin} className="flex flex-col gap-4">
            <button type="button" onClick={() => setMode('choose')} className="text-sm text-gray-400 hover:text-gray-600 text-left">← Back</button>
            <h2 className="text-lg font-bold text-gray-900">Enter invite code</h2>
            <input
              autoFocus
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-rose-300 bg-rose-50 tracking-widest font-mono uppercase"
              placeholder="ABC123"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              maxLength={6}
              required
            />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button
              type="submit"
              disabled={loading || code.length < 4}
              className="w-full py-3.5 rounded-2xl bg-[#FFB7C5] text-[#1a1014] font-bold disabled:opacity-40 hover:bg-[#F2C7C7] transition-colors"
            >
              {loading ? 'Joining…' : 'Join group'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
