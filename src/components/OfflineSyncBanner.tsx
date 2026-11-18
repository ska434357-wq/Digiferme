import React, { useState } from 'react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { usePoultryStore } from '../store/usePoultryStore';
import { WifiOff, Wifi, RefreshCw, Check } from 'lucide-react';

export const OfflineSyncBanner: React.FC = () => {
  const isOnline = useOnlineStatus();
  const syncQueue = usePoultryStore((state) => state.syncQueue);
  const syncQueueToServer = usePoultryStore((state) => state.syncQueueToServer);
  const lastSyncTime = usePoultryStore((state) => state.lastSyncTime);
  const [isSyncing, setIsSyncing] = useState(false);
  const [justSynced, setJustSynced] = useState(false);

  const pendingCount = syncQueue.length;

  const handleManualSync = async () => {
    if (pendingCount === 0 && isOnline) return;
    setIsSyncing(true);
    try {
      await syncQueueToServer();
      setJustSynced(true);
      setTimeout(() => setJustSynced(false), 2000);
    } finally {
      setIsSyncing(false);
    }
  };

  const formatLastSync = (ts: number | null) => {
    if (!ts) return 'Jamais';
    const diffMin = Math.floor((Date.now() - ts) / 60000);
    if (diffMin < 1) return 'À l\'instant';
    if (diffMin < 60) return `${diffMin}m`;
    const diffHours = Math.floor(diffMin / 60);
    return `${diffHours}h`;
  };

  return (
    <div className="w-full bg-slate-900 border-b border-slate-800 px-3 py-1.5 flex items-center justify-between text-xs text-slate-400">
      {/* Connectivity badge */}
      <div className="flex items-center gap-2">
        {isOnline ? (
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            <Wifi className="w-3.5 h-3.5" />
            <span className="text-[11px]">En ligne</span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 text-slate-300">
            <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            <WifiOff className="w-3.5 h-3.5" />
            <span className="text-[11px]">Hors-ligne</span>
          </div>
        )}

        <span>•</span>

        {pendingCount > 0 ? (
          <span className="text-slate-300 text-[11px]">
            {pendingCount} attente
          </span>
        ) : (
          <span className="text-slate-500 text-[11px] hidden sm:inline">
            Synchro {formatLastSync(lastSyncTime)}
          </span>
        )}
      </div>

      {/* Sync Button */}
      <div>
        {justSynced ? (
          <span className="text-emerald-400 text-[11px] flex items-center gap-1 font-medium">
            <Check className="w-3 h-3" /> Synchronisé
          </span>
        ) : (
          <button
            onClick={handleManualSync}
            disabled={isSyncing}
            className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] transition"
          >
            <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
            {isSyncing ? 'Envoi...' : 'Synchro'}
          </button>
        )}
      </div>
    </div>
  );
};
