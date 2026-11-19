import React, { useState } from 'react';
import {
  KeyRound,
  ArrowRight,
  Sun,
  Moon,
  WifiOff,
  Smartphone,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';
import { useTripleTap } from '../hooks/useTripleTap';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { usePoultryStore } from '../store/usePoultryStore';
import { SaaSUserAccount, UserWorkspaceSnapshot } from '../types';
import {
  cacheServerAccountAndWorkspace,
  isJsonResponse,
  localLoginWithCode,
  verifyLocalAdminPin,
} from '../services/localSaasService';

interface SaaSLoginScreenProps {
  onOpenAdminPin: () => void;
  onAdminPinSuccess?: (adminToken: string) => void;
}

export const SaaSLoginScreen: React.FC<SaaSLoginScreenProps> = ({
  onOpenAdminPin,
  onAdminPinSuccess,
}) => {
  const isOnline = useOnlineStatus();
  const themeMode = usePoultryStore((state) => state.themeMode);
  const toggleThemeMode = usePoultryStore((state) => state.toggleThemeMode);
  const loadUserSession = usePoultryStore((state) => state.loadUserSession);

  const [code, setCode] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [expiredInfo, setExpiredInfo] = useState<SaaSUserAccount | null>(null);

  const handleLogoTap = useTripleTap(onOpenAdminPin);
  const isLight = themeMode === 'light';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = code.toUpperCase().trim();
    if (!cleaned) {
      setErrorMsg('Entrez le code reçu par votre administrateur.');
      return;
    }

    if (cleaned === 'ADMIN' || cleaned === 'SUPERADMIN') {
      setCode('');
      setErrorMsg('');
      onOpenAdminPin();
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setExpiredInfo(null);

    try {
      // Allow direct 6-digit Super Admin PIN entry on login screen as a convenience
      if (/^\d{6}$/.test(cleaned) && onAdminPinSuccess) {
        let serverHandledPin = false;
        try {
          const pinRes = await fetch('/api/admin/verify-pin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pin: cleaned }),
          });
          if (isJsonResponse(pinRes)) {
            serverHandledPin = true;
            const pinData = await pinRes.json();
            if (pinRes.ok && pinData.valid && pinData.adminToken) {
              setCode('');
              onAdminPinSuccess(pinData.adminToken);
              return;
            }
          }
        } catch {
          // Offline or static host: check local PIN below
        }

        if (!serverHandledPin) {
          const localPin = await verifyLocalAdminPin(cleaned);
          if (localPin.valid && localPin.adminToken) {
            setCode('');
            onAdminPinSuccess(localPin.adminToken);
            return;
          }
        }
      }

      try {
        const res = await fetch('/api/auth/login-code', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ code: cleaned }),
        });

        if (isJsonResponse(res)) {
          const data = (await res.json()) as {
            account?: SaaSUserAccount;
            workspace?: Partial<UserWorkspaceSnapshot>;
            error?: string;
            expired?: boolean;
          };

          if (!res.ok || !data.account) {
            setErrorMsg(data.error || "Code d'accès invalide.");
            if (data.expired && data.account) {
              setExpiredInfo(data.account);
            }
            return;
          }

          cacheServerAccountAndWorkspace(data.account, data.workspace);
          loadUserSession(data.account, data.workspace, { isAdminPreview: false });
          return;
        }
      } catch {
        // Network offline or static host: fall back to local SaaS store below
      }

      const localResult = localLoginWithCode(cleaned);
      if (localResult.ok && localResult.account) {
        loadUserSession(localResult.account, localResult.workspace, { isAdminPreview: false });
        return;
      }

      setErrorMsg(localResult.error || "Code d'accès invalide.");
      if (localResult.expired && localResult.account) {
        setExpiredInfo(localResult.account);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between px-4 py-6 transition-colors duration-200">
      {/* Top Bar */}
      <div className="w-full max-w-md mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs text-slate-400">
          {!isOnline ? (
            <span className="flex items-center gap-1.5 text-amber-400">
              <WifiOff className="w-3.5 h-3.5" />
              Hors-ligne
            </span>
          ) : (
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Espace Éleveur SaaS
            </span>
          )}
        </div>

        <button
          type="button"
          onClick={toggleThemeMode}
          title={isLight ? 'Mode Sombre' : 'Mode Plein Soleil'}
          className="p-2 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 transition"
        >
          {isLight ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4" />}
        </button>
      </div>

      {/* Main Login Card */}
      <div className="w-full max-w-md mx-auto my-auto py-6">
        <div className="rounded-2xl bg-slate-900 border border-slate-800 p-6 shadow-2xl space-y-6">
          {/* App Brand Logo (Triple-click / Triple-tap target for Super Admin) */}
          <div className="text-center space-y-2">
            <button
              type="button"
              onClick={handleLogoTap}
              className="mx-auto flex flex-col items-center gap-2 select-none focus:outline-none group"
            >
              <div className="w-14 h-14 rounded-2xl bg-emerald-700 text-white flex items-center justify-center text-2xl font-bold shadow-md transition-transform group-active:scale-95">
                🐔
              </div>
              <div>
                <h1 className="text-xl font-extrabold text-white tracking-tight">
                  FermeFacile <span className="text-emerald-400 font-semibold">Avicole</span>
                </h1>
                <p className="text-xs text-slate-400">
                  Suivi Poulets de Chair • 100% Hors-Ligne
                </p>
              </div>
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label
                htmlFor="access-code-input"
                className="block text-xs font-semibold uppercase text-slate-400 mb-1.5"
              >
                Code d'Accès Personnel
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  id="access-code-input"
                  type="text"
                  autoComplete="off"
                  autoCapitalize="characters"
                  value={code}
                  onChange={(e) => {
                    setCode(e.target.value.toUpperCase());
                    setErrorMsg('');
                  }}
                  placeholder="Ex : FF-TRIM-4821"
                  className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-white font-mono text-sm tracking-wider uppercase focus:outline-none focus:border-emerald-600"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5">
                Saisissez le code envoyé par votre administrateur pour ouvrir votre page ferme.
              </p>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-red-950/40 border border-red-800/60 text-xs text-red-300 space-y-1">
                <div className="flex items-start gap-2 font-semibold">
                  <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
                {expiredInfo && (
                  <p className="text-[11px] text-slate-300 pl-6">
                    Ferme : <strong>{expiredInfo.farmName}</strong> • Expiré le{' '}
                    {new Date(expiredInfo.expiresAtMs).toLocaleDateString('fr-FR')}.
                  </p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-sm flex items-center justify-center gap-2 transition active:scale-98 disabled:opacity-50"
            >
              <span>{isLoading ? 'Vérification...' : 'Ouvrir Ma Page Ferme'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Subscription Plans Info */}
          <div className="pt-4 border-t border-slate-800 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-slate-300 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5 text-emerald-400" />
                Abonnements & Mobile Money
              </span>
              <span className="text-[10px] text-slate-500">Wave • Orange • MTN • Moov</span>
            </div>

            <div className="grid grid-cols-3 gap-1.5 text-center text-[11px]">
              <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                <span className="block font-bold text-white">Mensuel</span>
                <span className="text-[10px] text-slate-400">30 jours</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                <span className="block font-bold text-white">Trimestriel</span>
                <span className="text-[10px] text-slate-400">90 jours</span>
              </div>
              <div className="p-2 rounded-lg bg-slate-950 border border-slate-800">
                <span className="block font-bold text-white">Annuel</span>
                <span className="text-[10px] text-slate-400">365 jours</span>
              </div>
            </div>

            <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-400 pt-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
              <span>Chaque éleveur dispose de sa propre page privée</span>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="w-full max-w-md mx-auto text-center space-y-2">
        <p className="text-[11px] text-slate-500">
          FermeFacile Avicole • Côte d'Ivoire • Sénégal • Burkina Faso • Mali
        </p>
        <button
          type="button"
          onClick={onOpenAdminPin}
          className="inline-flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-semibold text-slate-300 transition min-h-[36px]"
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>Accès Super Admin</span>
        </button>
      </div>
    </div>
  );
};
