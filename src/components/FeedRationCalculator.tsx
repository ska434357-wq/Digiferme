import React, { useState, useEffect } from 'react';
import {
  Calculator,
  Minus,
  Plus,
  RotateCcw,
  Volume2,
  Droplets,
  AlertTriangle,
  Wheat,
} from 'lucide-react';
import { usePoultryStore } from '../store/usePoultryStore';
import { calculateBatchMetrics } from '../utils/formatters';
import { calculateDailyFeedRation } from '../utils/feedCalculator';
import { speakMessage } from '../utils/audioSpeech';
import { FeedType } from '../types';

interface FeedRationCalculatorProps {
  onOpenRestockForPhase?: (phase: FeedType) => void;
}

export const FeedRationCalculator: React.FC<FeedRationCalculatorProps> = ({
  onOpenRestockForPhase,
}) => {
  const activeBatchId = usePoultryStore((state) => state.activeBatchId);
  const batches = usePoultryStore((state) => state.batches);
  const dailyLogs = usePoultryStore((state) => state.dailyLogs);
  const cashFlow = usePoultryStore((state) => state.cashFlow);
  const feedStock = usePoultryStore((state) => state.feedStock);
  const currentTemp = usePoultryStore((state) => state.currentSimulatedTemp);

  const activeBatch = batches.find((b) => b.id === activeBatchId) || batches[0];
  const metrics = calculateBatchMetrics(activeBatch, dailyLogs, cashFlow, currentTemp);

  const defaultAge = activeBatch ? Math.max(1, metrics.ageInDays) : 14;
  const defaultBirds = activeBatch ? Math.max(0, metrics.birdsAlive) : 300;

  const [ageDays, setAgeDays] = useState<number>(defaultAge);
  const [birdsCount, setBirdsCount] = useState<number>(defaultBirds);
  const [isCustomSimulation, setIsCustomSimulation] = useState<boolean>(false);

  // Sync automatically when active batch changes unless user manually adjusted values
  useEffect(() => {
    if (!isCustomSimulation) {
      setAgeDays(defaultAge);
      setBirdsCount(defaultBirds);
    }
  }, [activeBatch?.id, defaultAge, defaultBirds, isCustomSimulation]);

  const ration = calculateDailyFeedRation(ageDays, birdsCount, feedStock, currentTemp);

  const handleSyncActiveBatch = () => {
    setAgeDays(defaultAge);
    setBirdsCount(defaultBirds);
    setIsCustomSimulation(false);
  };

  const handleSpeakRation = () => {
    const typeName =
      ration.phase === 'demarrage'
        ? 'Démarrage'
        : ration.phase === 'croissance'
        ? 'Croissance'
        : 'Finition';
    speakMessage(
      `Pour ${ration.birdsCount} poulets au jour ${ration.ageInDays}, il faut ${ration.totalKgPerDay} kilos d'aliment ${typeName} aujourd'hui, soit environ ${ration.totalBagsPerDay} sac de 50 kilos, et ${ration.recommendedWaterLiters} litres d'eau.`
    );
  };

  const isLowAutonomy = ration.stockAutonomyDays !== null && ration.stockAutonomyDays <= 2;

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 text-emerald-400 flex items-center justify-center shrink-0">
            <Calculator className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-white leading-tight">
              Calculateur de Ration / Jour
            </h3>
            <p className="text-[11px] text-slate-400">
              Courbe standard poulet de chair ({ration.phaseLabel})
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleSpeakRation}
            title="Écouter la ration"
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition"
          >
            <Volume2 className="w-3.5 h-3.5" />
          </button>
          {isCustomSimulation && activeBatch && (
            <button
              type="button"
              onClick={handleSyncActiveBatch}
              title="Revenir aux valeurs du lot actif"
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-[11px] text-emerald-400 border border-slate-700 flex items-center gap-1 transition"
            >
              <RotateCcw className="w-3 h-3" />
              Lot
            </button>
          )}
        </div>
      </div>

      {/* Inputs: Age & Bird Count */}
      <div className="grid grid-cols-2 gap-2">
        {/* Age Input */}
        <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
          <span className="text-[10px] uppercase font-semibold text-slate-400 block">
            Âge du lot (Jours)
          </span>
          <div className="flex items-center justify-between gap-1">
            <button
              type="button"
              onClick={() => {
                setIsCustomSimulation(true);
                setAgeDays((d) => Math.max(1, d - 1));
              }}
              className="w-7 h-7 rounded-md bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center shrink-0"
              aria-label="Diminuer l'âge"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <input
              type="number"
              min={1}
              max={56}
              value={ageDays}
              onChange={(e) => {
                setIsCustomSimulation(true);
                const val = parseInt(e.target.value, 10);
                setAgeDays(Number.isFinite(val) ? Math.max(1, Math.min(56, val)) : 1);
              }}
              className="w-full text-center bg-transparent text-white font-bold text-sm focus:outline-none"
            />
            <button
              type="button"
              onClick={() => {
                setIsCustomSimulation(true);
                setAgeDays((d) => Math.min(56, d + 1));
              }}
              className="w-7 h-7 rounded-md bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center shrink-0"
              aria-label="Augmenter l'âge"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <span className="text-[10px] text-slate-500 block text-center">
            Poids cible : {ration.expectedWeightGrams} g/sujet
          </span>
        </div>

        {/* Birds Count Input */}
        <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 space-y-1.5">
          <span className="text-[10px] uppercase font-semibold text-slate-400 block">
            Nombre de poulets
          </span>
          <div className="flex items-center justify-between gap-1">
            <button
              type="button"
              onClick={() => {
                setIsCustomSimulation(true);
                setBirdsCount((b) => Math.max(0, b - 25));
              }}
              className="w-7 h-7 rounded-md bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center shrink-0"
              aria-label="Retirer 25 poulets"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <input
              type="number"
              min={0}
              max={100000}
              value={birdsCount}
              onChange={(e) => {
                setIsCustomSimulation(true);
                const val = parseInt(e.target.value, 10);
                setBirdsCount(Number.isFinite(val) ? Math.max(0, val) : 0);
              }}
              className="w-full text-center bg-transparent text-white font-bold text-sm focus:outline-none"
            />
            <button
              type="button"
              onClick={() => {
                setIsCustomSimulation(true);
                setBirdsCount((b) => b + 25);
              }}
              className="w-7 h-7 rounded-md bg-slate-800 hover:bg-slate-700 text-white flex items-center justify-center shrink-0"
              aria-label="Ajouter 25 poulets"
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <span className="text-[10px] text-slate-500 block text-center">
            Norme : {ration.gramsPerBird} g / poulet / j
          </span>
        </div>
      </div>

      {/* Main Ration Result */}
      <div className="rounded-xl bg-slate-950 border border-slate-800 p-3.5 space-y-2.5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <span className="text-[10px] uppercase font-semibold text-emerald-400 flex items-center gap-1">
              <Wheat className="w-3 h-3" />
              Besoin Journalier Recommandé
            </span>
            <div className="flex items-baseline gap-2 mt-0.5">
              <span className="text-2xl font-extrabold text-white">
                {ration.totalKgPerDay.toLocaleString('fr-FR')} kg
              </span>
              <span className="text-xs font-semibold text-slate-300">
                / jour ({ration.totalBagsPerDay} sac{ration.totalBagsPerDay > 1 ? 's' : ''} de 50 kg)
              </span>
            </div>
          </div>

          <div className="text-right shrink-0">
            <span className="text-[10px] text-slate-400 block">Coût / jour</span>
            <strong className="text-xs text-white">
              {ration.dailyFeedCostFCFA.toLocaleString('fr-FR')} F
            </strong>
          </div>
        </div>

        {/* 7-day projection & Water need */}
        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-[11px]">Prévision 7 jours :</span>
            <strong className="text-slate-200">
              {ration.bagsFor7Days} sacs ({ration.kgFor7Days} kg)
            </strong>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-slate-400 text-[11px] flex items-center gap-1">
              <Droplets className="w-3 h-3 text-slate-400" /> Eau :
            </span>
            <strong className="text-slate-200">{ration.recommendedWaterLiters} L / j</strong>
          </div>
        </div>
      </div>

      {/* Stock Autonomy Alert Bar */}
      <div
        className={`rounded-lg border px-3 py-2 flex items-center justify-between gap-2 text-xs ${
          isLowAutonomy
            ? 'bg-amber-950/40 border-amber-700/60 text-amber-300'
            : 'bg-slate-950 border-slate-800 text-slate-300'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {isLowAutonomy && <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />}
          <span className="truncate">
            {ration.stockAutonomyDays === null
              ? `Stock ${ration.phase} : ${ration.stockBagsAvailable} sac(s)`
              : `Autonomie stock (${ration.phase}) : ${ration.stockAutonomyDays} jour${
                  ration.stockAutonomyDays > 1 ? 's' : ''
                } (${ration.stockBagsAvailable} sac${ration.stockBagsAvailable > 1 ? 's' : ''})`}
          </span>
        </div>

        {onOpenRestockForPhase && isLowAutonomy && (
          <button
            type="button"
            onClick={() => onOpenRestockForPhase(ration.phase)}
            className="px-2.5 py-1 rounded-md bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-[11px] shrink-0 transition"
          >
            + Réappro
          </button>
        )}
      </div>
    </div>
  );
};
