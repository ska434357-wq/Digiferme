import React from 'react';
import { BatchMetrics } from '../utils/formatters';
import { FeedStock } from '../types';
import { Calendar, Package, DollarSign, ArrowUpRight } from 'lucide-react';

interface StatsCardsProps {
  metrics: BatchMetrics;
  feedStock: FeedStock;
  onSelectTab?: (tab: string) => void;
}

export const StatsCards: React.FC<StatsCardsProps> = ({ metrics, feedStock, onSelectTab }) => {
  const { ageInDays, birdsAlive, initialChicks, costPerChickenFCFA } = metrics;

  const feedPhase =
    ageInDays <= 14 ? 'Démarrage' : ageInDays <= 28 ? 'Croissance' : 'Finition';
  const bagsInPhase =
    ageInDays <= 14
      ? feedStock.demarrageBags
      : ageInDays <= 28
      ? feedStock.croissanceBags
      : feedStock.finitionBags;

  return (
    <div className="grid grid-cols-2 gap-2">
      {/* 1. Age Card */}
      <div
        onClick={() => onSelectTab && onSelectTab('batch')}
        className="cursor-pointer bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-3 flex flex-col justify-between transition group"
      >
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            Âge du Lot
          </span>
          <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        <div className="mt-2">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-white tracking-tight">
              J-{ageInDays}
            </span>
            <span className="text-xs text-slate-400">/ 42j</span>
          </div>
          <span className="text-[10px] text-slate-400">
            Phase {feedPhase}
          </span>
        </div>
      </div>

      {/* 2. Total Alive Birds Card */}
      <div
        onClick={() => onSelectTab && onSelectTab('batch')}
        className="cursor-pointer bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-3 flex flex-col justify-between transition group"
      >
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
            <span>🐔</span>
            Vivants
          </span>
          <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        <div className="mt-2">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-white tracking-tight">
              {birdsAlive}
            </span>
            <span className="text-xs text-slate-400">/ {initialChicks}</span>
          </div>
          <span className="text-[10px] text-slate-400">
            Survie : {((birdsAlive / (initialChicks || 1)) * 100).toFixed(1)}%
          </span>
        </div>
      </div>

      {/* 3. Feed Bags Left Card */}
      <div
        onClick={() => onSelectTab && onSelectTab('inventory')}
        className="cursor-pointer bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-3 flex flex-col justify-between transition group"
      >
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5" />
            Stock Aliment
          </span>
          <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        <div className="mt-2">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-white tracking-tight">
              {bagsInPhase}
            </span>
            <span className="text-xs text-slate-400">sacs</span>
          </div>
          <span className={`text-[10px] ${bagsInPhase <= 2 ? 'text-amber-400 font-semibold' : 'text-slate-400'}`}>
            {bagsInPhase <= 2 ? 'Stock bas (50kg)' : `${feedPhase} (50kg)`}
          </span>
        </div>
      </div>

      {/* 4. Cost Per Chicken */}
      <div
        onClick={() => onSelectTab && onSelectTab('batch')}
        className="cursor-pointer bg-slate-900 border border-slate-800 hover:border-slate-700 rounded-xl p-3 flex flex-col justify-between transition group"
      >
        <div className="flex items-center justify-between text-slate-400">
          <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
            <DollarSign className="w-3.5 h-3.5" />
            Coût / Sujet
          </span>
          <ArrowUpRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>

        <div className="mt-2">
          <div className="flex items-baseline gap-1">
            <span className="text-2xl font-bold text-white tracking-tight">
              {costPerChickenFCFA.toLocaleString('fr-FR')}
            </span>
            <span className="text-xs text-slate-400">F</span>
          </div>
          <span className="text-[10px] text-slate-400">
            Coût de revient
          </span>
        </div>
      </div>
    </div>
  );
};
