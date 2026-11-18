import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Download, Share, Smartphone, X } from 'lucide-react';

export const PWAInstallPrompt: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  if (isInstalled || dismissed) return null;

  return (
    <>
      {(isInstallable || isIOS) && (
        <div className="bg-slate-900 border-b border-slate-800 px-3.5 py-2 text-xs text-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-slate-400 shrink-0" />
            <div>
              <p className="font-semibold text-white">
                Installer FermeFacile
              </p>
              <p className="text-slate-400 text-[10px]">
                Fonctionne 100% hors-ligne au poulailler.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {isInstallable && (
              <button
                onClick={install}
                className="bg-emerald-700 hover:bg-emerald-600 text-white px-2.5 py-1 rounded-md font-semibold text-xs flex items-center gap-1 transition"
              >
                <Download className="w-3.5 h-3.5" />
                Installer
              </button>
            )}

            {isIOS && (
              <button
                onClick={() => setShowIOSModal(true)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 px-2.5 py-1 rounded-md text-xs font-medium transition"
              >
                <Share className="w-3 h-3 inline mr-1" />
                iPhone
              </button>
            )}

            <button
              onClick={() => setDismissed(true)}
              className="text-slate-500 hover:text-slate-300 p-1"
              title="Masquer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-xl bg-slate-900 border border-slate-700 p-5 shadow-2xl text-slate-100">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Smartphone className="w-4 h-4" />
                Installer sur iPhone
              </h3>
              <button onClick={() => setShowIOSModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <ol className="space-y-2 text-xs text-slate-300">
              <li>1. Appuyez sur <strong>Partager</strong> dans Safari.</li>
              <li>2. Choisissez <strong>« Sur l'écran d'accueil »</strong>.</li>
              <li>3. Appuyez sur <strong>« Ajouter »</strong>.</li>
            </ol>

            <button
              onClick={() => setShowIOSModal(false)}
              className="mt-4 w-full rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium py-2 text-xs transition"
            >
              Fermer
            </button>
          </div>
        </div>
      )}
    </>
  );
};
