/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ShieldCheck, ArrowLeft } from 'lucide-react';
import { Header } from './components/Header';
import { OfflineSyncBanner } from './components/OfflineSyncBanner';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { BottomNav } from './components/BottomNav';
import { DashboardTab } from './components/tabs/DashboardTab';
import { BatchManagementTab } from './components/tabs/BatchManagementTab';
import { ProphylaxisTab } from './components/tabs/ProphylaxisTab';
import { InventoryFinanceTab } from './components/tabs/InventoryFinanceTab';
import { VeterinaryGuideTab } from './components/tabs/VeterinaryGuideTab';
import { UserPageTab } from './components/tabs/UserPageTab';
import { SaaSLoginScreen } from './components/SaaSLoginScreen';
import { SuperAdminConsole } from './components/admin/SuperAdminConsole';
import { usePoultryStore } from './store/usePoultryStore';
import { SaaSUserAccount, UserWorkspaceSnapshot } from './types';
import { isJsonResponse } from './services/localSaasService';

// Modals
import { LogMortalityModal } from './components/modals/LogMortalityModal';
import { LogFeedModal } from './components/modals/LogFeedModal';
import { LogFinanceModal } from './components/modals/LogFinanceModal';
import { NewBatchModal } from './components/modals/NewBatchModal';
import { MobileMoneyModal } from './components/modals/MobileMoneyModal';
import { SettingsModal } from './components/modals/SettingsModal';
import { SuperAdminPinModal } from './components/modals/SuperAdminPinModal';

const queryClient = new QueryClient();

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const currentUser = usePoultryStore((state) => state.currentUser);
  const adminToken = usePoultryStore((state) => state.adminToken);
  const setAdminToken = usePoultryStore((state) => state.setAdminToken);
  const isAdminPreview = usePoultryStore((state) => state.isAdminPreview);
  const loadUserSession = usePoultryStore((state) => state.loadUserSession);
  const logoutUser = usePoultryStore((state) => state.logoutUser);
  const themeMode = usePoultryStore((state) => state.themeMode);

  const [isAdminPinOpen, setIsAdminPinOpen] = useState<boolean>(false);
  const [isAdminConsoleOpen, setIsAdminConsoleOpen] = useState<boolean>(() => {
    try {
      return window.sessionStorage.getItem('fermefacile-admin-open-v1') === '1';
    } catch {
      return false;
    }
  });

  // Sync admin console open state with sessionStorage
  useEffect(() => {
    try {
      if (isAdminConsoleOpen && adminToken) {
        window.sessionStorage.setItem('fermefacile-admin-open-v1', '1');
      } else {
        window.sessionStorage.removeItem('fermefacile-admin-open-v1');
      }
    } catch {
      // Ignore storage restrictions
    }
  }, [isAdminConsoleOpen, adminToken]);

  // Support direct ?admin=1 or #admin link to open the Super Admin PIN modal
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const wantsAdmin = params.get('admin') === '1' || window.location.hash === '#admin';
      if (wantsAdmin) {
        if (adminToken) {
          setIsAdminConsoleOpen(true);
        } else {
          setIsAdminPinOpen(true);
        }
      }
    } catch {
      // Ignore URL errors
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync theme mode with document body for high-visibility sunlight mode
  useEffect(() => {
    if (themeMode === 'light') {
      document.body.classList.add('theme-light');
    } else {
      document.body.classList.remove('theme-light');
    }
  }, [themeMode]);

  // Refresh active user's subscription & workspace in background when online
  useEffect(() => {
    if (!currentUser || isAdminPreview) return;
    let cancelled = false;

    const refreshSession = async () => {
      try {
        const res = await fetch(`/api/workspace/${encodeURIComponent(currentUser.id)}`, {
          headers: { 'x-access-code': currentUser.code },
        });
        if (cancelled || !isJsonResponse(res)) return;
        if (res.status === 403) {
          logoutUser();
          return;
        }
        if (res.ok) {
          const data = (await res.json()) as {
            account?: SaaSUserAccount;
            workspace?: Partial<UserWorkspaceSnapshot>;
          };
          if (data.account) {
            loadUserSession(data.account, data.workspace, { isAdminPreview: false });
          }
        }
      } catch {
        // Offline: keep using local persisted workspace seamlessly
      }
    };

    void refreshSession();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUser?.id]);

  // Modals state
  const [isMortalityModalOpen, setIsMortalityModalOpen] = useState<boolean>(false);
  const [isFeedModalOpen, setIsFeedModalOpen] = useState<boolean>(false);
  const [isFinanceModalOpen, setIsFinanceModalOpen] = useState<boolean>(false);
  const [isNewBatchModalOpen, setIsNewBatchModalOpen] = useState<boolean>(false);
  const [isMobileMoneyModalOpen, setIsMobileMoneyModalOpen] = useState<boolean>(false);
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState<boolean>(false);

  const handleAdminPinSuccess = (token: string) => {
    setAdminToken(token);
    setIsAdminPinOpen(false);
    setIsAdminConsoleOpen(true);
  };

  const handleOpenUserPageFromAdmin = (
    account: SaaSUserAccount,
    workspace: Partial<UserWorkspaceSnapshot>
  ) => {
    loadUserSession(account, workspace, {
      isAdminPreview: true,
      adminToken,
    });
    setCurrentTab('dashboard');
    setIsAdminConsoleOpen(false);
  };

  const handleReturnToAdmin = () => {
    logoutUser();
    setIsAdminConsoleOpen(true);
  };

  return (
    <QueryClientProvider client={queryClient}>
      {isAdminConsoleOpen && adminToken ? (
        <SuperAdminConsole
          adminToken={adminToken}
          onExitAdmin={() => setIsAdminConsoleOpen(false)}
          onOpenUserPage={handleOpenUserPageFromAdmin}
          onRequestReauth={() => {
            setAdminToken(null);
            setIsAdminConsoleOpen(false);
            setIsAdminPinOpen(true);
          }}
        />
      ) : !currentUser ? (
        <SaaSLoginScreen
          onOpenAdminPin={() => setIsAdminPinOpen(true)}
          onAdminPinSuccess={handleAdminPinSuccess}
        />
      ) : (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans transition-colors duration-200">
          {/* Admin Preview Banner if inspecting a user's isolated page */}
          {isAdminPreview && adminToken && (
            <div className="w-full bg-emerald-900 border-b border-emerald-700 px-3 py-1.5 flex items-center justify-between text-xs text-white">
              <span className="flex items-center gap-1.5 font-semibold truncate">
                <ShieldCheck className="w-3.5 h-3.5 shrink-0" />
                Aperçu Admin : {currentUser.farmName} ({currentUser.farmerName})
              </span>
              <button
                type="button"
                onClick={handleReturnToAdmin}
                className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-bold flex items-center gap-1 shrink-0"
              >
                <ArrowLeft className="w-3 h-3" />
                Retour Admin
              </button>
            </div>
          )}

          {/* PWA Install Banner */}
          <PWAInstallPrompt />

          {/* Real-time Offline & Synchronization Queue Banner */}
          <OfflineSyncBanner />

          {/* Fixed Mobile Container Shell for Farm Smartphone UX */}
          <div className="w-full max-w-md mx-auto flex-1 flex flex-col min-h-screen relative shadow-2xl border-x border-slate-900 bg-slate-950 transition-colors duration-200">
            {/* Header */}
            <Header
              onOpenNewBatchModal={() => setIsNewBatchModalOpen(true)}
              onOpenMobileMoneyModal={() => setIsMobileMoneyModalOpen(true)}
              onOpenSettingsModal={() => setIsSettingsModalOpen(true)}
              onOpenUserPage={() => setCurrentTab('mypage')}
              onOpenAdminPin={() => setIsAdminPinOpen(true)}
            />

            {/* Main Tab Content */}
            <main className="flex-1 px-3.5 pt-3">
              {currentTab === 'dashboard' && (
                <DashboardTab
                  onOpenMortality={() => setIsMortalityModalOpen(true)}
                  onOpenFeed={() => setIsFeedModalOpen(true)}
                  onOpenFinance={() => setIsFinanceModalOpen(true)}
                  onOpenNewBatchModal={() => setIsNewBatchModalOpen(true)}
                  onSelectTab={setCurrentTab}
                />
              )}

              {currentTab === 'batch' && (
                <BatchManagementTab
                  onOpenNewBatchModal={() => setIsNewBatchModalOpen(true)}
                  onOpenMortality={() => setIsMortalityModalOpen(true)}
                  onOpenFeed={() => setIsFeedModalOpen(true)}
                />
              )}

              {currentTab === 'prophylaxis' && <ProphylaxisTab />}

              {currentTab === 'inventory' && (
                <InventoryFinanceTab
                  onOpenFinanceModal={() => setIsFinanceModalOpen(true)}
                  onOpenMobileMoneyModal={() => setIsMobileMoneyModalOpen(true)}
                />
              )}

              {currentTab === 'guide' && (
                <VeterinaryGuideTab
                  onOpenMobileMoneyModal={() => setIsMobileMoneyModalOpen(true)}
                />
              )}

              {currentTab === 'mypage' && (
                <UserPageTab
                  onOpenNewBatchModal={() => setIsNewBatchModalOpen(true)}
                  onSelectTab={setCurrentTab}
                />
              )}
            </main>

            {/* Bottom Mobile Navigation Bar */}
            <BottomNav currentTab={currentTab} onSelectTab={setCurrentTab} />
          </div>

          {/* Modals */}
          <LogMortalityModal
            isOpen={isMortalityModalOpen}
            onClose={() => setIsMortalityModalOpen(false)}
          />

          <LogFeedModal
            isOpen={isFeedModalOpen}
            onClose={() => setIsFeedModalOpen(false)}
          />

          <LogFinanceModal
            isOpen={isFinanceModalOpen}
            onClose={() => setIsFinanceModalOpen(false)}
          />

          <NewBatchModal
            isOpen={isNewBatchModalOpen}
            onClose={() => setIsNewBatchModalOpen(false)}
          />

          <MobileMoneyModal
            isOpen={isMobileMoneyModalOpen}
            onClose={() => setIsMobileMoneyModalOpen(false)}
          />

          <SettingsModal
            isOpen={isSettingsModalOpen}
            onClose={() => setIsSettingsModalOpen(false)}
            onOpenUserPage={() => setCurrentTab('mypage')}
          />
        </div>
      )}

      {/* Global Super Admin PIN Modal (accessible via triple-click on app logo anywhere) */}
      <SuperAdminPinModal
        isOpen={isAdminPinOpen}
        onClose={() => setIsAdminPinOpen(false)}
        onSuccess={handleAdminPinSuccess}
      />
    </QueryClientProvider>
  );
}
