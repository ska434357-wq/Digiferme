import express from 'express';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createServer as createViteServer } from 'vite';

type WestAfricanCountry = 'CI' | 'SN' | 'BF' | 'ML';
type SubscriptionPlan = 'mensuel' | 'trimestriel' | 'annuel';
type SubscriptionStatus = 'active' | 'suspended' | 'expired';
type SaaSPaymentMethod = 'wave' | 'orange_money' | 'mtn_momo' | 'moov_money' | 'cash';

interface SaaSUserAccount {
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
  advisorAccessEnabled?: boolean;
  advisorCode?: string;
}

interface AdvisorCodeRecord {
  id: string;
  code: string;
  label: string;
  userId?: string;
  farmerName?: string;
  phone?: string;
  status: 'active' | 'revoked';
  createdAtMs: number;
  usedCount: number;
  lastUsedAtMs?: number;
  lastUsedByUserId?: string;
}

interface WorkspacePayload {
  batches: unknown[];
  activeBatchId: string;
  dailyLogs: unknown[];
  vaccineEvents: Record<string, unknown[]>;
  feedStock: {
    demarrageBags: number;
    croissanceBags: number;
    finitionBags: number;
    bagWeightKg: number;
    pricePerBagFCFA: {
      demarrage: number;
      croissance: number;
      finition: number;
    };
  };
  cashFlow: unknown[];
  country: WestAfricanCountry;
  isAudioEnabled: boolean;
  heatAlertThreshold: number;
  currentSimulatedTemp: number;
  themeMode: 'dark' | 'light';
  advisorUnlocked?: boolean;
  advisorUnlockCode?: string;
  updatedAtMs: number;
}

interface SaaSDatabase {
  accounts: SaaSUserAccount[];
  workspaces: Record<string, WorkspacePayload>;
  advisorCodes: AdvisorCodeRecord[];
}

const PORT = Number(process.env.PORT) || 3000;
const SUPER_ADMIN_PIN = '761278';
const TOKEN_SECRET = process.env.SESSION_SECRET || 'fermefacile-avicole-saas-2026-secret';
const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'saas-db.json');
const ADVISOR_PHONE_DISPLAY = '+226 74 36 60 51';
const ADVISOR_WHATSAPP_DIGITS = '22674366051';

const PLAN_CONFIG: Record<SubscriptionPlan, { days: number; defaultAmountFCFA: number; prefix: string }> = {
  mensuel: { days: 30, defaultAmountFCFA: 5000, prefix: 'MENS' },
  trimestriel: { days: 90, defaultAmountFCFA: 13500, prefix: 'TRIM' },
  annuel: { days: 365, defaultAmountFCFA: 48000, prefix: 'ANNU' },
};

function createEmptyWorkspace(country: WestAfricanCountry): WorkspacePayload {
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

function createStarterDemoWorkspace(country: WestAfricanCountry, farmName: string): WorkspacePayload {
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
    updatedAtMs: Date.now(),
  };
}

function ensureDatabase(): SaaSDatabase {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (!fs.existsSync(DB_FILE)) {
    const now = Date.now();
    const user1Id = 'user-kone-01';
    const user2Id = 'user-diallo-02';

    const seed: SaaSDatabase = {
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
    fs.writeFileSync(DB_FILE, JSON.stringify(seed, null, 2), 'utf8');
    return seed;
  }

  try {
    const raw = fs.readFileSync(DB_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<SaaSDatabase>;
    return {
      accounts: Array.isArray(parsed.accounts) ? parsed.accounts : [],
      workspaces: parsed.workspaces && typeof parsed.workspaces === 'object' ? parsed.workspaces : {},
      advisorCodes: Array.isArray(parsed.advisorCodes) ? parsed.advisorCodes : [],
    };
  } catch {
    return { accounts: [], workspaces: {}, advisorCodes: [] };
  }
}

function saveDatabase(dbData: SaaSDatabase): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const tmpFile = `${DB_FILE}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(dbData, null, 2), 'utf8');
  fs.renameSync(tmpFile, DB_FILE);
}

function withEffectiveStatus(account: SaaSUserAccount): SaaSUserAccount {
  if (account.status === 'suspended') return account;
  if (Date.now() > account.expiresAtMs) {
    return { ...account, status: 'expired' };
  }
  return { ...account, status: 'active' };
}

function createAdminToken(): string {
  const exp = Date.now() + 12 * 60 * 60 * 1000;
  const payload = `superadmin:${exp}`;
  const sig = crypto.createHmac('sha256', TOKEN_SECRET).update(payload).digest('hex');
  return `${payload}:${sig}`;
}

function verifyAdminToken(token: string | undefined): boolean {
  if (!token || typeof token !== 'string') return false;
  const parts = token.split(':');
  if (parts.length !== 3) return false;
  const [role, expStr, sig] = parts;
  if (role !== 'superadmin') return false;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Date.now() > exp) return false;
  const expected = crypto.createHmac('sha256', TOKEN_SECRET).update(`${role}:${expStr}`).digest('hex');
  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expBuf);
}

function generateAccessCode(plan: SubscriptionPlan, existingCodes: Set<string>): string {
  const prefix = PLAN_CONFIG[plan].prefix;
  for (let i = 0; i < 20; i++) {
    const suffix = crypto.randomInt(1000, 9999);
    const candidate = `FF-${prefix}-${suffix}`;
    if (!existingCodes.has(candidate)) {
      return candidate;
    }
  }
  return `FF-${prefix}-${Date.now().toString().slice(-5)}`;
}

function collectAllAdvisorCodes(dbData: SaaSDatabase): Set<string> {
  const set = new Set<string>();
  for (const rec of dbData.advisorCodes) {
    if (rec.code) set.add(rec.code.toUpperCase());
  }
  for (const acc of dbData.accounts) {
    if (acc.advisorCode) set.add(acc.advisorCode.toUpperCase());
  }
  return set;
}

function generateAdvisorCode(existingCodes: Set<string>): string {
  for (let i = 0; i < 30; i++) {
    const suffix = crypto.randomInt(1000, 9999);
    const candidate = `FF-CONS-${suffix}`;
    if (!existingCodes.has(candidate)) {
      return candidate;
    }
  }
  return `FF-CONS-${Date.now().toString().slice(-5)}`;
}

function isValidPin(pin: string): boolean {
  const a = Buffer.from(String(pin || '').trim());
  const b = Buffer.from(SUPER_ADMIN_PIN);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
}

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '2mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'FermeFacile Avicole SaaS' });
  });

  // 1. Verify Super Admin PIN (761278)
  app.post('/api/admin/verify-pin', (req, res) => {
    const pin = typeof req.body?.pin === 'string' ? req.body.pin : '';
    if (!isValidPin(pin)) {
      res.status(401).json({ valid: false, error: 'Code PIN Super Admin incorrect.' });
      return;
    }
    const adminToken = createAdminToken();
    res.json({ valid: true, adminToken });
  });

  // Middleware for admin endpoints
  const requireAdmin: express.RequestHandler = (req, res, next) => {
    const token = req.header('x-admin-token');
    if (!verifyAdminToken(token)) {
      res.status(401).json({ error: 'Session Super Admin expirée ou non autorisée.' });
      return;
    }
    next();
  };

  // 2. Super Admin: List all user accounts & codes
  app.get('/api/admin/codes', requireAdmin, (_req, res) => {
    const dbData = ensureDatabase();
    const accounts = dbData.accounts.map(withEffectiveStatus);
    res.json({ accounts });
  });

  // 3. Super Admin: Create new user account + access code + isolated workspace
  app.post('/api/admin/codes', requireAdmin, (req, res) => {
    const body = req.body || {};
    const farmerName = String(body.farmerName || '').trim();
    const farmName = String(body.farmName || '').trim();
    const phone = String(body.phone || '').trim() || 'Non renseigné';
    const country: WestAfricanCountry = ['CI', 'SN', 'BF', 'ML'].includes(body.country)
      ? body.country
      : 'CI';
    const plan: SubscriptionPlan = ['mensuel', 'trimestriel', 'annuel'].includes(body.plan)
      ? body.plan
      : 'mensuel';
    const paymentMethod: SaaSPaymentMethod = [
      'wave',
      'orange_money',
      'mtn_momo',
      'moov_money',
      'cash',
    ].includes(body.paymentMethod)
      ? body.paymentMethod
      : 'wave';

    if (farmerName.length < 2 || farmName.length < 2) {
      res.status(400).json({ error: 'Nom de l\'éleveur et nom de la ferme requis (2 car. min).' });
      return;
    }

    const dbData = ensureDatabase();
    const existingCodes = new Set(dbData.accounts.map((a) => a.code.toUpperCase()));

    let code = String(body.customCode || '')
      .toUpperCase()
      .replace(/[^A-Z0-9-]/g, '')
      .trim();

    if (!code) {
      code = generateAccessCode(plan, existingCodes);
    } else if (code.length < 4) {
      res.status(400).json({ error: 'Le code personnalisé doit contenir au moins 4 caractères.' });
      return;
    } else if (existingCodes.has(code)) {
      res.status(409).json({ error: `Le code ${code} existe déjà.` });
      return;
    }

    const planInfo = PLAN_CONFIG[plan];
    const now = Date.now();
    const amountFCFA = Number.isFinite(Number(body.amountFCFA)) && Number(body.amountFCFA) >= 0
      ? Number(body.amountFCFA)
      : planInfo.defaultAmountFCFA;
    const userId = `user-${now}-${crypto.randomBytes(2).toString('hex')}`;

    const includeAdvisorCode = Boolean(body.includeAdvisorCode);
    const existingAdvCodes = collectAllAdvisorCodes(dbData);
    const advisorCode = includeAdvisorCode ? generateAdvisorCode(existingAdvCodes) : undefined;

    const newAccount: SaaSUserAccount = {
      id: userId,
      code,
      farmerName,
      farmName,
      phone,
      country,
      plan,
      status: 'active',
      paymentMethod,
      amountFCFA,
      durationDays: planInfo.days,
      createdAtMs: now,
      expiresAtMs: now + planInfo.days * 86400000,
      advisorAccessEnabled: includeAdvisorCode,
      advisorCode,
    };

    if (includeAdvisorCode && advisorCode) {
      dbData.advisorCodes.unshift({
        id: `adv-${now}-${crypto.randomBytes(2).toString('hex')}`,
        code: advisorCode,
        label: `Conseiller - ${farmName}`,
        userId,
        farmerName,
        phone,
        status: 'active',
        createdAtMs: now,
        usedCount: 0,
      });
    }

    const seedDemo = Boolean(body.seedDemo);
    dbData.accounts.unshift(newAccount);
    dbData.workspaces[userId] = seedDemo
      ? createStarterDemoWorkspace(country, farmName)
      : createEmptyWorkspace(country);

    saveDatabase(dbData);
    res.status(201).json({ account: newAccount });
  });

  // 4. Super Admin: Renew / Suspend / Reactivate / Update account (including Advisor option)
  app.patch('/api/admin/codes/:id', requireAdmin, (req, res) => {
    const id = req.params.id;
    const body = req.body || {};
    const dbData = ensureDatabase();
    const idx = dbData.accounts.findIndex((a) => a.id === id);

    if (idx === -1) {
      res.status(404).json({ error: 'Compte introuvable.' });
      return;
    }

    const current = dbData.accounts[idx];
    let updated: SaaSUserAccount = { ...current };

    if (body.renewPlan && ['mensuel', 'trimestriel', 'annuel'].includes(body.renewPlan)) {
      const plan = body.renewPlan as SubscriptionPlan;
      const planInfo = PLAN_CONFIG[plan];
      const baseTime = Math.max(Date.now(), current.expiresAtMs);
      updated.plan = plan;
      updated.durationDays = planInfo.days;
      updated.expiresAtMs = baseTime + planInfo.days * 86400000;
      updated.status = 'active';
      if (Number.isFinite(Number(body.amountFCFA)) && Number(body.amountFCFA) >= 0) {
        updated.amountFCFA = Number(body.amountFCFA);
      }
    }

    if (body.status === 'active' || body.status === 'suspended') {
      updated.status = body.status;
    }

    if (typeof body.farmerName === 'string' && body.farmerName.trim().length >= 2) {
      updated.farmerName = body.farmerName.trim();
    }
    if (typeof body.farmName === 'string' && body.farmName.trim().length >= 2) {
      updated.farmName = body.farmName.trim();
    }
    if (typeof body.phone === 'string' && body.phone.trim().length >= 4) {
      updated.phone = body.phone.trim();
    }

    if (body.generateAdvisorCode === true || body.advisorAccessEnabled === true) {
      updated.advisorAccessEnabled = true;
      if (!updated.advisorCode || body.generateAdvisorCode === true) {
        const nextCode = generateAdvisorCode(collectAllAdvisorCodes(dbData));
        updated.advisorCode = nextCode;
        dbData.advisorCodes.unshift({
          id: `adv-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
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
        // Reactivate existing matching advisor code record if present
        dbData.advisorCodes = dbData.advisorCodes.map((rec) =>
          rec.code.toUpperCase() === updated.advisorCode?.toUpperCase()
            ? { ...rec, status: 'active' }
            : rec
        );
      }
    } else if (body.advisorAccessEnabled === false) {
      updated.advisorAccessEnabled = false;
      if (updated.advisorCode) {
        const revCode = updated.advisorCode.toUpperCase();
        dbData.advisorCodes = dbData.advisorCodes.map((rec) =>
          rec.code.toUpperCase() === revCode ? { ...rec, status: 'revoked' } : rec
        );
        if (dbData.workspaces[updated.id]?.advisorUnlockCode?.toUpperCase() === revCode) {
          dbData.workspaces[updated.id].advisorUnlocked = false;
          dbData.workspaces[updated.id].updatedAtMs = Date.now();
        }
      }
    }

    dbData.accounts[idx] = updated;
    saveDatabase(dbData);
    res.json({ account: withEffectiveStatus(updated), advisorCodes: dbData.advisorCodes });
  });

  // 5. Super Admin: Delete user account & workspace
  app.delete('/api/admin/codes/:id', requireAdmin, (req, res) => {
    const id = req.params.id;
    const dbData = ensureDatabase();
    const before = dbData.accounts.length;
    dbData.accounts = dbData.accounts.filter((a) => a.id !== id);
    if (dbData.accounts.length === before) {
      res.status(404).json({ error: 'Compte introuvable.' });
      return;
    }
    delete dbData.workspaces[id];
    saveDatabase(dbData);
    res.json({ deleted: true });
  });

  // 6. Super Admin: Inspect a specific user's isolated page/workspace
  app.get('/api/admin/workspace/:userId', requireAdmin, (req, res) => {
    const userId = req.params.userId;
    const dbData = ensureDatabase();
    const account = dbData.accounts.find((a) => a.id === userId);
    if (!account) {
      res.status(404).json({ error: 'Utilisateur introuvable.' });
      return;
    }
    const workspace = dbData.workspaces[userId] || createEmptyWorkspace(account.country);
    res.json({ account: withEffectiveStatus(account), workspace });
  });

  // 6b. Super Admin: Advisor Access Codes (+226 74 36 60 51)
  app.get('/api/admin/advisor-codes', requireAdmin, (_req, res) => {
    const dbData = ensureDatabase();
    res.json({
      advisorCodes: dbData.advisorCodes,
      advisorContact: {
        phoneDisplay: ADVISOR_PHONE_DISPLAY,
        whatsappDigits: ADVISOR_WHATSAPP_DIGITS,
      },
    });
  });

  app.post('/api/admin/advisor-codes', requireAdmin, (req, res) => {
    const body = req.body || {};
    const dbData = ensureDatabase();
    const existing = collectAllAdvisorCodes(dbData);

    let code = String(body.customCode || '')
      .toUpperCase()
      .replace(/[^A-Z0-9-]/g, '')
      .trim();

    if (!code) {
      code = generateAdvisorCode(existing);
    } else if (code.length < 4) {
      res.status(400).json({ error: 'Le code Conseiller doit contenir au moins 4 caractères.' });
      return;
    } else if (existing.has(code)) {
      res.status(409).json({ error: `Le code Conseiller ${code} existe déjà.` });
      return;
    }

    const userId = typeof body.userId === 'string' && body.userId.trim() ? body.userId.trim() : undefined;
    const linkedAccount = userId ? dbData.accounts.find((a) => a.id === userId) : undefined;

    const record: AdvisorCodeRecord = {
      id: `adv-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
      code,
      label:
        String(body.label || '').trim() ||
        (linkedAccount ? `Conseiller - ${linkedAccount.farmName}` : 'Code Conseiller Avicole'),
      userId: linkedAccount?.id,
      farmerName: String(body.farmerName || '').trim() || linkedAccount?.farmerName,
      phone: String(body.phone || '').trim() || linkedAccount?.phone,
      status: 'active',
      createdAtMs: Date.now(),
      usedCount: 0,
    };

    if (linkedAccount) {
      linkedAccount.advisorAccessEnabled = true;
      linkedAccount.advisorCode = code;
    }

    dbData.advisorCodes.unshift(record);
    saveDatabase(dbData);
    res.status(201).json({
      advisorCode: record,
      account: linkedAccount ? withEffectiveStatus(linkedAccount) : undefined,
    });
  });

  app.patch('/api/admin/advisor-codes/:id', requireAdmin, (req, res) => {
    const id = req.params.id;
    const body = req.body || {};
    const dbData = ensureDatabase();
    const idx = dbData.advisorCodes.findIndex((c) => c.id === id);

    if (idx === -1) {
      res.status(404).json({ error: 'Code Conseiller introuvable.' });
      return;
    }

    const current = dbData.advisorCodes[idx];
    const nextStatus: 'active' | 'revoked' =
      body.status === 'active' || body.status === 'revoked'
        ? body.status
        : current.status === 'active'
        ? 'revoked'
        : 'active';

    dbData.advisorCodes[idx] = { ...current, status: nextStatus };

    if (current.userId) {
      const acc = dbData.accounts.find((a) => a.id === current.userId);
      if (acc && acc.advisorCode?.toUpperCase() === current.code.toUpperCase()) {
        acc.advisorAccessEnabled = nextStatus === 'active';
      }
    }

    if (nextStatus === 'revoked') {
      const revCode = current.code.toUpperCase();
      for (const wsId of Object.keys(dbData.workspaces)) {
        if (dbData.workspaces[wsId]?.advisorUnlockCode?.toUpperCase() === revCode) {
          dbData.workspaces[wsId].advisorUnlocked = false;
          dbData.workspaces[wsId].updatedAtMs = Date.now();
        }
      }
    }

    saveDatabase(dbData);
    res.json({ advisorCode: dbData.advisorCodes[idx] });
  });

  app.delete('/api/admin/advisor-codes/:id', requireAdmin, (req, res) => {
    const id = req.params.id;
    const dbData = ensureDatabase();
    const target = dbData.advisorCodes.find((c) => c.id === id);
    if (!target) {
      res.status(404).json({ error: 'Code Conseiller introuvable.' });
      return;
    }

    dbData.advisorCodes = dbData.advisorCodes.filter((c) => c.id !== id);
    if (target.userId) {
      const acc = dbData.accounts.find((a) => a.id === target.userId);
      if (acc && acc.advisorCode?.toUpperCase() === target.code.toUpperCase()) {
        acc.advisorAccessEnabled = false;
        acc.advisorCode = undefined;
      }
    }

    const delCode = target.code.toUpperCase();
    for (const wsId of Object.keys(dbData.workspaces)) {
      if (dbData.workspaces[wsId]?.advisorUnlockCode?.toUpperCase() === delCode) {
        dbData.workspaces[wsId].advisorUnlocked = false;
        dbData.workspaces[wsId].advisorUnlockCode = undefined;
        dbData.workspaces[wsId].updatedAtMs = Date.now();
      }
    }

    saveDatabase(dbData);
    res.json({ deleted: true });
  });

  // 6c. Farmer: Unlock Domain Advisor Option (+226 74 36 60 51) with Super Admin Code
  app.post('/api/advisor/unlock', (req, res) => {
    const rawCode = typeof req.body?.code === 'string' ? req.body.code : '';
    const userId = typeof req.body?.userId === 'string' ? req.body.userId.trim() : '';
    const accessCode = String(req.header('x-access-code') || '').toUpperCase().trim();
    const normalized = rawCode.toUpperCase().trim();

    if (!normalized) {
      res.status(400).json({ error: 'Veuillez entrer le code transmis par le Super Admin.' });
      return;
    }

    const dbData = ensureDatabase();
    const advIdx = dbData.advisorCodes.findIndex((c) => c.code.toUpperCase() === normalized);

    if (advIdx !== -1) {
      const rec = dbData.advisorCodes[advIdx];
      if (rec.status === 'revoked') {
        res.status(403).json({
          error: 'Ce code Conseiller a été désactivé par le Super Admin.',
        });
        return;
      }
      if (rec.userId && userId && rec.userId !== userId) {
        res.status(403).json({
          error: 'Ce code Conseiller est réservé à une autre ferme.',
        });
        return;
      }

      dbData.advisorCodes[advIdx] = {
        ...rec,
        usedCount: (rec.usedCount || 0) + 1,
        lastUsedAtMs: Date.now(),
        lastUsedByUserId: userId || rec.lastUsedByUserId,
      };
    } else {
      // Fallback check on account-level advisorCode
      const accMatch = dbData.accounts.find(
        (a) => a.advisorCode && a.advisorCode.toUpperCase() === normalized
      );
      if (!accMatch) {
        res.status(404).json({
          error: 'Code Conseiller invalide. Vérifiez le code transmis par le Super Admin.',
        });
        return;
      }
      if (!accMatch.advisorAccessEnabled) {
        res.status(403).json({
          error: 'Option Conseiller désactivée par le Super Admin pour ce code.',
        });
        return;
      }
      if (userId && accMatch.id !== userId) {
        res.status(403).json({
          error: 'Ce code Conseiller est rattaché à un autre compte éleveur.',
        });
        return;
      }
    }

    if (userId && dbData.workspaces[userId]) {
      const account = dbData.accounts.find((a) => a.id === userId);
      if (account && (!accessCode || account.code.toUpperCase() === accessCode)) {
        dbData.workspaces[userId].advisorUnlocked = true;
        dbData.workspaces[userId].advisorUnlockCode = normalized;
        dbData.workspaces[userId].updatedAtMs = Date.now();
      }
    }

    saveDatabase(dbData);
    res.json({
      unlocked: true,
      code: normalized,
      advisorPhone: ADVISOR_PHONE_DISPLAY,
      advisorWhatsApp: ADVISOR_WHATSAPP_DIGITS,
    });
  });

  // 7. User SaaS Login via Access Code
  app.post('/api/auth/login-code', (req, res) => {
    const rawCode = typeof req.body?.code === 'string' ? req.body.code : '';
    const normalized = rawCode.toUpperCase().trim();

    if (!normalized) {
      res.status(400).json({ error: 'Veuillez saisir votre code d\'accès.' });
      return;
    }

    const dbData = ensureDatabase();
    const idx = dbData.accounts.findIndex((a) => a.code.toUpperCase() === normalized);
    if (idx === -1) {
      res.status(404).json({
        error: 'Code d\'accès invalide. Vérifiez le code envoyé par votre administrateur.',
      });
      return;
    }

    const account = withEffectiveStatus(dbData.accounts[idx]);
    if (account.status === 'suspended') {
      res.status(403).json({
        error: 'Cet accès a été suspendu par le Super Admin.',
        suspended: true,
        account,
      });
      return;
    }

    if (account.status === 'expired') {
      res.status(403).json({
        error: 'Votre abonnement est expiré. Contactez l\'administrateur pour renouveler via Mobile Money.',
        expired: true,
        account,
      });
      return;
    }

    dbData.accounts[idx].lastLoginAtMs = Date.now();
    if (!dbData.workspaces[account.id]) {
      dbData.workspaces[account.id] = createEmptyWorkspace(account.country);
    }
    saveDatabase(dbData);

    res.json({
      account: { ...account, lastLoginAtMs: dbData.accounts[idx].lastLoginAtMs },
      workspace: dbData.workspaces[account.id],
    });
  });

  // 8. Isolated Per-User Workspace Fetch & Save
  app.get('/api/workspace/:userId', (req, res) => {
    const userId = req.params.userId;
    const accessCode = String(req.header('x-access-code') || '').toUpperCase().trim();
    const adminToken = req.header('x-admin-token');

    const dbData = ensureDatabase();
    const account = dbData.accounts.find((a) => a.id === userId);
    if (!account) {
      res.status(404).json({ error: 'Page utilisateur introuvable.' });
      return;
    }

    const isAdmin = verifyAdminToken(adminToken);
    if (!isAdmin && account.code.toUpperCase() !== accessCode) {
      res.status(403).json({ error: 'Accès non autorisé à cette page utilisateur.' });
      return;
    }

    const effective = withEffectiveStatus(account);
    if (!isAdmin && effective.status !== 'active') {
      res.status(403).json({ error: 'Abonnement inactif ou expiré.', account: effective });
      return;
    }

    const workspace = dbData.workspaces[userId] || createEmptyWorkspace(account.country);
    res.json({ account: effective, workspace });
  });

  app.put('/api/workspace/:userId', (req, res) => {
    const userId = req.params.userId;
    const accessCode = String(req.header('x-access-code') || '').toUpperCase().trim();
    const adminToken = req.header('x-admin-token');

    const dbData = ensureDatabase();
    const account = dbData.accounts.find((a) => a.id === userId);
    if (!account) {
      res.status(404).json({ error: 'Page utilisateur introuvable.' });
      return;
    }

    const isAdmin = verifyAdminToken(adminToken);
    if (!isAdmin && account.code.toUpperCase() !== accessCode) {
      res.status(403).json({ error: 'Accès non autorisé.' });
      return;
    }

    const effective = withEffectiveStatus(account);
    if (!isAdmin && effective.status !== 'active') {
      res.status(403).json({ error: 'Abonnement expiré ou suspendu.' });
      return;
    }

    const incoming = req.body as Partial<WorkspacePayload>;
    const existingWs = dbData.workspaces[userId] || createEmptyWorkspace(account.country);

    dbData.workspaces[userId] = {
      batches: Array.isArray(incoming.batches) ? incoming.batches : existingWs.batches,
      activeBatchId: typeof incoming.activeBatchId === 'string' ? incoming.activeBatchId : existingWs.activeBatchId,
      dailyLogs: Array.isArray(incoming.dailyLogs) ? incoming.dailyLogs : existingWs.dailyLogs,
      vaccineEvents:
        incoming.vaccineEvents && typeof incoming.vaccineEvents === 'object'
          ? incoming.vaccineEvents
          : existingWs.vaccineEvents,
      feedStock:
        incoming.feedStock && typeof incoming.feedStock === 'object'
          ? incoming.feedStock
          : existingWs.feedStock,
      cashFlow: Array.isArray(incoming.cashFlow) ? incoming.cashFlow : existingWs.cashFlow,
      country: ['CI', 'SN', 'BF', 'ML'].includes(String(incoming.country))
        ? (incoming.country as WestAfricanCountry)
        : existingWs.country,
      isAudioEnabled:
        typeof incoming.isAudioEnabled === 'boolean' ? incoming.isAudioEnabled : existingWs.isAudioEnabled,
      heatAlertThreshold:
        typeof incoming.heatAlertThreshold === 'number'
          ? incoming.heatAlertThreshold
          : existingWs.heatAlertThreshold,
      currentSimulatedTemp:
        typeof incoming.currentSimulatedTemp === 'number'
          ? incoming.currentSimulatedTemp
          : existingWs.currentSimulatedTemp,
      themeMode: incoming.themeMode === 'light' || incoming.themeMode === 'dark' ? incoming.themeMode : existingWs.themeMode,
      advisorUnlocked:
        typeof incoming.advisorUnlocked === 'boolean'
          ? incoming.advisorUnlocked
          : Boolean(existingWs.advisorUnlocked),
      advisorUnlockCode:
        typeof incoming.advisorUnlockCode === 'string'
          ? incoming.advisorUnlockCode
          : existingWs.advisorUnlockCode,
      updatedAtMs: Date.now(),
    };

    saveDatabase(dbData);
    res.json({ ok: true, updatedAtMs: dbData.workspaces[userId].updatedAtMs });
  });

  // Vite middleware in development, static serve in production
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
        ws: false,
      },
      appType: 'spa',
    });

    // Serve a WebSocket-free /@vite/client shim so proxied dev environments
    // with disabled HMR never log "WebSocket closed without opened" errors.
    app.get('/@vite/client', (_req, res) => {
      res.type('application/javascript');
      res.setHeader('Cache-Control', 'no-cache');
      res.send(`
const sheetsMap = new Map();
const linkSheetsMap = new Map();
if ("document" in globalThis) {
  document.querySelectorAll("style[data-vite-dev-id]").forEach((el) => {
    sheetsMap.set(el.getAttribute("data-vite-dev-id"), el);
  });
  document.querySelectorAll('link[rel="stylesheet"][data-vite-dev-id]').forEach((el) => {
    linkSheetsMap.set(el.getAttribute("data-vite-dev-id"), el);
  });
}
let lastInsertedStyle;
export function updateStyle(id, content) {
  if (linkSheetsMap.has(id)) return;
  let style = sheetsMap.get(id);
  if (!style) {
    style = document.createElement("style");
    style.setAttribute("type", "text/css");
    style.setAttribute("data-vite-dev-id", id);
    style.textContent = content;
    if (!lastInsertedStyle) {
      document.head.appendChild(style);
      setTimeout(() => {
        lastInsertedStyle = void 0;
      }, 0);
    } else {
      lastInsertedStyle.insertAdjacentElement("afterend", style);
    }
    lastInsertedStyle = style;
  } else if (style.textContent !== content) {
    style.textContent = content;
  }
  sheetsMap.set(id, style);
}
export function removeStyle(id) {
  if (linkSheetsMap.has(id)) {
    document
      .querySelectorAll('link[rel="stylesheet"][data-vite-dev-id="' + CSS.escape(id) + '"]')
      .forEach((el) => el.remove());
    linkSheetsMap.delete(id);
  }
  const style = sheetsMap.get(id);
  if (style) {
    document.head.removeChild(style);
    sheetsMap.delete(id);
  }
}
export function createHotContext() {
  return {
    data: {},
    accept() {},
    acceptExports() {},
    acceptDeps() {},
    dispose() {},
    prune() {},
    invalidate() {},
    decline() {},
    on() {},
    off() {},
    send() {},
  };
}
export function injectQuery(url, queryToInject) {
  if (url[0] !== "." && url[0] !== "/") return url;
  const pathname = url.replace(/[?#].*$/, "");
  const { search, hash } = new URL(url, "http://vite.dev");
  return pathname + "?" + queryToInject + (search ? "&" + search.slice(1) : "") + (hash || "");
}
export class ErrorOverlay extends HTMLElement {}
`);
    });

    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(process.cwd(), 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`FermeFacile Avicole SaaS running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
