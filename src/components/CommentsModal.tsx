// Feature 1: Comments / hype thread
import { useState, useEffect, useRef } from 'react';
import { Send } from 'lucide-react';
import { Modal } from './Modal';
import { useComments } from '../hooks/useComments';

interface Props {
  eventId: string;
  eventName: string;
  userId: string;
  userName: string;
  photoURL: string;
  onClose: () => void;
}

export function CommentsModal({ eventId, eventName, userId, userName, photoURL, onClose }: Props) {
  const { comments, loading, postComment } = useComments(eventId);
  const [text, setText] = useState('');
  const [posting, setPosting] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [comments]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || posting) return;
    setPosting(true);
    try {
      await postComment(eventId, userId, userName, photoURL, text);
      setText('');
    } finally {
      setPosting(false);
    }
  }

  return (
    <Modal title={`💬 ${eventName}`} onClose={onClose} fullScreen>
      <div className="flex flex-col h-full min-h-0">
        <div className="flex-1 overflow-y-auto flex flex-col gap-3 pb-2">
          {loading && <p className="text-sm text-gray-400 text-center pt-8">Loading…</p>}
          {!loading && comments.length === 0 && (
            <div className="text-center py-10">
              <p className="text-4xl mb-3">💬</p>
              <p className="text-gray-400 text-sm">No messages yet. Be the first to hype this up!</p>
            </div>
          )}
          {comments.map(c => {
            const isMe = c.userId === userId;
            const initial = c.userName.charAt(0).toUpperCase();
            return (
              <div key={c.id} className={`flex gap-2 items-end ${isMe ? 'flex-row-reverse' : ''}`}>
                {/* Avatar */}
                <div className="w-7 h-7 rounded-full bg-rose-200 flex items-center justify-center text-[#c45070] font-bold text-xs shrink-0 overflow-hidden">
                  {c.photoURL
                    ? <img src={c.photoURL} alt={initial} className="w-full h-full object-cover" />
                    : initial
                  }
                </div>
                <div className={`flex flex-col gap-0.5 max-w-[75%] ${isMe ? 'items-end' : 'items-start'}`}>
                  {!isMe && <span className="text-[10px] text-gray-400 px-1">{c.userName}</span>}
                  <div className={`px-3 py-2 rounded-2xl text-sm leading-snug ${
                    isMe
                      ? 'bg-[#FFB7C5] text-[#1a1014] rounded-br-sm'
                      : 'bg-gray-100 text-gray-800 rounded-bl-sm'
                  }`}>
                    {c.text}
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <form onSubmit={handleSend} className="flex gap-2 pt-3 border-t border-gray-100 mt-1 shrink-0">
          <input
            className="flex-1 rounded-2xl border border-gray-200 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300 bg-gray-50"
            placeholder="Say something…"
            value={text}
            onChange={e => setText(e.target.value)}
            autoFocus
          />
          <button
            type="submit"
            disabled={!text.trim() || posting}
            className="w-10 h-10 flex items-center justify-center rounded-2xl bg-[#FFB7C5] text-[#1a1014] disabled:opacity-40 hover:bg-[#F2C7C7] transition-colors shrink-0"
          >
            <Send size={15} />
          </button>
        </form>
      </div>
    </Modal>
  );
}
