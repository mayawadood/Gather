import { useState, useRef } from 'react';

interface Props {
  suggestedName: string;
  onSave: (name: string, photo?: string) => void;
}

function resizeImage(file: File, size = 200): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d')!;
      const min = Math.min(img.width, img.height);
      const sx = (img.width - min) / 2;
      const sy = (img.height - min) / 2;
      ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.onerror = reject;
    img.src = url;
  });
}

export function NameSetupPage({ suggestedName, onSave }: Props) {
  const [name, setName] = useState(suggestedName.split(' ')[0] || '');
  const [photo, setPhoto] = useState<string | null>(null);
  const [photoLoading, setPhotoLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setPhotoLoading(true);
    try {
      const resized = await resizeImage(file);
      setPhoto(resized);
    } catch {
      // ignore
    } finally {
      setPhotoLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (name.trim()) onSave(name.trim(), photo ?? undefined);
  }

  return (
    <div className="min-h-svh flex flex-col items-center justify-center bg-[#fff8fa] px-6">
      <div className="fixed top-[-80px] right-[-60px] w-72 h-72 rounded-full bg-[#fff0f4] opacity-60 blur-3xl pointer-events-none" />
      <div className="fixed bottom-[-60px] left-[-40px] w-56 h-56 rounded-full bg-[#F2C7C7] opacity-70 blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="text-5xl mb-4">👋</div>
          <h1 className="text-2xl font-extrabold text-[#1a1014] tracking-tight">what should we call you?</h1>
          <p className="text-[#b07888] mt-2 text-sm">your friends will see this when you vote or join events</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-3xl p-7 border border-[#fce4e8] flex flex-col gap-5" style={{boxShadow: '0 4px 24px rgba(180,80,100,0.10)'}}>

          {/* Photo picker */}
          <div className="flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="relative w-20 h-20 rounded-full overflow-hidden border-2 border-dashed border-[#F2C7C7] bg-[#fff8fa] flex items-center justify-center hover:border-[#FFB7C5] hover:bg-[#fff0f4] transition-all active:scale-95"
            >
              {photoLoading ? (
                <div className="w-5 h-5 border-2 border-[#FFB7C5] border-t-[#d4607a] rounded-full animate-spin" />
              ) : photo ? (
                <img src={photo} alt="you" className="w-full h-full object-cover" />
              ) : (
                <span className="text-2xl select-none">📷</span>
              )}
              {photo && !photoLoading && (
                <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity">
                  <span className="text-white text-xs font-semibold">change</span>
                </div>
              )}
            </button>
            <span className="text-xs text-[#d4b0b8]">{photo ? 'tap to change' : 'add a photo (optional)'}</span>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>

          <input
            autoFocus
            className="w-full rounded-2xl border border-[#F2C7C7] bg-[#fff8fa] px-5 py-4 text-xl font-semibold text-[#1a1014] focus:outline-none focus:ring-2 focus:ring-[#FFB7C5] placeholder:text-[#d4b0b8] placeholder:font-normal text-center"
            placeholder="your first name"
            value={name}
            onChange={e => setName(e.target.value)}
            maxLength={30}
            required
          />
          <button
            type="submit"
            disabled={!name.trim()}
            className="w-full py-4 rounded-2xl bg-[#FFB7C5] text-[#1a1014] font-bold text-base disabled:opacity-40 hover:bg-[#F2C7C7] active:scale-98 transition-all"
            style={{boxShadow: '0 2px 10px rgba(100,180,220,0.15)'}}
          >
            let's go →
          </button>
        </form>
      </div>
    </div>
  );
}
