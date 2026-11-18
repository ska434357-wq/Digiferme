import React from 'react';
import { BatchMetrics } from '../utils/formatters';
import { ShieldCheck, AlertTriangle, AlertOctagon, Volume2 } from 'lucide-react';
import { speakMessage } from '../utils/audioSpeech';

interface HealthScoreBadgeProps {
  metrics: BatchMetrics;
}

export const HealthScoreBadge: React.FC<HealthScoreBadgeProps> = ({ metrics }) => {
  const {
    healthScore,
    healthStatus,
    healthStatusLabel,
    healthDiagnostic,
    mortalityRatePercent,
    birdsAlive,
    initialChicks,
  } = metrics;

  const statusConfig = {
    green: {
      ringColor: '#16a34a', // emerald-600
      badgeColor: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      icon: ShieldCheck,
    },
    orange: {
      ringColor: '#d97706', // amber-600
      badgeColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      icon: AlertTriangle,
    },
    red: {
      ringColor: '#dc2626', // red-600
      badgeColor: 'text-red-400 bg-red-500/10 border-red-500/20',
      icon: AlertOctagon,
    },
  }[healthStatus];

  const Icon = statusConfig.icon;

  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (healthScore / 100) * circumference;

  const handleAudioListen = () => {
    const text = `Score de santé du lot : ${healthScore} sur 100. Statut : ${healthStatusLabel}. ${healthDiagnostic} Il reste ${birdsAlive} poulets vivants sur ${initialChicks}. Taux de mortalité de ${mortalityRatePercent} pour cent.`;
    speakMessage(text);
  };

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900 p-4">
      <div className="flex items-center justify-between gap-3">
        {/* Left: Gauge Circle */}
        <div className="relative flex items-center justify-center shrink-0">
          <svg className="w-20 h-20 -rotate-90 transform" viewBox="0 0 96 96">
            <circle
              cx="48"
              cy="48"
              r={radius}
              stroke="currentColor"
              strokeWidth="6"
              fill="transparent"
              className="text-slate-800"
            />
            <circle
              cx="48"
              cy="48"
              r={radius}
              stroke={statusConfig.ringColor}
              strokeWidth="6"
              strokeDasharray={circumference}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              fill="transparent"
              className="transition-all duration-700 ease-out"
            />
          </svg>

          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-xl font-bold text-white tracking-tight">
              {healthScore}%
            </span>
            <span className="text-[9px] uppercase font-semibold text-slate-400">
              Santé
            </span>
          </div>
        </div>

        {/* Right: Diagnosis & Details */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-1 mb-1">
            <span
              className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-semibold border ${statusConfig.badgeColor}`}
            >
              <Icon className="w-3.5 h-3.5 shrink-0" />
              {healthStatusLabel}
            </span>

            <button
              onClick={handleAudioListen}
              title="Écouter le bilan"
              className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition"
            >
              <Volume2 className="w-3.5 h-3.5" />
            </button>
          </div>

          <p className="text-xs text-slate-300 leading-snug line-clamp-2 mt-1">
            {healthDiagnostic}
          </p>

          <div className="flex items-center gap-3 mt-2 text-[11px] text-slate-400 border-t border-slate-800/80 pt-1.5">
            <div>
              <span className="text-slate-200 font-semibold">{birdsAlive}</span> / {initialChicks} vivants
            </div>
            <div>•</div>
            <div>
              Mortalité : <span className="font-semibold text-slate-200">{mortalityRatePercent}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
