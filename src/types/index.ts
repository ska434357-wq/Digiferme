export type WestAfricanCountry = 'CI' | 'SN' | 'BF' | 'ML';

export interface CountryInfo {
  code: WestAfricanCountry;
  name: string;
  flag: string;
  currency: string;
  defaultTemp: number;
}

export type BroilerBreed = 'Cobb 500' | 'Ross 308' | 'Hubbard' | 'Goliath' | 'Autre';

export interface DailyLog {
  id: string;
  batchId: string;
  dayNumber: number; // J1 à J45
  date: string; // ISO date YYYY-MM-DD
  mortality: number;
  mortalityCause?: string;
  feedConsumedBags: number; // e.g. 1.5 sacs
  feedConsumedKg: number; // e.g. 75 kg
  feedType: 'demarrage' | 'croissance' | 'finition';
  waterIntakeLiters: number;
  averageWeightGrams?: number; // Sample weighing
  temperatureCelsius?: number;
  symptoms: string[]; // e.g. ['Fientes blanches', 'Respiration bruyante']
  notes?: string;
  timestamp: number;
}

export interface VaccineEvent {
  id: string;
  day: number;
  name: string;
  type: 'vaccine' | 'vitamin' | 'anticoccidial' | 'dewormer';
  disease: string;
  administrationMethod: 'eau' | 'goutte_oeil' | 'aliment';
  description: string;
  criticalTips: string;
  completed: boolean;
  completedDate?: string;
}

export interface Batch {
  id: string;
  name: string; // e.g. "Lot 04 - Bâtiment A"
  startDate: string; // ISO date YYYY-MM-DD
  initialChicks: number;
  pricePerChickFCFA: number;
  breed: BroilerBreed;
  supplier: string; // e.g. "SIPRA", "FOANI", "Couvoir Bafing"
  targetHarvestDay: number; // typically 38 to 45 days
  targetWeightKg: number; // e.g. 2.0 kg
  notes?: string;
  status: 'active' | 'completed' | 'archived';
}

export type FeedType = 'demarrage' | 'croissance' | 'finition';

export interface FeedStock {
  demarrageBags: number;
  croissanceBags: number;
  finitionBags: number;
  bagWeightKg: number; // typically 50kg
  pricePerBagFCFA: {
    demarrage: number;
    croissance: number;
    finition: number;
  };
}

export type CashFlowCategory =
  | 'poussin'
  | 'aliment'
  | 'vaccin_sante'
  | 'copeaux_sciure'
  | 'chauffage_gaz_charbon'
  | 'transport'
  | 'main_oeuvre'
  | 'vente_poulets'
  | 'autre';

export interface CashFlowEntry {
  id: string;
  batchId: string;
  type: 'depense' | 'vente';
  category: CashFlowCategory;
  label: string;
  amountFCFA: number;
  quantity?: number; // e.g. 50 poulets vendus ou 4 sacs
  paymentMethod: 'cash' | 'wave' | 'orange_money' | 'mtn_momo' | 'moov';
  date: string;
  timestamp: number;
}

export interface SyncMutation {
  id: string;
  entity: 'batch' | 'dailyLog' | 'stock' | 'cashflow' | 'vaccine';
  action: 'create' | 'update' | 'delete';
  data: any;
  timestamp: number;
}

export type SubscriptionPlan = 'mensuel' | 'trimestriel' | 'annuel';
export type SubscriptionStatus = 'active' | 'suspended' | 'expired';
export type SaaSPaymentMethod = 'wave' | 'orange_money' | 'mtn_momo' | 'moov_money' | 'cash';

export interface SaaSUserAccount {
  id: string;
  code: string;
  farmerName: string;
  farmName: string;
  phone: string;
  country: WestAfricanCountry;
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  paymentMethod: SaaSPaymentMethod;
  amountFCFA: number;
  durationDays: number;
  createdAtMs: number;
  expiresAtMs: number;
  lastLoginAtMs?: number;
}

export interface UserWorkspaceSnapshot {
  batches: Batch[];
  activeBatchId: string;
  dailyLogs: DailyLog[];
  vaccineEvents: Record<string, VaccineEvent[]>;
  feedStock: FeedStock;
  cashFlow: CashFlowEntry[];
  country: WestAfricanCountry;
  isAudioEnabled: boolean;
  heatAlertThreshold: number;
  currentSimulatedTemp: number;
  themeMode: 'dark' | 'light';
  updatedAtMs: number;
}

