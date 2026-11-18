import { create } from 'zustand';
import {
  Batch,
  DailyLog,
  VaccineEvent,
  FeedStock,
  CashFlowEntry,
  WestAfricanCountry,
  SyncMutation,
  SaaSUserAccount,
  UserWorkspaceSnapshot,
} from '../types';
import { STANDARD_PROPHYLAXIS } from '../data/standardProphylaxis';
import { syncWorkspaceToFirestore } from '../services/cloudSyncService';
import { auth } from '../lib/firebase';

const SESSION_STORAGE_KEY = 'fermefacile-active-session-v1';
const workspaceStorageKey = (userId: string) => `fermefacile-ws-${userId}`;

function safeGetItem(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSetItem(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Ignore storage quota or iframe restrictions
  }
}

function safeRemoveItem(key: string): void {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // Ignore storage restrictions
  }
}

const DEFAULT_FEED_STOCK: FeedStock = {
  demarrageBags: 0,
  croissanceBags: 0,
  finitionBags: 0,
  bagWeightKg: 50,
  pricePerBagFCFA: {
    demarrage: 18500,
    croissance: 17800,
    finition: 17200,
  },
};

function buildDemoWorkspace(farmName = 'Ma Ferme', country: WestAfricanCountry = 'CI'): UserWorkspaceSnapshot {
  const batchId = `batch-demo-${Date.now()}`;
  const startDate = new Date(Date.now() - 18 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const logs: DailyLog[] = [];
  const start = new Date(startDate);
  let totalMortality = 0;
  const mortalityByDay = [2, 1, 1, 0, 1, 0, 1, 0, 0, 1, 0, 1, 0, 0, 1, 0, 0, 0];

  for (let i = 0; i < 18; i++) {
    const logDate = new Date(start);
    logDate.setDate(logDate.getDate() + i);
    const dayNum = i + 1;
    const mort = mortalityByDay[i] ?? 0;
    totalMortality += mort;
    const feedType: 'demarrage' | 'croissance' | 'finition' = dayNum <= 14 ? 'demarrage' : 'croissance';
    const gramsPerBird = Math.min(125, Math.floor(15 + dayNum * 4.5));
    const birdsAlive = 400 - totalMortality;
    const totalKg = Math.round((birdsAlive * gramsPerBird) / 1000);
    const bags = parseFloat((totalKg / 50).toFixed(2));

    logs.push({
      id: `log-${batchId}-j${dayNum}`,
      batchId,
      dayNumber: dayNum,
      date: logDate.toISOString().split('T')[0],
      mortality: mort,
      feedConsumedBags: bags,
      feedConsumedKg: totalKg,
      feedType,
      waterIntakeLiters: Math.round(totalKg * 2.2),
      averageWeightGrams: Math.round(42 + Math.pow(dayNum, 1.95) * 2.4),
      temperatureCelsius: 33 + (i % 4),
      symptoms: [],
      timestamp: logDate.getTime(),
    });
  }

  return {
    batches: [
      {
        id: batchId,
        name: `Lot #01 - ${farmName}`,
        startDate,
        initialChicks: 400,
        pricePerChickFCFA: 550,
        breed: 'Cobb 500',
        supplier: 'Couvoir Local',
        targetHarvestDay: 42,
        targetWeightKg: 2.2,
        notes: 'Lot de démonstration.',
        status: 'active',
      },
    ],
    activeBatchId: batchId,
    dailyLogs: logs,
    vaccineEvents: {
      [batchId]: JSON.parse(JSON.stringify(STANDARD_PROPHYLAXIS)),
    },
    feedStock: {
      demarrageBags: 2,
      croissanceBags: 7,
      finitionBags: 10,
      bagWeightKg: 50,
      pricePerBagFCFA: {
        demarrage: 18500,
        croissance: 17800,
        finition: 17200,
      },
    },
    cashFlow: [
      {
        id: `cf-demo-${Date.now()}`,
        batchId,
        type: 'depense',
        category: 'poussin',
        label: '400 Poussins d\'un jour Cobb 500',
        amountFCFA: 400 * 550,
        quantity: 400,
        paymentMethod: 'wave',
        date: startDate,
        timestamp: Date.now() - 18 * 86400000,
      },
    ],
    country,
    isAudioEnabled: true,
    heatAlertThreshold: 35,
    currentSimulatedTemp: 37,
    themeMode: 'dark',
    updatedAtMs: Date.now(),
  };
}

interface PoultryState {
  currentUser: SaaSUserAccount | null;
  adminToken: string | null;
  isAdminPreview: boolean;
  batches: Batch[];
  activeBatchId: string;
  dailyLogs: DailyLog[];
  vaccineEvents: Record<string, VaccineEvent[]>;
  feedStock: FeedStock;
  cashFlow: CashFlowEntry[];
  country: WestAfricanCountry;
  isAudioEnabled: boolean;
  syncQueue: SyncMutation[];
  lastSyncTime: number | null;
  heatAlertThreshold: number;
  currentSimulatedTemp: number;
  themeMode: 'dark' | 'light';

  // SaaS Session Actions
  loadUserSession: (
    account: SaaSUserAccount,
    serverWorkspace?: Partial<UserWorkspaceSnapshot>,
    options?: { isAdminPreview?: boolean; adminToken?: string | null }
  ) => void;
  setAdminToken: (token: string | null) => void;
  updateCurrentUserAccount: (account: SaaSUserAccount) => void;
  logoutUser: () => void;

  // Farm Actions
  setThemeMode: (mode: 'dark' | 'light') => void;
  toggleThemeMode: () => void;
  setActiveBatchId: (id: string) => void;
  createBatch: (batchData: Omit<Batch, 'id' | 'status'>) => Batch;
  updateBatch: (id: string, updates: Partial<Batch>) => void;
  addDailyLog: (log: Omit<DailyLog, 'id' | 'timestamp'>) => void;
  toggleVaccine: (batchId: string, vaccineId: string) => void;
  updateFeedStock: (newStock: Partial<FeedStock>) => void;
  restockFeed: (
    type: 'demarrage' | 'croissance' | 'finition',
    bags: number,
    pricePerBagFCFA: number,
    paymentMethod: CashFlowEntry['paymentMethod']
  ) => void;
  addCashFlow: (entry: Omit<CashFlowEntry, 'id' | 'timestamp'>) => void;
  setCountry: (country: WestAfricanCountry) => void;
  toggleAudio: () => void;
  setSimulatedTemp: (temp: number) => void;
  syncQueueToServer: () => Promise<boolean>;
  resetToDemoData: () => void;
}

function extractSnapshot(state: PoultryState): UserWorkspaceSnapshot {
  return {
    batches: state.batches,
    activeBatchId: state.activeBatchId,
    dailyLogs: state.dailyLogs,
    vaccineEvents: state.vaccineEvents,
    feedStock: state.feedStock,
    cashFlow: state.cashFlow,
    country: state.country,
    isAudioEnabled: state.isAudioEnabled,
    heatAlertThreshold: state.heatAlertThreshold,
    currentSimulatedTemp: state.currentSimulatedTemp,
    themeMode: state.themeMode,
    updatedAtMs: Date.now(),
  };
}

let syncDebounceTimer: ReturnType<typeof setTimeout> | null = null;

function persistUserWorkspace(state: PoultryState, immediateServerSync = false): void {
  const user = state.currentUser;
  if (!user) return;

  const snapshot = extractSnapshot(state);
  safeSetItem(workspaceStorageKey(user.id), JSON.stringify(snapshot));
  safeSetItem(
    SESSION_STORAGE_KEY,
    JSON.stringify({ account: user, isAdminPreview: state.isAdminPreview })
  );

  const pushToServer = async () => {
    try {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'x-access-code': user.code,
      };
      if (state.adminToken) {
        headers['x-admin-token'] = state.adminToken;
      }
      const res = await fetch(`/api/workspace/${encodeURIComponent(user.id)}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(snapshot),
      });
      if (res.ok) {
        usePoultryStore.setState({ syncQueue: [], lastSyncTime: Date.now() });
      }
    } catch {
      // Offline: keep in localStorage and syncQueue for later
    }

    if (auth.currentUser?.emailVerified) {
      try {
        await syncWorkspaceToFirestore(user, snapshot);
      } catch {
        // Cloud sync best-effort without blocking offline UX
      }
    }
  };

  if (immediateServerSync) {
    if (syncDebounceTimer) {
      clearTimeout(syncDebounceTimer);
      syncDebounceTimer = null;
    }
    void pushToServer();
    return;
  }

  if (syncDebounceTimer) clearTimeout(syncDebounceTimer);
  syncDebounceTimer = setTimeout(() => {
    void pushToServer();
  }, 600);
}

// Restore previously logged-in user session on cold boot (supports 100% offline reload!)
function getBootState(): {
  currentUser: SaaSUserAccount | null;
  isAdminPreview: boolean;
  workspace: UserWorkspaceSnapshot;
} {
  const emptyWs: UserWorkspaceSnapshot = {
    batches: [],
    activeBatchId: '',
    dailyLogs: [],
    vaccineEvents: {},
    feedStock: DEFAULT_FEED_STOCK,
    cashFlow: [],
    country: 'CI',
    isAudioEnabled: true,
    heatAlertThreshold: 35,
    currentSimulatedTemp: 35,
    themeMode: 'dark',
    updatedAtMs: 0,
  };

  const rawSession = safeGetItem(SESSION_STORAGE_KEY);
  if (!rawSession) {
    return { currentUser: null, isAdminPreview: false, workspace: emptyWs };
  }

  try {
    const parsedSession = JSON.parse(rawSession) as {
      account?: SaaSUserAccount;
      isAdminPreview?: boolean;
    };
    const account = parsedSession?.account;
    if (!account || !account.id) {
      return { currentUser: null, isAdminPreview: false, workspace: emptyWs };
    }

    // If subscription expired locally and not admin preview, require re-login
    if (!parsedSession.isAdminPreview && Date.now() > account.expiresAtMs) {
      return { currentUser: null, isAdminPreview: false, workspace: emptyWs };
    }

    const rawWs = safeGetItem(workspaceStorageKey(account.id));
    if (rawWs) {
      const parsedWs = JSON.parse(rawWs) as Partial<UserWorkspaceSnapshot>;
      return {
        currentUser: account,
        isAdminPreview: Boolean(parsedSession.isAdminPreview),
        workspace: {
          ...emptyWs,
          ...parsedWs,
          batches: Array.isArray(parsedWs.batches) ? parsedWs.batches : [],
          dailyLogs: Array.isArray(parsedWs.dailyLogs) ? parsedWs.dailyLogs : [],
          cashFlow: Array.isArray(parsedWs.cashFlow) ? parsedWs.cashFlow : [],
          vaccineEvents:
            parsedWs.vaccineEvents && typeof parsedWs.vaccineEvents === 'object'
              ? parsedWs.vaccineEvents
              : {},
          feedStock:
            parsedWs.feedStock && typeof parsedWs.feedStock === 'object'
              ? { ...DEFAULT_FEED_STOCK, ...parsedWs.feedStock }
              : DEFAULT_FEED_STOCK,
          themeMode: parsedWs.themeMode === 'light' ? 'light' : 'dark',
        },
      };
    }

    return {
      currentUser: account,
      isAdminPreview: Boolean(parsedSession.isAdminPreview),
      workspace: { ...emptyWs, country: account.country },
    };
  } catch {
    return { currentUser: null, isAdminPreview: false, workspace: emptyWs };
  }
}

const BOOT = getBootState();

export const usePoultryStore = create<PoultryState>((set, get) => ({
  currentUser: BOOT.currentUser,
  adminToken: null,
  isAdminPreview: BOOT.isAdminPreview,
  batches: BOOT.workspace.batches,
  activeBatchId: BOOT.workspace.activeBatchId,
  dailyLogs: BOOT.workspace.dailyLogs,
  vaccineEvents: BOOT.workspace.vaccineEvents,
  feedStock: BOOT.workspace.feedStock,
  cashFlow: BOOT.workspace.cashFlow,
  country: BOOT.workspace.country,
  isAudioEnabled: BOOT.workspace.isAudioEnabled,
  syncQueue: [],
  lastSyncTime: Date.now(),
  heatAlertThreshold: BOOT.workspace.heatAlertThreshold,
  currentSimulatedTemp: BOOT.workspace.currentSimulatedTemp,
  themeMode: BOOT.workspace.themeMode,

  setAdminToken: (token) => set({ adminToken: token }),

  loadUserSession: (account, serverWorkspace, options) => {
    const isAdminPreview = Boolean(options?.isAdminPreview);
    const nextAdminToken = options?.adminToken !== undefined ? options.adminToken : get().adminToken;

    // Check if there is a newer local offline cache for THIS specific user
    let localWs: Partial<UserWorkspaceSnapshot> | null = null;
    const rawLocal = safeGetItem(workspaceStorageKey(account.id));
    if (rawLocal) {
      try {
        localWs = JSON.parse(rawLocal) as Partial<UserWorkspaceSnapshot>;
      } catch {
        localWs = null;
      }
    }

    const serverUpdated = serverWorkspace?.updatedAtMs || 0;
    const localUpdated = localWs?.updatedAtMs || 0;
    const chosen = localUpdated > serverUpdated && localWs ? localWs : serverWorkspace || localWs || {};

    const batches = Array.isArray(chosen.batches) ? chosen.batches : [];
    const activeBatchId =
      typeof chosen.activeBatchId === 'string' && batches.some((b) => b.id === chosen.activeBatchId)
        ? chosen.activeBatchId
        : batches[0]?.id || '';

    // Ensure every batch has vaccine events initialized
    const vaccineEvents: Record<string, VaccineEvent[]> =
      chosen.vaccineEvents && typeof chosen.vaccineEvents === 'object' ? { ...chosen.vaccineEvents } : {};
    for (const b of batches) {
      if (!vaccineEvents[b.id]) {
        vaccineEvents[b.id] = JSON.parse(JSON.stringify(STANDARD_PROPHYLAXIS));
      }
    }

    set({
      currentUser: account,
      adminToken: nextAdminToken,
      isAdminPreview,
      batches,
      activeBatchId,
      dailyLogs: Array.isArray(chosen.dailyLogs) ? chosen.dailyLogs : [],
      vaccineEvents,
      feedStock:
        chosen.feedStock && typeof chosen.feedStock === 'object'
          ? { ...DEFAULT_FEED_STOCK, ...chosen.feedStock }
          : DEFAULT_FEED_STOCK,
      cashFlow: Array.isArray(chosen.cashFlow) ? chosen.cashFlow : [],
      country: chosen.country || account.country || 'CI',
      isAudioEnabled: typeof chosen.isAudioEnabled === 'boolean' ? chosen.isAudioEnabled : true,
      heatAlertThreshold:
        typeof chosen.heatAlertThreshold === 'number' ? chosen.heatAlertThreshold : 35,
      currentSimulatedTemp:
        typeof chosen.currentSimulatedTemp === 'number' ? chosen.currentSimulatedTemp : 35,
      themeMode: chosen.themeMode === 'light' ? 'light' : 'dark',
      syncQueue: [],
      lastSyncTime: Date.now(),
    });

    persistUserWorkspace(get(), false);
  },

  updateCurrentUserAccount: (account) => {
    set({ currentUser: account });
    safeSetItem(
      SESSION_STORAGE_KEY,
      JSON.stringify({ account, isAdminPreview: get().isAdminPreview })
    );
  },

  logoutUser: () => {
    persistUserWorkspace(get(), true);
    safeRemoveItem(SESSION_STORAGE_KEY);
    set({
      currentUser: null,
      isAdminPreview: false,
      batches: [],
      activeBatchId: '',
      dailyLogs: [],
      vaccineEvents: {},
      feedStock: DEFAULT_FEED_STOCK,
      cashFlow: [],
      syncQueue: [],
    });
  },

  setActiveBatchId: (id) => {
    set({ activeBatchId: id });
    persistUserWorkspace(get());
  },

  createBatch: (batchData) => {
    const newBatch: Batch = {
      ...batchData,
      id: `batch-${Date.now()}`,
      status: 'active',
    };

    const mutation: SyncMutation = {
      id: `mut-${Date.now()}`,
      entity: 'batch',
      action: 'create',
      data: newBatch,
      timestamp: Date.now(),
    };

    set((state) => ({
      batches: [newBatch, ...state.batches],
      activeBatchId: newBatch.id,
      vaccineEvents: {
        ...state.vaccineEvents,
        [newBatch.id]: JSON.parse(JSON.stringify(STANDARD_PROPHYLAXIS)).map((v: VaccineEvent) => ({
          ...v,
          completed: false,
          completedDate: undefined,
        })),
      },
      syncQueue: [...state.syncQueue, mutation],
    }));

    get().addCashFlow({
      batchId: newBatch.id,
      type: 'depense',
      category: 'poussin',
      label: `${newBatch.initialChicks} Poussins d'un jour (${newBatch.breed}) - ${newBatch.supplier}`,
      amountFCFA: newBatch.initialChicks * newBatch.pricePerChickFCFA,
      quantity: newBatch.initialChicks,
      paymentMethod: 'wave',
      date: newBatch.startDate,
    });

    persistUserWorkspace(get());
    return newBatch;
  },

  updateBatch: (id, updates) => {
    const mutation: SyncMutation = {
      id: `mut-${Date.now()}`,
      entity: 'batch',
      action: 'update',
      data: { id, updates },
      timestamp: Date.now(),
    };

    set((state) => ({
      batches: state.batches.map((b) => (b.id === id ? { ...b, ...updates } : b)),
      syncQueue: [...state.syncQueue, mutation],
    }));
    persistUserWorkspace(get());
  },

  addDailyLog: (logData) => {
    const newLog: DailyLog = {
      ...logData,
      id: `log-${Date.now()}`,
      timestamp: Date.now(),
    };

    const mutation: SyncMutation = {
      id: `mut-${Date.now()}`,
      entity: 'dailyLog',
      action: 'create',
      data: newLog,
      timestamp: Date.now(),
    };

    const { feedStock } = get();
    const bagsToDeduct = logData.feedConsumedBags || logData.feedConsumedKg / 50;
    const feedField =
      logData.feedType === 'demarrage'
        ? 'demarrageBags'
        : logData.feedType === 'croissance'
        ? 'croissanceBags'
        : 'finitionBags';

    const updatedFeedStock = {
      ...feedStock,
      [feedField]: Math.max(0, parseFloat((feedStock[feedField] - bagsToDeduct).toFixed(2))),
    };

    set((state) => ({
      dailyLogs: [newLog, ...state.dailyLogs],
      feedStock: updatedFeedStock,
      syncQueue: [...state.syncQueue, mutation],
    }));
    persistUserWorkspace(get());
  },

  toggleVaccine: (batchId, vaccineId) => {
    set((state) => {
      const batchVaxes = state.vaccineEvents[batchId] || STANDARD_PROPHYLAXIS;
      const updated = batchVaxes.map((v) => {
        if (v.id === vaccineId) {
          const newStatus = !v.completed;
          return {
            ...v,
            completed: newStatus,
            completedDate: newStatus ? new Date().toISOString().split('T')[0] : undefined,
          };
        }
        return v;
      });

      const mutation: SyncMutation = {
        id: `mut-${Date.now()}`,
        entity: 'vaccine',
        action: 'update',
        data: { batchId, vaccineId },
        timestamp: Date.now(),
      };

      return {
        vaccineEvents: {
          ...state.vaccineEvents,
          [batchId]: updated,
        },
        syncQueue: [...state.syncQueue, mutation],
      };
    });
    persistUserWorkspace(get());
  },

  updateFeedStock: (newStock) => {
    set((state) => ({
      feedStock: { ...state.feedStock, ...newStock },
      syncQueue: [
        ...state.syncQueue,
        {
          id: `mut-${Date.now()}`,
          entity: 'stock',
          action: 'update',
          data: newStock,
          timestamp: Date.now(),
        },
      ],
    }));
    persistUserWorkspace(get());
  },

  restockFeed: (type, bags, pricePerBagFCFA, paymentMethod) => {
    const { feedStock, activeBatchId } = get();
    const field =
      type === 'demarrage'
        ? 'demarrageBags'
        : type === 'croissance'
        ? 'croissanceBags'
        : 'finitionBags';

    const updatedFeedStock = {
      ...feedStock,
      [field]: feedStock[field] + bags,
    };

    const totalCost = bags * pricePerBagFCFA;
    const typeLabel =
      type === 'demarrage' ? 'Démarrage' : type === 'croissance' ? 'Croissance' : 'Finition';

    get().addCashFlow({
      batchId: activeBatchId || 'general',
      type: 'depense',
      category: 'aliment',
      label: `Achat ${bags} sacs Aliment ${typeLabel} (50kg)`,
      amountFCFA: totalCost,
      quantity: bags,
      paymentMethod,
      date: new Date().toISOString().split('T')[0],
    });

    set({ feedStock: updatedFeedStock });
    persistUserWorkspace(get());
  },

  addCashFlow: (entry) => {
    const newEntry: CashFlowEntry = {
      ...entry,
      id: `cf-${Date.now()}`,
      timestamp: Date.now(),
    };

    const mutation: SyncMutation = {
      id: `mut-${Date.now()}`,
      entity: 'cashflow',
      action: 'create',
      data: newEntry,
      timestamp: Date.now(),
    };

    set((state) => ({
      cashFlow: [newEntry, ...state.cashFlow],
      syncQueue: [...state.syncQueue, mutation],
    }));
    persistUserWorkspace(get());
  },

  setCountry: (country) => {
    set({ country });
    persistUserWorkspace(get());
  },

  toggleAudio: () => {
    set((state) => ({ isAudioEnabled: !state.isAudioEnabled }));
    persistUserWorkspace(get());
  },

  setSimulatedTemp: (temp) => {
    set({ currentSimulatedTemp: temp });
    persistUserWorkspace(get());
  },

  setThemeMode: (mode) => {
    set({ themeMode: mode });
    persistUserWorkspace(get());
  },

  toggleThemeMode: () => {
    set((state) => ({ themeMode: state.themeMode === 'dark' ? 'light' : 'dark' }));
    persistUserWorkspace(get());
  },

  syncQueueToServer: async () => {
    persistUserWorkspace(get(), true);
    return true;
  },

  resetToDemoData: () => {
    const user = get().currentUser;
    const demo = buildDemoWorkspace(user?.farmName || 'Ma Ferme', get().country);
    set({
      batches: demo.batches,
      activeBatchId: demo.activeBatchId,
      dailyLogs: demo.dailyLogs,
      vaccineEvents: demo.vaccineEvents,
      feedStock: demo.feedStock,
      cashFlow: demo.cashFlow,
      currentSimulatedTemp: demo.currentSimulatedTemp,
      syncQueue: [],
      lastSyncTime: Date.now(),
    });
    persistUserWorkspace(get(), true);
  },
}));
