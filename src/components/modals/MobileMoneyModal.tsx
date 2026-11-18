import React, { useState } from 'react';
import { X, CheckCircle, ArrowRight } from 'lucide-react';
import { speakMessage } from '../../utils/audioSpeech';
import { usePoultryStore } from '../../store/usePoultryStore';

interface MobileMoneyModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileMoneyModal: React.FC<MobileMoneyModalProps> = ({ isOpen, onClose }) => {
  const isAudioEnabled = usePoultryStore((state) => state.isAudioEnabled);
  const country = usePoultryStore((state) => state.country);

  const [selectedPlan, setSelectedPlan] = useState<'pro' | 'vet' | 'audit'>('vet');
  const [selectedProvider, setSelectedProvider] = useState<'wave' | 'orange' | 'mtn' | 'moov'>('wave');
  const [phoneNumber, setPhoneNumber] = useState<string>('07 00 12 34 56');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);

  if (!isOpen) return null;

  const plans = [
    {
      id: 'vet',
      name: 'Assistance Télé-Vétérinaire',
      price: '2 500 FCFA',
      desc: 'Avis sur photo de fientes & symptômes par un vétérinaire avicole.',
    },
    {
      id: 'pro',
      name: 'FermeFacile Cloud Pro',
      price: '5 000 FCFA / mois',
      desc: 'Sauvegarde illimitée et gestion multi-bâtiments.',
    },
    {
      id: 'audit',
      name: 'Bilan de Fin de Bande',
      price: '1 500 FCFA',
      desc: 'Rapport certifié pour coopératives et institutions agricoles.',
    },
  ];

  const providers = [
    { id: 'wave', name: 'Wave (0% frais)', ussd: 'Paiement direct' },
    { id: 'orange', name: 'Orange Money', ussd: country === 'SN' ? '#144#' : '*144*4*6#' },
    { id: 'mtn', name: 'MTN MoMo', ussd: '*133#' },
    { id: 'moov', name: 'Moov Money', ussd: '*155#' },
  ];

  const handlePay = () => {
    setIsProcessing(true);
    setTimeout(() => {
      setIsProcessing(false);
      setIsSuccess(true);
      if (isAudioEnabled) {
        speakMessage('Paiement Mobile Money validé.');
      }
    }, 1500);
  };

  const currentPlanObj = plans.find((p) => p.id === selectedPlan);
  const currentProviderObj = providers.find((p) => p.id === selectedProvider);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 p-0 sm:p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-2xl text-slate-100 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div>
            <h3 className="font-bold text-base text-white">Services & Mobile Money</h3>
            <p className="text-xs text-slate-400">
              Règlement sécurisé (Wave, Orange, MTN, Moov)
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {isSuccess ? (
          <div className="text-center py-5 space-y-3">
            <div className="w-12 h-12 rounded-xl bg-slate-800 text-emerald-400 flex items-center justify-center mx-auto">
              <CheckCircle className="w-7 h-7" />
            </div>
            <div>
              <h4 className="text-base font-bold text-white">Paiement Validé</h4>
              <p className="text-xs text-slate-400 mt-1">
                {currentPlanObj?.name} via {currentProviderObj?.name}
              </p>
            </div>

            <button
              onClick={() => {
                setIsSuccess(false);
                onClose();
              }}
              className="w-full py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-xs transition"
            >
              Fermer
            </button>
          </div>
        ) : (
          <div className="space-y-3.5">
            {/* Plan selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Service :</label>
              <div className="space-y-1.5">
                {plans.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setSelectedPlan(p.id as any)}
                    className={`w-full p-2.5 rounded-lg border text-left transition ${
                      selectedPlan === p.id
                        ? 'bg-slate-800 border-slate-600 text-white'
                        : 'bg-slate-950 border-slate-800 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-xs">{p.name}</span>
                      <span className="text-xs font-bold text-slate-200">{p.price}</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{p.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {/* Provider selection */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-400">Opérateur :</label>
              <div className="grid grid-cols-2 gap-1.5">
                {providers.map((pr) => (
                  <button
                    key={pr.id}
                    type="button"
                    onClick={() => setSelectedProvider(pr.id as any)}
                    className={`p-2 rounded-lg border text-left text-xs transition ${
                      selectedProvider === pr.id
                        ? 'bg-slate-800 border-slate-600 text-white font-semibold'
                        : 'bg-slate-950 border-slate-800 text-slate-400'
                    }`}
                  >
                    <div>{pr.name}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Phone Number Input */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Numéro Mobile Money :
              </label>
              <input
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="07 00 12 34 56"
                className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white font-mono text-xs focus:outline-none"
              />
              <p className="text-[10px] text-slate-500 mt-1">
                Code USSD : {currentProviderObj?.ussd}
              </p>
            </div>

            {/* Pay Button */}
            <button
              onClick={handlePay}
              disabled={isProcessing}
              className="w-full py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-50"
            >
              {isProcessing ? (
                'Validation en cours...'
              ) : (
                <>
                  <span>Payer {currentPlanObj?.price}</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
