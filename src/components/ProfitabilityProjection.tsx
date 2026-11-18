import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Plus,
  RotateCcw,
  Volume2,
  Scale,
  AlertTriangle,
  CheckCircle2,
  Coins,
} from 'lucide-react';
import { usePoultryStore } from '../store/usePoultryStore';
import {
  calculateEndCycleProfitability,
  getDefaultMarketPricePerKg,
} from '../utils/profitabilityCalculator';
import { speakMessage } from '../utils/audioSpeech';

interface ProfitabilityProjectionProps {
  onOpenFinanceModal?: () => void;
}

export const ProfitabilityProjection: React.FC<ProfitabilityProjectionProps> = ({
  onOpenFinanceModal,
}) => {
  const activeBatchId = usePoultryStore((state) => state.activeBatchId);
  const batches = usePoultryStore((state) => state.batches);
  const dailyLogs = usePoultryStore((state) => state.dailyLogs);
  const cashFlow = usePoultryStore((state) => state.cashFlow);
  const feedStock = usePoultryStore((state) => state.feedStock);
  const country = usePoultryStore((state) => state.country);

  const activeBatch = batches.find((b) => b.id === activeBatchId) || batches[0];

  const defaultMarketPrice = getDefaultMarketPricePerKg(country);
  const defaultTargetDay = activeBatch?.targetHarvestDay || 42;

  const [marketPricePerKg, setMarketPricePerKg] = useState<number>(defaultMarketPrice);
  const [targetHarvestDay, setTargetHarvestDay] = useState<number>(defaultTargetDay);
  const [customWeightKg, setCustomWeightKg] = useState<number | null>(null);
  const [isModified, setIsModified] = useState<boolean>(false);

  // Sync defaults when switching active batch or country unless manually adjusted
  useEffect(() => {
    if (!isModified) {
      setMarketPricePerKg(defaultMarketPrice);
      setTargetHarvestDay(defaultTargetDay);
      setCustomWeightKg(null);
    }
  }, [activeBatch?.id, defaultMarketPrice, defaultTargetDay, isModified]);

  const projection = calculateEndCycleProfitability({
    batch: activeBatch,
    dailyLogs,
    cashFlow,
    feedStock,
    country,
    marketPricePerKgFCFA: marketPricePerKg,
    targetHarvestDay,
    customWeightKgPerBird: customWeightKg,
  });

  const handleResetDefaults = () => {
    setMarketPricePerKg(defaultMarketPrice);
    setTargetHarvestDay(defaultTargetDay);
    setCustomWeightKg(null);
    setIsModified(false);
  };

  const handleSpeakProjection = () => {
    if (!projection.hasBatch) {
      speakMessage('Aucun lot actif. Créez un lot pour calculer la rentabilité en fin de cycle.');
      return;
    }
    const signLabel = projection.projectedNetProfitFCFA >= 0 ? 'bénéfice net estimé de' : 'perte estimée de';
    speakMessage(
      `Prévision à ${projection.targetHarvestDay} jours pour ${projection.birdsAlive} poulets à ${projection.projectedWeightKgPerBird} kilos chacun, vendus à ${projection.marketPricePerKgFCFA} francs le kilo. Recette prévue : ${projection.projectedGrossRevenueFCFA} francs. Coût total projeté dont aliment : ${projection.totalProjectedCostFCFA} francs. Soit un ${signLabel} ${Math.abs(projection.projectedNetProfitFCFA)} francs.`
    );
  };

  const statusStyles =
    projection.status === 'profitable'
      ? {
          box: 'bg-emerald-950/30 border-emerald-700/50',
          accent: 'text-emerald-400',
          badge: 'bg-emerald-950/60 border-emerald-700/60 text-emerald-400',
          label: 'Cycle Rentable',
          Icon: CheckCircle2,
        }
      : projection.status === 'tight'
      ? {
          box: 'bg-amber-950/30 border-amber-700/50',
          accent: 'text-amber-400',
          badge: 'bg-amber-950/60 border-amber-700/60 text-amber-400',
          label: 'Marge Serrée',
          Icon: AlertTriangle,
        }
      : {
          box: 'bg-red-950/30 border-red-700/50',
          accent: 'text-red-400',
          badge: 'bg-red-950/60 border-red-700/60 text-red-400',
          label: 'Risque de Perte',
          Icon: TrendingDown,
        };

  const StatusIcon = statusStyles.Icon;

  // Cost share bar percentages
  const costBase = Math.max(1, projection.totalProjectedCostFCFA);
  const enteredFeedPct = Math.round((projection.enteredFeedCostFCFA / costBase) * 100);
  const remainingFeedPct = Math.round((projection.remainingFeedCostToBuyFCFA / costBase) * 100);
  const otherCostPct = Math.max(0, 100 - enteredFeedPct - remainingFeedPct);

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 text-emerald-400 flex items-center justify-center shrink-0">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white leading-tight">
              Projection Rentabilité Fin de Cycle
            </h3>
            <p className="text-[11px] text-slate-400">
              Coûts d&apos;aliment saisis + cours du marché actuel ({country})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleSpeakProjection}
            title="Écouter la prévision"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
          >
            <Volume2 className="w-3.5 h-3.5" />
          </button>
          {isModified && (
            <button
              type="button"
              onClick={handleResetDefaults}
              title="Réinitialiser selon les données du lot"
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-emerald-400 border border-slate-700 flex items-center gap-1 transition"
            >
              <RotateCcw className="w-3 h-3" />
              Auto
            </button>
          )}
        </div>
      </div>

      {!projection.hasBatch ? (
        <div className="rounded-lg bg-slate-950 border border-slate-800 p-4 text-center text-xs text-slate-400">
          Créez un lot actif dans « Lots » pour projeter votre bénéfice en fin de cycle.
        </div>
      ) : (
        <>
          {/* Interactive Market & Harvest Inputs */}
          <div className="grid grid-cols-2 gap-2">
            {/* Market Price Input */}
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                Prix marché (F / kg vif)
              </span>
              <div className="flex items-center justify-between gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsModified(true);
                    setMarketPricePerKg((p) => Math.max(500, p - 50));
                  }}
                  className="w-7 h-7 rounded-md bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center shrink-0"
                  aria-label="Baisser le prix du kilo"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <input
                  type="number"
                  min={500}
                  max={5000}
                  step={50}
                  value={marketPricePerKg}
                  onChange={(e) => {
                    setIsModified(true);
                    const v = parseInt(e.target.value, 10);
                    setMarketPricePerKg(Number.isFinite(v) ? Math.max(0, v) : 0);
                  }}
                  className="w-full text-center bg-transparent text-white font-bold text-sm focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => {
                    setIsModified(true);
                    setMarketPricePerKg((p) => Math.min(5000, p + 50));
                  }}
                  className="w-7 h-7 rounded-md bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center shrink-0"
                  aria-label="Augmenter le prix du kilo"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <span className="text-[10px] text-slate-500 block text-center">
                ≈ {projection.projectedPricePerBirdFCFA.toLocaleString('fr-FR')} F / poulet
              </span>
            </div>

            {/* Target Harvest Day & Predicted Weight */}
            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
              <span className="text-[10px] uppercase font-semibold text-slate-400 block">
                Vente prévue (Jour)
              </span>
              <div className="flex items-center justify-between gap-1">
                <button
                  type="button"
                  onClick={() => {
                    setIsModified(true);
                    setTargetHarvestDay((d) =>
                      Math.max(Math.max(28, projection.currentAgeDays), d - 1)
                    );
                  }}
                  className="w-7 h-7 rounded-md bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center shrink-0"
                  aria-label="Avancer la date de vente"
                >
                  <Minus className="w-3.5 h-3.5" />
                </button>
                <span className="w-full text-center text-white font-bold text-sm">
                  J{projection.targetHarvestDay}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setIsModified(true);
                    setTargetHarvestDay((d) => Math.min(56, d + 1));
                  }}
                  className="w-7 h-7 rounded-md bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center shrink-0"
                  aria-label="Reculer la date de vente"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>
              <span className="text-[10px] text-slate-500 block text-center">
                {projection.daysRemaining === 0
                  ? 'Prêt à vendre'
                  : `Dans ${projection.daysRemaining} jour${projection.daysRemaining > 1 ? 's' : ''}`}
              </span>
            </div>
          </div>

          {/* Market Weight Forecast Strip */}
          <div className="rounded-lg bg-slate-950 border border-slate-800 px-3 py-2 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <Scale className="w-3.5 h-3.5 text-slate-400 shrink-0" />
              <div className="truncate">
                <span className="text-slate-400">Poids prévu J{projection.targetHarvestDay} : </span>
                <strong className="text-white">{projection.projectedWeightKgPerBird} kg</strong>
                <span className="text-slate-500 ml-1">
                  ({projection.totalProjectedBiomassKg.toLocaleString('fr-FR')} kg vif)
                </span>
              </div>
            </div>

            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsModified(true);
                  const current = customWeightKg ?? projection.projectedWeightKgPerBird;
                  setCustomWeightKg(Math.max(1.0, parseFloat((current - 0.1).toFixed(2))));
                }}
                className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center"
                title="Réduire poids prévu de 100g"
              >
                <Minus className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsModified(true);
                  const current = customWeightKg ?? projection.projectedWeightKgPerBird;
                  setCustomWeightKg(Math.min(4.0, parseFloat((current + 0.1).toFixed(2))));
                }}
                className="w-6 h-6 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center justify-center"
                title="Augmenter poids prévu de 100g"
              >
                <Plus className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Net Profit Hero Card */}
          <div className={`rounded-xl border p-3.5 space-y-2.5 ${statusStyles.box}`}>
            <div className="flex items-start justify-between gap-2">
              <div>
                <span className="text-[10px] uppercase font-semibold text-slate-400 flex items-center gap-1">
                  <Coins className="w-3 h-3" />
                  Bénéfice Net Projeté (Fin de cycle)
                </span>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className={`text-2xl font-extrabold ${statusStyles.accent}`}>
                    {projection.projectedNetProfitFCFA >= 0 ? '+' : ''}
                    {projection.projectedNetProfitFCFA.toLocaleString('fr-FR')} F
                  </span>
                </div>
              </div>

              <span
                className={`px-2 py-1 rounded-md border text-[10px] font-semibold flex items-center gap-1 shrink-0 ${statusStyles.badge}`}
              >
                <StatusIcon className="w-3 h-3" />
                {statusStyles.label}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/70 text-[11px]">
              <div>
                <span className="text-slate-400 block text-[10px]">Marge nette</span>
                <strong className="text-white">{projection.projectedMarginPercent}%</strong>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">Gain / poulet</span>
                <strong className={statusStyles.accent}>
                  {projection.projectedProfitPerBirdFCFA >= 0 ? '+' : ''}
                  {projection.projectedProfitPerBirdFCFA.toLocaleString('fr-FR')} F
                </strong>
              </div>
              <div className="text-right">
                <span className="text-slate-400 block text-[10px]">Seuil rentabilité</span>
                <strong className="text-white">
                  {projection.breakEvenPricePerKgFCFA.toLocaleString('fr-FR')} F/kg
                </strong>
              </div>
            </div>
          </div>

          {/* Revenue vs Combined Costs Breakdown */}
          <div className="rounded-xl bg-slate-950 border border-slate-800 p-3 space-y-2.5 text-xs">
            <div className="grid grid-cols-2 gap-2 pb-2 border-b border-slate-800">
              <div>
                <span className="text-[10px] text-slate-400 uppercase block">
                  Chiffre d&apos;affaires prévu
                </span>
                <strong className="text-sm text-emerald-400">
                  {projection.projectedGrossRevenueFCFA.toLocaleString('fr-FR')} F
                </strong>
                <span className="text-[10px] text-slate-500 block">
                  {projection.birdsAlive} sujets × {projection.projectedPricePerBirdFCFA.toLocaleString('fr-FR')} F
                </span>
              </div>

              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase block">
                  Coût total fin de cycle
                </span>
                <strong className="text-sm text-white">
                  {projection.totalProjectedCostFCFA.toLocaleString('fr-FR')} F
                </strong>
                <span className="text-[10px] text-slate-500 block">
                  Soit {projection.breakEvenCostPerBirdFCFA.toLocaleString('fr-FR')} F / poulet
                </span>
              </div>
            </div>

            {/* Cost Structure Bar */}
            <div className="space-y-1">
              <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden flex">
                {enteredFeedPct > 0 && (
                  <div
                    style={{ width: `${enteredFeedPct}%` }}
                    className="bg-emerald-500 h-full"
                    title="Aliment déjà saisi"
                  />
                )}
                {remainingFeedPct > 0 && (
                  <div
                    style={{ width: `${remainingFeedPct}%` }}
                    className="bg-amber-500 h-full"
                    title="Complément aliment à prévoir"
                  />
                )}
                {otherCostPct > 0 && (
                  <div
                    style={{ width: `${otherCostPct}%` }}
                    className="bg-slate-500 h-full"
                    title="Poussins & autres charges saisies"
                  />
                )}
              </div>
            </div>

            {/* Detailed Cost Lines */}
            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-center justify-between">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                  Coûts d&apos;aliment saisis (caisse)
                </span>
                <strong className="text-white">
                  {projection.enteredFeedCostFCFA.toLocaleString('fr-FR')} F
                </strong>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
                  Aliment restant à acheter ({projection.remainingFeedBagsToBuy} sacs)
                </span>
                <strong className="text-white">
                  {projection.remainingFeedCostToBuyFCFA.toLocaleString('fr-FR')} F
                </strong>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-300 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-500 inline-block" />
                  Poussins, vaccins & autres saisies
                </span>
                <strong className="text-white">
                  {projection.otherEnteredCostsFCFA.toLocaleString('fr-FR')} F
                </strong>
              </div>
            </div>

            {/* Helpful prompt if no feed costs entered yet in cashFlow */}
            {projection.enteredFeedCostFCFA === 0 && onOpenFinanceModal && (
              <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                <span className="text-[10px] text-amber-400">
                  Aucun achat d&apos;aliment saisi en caisse pour ce lot.
                </span>
                <button
                  type="button"
                  onClick={onOpenFinanceModal}
                  className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[10px] font-medium shrink-0"
                >
                  + Saisir achat
                </button>
              </div>
            )}

            {projection.hasRealWeighing && (
              <div className="pt-1 text-[10px] text-slate-400">
                Poids ajusté d&apos;après vos pesées réelles ({projection.growthIndexPercent >= 0 ? '+' : ''}
                {projection.growthIndexPercent}% vs courbe standard).
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
