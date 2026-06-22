import { useState, useEffect } from 'react';

export function InstallBanner() {
  const [show, setShow] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    // Don't show if already installed or dismissed
    if (localStorage.getItem('gather_install_dismissed')) return;
    // Don't show if already running as standalone (already installed)
    if (window.matchMedia('(display-mode: standalone)').matches) return;

    const ios = /iphone|ipad|ipod/i.test(navigator.userAgent);
    setIsIOS(ios);

    if (ios) {
      // Show iOS instructions banner after a short delay
      setTimeout(() => setShow(true), 2000);
    } else {
      // Android/Chrome — catch the native prompt
      window.addEventListener('beforeinstallprompt', (e: any) => {
        e.preventDefault();
        setDeferredPrompt(e);
        setTimeout(() => setShow(true), 2000);
      });
    }
  }, []);

  function dismiss() {
    setShow(false);
    localStorage.setItem('gather_install_dismissed', '1');
  }

  async function install() {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') dismiss();
    }
  }

  if (!show) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4 pointer-events-none">
      <div
        className="max-w-lg mx-auto bg-white rounded-2xl border border-[#fce4e8] shadow-xl p-4 pointer-events-auto"
        style={{ boxShadow: '0 8px 32px rgba(180,80,100,0.15)' }}
      >
        <div className="flex items-start gap-3">
          <div className="w-12 h-12 rounded-2xl bg-[#FFB7C5] flex items-center justify-center shrink-0 text-2xl">
            🌿
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-[#1a1014] text-sm">Add Gather to your home screen</p>
            {isIOS ? (
              <div className="mt-1.5 flex items-center gap-1.5 text-xs text-[#b07888]">
                <span className="bg-[#fff0f4] border border-[#fce4e8] rounded-lg px-2 py-1 font-semibold text-[#d4607a] flex items-center gap-1">
                  Share <span className="text-sm">⎙</span>
                </span>
                <span>→</span>
                <span className="bg-[#fff0f4] border border-[#fce4e8] rounded-lg px-2 py-1 font-semibold text-[#d4607a]">
                  Add to Home Screen
                </span>
              </div>
            ) : (
              <p className="text-xs text-[#b07888] mt-0.5">
                Install for quick access — works like a real app
              </p>
            )}
          </div>
          <button
            onClick={dismiss}
            className="text-[#c4a0a8] hover:text-[#d4607a] text-lg leading-none shrink-0 p-1"
          >
            ×
          </button>
        </div>
        {!isIOS && deferredPrompt && (
          <button
            onClick={install}
            className="w-full mt-3 py-2.5 rounded-xl bg-[#FFB7C5] text-[#1a1014] text-sm font-bold hover:bg-[#F2C7C7] transition-colors"
          >
            Install app
          </button>
        )}
      </div>
    </div>
  );
}
