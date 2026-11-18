import React, { useState } from 'react';
import { usePoultryStore } from '../../store/usePoultryStore';
import { calculateBatchMetrics } from '../../utils/formatters';
import {
  Package,
  Plus,
} from 'lucide-react';
import { FeedRationCalculator } from '../FeedRationCalculator';
import { ProfitabilityProjection } from '../ProfitabilityProjection';

interface InventoryFinanceTabProps {
  onOpenFinanceModal: () => void;
  onOpenMobileMoneyModal: () => void;
}

export const InventoryFinanceTab: React.FC<InventoryFinanceTabProps> = ({
  onOpenFinanceModal,
}) => {
  const activeBatchId = usePoultryStore((state) => state.activeBatchId);
  const batches = usePoultryStore((state) => state.batches);
  const dailyLogs = usePoultryStore((state) => state.dailyLogs);
  const cashFlow = usePoultryStore((state) => state.cashFlow);
  const feedStock = usePoultryStore((state) => state.feedStock);
  const restockFeed = usePoultryStore((state) => state.restockFeed);
  const currentTemp = usePoultryStore((state) => state.currentSimulatedTemp);

  const activeBatch = batches.find((b) => b.id === activeBatchId) || batches[0];
  const metrics = calculateBatchMetrics(activeBatch, dailyLogs, cashFlow, currentTemp);

  const [restockModalType, setRestockModalType] = useState<'demarrage' | 'croissance' | 'finition' | null>(null);
  const [restockBags, setRestockBags] = useState<number>(5);

  const handleRestockSubmit = () => {
    if (!restockModalType) return;
    const price = feedStock.pricePerBagFCFA[restockModalType];
    restockFeed(restockModalType, restockBags, price, 'wave');
    setRestockModalType(null);
  };

  const feedItems = [
    {
      type: 'demarrage' as const,
      name: 'Aliment Démarrage',
      phase: 'Jour 1 à 14',
      bags: feedStock.demarrageBags,
      price: feedStock.pricePerBagFCFA.demarrage,
    },
    {
      type: 'croissance' as const,
      name: 'Aliment Croissance',
      phase: 'Jour 15 à 28',
      bags: feedStock.croissanceBags,
      price: feedStock.pricePerBagFCFA.croissance,
    },
    {
      type: 'finition' as const,
      name: 'Aliment Finition',
      phase: 'Jour 29 à 42+',
      bags: feedStock.finitionBags,
      price: feedStock.pricePerBagFCFA.finition,
    },
  ];

  return (
    <div className="space-y-3.5 pb-24">
      {/* Financial Net Summary */}
      <div className="rounded-xl border border-slate-800 bg-slate-900 p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-[10px] font-semibold uppercase text-slate-400">
            Trésorerie & Caisse
          </span>
          <button
            onClick={onOpenFinanceModal}
            className="bg-emerald-700 hover:bg-emerald-600 text-white font-medium text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition"
          >
            <Plus className="w-3.5 h-3.5" />
            + Saisie Caisse
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 text-center">
          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">
              Dépenses Totales
            </span>
            <span className="text-base font-bold text-white mt-1 block">
              {metrics.totalExpensesFCFA.toLocaleString('fr-FR')} F
            </span>
            <span className="text-[10px] text-slate-400">
              Coût/sujet : {metrics.costPerChickenFCFA} F
            </span>
          </div>

          <div className="p-3 rounded-lg bg-slate-950 border border-slate-800">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">
              Recettes Ventes
            </span>
            <span className="text-base font-bold text-white mt-1 block">
              {metrics.totalRevenueFCFA.toLocaleString('fr-FR')} F
            </span>
            <span className="text-[10px] text-slate-400">
              Solde : {metrics.netProfitFCFA.toLocaleString('fr-FR')} F
            </span>
          </div>
        </div>
      </div>

      {/* End-of-Cycle Profitability Projection */}
      <ProfitabilityProjection onOpenFinanceModal={onOpenFinanceModal} />

      {/* Feed Ration Calculator (Standard Broiler Growth Model) */}
      <FeedRationCalculator
        onOpenRestockForPhase={(phase) => {
          setRestockModalType(phase);
          setRestockBags(5);
        }}
      />

      {/* Feed Stock Tracker */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs px-1">
          <span className="font-semibold text-slate-400 uppercase flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5" />
            Stock d'Aliments (50 kg)
          </span>
          <span className="text-[11px] text-slate-500">Magasin ferme</span>
        </div>

        <div className="space-y-2">
          {feedItems.map((item) => {
            const isLowStock = item.bags <= 2;
            return (
              <div
                key={item.type}
                className="rounded-xl border border-slate-800 bg-slate-900 p-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-xs text-white">{item.name}</h4>
                      <span className="text-[10px] text-slate-400">
                        {item.phase}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {item.price.toLocaleString('fr-FR')} FCFA / sac
                    </p>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xl font-bold text-white">{item.bags}</span>
                    <span className="text-xs text-slate-400 ml-1">sacs</span>
                    {isLowStock && (
                      <span className="block text-[10px] text-amber-400">
                        Stock bas
                      </span>
                    )}
                  </div>
                </div>

                <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-end">
                  <button
                    onClick={() => {
                      setRestockModalType(item.type);
                      setRestockBags(5);
                    }}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-2.5 py-1 rounded-lg text-xs font-medium transition"
                  >
                    + Entrée Stock
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cash Flow Log Table */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs px-1">
          <span className="font-semibold text-slate-400 uppercase">
            Historique de Caisse ({cashFlow.length})
          </span>
          <button onClick={onOpenFinanceModal} className="text-slate-300 hover:text-white font-medium">
            + Ajouter
          </button>
        </div>

        <div className="space-y-1.5">
          {cashFlow.map((entry) => (
            <div
              key={entry.id}
              className="p-2.5 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-between gap-3 text-xs"
            >
              <div>
                <p className="font-medium text-white">{entry.label}</p>
                <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                  <span>{entry.date}</span>
                  <span>•</span>
                  <span className="uppercase">{entry.paymentMethod}</span>
                </div>
              </div>

              <div className="text-right shrink-0">
                <span className="text-xs font-semibold text-slate-200">
                  {entry.type === 'vente' ? '+' : '-'} {entry.amountFCFA.toLocaleString('fr-FR')} F
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Restock Mini Modal */}
      {restockModalType && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-xl bg-slate-900 border border-slate-700 p-4 text-slate-100">
            <h4 className="text-sm font-bold text-white mb-1">
              Ajout Stock : {restockModalType}
            </h4>
            <p className="text-xs text-slate-400 mb-3">
              Nombre de sacs de 50 kg reçus :
            </p>

            <div className="flex items-center justify-center gap-2 my-2">
              {[2, 5, 10, 20].map((num) => (
                <button
                  key={num}
                  onClick={() => setRestockBags(num)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition ${
                    restockBags === num
                      ? 'bg-slate-700 text-white border-slate-600'
                      : 'bg-slate-800 border-slate-700 text-slate-300'
                  }`}
                >
                  {num} sacs
                </button>
              ))}
            </div>

            <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs flex justify-between my-3">
              <span className="text-slate-400">Montant :</span>
              <strong className="text-white">
                {(restockBags * feedStock.pricePerBagFCFA[restockModalType]).toLocaleString('fr-FR')}{' '}
                FCFA
              </strong>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setRestockModalType(null)}
                className="flex-1 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium"
              >
                Annuler
              </button>
              <button
                onClick={handleRestockSubmit}
                className="flex-2 py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-xs"
              >
                Valider
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
