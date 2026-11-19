import {
  AdvisorCodeRecord,
  SaaSPaymentMethod,
  SaaSUserAccount,
  SubscriptionPlan,
  UserWorkspaceSnapshot,
  WestAfricanCountry,
  ADVISOR_CONTACT,
} from '../types';

const LOCAL_SAAS_DB_KEY = 'fermefacile-saas-local-db-v1';
const ADMIN_PIN_SHA256 = '305a0303f148c66ec78dbaa6306ddb9518be8fde1c08e2e7b92ff768bd1bf16f';

interface LocalSaasDatabase {
  accounts: SaaSUserAccount[];
  workspaces: Record<string, Partial<UserWorkspaceSnapshot>>;
  advisorCodes: AdvisorCodeRecord[];
}

const PLAN_CONFIG: Record<
  SubscriptionPlan,
  { days: number; defaultAmountFCFA: number; prefix: string }
> = {
  mensuel: { days: 30, defaultAmountFCFA: 5000, prefix: 'MENS' },
  trimestriel: { days: 90, defaultAmountFCFA: 13500, prefix: 'TRIM' },
  annuel: { days: 365, defaultAmountFCFA: 48000, prefix: 'ANNU' },
};

export function isJsonResponse(res: Response): boolean {
  const ct = res.headers.get('content-type') || '';
  return ct.toLowerCase().includes('application/json');
}

export function isLocalAdminToken(token: string | null | undefined): boolean {
  return typeof token === 'string' && token.startsWith('local-superadmin:');
}

function createEmptyWorkspace(country: WestAfricanCountry): Partial<UserWorkspaceSnapshot> {
  return {
    batches: [],
    activeBatchId: '',
    dailyLogs: [],
    vaccineEvents: {},
    feedStock: {
      demarrageBags: 0,
      croissanceBags: 0,
      finitionBags: 0,
      bagWeightKg: 50,
      pricePerBagFCFA: {
        demarrage: 18500,
        croissance: 17800,
        finition: 17200,
      },
    },
    cashFlow: [],
    country,
    isAudioEnabled: true,
    heatAlertThreshold: 35,
    currentSimulatedTemp: 34,
    themeMode: 'dark',
    advisorUnlocked: false,
    updatedAtMs: Date.now(),
  };
}

function createStarterDemoWorkspace(
  country: WestAfricanCountry,
  farmName: string
): Partial<UserWorkspaceSnapshot> {
  const batchId = `batch-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
  const startDate = new Date(Date.now() - 14 * 86400000).toISOString().split('T')[0];

  return {
    batches: [
      {
        id: batchId,
        name: `Lot #01 - ${farmName}`,
        startDate,
        initialChicks: 300,
        pricePerChickFCFA: 550,
        breed: 'Cobb 500',
        supplier: 'Couvoir Local',
        targetHarvestDay: 42,
        targetWeightKg: 2.1,
        notes: 'Lot initial créé avec la page éleveur.',
        status: 'active',
      },
    ],
    activeBatchId: batchId,
    dailyLogs: [
      {
        id: `log-${batchId}-1`,
        batchId,
        dayNumber: 14,
        date: new Date().toISOString().split('T')[0],
        mortality: 1,
        feedConsumedBags: 0.5,
        feedConsumedKg: 25,
        feedType: 'demarrage',
        waterIntakeLiters: 55,
        averageWeightGrams: 460,
        temperatureCelsius: 35,
        symptoms: [],
        timestamp: Date.now() - 3600000,
      },
    ],
    vaccineEvents: {},
    feedStock: {
      demarrageBags: 2,
      croissanceBags: 6,
      finitionBags: 4,
      bagWeightKg: 50,
      pricePerBagFCFA: {
        demarrage: 18500,
        croissance: 17800,
        finition: 17200,
      },
    },
    cashFlow: [
      {
        id: `cf-${Date.now()}`,
        batchId,
        type: 'depense',
        category: 'poussin',
        label: '300 Poussins Cobb 500',
        amountFCFA: 300 * 550,
        quantity: 300,
        paymentMethod: 'wave',
        date: startDate,
        timestamp: Date.now() - 14 * 86400000,
      },
    ],
    country,
    isAudioEnabled: true,
    heatAlertThreshold: 35,
    currentSimulatedTemp: 36,
    themeMode: 'dark',
    advisorUnlocked: false,
    updatedAtMs: Date.now(),
  };
}

function readDb(): LocalSaasDatabase {
  try {
    const raw = window.localStorage.getItem(LOCAL_SAAS_DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<LocalSaasDatabase>;
      return {
        accounts: Array.isArray(parsed.accounts) ? parsed.accounts : [],
        workspaces:
          parsed.workspaces && typeof parsed.workspaces === 'object' ? parsed.workspaces : {},
        advisorCodes: Array.isArray(parsed.advisorCodes) ? parsed.advisorCodes : [],
      };
    }
  } catch {
    // Fallback to seed below
  }

  const now = Date.now();
  const user1Id = 'user-kone-01';
  const user2Id = 'user-diallo-02';
  const seed: LocalSaasDatabase = {
    accounts: [
      {
        id: user1Id,
        code: 'FF-TRIM-4821',
        farmerName: 'Mamadou Koné',
        farmName: 'Ferme Espoir Bouaké',
        phone: '+225 07 48 12 90 11',
        country: 'CI',
        plan: 'trimestriel',
        status: 'active',
        paymentMethod: 'wave',
        amountFCFA: 13500,
        durationDays: 90,
        createdAtMs: now - 5 * 86400000,
        expiresAtMs: now + 85 * 86400000,
      },
      {
        id: user2Id,
        code: 'FF-MENS-9034',
        farmerName: 'Fatou Diallo',
        farmName: 'Aviculture Thiès',
        phone: '+221 77 320 45 18',
        country: 'SN',
        plan: 'mensuel',
        status: 'active',
        paymentMethod: 'orange_money',
        amountFCFA: 5000,
        durationDays: 30,
        createdAtMs: now - 3 * 86400000,
        expiresAtMs: now + 27 * 86400000,
      },
    ],
    workspaces: {
      [user1Id]: createStarterDemoWorkspace('CI', 'Ferme Espoir Bouaké'),
      [user2Id]: createStarterDemoWorkspace('SN', 'Aviculture Thiès'),
    },
    advisorCodes: [],
  };

  saveDb(seed);
  return seed;
}

function saveDb(db: LocalSaasDatabase): void {
  try {
    window.localStorage.setItem(LOCAL_SAAS_DB_KEY, JSON.stringify(db));
  } catch {
    // Ignore storage quota errors
  }
}

function withEffectiveStatus(account: SaaSUserAccount): SaaSUserAccount {
  if (account.status === 'suspended') return account;
  if (Date.now() > account.expiresAtMs) {
    return { ...account, status: 'expired' };
  }
  return { ...account, status: 'active' };
}

function randomDigits(min: number, max: number): number {
  if (typeof window !== 'undefined' && window.crypto?.getRandomValues) {
    const arr = new Uint32Array(1);
    window.crypto.getRandomValues(arr);
    return min + (arr[0] % (max - min + 1));
  }
  return min + Math.floor(Math.random() * (max - min + 1));
}

function generateAccessCode(plan: SubscriptionPlan, existingCodes: Set<string>): string {
  const prefix = PLAN_CONFIG[plan].prefix;
  for (let i = 0; i < 25; i++) {
    const candidate = `FF-${prefix}-${randomDigits(1000, 9999)}`;
    if (!existingCodes.has(candidate)) return candidate;
  }
  return `FF-${prefix}-${Date.now().toString().slice(-5)}`;
}

function generateAdvisorCode(existingCodes: Set<string>): string {
  for (let i = 0; i < 30; i++) {
    const candidate = `FF-CONS-${randomDigits(1000, 9999)}`;
    if (!existingCodes.has(candidate)) return candidate;
  }
  return `FF-CONS-${Date.now().toString().slice(-5)}`;
}

async function sha256Hex(text: string): Promise<string> {
  if (typeof window !== 'undefined' && window.crypto?.subtle) {
    const encoded = new TextEncoder().encode(text);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', encoded);
    return Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
  // Minimal pure-JS SHA-256 fallback for insecure contexts without crypto.subtle
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];
  const rotr = (n: number, x: number) => (x >>> n) | (x << (32 - n));
  const bytes = new TextEncoder().encode(text);
  const bitLen = bytes.length * 8;
  const paddedLen = Math.ceil((bytes.length + 9) / 64) * 64;
  const padded = new Uint8Array(paddedLen);
  padded.set(bytes);
  padded[bytes.length] = 0x80;
  const dv = new DataView(padded.buffer);
  dv.setUint32(paddedLen - 4, bitLen >>> 0, false);
  dv.setUint32(paddedLen - 8, Math.floor(bitLen / 0x100000000), false);
  const H = [
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ];
  const W = new Uint32Array(64);
  for (let i = 0; i < paddedLen; i += 64) {
    for (let t = 0; t < 16; t++) W[t] = dv.getUint32(i + t * 4, false);
    for (let t = 16; t < 64; t++) {
      const s0 = rotr(7, W[t - 15]) ^ rotr(18, W[t - 15]) ^ (W[t - 15] >>> 3);
      const s1 = rotr(17, W[t - 2]) ^ rotr(19, W[t - 2]) ^ (W[t - 2] >>> 10);
      W[t] = (W[t - 16] + s0 + W[t - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, h] = H;
    for (let t = 0; t < 64; t++) {
      const S1 = rotr(6, e) ^ rotr(11, e) ^ rotr(25, e);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[t] + W[t]) >>> 0;
      const S0 = rotr(2, a) ^ rotr(13, a) ^ rotr(22, a);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }
    H[0] = (H[0] + a) >>> 0;
    H[1] = (H[1] + b) >>> 0;
    H[2] = (H[2] + c) >>> 0;
    H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0;
    H[5] = (H[5] + f) >>> 0;
    H[6] = (H[6] + g) >>> 0;
    H[7] = (H[7] + h) >>> 0;
  }
  return H.map((x) => x.toString(16).padStart(8, '0')).join('');
}

export async function verifyLocalAdminPin(
  pin: string
): Promise<{ valid: boolean; adminToken?: string; error?: string }> {
  const cleaned = String(pin || '').trim();
  const digest = await sha256Hex(cleaned);
  if (digest === ADMIN_PIN_SHA256) {
    const exp = Date.now() + 12 * 60 * 60 * 1000;
    return {
      valid: true,
      adminToken: `local-superadmin:${exp}`,
    };
  }
  return { valid: false, error: 'Code PIN Super Admin incorrect.' };
}

export function cacheServerAccountAndWorkspace(
  account: SaaSUserAccount,
  workspace?: Partial<UserWorkspaceSnapshot>
): void {
  const db = readDb();
  const idx = db.accounts.findIndex((a) => a.id === account.id);
  if (idx >= 0) {
    db.accounts[idx] = account;
  } else {
    db.accounts.unshift(account);
  }
  if (workspace) {
    db.workspaces[account.id] = workspace;
  }
  saveDb(db);
}

export function saveLocalWorkspace(userId: string, workspace: Partial<UserWorkspaceSnapshot>): void {
  const db = readDb();
  db.workspaces[userId] = workspace;
  saveDb(db);
}

export function localLoginWithCode(rawCode: string): {
  ok: boolean;
  account?: SaaSUserAccount;
  workspace?: Partial<UserWorkspaceSnapshot>;
  error?: string;
  expired?: boolean;
} {
  const normalized = rawCode.toUpperCase().trim();
  if (!normalized) {
    return { ok: false, error: "Veuillez saisir votre code d'accès." };
  }

  const db = readDb();
  const idx = db.accounts.findIndex((a) => a.code.toUpperCase() === normalized);
  if (idx === -1) {
    return {
      ok: false,
      error: "Code d'accès introuvable localement. Vérifiez le code ou créez-le dans la Console Super Admin.",
    };
  }

  const account = withEffectiveStatus(db.accounts[idx]);
  if (account.status === 'suspended') {
    return {
      ok: false,
      error: 'Cet accès a été suspendu par le Super Admin.',
      account,
    };
  }
  if (account.status === 'expired') {
    return {
      ok: false,
      error: "Votre abonnement est expiré. Contactez l'administrateur pour renouveler via Mobile Money.",
      expired: true,
      account,
    };
  }

  db.accounts[idx].lastLoginAtMs = Date.now();
  if (!db.workspaces[account.id]) {
    db.workspaces[account.id] = createEmptyWorkspace(account.country);
  }
  saveDb(db);

  return {
    ok: true,
    account: { ...account, lastLoginAtMs: db.accounts[idx].lastLoginAtMs },
    workspace: db.workspaces[account.id],
  };
}

export function localListAccounts(): SaaSUserAccount[] {
  const db = readDb();
  return db.accounts.map(withEffectiveStatus);
}

export function localListAdvisorCodes(): AdvisorCodeRecord[] {
  const db = readDb();
  return db.advisorCodes;
}

export function localReplaceFromServer(
  accounts: SaaSUserAccount[],
  advisorCodes?: AdvisorCodeRecord[]
): void {
  const db = readDb();
  db.accounts = accounts;
  if (Array.isArray(advisorCodes)) {
    db.advisorCodes = advisorCodes;
  }
  saveDb(db);
}

export function localCreateAccount(body: {
  farmerName: string;
  farmName: string;
  phone: string;
  country: WestAfricanCountry;
  plan: SubscriptionPlan;
  paymentMethod: SaaSPaymentMethod;
  amountFCFA?: number;
  customCode?: string;
  seedDemo?: boolean;
  includeAdvisorCode?: boolean;
}): { ok: boolean; account?: SaaSUserAccount; error?: string } {
  const farmerName = String(body.farmerName || '').trim();
  const farmName = String(body.farmName || '').trim();
  if (farmerName.length < 2 || farmName.length < 2) {
    return { ok: false, error: "Nom de l'éleveur et nom de la ferme requis (2 car. min)." };
  }

  const db = readDb();
  const existingCodes = new Set(db.accounts.map((a) => a.code.toUpperCase()));
  let code = String(body.customCode || '')
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .trim();

  if (!code) {
    code = generateAccessCode(body.plan, existingCodes);
  } else if (code.length < 4) {
    return { ok: false, error: 'Le code personnalisé doit contenir au moins 4 caractères.' };
  } else if (existingCodes.has(code)) {
    return { ok: false, error: `Le code ${code} existe déjà.` };
  }

  const planInfo = PLAN_CONFIG[body.plan];
  const now = Date.now();
  const userId = `user-${now}-${randomDigits(100, 999)}`;
  const existingAdvCodes = new Set([
    ...db.advisorCodes.map((c) => c.code.toUpperCase()),
    ...db.accounts.map((a) => (a.advisorCode || '').toUpperCase()).filter(Boolean),
  ]);
  const includeAdv = Boolean(body.includeAdvisorCode);
  const advisorCode = includeAdv ? generateAdvisorCode(existingAdvCodes) : undefined;

  const newAccount: SaaSUserAccount = {
    id: userId,
    code,
    farmerName,
    farmName,
    phone: String(body.phone || '').trim() || 'Non renseigné',
    country: body.country,
    plan: body.plan,
    status: 'active',
    paymentMethod: body.paymentMethod,
    amountFCFA:
      Number.isFinite(Number(body.amountFCFA)) && Number(body.amountFCFA) >= 0
        ? Number(body.amountFCFA)
        : planInfo.defaultAmountFCFA,
    durationDays: planInfo.days,
    createdAtMs: now,
    expiresAtMs: now + planInfo.days * 86400000,
    advisorAccessEnabled: includeAdv,
    advisorCode,
  };

  if (includeAdv && advisorCode) {
    db.advisorCodes.unshift({
      id: `adv-${now}-${randomDigits(100, 999)}`,
      code: advisorCode,
      label: `Conseiller - ${farmName}`,
      userId,
      farmerName,
      phone: newAccount.phone,
      status: 'active',
      createdAtMs: now,
      usedCount: 0,
    });
  }

  db.accounts.unshift(newAccount);
  db.workspaces[userId] = body.seedDemo
    ? createStarterDemoWorkspace(body.country, farmName)
    : createEmptyWorkspace(body.country);
  saveDb(db);

  return { ok: true, account: newAccount };
}

export function localUpdateAccount(
  id: string,
  body: {
    renewPlan?: SubscriptionPlan;
    amountFCFA?: number;
    status?: 'active' | 'suspended';
    generateAdvisorCode?: boolean;
    advisorAccessEnabled?: boolean;
  }
): { ok: boolean; account?: SaaSUserAccount; advisorCodes?: AdvisorCodeRecord[]; error?: string } {
  const db = readDb();
  const idx = db.accounts.findIndex((a) => a.id === id);
  if (idx === -1) return { ok: false, error: 'Compte introuvable.' };

  const current = db.accounts[idx];
  const updated: SaaSUserAccount = { ...current };

  if (body.renewPlan) {
    const planInfo = PLAN_CONFIG[body.renewPlan];
    const baseTime = Math.max(Date.now(), current.expiresAtMs);
    updated.plan = body.renewPlan;
    updated.durationDays = planInfo.days;
    updated.expiresAtMs = baseTime + planInfo.days * 86400000;
    updated.status = 'active';
    if (typeof body.amountFCFA === 'number' && body.amountFCFA >= 0) {
      updated.amountFCFA = body.amountFCFA;
    }
  }

  if (body.status === 'active' || body.status === 'suspended') {
    updated.status = body.status;
  }

  if (body.generateAdvisorCode === true || body.advisorAccessEnabled === true) {
    updated.advisorAccessEnabled = true;
    if (!updated.advisorCode || body.generateAdvisorCode === true) {
      const existingAdvCodes = new Set([
        ...db.advisorCodes.map((c) => c.code.toUpperCase()),
        ...db.accounts.map((a) => (a.advisorCode || '').toUpperCase()).filter(Boolean),
      ]);
      const nextCode = generateAdvisorCode(existingAdvCodes);
      updated.advisorCode = nextCode;
      db.advisorCodes.unshift({
        id: `adv-${Date.now()}-${randomDigits(100, 999)}`,
        code: nextCode,
        label: `Conseiller - ${updated.farmName}`,
        userId: updated.id,
        farmerName: updated.farmerName,
        phone: updated.phone,
        status: 'active',
        createdAtMs: Date.now(),
        usedCount: 0,
      });
    } else {
      const targetCode = updated.advisorCode.toUpperCase();
      db.advisorCodes = db.advisorCodes.map((rec) =>
        rec.code.toUpperCase() === targetCode ? { ...rec, status: 'active' } : rec
      );
    }
  } else if (body.advisorAccessEnabled === false) {
    updated.advisorAccessEnabled = false;
    if (updated.advisorCode) {
      const targetCode = updated.advisorCode.toUpperCase();
      db.advisorCodes = db.advisorCodes.map((rec) =>
        rec.code.toUpperCase() === targetCode ? { ...rec, status: 'revoked' } : rec
      );
      if (db.workspaces[updated.id]?.advisorUnlockCode?.toUpperCase() === targetCode) {
        db.workspaces[updated.id].advisorUnlocked = false;
        db.workspaces[updated.id].updatedAtMs = Date.now();
      }
    }
  }

  db.accounts[idx] = updated;
  saveDb(db);
  return { ok: true, account: withEffectiveStatus(updated), advisorCodes: db.advisorCodes };
}

export function localDeleteAccount(id: string): boolean {
  const db = readDb();
  const before = db.accounts.length;
  db.accounts = db.accounts.filter((a) => a.id !== id);
  if (db.accounts.length === before) return false;
  delete db.workspaces[id];
  saveDb(db);
  return true;
}

export function localGetWorkspaceForAdmin(userId: string): {
  account?: SaaSUserAccount;
  workspace?: Partial<UserWorkspaceSnapshot>;
} {
  const db = readDb();
  const account = db.accounts.find((a) => a.id === userId);
  if (!account) return {};
  return {
    account: withEffectiveStatus(account),
    workspace: db.workspaces[userId] || createEmptyWorkspace(account.country),
  };
}

export function localCreateAdvisorCode(body: {
  label?: string;
  farmerName?: string;
  phone?: string;
  customCode?: string;
}): { ok: boolean; advisorCode?: AdvisorCodeRecord; error?: string } {
  const db = readDb();
  const existing = new Set([
    ...db.advisorCodes.map((c) => c.code.toUpperCase()),
    ...db.accounts.map((a) => (a.advisorCode || '').toUpperCase()).filter(Boolean),
  ]);

  let code = String(body.customCode || '')
    .toUpperCase()
    .replace(/[^A-Z0-9-]/g, '')
    .trim();

  if (!code) {
    code = generateAdvisorCode(existing);
  } else if (code.length < 4) {
    return { ok: false, error: 'Le code Conseiller doit contenir au moins 4 caractères.' };
  } else if (existing.has(code)) {
    return { ok: false, error: `Le code Conseiller ${code} existe déjà.` };
  }

  const record: AdvisorCodeRecord = {
    id: `adv-${Date.now()}-${randomDigits(100, 999)}`,
    code,
    label: String(body.label || '').trim() || 'Code Conseiller Avicole',
    farmerName: String(body.farmerName || '').trim() || undefined,
    phone: String(body.phone || '').trim() || undefined,
    status: 'active',
    createdAtMs: Date.now(),
    usedCount: 0,
  };

  db.advisorCodes.unshift(record);
  saveDb(db);
  return { ok: true, advisorCode: record };
}

export function localToggleAdvisorCode(
  id: string,
  status?: 'active' | 'revoked'
): AdvisorCodeRecord | null {
  const db = readDb();
  const idx = db.advisorCodes.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  const current = db.advisorCodes[idx];
  const nextStatus = status || (current.status === 'active' ? 'revoked' : 'active');
  db.advisorCodes[idx] = { ...current, status: nextStatus };

  if (current.userId) {
    const acc = db.accounts.find((a) => a.id === current.userId);
    if (acc && acc.advisorCode?.toUpperCase() === current.code.toUpperCase()) {
      acc.advisorAccessEnabled = nextStatus === 'active';
    }
  }
  saveDb(db);
  return db.advisorCodes[idx];
}

export function localDeleteAdvisorCode(id: string): boolean {
  const db = readDb();
  const target = db.advisorCodes.find((c) => c.id === id);
  if (!target) return false;
  db.advisorCodes = db.advisorCodes.filter((c) => c.id !== id);
  if (target.userId) {
    const acc = db.accounts.find((a) => a.id === target.userId);
    if (acc && acc.advisorCode?.toUpperCase() === target.code.toUpperCase()) {
      acc.advisorAccessEnabled = false;
      acc.advisorCode = undefined;
    }
  }
  saveDb(db);
  return true;
}

export function localUnlockAdvisorCode(
  rawCode: string,
  userId?: string
): {
  unlocked: boolean;
  code?: string;
  advisorPhone?: string;
  advisorWhatsApp?: string;
  error?: string;
} {
  const normalized = rawCode.toUpperCase().trim();
  if (!normalized) {
    return { unlocked: false, error: 'Veuillez entrer le code transmis par le Super Admin.' };
  }

  const db = readDb();
  const advIdx = db.advisorCodes.findIndex((c) => c.code.toUpperCase() === normalized);

  if (advIdx !== -1) {
    const rec = db.advisorCodes[advIdx];
    if (rec.status === 'revoked') {
      return { unlocked: false, error: 'Ce code Conseiller a été désactivé par le Super Admin.' };
    }
    if (rec.userId && userId && rec.userId !== userId) {
      return { unlocked: false, error: 'Ce code Conseiller est réservé à une autre ferme.' };
    }
    db.advisorCodes[advIdx] = {
      ...rec,
      usedCount: (rec.usedCount || 0) + 1,
      lastUsedAtMs: Date.now(),
      lastUsedByUserId: userId || rec.lastUsedByUserId,
    };
  } else {
    const accMatch = db.accounts.find(
      (a) => a.advisorCode && a.advisorCode.toUpperCase() === normalized
    );
    if (!accMatch) {
      return {
        unlocked: false,
        error: 'Code Conseiller invalide. Vérifiez le code transmis par le Super Admin.',
      };
    }
    if (!accMatch.advisorAccessEnabled) {
      return {
        unlocked: false,
        error: 'Option Conseiller désactivée par le Super Admin pour ce code.',
      };
    }
    if (userId && accMatch.id !== userId) {
      return {
        unlocked: false,
        error: 'Ce code Conseiller est rattaché à un autre compte éleveur.',
      };
    }
  }

  if (userId && db.workspaces[userId]) {
    db.workspaces[userId].advisorUnlocked = true;
    db.workspaces[userId].advisorUnlockCode = normalized;
    db.workspaces[userId].updatedAtMs = Date.now();
  }

  saveDb(db);
  return {
    unlocked: true,
    code: normalized,
    advisorPhone: ADVISOR_CONTACT.phoneDisplay,
    advisorWhatsApp: ADVISOR_CONTACT.whatsappDigits,
  };
}
