import React, { useState } from 'react';
import { Download, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallButton: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showModal, setShowModal] = useState(false);

  if (isInstalled) {
    return null;
  }

  return (
    <>
      <button
        onClick={() => {
          if (isInstallable) {
            install();
          } else {
            setShowModal(true);
          }
        }}
        className="flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-slate-300 hover:text-white bg-slate-900 hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 min-h-[40px]"
        title="Install LIFE OS as an App"
      >
        <Download className="w-3.5 h-3.5 text-emerald-400" />
        <span className="hidden sm:inline">{isIOS ? 'Install on iOS' : 'Install App'}</span>
      </button>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-semibold text-white">Install LIFE OS</h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg"
                aria-label="Close install guide"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mt-4 space-y-3 text-sm text-slate-300 leading-relaxed">
              {isIOS ? (
                <>
                  <p>To install LIFE OS on your iPhone or iPad:</p>
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-300">
                    <li>Tap the <strong>Share</strong> icon in the Safari toolbar.</li>
                    <li>Scroll down and tap <strong>Add to Home Screen</strong>.</li>
                    <li>Launch LIFE OS directly from your home screen in standalone mode.</li>
                  </ol>
                </>
              ) : (
                <>
                  <p>
                    LIFE OS is a Progressive Web App with offline caching and standalone window support.
                  </p>
                  <ol className="list-decimal list-inside space-y-1.5 text-slate-300">
                    <li>Click the <strong>Install</strong> icon in your browser&apos;s address bar (or open the browser menu).</li>
                    <li>Select <strong>Install LIFE OS</strong> or <strong>Add to Home Screen</strong>.</li>
                  </ol>
                </>
              )}
            </div>
            <button
              onClick={() => setShowModal(false)}
              className="mt-6 w-full py-2.5 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition-colors"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
