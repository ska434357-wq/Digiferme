import React, { useState } from 'react';
import { usePoultryStore } from '../store/usePoultryStore';
import { Sun, Droplets, Clock, Volume2, CheckCircle2, ChevronRight } from 'lucide-react';
import { speakMessage } from '../utils/audioSpeech';

export const HeatAlertWidget: React.FC = () => {
  const currentTemp = usePoultryStore((state) => state.currentSimulatedTemp);
  const setSimulatedTemp = usePoultryStore((state) => state.setSimulatedTemp);
  const country = usePoultryStore((state) => state.country);

  const [vitamineCDone, setVitamineCDone] = useState(false);
  const [showTempControls, setShowTempControls] = useState(false);

  const isHighHeat = currentTemp >= 35;

  const countryLocations: Record<string, string> = {
    CI: 'Bouaké / Korhogo (Côte d\'Ivoire)',
    SN: 'Thiès / Kaolack (Sénégal)',
    BF: 'Bobo-Dioulasso (Burkina)',
    ML: 'Sikasso (Mali)',
  };

  const handleAudioListen = () => {
    let message = '';
    if (isHighHeat) {
      message = `Alerte chaleur à ${currentTemp} degrés. Arrêter l'aliment sec entre 11h et 16h. Ajouter de la vitamine C dans l'eau fraîche.`;
    } else {
      message = `Température actuelle au poulailler : ${currentTemp} degrés. Aération normale.`;
    }
    speakMessage(message);
  };

  const handleVitamineCToggle = () => {
    setVitamineCDone(!vitamineCDone);
    if (!vitamineCDone) {
      speakMessage('Distribution de vitamine C enregistrée.');
    }
  };

  return (
    <div
      className={`rounded-2xl border p-4 ${
        isHighHeat ? 'bg-slate-900 border-amber-500/40' : 'bg-slate-900 border-slate-800'
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center shrink-0">
            <Sun className="w-4 h-4 text-amber-500" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-bold text-sm text-white">
                {isHighHeat ? 'Alerte Chaleur Tropicale' : 'Climat du Poulailler'}
              </h3>
              <span className="text-[11px] font-semibold text-slate-300 bg-slate-800 px-2 py-0.5 rounded">
                {currentTemp}°C
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {countryLocations[country] || 'Afrique de l\'Ouest'}
            </p>
          </div>
        </div>

        <button
          onClick={handleAudioListen}
          title="Écouter"
          className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition"
        >
          <Volume2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Advisory card */}
      {isHighHeat && (
        <div className="mt-3 space-y-2">
          <div className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300">
            <div className="flex items-center gap-1.5 font-semibold text-slate-200 mb-1">
              <Clock className="w-3.5 h-3.5 text-slate-400" />
              <span>Arrêt aliment sec : 11h00 — 16h00</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-snug">
              Retirer les mangeoires aux heures de pointe pour éviter l'étouffement métabolique.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleVitamineCToggle}
              className={`p-2.5 rounded-xl border text-xs font-medium flex items-center justify-between transition ${
                vitamineCDone
                  ? 'bg-slate-800 border-slate-700 text-slate-200'
                  : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <Droplets className="w-3.5 h-3.5 text-slate-400" />
                <span>Vitamine C</span>
              </div>
              <CheckCircle2
                className={`w-3.5 h-3.5 ${vitamineCDone ? 'text-emerald-500' : 'text-slate-600'}`}
              />
            </button>

            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 flex items-center gap-1.5">
              <span>💧 Mouiller toiture</span>
            </div>
          </div>
        </div>
      )}

      {/* Controls toggle */}
      <div className="mt-2.5 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
        <button
          onClick={() => setShowTempControls(!showTempControls)}
          className="hover:text-slate-200 flex items-center gap-1"
        >
          <span>Simuler température</span>
          <ChevronRight
            className={`w-3 h-3 transform transition-transform ${showTempControls ? 'rotate-90' : ''}`}
          />
        </button>
        <span className="text-[10px] text-slate-500">Capteur / Prévision</span>
      </div>

      {showTempControls && (
        <div className="mt-2 p-2.5 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
          <input
            type="range"
            min="26"
            max="42"
            value={currentTemp}
            onChange={(e) => setSimulatedTemp(parseInt(e.target.value, 10))}
            className="w-full accent-slate-400 cursor-pointer h-1.5 bg-slate-800 rounded"
          />
          <div className="flex justify-between gap-1 text-[10px]">
            <button
              onClick={() => setSimulatedTemp(28)}
              className="px-2 py-1 rounded bg-slate-800 text-slate-300"
            >
              28°C Matin
            </button>
            <button
              onClick={() => setSimulatedTemp(33)}
              className="px-2 py-1 rounded bg-slate-800 text-slate-300"
            >
              33°C Midi
            </button>
            <button
              onClick={() => setSimulatedTemp(38)}
              className="px-2 py-1 rounded bg-slate-800 text-slate-200 font-bold"
            >
              38°C Alerte
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
