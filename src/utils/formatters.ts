import { Batch, DailyLog, CashFlowEntry, FeedStock } from '../types';

export function formatFCFA(amount: number): string {
  const rounded = Math.round(amount);
  return `${rounded.toLocaleString('fr-FR')} FCFA`;
}

export function getBatchAgeInDays(startDate: string): number {
  if (!startDate) return 1;
  const start = new Date(startDate).getTime();
  const now = new Date().getTime();
  const diffDays = Math.floor((now - start) / (1000 * 60 * 60 * 24)) + 1;
  return Math.max(1, diffDays);
}

export interface BatchMetrics {
  ageInDays: number;
  initialChicks: number;
  birdsAlive: number;
  totalMortality: number;
  mortalityRatePercent: number;
  totalFeedKgConsumed: number;
  totalFeedBagsConsumed: number;
  averageWeightGrams: number;
  feedConversionRatio: number; // FCR (Indice de Consommation)
  totalExpensesFCFA: number;
  totalRevenueFCFA: number;
  netProfitFCFA: number;
  costPerChickenFCFA: number; // Coût de revient par sujet vivant
  projectedProfitAtSaleFCFA: number;
  healthScore: number; // 0 - 100
  healthStatus: 'green' | 'orange' | 'red';
  healthStatusLabel: string;
  healthDiagnostic: string;
}

export function calculateBatchMetrics(
  batch: Batch | undefined,
  logs: DailyLog[],
  cashFlow: CashFlowEntry[],
  currentTemp: number = 32
): BatchMetrics {
  if (!batch) {
    return {
      ageInDays: 0,
      initialChicks: 0,
      birdsAlive: 0,
      totalMortality: 0,
      mortalityRatePercent: 0,
      totalFeedKgConsumed: 0,
      totalFeedBagsConsumed: 0,
      averageWeightGrams: 0,
      feedConversionRatio: 0,
      totalExpensesFCFA: 0,
      totalRevenueFCFA: 0,
      netProfitFCFA: 0,
      costPerChickenFCFA: 0,
      projectedProfitAtSaleFCFA: 0,
      healthScore: 100,
      healthStatus: 'green',
      healthStatusLabel: 'Prêt',
      healthDiagnostic: 'Créez votre premier lot pour démarrer le suivi.',
    };
  }

  const batchLogs = logs.filter((l) => l.batchId === batch.id);
  const batchCashFlow = cashFlow.filter((c) => c.batchId === batch.id);

  const ageInDays = getBatchAgeInDays(batch.startDate);

  // Mortality
  const totalMortality = batchLogs.reduce((acc, log) => acc + (log.mortality || 0), 0);
  const birdsAlive = Math.max(0, batch.initialChicks - totalMortality);
  const mortalityRatePercent = parseFloat(
    ((totalMortality / (batch.initialChicks || 1)) * 100).toFixed(1)
  );

  // Feed consumption
  const totalFeedKgConsumed = batchLogs.reduce((acc, log) => acc + (log.feedConsumedKg || 0), 0);
  const totalFeedBagsConsumed = parseFloat((totalFeedKgConsumed / 50).toFixed(1));

  // Weight estimation
  // Latest weight from logs or dynamic standard curve
  const latestLogWithWeight = [...batchLogs]
    .sort((a, b) => b.dayNumber - a.dayNumber)
    .find((l) => l.averageWeightGrams && l.averageWeightGrams > 0);

  const averageWeightGrams = latestLogWithWeight?.averageWeightGrams
    ? latestLogWithWeight.averageWeightGrams
    : Math.round(42 + Math.pow(Math.min(ageInDays, 45), 1.96) * 2.3);

  // FCR = total Feed (kg) / (total live bird biomass + mortality biomass gain)
  const currentTotalBiomassKg = (birdsAlive * (averageWeightGrams / 1000));
  const feedConversionRatio =
    currentTotalBiomassKg > 0
      ? parseFloat((totalFeedKgConsumed / currentTotalBiomassKg).toFixed(2))
      : 1.6;

  // Expenses & Revenues
  const totalExpensesFCFA = batchCashFlow
    .filter((c) => c.type === 'depense')
    .reduce((acc, c) => acc + c.amountFCFA, 0);

  const totalRevenueFCFA = batchCashFlow
    .filter((c) => c.type === 'vente')
    .reduce((acc, c) => acc + c.amountFCFA, 0);

  const netProfitFCFA = totalRevenueFCFA - totalExpensesFCFA;

  // Cost per chicken = Total expenses / Birds alive
  const costPerChickenFCFA =
    birdsAlive > 0 ? Math.round(totalExpensesFCFA / birdsAlive) : 0;

  // Projected profit if sold at 2,400 FCFA average market price in West Africa
  const estimatedSellingPrice = 2400;
  const projectedRevenueAtEnd = birdsAlive * estimatedSellingPrice;
  // projected additional feed to reach J42
  const daysLeft = Math.max(0, batch.targetHarvestDay - ageInDays);
  const estimatedRemainingFeedCost = daysLeft * birdsAlive * 0.15 * (17500 / 50); // ~150g/day at 350 FCFA/kg
  const projectedTotalExpense = totalExpensesFCFA + estimatedRemainingFeedCost;
  const projectedProfitAtSaleFCFA = Math.round(projectedRevenueAtEnd - projectedTotalExpense);

  // Health Score Calculation (0 to 100)
  // Base 100
  // Mortality deductions:
  // West African standard: <3% is excellent, 3-5% is acceptable, >5% is alarming
  let healthScore = 100;
  if (mortalityRatePercent <= 2.5) {
    healthScore -= mortalityRatePercent * 4;
  } else if (mortalityRatePercent <= 5.0) {
    healthScore -= 10 + (mortalityRatePercent - 2.5) * 8;
  } else {
    healthScore -= 30 + (mortalityRatePercent - 5.0) * 12;
  }

  // Heat penalty if > 35°C
  if (currentTemp >= 38) {
    healthScore -= 12;
  } else if (currentTemp >= 35) {
    healthScore -= 6;
  }

  healthScore = Math.max(15, Math.min(100, Math.round(healthScore)));

  let healthStatus: 'green' | 'orange' | 'red' = 'green';
  let healthStatusLabel = 'Excellente Forme';
  let healthDiagnostic = 'Taux de survie optimal (supérieur à 96%). La croissance suit la courbe normale.';

  if (healthScore >= 80) {
    healthStatus = 'green';
    healthStatusLabel = 'Très Bonne Santé';
    healthDiagnostic = 'Mortalité basse et bonne dynamique. Surveillez l\'aération aux heures chaudes.';
  } else if (healthScore >= 60) {
    healthStatus = 'orange';
    healthStatusLabel = 'Vigilance Requise';
    healthDiagnostic = 'Légère hausse de mortalité ou stress thermique. Vérifiez l\'eau, la litière et les fientes.';
  } else {
    healthStatus = 'red';
    healthStatusLabel = 'Alerte Sanitaire';
    healthDiagnostic = 'Mortalité critique (> 5%) ou forte surchauffe. Contacter immédiatement un vétérinaire.';
  }

  return {
    ageInDays,
    initialChicks: batch.initialChicks,
    birdsAlive,
    totalMortality,
    mortalityRatePercent,
    totalFeedKgConsumed,
    totalFeedBagsConsumed,
    averageWeightGrams,
    feedConversionRatio: Math.max(1.0, feedConversionRatio),
    totalExpensesFCFA,
    totalRevenueFCFA,
    netProfitFCFA,
    costPerChickenFCFA,
    projectedProfitAtSaleFCFA,
    healthScore,
    healthStatus,
    healthStatusLabel,
    healthDiagnostic,
  };
}
