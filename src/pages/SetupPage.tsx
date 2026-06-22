import { useState } from 'react';
import { CheckCircle, Circle, ExternalLink, Copy, Check } from 'lucide-react';

const steps = [
  {
    title: 'Create a Firebase project',
    body: 'Go to console.firebase.google.com, click "Add project", and follow the wizard. You can disable Google Analytics.',
    link: 'https://console.firebase.google.com',
    linkLabel: 'Open Firebase Console',
  },
  {
    title: 'Enable Google Sign-In',
    body: 'In your project, go to Authentication → Sign-in method → Google → Enable.',
  },
  {
    title: 'Create a Firestore database',
    body: 'Go to Firestore Database → Create database. Choose Native mode and pick a region close to you. Start in test mode for now.',
  },
  {
    title: 'Enable the Google Calendar API',
    body: 'In Google Cloud Console (same project), search for "Google Calendar API" and enable it.',
    link: 'https://console.cloud.google.com/apis/library/calendar-json.googleapis.com',
    linkLabel: 'Open Cloud Console',
  },
  {
    title: 'Get your Firebase config',
    body: 'In Firebase → Project Settings → Your apps, click the web icon ( </> ) to register a web app. Copy the config values.',
  },
  {
    title: 'Create a .env file',
    body: 'In your Calendar Project folder, create a file called .env and paste in your values:',
    code: `VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id`,
  },
  {
    title: 'Restart the dev server',
    body: 'Stop and restart npm run dev — Vite will pick up the new .env values and Gather will connect to Firebase.',
    code: 'npm run dev',
  },
];

export function SetupPage() {
  const [done, setDone] = useState<number[]>([]);
  const [copied, setCopied] = useState<number | null>(null);

  function toggle(i: number) {
    setDone(prev => prev.includes(i) ? prev.filter(n => n !== i) : [...prev, i]);
  }

  function copy(text: string, i: number) {
    navigator.clipboard.writeText(text);
    setCopied(i);
    setTimeout(() => setCopied(null), 1500);
  }

  return (
    <div className="min-h-svh bg-gradient-to-br from-rose-50 via-white to-rose-50 px-5 py-12 max-w-lg mx-auto">
      {/* Header */}
      <div className="text-center mb-10">
        <div className="w-16 h-16 rounded-3xl bg-[#FFB7C5] flex items-center justify-center mx-auto mb-4 shadow-lg shadow-rose-200">
          <span className="text-3xl">🌿</span>
        </div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Welcome to gather</h1>
        <p className="text-gray-500 mt-2 text-sm leading-relaxed">
          You're almost there! Gather needs a free Firebase backend to store your events and sync with friends. Follow these steps to get set up.
        </p>
      </div>

      {/* Progress bar */}
      <div className="flex gap-1 mb-8">
        {steps.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${done.includes(i) ? 'bg-rose-400' : 'bg-gray-200'}`}
          />
        ))}
      </div>

      {/* Steps */}
      <div className="flex flex-col gap-4">
        {steps.map((step, i) => {
          const isDone = done.includes(i);
          return (
            <div
              key={i}
              className={`rounded-2xl border p-4 transition-colors ${isDone ? 'border-rose-200 bg-rose-50' : 'border-gray-200 bg-white'}`}
            >
              <button
                onClick={() => toggle(i)}
                className="flex items-start gap-3 w-full text-left"
              >
                <span className={`mt-0.5 shrink-0 ${isDone ? 'text-rose-400' : 'text-gray-300'}`}>
                  {isDone ? <CheckCircle size={20} /> : <Circle size={20} />}
                </span>
                <div className="flex-1">
                  <p className={`font-semibold text-sm ${isDone ? 'text-[#c45070]' : 'text-gray-900'}`}>
                    <span className="text-gray-400 font-normal mr-1">{i + 1}.</span> {step.title}
                  </p>
                  <p className="text-xs text-gray-500 mt-1 leading-relaxed">{step.body}</p>

                  {step.link && (
                    <a
                      href={step.link}
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={e => e.stopPropagation()}
                      className="inline-flex items-center gap-1 mt-2 text-xs text-[#d4607a] font-medium hover:underline"
                    >
                      {step.linkLabel} <ExternalLink size={11} />
                    </a>
                  )}

                  {step.code && (
                    <div className="relative mt-2">
                      <pre className="bg-gray-900 text-green-400 text-[11px] rounded-xl p-3 overflow-x-auto leading-relaxed whitespace-pre-wrap">
                        {step.code}
                      </pre>
                      <button
                        onClick={e => { e.stopPropagation(); copy(step.code!, i); }}
                        className="absolute top-2 right-2 p-1.5 rounded-lg bg-gray-700 hover:bg-gray-600 text-gray-300 transition-colors"
                      >
                        {copied === i ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                      </button>
                    </div>
                  )}
                </div>
              </button>
            </div>
          );
        })}
      </div>

      {/* Footer note */}
      <p className="text-center text-xs text-gray-400 mt-8 leading-relaxed">
        Firebase's free tier (Spark plan) is plenty for a friend group.<br />
        No credit card needed.
      </p>
    </div>
  );
}
