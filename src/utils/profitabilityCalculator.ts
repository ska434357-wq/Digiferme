import { Batch, CashFlowEntry, DailyLog, FeedStock, FeedType, WestAfricanCountry } from '../types';
import { calculateDailyFeedRation, getExpectedBodyWeightGrams, getFeedPhaseForDay } from './feedCalculator';
import { getBatchAgeInDays } from './formatters';

export interface MarketPreset {
  country: WestAfricanCountry;
  label: string;
  pricePerKgFCFA: number;
  typicalWeightKg: number;
}

export const WEST_AFRICA_MARKET_DEFAULTS: Record<WestAfricanCountry, MarketPreset> = {
  CI: { country: 'CI', label: "Côte d'Ivoire (Marché vif)", pricePerKgFCFA: 1350, typicalWeightKg: 2.2 },
  SN: { country: 'SN', label: 'Sénégal (Marché vif)', pricePerKgFCFA: 1450, typicalWeightKg: 2.1 },
  BF: { country: 'BF', label: 'Burkina Faso (Marché vif)', pricePerKgFCFA: 1300, typicalWeightKg: 2.0 },
  ML: { country: 'ML', label: 'Mali (Marché vif)', pricePerKgFCFA: 1350, typicalWeightKg: 2.0 },
};

export function getDefaultMarketPricePerKg(country: WestAfricanCountry): number {
  return WEST_AFRICA_MARKET_DEFAULTS[country]?.pricePerKgFCFA ?? 1350;
}

export interface ProfitabilityProjectionResult {
  hasBatch: boolean;
  batchName: string;
  currentAgeDays: number;
  targetHarvestDay: number;
  daysRemaining: number;
  birdsAlive: number;
  // Weight & market forecasts
  standardWeightKgAtHarvest: number;
  projectedWeightKgPerBird: number;
  growthIndexPercent: number; // e.g., +4 or -3 vs standard curve based on real weighings
  hasRealWeighing: boolean;
  marketPricePerKgFCFA: number;
  projectedPricePerBirdFCFA: number;
  totalProjectedBiomassKg: number;
  // Feed costs (entered + remaining shortfall)
  enteredFeedCostFCFA: number;
  otherEnteredCostsFCFA: number;
  totalEnteredCostsFCFA: number;
  remainingFeedKgNeeded: number;
  remainingFeedBagsToBuy: number;
  remainingFeedCostToBuyFCFA: number;
  totalProjectedFeedCostFCFA: number;
  totalProjectedCostFCFA: number;
  // Revenue & Profit
  projectedGrossRevenueFCFA: number;
  alreadyRecordedSalesFCFA: number;
  projectedNetProfitFCFA: number;
  projectedProfitPerBirdFCFA: number;
  projectedMarginPercent: number;
  roiPercent: number;
  breakEvenPricePerKgFCFA: number;
  breakEvenCostPerBirdFCFA: number;
  status: 'profitable' | 'tight' | 'loss';
}

export function calculateEndCycleProfitability(params: {
  batch: Batch | undefined;
  dailyLogs: DailyLog[];
  cashFlow: CashFlowEntry[];
  feedStock: FeedStock;
  country: WestAfricanCountry;
  marketPricePerKgFCFA?: number;
  targetHarvestDay?: number;
  customWeightKgPerBird?: number | null;
}): ProfitabilityProjectionResult {
  const {
    batch,
    dailyLogs,
    cashFlow,
    feedStock,
    country,
    marketPricePerKgFCFA = getDefaultMarketPricePerKg(country),
    customWeightKgPerBird = null,
  } = params;

  const safeMarketPrice = Math.max(0, Math.round(marketPricePerKgFCFA || 0));

  if (!batch) {
    return {
      hasBatch: false,
      batchName: 'Aucun lot actif',
      currentAgeDays: 0,
      targetHarvestDay: 42,
      daysRemaining: 0,
      birdsAlive: 0,
      standardWeightKgAtHarvest: 2.76,
      projectedWeightKgPerBird: 2.76,
      growthIndexPercent: 0,
      hasRealWeighing: false,
      marketPricePerKgFCFA: safeMarketPrice,
      projectedPricePerBirdFCFA: 0,
      totalProjectedBiomassKg: 0,
      enteredFeedCostFCFA: 0,
      otherEnteredCostsFCFA: 0,
      totalEnteredCostsFCFA: 0,
      remainingFeedKgNeeded: 0,
      remainingFeedBagsToBuy: 0,
      remainingFeedCostToBuyFCFA: 0,
      totalProjectedFeedCostFCFA: 0,
      totalProjectedCostFCFA: 0,
      projectedGrossRevenueFCFA: 0,
      alreadyRecordedSalesFCFA: 0,
      projectedNetProfitFCFA: 0,
      projectedProfitPerBirdFCFA: 0,
      projectedMarginPercent: 0,
      roiPercent: 0,
      breakEvenPricePerKgFCFA: 0,
      breakEvenCostPerBirdFCFA: 0,
      status: 'tight',
    };
  }

  const currentAgeDays = getBatchAgeInDays(batch.startDate);
  const safeTargetDay = Math.max(
    currentAgeDays,
    Math.min(56, Math.round(params.targetHarvestDay ?? batch.targetHarvestDay ?? 42))
  );
  const daysRemaining = Math.max(0, safeTargetDay - currentAgeDays);

  const batchLogs = dailyLogs.filter((l) => l.batchId === batch.id);
  const totalMortality = batchLogs.reduce((sum, l) => sum + (l.mortality || 0), 0);
  const birdsAlive = Math.max(0, batch.initialChicks - totalMortality);

  // Real growth index from latest sample weighing vs Cobb500/Ross308 tropical standard
  const latestWeightLog = [...batchLogs]
    .sort((a, b) => b.dayNumber - a.dayNumber)
    .find((l) => l.averageWeightGrams && l.averageWeightGrams > 0);

  let growthRatio = 1;
  if (latestWeightLog?.averageWeightGrams) {
    const stdAtLogDay = Math.max(40, getExpectedBodyWeightGrams(latestWeightLog.dayNumber));
    growthRatio = Math.max(0.75, Math.min(1.25, latestWeightLog.averageWeightGrams / stdAtLogDay));
  }

  const standardWeightKgAtHarvest = parseFloat(
    (getExpectedBodyWeightGrams(safeTargetDay) / 1000).toFixed(2)
  );
  const autoProjectedWeightKg = parseFloat((standardWeightKgAtHarvest * growthRatio).toFixed(2));
  const projectedWeightKgPerBird =
    customWeightKgPerBird !== null && customWeightKgPerBird > 0
      ? parseFloat(customWeightKgPerBird.toFixed(2))
      : autoProjectedWeightKg;

  const growthIndexPercent = Math.round((growthRatio - 1) * 100);

  // Entered costs for this batch (separating feed vs chicks/health/other)
  const batchCashFlow = cashFlow.filter((c) => c.batchId === batch.id);
  const enteredFeedCostFCFA = batchCashFlow
    .filter((c) => c.type === 'depense' && c.category === 'aliment')
    .reduce((sum, c) => sum + (c.amountFCFA || 0), 0);

  const otherEnteredCostsFCFA = batchCashFlow
    .filter((c) => c.type === 'depense' && c.category !== 'aliment')
    .reduce((sum, c) => sum + (c.amountFCFA || 0), 0);

  const totalEnteredCostsFCFA = enteredFeedCostFCFA + otherEnteredCostsFCFA;
  const alreadyRecordedSalesFCFA = batchCashFlow
    .filter((c) => c.type === 'vente')
    .reduce((sum, c) => sum + (c.amountFCFA || 0), 0);

  // Remaining feed requirements from (currentAgeDays + 1) to safeTargetDay
  const remainingKgByPhase: Record<FeedType, number> = {
    demarrage: 0,
    croissance: 0,
    finition: 0,
  };

  for (let day = currentAgeDays + 1; day <= safeTargetDay; day++) {
    const ration = calculateDailyFeedRation(day, birdsAlive, feedStock);
    const { phase } = getFeedPhaseForDay(day);
    remainingKgByPhase[phase] += ration.totalKgPerDay;
  }

  const bagWeightKg = feedStock.bagWeightKg > 0 ? feedStock.bagWeightKg : 50;
  const remainingFeedKgNeeded = parseFloat(
    (
      remainingKgByPhase.demarrage +
      remainingKgByPhase.croissance +
      remainingKgByPhase.finition
    ).toFixed(1)
  );

  // Subtract feed bags already available in farm store to avoid double-counting paid stock
  const availableBagsByPhase: Record<FeedType, number> = {
    demarrage: Math.max(0, feedStock.demarrageBags || 0),
    croissance: Math.max(0, feedStock.croissanceBags || 0),
    finition: Math.max(0, feedStock.finitionBags || 0),
  };

  let remainingFeedBagsToBuy = 0;
  let remainingFeedCostToBuyFCFA = 0;

  (['demarrage', 'croissance', 'finition'] as FeedType[]).forEach((phase) => {
    const bagsNeeded = remainingKgByPhase[phase] / bagWeightKg;
    const bagsShortfall = Math.max(0, bagsNeeded - availableBagsByPhase[phase]);
    remainingFeedBagsToBuy += bagsShortfall;
    remainingFeedCostToBuyFCFA += bagsShortfall * (feedStock.pricePerBagFCFA[phase] || 17500);
  });

  remainingFeedBagsToBuy = parseFloat(remainingFeedBagsToBuy.toFixed(1));
  remainingFeedCostToBuyFCFA = Math.round(remainingFeedCostToBuyFCFA);

  const totalProjectedFeedCostFCFA = enteredFeedCostFCFA + remainingFeedCostToBuyFCFA;
  const totalProjectedCostFCFA = totalEnteredCostsFCFA + remainingFeedCostToBuyFCFA;

  // Projected revenue & profitability
  const totalProjectedBiomassKg = parseFloat((birdsAlive * projectedWeightKgPerBird).toFixed(1));
  const projectedPricePerBirdFCFA = Math.round(projectedWeightKgPerBird * safeMarketPrice);
  const projectedGrossRevenueFCFA = Math.round(totalProjectedBiomassKg * safeMarketPrice);

  const projectedNetProfitFCFA = projectedGrossRevenueFCFA - totalProjectedCostFCFA;
  const projectedProfitPerBirdFCFA =
    birdsAlive > 0 ? Math.round(projectedNetProfitFCFA / birdsAlive) : 0;

  const projectedMarginPercent =
    projectedGrossRevenueFCFA > 0
      ? parseFloat(((projectedNetProfitFCFA / projectedGrossRevenueFCFA) * 100).toFixed(1))
      : 0;

  const roiPercent =
    totalProjectedCostFCFA > 0
      ? parseFloat(((projectedNetProfitFCFA / totalProjectedCostFCFA) * 100).toFixed(1))
      : 0;

  const breakEvenPricePerKgFCFA =
    totalProjectedBiomassKg > 0 ? Math.ceil(totalProjectedCostFCFA / totalProjectedBiomassKg) : 0;

  const breakEvenCostPerBirdFCFA =
    birdsAlive > 0 ? Math.ceil(totalProjectedCostFCFA / birdsAlive) : 0;

  let status: ProfitabilityProjectionResult['status'] = 'profitable';
  if (projectedNetProfitFCFA < 0) {
    status = 'loss';
  } else if (projectedMarginPercent < 12) {
    status = 'tight';
  }

  return {
    hasBatch: true,
    batchName: batch.name,
    currentAgeDays,
    targetHarvestDay: safeTargetDay,
    daysRemaining,
    birdsAlive,
    standardWeightKgAtHarvest,
    projectedWeightKgPerBird,
    growthIndexPercent,
    hasRealWeighing: Boolean(latestWeightLog?.averageWeightGrams),
    marketPricePerKgFCFA: safeMarketPrice,
    projectedPricePerBirdFCFA,
    totalProjectedBiomassKg,
    enteredFeedCostFCFA,
    otherEnteredCostsFCFA,
    totalEnteredCostsFCFA,
    remainingFeedKgNeeded,
    remainingFeedBagsToBuy,
    remainingFeedCostToBuyFCFA,
    totalProjectedFeedCostFCFA,
    totalProjectedCostFCFA,
    projectedGrossRevenueFCFA,
    alreadyRecordedSalesFCFA,
    projectedNetProfitFCFA,
    projectedProfitPerBirdFCFA,
    projectedMarginPercent,
    roiPercent,
    breakEvenPricePerKgFCFA,
    breakEvenCostPerBirdFCFA,
    status,
  };
}
