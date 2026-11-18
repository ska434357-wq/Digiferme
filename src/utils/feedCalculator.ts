import { FeedStock, FeedType } from '../types';

export interface DailyRationResult {
  ageInDays: number;
  birdsCount: number;
  phase: FeedType;
  phaseLabel: string;
  gramsPerBird: number;
  expectedWeightGrams: number;
  totalKgPerDay: number;
  totalBagsPerDay: number;
  bagsFor7Days: number;
  kgFor7Days: number;
  recommendedWaterLiters: number;
  stockBagsAvailable: number;
  stockAutonomyDays: number | null;
  dailyFeedCostFCFA: number;
}

// Standard broiler growth & feed consumption table (Cobb 500 / Ross 308 tropical benchmark)
// [day, dailyFeedGramsPerBird, expectedBodyWeightGrams]
const STANDARD_GROWTH_CURVE: [number, number, number][] = [
  [1, 13, 42],
  [3, 20, 75],
  [7, 35, 180],
  [10, 48, 290],
  [14, 65, 470],
  [18, 86, 710],
  [21, 104, 930],
  [25, 128, 1260],
  [28, 145, 1530],
  [32, 165, 1890],
  [35, 178, 2170],
  [38, 188, 2430],
  [42, 198, 2760],
  [45, 204, 2980],
  [50, 210, 3300],
  [56, 215, 3600],
];

function interpolateMetric(day: number, columnIndex: 1 | 2): number {
  const clampedDay = Math.max(1, Math.min(56, Math.round(day)));

  for (let i = 0; i < STANDARD_GROWTH_CURVE.length; i++) {
    const [d, feed, weight] = STANDARD_GROWTH_CURVE[i];
    if (d === clampedDay) {
      return columnIndex === 1 ? feed : weight;
    }
    if (d > clampedDay && i > 0) {
      const [prevD, prevFeed, prevWeight] = STANDARD_GROWTH_CURVE[i - 1];
      const ratio = (clampedDay - prevD) / (d - prevD);
      const prevVal = columnIndex === 1 ? prevFeed : prevWeight;
      const currVal = columnIndex === 1 ? feed : weight;
      return Math.round(prevVal + ratio * (currVal - prevVal));
    }
  }

  const last = STANDARD_GROWTH_CURVE[STANDARD_GROWTH_CURVE.length - 1];
  return columnIndex === 1 ? last[1] : last[2];
}

export function getExpectedBodyWeightGrams(ageInDays: number): number {
  return interpolateMetric(ageInDays, 2);
}

export function getFeedPhaseForDay(ageInDays: number): { phase: FeedType; phaseLabel: string } {
  if (ageInDays <= 14) {
    return { phase: 'demarrage', phaseLabel: 'Démarrage (J1 – J14)' };
  }
  if (ageInDays <= 28) {
    return { phase: 'croissance', phaseLabel: 'Croissance (J15 – J28)' };
  }
  return { phase: 'finition', phaseLabel: 'Finition (J29+)' };
}

export function calculateDailyFeedRation(
  ageInDays: number,
  birdsCount: number,
  feedStock: FeedStock,
  currentTempCelsius = 32
): DailyRationResult {
  const safeAge = Math.max(1, Math.min(56, Math.round(ageInDays || 1)));
  const safeBirds = Math.max(0, Math.round(birdsCount || 0));
  const bagWeight = feedStock.bagWeightKg > 0 ? feedStock.bagWeightKg : 50;

  const gramsPerBird = interpolateMetric(safeAge, 1);
  const expectedWeightGrams = interpolateMetric(safeAge, 2);
  const { phase, phaseLabel } = getFeedPhaseForDay(safeAge);

  const totalKgPerDay = parseFloat(((safeBirds * gramsPerBird) / 1000).toFixed(1));
  const totalBagsPerDay = parseFloat((totalKgPerDay / bagWeight).toFixed(2));
  const kgFor7Days = parseFloat((totalKgPerDay * 7).toFixed(1));
  const bagsFor7Days = parseFloat((kgFor7Days / bagWeight).toFixed(1));

  // Tropical climate adjustment: birds drink more water above 34°C
  const waterMultiplier = currentTempCelsius >= 34 ? 2.3 : 2.0;
  const recommendedWaterLiters = Math.round(totalKgPerDay * waterMultiplier);

  const stockBagsAvailable =
    phase === 'demarrage'
      ? feedStock.demarrageBags
      : phase === 'croissance'
      ? feedStock.croissanceBags
      : feedStock.finitionBags;

  const stockAutonomyDays =
    totalBagsPerDay > 0 ? Math.floor(stockBagsAvailable / totalBagsPerDay) : null;

  const bagPrice = feedStock.pricePerBagFCFA[phase] || 17800;
  const dailyFeedCostFCFA = Math.round(totalBagsPerDay * bagPrice);

  return {
    ageInDays: safeAge,
    birdsCount: safeBirds,
    phase,
    phaseLabel,
    gramsPerBird,
    expectedWeightGrams,
    totalKgPerDay,
    totalBagsPerDay,
    bagsFor7Days,
    kgFor7Days,
    recommendedWaterLiters,
    stockBagsAvailable,
    stockAutonomyDays,
    dailyFeedCostFCFA,
  };
}
