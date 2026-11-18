import React, { useMemo, useState } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from 'recharts';
import { Scale, Plus, Check } from 'lucide-react';
import { Batch, DailyLog } from '../types';
import { usePoultryStore } from '../store/usePoultryStore';
import { getExpectedBodyWeightGrams } from '../utils/feedCalculator';
import { getBatchAgeInDays } from '../utils/formatters';
import { speakMessage } from '../utils/audioSpeech';

interface WeightGrowthChartProps {
  batch: Batch;
  dailyLogs: DailyLog[];
}

interface ChartPoint {
  day: number;
  dayLabel: string;
  idealWeight: number;
  actualWeight: number | null;
}

export const WeightGrowthChart: React.FC<WeightGrowthChartProps> = ({ batch, dailyLogs }) => {
  const themeMode = usePoultryStore((state) => state.themeMode);
  const addDailyLog = usePoultryStore((state) => state.addDailyLog);
  const isAudioEnabled = usePoultryStore((state) => state.isAudioEnabled);

  const isLight = themeMode === 'light';
  const ageInDays = getBatchAgeInDays(batch.startDate);
  const maxDay = Math.max(ageInDays, Math.min(45, batch.targetHarvestDay || 42));

  const [showWeighForm, setShowWeighForm] = useState(false);
  const [sampleWeight, setSampleWeight] = useState<string>(
    String(getExpectedBodyWeightGrams(ageInDays))
  );

  const { chartData, latestActual, idealAtLatestDay, diffGrams } = useMemo(() => {
    const batchLogs = dailyLogs.filter(
      (l) => l.batchId === batch.id && typeof l.averageWeightGrams === 'number' && l.averageWeightGrams > 0
    );

    const actualByDay = new Map<number, number>();
    for (const log of batchLogs) {
      actualByDay.set(log.dayNumber, log.averageWeightGrams as number);
    }

    const points: ChartPoint[] = [];
    for (let d = 1; d <= maxDay; d++) {
      points.push({
        day: d,
        dayLabel: `J${d}`,
        idealWeight: getExpectedBodyWeightGrams(d),
        actualWeight: actualByDay.get(d) ?? null,
      });
    }

    // Also include J0 chick start weight (42g) if day 1 has no actual log yet
    const sortedActual = [...batchLogs].sort((a, b) => b.dayNumber - a.dayNumber);
    const latest = sortedActual[0];
    const idealAtLatest = latest ? getExpectedBodyWeightGrams(latest.dayNumber) : getExpectedBodyWeightGrams(ageInDays);
    const diff = latest && latest.averageWeightGrams ? latest.averageWeightGrams - idealAtLatest : null;

    return {
      chartData: points,
      latestActual: latest,
      idealAtLatestDay: idealAtLatest,
      diffGrams: diff,
    };
  }, [batch.id, dailyLogs, maxDay, ageInDays]);

  const handleSaveSampleWeight = (e: React.FormEvent) => {
    e.preventDefault();
    const grams = parseInt(sampleWeight, 10);
    if (!Number.isFinite(grams) || grams <= 0) return;

    const feedType = ageInDays <= 14 ? 'demarrage' : ageInDays <= 28 ? 'croissance' : 'finition';
    addDailyLog({
      batchId: batch.id,
      dayNumber: ageInDays,
      date: new Date().toISOString().split('T')[0],
      mortality: 0,
      feedConsumedBags: 0,
      feedConsumedKg: 0,
      feedType,
      waterIntakeLiters: 0,
      averageWeightGrams: grams,
      symptoms: [],
      notes: `Pesée moyenne enregistrée (${grams} g)`,
    });

    if (isAudioEnabled) {
      speakMessage(`Pesée de ${grams} grammes enregistrée au jour ${ageInDays}.`);
    }
    setShowWeighForm(false);
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 text-emerald-400 flex items-center justify-center shrink-0">
            <Scale className="w-4 h-4" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-white leading-tight">
              Courbe de Poids : Idéal vs Réel
            </h4>
            <p className="text-[11px] text-slate-400">
              Comparaison standard ({batch.breed}) en grammes
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => {
            setSampleWeight(String(getExpectedBodyWeightGrams(ageInDays)));
            setShowWeighForm(!showWeighForm);
          }}
          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1 shrink-0 transition"
        >
          <Plus className="w-3.5 h-3.5 text-emerald-400" />
          Pesée
        </button>
      </div>

      {/* Inline Sample Weighing Form */}
      {showWeighForm && (
        <form
          onSubmit={handleSaveSampleWeight}
          className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center gap-2"
        >
          <div className="flex-1">
            <label className="block text-[10px] text-slate-400 mb-0.5">
              Poids moyen mesuré à J-{ageInDays} (en grammes)
            </label>
            <input
              type="number"
              min={30}
              max={6000}
              required
              value={sampleWeight}
              onChange={(e) => setSampleWeight(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-md bg-slate-900 border border-slate-700 text-xs text-white font-mono focus:outline-none"
            />
          </div>
          <button
            type="submit"
            className="mt-4 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-semibold flex items-center gap-1 shrink-0"
          >
            <Check className="w-3.5 h-3.5" />
            OK
          </button>
        </form>
      )}

      {/* Current Weight Summary */}
      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
          <span className="text-[10px] text-slate-400 block">Poids Réel</span>
          <strong className="text-xs text-white">
            {latestActual?.averageWeightGrams ? `${latestActual.averageWeightGrams} g` : 'Aucune pesée'}
          </strong>
          {latestActual && (
            <span className="text-[9px] text-slate-500 block">à J-{latestActual.dayNumber}</span>
          )}
        </div>
        <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
          <span className="text-[10px] text-slate-400 block">Objectif Idéal</span>
          <strong className="text-xs text-slate-200">{idealAtLatestDay} g</strong>
          <span className="text-[9px] text-slate-500 block">
            à J-{latestActual ? latestActual.dayNumber : ageInDays}
          </span>
        </div>
        <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
          <span className="text-[10px] text-slate-400 block">Écart</span>
          <strong
            className={`text-xs ${
              diffGrams === null
                ? 'text-slate-400'
                : diffGrams >= -40
                ? 'text-emerald-400'
                : 'text-amber-400'
            }`}
          >
            {diffGrams === null ? '—' : `${diffGrams >= 0 ? '+' : ''}${diffGrams} g`}
          </strong>
          <span className="text-[9px] text-slate-500 block">vs courbe</span>
        </div>
      </div>

      {/* Recharts Line Chart */}
      <div className="w-full h-52 pt-1 min-w-0">
        <ResponsiveContainer width="100%" height={200} minWidth={0}>
          <LineChart data={chartData} margin={{ top: 6, right: 10, left: -12, bottom: 2 }}>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={isLight ? '#cbd5e1' : '#1e293b'}
              vertical={false}
            />
            <XAxis
              dataKey="dayLabel"
              tick={{ fontSize: 10, fill: isLight ? '#475569' : '#94a3b8' }}
              tickLine={false}
              axisLine={{ stroke: isLight ? '#cbd5e1' : '#334155' }}
              minTickGap={16}
            />
            <YAxis
              tick={{ fontSize: 10, fill: isLight ? '#475569' : '#94a3b8' }}
              tickLine={false}
              axisLine={false}
              tickFormatter={(val) => `${val}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: isLight ? '#ffffff' : '#0f172a',
                borderColor: isLight ? '#cbd5e1' : '#334155',
                borderRadius: '0.75rem',
                fontSize: '12px',
                color: isLight ? '#0f172a' : '#f8fafc',
              }}
              labelStyle={{
                fontWeight: 700,
                marginBottom: '4px',
                color: isLight ? '#0f172a' : '#ffffff',
              }}
              formatter={(value: unknown, name: unknown) => {
                if (typeof value !== 'number') return ['—', String(name)];
                const kg = (value / 1000).toFixed(2);
                const label = name === 'idealWeight' ? 'Poids idéal' : 'Poids réel';
                return [`${value} g (${kg} kg)`, label];
              }}
              labelFormatter={(label) => `Jour ${String(label).replace('J', '')}`}
            />
            <Line
              type="monotone"
              dataKey="idealWeight"
              name="idealWeight"
              stroke={isLight ? '#64748b' : '#94a3b8'}
              strokeWidth={2}
              strokeDasharray="5 4"
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="actualWeight"
              name="actualWeight"
              stroke="#10b981"
              strokeWidth={2.5}
              connectNulls
              dot={{ r: 2.5, fill: '#10b981', strokeWidth: 0 }}
              activeDot={{ r: 5, fill: '#10b981' }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-center gap-5 text-[11px] text-slate-400 pt-1 border-t border-slate-800">
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-0.5 bg-emerald-500 inline-block rounded" />
          <span className="text-slate-200 font-medium">Poids Réel (Lot)</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-4 h-0.5 border-t-2 border-dashed border-slate-400 inline-block" />
          <span>Courbe Idéale</span>
        </div>
      </div>
    </div>
  );
};
