import React from 'react';
import { Home, ClipboardList, Syringe, Package, HeartPulse } from 'lucide-react';
import { usePoultryStore } from '../store/usePoultryStore';
import { calculateBatchMetrics } from '../utils/formatters';

interface BottomNavProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentTab, onSelectTab }) => {
  const activeBatchId = usePoultryStore((state) => state.activeBatchId);
  const batches = usePoultryStore((state) => state.batches);
  const dailyLogs = usePoultryStore((state) => state.dailyLogs);
  const cashFlow = usePoultryStore((state) => state.cashFlow);
  const currentTemp = usePoultryStore((state) => state.currentSimulatedTemp);
  const vaccineEvents = usePoultryStore((state) => state.vaccineEvents);

  const activeBatch = batches.find((b) => b.id === activeBatchId) || batches[0];
  const metrics = calculateBatchMetrics(activeBatch, dailyLogs, cashFlow, currentTemp);

  const vaxList = (activeBatch && vaccineEvents[activeBatch.id]) || [];
  const pendingVaxCount = vaxList.filter((v) => !v.completed && metrics.ageInDays >= v.day).length;

  const navItems = [
    {
      id: 'dashboard',
      label: 'Accueil',
      icon: Home,
      badge: null,
    },
    {
      id: 'batch',
      label: 'Suivi Lot',
      icon: ClipboardList,
      badge: `J-${metrics.ageInDays}`,
    },
    {
      id: 'prophylaxis',
      label: 'Vaccins',
      icon: Syringe,
      badge: pendingVaxCount > 0 ? `${pendingVaxCount}` : null,
    },
    {
      id: 'inventory',
      label: 'Caisse/Stock',
      icon: Package,
      badge: null,
    },
    {
      id: 'guide',
      label: 'Santé',
      icon: HeartPulse,
      badge: null,
    },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900 border-t border-slate-800">
      <div className="max-w-md mx-auto px-2 py-2 flex items-center justify-around">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`relative flex flex-col items-center justify-center py-1 px-3 transition-colors ${
                isActive
                  ? 'text-emerald-400 font-semibold'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <div className="relative">
                <Icon className="w-5 h-5" />
                {item.badge && (
                  <span className="absolute -top-1 -right-2.5 px-1 py-0.2 rounded-full text-[9px] font-bold bg-slate-800 text-slate-300 border border-slate-700 leading-none">
                    {item.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] mt-1 leading-none">
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
