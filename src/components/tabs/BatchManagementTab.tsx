import React, { useState } from 'react';
import { usePoultryStore } from '../../store/usePoultryStore';
import { calculateBatchMetrics } from '../../utils/formatters';
import {
  Plus,
  Wheat,
  Droplets,
  Scale,
} from 'lucide-react';

interface BatchManagementTabProps {
  onOpenNewBatchModal: () => void;
  onOpenMortality: () => void;
  onOpenFeed: () => void;
}

export const BatchManagementTab: React.FC<BatchManagementTabProps> = ({
  onOpenNewBatchModal,
  onOpenMortality,
  onOpenFeed,
}) => {
  const activeBatchId = usePoultryStore((state) => state.activeBatchId);
  const batches = usePoultryStore((state) => state.batches);
  const dailyLogs = usePoultryStore((state) => state.dailyLogs);
  const cashFlow = usePoultryStore((state) => state.cashFlow);
  const currentTemp = usePoultryStore((state) => state.currentSimulatedTemp);

  const activeBatch = batches.find((b) => b.id === activeBatchId) || batches[0];
  const metrics = calculateBatchMetrics(activeBatch, dailyLogs, cashFlow, currentTemp);

  const batchLogs = dailyLogs
    .filter((l) => l.batchId === activeBatch?.id)
    .sort((a, b) => b.dayNumber - a.dayNumber);

  const [activeSubTab, setActiveSubTab] = useState<'financial' | 'history'>('financial');

  // Breakdown of expenses
  const chickExpenses = cashFlow
    .filter((c) => c.batchId === activeBatch?.id && c.category === 'poussin')
    .reduce((a, c) => a + c.amountFCFA, 0);

  const feedExpenses = cashFlow
    .filter((c) => c.batchId === activeBatch?.id && c.category === 'aliment')
    .reduce((a, c) => a + c.amountFCFA, 0);

  const healthExpenses = cashFlow
    .filter((c) => c.batchId === activeBatch?.id && c.category === 'vaccin_sante')
    .reduce((a, c) => a + c.amountFCFA, 0);

  const otherExpenses = cashFlow
    .filter(
      (c) =>
        c.batchId === activeBatch?.id &&
        c.type === 'depense' &&
        !['poussin', 'aliment', 'vaccin_sante'].includes(c.category)
    )
    .reduce((a, c) => a + c.amountFCFA, 0);

  const totalExp = metrics.totalExpensesFCFA || 1;
  const chickPercent = Math.round((chickExpenses / totalExp) * 100);
  const feedPercent = Math.round((feedExpenses / totalExp) * 100);
  const healthPercent = Math.round((healthExpenses / totalExp) * 100);
  const otherPercent = Math.max(0, 100 - (chickPercent + feedPercent + healthPercent));

  if (!activeBatch) {
    return (
      <div className="space-y-3.5 pb-24">
        <div className="rounded-xl border border-slate-800 bg-slate-900 p-6 text-center space-y-3">
          <h2 className="text-base font-bold text-white">Aucun lot enregistré</h2>
          <p className="text-xs text-slate-400">
            Créez votre premier lot pour suivre les poussins, la mortalité et le coût de revient.
          </p>
          <button
            onClick={onOpenNewBatchModal}
            className="bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-xs px-4 py-2.5 rounded-xl inline-flex items-center gap-1.5 transition"
          >
            <Plus className="w-4 h-4" />
            Créer un nouveau lot
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3.5 pb-24">
      {/* Batch Overview Banner */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] uppercase font-bold text-slate-400">
                Lot Actif
              </span>
              <span className="text-xs text-slate-400">
                • {activeBatch?.startDate}
              </span>
            </div>
            <h2 className="text-base font-bold text-white mt-0.5">{activeBatch?.name}</h2>
            <p className="text-xs text-slate-400">
              Souche : {activeBatch?.breed} • Couvoir : {activeBatch?.supplier}
            </p>
          </div>

          <button
            onClick={onOpenNewBatchModal}
            className="bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            Nouveau
          </button>
        </div>

        {/* Key Metrics Grid */}
        <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-800 text-center">
          <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
            <span className="text-[10px] text-slate-400 block">Âge</span>
            <span className="text-sm font-bold text-white">J-{metrics.ageInDays}</span>
            <span className="text-[9px] text-slate-500 block">/ {activeBatch?.targetHarvestDay}j</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
            <span className="text-[10px] text-slate-400 block">Vivants</span>
            <span className="text-sm font-bold text-slate-100">{metrics.birdsAlive}</span>
            <span className="text-[9px] text-slate-500 block">/ {metrics.initialChicks}</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
            <span className="text-[10px] text-slate-400 block">Poids Estimé</span>
            <span className="text-sm font-bold text-slate-100">
              {metrics.averageWeightGrams >= 1000
                ? `${(metrics.averageWeightGrams / 1000).toFixed(2)} kg`
                : `${metrics.averageWeightGrams} g`}
            </span>
            <span className="text-[9px] text-slate-500 block">Cible : 2.2 kg</span>
          </div>
        </div>
      </div>

      {/* Sub Tabs Toggle */}
      <div className="grid grid-cols-2 gap-1 p-1 bg-slate-900 rounded-xl border border-slate-800 text-xs">
        <button
          onClick={() => setActiveSubTab('financial')}
          className={`py-1.5 rounded-lg font-semibold transition ${
            activeSubTab === 'financial'
              ? 'bg-slate-800 text-white'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Coût de Revient
        </button>
        <button
          onClick={() => setActiveSubTab('history')}
          className={`py-1.5 rounded-lg font-semibold transition ${
            activeSubTab === 'history'
              ? 'bg-slate-800 text-white'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Fiches Journalières ({batchLogs.length})
        </button>
      </div>

      {activeSubTab === 'financial' ? (
        /* LIVE FINANCIAL SUMMARY */
        <div className="space-y-3">
          {/* Main Hero Card: Cost per Chicken */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 text-center">
            <span className="text-[11px] font-semibold uppercase text-slate-400">
              Coût de Revient par Sujet Vivant
            </span>

            <div className="my-2">
              <span className="text-4xl font-extrabold text-white tracking-tight">
                {metrics.costPerChickenFCFA.toLocaleString('fr-FR')}
              </span>
              <span className="text-sm font-semibold text-slate-400 ml-1">FCFA</span>
              <p className="text-xs text-slate-400 mt-1">
                Calculé sur {metrics.birdsAlive} poulets vivants restants
              </p>
            </div>

            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs flex items-center justify-between mt-3">
              <div className="text-left">
                <span className="text-slate-400 block text-[10px]">Dépenses Totales</span>
                <strong className="text-white">
                  {metrics.totalExpensesFCFA.toLocaleString('fr-FR')} FCFA
                </strong>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block text-[10px]">Prix Vente Marché</span>
                <strong className="text-slate-200">2 400 FCFA / poulet</strong>
              </div>
            </div>
          </div>

          {/* SOBER Expense Breakdown Progress Bar */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3">
            <h4 className="text-xs font-semibold text-slate-300 uppercase">
              Répartition des Dépenses
            </h4>

            {/* Sober neutral-toned segmented bar */}
            <div className="h-3 rounded-full bg-slate-950 overflow-hidden flex border border-slate-800">
              <div style={{ width: `${feedPercent}%` }} className="bg-emerald-700" title="Aliment" />
              <div style={{ width: `${chickPercent}%` }} className="bg-slate-600" title="Poussins" />
              <div style={{ width: `${healthPercent}%` }} className="bg-slate-700" title="Santé" />
              <div style={{ width: `${otherPercent}%` }} className="bg-slate-800" title="Autres" />
            </div>

            {/* Clean Legend items */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-700" />
                  <span className="text-slate-300">Aliment ({feedPercent}%)</span>
                </div>
                <strong className="text-slate-200">{feedExpenses.toLocaleString('fr-FR')} F</strong>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-600" />
                  <span className="text-slate-300">Poussins ({chickPercent}%)</span>
                </div>
                <strong className="text-slate-200">{chickExpenses.toLocaleString('fr-FR')} F</strong>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                  <span className="text-slate-300">Santé ({healthPercent}%)</span>
                </div>
                <strong className="text-slate-200">{healthExpenses.toLocaleString('fr-FR')} F</strong>
              </div>

              <div className="flex items-center justify-between p-2 rounded-lg bg-slate-950 border border-slate-800">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-800" />
                  <span className="text-slate-300">Divers ({otherPercent}%)</span>
                </div>
                <strong className="text-slate-200">{otherExpenses.toLocaleString('fr-FR')} F</strong>
              </div>
            </div>
          </div>

          {/* FCR Widget */}
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-semibold uppercase text-slate-400 flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5" />
                  Indice de Consommation (IC / FCR)
                </span>
                <h4 className="text-xl font-bold text-white mt-0.5">
                  {metrics.feedConversionRatio}{' '}
                  <span className="text-xs font-normal text-slate-400">kg aliment / kg vif</span>
                </h4>
              </div>
              <span className="text-xs px-2.5 py-1 rounded-md bg-slate-800 text-slate-200 border border-slate-700">
                {metrics.feedConversionRatio <= 1.7
                  ? 'Optimal'
                  : metrics.feedConversionRatio <= 1.9
                  ? 'Moyen'
                  : 'Élevé'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Aliment total distribué : {metrics.totalFeedKgConsumed} kg ({metrics.totalFeedBagsConsumed} sacs).
            </p>
          </div>
        </div>
      ) : (
        /* DAILY LOG HISTORY LIST */
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs px-1">
            <span className="font-semibold text-slate-400 uppercase">
              Historique Journalier
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={onOpenMortality}
                className="text-xs text-slate-300 hover:text-white"
              >
                + Mortalité
              </button>
              <span>•</span>
              <button
                onClick={onOpenFeed}
                className="text-xs text-slate-300 hover:text-white"
              >
                + Aliment
              </button>
            </div>
          </div>

          {batchLogs.length === 0 ? (
            <div className="p-6 text-center text-slate-500 rounded-xl bg-slate-900 border border-slate-800">
              Aucune saisie pour ce lot.
            </div>
          ) : (
            batchLogs.map((log) => (
              <div
                key={log.id}
                className="p-3 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between gap-3 text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-slate-950 border border-slate-800 flex flex-col items-center justify-center font-bold text-white shrink-0">
                    <span className="text-[9px] text-slate-400 leading-none">J</span>
                    <span className="text-xs leading-none mt-0.5">{log.dayNumber}</span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-slate-400 text-[11px]">{log.date}</span>
                      {log.mortality > 0 && (
                        <span className="text-[10px] text-slate-300 bg-slate-800 px-1.5 py-0.2 rounded">
                          {log.mortality} mort{log.mortality > 1 ? 's' : ''}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 text-slate-300 text-[11px]">
                      {log.feedConsumedKg > 0 && (
                        <span>
                          {log.feedConsumedBags} sac ({log.feedConsumedKg} kg)
                        </span>
                      )}
                      {log.waterIntakeLiters > 0 && (
                        <span>{log.waterIntakeLiters} L</span>
                      )}
                    </div>
                  </div>
                </div>

                {log.averageWeightGrams && (
                  <div className="text-right shrink-0">
                    <span className="text-[10px] text-slate-400 block">Pesée</span>
                    <strong className="text-white font-mono">{log.averageWeightGrams} g</strong>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
