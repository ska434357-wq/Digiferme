import React from 'react';
import { usePoultryStore } from '../../store/usePoultryStore';
import { calculateBatchMetrics } from '../../utils/formatters';
import {
  CheckCircle2,
  Share2,
  Volume2,
} from 'lucide-react';
import { speakMessage } from '../../utils/audioSpeech';

export const ProphylaxisTab: React.FC = () => {
  const activeBatchId = usePoultryStore((state) => state.activeBatchId);
  const batches = usePoultryStore((state) => state.batches);
  const dailyLogs = usePoultryStore((state) => state.dailyLogs);
  const cashFlow = usePoultryStore((state) => state.cashFlow);
  const currentTemp = usePoultryStore((state) => state.currentSimulatedTemp);
  const vaccineEvents = usePoultryStore((state) => state.vaccineEvents);
  const toggleVaccine = usePoultryStore((state) => state.toggleVaccine);
  const isAudioEnabled = usePoultryStore((state) => state.isAudioEnabled);

  const activeBatch = batches.find((b) => b.id === activeBatchId) || batches[0];
  const metrics = calculateBatchMetrics(activeBatch, dailyLogs, cashFlow, currentTemp);

  const vaxList = (activeBatch && vaccineEvents[activeBatch.id]) || [];

  const handleToggle = (vaccineId: string, name: string, isDone: boolean) => {
    if (!activeBatch) return;
    toggleVaccine(activeBatch.id, vaccineId);
    if (isAudioEnabled) {
      speakMessage(!isDone ? `Soin ${name} validé.` : `Statut ${name} réinitialisé.`);
    }
  };

  const handleListenTips = (vax: any) => {
    const text = `Soin pour ${vax.name} au jour ${vax.day}. Cible : ${vax.disease}. Conseil : ${vax.criticalTips}`;
    speakMessage(text);
  };

  const handleWhatsAppVetShare = () => {
    const doneCount = vaxList.filter((v) => v.completed).length;
    const text = `🩺 *FICHE SANITAIRE & VACCINS - FERMEFACILE*
Lot : ${activeBatch?.name} (${activeBatch?.breed})
Âge : Jour ${metrics.ageInDays} / 42 jours
Sujets vivants : ${metrics.birdsAlive} / ${metrics.initialChicks}
Mortalité : ${metrics.mortalityRatePercent}%
Température : ${currentTemp}°C

Statut : ${doneCount} / ${vaxList.length} validés
${vaxList
  .map(
    (v) =>
      `${v.completed ? '✅' : '⏳'} J${v.day} : ${v.name}`
  )
  .join('\n')}`;

    const encoded = encodeURIComponent(text);
    window.open(`https://wa.me/?text=${encoded}`, '_blank');
  };

  return (
    <div className="space-y-3.5 pb-24">
      {/* Header Banner */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400">
              Protocole Sanitaire
            </span>
            <h2 className="text-base font-bold text-white mt-0.5">Vaccins & Prophylaxie</h2>
            <p className="text-xs text-slate-400">
              Calendrier standard validé pour climat tropical ouest-africain.
            </p>
          </div>

          <button
            onClick={handleWhatsAppVetShare}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition shrink-0"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>WhatsApp</span>
          </button>
        </div>

        {/* 3 Simple Rules */}
        <div className="mt-3 pt-3 border-t border-slate-800 grid grid-cols-3 gap-1.5 text-[10px] text-center text-slate-400">
          <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
            <span className="block font-medium text-slate-200">💧 Soif 2h</span>
            <span>Couper l'eau avant</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
            <span className="block font-medium text-slate-200">🥛 Lait poudre</span>
            <span>Neutralise chlore</span>
          </div>
          <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
            <span className="block font-medium text-slate-200">🌅 Avant 8h</span>
            <span>À la fraîcheur</span>
          </div>
        </div>
      </div>

      {/* Vaccine list */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs px-1">
          <span className="font-semibold text-slate-400 uppercase">
            Calendrier Sanitaire
          </span>
          <span className="text-[11px] text-slate-400 font-medium">
            {vaxList.filter((v) => v.completed).length} / {vaxList.length} validés
          </span>
        </div>

        {vaxList.map((vax) => {
          const isUrgent = metrics.ageInDays >= vax.day && !vax.completed;

          return (
            <div
              key={vax.id}
              className={`rounded-xl border p-3 transition-all ${
                isUrgent
                  ? 'bg-slate-900 border-amber-600/50'
                  : 'bg-slate-900 border-slate-800'
              }`}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-slate-950 border border-slate-800 flex flex-col items-center justify-center font-bold shrink-0">
                    <span className="text-[9px] text-slate-400 leading-none">J</span>
                    <span className="text-sm text-slate-100 leading-none mt-0.5">
                      {vax.day}
                    </span>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-xs text-white">
                        {vax.name}
                      </h4>
                      {isUrgent && (
                        <span className="text-[10px] text-amber-400 font-medium">
                          • Prévu
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Cible : {vax.disease}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => handleListenTips(vax)}
                  title="Écouter"
                  className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition shrink-0"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <p className="mt-2 text-[11px] text-slate-400 leading-snug">
                {vax.criticalTips}
              </p>

              <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
                <span className="text-[11px] text-slate-500">
                  Eau de boisson
                </span>

                <button
                  onClick={() => handleToggle(vax.id, vax.name, vax.completed)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5 transition ${
                    vax.completed
                      ? 'bg-slate-800 text-slate-300 border border-slate-700'
                      : 'bg-emerald-700 hover:bg-emerald-600 text-white'
                  }`}
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  {vax.completed ? 'Fait' : 'Valider'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
