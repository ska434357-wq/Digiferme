import React from 'react';
import { Wheat, DollarSign, Activity } from 'lucide-react';

interface BigActionButtonsProps {
  onOpenMortality: () => void;
  onOpenFeed: () => void;
  onOpenFinance: () => void;
}

export const BigActionButtons: React.FC<BigActionButtonsProps> = ({
  onOpenMortality,
  onOpenFeed,
  onOpenFinance,
}) => {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between text-xs px-1">
        <span className="font-semibold text-slate-400 uppercase tracking-wider text-[11px]">
          Saisie Rapide
        </span>
        <span className="text-[10px] text-slate-500">1 clic = 1 enregistrement</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {/* 1. Log Mortality */}
        <button
          onClick={onOpenMortality}
          className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 active:scale-98 transition text-center"
        >
          <div className="w-9 h-9 rounded-lg bg-slate-800 text-slate-200 flex items-center justify-center mb-1 text-base">
            🪶
          </div>
          <span className="text-xs font-bold text-slate-100">
            + Mortalité
          </span>
          <span className="text-[10px] text-slate-400">
            Pertes du jour
          </span>
        </button>

        {/* 2. Log Feed */}
        <button
          onClick={onOpenFeed}
          className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 active:scale-98 transition text-center"
        >
          <div className="w-9 h-9 rounded-lg bg-slate-800 text-slate-200 flex items-center justify-center mb-1">
            <Wheat className="w-4 h-4 text-slate-300" />
          </div>
          <span className="text-xs font-bold text-slate-100">
            + Aliment
          </span>
          <span className="text-[10px] text-slate-400">
            Sacs & Eau
          </span>
        </button>

        {/* 3. Log Sales / Expenses */}
        <button
          onClick={onOpenFinance}
          className="flex flex-col items-center justify-center p-3 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 active:scale-98 transition text-center"
        >
          <div className="w-9 h-9 rounded-lg bg-slate-800 text-slate-200 flex items-center justify-center mb-1">
            <DollarSign className="w-4 h-4 text-slate-300" />
          </div>
          <span className="text-xs font-bold text-slate-100">
            + Caisse
          </span>
          <span className="text-[10px] text-slate-400">
            Vente / Achat
          </span>
        </button>
      </div>
    </div>
  );
};
