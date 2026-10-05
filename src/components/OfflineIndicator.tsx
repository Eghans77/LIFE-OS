import React, { useEffect, useState } from 'react';
import { WifiOff, RefreshCw } from 'lucide-react';

interface OfflineIndicatorProps {
  hasPendingWrites?: boolean;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ hasPendingWrites = false }) => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (isOnline && !hasPendingWrites) return null;

  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg bg-slate-900 border border-amber-500/40 px-3.5 py-2 text-xs font-medium text-amber-200 shadow-lg">
      {!isOnline ? (
        <>
          <WifiOff className="w-3.5 h-3.5 text-amber-400 shrink-0" />
          <span>Offline Mode · Viewing locally cached data. AI Assistant requires internet.</span>
        </>
      ) : (
        <>
          <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin shrink-0" />
          <span>Synchronizing changes to Firestore...</span>
        </>
      )}
    </div>
  );
};
