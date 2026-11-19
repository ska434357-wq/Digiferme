import React, { useState } from 'react';
import {
  Phone,
  MessageCircle,
  Lock,
  KeyRound,
  CheckCircle2,
  Volume2,
  ChevronDown,
  ChevronUp,
  Headset,
  LockKeyhole,
} from 'lucide-react';
import { usePoultryStore } from '../store/usePoultryStore';
import { ADVISOR_CONTACT } from '../types';
import { calculateBatchMetrics } from '../utils/formatters';
import { speakMessage } from '../utils/audioSpeech';

interface AdvisorContactCardProps {
  compact?: boolean;
  onNavigateToFull?: () => void;
}

const SITUATION_PRESETS = [
  'Mortalité anormale',
  'Symptômes / Fientes',
  'Coup de chaleur',
  'Aliment / Croissance',
  'Programme vaccinal',
  'Autre situation',
] as const;

export const AdvisorContactCard: React.FC<AdvisorContactCardProps> = ({
  compact = false,
  onNavigateToFull,
}) => {
  const currentUser = usePoultryStore((state) => state.currentUser);
  const batches = usePoultryStore((state) => state.batches);
  const activeBatchId = usePoultryStore((state) => state.activeBatchId);
  const dailyLogs = usePoultryStore((state) => state.dailyLogs);
  const cashFlow = usePoultryStore((state) => state.cashFlow);
  const currentTemp = usePoultryStore((state) => state.currentSimulatedTemp);
  const advisorUnlocked = usePoultryStore((state) => state.advisorUnlocked);
  const advisorUnlockCode = usePoultryStore((state) => state.advisorUnlockCode);
  const unlockAdvisorAccess = usePoultryStore((state) => state.unlockAdvisorAccess);
  const lockAdvisorAccess = usePoultryStore((state) => state.lockAdvisorAccess);

  const [codeInput, setCodeInput] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [isExpanded, setIsExpanded] = useState<boolean>(!compact);
  const [selectedSituation, setSelectedSituation] = useState<string>(SITUATION_PRESETS[0]);
  const [situationNotes, setSituationNotes] = useState<string>('');
  const [includeBatchStats, setIncludeBatchStats] = useState<boolean>(true);

  const activeBatch = batches.find((b) => b.id === activeBatchId) || batches[0];
  const metrics = calculateBatchMetrics(activeBatch, dailyLogs, cashFlow, currentTemp);

  const handleUnlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);
    try {
      const result = await unlockAdvisorAccess(codeInput);
      if (!result.ok) {
        setErrorMsg(result.error || 'Code Conseiller invalide.');
      } else {
        setCodeInput('');
        setIsExpanded(true);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const buildWhatsAppMessage = (): string => {
    const lines: string[] = [
      '🐔 *DEMANDE DE CONSEIL AVICOLE*',
      `Éleveur : ${currentUser?.farmerName || 'Éleveur'}`,
      `Ferme : ${currentUser?.farmName || 'Ma Ferme'}`,
      `Situation : ${selectedSituation}`,
    ];

    if (situationNotes.trim()) {
      lines.push(`Détails : ${situationNotes.trim()}`);
    }

    if (includeBatchStats && activeBatch) {
      lines.push(
        '',
        '📊 *Données du lot actif :*',
        `• Lot : ${activeBatch.name} (${activeBatch.breed})`,
        `• Âge : Jour ${metrics.ageInDays} / ${activeBatch.targetHarvestDay}`,
        `• Vivants : ${metrics.birdsAlive} / ${metrics.initialChicks}`,
        `• Mortalité : ${metrics.mortalityRatePercent}%`,
        `• Température poulailler : ${currentTemp}°C`
      );
    }

    lines.push('', 'Merci de votre orientation.');
    return lines.join('\n');
  };

  const whatsappUrl = `https://wa.me/${ADVISOR_CONTACT.whatsappDigits}?text=${encodeURIComponent(
    buildWhatsAppMessage()
  )}`;

  const handleSpeakAdvisorInfo = () => {
    if (!advisorUnlocked) {
      speakMessage(
        'Conseiller du domaine avicole. Entrez le code transmis par le Super Admin pour appeler ou écrire sur WhatsApp au conseiller.'
      );
    } else {
      speakMessage(
        `Conseiller du domaine disponible par appel ou WhatsApp au ${ADVISOR_CONTACT.phoneDisplay}.`
      );
    }
  };

  if (compact && !isExpanded) {
    return (
      <div className="rounded-xl bg-slate-900 border border-slate-800 p-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-emerald-700/20 border border-emerald-700/40 text-emerald-400 flex items-center justify-center shrink-0">
            <Headset className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <h5 className="font-semibold text-xs text-white truncate">
                Conseiller du Domaine
              </h5>
              {advisorUnlocked ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              ) : (
                <Lock className="w-3 h-3 text-amber-400 shrink-0" />
              )}
            </div>
            <p className="text-[11px] text-slate-400 truncate">
              {advisorUnlocked
                ? `Appel & WhatsApp · ${ADVISOR_CONTACT.phoneDisplay}`
                : 'Accès par code transmis par le Super Admin'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            if (onNavigateToFull && !advisorUnlocked) {
              setIsExpanded(true);
            } else {
              setIsExpanded(true);
            }
          }}
          className="min-h-[40px] px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1 shrink-0 transition"
        >
          <span>{advisorUnlocked ? 'Contacter' : 'Débloquer'}</span>
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-emerald-700/20 border border-emerald-700/40 text-emerald-400 flex items-center justify-center shrink-0">
            <Headset className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold text-white">Conseiller du Domaine</h3>
              {advisorUnlocked ? (
                <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Débloqué
                </span>
              ) : (
                <span className="text-[11px] font-semibold text-amber-400 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Code requis
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {advisorUnlocked
                ? `Ligne directe & WhatsApp : ${ADVISOR_CONTACT.phoneDisplay}`
                : 'Appel et WhatsApp accessibles par code transmis par le Super Admin.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            type="button"
            onClick={handleSpeakAdvisorInfo}
            aria-label="Écouter les instructions conseiller"
            className="min-h-[36px] min-w-[36px] p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center transition"
          >
            <Volume2 className="w-3.5 h-3.5" />
          </button>
          {compact && (
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              aria-label="Réduire la carte conseiller"
              className="min-h-[36px] min-w-[36px] p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center transition"
            >
              <ChevronUp className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {!advisorUnlocked ? (
        /* Locked state: requires Super Admin code */
        <form onSubmit={handleUnlock} className="space-y-2.5 pt-1">
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center gap-1.5 text-[11px] text-slate-300 font-medium">
              <KeyRound className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Entrez le code Conseiller reçu du Super Admin</span>
            </div>

            <div className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={codeInput}
                onChange={(e) => {
                  setCodeInput(e.target.value.toUpperCase());
                  if (errorMsg) setErrorMsg('');
                }}
                placeholder="Ex : FF-CONS-4829"
                className="flex-1 min-h-[44px] px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-xs font-mono uppercase tracking-wider text-white focus:outline-none focus:border-emerald-600"
              />
              <button
                type="submit"
                disabled={isSubmitting || !codeInput.trim()}
                className="min-h-[44px] px-4 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition disabled:opacity-50 shrink-0"
              >
                <KeyRound className="w-3.5 h-3.5" />
                <span>{isSubmitting ? 'Vérification...' : 'Débloquer'}</span>
              </button>
            </div>
          </div>

          {errorMsg && (
            <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-800/60 text-xs text-red-300">
              {errorMsg}
            </div>
          )}

          <p className="text-[11px] text-slate-500">
            Une fois le code validé, vous pourrez appeler ou écrire sur WhatsApp au conseiller avicole pour toute situation au poulailler.
          </p>
        </form>
      ) : (
        /* Unlocked state: Call + WhatsApp + Situation summary */
        <div className="space-y-3 pt-1">
          {/* Number banner */}
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between gap-2">
            <div>
              <span className="text-[10px] uppercase text-slate-400 font-semibold block">
                Numéro Téléphone & WhatsApp
              </span>
              <span className="font-mono font-bold text-base text-emerald-400 tabular-nums">
                {ADVISOR_CONTACT.phoneDisplay}
              </span>
            </div>
            {advisorUnlockCode && (
              <span className="text-[10px] font-mono text-slate-400">
                Code : {advisorUnlockCode}
              </span>
            )}
          </div>

          {/* Situation selector */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-slate-400 block">
              Quelle est votre situation ?
            </span>
            <div className="grid grid-cols-2 gap-1.5">
              {SITUATION_PRESETS.map((sit) => (
                <button
                  key={sit}
                  type="button"
                  onClick={() => setSelectedSituation(sit)}
                  className={`min-h-[38px] px-2.5 py-1.5 rounded-lg border text-[11px] font-medium text-left truncate transition ${
                    selectedSituation === sit
                      ? 'bg-emerald-950/60 border-emerald-600 text-white font-semibold'
                      : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                  }`}
                >
                  {sit}
                </button>
              ))}
            </div>
          </div>

          {/* Custom notes */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-400 mb-1">
              Précisions pour le conseiller (optionnel)
            </label>
            <textarea
              rows={2}
              value={situationNotes}
              onChange={(e) => setSituationNotes(e.target.value)}
              placeholder="Ex : 6 poussins morts ce matin, fientes blanchâtres, baisse d'appétit..."
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-600 resize-none"
            />
          </div>

          {activeBatch && (
            <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
              <input
                type="checkbox"
                checked={includeBatchStats}
                onChange={(e) => setIncludeBatchStats(e.target.checked)}
                className="rounded border-slate-700"
              />
              <span>
                Joindre les données du lot actif ({activeBatch.name}, J{metrics.ageInDays})
              </span>
            </label>
          )}

          {/* Direct Call & WhatsApp CTAs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
            <a
              href={ADVISOR_CONTACT.phoneHref}
              className="min-h-[48px] px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-bold text-xs flex items-center justify-center gap-2 transition active:scale-[0.98]"
            >
              <Phone className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Appeler ({ADVISOR_CONTACT.phoneDisplay})</span>
            </a>

            <a
              href={whatsappUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[48px] px-4 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-2 transition active:scale-[0.98]"
            >
              <MessageCircle className="w-4 h-4 shrink-0" />
              <span>Écrire sur WhatsApp</span>
            </a>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-slate-800/80 text-[11px] text-slate-500">
            {onNavigateToFull && compact ? (
              <button
                type="button"
                onClick={onNavigateToFull}
                className="text-emerald-400 hover:underline font-medium"
              >
                Ouvrir l'onglet Santé complet
              </button>
            ) : (
              <span>Conseil direct par téléphone ou WhatsApp</span>
            )}
            <button
              type="button"
              onClick={lockAdvisorAccess}
              className="text-slate-400 hover:text-slate-200 flex items-center gap-1"
            >
              <LockKeyhole className="w-3 h-3" />
              <span>Verrouiller</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
