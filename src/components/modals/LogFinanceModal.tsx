import React, { useState } from 'react';
import { usePoultryStore } from '../../store/usePoultryStore';
import { CashFlowCategory, CashFlowEntry } from '../../types';
import { X, Check } from 'lucide-react';
import { speakMessage } from '../../utils/audioSpeech';

interface LogFinanceModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LogFinanceModal: React.FC<LogFinanceModalProps> = ({ isOpen, onClose }) => {
  const activeBatchId = usePoultryStore((state) => state.activeBatchId);
  const batches = usePoultryStore((state) => state.batches);
  const addCashFlow = usePoultryStore((state) => state.addCashFlow);
  const isAudioEnabled = usePoultryStore((state) => state.isAudioEnabled);

  const activeBatch = batches.find((b) => b.id === activeBatchId) || batches[0];

  const [type, setType] = useState<'depense' | 'vente'>('depense');
  const [category, setCategory] = useState<CashFlowCategory>('aliment');
  const [amountFCFA, setAmountFCFA] = useState<number>(17800);
  const [quantity, setQuantity] = useState<number>(1);
  const [paymentMethod, setPaymentMethod] = useState<CashFlowEntry['paymentMethod']>('wave');
  const [label, setLabel] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  if (!isOpen || !activeBatch) return null;

  const expenseCategories: { cat: CashFlowCategory; label: string; icon: string }[] = [
    { cat: 'aliment', label: 'Aliment', icon: '🌾' },
    { cat: 'vaccin_sante', label: 'Vaccins / Médicaments', icon: '💉' },
    { cat: 'copeaux_sciure', label: 'Copeaux / Litière', icon: '🪵' },
    { cat: 'chauffage_gaz_charbon', label: 'Chauffage / Charbon / Gaz', icon: '🔥' },
    { cat: 'transport', label: 'Transport / Livraison', icon: '🚚' },
    { cat: 'main_oeuvre', label: 'Main d\'œuvre', icon: '👷' },
    { cat: 'autre', label: 'Autre dépense', icon: '📦' },
  ];

  const paymentProviders = [
    { id: 'wave', name: 'Wave' },
    { id: 'orange_money', name: 'Orange Money' },
    { id: 'mtn_momo', name: 'MTN MoMo' },
    { id: 'moov', name: 'Moov Money' },
    { id: 'cash', name: 'Espèces' },
  ];

  const handleSave = () => {
    if (!amountFCFA || amountFCFA <= 0) {
      setErrorMsg('Veuillez entrer un montant valide.');
      return;
    }
    setErrorMsg('');

    const defaultTitle =
      type === 'vente'
        ? `Vente de ${quantity} poulets`
        : expenseCategories.find((c) => c.cat === category)?.label || 'Dépense élevage';

    addCashFlow({
      batchId: activeBatch.id,
      type,
      category: type === 'vente' ? 'vente_poulets' : category,
      label: label.trim() || defaultTitle,
      amountFCFA,
      quantity: quantity || undefined,
      paymentMethod,
      date: new Date().toISOString().split('T')[0],
    });

    if (isAudioEnabled) {
      speakMessage(`${amountFCFA} francs CFA enregistrés.`);
    }

    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 p-0 sm:p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-2xl text-slate-100 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div>
            <h3 className="font-bold text-base text-white">Opération de Caisse</h3>
            <p className="text-xs text-slate-400">
              {activeBatch.name}
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Type Toggle: Depense vs Vente */}
        <div className="grid grid-cols-2 gap-1 p-1 bg-slate-950 rounded-lg border border-slate-800 mb-3 text-xs">
          <button
            type="button"
            onClick={() => {
              setType('depense');
              setAmountFCFA(17800);
            }}
            className={`py-2 rounded-md font-semibold transition ${
              type === 'depense'
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Dépense (Sortie)
          </button>
          <button
            type="button"
            onClick={() => {
              setType('vente');
              setCategory('vente_poulets');
              setAmountFCFA(50000);
            }}
            className={`py-2 rounded-md font-semibold transition ${
              type === 'vente'
                ? 'bg-slate-800 text-white'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Vente Poulets (Entrée)
          </button>
        </div>

        {/* Amount Input */}
        <div className="bg-slate-950 rounded-xl border border-slate-800 p-4 text-center mb-3">
          <label className="block text-xs uppercase font-semibold text-slate-400 mb-2">
            Montant en Francs CFA
          </label>
          <div className="flex items-center justify-center gap-2">
            <input
              type="number"
              value={amountFCFA || ''}
              onChange={(e) => setAmountFCFA(parseInt(e.target.value, 10) || 0)}
              className="w-44 text-center text-2xl font-bold bg-slate-900 border border-slate-700 rounded-lg py-1.5 px-3 text-white focus:outline-none"
              placeholder="0"
            />
            <span className="text-xs font-semibold text-slate-400">FCFA</span>
          </div>

          {/* Quick preset chips */}
          <div className="flex items-center justify-center gap-1 mt-3 pt-2 border-t border-slate-800 flex-wrap">
            {[5000, 10000, 17800, 35000, 50000].map((amt) => (
              <button
                key={amt}
                type="button"
                onClick={() => setAmountFCFA(amt)}
                className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px]"
              >
                {amt.toLocaleString('fr-FR')} F
              </button>
            ))}
          </div>
        </div>

        {/* Vente specific: Number of birds sold */}
        {type === 'vente' && (
          <div className="bg-slate-950 rounded-xl border border-slate-800 p-3 mb-3 text-xs">
            <div className="flex items-center justify-between mb-2 text-slate-300">
              <span>Nombre de poulets vendus :</span>
              <span className="font-semibold">{quantity} poulets</span>
            </div>
            <div className="flex items-center gap-1.5">
              {[10, 25, 50, 100].map((q) => (
                <button
                  key={q}
                  type="button"
                  onClick={() => {
                    setQuantity(q);
                    setAmountFCFA(q * 2400);
                  }}
                  className={`flex-1 py-1 rounded-md text-xs font-medium border transition ${
                    quantity === q
                      ? 'bg-slate-800 border-slate-600 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Expense Category Selector */}
        {type === 'depense' && (
          <div className="space-y-1 mb-3">
            <label className="text-xs font-semibold text-slate-400">Catégorie :</label>
            <div className="grid grid-cols-2 gap-1 max-h-32 overflow-y-auto">
              {expenseCategories.map((c) => (
                <button
                  key={c.cat}
                  type="button"
                  onClick={() => setCategory(c.cat)}
                  className={`p-1.5 rounded-lg text-xs text-left flex items-center gap-1.5 border transition ${
                    category === c.cat
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
        )}

        {/* Payment Provider */}
        <div className="space-y-1 mb-3">
          <label className="text-xs font-semibold text-slate-400">Règlement :</label>
          <div className="grid grid-cols-3 gap-1">
            {paymentProviders.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPaymentMethod(p.id as any)}
                className={`py-1.5 px-2 rounded-lg text-center border text-[11px] font-medium transition ${
                  paymentMethod === p.id
                    ? 'bg-slate-800 border-slate-600 text-white'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                {p.name}
              </button>
            ))}
          </div>
        </div>

        {errorMsg && (
          <div className="mt-3 p-2 rounded-lg bg-red-950/50 border border-red-800/60 text-xs text-red-300 text-center">
            {errorMsg}
          </div>
        )}

        {/* Action buttons */}
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
