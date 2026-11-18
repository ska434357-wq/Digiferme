import React, { useState } from 'react';
import { usePoultryStore } from '../../store/usePoultryStore';
import { X, Wheat, Check, Plus, Minus } from 'lucide-react';
import { speakMessage } from '../../utils/audioSpeech';
import { calculateBatchMetrics } from '../../utils/formatters';

interface LogFeedModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LogFeedModal: React.FC<LogFeedModalProps> = ({ isOpen, onClose }) => {
  const activeBatchId = usePoultryStore((state) => state.activeBatchId);
  const batches = usePoultryStore((state) => state.batches);
  const dailyLogs = usePoultryStore((state) => state.dailyLogs);
  const cashFlow = usePoultryStore((state) => state.cashFlow);
  const feedStock = usePoultryStore((state) => state.feedStock);
  const currentTemp = usePoultryStore((state) => state.currentSimulatedTemp);
  const addDailyLog = usePoultryStore((state) => state.addDailyLog);
  const isAudioEnabled = usePoultryStore((state) => state.isAudioEnabled);

  const activeBatch = batches.find((b) => b.id === activeBatchId) || batches[0];
  const metrics = calculateBatchMetrics(activeBatch, dailyLogs, cashFlow, currentTemp);

  const defaultFeedType =
    metrics.ageInDays <= 14 ? 'demarrage' : metrics.ageInDays <= 28 ? 'croissance' : 'finition';

  const [feedType, setFeedType] = useState<'demarrage' | 'croissance' | 'finition'>(defaultFeedType);
  const [bags, setBags] = useState<number>(1);
  const [waterLiters, setWaterLiters] = useState<number>(120);
  const [errorMsg, setErrorMsg] = useState<string>('');

  if (!isOpen || !activeBatch) return null;

  const availableBags =
    feedType === 'demarrage'
      ? feedStock.demarrageBags
      : feedType === 'croissance'
      ? feedStock.croissanceBags
      : feedStock.finitionBags;

  const handleSave = () => {
    if (bags <= 0) {
      setErrorMsg('Veuillez spécifier une quantité valide.');
      return;
    }
    setErrorMsg('');

    const totalKg = bags * 50;

    addDailyLog({
      batchId: activeBatch.id,
      dayNumber: metrics.ageInDays,
      date: new Date().toISOString().split('T')[0],
      mortality: 0,
      feedConsumedBags: bags,
      feedConsumedKg: totalKg,
      feedType,
      waterIntakeLiters: waterLiters,
      symptoms: [],
    });

    if (isAudioEnabled) {
      speakMessage(`${bags} sac d'aliment enregistré.`);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 p-0 sm:p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-2xl text-slate-100">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div>
            <h3 className="font-bold text-base text-white">Noter l'Aliment</h3>
            <p className="text-xs text-slate-400">
              {activeBatch.name} • Jour {metrics.ageInDays}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Phase Selector */}
        <div className="space-y-1.5 mb-3">
          <label className="text-xs font-semibold text-slate-400">Type d'aliment :</label>
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { type: 'demarrage', label: 'Démarrage', sub: 'J1-14' },
              { type: 'croissance', label: 'Croissance', sub: 'J15-28' },
              { type: 'finition', label: 'Finition', sub: 'J29-42' },
            ].map((item) => (
              <button
                key={item.type}
                type="button"
                onClick={() => setFeedType(item.type as any)}
                className={`p-2 rounded-lg text-center border transition ${
                  feedType === item.type
                    ? 'bg-slate-800 border-slate-600 text-white font-semibold'
                    : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                <div className="text-xs">{item.label}</div>
                <div className="text-[10px] text-slate-500">{item.sub}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Stepper */}
        <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 text-center my-3">
          <p className="text-xs font-semibold uppercase text-slate-400 mb-2">
            Sacs distribués (50 kg / sac)
          </p>

          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => setBags((b) => Math.max(0.5, parseFloat((b - 0.5).toFixed(1))))}
              disabled={bags <= 0.5}
              className="w-11 h-11 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 flex items-center justify-center text-xl font-bold disabled:opacity-40 transition"
            >
              <Minus className="w-5 h-5" />
            </button>

            <div className="w-24 text-center">
              <span className="text-3xl font-extrabold text-white">
                {bags}
              </span>
              <span className="block text-[11px] text-slate-400">
                sac{bags > 1 ? 's' : ''} ({bags * 50} kg)
              </span>
            </div>

            <button
              onClick={() => setBags((b) => parseFloat((b + 0.5).toFixed(1)))}
              className="w-11 h-11 rounded-lg bg-slate-800 hover:bg-slate-700 text-white border border-slate-700 flex items-center justify-center text-xl font-bold transition"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>

          <div className="flex items-center justify-center gap-1.5 mt-3 pt-2.5 border-t border-slate-800">
            {[0.5, 1, 1.5, 2, 3].map((val) => (
              <button
                key={val}
                onClick={() => setBags(val)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition ${
                  bags === val ? 'bg-slate-700 text-white' : 'bg-slate-900 text-slate-400'
                }`}
              >
                {val}
              </button>
            ))}
          </div>
        </div>

        {/* Water Intake */}
        <div className="bg-slate-950 rounded-xl border border-slate-800 p-3 mb-3">
          <div className="flex items-center justify-between mb-1.5 text-xs text-slate-300">
            <span>Eau distribuée :</span>
            <span className="font-semibold">{waterLiters} Litres</span>
          </div>
          <input
            type="range"
            min="20"
            max="300"
            step="10"
            value={waterLiters}
            onChange={(e) => setWaterLiters(parseInt(e.target.value, 10))}
            className="w-full accent-slate-400 cursor-pointer h-1.5 bg-slate-800 rounded"
          />
        </div>

        {/* Stock status indicator */}
        <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs flex items-center justify-between text-slate-400">
          <span>Stock magasin :</span>
          <span className="text-slate-200">
            {availableBags} sacs (Restants : {Math.max(0, availableBags - bags)})
          </span>
        </div>

        {errorMsg && (
          <div className="mt-3 p-2 rounded-lg bg-red-950/50 border border-red-800/60 text-xs text-red-300 text-center">
            {errorMsg}
          </div>
        )}

        {/* Action Buttons */}
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
