import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  Plus,
  Copy,
  Check,
  Send,
  RefreshCw,
  PauseCircle,
  PlayCircle,
  Trash2,
  ExternalLink,
  Search,
  LogOut,
  Sun,
  Moon,
  Cloud,
  Users,
  Calendar,
  Headset,
  KeyRound,
} from 'lucide-react';
import {
  SaaSUserAccount,
  SubscriptionPlan,
  SaaSPaymentMethod,
  WestAfricanCountry,
  UserWorkspaceSnapshot,
  AdvisorCodeRecord,
  ADVISOR_CONTACT,
} from '../../types';
import { usePoultryStore } from '../../store/usePoultryStore';
import { auth } from '../../lib/firebase';
import {
  signInWithGoogleCloud,
  signOutGoogleCloud,
  syncAccessCodeToFirestore,
} from '../../services/cloudSyncService';
import {
  isJsonResponse,
  isLocalAdminToken,
  localCreateAccount,
  localCreateAdvisorCode,
  localDeleteAccount,
  localDeleteAdvisorCode,
  localGetWorkspaceForAdmin,
  localListAccounts,
  localListAdvisorCodes,
  localReplaceFromServer,
  localToggleAdvisorCode,
  localUpdateAccount,
} from '../../services/localSaasService';

interface SuperAdminConsoleProps {
  adminToken: string;
  onExitAdmin: () => void;
  onOpenUserPage: (account: SaaSUserAccount, workspace: Partial<UserWorkspaceSnapshot>) => void;
  onRequestReauth?: () => void;
}

const PLAN_LABELS: Record<SubscriptionPlan, { label: string; days: number; price: number }> = {
  mensuel: { label: 'Mensuel', days: 30, price: 5000 },
  trimestriel: { label: 'Trimestriel', days: 90, price: 13500 },
  annuel: { label: 'Annuel', days: 365, price: 48000 },
};

const PAYMENT_LABELS: Record<SaaSPaymentMethod, string> = {
  wave: 'Wave',
  orange_money: 'Orange Money',
  mtn_momo: 'MTN MoMo',
  moov_money: 'Moov Money',
  cash: 'Espèces',
};

export const SuperAdminConsole: React.FC<SuperAdminConsoleProps> = ({
  adminToken,
  onExitAdmin,
  onOpenUserPage,
  onRequestReauth,
}) => {
  const themeMode = usePoultryStore((state) => state.themeMode);
  const toggleThemeMode = usePoultryStore((state) => state.toggleThemeMode);
  const isLight = themeMode === 'light';

  const [accounts, setAccounts] = useState<SaaSUserAccount[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [isAuthExpired, setIsAuthExpired] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Filters
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'expired' | 'suspended'>('all');
  const [planFilter, setPlanFilter] = useState<'all' | SubscriptionPlan>('all');

  // Create Form
  const [showCreateForm, setShowCreateForm] = useState<boolean>(true);
  const [farmerName, setFarmerName] = useState<string>('');
  const [farmName, setFarmName] = useState<string>('');
  const [phone, setPhone] = useState<string>('+225 ');
  const [country, setCountry] = useState<WestAfricanCountry>('CI');
  const [plan, setPlan] = useState<SubscriptionPlan>('mensuel');
  const [paymentMethod, setPaymentMethod] = useState<SaaSPaymentMethod>('wave');
  const [amountFCFA, setAmountFCFA] = useState<number>(5000);
  const [customCode, setCustomCode] = useState<string>('');
  const [seedDemo, setSeedDemo] = useState<boolean>(false);
  const [includeAdvisorCode, setIncludeAdvisorCode] = useState<boolean>(true);
  const [isCreating, setIsCreating] = useState<boolean>(false);

  // Advisor Codes Management (+226 74 36 60 51)
  const [advisorCodes, setAdvisorCodes] = useState<AdvisorCodeRecord[]>([]);
  const [showAdvisorPanel, setShowAdvisorPanel] = useState<boolean>(true);
  const [advLabel, setAdvLabel] = useState<string>('');
  const [advFarmerName, setAdvFarmerName] = useState<string>('');
  const [advPhone, setAdvPhone] = useState<string>('+226 ');
  const [advCustomCode, setAdvCustomCode] = useState<string>('');
  const [isCreatingAdvCode, setIsCreatingAdvCode] = useState<boolean>(false);
  const [copiedAdvisorId, setCopiedAdvisorId] = useState<string | null>(null);

  // Firebase Google Cloud state
  const [cloudEmail, setCloudEmail] = useState<string | null>(auth.currentUser?.email || null);
  const [isCloudSyncing, setIsCloudSyncing] = useState<boolean>(false);

  const useLocalMode = isLocalAdminToken(adminToken);

  const fetchAccounts = useCallback(async () => {
    setIsLoading(true);
    setErrorMsg('');
    setIsAuthExpired(false);

    if (!useLocalMode) {
      try {
        const [accountsRes, advRes] = await Promise.all([
          fetch('/api/admin/codes', {
            headers: { 'x-admin-token': adminToken },
          }),
          fetch('/api/admin/advisor-codes', {
            headers: { 'x-admin-token': adminToken },
          }),
        ]);
        if (isJsonResponse(accountsRes)) {
          const data = await accountsRes.json();
          if (!accountsRes.ok) {
            if (accountsRes.status === 401) {
              setIsAuthExpired(true);
            }
            setErrorMsg(data.error || 'Erreur lors du chargement des comptes.');
            return;
          }
          const serverAccounts = Array.isArray(data.accounts) ? data.accounts : [];
          let serverAdvisorCodes: AdvisorCodeRecord[] = [];
          if (advRes.ok && isJsonResponse(advRes)) {
            const advData = await advRes.json();
            serverAdvisorCodes = Array.isArray(advData.advisorCodes) ? advData.advisorCodes : [];
          }
          setAccounts(serverAccounts);
          setAdvisorCodes(serverAdvisorCodes);
          localReplaceFromServer(serverAccounts, serverAdvisorCodes);
          return;
        }
      } catch {
        // Offline or static host: fall back to local SaaS database
      } finally {
        setIsLoading(false);
      }
    }

    setAccounts(localListAccounts());
    setAdvisorCodes(localListAdvisorCodes());
    setIsLoading(false);
  }, [adminToken, useLocalMode]);

  useEffect(() => {
    void fetchAccounts();
  }, [fetchAccounts]);

  const handlePlanSelect = (nextPlan: SubscriptionPlan) => {
    setPlan(nextPlan);
    setAmountFCFA(PLAN_LABELS[nextPlan].price);
  };

  const handleCreateCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      let created: SaaSUserAccount | undefined;

      if (!useLocalMode) {
        try {
          const res = await fetch('/api/admin/codes', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-admin-token': adminToken,
            },
            body: JSON.stringify({
              farmerName,
              farmName,
              phone,
              country,
              plan,
              paymentMethod,
              amountFCFA,
              customCode: customCode.trim() || undefined,
              seedDemo,
              includeAdvisorCode,
            }),
          });
          if (isJsonResponse(res)) {
            const data = await res.json();
            if (!res.ok || !data.account) {
              setErrorMsg(data.error || 'Création impossible.');
              return;
            }
            created = data.account as SaaSUserAccount;
          }
        } catch {
          // Fall back to local mode below
        }
      }

      if (!created) {
        const localRes = localCreateAccount({
          farmerName,
          farmName,
          phone,
          country,
          plan,
          paymentMethod,
          amountFCFA,
          customCode: customCode.trim() || undefined,
          seedDemo,
          includeAdvisorCode,
        });
        if (!localRes.ok || !localRes.account) {
          setErrorMsg(localRes.error || 'Création impossible.');
          return;
        }
        created = localRes.account;
      }

      setAccounts((prev) => [created!, ...prev]);
      setSuccessMsg(
        created.advisorCode
          ? `Code créé pour ${created.farmerName} : ${created.code} (Conseiller : ${created.advisorCode})`
          : `Code créé pour ${created.farmerName} : ${created.code}`
      );
      setFarmerName('');
      setFarmName('');
      setCustomCode('');
      void fetchAccounts();

      if (auth.currentUser?.emailVerified) {
        try {
          await syncAccessCodeToFirestore(created);
        } catch {
          // Best effort cloud backup
        }
      }
    } finally {
      setIsCreating(false);
    }
  };

  const handleRenew = async (account: SaaSUserAccount, renewPlan: SubscriptionPlan) => {
    setErrorMsg('');
    let updated: SaaSUserAccount | undefined;

    if (!useLocalMode) {
      try {
        const res = await fetch(`/api/admin/codes/${encodeURIComponent(account.id)}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-token': adminToken,
          },
          body: JSON.stringify({
            renewPlan,
            amountFCFA: PLAN_LABELS[renewPlan].price,
          }),
        });
        if (isJsonResponse(res)) {
          const data = await res.json();
          if (!res.ok || !data.account) {
            setErrorMsg(data.error || 'Renouvellement impossible.');
            return;
          }
          updated = data.account as SaaSUserAccount;
        }
      } catch {
        // Fall back to local update
      }
    }

    if (!updated) {
      const localRes = localUpdateAccount(account.id, {
        renewPlan,
        amountFCFA: PLAN_LABELS[renewPlan].price,
      });
      if (!localRes.ok || !localRes.account) {
        setErrorMsg(localRes.error || 'Renouvellement impossible.');
        return;
      }
      updated = localRes.account;
    }

    setAccounts((prev) => prev.map((a) => (a.id === updated!.id ? updated! : a)));
    setSuccessMsg(
      `Abonnement ${PLAN_LABELS[renewPlan].label} appliqué pour ${updated.farmerName}.`
    );
    if (auth.currentUser?.emailVerified) {
      void syncAccessCodeToFirestore(updated).catch(() => {});
    }
  };

  const handleToggleSuspend = async (account: SaaSUserAccount) => {
    const nextStatus = account.status === 'suspended' ? 'active' : 'suspended';
    setErrorMsg('');
    let updated: SaaSUserAccount | undefined;

    if (!useLocalMode) {
      try {
        const res = await fetch(`/api/admin/codes/${encodeURIComponent(account.id)}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-token': adminToken,
          },
          body: JSON.stringify({ status: nextStatus }),
        });
        if (isJsonResponse(res)) {
          const data = await res.json();
          if (!res.ok || !data.account) {
            setErrorMsg(data.error || 'Modification impossible.');
            return;
          }
          updated = data.account as SaaSUserAccount;
        }
      } catch {
        // Fall back to local update
      }
    }

    if (!updated) {
      const localRes = localUpdateAccount(account.id, { status: nextStatus });
      if (!localRes.ok || !localRes.account) {
        setErrorMsg(localRes.error || 'Modification impossible.');
        return;
      }
      updated = localRes.account;
    }

    setAccounts((prev) => prev.map((a) => (a.id === updated!.id ? updated! : a)));
    if (auth.currentUser?.emailVerified) {
      void syncAccessCodeToFirestore(updated).catch(() => {});
    }
  };

  const handleDelete = async (id: string) => {
    setErrorMsg('');
    let handledByServer = false;

    if (!useLocalMode) {
      try {
        const res = await fetch(`/api/admin/codes/${encodeURIComponent(id)}`, {
          method: 'DELETE',
          headers: { 'x-admin-token': adminToken },
        });
        if (isJsonResponse(res)) {
          handledByServer = true;
          if (!res.ok) {
            const data = await res.json();
            setErrorMsg(data.error || 'Suppression impossible.');
            return;
          }
        }
      } catch {
        // Fall back to local delete
      }
    }

    if (!handledByServer) {
      localDeleteAccount(id);
    }

    setAccounts((prev) => prev.filter((a) => a.id !== id));
    setConfirmDeleteId(null);
  };

  const handleInspectWorkspace = async (account: SaaSUserAccount) => {
    setErrorMsg('');
    if (!useLocalMode) {
      try {
        const res = await fetch(`/api/admin/workspace/${encodeURIComponent(account.id)}`, {
          headers: { 'x-admin-token': adminToken },
        });
        if (isJsonResponse(res)) {
          const data = await res.json();
          if (!res.ok) {
            setErrorMsg(data.error || "Impossible d'ouvrir cette page utilisateur.");
            return;
          }
          onOpenUserPage(data.account || account, data.workspace || {});
          return;
        }
      } catch {
        // Fall back to local workspace
      }
    }

    const localData = localGetWorkspaceForAdmin(account.id);
    onOpenUserPage(localData.account || account, localData.workspace || {});
  };

  const handleCopyCode = async (account: SaaSUserAccount) => {
    try {
      await navigator.clipboard.writeText(account.code);
      setCopiedId(account.id);
      setTimeout(() => setCopiedId(null), 1800);
    } catch {
      setSuccessMsg(`Code : ${account.code}`);
    }
  };

  const handleSendWhatsApp = (account: SaaSUserAccount) => {
    const expDate = new Date(account.expiresAtMs).toLocaleDateString('fr-FR');
    const cleanPhone = account.phone.replace(/[^0-9]/g, '');
    const advisorLine =
      account.advisorAccessEnabled && account.advisorCode
        ? `\n🩺 Code Conseiller (${ADVISOR_CONTACT.phoneDisplay}) : *${account.advisorCode}*`
        : '';
    const text = `🐔 *FERMEFACILE AVICOLE*\nBonjour ${account.farmerName},\nVoici votre code d'accès personnel pour votre page *${account.farmName}* :\n\n🔑 Code : *${account.code}*\n📅 Formule : ${PLAN_LABELS[account.plan].label} (valide jusqu'au ${expDate})${advisorLine}\n\nOuvrez l'application FermeFacile et entrez ce code pour accéder à votre espace privé.`;
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleAccountAdvisorAction = async (
    account: SaaSUserAccount,
    action: 'generate' | 'enable' | 'disable'
  ) => {
    setErrorMsg('');
    const payload =
      action === 'generate'
        ? { generateAdvisorCode: true }
        : action === 'enable'
        ? { advisorAccessEnabled: true }
        : { advisorAccessEnabled: false };

    let updated: SaaSUserAccount | undefined;
    let nextAdvisorCodes: AdvisorCodeRecord[] | undefined;

    if (!useLocalMode) {
      try {
        const res = await fetch(`/api/admin/codes/${encodeURIComponent(account.id)}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-token': adminToken,
          },
          body: JSON.stringify(payload),
        });
        if (isJsonResponse(res)) {
          const data = await res.json();
          if (!res.ok || !data.account) {
            setErrorMsg(data.error || 'Mise à jour Conseiller impossible.');
            return;
          }
          updated = data.account as SaaSUserAccount;
          if (Array.isArray(data.advisorCodes)) {
            nextAdvisorCodes = data.advisorCodes;
          }
        }
      } catch {
        // Fall back to local mode
      }
    }

    if (!updated) {
      const localRes = localUpdateAccount(account.id, payload);
      if (!localRes.ok || !localRes.account) {
        setErrorMsg(localRes.error || 'Mise à jour Conseiller impossible.');
        return;
      }
      updated = localRes.account;
      nextAdvisorCodes = localRes.advisorCodes;
    }

    setAccounts((prev) => prev.map((a) => (a.id === updated!.id ? updated! : a)));
    if (nextAdvisorCodes) {
      setAdvisorCodes(nextAdvisorCodes);
    }
    setSuccessMsg(
      action === 'disable'
        ? `Option Conseiller désactivée pour ${updated.farmerName}.`
        : `Code Conseiller actif pour ${updated.farmerName} : ${updated.advisorCode}`
    );
  };

  const handleCreateStandaloneAdvisorCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreatingAdvCode(true);
    setErrorMsg('');
    try {
      let created: AdvisorCodeRecord | undefined;

      if (!useLocalMode) {
        try {
          const res = await fetch('/api/admin/advisor-codes', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-admin-token': adminToken,
            },
            body: JSON.stringify({
              label: advLabel.trim() || undefined,
              farmerName: advFarmerName.trim() || undefined,
              phone: advPhone.trim() || undefined,
              customCode: advCustomCode.trim() || undefined,
            }),
          });
          if (isJsonResponse(res)) {
            const data = await res.json();
            if (!res.ok || !data.advisorCode) {
              setErrorMsg(data.error || 'Impossible de générer le code Conseiller.');
              return;
            }
            created = data.advisorCode as AdvisorCodeRecord;
          }
        } catch {
          // Fall back to local mode
        }
      }

      if (!created) {
        const localRes = localCreateAdvisorCode({
          label: advLabel.trim() || undefined,
          farmerName: advFarmerName.trim() || undefined,
          phone: advPhone.trim() || undefined,
          customCode: advCustomCode.trim() || undefined,
        });
        if (!localRes.ok || !localRes.advisorCode) {
          setErrorMsg(localRes.error || 'Impossible de générer le code Conseiller.');
          return;
        }
        created = localRes.advisorCode;
      }

      setAdvisorCodes((prev) => [created!, ...prev]);
      setSuccessMsg(`Code Conseiller généré : ${created.code}`);
      setAdvLabel('');
      setAdvFarmerName('');
      setAdvCustomCode('');
    } finally {
      setIsCreatingAdvCode(false);
    }
  };

  const handleToggleAdvisorCode = async (rec: AdvisorCodeRecord) => {
    setErrorMsg('');
    const targetStatus = rec.status === 'active' ? 'revoked' : 'active';
    let updated: AdvisorCodeRecord | undefined;

    if (!useLocalMode) {
      try {
        const res = await fetch(`/api/admin/advisor-codes/${encodeURIComponent(rec.id)}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            'x-admin-token': adminToken,
          },
          body: JSON.stringify({ status: targetStatus }),
        });
        if (isJsonResponse(res)) {
          const data = await res.json();
          if (!res.ok || !data.advisorCode) {
            setErrorMsg(data.error || 'Modification impossible.');
            return;
          }
          updated = data.advisorCode as AdvisorCodeRecord;
        }
      } catch {
        // Fall back to local mode
      }
    }

    if (!updated) {
      const localUpdated = localToggleAdvisorCode(rec.id, targetStatus);
      if (!localUpdated) {
        setErrorMsg('Code Conseiller introuvable.');
        return;
      }
      updated = localUpdated;
    }

    setAdvisorCodes((prev) => prev.map((c) => (c.id === updated!.id ? updated! : c)));
    void fetchAccounts();
  };

  const handleDeleteAdvisorCode = async (id: string) => {
    setErrorMsg('');
    let handledByServer = false;

    if (!useLocalMode) {
      try {
        const res = await fetch(`/api/admin/advisor-codes/${encodeURIComponent(id)}`, {
          method: 'DELETE',
          headers: { 'x-admin-token': adminToken },
        });
        if (isJsonResponse(res)) {
          handledByServer = true;
          if (!res.ok) {
            const data = await res.json();
            setErrorMsg(data.error || 'Suppression impossible.');
            return;
          }
        }
      } catch {
        // Fall back to local mode
      }
    }

    if (!handledByServer) {
      localDeleteAdvisorCode(id);
    }

    setAdvisorCodes((prev) => prev.filter((c) => c.id !== id));
    void fetchAccounts();
  };

  const handleCopyText = async (keyId: string, textToCopy: string) => {
    try {
      await navigator.clipboard.writeText(textToCopy);
      setCopiedAdvisorId(keyId);
      setTimeout(() => setCopiedAdvisorId(null), 1800);
    } catch {
      setSuccessMsg(`Code : ${textToCopy}`);
    }
  };

  const handleSendAdvisorCodeWhatsApp = (
    code: string,
    recipientName?: string,
    recipientPhone?: string
  ) => {
    const cleanPhone = (recipientPhone || '').replace(/[^0-9]/g, '');
    const text = `🩺 *OPTION CONSEILLER AVICOLE - FERMEFACILE*\nBonjour${
      recipientName ? ` ${recipientName}` : ''
    },\nVoici votre code pour débloquer l'appel téléphonique et le chat WhatsApp avec notre conseiller du domaine (${ADVISOR_CONTACT.phoneDisplay}) :\n\n🔑 Code Conseiller : *${code}*\n\nDans l'application, ouvrez *Santé* → *Conseiller du Domaine* et entrez ce code.`;
    const url = cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleCloudSync = async () => {
    setIsCloudSyncing(true);
    setErrorMsg('');
    try {
      let user = auth.currentUser;
      if (!user) {
        user = await signInWithGoogleCloud();
        setCloudEmail(user.email);
      }
      if (user?.emailVerified) {
        for (const acc of accounts) {
          await syncAccessCodeToFirestore(acc);
        }
        setSuccessMsg(`${accounts.length} codes synchronisés sur Cloud Firestore.`);
      }
    } catch (err) {
      setErrorMsg(
        err instanceof Error ? err.message : 'Erreur de synchronisation Firebase Cloud.'
      );
    } finally {
      setIsCloudSyncing(false);
    }
  };

  const filteredAccounts = accounts.filter((acc) => {
    if (statusFilter !== 'all' && acc.status !== statusFilter) return false;
    if (planFilter !== 'all' && acc.plan !== planFilter) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        acc.farmerName.toLowerCase().includes(q) ||
        acc.farmName.toLowerCase().includes(q) ||
        acc.code.toLowerCase().includes(q) ||
        acc.phone.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const activeCount = accounts.filter((a) => a.status === 'active').length;
  const expiredOrSuspendedCount = accounts.length - activeCount;
  const totalRevenue = accounts.reduce((sum, a) => sum + (a.amountFCFA || 0), 0);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 pb-12 transition-colors duration-200">
      {/* Top Bar */}
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-700 text-white flex items-center justify-center shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h1 className="font-bold text-sm text-white">Console Super Admin</h1>
              <p className="text-[11px] text-slate-400">
                Codes d'accès & Abonnements SaaS
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleThemeMode}
              title={isLight ? 'Mode Sombre' : 'Mode Plein Soleil'}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 transition"
            >
              {isLight ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={onExitAdmin}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-200 flex items-center gap-1.5 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              Quitter
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 pt-4 space-y-4">
        {/* KPI Summary Grid */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] uppercase text-slate-400 font-semibold flex items-center gap-1">
              <Users className="w-3 h-3" /> Éleveurs
            </span>
            <p className="text-xl font-extrabold text-white mt-1">{accounts.length}</p>
            <span className="text-[10px] text-emerald-400">{activeCount} actifs</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] uppercase text-slate-400 font-semibold flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Inactifs
            </span>
            <p className="text-xl font-extrabold text-white mt-1">{expiredOrSuspendedCount}</p>
            <span className="text-[10px] text-slate-400">Expirés / susp.</span>
          </div>

          <div className="p-3 rounded-xl bg-slate-900 border border-slate-800">
            <span className="text-[10px] uppercase text-slate-400 font-semibold block">
              Recettes SaaS
            </span>
            <p className="text-base font-extrabold text-white mt-1 truncate">
              {totalRevenue.toLocaleString('fr-FR')} F
            </p>
            <span className="text-[10px] text-slate-400">Cumul codes</span>
          </div>
        </div>

        {/* Cloud Firestore Backup Bar */}
        <div className="rounded-xl bg-slate-900 border border-slate-800 p-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <Cloud className="w-4 h-4 text-emerald-400 shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-white truncate">
                Sauvegarde Cloud Firestore
              </p>
              <p className="text-[11px] text-slate-400 truncate">
                {cloudEmail ? `Connecté : ${cloudEmail}` : 'Optionnel : synchroniser vos codes dans le cloud'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {cloudEmail && (
              <button
                type="button"
                onClick={async () => {
                  await signOutGoogleCloud();
                  setCloudEmail(null);
                }}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 text-[11px] text-slate-300 hover:bg-slate-700"
              >
                Déco
              </button>
            )}
            <button
              type="button"
              onClick={handleCloudSync}
              disabled={isCloudSyncing}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-white flex items-center gap-1.5 transition disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isCloudSyncing ? 'animate-spin' : ''}`} />
              {cloudEmail ? 'Sync' : 'Connecter'}
            </button>
          </div>
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-xs text-red-300 flex items-center justify-between gap-2 flex-wrap">
            <span>{errorMsg}</span>
            {isAuthExpired && onRequestReauth && (
              <button
                type="button"
                onClick={onRequestReauth}
                className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-semibold text-xs shrink-0"
              >
                Ressaisir le PIN
              </button>
            )}
          </div>
        )}
        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-800/60 text-xs text-emerald-300 flex items-center justify-between">
            <span>{successMsg}</span>
            <button
              type="button"
              onClick={() => setSuccessMsg('')}
              className="text-[11px] underline ml-2"
            >
              OK
            </button>
          </div>
        )}

        {/* Create New Access Code Section */}
        <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowCreateForm(!showCreateForm)}
            className="w-full p-3.5 flex items-center justify-between text-left border-b border-slate-800"
          >
            <div className="flex items-center gap-2">
              <Plus className="w-4 h-4 text-emerald-400" />
              <span className="font-bold text-sm text-white">
                Créer un Code d'Accès & Page Éleveur
              </span>
            </div>
            <span className="text-xs text-slate-400">
              {showCreateForm ? 'Masquer' : 'Ouvrir'}
            </span>
          </button>

          {showCreateForm && (
            <form onSubmit={handleCreateCode} className="p-4 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Nom de l'éleveur *
                  </label>
                  <input
                    type="text"
                    required
                    value={farmerName}
                    onChange={(e) => setFarmerName(e.target.value)}
                    placeholder="Ex : Kouadio Jean"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Nom de la ferme *
                  </label>
                  <input
                    type="text"
                    required
                    value={farmName}
                    onChange={(e) => setFarmName(e.target.value)}
                    placeholder="Ex : Ferme Avicole Yamoussoukro"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Téléphone WhatsApp
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+225 07..."
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Pays
                  </label>
                  <select
                    value={country}
                    onChange={(e) => setCountry(e.target.value as WestAfricanCountry)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none"
                  >
                    <option value="CI">🇨🇮 Côte d'Ivoire</option>
                    <option value="SN">🇸🇳 Sénégal</option>
                    <option value="BF">🇧🇫 Burkina Faso</option>
                    <option value="ML">🇲🇱 Mali</option>
                  </select>
                </div>
              </div>

              {/* Subscription Tier Selection */}
              <div>
                <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                  Formule d'Abonnement
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['mensuel', 'trimestriel', 'annuel'] as SubscriptionPlan[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handlePlanSelect(p)}
                      className={`p-2.5 rounded-lg border text-left transition ${
                        plan === p
                          ? 'bg-slate-800 border-emerald-600 text-white'
                          : 'bg-slate-950 border-slate-800 text-slate-300'
                      }`}
                    >
                      <span className="block font-bold text-xs">{PLAN_LABELS[p].label}</span>
                      <span className="block text-[10px] text-slate-400">
                        {PLAN_LABELS[p].days}j • {PLAN_LABELS[p].price.toLocaleString('fr-FR')} F
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Paiement
                  </label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value as SaaSPaymentMethod)}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none"
                  >
                    <option value="wave">Wave</option>
                    <option value="orange_money">Orange Money</option>
                    <option value="mtn_momo">MTN MoMo</option>
                    <option value="moov_money">Moov Money</option>
                    <option value="cash">Espèces</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Montant (FCFA)
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={amountFCFA}
                    onChange={(e) => setAmountFCFA(Number(e.target.value))}
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs text-white focus:outline-none"
                  />
                </div>

                <div className="col-span-2 sm:col-span-1">
                  <label className="block text-[11px] font-semibold text-slate-400 mb-1">
                    Code (optionnel)
                  </label>
                  <input
                    type="text"
                    value={customCode}
                    onChange={(e) => setCustomCode(e.target.value.toUpperCase())}
                    placeholder="Auto (FF-...)"
                    className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-800 text-xs font-mono uppercase text-white focus:outline-none"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-xs text-slate-300 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={seedDemo}
                  onChange={(e) => setSeedDemo(e.target.checked)}
                  className="rounded border-slate-700"
                />
                <span>Pré-remplir la page avec un lot exemple (sinon page vierge)</span>
              </label>

              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeAdvisorCode}
                  onChange={(e) => setIncludeAdvisorCode(e.target.checked)}
                  className="rounded border-slate-700"
                />
                <span>
                  Générer aussi un code Conseiller Avicole ({ADVISOR_CONTACT.phoneDisplay})
                </span>
              </label>

              <button
                type="submit"
                disabled={isCreating}
                className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-50"
              >
                <Plus className="w-4 h-4" />
                {isCreating ? 'Création en cours...' : 'Générer le Code & Créer sa Page'}
              </button>
            </form>
          )}
        </div>

        {/* Dedicated Advisor Access Codes Section (+226 74 36 60 51) */}
        <div className="rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowAdvisorPanel(!showAdvisorPanel)}
            className="w-full p-3.5 flex items-center justify-between text-left border-b border-slate-800"
          >
            <div className="flex items-center gap-2">
              <Headset className="w-4 h-4 text-emerald-400" />
              <div>
                <span className="font-bold text-sm text-white block">
                  Codes Conseiller du Domaine ({ADVISOR_CONTACT.phoneDisplay})
                </span>
                <span className="text-[11px] text-slate-400">
                  {advisorCodes.filter((c) => c.status === 'active').length} codes actifs pour débloquer l'appel & WhatsApp
                </span>
              </div>
            </div>
            <span className="text-xs text-slate-400">
              {showAdvisorPanel ? 'Masquer' : 'Ouvrir'}
            </span>
          </button>

          {showAdvisorPanel && (
            <div className="p-4 space-y-3">
              <form
                onSubmit={handleCreateStandaloneAdvisorCode}
                className="p-3 rounded-lg bg-slate-950 border border-slate-800 space-y-2.5"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={advLabel}
                    onChange={(e) => setAdvLabel(e.target.value)}
                    placeholder="Libellé (ex : Urgence lot Bouaké)"
                    className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-600"
                  />
                  <input
                    type="text"
                    value={advFarmerName}
                    onChange={(e) => setAdvFarmerName(e.target.value)}
                    placeholder="Nom éleveur (optionnel)"
                    className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="tel"
                    value={advPhone}
                    onChange={(e) => setAdvPhone(e.target.value)}
                    placeholder="Téléphone WhatsApp"
                    className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none focus:border-emerald-600"
                  />
                  <input
                    type="text"
                    value={advCustomCode}
                    onChange={(e) => setAdvCustomCode(e.target.value.toUpperCase())}
                    placeholder="Code auto (FF-CONS-...)"
                    className="px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono uppercase text-white focus:outline-none focus:border-emerald-600"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isCreatingAdvCode}
                  className="w-full py-2 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition disabled:opacity-50"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  {isCreatingAdvCode ? 'Génération...' : 'Générer un Code Conseiller'}
                </button>
              </form>

              {advisorCodes.length === 0 ? (
                <p className="text-xs text-slate-500 text-center py-2">
                  Aucun code Conseiller généré pour le moment.
                </p>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {advisorCodes.map((rec) => (
                    <div
                      key={rec.id}
                      className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between gap-2 flex-wrap"
                    >
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs text-emerald-400">
                            {rec.code}
                          </span>
                          <span
                            className={`text-[10px] font-semibold ${
                              rec.status === 'active' ? 'text-emerald-400' : 'text-amber-400'
                            }`}
                          >
                            {rec.status === 'active' ? 'Actif' : 'Révoqué'}
                          </span>
                          <span className="text-[10px] text-slate-500 tabular-nums">
                            • {rec.usedCount || 0} util.
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">
                          {rec.label}
                          {rec.farmerName ? ` · ${rec.farmerName}` : ''}
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopyText(rec.id, rec.code)}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-200 flex items-center gap-1"
                        >
                          {copiedAdvisorId === rec.id ? (
                            <Check className="w-3 h-3 text-emerald-400" />
                          ) : (
                            <Copy className="w-3 h-3" />
                          )}
                          <span>Copier</span>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            handleSendAdvisorCodeWhatsApp(rec.code, rec.farmerName, rec.phone)
                          }
                          className="px-2 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-[11px] font-semibold text-white flex items-center gap-1"
                        >
                          <Send className="w-3 h-3" />
                          <span>WA</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleAdvisorCode(rec)}
                          title={rec.status === 'active' ? 'Révoquer' : 'Réactiver'}
                          className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                        >
                          {rec.status === 'active' ? (
                            <PauseCircle className="w-3 h-3 text-amber-400" />
                          ) : (
                            <PlayCircle className="w-3 h-3 text-emerald-400" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteAdvisorCode(rec.id)}
                          title="Supprimer"
                          className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-red-400 border border-slate-700"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Users & Access Codes List */}
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="relative flex-1">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher nom, ferme, code..."
                className="w-full pl-8 pr-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-xs text-white focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-1.5 overflow-x-auto">
              {(['all', 'active', 'expired', 'suspended'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold border transition shrink-0 ${
                    statusFilter === st
                      ? 'bg-slate-800 border-slate-600 text-white'
                      : 'bg-slate-900 border-slate-800 text-slate-400'
                  }`}
                >
                  {st === 'all'
                    ? 'Tous'
                    : st === 'active'
                    ? 'Actifs'
                    : st === 'expired'
                    ? 'Expirés'
                    : 'Suspendus'}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto">
            {(['all', 'mensuel', 'trimestriel', 'annuel'] as const).map((pf) => (
              <button
                key={pf}
                type="button"
                onClick={() => setPlanFilter(pf)}
                className={`px-2.5 py-1 rounded-md text-[11px] font-medium border transition shrink-0 ${
                  planFilter === pf
                    ? 'bg-emerald-950/60 border-emerald-700 text-emerald-300'
                    : 'bg-slate-900 border-slate-800 text-slate-400'
                }`}
              >
                {pf === 'all' ? 'Toutes formules' : PLAN_LABELS[pf].label}
              </button>
            ))}
          </div>

          {isLoading ? (
            <div className="p-8 text-center text-xs text-slate-400 rounded-xl bg-slate-900 border border-slate-800">
              Chargement des abonnements...
            </div>
          ) : filteredAccounts.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500 rounded-xl bg-slate-900 border border-slate-800">
              Aucun compte correspondant.
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredAccounts.map((acc) => {
                const daysLeft = Math.max(
                  0,
                  Math.ceil((acc.expiresAtMs - Date.now()) / 86400000)
                );
                const statusBadge =
                  acc.status === 'active'
                    ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800'
                    : acc.status === 'suspended'
                    ? 'bg-amber-950/60 text-amber-300 border-amber-800'
                    : 'bg-red-950/60 text-red-300 border-red-800';

                return (
                  <div
                    key={acc.id}
                    className="rounded-xl bg-slate-900 border border-slate-800 p-3.5 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-bold text-sm text-white">{acc.farmName}</h3>
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border ${statusBadge}`}
                          >
                            {acc.status === 'active'
                              ? `Actif (${daysLeft}j)`
                              : acc.status === 'suspended'
                              ? 'Suspendu'
                              : 'Expiré'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {acc.farmerName} • {acc.phone} • {acc.country}
                        </p>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-[11px] font-bold text-slate-200 block">
                          {PLAN_LABELS[acc.plan].label}
                        </span>
                        <span className="text-[10px] text-slate-400">
                          {PAYMENT_LABELS[acc.paymentMethod]} •{' '}
                          {acc.amountFCFA.toLocaleString('fr-FR')} F
                        </span>
                      </div>
                    </div>

                    {/* Access Code Bar */}
                    <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 flex items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] uppercase text-slate-500 block">
                          Code d'Accès
                        </span>
                        <span className="font-mono font-bold text-sm text-emerald-400 tracking-wider">
                          {acc.code}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleCopyCode(acc)}
                          className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 flex items-center gap-1 transition"
                        >
                          {copiedId === acc.id ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Copié</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copier</span>
                            </>
                          )}
                        </button>

                        <button
                          type="button"
                          onClick={() => handleSendWhatsApp(acc)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-xs font-semibold text-white flex items-center gap-1 transition"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>WhatsApp</span>
                        </button>
                      </div>
                    </div>

                    {/* Account Advisor Option Bar */}
                    <div className="px-2.5 py-2 rounded-lg bg-slate-950/70 border border-slate-800/80 flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2 min-w-0">
                        <Headset className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <div className="min-w-0">
                          <span className="text-[10px] text-slate-400 block">
                            Option Conseiller ({ADVISOR_CONTACT.phoneDisplay})
                          </span>
                          {acc.advisorCode ? (
                            <span className="font-mono font-bold text-xs text-white">
                              {acc.advisorCode}{' '}
                              <span
                                className={`font-sans text-[10px] ${
                                  acc.advisorAccessEnabled ? 'text-emerald-400' : 'text-amber-400'
                                }`}
                              >
                                • {acc.advisorAccessEnabled ? 'Activé' : 'Désactivé'}
                              </span>
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-500">Aucun code attribué</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {acc.advisorCode ? (
                          <>
                            <button
                              type="button"
                              onClick={() => handleCopyText(`acc-${acc.id}`, acc.advisorCode || '')}
                              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-[11px] text-slate-200 flex items-center gap-1"
                            >
                              {copiedAdvisorId === `acc-${acc.id}` ? (
                                <Check className="w-3 h-3 text-emerald-400" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                              <span>Copier</span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleSendAdvisorCodeWhatsApp(
                                  acc.advisorCode || '',
                                  acc.farmerName,
                                  acc.phone
                                )
                              }
                              className="px-2 py-1 rounded bg-emerald-700 hover:bg-emerald-600 text-[11px] font-semibold text-white flex items-center gap-1"
                            >
                              <Send className="w-3 h-3" />
                              <span>Envoyer</span>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                handleAccountAdvisorAction(
                                  acc,
                                  acc.advisorAccessEnabled ? 'disable' : 'enable'
                                )
                              }
                              className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] text-slate-300"
                            >
                              {acc.advisorAccessEnabled ? 'Couper' : 'Activer'}
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleAccountAdvisorAction(acc, 'generate')}
                            className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] font-semibold text-emerald-300 flex items-center gap-1"
                          >
                            <KeyRound className="w-3 h-3" />
                            <span>Générer Code Conseiller</span>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Renewal & Account Actions */}
                    <div className="flex items-center justify-between gap-2 pt-1 flex-wrap text-[11px]">
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-slate-500 mr-1">Renouveler :</span>
                        <button
                          type="button"
                          onClick={() => handleRenew(acc, 'mensuel')}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                        >
                          +1 Mois
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRenew(acc, 'trimestriel')}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                        >
                          +3 Mois
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRenew(acc, 'annuel')}
                          className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700"
                        >
                          +1 An
                        </button>
                      </div>

                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleInspectWorkspace(acc)}
                          className="px-2.5 py-1 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-slate-700 font-semibold flex items-center gap-1"
                        >
                          <ExternalLink className="w-3 h-3" />
                          Sa Page
                        </button>

                        <button
                          type="button"
                          onClick={() => handleToggleSuspend(acc)}
                          title={acc.status === 'suspended' ? 'Réactiver' : 'Suspendre'}
                          className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700"
                        >
                          {acc.status === 'suspended' ? (
                            <PlayCircle className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <PauseCircle className="w-3.5 h-3.5 text-amber-400" />
                          )}
                        </button>

                        {confirmDeleteId === acc.id ? (
                          <button
                            type="button"
                            onClick={() => handleDelete(acc.id)}
                            className="px-2 py-1 rounded bg-red-800 hover:bg-red-700 text-white font-semibold"
                          >
                            Confirmer
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(acc.id)}
                            title="Supprimer"
                            className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-red-400 border border-slate-700"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <div className="text-[10px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-800/80">
                      <span>
                        Expire le {new Date(acc.expiresAtMs).toLocaleDateString('fr-FR')}
                      </span>
                      <span>
                        {acc.lastLoginAtMs
                          ? `Dernière connexion : ${new Date(acc.lastLoginAtMs).toLocaleDateString('fr-FR')}`
                          : 'Pas encore connecté'}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};
