import React, { useState } from 'react';
import { usePoultryStore } from '../../store/usePoultryStore';
import { X, Plus, Minus, Check } from 'lucide-react';
import { speakMessage } from '../../utils/audioSpeech';
import { calculateBatchMetrics } from '../../utils/formatters';

interface LogMortalityModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LogMortalityModal: React.FC<LogMortalityModalProps> = ({ isOpen, onClose }) => {
  const activeBatchId = usePoultryStore((state) => state.activeBatchId);
  const batches = usePoultryStore((state) => state.batches);
  const dailyLogs = usePoultryStore((state) => state.dailyLogs);
  const cashFlow = usePoultryStore((state) => state.cashFlow);
  const currentTemp = usePoultryStore((state) => state.currentSimulatedTemp);
  const addDailyLog = usePoultryStore((state) => state.addDailyLog);
  const isAudioEnabled = usePoultryStore((state) => state.isAudioEnabled);

  const activeBatch = batches.find((b) => b.id === activeBatchId) || batches[0];
  const metrics = calculateBatchMetrics(activeBatch, dailyLogs, cashFlow, currentTemp);

  const [count, setCount] = useState<number>(1);
  const [cause, setCause] = useState<string>('Chaleur / Coup de chaud');
  const [errorMsg, setErrorMsg] = useState<string>('');

  if (!isOpen || !activeBatch) return null;

  const causes = [
    { label: 'Chaleur / Coup de chaud', icon: '☀️' },
    { label: 'Étouffement / Écrasement', icon: '🦶' },
    { label: 'Faiblesse / Chétif', icon: '🐥' },
    { label: 'Diarrhée / Fientes anormales', icon: '💩' },
    { label: 'Cause inconnue', icon: '❓' },
  ];

  const handleIncrement = (amount: number) => {
    setCount((prev) => Math.max(0, Math.min(metrics.birdsAlive, prev + amount)));
  };

  const handleSave = () => {
    if (count <= 0) {
      setErrorMsg('Veuillez indiquer au moins 1 sujet.');
      return;
    }
    setErrorMsg('');

    addDailyLog({
      batchId: activeBatch.id,
      dayNumber: metrics.ageInDays,
      date: new Date().toISOString().split('T')[0],
      mortality: count,
      mortalityCause: cause,
      feedConsumedBags: 0,
      feedConsumedKg: 0,
      feedType: metrics.ageInDays <= 14 ? 'demarrage' : metrics.ageInDays <= 28 ? 'croissance' : 'finition',
      waterIntakeLiters: 0,
      symptoms: cause === 'Diarrhée / Fientes anormales' ? ['Diarrhée'] : [],
    });

    if (isAudioEnabled) {
      speakMessage(`${count} mortalité enregistrée. Restants : ${metrics.birdsAlive - count} poulets.`);
    }

    onClose();
  };

  const birdsRemaining = Math.max(0, metrics.birdsAlive - count);
  const newMortalityPercent = parseFloat(
    (((metrics.totalMortality + count) / activeBatch.initialChicks) * 100).toFixed(1)
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 p-0 sm:p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-2xl text-slate-100">
        {/* Modal Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div>
            <h3 className="font-bold text-base text-white">Noter une Mortalité</h3>
            <p className="text-xs text-slate-400">
              {activeBatch.name} • Jour {metrics.ageInDays}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Counter Stepper */}
        <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 text-center my-3">
          <p className="text-xs font-semibold uppercase text-slate-400 mb-2">
            Nombre de sujets perdus
          </p>

          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => handleIncrement(-1)}
              disabled={count <= 1}
              className="w-11 h-11 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center text-xl font-bold disabled:opacity-40 transition"
            >
              <Minus className="w-5 h-5" />
            </button>

            <div className="w-20 text-center">
              <span className="text-4xl font-extrabold text-white">
                {count}
              </span>
              <span className="block text-[11px] text-slate-400">
                sujet{count > 1 ? 's' : ''}
              </span>
            </div>

            <button
              onClick={() => handleIncrement(1)}
              className="w-11 h-11 rounded-lg bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 flex items-center justify-center text-xl font-bold transition"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          {/* Quick presets */}
          <div className="flex items-center justify-center gap-1.5 mt-3 pt-2.5 border-t border-slate-800">
            {[1, 2, 5, 10].map((num) => (
              <button
                key={num}
                onClick={() => setCount(num)}
                className={`px-3 py-1 rounded-md text-xs font-semibold transition ${
                  count === num
                    ? 'bg-slate-700 text-white'
                    : 'bg-slate-900 text-slate-400 hover:text-white'
                }`}
              >
                +{num}
              </button>
            ))}
          </div>
        </div>

        {/* Cause Selection */}
        <div className="space-y-1.5 mt-3">
          <label className="text-xs font-semibold text-slate-400">
            Cause observée :
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {causes.map((c) => (
              <button
                key={c.label}
                type="button"
                onClick={() => setCause(c.label)}
                className={`p-2 rounded-lg text-xs text-left flex items-center gap-2 border transition ${
                  cause === c.label
                    ? 'bg-slate-800 border-slate-600 text-white font-medium'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>{c.icon}</span>
                <span className="truncate text-[11px]">{c.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Summary info */}
        <div className="mt-3.5 p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs flex items-center justify-between text-slate-300">
          <span>Poulets restants : <strong className="text-white">{birdsRemaining}</strong></span>
          <span>Nouveau taux : <strong>{newMortalityPercent}%</strong></span>
        </div>

        {errorMsg && (
          <div className="mt-3 p-2 rounded-lg bg-red-950/50 border border-red-800/60 text-xs text-red-300 text-center">
            {errorMsg}
          </div>
        )}

        {/* Action button */}
        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            className="flex-2 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition"
          >
            <Check className="w-4 h-4" />
            Enregistrer
          </button>
        </div>
      </div>
    </div>
  );
};
