import { useEffect } from 'react';
import { X } from 'lucide-react';

interface Props {
  title: React.ReactNode;
  onClose: () => void;
  children: React.ReactNode;
  fullScreen?: boolean;
}

export function Modal({ title, onClose, children, fullScreen, zIndex = 50 }: Props & { zIndex?: number }) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <div className="fixed inset-0 flex items-end justify-center sm:items-center" style={{ background: 'rgba(0,0,0,0.4)', zIndex }}>
      <div
        className={`bg-white w-full max-w-lg rounded-t-3xl sm:rounded-3xl shadow-2xl flex flex-col ${fullScreen ? 'h-[90svh]' : 'max-h-[85svh]'}`}
        style={{ animation: 'slideUp 0.25s ease' }}
      >
        <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100 shrink-0">
          <h2 className="text-lg font-bold text-gray-900">{title}</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center text-gray-500 hover:bg-gray-200 transition-colors"
          >
            <X size={16} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 px-5 py-4">
          {children}
        </div>
      </div>
      <style>{`
        @keyframes slideUp {
          from { transform: translateY(40px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
