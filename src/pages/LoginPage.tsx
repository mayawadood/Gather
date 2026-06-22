import { useState } from 'react';

interface Props {
  onSignIn: () => Promise<void>;
  loading: boolean;
}

function isInAppBrowser(): boolean {
  const ua = navigator.userAgent;
  return /FBAN|FBAV|Instagram|Twitter|Line|Snapchat/.test(ua)
    || (ua.includes('Android') && ua.includes('; wv)'));
}

function isIOS(): boolean {
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

export function LoginPage({ onSignIn, loading }: Props) {
  const [copied, setCopied] = useState(false);
  const inApp = isInAppBrowser();
  const ios = isIOS();
  const url = window.location.href;

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // fallback: select text
    }
  }

  return (
    <div className="min-h-svh flex flex-col items-center justify-center bg-[#fdf6ee] px-6">

      {/* Decorative blobs */}
      <div className="fixed top-[-80px] right-[-60px] w-72 h-72 rounded-full bg-rose-100 opacity-60 blur-3xl pointer-events-none" />
      <div className="fixed bottom-[-60px] left-[-40px] w-56 h-56 rounded-full bg-sky-50 opacity-70 blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-rose-400 flex items-center justify-center mx-auto mb-5 rotate-3" style={{boxShadow: '4px 6px 0px #F2C7C7'}}>
            <span className="text-3xl">🌿</span>
          </div>
          <h1 className="text-[2.6rem] font-extrabold tracking-tight text-[#1a1014] leading-none">gather</h1>
          <p className="text-[#b07888] mt-2.5 text-base">plan things with your people</p>
        </div>

        {/* In-app browser warning */}
        {inApp ? (
          <div className="bg-white rounded-3xl p-7 border border-rose-100 flex flex-col gap-4" style={{boxShadow: '0 4px 24px rgba(180,80,100,0.10)'}}>
            <div className="text-center">
              <p className="text-2xl mb-2">🌐</p>
              <p className="font-bold text-[#1a1014] text-base">One more step to sign in</p>
              <p className="text-sm text-[#b07888] mt-1.5 leading-relaxed">
                Google sign-in doesn't work inside {ios ? 'WhatsApp' : 'this'} browser.
              </p>
            </div>

            {/* Step-by-step instruction */}
            <div className="bg-[#fff8fa] rounded-2xl border border-[#fce4e8] p-4 flex flex-col gap-3">
              {ios ? (
                <>
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-[#FFB7C5] text-[#1a1014] font-bold text-sm flex items-center justify-center shrink-0">1</span>
                    <p className="text-sm text-[#1a1014]">Tap <strong>···</strong> at the bottom of your screen</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-[#FFB7C5] text-[#1a1014] font-bold text-sm flex items-center justify-center shrink-0">2</span>
                    <p className="text-sm text-[#1a1014]">Tap <strong>Open in Safari</strong></p>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-[#FFB7C5] text-[#1a1014] font-bold text-sm flex items-center justify-center shrink-0">1</span>
                    <p className="text-sm text-[#1a1014]">Tap <strong>⋮</strong> in the top right corner</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="w-7 h-7 rounded-full bg-[#FFB7C5] text-[#1a1014] font-bold text-sm flex items-center justify-center shrink-0">2</span>
                    <p className="text-sm text-[#1a1014]">Tap <strong>Open in Chrome</strong></p>
                  </div>
                </>
              )}
            </div>

            {/* Copy link as fallback */}
            <div className="flex flex-col gap-1.5">
              <p className="text-xs text-center text-[#c4a0a8]">or copy the link and paste it manually</p>
              <button
                onClick={copyLink}
                className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-[#fce4e8] text-[#b07888] text-sm font-semibold active:scale-98 transition-all hover:bg-[#fff0f4]"
              >
                {copied ? '✓ Copied!' : '📋 Copy link'}
              </button>
            </div>
          </div>
        ) : (
          /* Normal card */
          <div className="bg-white rounded-3xl p-7 border border-rose-100" style={{boxShadow: '0 4px 24px rgba(180,80,100,0.10)'}}>
            <p className="text-sm text-[#b07888] mb-5 leading-relaxed">
              sign in to see what's coming up with your friend groups
            </p>

            <button
              onClick={onSignIn}
              disabled={loading}
              className="w-full flex items-center justify-center gap-3 py-3.5 rounded-2xl border border-gray-200 bg-white text-gray-700 font-semibold text-base hover:bg-rose-50 hover:border-rose-200 active:scale-98 transition-all disabled:opacity-50"
              style={{boxShadow: '0 2px 8px rgba(0,0,0,0.06)'}}
            >
              <GoogleIcon />
              {loading ? 'signing in…' : 'continue with Google'}
            </button>

            <p className="text-xs text-gray-400 text-center mt-5 leading-relaxed">
              also connects your Google Calendar — finalized events show up automatically
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303c-1.649 4.657-6.08 8-11.303 8-6.627 0-12-5.373-12-12s5.373-12 12-12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 12.955 4 4 12.955 4 24s8.955 20 20 20 20-8.955 20-20c0-1.341-.138-2.65-.389-3.917z"/>
      <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
      <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
      <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C36.971 39.205 44 34 44 24c0-1.341-.138-2.65-.389-3.917z"/>
    </svg>
  );
}
