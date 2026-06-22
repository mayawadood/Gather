interface Props {
  onSignIn: () => Promise<void>;
  loading: boolean;
}

export function LoginPage({ onSignIn, loading }: Props) {
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

        {/* Card */}
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
