import React, { useState } from 'react';
import { usePoultryStore } from '../../store/usePoultryStore';
import {
  User,
  KeyRound,
  Calendar,
  Eye,
  EyeOff,
  LogOut,
  Sun,
  Moon,
  Sparkles,
  Cloud,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import { auth } from '../../lib/firebase';
import { signInWithGoogleCloud, syncWorkspaceToFirestore } from '../../services/cloudSyncService';
import { AdvisorContactCard } from '../AdvisorContactCard';

interface UserPageTabProps {
  onOpenNewBatchModal: () => void;
  onSelectTab: (tab: string) => void;
}

const PLAN_NAMES = {
  mensuel: 'Abonnement Mensuel (30 jours)',
  trimestriel: 'Abonnement Trimestriel (90 jours)',
  annuel: 'Abonnement Annuel (365 jours)',
};

export const UserPageTab: React.FC<UserPageTabProps> = ({
  onOpenNewBatchModal,
  onSelectTab,
}) => {
  const currentUser = usePoultryStore((state) => state.currentUser);
  const batches = usePoultryStore((state) => state.batches);
  const dailyLogs = usePoultryStore((state) => state.dailyLogs);
  const vaccineEvents = usePoultryStore((state) => state.vaccineEvents);
  const feedStock = usePoultryStore((state) => state.feedStock);
  const cashFlow = usePoultryStore((state) => state.cashFlow);
  const country = usePoultryStore((state) => state.country);
  const isAudioEnabled = usePoultryStore((state) => state.isAudioEnabled);
  const heatAlertThreshold = usePoultryStore((state) => state.heatAlertThreshold);
  const currentSimulatedTemp = usePoultryStore((state) => state.currentSimulatedTemp);
  const themeMode = usePoultryStore((state) => state.themeMode);
  const setThemeMode = usePoultryStore((state) => state.setThemeMode);
  const resetToDemoData = usePoultryStore((state) => state.resetToDemoData);
  const logoutUser = usePoultryStore((state) => state.logoutUser);
  const activeBatchId = usePoultryStore((state) => state.activeBatchId);

  const [showCode, setShowCode] = useState(false);
  const [cloudStatus, setCloudStatus] = useState<string>('');
  const [isSyncingCloud, setIsSyncingCloud] = useState(false);

  if (!currentUser) return null;

  const daysLeft = Math.max(0, Math.ceil((currentUser.expiresAtMs - Date.now()) / 86400000));
  const progressPct = Math.min(
    100,
    Math.max(5, Math.round((daysLeft / (currentUser.durationDays || 30)) * 100))
  );

  const totalSales = cashFlow
    .filter((c) => c.type === 'vente')
    .reduce((sum, c) => sum + c.amountFCFA, 0);

  const handleCloudBackup = async () => {
    setIsSyncingCloud(true);
    setCloudStatus('');
    try {
      let fbUser = auth.currentUser;
      if (!fbUser) {
        fbUser = await signInWithGoogleCloud();
      }
      if (fbUser?.emailVerified) {
        await syncWorkspaceToFirestore(currentUser, {
          batches,
          activeBatchId,
          dailyLogs,
          vaccineEvents,
          feedStock,
          cashFlow,
          country,
          isAudioEnabled,
          heatAlertThreshold,
          currentSimulatedTemp,
          themeMode,
          updatedAtMs: Date.now(),
        });
        setCloudStatus(`Sauvegardé sur ${fbUser.email}`);
      }
    } catch {
      setCloudStatus('Synchronisation cloud annulée ou indisponible.');
    } finally {
      setIsSyncingCloud(false);
    }
  };

  return (
    <div className="space-y-3.5 pb-24">
      {/* Personal Page Header Card */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-bold text-base shrink-0">
              <User className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] uppercase font-bold text-emerald-400">
                Page Privée Éleveur
              </span>
              <h2 className="text-base font-bold text-white leading-tight">
                {currentUser.farmName}
              </h2>
              <p className="text-xs text-slate-400">
                {currentUser.farmerName} • {currentUser.phone}
              </p>
            </div>
          </div>

          <span className="text-xs px-2 py-1 rounded-lg bg-slate-800 border border-slate-700 font-semibold text-slate-200">
            {currentUser.country}
          </span>
        </div>

        {/* Access Code Display */}
        <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-slate-400" />
            <div>
              <span className="text-[10px] text-slate-400 block">Votre Code d'Accès</span>
              <span className="font-mono font-bold text-xs text-white tracking-wider">
                {showCode ? currentUser.code : '••••-••••-••••'}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setShowCode(!showCode)}
            className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white"
            title={showCode ? 'Masquer' : 'Afficher'}
          >
            {showCode ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Active Subscription Card */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] uppercase font-semibold text-slate-400 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-emerald-400" />
            Mon Abonnement
          </span>
          <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Actif
          </span>
        </div>

        <div>
          <h3 className="text-sm font-bold text-white">{PLAN_NAMES[currentUser.plan]}</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Expire le {new Date(currentUser.expiresAtMs).toLocaleDateString('fr-FR')} •{' '}
            <strong className="text-white">{daysLeft} jours restants</strong>
          </p>
        </div>

        <div className="h-2 rounded-full bg-slate-950 border border-slate-800 overflow-hidden">
          <div
            className="h-full bg-emerald-600 rounded-full transition-all"
            style={{ width: `${progressPct}%` }}
          />
        </div>
      </div>

      {/* Personal Workspace Summary */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3">
        <span className="text-[10px] uppercase font-semibold text-slate-400 block">
          Résumé de Ma Page
        </span>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
            <span className="text-[10px] text-slate-400 block">Lots</span>
            <strong className="text-base text-white">{batches.length}</strong>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
            <span className="text-[10px] text-slate-400 block">Fiches</span>
            <strong className="text-base text-white">{dailyLogs.length}</strong>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800">
            <span className="text-[10px] text-slate-400 block">Ventes</span>
            <strong className="text-xs text-white block mt-1">
              {totalSales.toLocaleString('fr-FR')} F
            </strong>
          </div>
        </div>

        {batches.length === 0 ? (
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onOpenNewBatchModal}
              className="flex-1 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-1.5"
            >
              <Layers className="w-3.5 h-3.5" />
              Créer mon 1er lot
            </button>
            <button
              type="button"
              onClick={() => {
                resetToDemoData();
                onSelectTab('dashboard');
              }}
              className="flex-1 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Charger exemple
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onSelectTab('dashboard')}
            className="w-full py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
          >
            Aller au Tableau de Bord
          </button>
        )}
      </div>

      {/* Display & Cloud Backup */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-2.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-white">Affichage Plein Soleil</span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setThemeMode('light')}
              className={`px-2.5 py-1 rounded-lg text-xs flex items-center gap-1 border ${
                themeMode === 'light'
                  ? 'bg-slate-800 border-slate-600 text-white font-semibold'
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              <Sun className="w-3.5 h-3.5 text-amber-500" />
              Soleil
            </button>
            <button
              type="button"
              onClick={() => setThemeMode('dark')}
              className={`px-2.5 py-1 rounded-lg text-xs flex items-center gap-1 border ${
                themeMode === 'dark'
                  ? 'bg-slate-800 border-slate-600 text-white font-semibold'
                  : 'bg-slate-950 border-slate-800 text-slate-400'
              }`}
            >
              <Moon className="w-3.5 h-3.5" />
              Sombre
            </button>
          </div>
        </div>

        <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
          <div>
            <span className="text-xs font-semibold text-white block">Sauvegarde Cloud</span>
            <span className="text-[10px] text-slate-400">
              {cloudStatus || 'Optionnel : copier vos lots sur votre compte Google'}
            </span>
          </div>
          <button
            type="button"
            onClick={handleCloudBackup}
            disabled={isSyncingCloud}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-white flex items-center gap-1.5 shrink-0"
          >
            <Cloud className="w-3.5 h-3.5 text-emerald-400" />
            {isSyncingCloud ? 'Envoi...' : 'Sauvegarder'}
          </button>
        </div>
      </div>

      {/* Conseiller du Domaine */}
      <AdvisorContactCard compact onNavigateToFull={() => onSelectTab('guide')} />

      {/* Logout Button */}
      <button
        type="button"
        onClick={logoutUser}
        className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-800 text-red-400 font-semibold text-xs flex items-center justify-center gap-2 transition"
      >
        <LogOut className="w-4 h-4" />
        Se déconnecter / Changer de code
      </button>
    </div>
  );
};
