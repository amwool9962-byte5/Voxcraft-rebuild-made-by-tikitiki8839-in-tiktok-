import { useEffect, useState } from 'react';
import { WifiOff } from 'lucide-react';

export function OfflineBanner() {
  const [offline, setOffline] = useState(
    () => typeof navigator !== 'undefined' && !navigator.onLine
  );

  useEffect(() => {
    const onOffline = () => setOffline(true);
    const onOnline = () => setOffline(false);
    window.addEventListener('offline', onOffline);
    window.addEventListener('online', onOnline);
    return () => {
      window.removeEventListener('offline', onOffline);
      window.removeEventListener('online', onOnline);
    };
  }, []);

  if (!offline) return null;

  return (
    <div className="pointer-events-none fixed bottom-24 left-1/2 z-50 -translate-x-1/2">
      <div className="inline-flex items-center gap-2 rounded-full border border-amber-400/50 bg-slate-950/95 px-3.5 py-1.5 text-xs font-bold text-amber-200 shadow-lg">
        <WifiOff className="h-3.5 w-3.5 text-amber-400" />
        Offline Mode — Solo Worlds Saved Locally
      </div>
    </div>
  );
}
