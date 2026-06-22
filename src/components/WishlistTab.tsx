// Feature 7: Wishlist / Ideas tab
import { useState } from 'react';
import { Plus, ArrowRight, Trash2, Pencil, Check, X } from 'lucide-react';
import { useWishlist } from '../hooks/useWishlist';
import type { WishlistItem } from '../types';

const WISH_EMOJIS = ['✨', '🎉', '🍕', '🎬', '🎮', '🏖️', '🎵', '🍻', '🎲', '🌮', '☕', '🎤', '🛋️', '🎯', '🌿'];

interface Props {
  groupId: string;
  userId: string;
  userName: string;
  onPromote: (wish: WishlistItem) => void;
}

export function WishlistTab({ groupId, userId, userName, onPromote }: Props) {
  const { wishes, addWish, unplanWish, deleteWish, editWish } = useWishlist(groupId);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editEmoji, setEditEmoji] = useState('✨');

  function startEdit(w: WishlistItem) {
    setEditingId(w.id);
    setEditTitle(w.title);
    setEditEmoji(w.emoji);
  }

  async function saveEdit() {
    if (!editingId || !editTitle.trim()) return;
    await editWish(editingId, editTitle, editEmoji);
    setEditingId(null);
  }

  function cancelEdit() {
    setEditingId(null);
  }
  const [title, setTitle] = useState('');
  const [emoji, setEmoji] = useState('✨');
  const [adding, setAdding] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || adding) return;
    setAdding(true);
    try {
      await addWish(groupId, userId, userName, title, emoji);
      setTitle('');
      setEmoji('✨');
    } finally {
      setAdding(false);
    }
  }

  function handlePromote(wish: WishlistItem) {
    onPromote(wish);
  }

  const active = wishes.filter(w => !w.promoted);
  const promoted = wishes.filter(w => w.promoted);

  return (
    <div className="flex flex-col gap-5">
      {/* Add new wish */}
      <form onSubmit={handleAdd} className="bg-white rounded-2xl border border-gray-200 p-4 flex flex-col gap-3 shadow-sm">
        <p className="text-sm font-semibold text-gray-700">Add an idea</p>
        {/* Emoji picker */}
        <div className="flex gap-1.5 flex-wrap">
          {WISH_EMOJIS.map(e => (
            <button
              key={e}
              type="button"
              onClick={() => setEmoji(e)}
              className={`w-8 h-8 flex items-center justify-center rounded-lg text-base transition-all ${emoji === e ? 'bg-rose-100 ring-2 ring-rose-300 scale-110' : 'hover:bg-gray-100'}`}
            >
              {e}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            className="flex-1 rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 bg-rose-50"
            placeholder="e.g. Camping weekend"
            value={title}
            onChange={e => setTitle(e.target.value)}
          />
          <button
            type="submit"
            disabled={!title.trim() || adding}
            className="flex items-center gap-1 bg-[#FFB7C5] text-[#1a1014] px-4 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-40 hover:bg-[#F2C7C7] transition-colors"
          >
            <Plus size={15} />
          </button>
        </div>
      </form>

      {/* Active wishes */}
      {active.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Ideas 💡</h3>
          <div className="flex flex-col gap-2">
            {active.map(w => (
              <div key={w.id} className="bg-white rounded-2xl border border-[#fce4e8] p-4 flex flex-col gap-3 shadow-sm">
                {editingId === w.id ? (
                  <>
                    {/* Emoji picker */}
                    <div className="flex gap-1.5 flex-wrap">
                      {WISH_EMOJIS.map(e => (
                        <button
                          key={e}
                          type="button"
                          onClick={() => setEditEmoji(e)}
                          className={`w-8 h-8 flex items-center justify-center rounded-lg text-base transition-all ${editEmoji === e ? 'bg-[#fff0f4] ring-2 ring-[#FFB7C5] scale-110' : 'hover:bg-[#fff8fa]'}`}
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        autoFocus
                        className="flex-1 rounded-xl border border-[#F2C7C7] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FFB7C5] bg-[#fff8fa]"
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
                      />
                      <button
                        onClick={saveEdit}
                        disabled={!editTitle.trim()}
                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#FFB7C5] text-[#1a1014] disabled:opacity-40 hover:bg-[#F2C7C7] transition-colors"
                      >
                        <Check size={15} />
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#fff0f4] text-[#b07888] hover:bg-[#fce4e8] transition-colors"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{w.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-[#1a1014] text-sm truncate">{w.title}</p>
                      <p className="text-xs text-[#c4a0a8]">by {w.createdByName}</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => handlePromote(w)}
                        className="flex items-center gap-1.5 text-xs font-semibold text-[#d4607a] bg-[#fff0f4] border border-[#fce4e8] px-3 py-1.5 rounded-xl hover:bg-[#FFB7C5] hover:text-white transition-colors"
                      >
                        Plan it <ArrowRight size={12} />
                      </button>
                      <button
                        onClick={() => startEdit(w)}
                        className="w-7 h-7 flex items-center justify-center rounded-xl text-[#c4a0a8] hover:bg-[#fff0f4] hover:text-[#d4607a] transition-colors"
                        aria-label="Edit idea"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => deleteWish(w.id)}
                        className="w-7 h-7 flex items-center justify-center rounded-xl text-[#c4a0a8] hover:bg-[#fff0f4] hover:text-[#d4607a] transition-colors"
                        aria-label="Delete idea"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Promoted wishes */}
      {promoted.length > 0 && (
        <div>
          <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Planned ✓</h3>
          <div className="flex flex-col gap-2">
            {promoted.map(w => (
              <div key={w.id} className="bg-[#fafafa] rounded-2xl border border-[#f0f0f0] p-4 flex flex-col gap-3">
                {editingId === w.id ? (
                  <>
                    <div className="flex gap-1.5 flex-wrap">
                      {WISH_EMOJIS.map(e => (
                        <button
                          key={e}
                          type="button"
                          onClick={() => setEditEmoji(e)}
                          className={`w-8 h-8 flex items-center justify-center rounded-lg text-base transition-all ${editEmoji === e ? 'bg-[#fff0f4] ring-2 ring-[#FFB7C5] scale-110' : 'hover:bg-[#fff8fa]'}`}
                        >
                          {e}
                        </button>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <input
                        autoFocus
                        className="flex-1 rounded-xl border border-[#F2C7C7] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#FFB7C5] bg-[#fff8fa]"
                        value={editTitle}
                        onChange={e => setEditTitle(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') saveEdit(); if (e.key === 'Escape') cancelEdit(); }}
                      />
                      <button
                        onClick={saveEdit}
                        disabled={!editTitle.trim()}
                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#FFB7C5] text-[#1a1014] disabled:opacity-40 hover:bg-[#F2C7C7] transition-colors"
                      >
                        <Check size={15} />
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="w-9 h-9 flex items-center justify-center rounded-xl bg-[#fff0f4] text-[#b07888] hover:bg-[#fce4e8] transition-colors"
                      >
                        <X size={15} />
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="flex items-center gap-3">
                    <span className="text-2xl opacity-50">{w.emoji}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-400 text-sm line-through truncate">{w.title}</p>
                      <p className="text-xs text-gray-400">Planned</p>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={() => unplanWish(w.id)}
                        className="text-xs font-semibold text-[#b07888] bg-white border border-[#f0f0f0] px-2.5 py-1.5 rounded-xl hover:bg-[#fff0f4] hover:text-[#d4607a] hover:border-[#fce4e8] transition-colors"
                        title="Move back to ideas"
                      >
                        ↩ Unplan
                      </button>
                      <button
                        onClick={() => startEdit(w)}
                        className="w-7 h-7 flex items-center justify-center rounded-xl text-[#c4a0a8] hover:bg-[#fff0f4] hover:text-[#d4607a] transition-colors"
                        aria-label="Edit idea"
                      >
                        <Pencil size={13} />
                      </button>
                      <button
                        onClick={() => deleteWish(w.id)}
                        className="w-7 h-7 flex items-center justify-center rounded-xl text-[#c4a0a8] hover:bg-[#fff0f4] hover:text-[#d4607a] transition-colors"
                        aria-label="Delete idea"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {active.length === 0 && promoted.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <span className="text-5xl mb-4">💡</span>
          <p className="text-gray-400 font-medium">No ideas yet</p>
          <p className="text-sm text-gray-300 mt-1">Add something above!</p>
        </div>
      )}
    </div>
  );
}
