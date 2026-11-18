import React from 'react';
import { usePoultryStore } from '../../store/usePoultryStore';
import { calculateBatchMetrics } from '../../utils/formatters';
import { HealthScoreBadge } from '../HealthScoreBadge';
import { HeatAlertWidget } from '../HeatAlertWidget';
import { StatsCards } from '../StatsCards';
import { BigActionButtons } from '../BigActionButtons';
import { WeightGrowthChart } from '../WeightGrowthChart';
import { Syringe, Share2, CheckCircle2, ChevronRight, ArrowUpRight, User, Plus, Sparkles } from 'lucide-react';

interface DashboardTabProps {
  onOpenMortality: () => void;
  onOpenFeed: () => void;
  onOpenFinance: () => void;
  onOpenNewBatchModal: () => void;
  onSelectTab: (tab: string) => void;
}

export const DashboardTab: React.FC<DashboardTabProps> = ({
  onOpenMortality,
  onOpenFeed,
  onOpenFinance,
  onOpenNewBatchModal,
  onSelectTab,
}) => {
  const currentUser = usePoultryStore((state) => state.currentUser);
  const activeBatchId = usePoultryStore((state) => state.activeBatchId);
  const batches = usePoultryStore((state) => state.batches);
  const dailyLogs = usePoultryStore((state) => state.dailyLogs);
  const cashFlow = usePoultryStore((state) => state.cashFlow);
  const feedStock = usePoultryStore((state) => state.feedStock);
  const currentTemp = usePoultryStore((state) => state.currentSimulatedTemp);
  const vaccineEvents = usePoultryStore((state) => state.vaccineEvents);
  const toggleVaccine = usePoultryStore((state) => state.toggleVaccine);
  const resetToDemoData = usePoultryStore((state) => state.resetToDemoData);

  const activeBatch = batches.find((b) => b.id === activeBatchId) || batches[0];
  const metrics = calculateBatchMetrics(activeBatch, dailyLogs, cashFlow, currentTemp);

  const vaxList = (activeBatch && vaccineEvents[activeBatch.id]) || [];
  const upcomingVaccine = vaxList.find((v) => !v.completed) || vaxList[vaxList.length - 1];

  const daysLeft = currentUser
    ? Math.max(0, Math.ceil((currentUser.expiresAtMs - Date.now()) / 86400000))
    : 0;

  const handleShareWhatsAppReport = () => {
    const text = `📊 *RAPPORT FERMEFACILE AVICOLE*
Ferme : ${currentUser?.farmName || 'Ma Ferme'}
Lot : ${activeBatch?.name || '-'} (${activeBatch?.breed || '-'})
Âge : Jour ${metrics.ageInDays} / 42
Effectif restant : ${metrics.birdsAlive} / ${metrics.initialChicks} vivants
Taux de mortalité : ${metrics.mortalityRatePercent}%
Stock Aliment : ${feedStock.croissanceBags} sacs de Croissance restants
Température au poulailler : ${currentTemp}°C
Coût de revient actuel : ${metrics.costPerChickenFCFA} FCFA / poulet
Prochain vaccin : ${upcomingVaccine?.name || '-'} (Jour ${upcomingVaccine?.day || '-'})`;

    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  return (
    <div className="space-y-3.5 pb-24">
      {/* Personal User Page Strip */}
      {currentUser && (
        <button
          type="button"
          onClick={() => onSelectTab('mypage')}
          className="w-full rounded-xl bg-slate-900 border border-slate-800 px-3.5 py-2.5 flex items-center justify-between gap-2 text-left hover:bg-slate-800/80 transition"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-emerald-700/20 border border-emerald-700/40 text-emerald-400 flex items-center justify-center shrink-0">
              <User className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold text-white truncate">
                Page de {currentUser.farmerName} • {currentUser.farmName}
              </p>
              <p className="text-[10px] text-slate-400">
                Formule {currentUser.plan} • {daysLeft} jours restants
              </p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
        </button>
      )}

      {!activeBatch ? (
        /* Empty Workspace Onboarding for Brand-New User Page */
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-5 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-slate-800 text-2xl flex items-center justify-center mx-auto">
            🐣
          </div>
          <div>
            <h3 className="text-base font-bold text-white">
              Votre page ferme est prête
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Créez votre premier lot de poussins pour démarrer le suivi de mortalité, d'aliment et de coût de revient.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-2 pt-1">
            <button
              type="button"
              onClick={onOpenNewBatchModal}
              className="flex-1 py-2.5 px-4 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1.5"
            >
              <Plus className="w-4 h-4" />
              Créer mon 1er Lot
            </button>
            <button
              type="button"
              onClick={resetToDemoData}
              className="flex-1 py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Charger exemple
            </button>
          </div>
        </div>
      ) : (
        <>
          {/* 1. Health Score Badge */}
          <HealthScoreBadge metrics={metrics} />

          {/* 2. Heat Alert Tropical Widget */}
          <HeatAlertWidget />

          {/* 3. Big Action Buttons */}
          <BigActionButtons
            onOpenMortality={onOpenMortality}
            onOpenFeed={onOpenFeed}
            onOpenFinance={onOpenFinance}
          />

          {/* 4. Quick Stats Cards */}
          <StatsCards metrics={metrics} feedStock={feedStock} onSelectTab={onSelectTab} />

          {/* 5. Ideal vs Actual Weight Curve (Recharts) */}
          <WeightGrowthChart batch={activeBatch} dailyLogs={dailyLogs} />
        </>
      )}

      {/* 5. Upcoming Vaccine Alert Card */}
      {upcomingVaccine && (
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center shrink-0">
                <Syringe className="w-4 h-4" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400">
                  Prochain Soin : Jour {upcomingVaccine.day}
                </span>
                <h4 className="font-bold text-white text-sm">
                  {upcomingVaccine.name}
                </h4>
              </div>
            </div>

            <button
              onClick={() => onSelectTab('prophylaxis')}
              className="text-xs text-slate-400 hover:text-white flex items-center gap-0.5 shrink-0"
            >
              Calendrier <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className="text-xs text-slate-400 mt-2 line-clamp-2">
            {upcomingVaccine.criticalTips}
          </p>

          <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              Eau de boisson (soif 2h)
            </span>

            <button
              onClick={() => activeBatch && toggleVaccine(activeBatch.id, upcomingVaccine.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition active:scale-95 ${
                upcomingVaccine.completed
                  ? 'bg-slate-800 text-slate-300 border border-slate-700'
                  : 'bg-emerald-700 hover:bg-emerald-600 text-white'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {upcomingVaccine.completed ? 'Fait' : 'Marquer Fait'}
            </button>
          </div>
        </div>
      )}

      {/* 6. WhatsApp Vet Report Quick Bar */}
      <div className="rounded-xl bg-slate-900 border border-slate-800 p-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center shrink-0">
            <Share2 className="w-4 h-4" />
          </div>
          <div>
            <h5 className="font-semibold text-xs text-white">Rapport Vétérinaire</h5>
            <p className="text-[10px] text-slate-400">
              Partagez le bilan du lot en 1 clic sur WhatsApp.
            </p>
          </div>
        </div>

        <button
          onClick={handleShareWhatsAppReport}
          className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 shrink-0 transition"
        >
          <span>Partager</span>
          <ArrowUpRight className="w-3 h-3 text-slate-400" />
        </button>
      </div>
    </div>
  );
};
