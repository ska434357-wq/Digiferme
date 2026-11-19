import React from 'react';
import { Volume2, Sparkles } from 'lucide-react';
import { speakMessage } from '../../utils/audioSpeech';
import { AdvisorContactCard } from '../AdvisorContactCard';

interface VeterinaryGuideTabProps {
  onOpenMobileMoneyModal: () => void;
}

export const VeterinaryGuideTab: React.FC<VeterinaryGuideTabProps> = ({ onOpenMobileMoneyModal }) => {
  const droppingsGuide = [
    {
      id: 'normal',
      name: 'Fientes Normales',
      visual: '🟤⚪',
      status: 'Sain',
      desc: 'Marron foncé ou verdâtre avec calotte blanche d\'urates. Bonne digestion.',
      action: 'Ration normale. Bonne santé.',
    },
    {
      id: 'coccidiosis',
      name: 'Fientes Hémorragiques (Sang)',
      visual: '🔴🩸',
      status: 'Alerte Coccidiose',
      desc: 'Présence de sang frais ou marron foncé dans la litière.',
      action: 'Anti-coccidien (Amprolium / Toltrazuril) + Vitamine K3 immédiat.',
    },
    {
      id: 'gumboro',
      name: 'Fientes Blanches Crayeuses',
      visual: '⚪💧',
      status: 'Suspicion Gumboro',
      desc: 'Diarrhée liquide blanc plâtre avec plumes du croupion souillées.',
      action: 'Vitamines hépatiques + détoxifiants rénaux, appeler le vétérinaire.',
    },
    {
      id: 'salmonellosis',
      name: 'Fientes Vertes Fluorescentes',
      visual: '🟢🤢',
      status: 'Infection Bactérienne',
      desc: 'Vert vif acide. Perte d\'appétit et prostration des poulets.',
      action: 'Consultation vétérinaire requise et désinfection de l\'eau.',
    },
  ];

  const biosecurityTips = [
    {
      title: 'Pédiluve actif à l\'entrée',
      desc: 'Changer le désinfectant tous les 3 jours.',
      icon: '👟',
    },
    {
      title: 'Litière sèche',
      desc: 'Retourner ou remplacer les copeaux humides sous les abreuvoirs.',
      icon: '🪵',
    },
    {
      title: 'Accès réservé',
      desc: 'Interdire l\'entrée aux personnes extérieures avec leurs chaussures.',
      icon: '🚫',
    },
    {
      title: 'Eau potable propre',
      desc: 'Nettoyer les abreuvoirs chaque matin avant distribution.',
      icon: '💧',
    },
  ];

  const handleSpeak = (title: string, desc: string, action: string) => {
    const text = `Diagnostic : ${title}. ${desc}. Conduite à tenir : ${action}`;
    speakMessage(text);
  };

  return (
    <div className="space-y-3.5 pb-24">
      {/* Header Banner */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <span className="text-[10px] uppercase font-bold text-slate-400">
              Guide Visuel
            </span>
            <h2 className="text-base font-bold text-white mt-0.5">Santé & Symptômes</h2>
            <p className="text-xs text-slate-400">
              Reconnaître les signes anormaux au poulailler.
            </p>
          </div>

          <button
            onClick={onOpenMobileMoneyModal}
            className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-medium px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Assistance Vet</span>
          </button>
        </div>
      </div>

      {/* Conseiller du Domaine (Appel & WhatsApp par code Super Admin) */}
      <AdvisorContactCard />

      {/* Droppings Guide */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs px-1">
          <span className="font-semibold text-slate-400 uppercase">
            Guide des Fientes
          </span>
          <span className="text-[10px] text-slate-500">Touchez l'icône son pour écouter</span>
        </div>

        <div className="space-y-2">
          {droppingsGuide.map((item) => (
            <div
              key={item.id}
              className="rounded-xl border border-slate-800 bg-slate-900 p-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="text-xl p-1.5 rounded-lg bg-slate-950 border border-slate-800 shrink-0">
                    {item.visual}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-xs text-white">{item.name}</h4>
                      <span className="text-[10px] text-slate-400">
                        • {item.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{item.desc}</p>
                  </div>
                </div>

                <button
                  onClick={() => handleSpeak(item.name, item.desc, item.action)}
                  className="p-1 rounded-lg bg-slate-800 text-slate-400 hover:text-white transition shrink-0"
                >
                  <Volume2 className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="mt-2 pt-2 border-t border-slate-800 text-[11px] text-slate-300">
                Action : {item.action}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Biosecurity Rules */}
      <div className="space-y-2">
        <span className="font-semibold text-slate-400 uppercase text-xs px-1 block">
          Biosécurité au Poulailler
        </span>

        <div className="grid grid-cols-2 gap-2">
          {biosecurityTips.map((tip, i) => (
            <div
              key={i}
              className="p-2.5 rounded-xl bg-slate-900 border border-slate-800"
            >
              <span className="text-lg block mb-1">{tip.icon}</span>
              <h5 className="font-semibold text-xs text-white leading-tight">{tip.title}</h5>
              <p className="text-[10px] text-slate-400 mt-0.5">{tip.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
