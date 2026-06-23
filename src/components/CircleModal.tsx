import { useState } from 'react';
import { Plus, Hash, Users, Check, ChevronRight, Copy, Share2, ArrowLeft, LogOut, Trash2, Pencil } from 'lucide-react';
import { Modal } from './Modal';
import type { Group } from '../types';

interface Props {
  groups: Group[];
  selectedGroupId: string | null;
  currentUserId: string;
  onSelect: (groupId: string) => void;
  onCreateGroup: (name: string) => Promise<string>;
  onJoinGroup: (code: string) => Promise<string | null>;
  onLeaveGroup: (groupId: string, userId: string) => Promise<void>;
  onDeleteGroup: (groupId: string) => Promise<void>;
  onRenameGroup: (groupId: string, name: string) => Promise<void>;
  onClose: () => void;
}

export function CircleModal({
  groups, selectedGroupId, currentUserId, onSelect, onCreateGroup, onJoinGroup, onLeaveGroup, onDeleteGroup, onRenameGroup, onClose
}: Props) {
  const [mode, setMode] = useState<'list' | 'detail' | 'create' | 'join'>('list');
  const [detailGroup, setDetailGroup] = useState<Group | null>(null);
  const [groupName, setGroupName] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState('');

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!groupName.trim()) return;
    setLoading(true);
    try {
      const id = await onCreateGroup(groupName.trim());
      onSelect(id);
      onClose();
    } finally {
      setLoading(false);
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError('');
    try {
      const id = await onJoinGroup(code.trim());
      if (!id) {
        setError('No circle found with that code. Double-check with your friend!');
      } else {
        onSelect(id);
        onClose();
      }
    } finally {
      setLoading(false);
    }
  }

  function openDetail(g: Group) {
    setDetailGroup(g);
    setMode('detail');
  }

  async function handleShare(g: Group) {
    const url = `${window.location.origin}?code=${g.inviteCode}`;
    const message = `join "${g.name}" on Gather — tap to join: ${url}`;
    if (navigator.share) {
      try {
        await navigator.share({ title: `Join ${g.name} on Gather`, text: message, url });
      } catch { /* user cancelled */ }
    } else {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  async function handleCopyCode(code: string) {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function getMemberName(g: Group, uid: string): string {
    return g.memberNames?.[uid] || (uid === currentUserId ? 'you' : 'someone');
  }

  function getMemberInitial(g: Group, uid: string): string {
    const name = getMemberName(g, uid);
    return name.charAt(0).toUpperCase();
  }

  // ── Detail view ──────────────────────────────────────────────────────────
  if (mode === 'detail' && detailGroup) {
    const g = detailGroup;
    const isCreator = g.createdBy === currentUserId;
    return (
      <Modal title={
        editingName ? (
          <form onSubmit={async e => {
            e.preventDefault();
            if (!nameInput.trim()) return;
            await onRenameGroup(g.id, nameInput.trim());
            setDetailGroup({ ...g, name: nameInput.trim() });
            setEditingName(false);
          }} className="flex items-center gap-2">
            <input
              autoFocus
              value={nameInput}
              onChange={e => setNameInput(e.target.value)}
              className="text-lg font-bold rounded-xl border border-[#FFB7C5] px-3 py-1 focus:outline-none focus:ring-2 focus:ring-[#FFB7C5] bg-[#fff8fa] w-40"
              maxLength={30}
            />
            <button type="submit" className="text-xs font-bold text-white bg-[#FFB7C5] px-3 py-1.5 rounded-xl">save</button>
            <button type="button" onClick={() => setEditingName(false)} className="text-xs text-[#b07888]">cancel</button>
          </form>
        ) : (
          <span className="flex items-center gap-2">
            {g.name}
            {isCreator && (
              <button type="button" onClick={() => { setNameInput(g.name); setEditingName(true); }} className="text-[#c4a0a8] hover:text-[#d4607a] transition-colors">
                <Pencil size={14} />
              </button>
            )}
          </span>
        )
      } onClose={onClose}>
        <div className="flex flex-col gap-5">
          <button
            type="button"
            onClick={() => { setMode('list'); setEditingName(false); }}
            className="flex items-center gap-1 text-sm text-[#b07888] hover:text-[#1a1014] transition-colors w-fit"
          >
            <ArrowLeft size={14} /> back
          </button>

          {/* Members */}
          <div>
            <p className="text-[11px] font-semibold text-[#c4a0a8] uppercase tracking-widest mb-3">
              {g.members.length} member{g.members.length !== 1 ? 's' : ''}
            </p>
            <div className="flex flex-col gap-2">
              {g.members.map(uid => (
                <div key={uid} className="flex items-center gap-3 py-2">
                  <div className="w-9 h-9 rounded-full bg-rose-100 flex items-center justify-center shrink-0 text-sm font-bold text-[#d4607a]">
                    {getMemberInitial(g, uid)}
                  </div>
                  <span className="text-[15px] font-medium text-[#1a1014]">
                    {getMemberName(g, uid)}
                    {uid === currentUserId && <span className="text-[#c4a0a8] font-normal"> (you)</span>}
                    {uid === g.createdBy && uid !== currentUserId && <span className="text-[#c4a0a8] font-normal"> · creator</span>}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Invite section */}
          <div className="border-t border-rose-100 pt-4 flex flex-col gap-3">
            <p className="text-[11px] font-semibold text-[#c4a0a8] uppercase tracking-widest">invite someone</p>

            {/* Code display */}
            <div className="flex items-center gap-3 bg-rose-50 rounded-2xl px-4 py-3 border border-rose-100">
              <span className="flex-1 text-2xl font-black tracking-widest text-[#d4607a] font-mono">{g.inviteCode}</span>
              <button
                onClick={() => handleCopyCode(g.inviteCode)}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#d4607a] bg-white border border-rose-200 px-3 py-1.5 rounded-xl hover:bg-rose-50 transition-colors"
              >
                <Copy size={12} />
                {copied ? 'copied!' : 'copy'}
              </button>
            </div>

            {/* Share button */}
            <button
              onClick={() => handleShare(g)}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-sky-50 text-gray-900 font-bold text-sm hover:bg-sky-50 active:scale-98 transition-all"
              style={{boxShadow: '0 2px 10px rgba(200,150,50,0.2)'}}
            >
              <Share2 size={15} />
              send an invite link
            </button>
            <p className="text-xs text-[#c4a0a8] text-center -mt-1">
              {navigator.share != null ? 'opens your share sheet' : 'copies a message with the code'}
            </p>
          </div>

          {/* Leave / Delete */}
          <div className="border-t border-rose-100 pt-4">
            {g.createdBy === currentUserId ? (
              confirmDelete ? (
                <div className="flex flex-col gap-2">
                  <p className="text-sm text-center text-[#1a1014] font-semibold">Delete "{g.name}" for everyone?</p>
                  <p className="text-xs text-center text-[#c4a0a8]">This can't be undone.</p>
                  <div className="flex gap-2 mt-1">
                    <button
                      onClick={() => setConfirmDelete(false)}
                      className="flex-1 py-2.5 rounded-xl border border-[#fce4e8] text-sm text-[#b07888] font-semibold hover:bg-[#fff8fa] transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={async () => { await onDeleteGroup(g.id); onClose(); }}
                      className="flex-1 py-2.5 rounded-xl bg-red-500 text-white text-sm font-bold hover:bg-red-600 transition-colors"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setConfirmDelete(true)}
                  className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-100 text-red-400 text-sm font-semibold hover:bg-red-50 transition-colors"
                >
                  <Trash2 size={14} /> Delete circle
                </button>
              )
            ) : (
              <button
                onClick={async () => { await onLeaveGroup(g.id, currentUserId); onClose(); }}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[#fce4e8] text-[#b07888] text-sm font-semibold hover:bg-[#fff8fa] transition-colors"
              >
                <LogOut size={14} /> Leave circle
              </button>
            )}
          </div>
        </div>
      </Modal>
    );
  }

  // ── Create view ───────────────────────────────────────────────────────────
  if (mode === 'create') {
    return (
      <Modal title="New circle" onClose={onClose}>
        <form onSubmit={handleCreate} className="flex flex-col gap-4">
          <button type="button" onClick={() => setMode('list')} className="flex items-center gap-1 text-sm text-[#b07888] hover:text-[#1a1014] transition-colors w-fit">
            <ArrowLeft size={14} /> back
          </button>
          <div>
            <label className="block text-sm font-semibold text-[#1a1014] mb-1.5">Circle name</label>
            <input
              autoFocus
              className="w-full rounded-xl border border-rose-200 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-rose-300 bg-rose-50 placeholder:text-[#d4b0b8]"
              placeholder='e.g. "the crew", "work friends"'
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading || !groupName.trim()}
            className="w-full py-3.5 rounded-2xl bg-[#FFB7C5] text-[#1a1014] font-bold disabled:opacity-40 hover:bg-[#F2C7C7] transition-colors"
          >
            {loading ? 'creating…' : 'create circle'}
          </button>
        </form>
      </Modal>
    );
  }

  // ── Join view ─────────────────────────────────────────────────────────────
  if (mode === 'join') {
    return (
      <Modal title="Join a circle" onClose={onClose}>
        <form onSubmit={handleJoin} className="flex flex-col gap-4">
          <button type="button" onClick={() => { setMode('list'); setError(''); }} className="flex items-center gap-1 text-sm text-[#b07888] hover:text-[#1a1014] transition-colors w-fit">
            <ArrowLeft size={14} /> back
          </button>
          <div>
            <label className="block text-sm font-semibold text-[#1a1014] mb-1.5">Invite code</label>
            <input
              autoFocus
              className="w-full rounded-xl border border-rose-200 px-4 py-3 text-base focus:outline-none focus:ring-2 focus:ring-rose-300 bg-rose-50 tracking-widest font-mono uppercase text-center text-lg placeholder:text-[#d4b0b8] placeholder:normal-case placeholder:tracking-normal placeholder:font-sans placeholder:text-sm"
              placeholder="ask a friend for their code"
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              maxLength={6}
              required
            />
            {error && <p className="text-sm text-red-400 mt-2">{error}</p>}
          </div>
          <button
            type="submit"
            disabled={loading || code.length < 4}
            className="w-full py-3.5 rounded-2xl bg-[#FFB7C5] text-[#1a1014] font-bold disabled:opacity-40 hover:bg-[#F2C7C7] transition-colors"
          >
            {loading ? 'joining…' : 'join circle'}
          </button>
        </form>
      </Modal>
    );
  }

  // ── List view ─────────────────────────────────────────────────────────────
  return (
    <Modal title="your circles" onClose={onClose}>
      <div className="flex flex-col gap-3">
        {groups.length > 0 && (
          <div className="flex flex-col gap-2 mb-1">
            {groups.map(g => (
              <div key={g.id} className="flex gap-2">
                <button
                  onClick={() => { onSelect(g.id); onClose(); }}
                  className={`flex-1 flex items-center gap-3 p-3.5 rounded-2xl border transition-colors text-left ${
                    g.id === selectedGroupId
                      ? 'border-rose-200 bg-rose-50'
                      : 'border-[#f0e4e8] bg-white hover:border-rose-200 hover:bg-rose-50/50'
                  }`}
                >
                  <div className="w-9 h-9 rounded-xl bg-rose-100 flex items-center justify-center shrink-0 text-sm font-bold text-rose-400">
                    {g.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-[#1a1014] text-sm truncate">{g.name}</p>
                    <p className="text-xs text-[#c4a0a8]">{g.members.length} member{g.members.length !== 1 ? 's' : ''}</p>
                  </div>
                  {g.id === selectedGroupId && <Check size={15} className="text-rose-400 shrink-0" />}
                </button>
                {/* Members/invite button */}
                <button
                  onClick={() => openDetail(g)}
                  className="w-12 flex items-center justify-center rounded-2xl border border-[#f0e4e8] bg-white hover:bg-rose-50 hover:border-rose-200 transition-colors shrink-0"
                  title="View members & invite"
                >
                  <Users size={15} className="text-[#c4a0a8]" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="border-t border-rose-100 pt-3 flex flex-col gap-2">
          <button
            onClick={() => setMode('create')}
            className="flex items-center gap-3 p-3.5 rounded-2xl border border-dashed border-rose-200 hover:border-rose-300 hover:bg-rose-50 transition-colors text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
              <Plus size={16} className="text-rose-400" />
            </div>
            <div>
              <p className="font-semibold text-[#1a1014] text-sm">create a new circle</p>
              <p className="text-xs text-[#c4a0a8]">start planning with a new group</p>
            </div>
            <ChevronRight size={14} className="text-[#d4b0b8] ml-auto shrink-0" />
          </button>
          <button
            onClick={() => setMode('join')}
            className="flex items-center gap-3 p-3.5 rounded-2xl border border-dashed border-rose-200 hover:border-rose-300 hover:bg-rose-50 transition-colors text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-rose-50 flex items-center justify-center shrink-0">
              <Hash size={16} className="text-rose-400" />
            </div>
            <div>
              <p className="font-semibold text-[#1a1014] text-sm">join with invite code</p>
              <p className="text-xs text-[#c4a0a8]">enter a code from a friend</p>
            </div>
            <ChevronRight size={14} className="text-[#d4b0b8] ml-auto shrink-0" />
          </button>
        </div>
      </div>
    </Modal>
  );
}
