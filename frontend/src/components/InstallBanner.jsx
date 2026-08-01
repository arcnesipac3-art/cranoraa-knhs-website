import { useEffect, useState } from 'react';
import { useInstallPrompt } from '../hooks/useInstallPrompt';

/**
 * PWA Install Banner.
 *
 * A modern, bottom-sheet style install prompt that matches the
 * website's purple design language. Shows when the app is installable.
 *
 * Features:
 *   - "Install Now" → triggers browser install prompt
 *   - "Maybe Later" → hides for this session only
 *   - "Never Show Again" → hides permanently (localStorage)
 *   - Auto-dismisses after 15 seconds of inactivity
 *   - Fades in with slide-up animation
 */
export default function InstallBanner() {
  const { canInstall, install, dismiss } = useInstallPrompt();
  const [visible, setVisible] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // Delay showing the banner by 3 seconds to avoid overwhelming the user
  useEffect(() => {
    if (!canInstall || dismissed) return;

    const timer = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(timer);
  }, [canInstall, dismissed]);

  // Auto-dismiss after 15 seconds
  useEffect(() => {
    if (!visible) return;

    const timer = setTimeout(() => {
      handleMaybeLater();
    }, 15000);
    return () => clearTimeout(timer);
  }, [visible]);

  const handleInstall = async () => {
    setIsInstalling(true);
    try {
      const result = await install();
      if (result?.outcome === 'accepted') {
        setVisible(false);
        setDismissed(true);
      }
    } finally {
      setIsInstalling(false);
    }
  };

  const handleMaybeLater = () => {
    setVisible(false);
    setDismissed(true);
    dismiss(false);
  };

  const handleNeverShow = () => {
    setVisible(false);
    setDismissed(true);
    dismiss(true);
  };

  if (!canInstall || dismissed || !visible) return null;

  return (
    <div
      role="dialog"
      aria-label="Install application"
      className="fixed bottom-0 inset-x-0 z-[9998] p-4 pb-[max(1rem,env(safe-area-inset-bottom))] animate-fade-in-up"
    >
      <div className="max-w-lg mx-auto">
        <div className="relative overflow-hidden rounded-2xl bg-white border border-violet-100 shadow-2xl shadow-violet-900/10">
          {/* Purple accent bar */}
          <div className="h-1 bg-gradient-to-r from-violet-600 via-purple-500 to-violet-400" />

          <div className="p-5">
            {/* Header */}
            <div className="flex items-start gap-4">
              {/* App icon */}
              <div className="shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-violet-600 to-purple-700 flex items-center justify-center shadow-lg shadow-violet-500/30">
                <span className="text-white font-black text-lg tracking-tight">K</span>
              </div>

              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-extrabold text-slate-900 tracking-tight">
                  Install KNHS Portal
                </h3>
                <p className="mt-1 text-xs text-slate-500 leading-relaxed">
                  Add to your home screen for quick access, offline support, and a native app experience.
                </p>
              </div>
            </div>

            {/* Action buttons */}
            <div className="mt-4 flex items-center gap-2">
              {/* Install Now — primary CTA */}
              <button
                onClick={handleInstall}
                disabled={isInstalling}
                className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 text-white text-xs font-bold hover:bg-violet-700 active:scale-[0.97] transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isInstalling ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Installing…
                  </>
                ) : (
                  <>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    Install Now
                  </>
                )}
              </button>

              {/* Maybe Later — secondary */}
              <button
                onClick={handleMaybeLater}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-xs font-bold hover:bg-slate-50 active:scale-[0.97] transition-all"
              >
                Maybe Later
              </button>
            </div>

            {/* Never show again — subtle text link */}
            <button
              onClick={handleNeverShow}
              className="mt-3 w-full text-center text-[10px] text-slate-400 font-semibold hover:text-slate-600 transition-colors"
            >
              Don't ask me again
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
