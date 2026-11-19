import React, { useState } from 'react';
import { usePoultryStore } from '../../store/usePoultryStore';
import {
  X,
  Sun,
  Moon,
  Check,
  LogOut,
  User,
  ShieldCheck,
} from 'lucide-react';
import { speakMessage } from '../../utils/audioSpeech';
import { WestAfricanCountry } from '../../types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenUserPage: () => void;
  onOpenAdminPin: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  onOpenUserPage,
  onOpenAdminPin,
}) => {
  const currentUser = usePoultryStore((state) => state.currentUser);
  const themeMode = usePoultryStore((state) => state.themeMode);
  const setThemeMode = usePoultryStore((state) => state.setThemeMode);
  const isAudioEnabled = usePoultryStore((state) => state.isAudioEnabled);
  const toggleAudio = usePoultryStore((state) => state.toggleAudio);
  const country = usePoultryStore((state) => state.country);
  const setCountry = usePoultryStore((state) => state.setCountry);
  const resetToDemoData = usePoultryStore((state) => state.resetToDemoData);
  const syncQueueToServer = usePoultryStore((state) => state.syncQueueToServer);
  const logoutUser = usePoultryStore((state) => state.logoutUser);

  const [confirmReset, setConfirmReset] = useState(false);

  if (!isOpen) return null;

  const isLight = themeMode === 'light';

  const handleThemeChange = (mode: 'light' | 'dark') => {
    setThemeMode(mode);
    if (isAudioEnabled) {
      speakMessage(mode === 'light' ? 'Mode plein soleil activé.' : 'Mode sombre activé.');
    }
  };

  const handleReset = () => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    resetToDemoData();
    setConfirmReset(false);
    if (isAudioEnabled) {
      speakMessage('Données de démonstration chargées.');
    }
    onClose();
  };

  const countries: { code: WestAfricanCountry; name: string; flag: string }[] = [
    { code: 'CI', name: 'Côte d\'Ivoire', flag: '🇨🇮' },
    { code: 'SN', name: 'Sénégal', flag: '🇸🇳' },
    { code: 'BF', name: 'Burkina Faso', flag: '🇧🇫' },
    { code: 'ML', name: 'Mali', flag: '🇲🇱' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 p-0 sm:p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-2xl text-slate-100 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div>
            <h3 className="font-bold text-base text-white">Paramètres</h3>
            <p className="text-xs text-slate-400">
              Affichage et Préférences
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3.5">
          {/* USER ACCOUNT QUICK CARD */}
          {currentUser && (
            <div className="rounded-xl bg-slate-950 border border-slate-800 p-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <span className="text-[10px] uppercase text-emerald-400 font-semibold block">
                  Page Active
                </span>
                <p className="text-xs font-bold text-white truncate">
                  {currentUser.farmName}
                </p>
                <p className="text-[10px] text-slate-400 truncate">
                  {currentUser.farmerName} • Formule {currentUser.plan}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onOpenUserPage();
                }}
                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white flex items-center gap-1 shrink-0"
              >
                <User className="w-3.5 h-3.5 text-emerald-400" />
                Ma Page
              </button>
            </div>
          )}

          {/* THEME TOGGLE */}
          <div className="rounded-xl bg-slate-950 border border-slate-800 p-3 space-y-2">
            <h4 className="font-semibold text-xs text-slate-300 uppercase">
              Mode d'Affichage
            </h4>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleThemeChange('light')}
                className={`p-3 rounded-lg border text-left transition flex flex-col justify-between ${
                  isLight
                    ? 'bg-slate-800 border-slate-600 text-white font-semibold'
                    : 'bg-slate-900 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <Sun className="w-4 h-4 text-amber-500" />
                  {isLight && <Check className="w-4 h-4 text-emerald-400" />}
                </div>
                <div className="mt-2">
                  <span className="text-xs font-bold block">Plein Soleil</span>
                  <span className="text-[10px] text-slate-400 block">Anti-reflets en extérieur</span>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleThemeChange('dark')}
                className={`p-3 rounded-lg border text-left transition flex flex-col justify-between ${
                  !isLight
                    ? 'bg-slate-800 border-slate-600 text-white font-semibold'
                    : 'bg-slate-900 border-slate-800 text-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <Moon className="w-4 h-4 text-slate-300" />
                  {!isLight && <Check className="w-4 h-4 text-emerald-400" />}
                </div>
                <div className="mt-2">
                  <span className="text-xs font-bold block">Mode Sombre</span>
                  <span className="text-[10px] text-slate-400 block">Standard & nuit</span>
                </div>
              </button>
            </div>
          </div>

          {/* AUDIO GUIDE */}
          <div className="rounded-xl bg-slate-950 border border-slate-800 p-3 flex items-center justify-between">
            <div>
              <h5 className="font-semibold text-xs text-white">Guide Vocal Français</h5>
              <p className="text-[10px] text-slate-400">
                Lecture orale des alertes
              </p>
            </div>

            <button
              onClick={() => {
                toggleAudio();
                if (!isAudioEnabled) {
                  speakMessage('Guide vocal activé.');
                }
              }}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition ${
                isAudioEnabled
                  ? 'bg-emerald-700 text-white'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {isAudioEnabled ? 'Activé' : 'Désactivé'}
            </button>
          </div>

          {/* COUNTRY */}
          <div className="rounded-xl bg-slate-950 border border-slate-800 p-3 space-y-2">
            <h5 className="font-semibold text-xs text-white">Pays (FCFA)</h5>
            <div className="grid grid-cols-2 gap-1.5">
              {countries.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  onClick={() => setCountry(c.code)}
                  className={`p-2 rounded-lg text-xs flex items-center justify-between border transition ${
                    country === c.code
                      ? 'bg-slate-800 border-slate-600 text-white font-semibold'
                      : 'bg-slate-900 border-slate-800 text-slate-300'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span>{c.flag}</span>
                    <span>{c.name}</span>
                  </span>
                  {country === c.code && <Check className="w-3.5 h-3.5" />}
                </button>
              ))}
            </div>
          </div>

          {/* OFFLINE STORAGE & RESET */}
          <div className="rounded-xl bg-slate-950 border border-slate-800 p-3 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-white">Stockage Page Privée</span>
              <span className="text-[10px] text-slate-400">100% Hors-ligne</span>
            </div>
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => syncQueueToServer()}
                className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs transition"
              >
                Synchroniser
              </button>
              <button
                onClick={handleReset}
                className={`flex-1 py-1.5 rounded-lg text-xs transition ${
                  confirmReset
                    ? 'bg-amber-700 text-white font-semibold'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-200'
                }`}
              >
                {confirmReset ? 'Confirmer Démo ?' : 'Charger Démo'}
              </button>
            </div>
          </div>
        </div>

        <div className="mt-4 space-y-2">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenAdminPin();
            }}
            className="w-full py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-emerald-400 font-semibold text-xs flex items-center justify-center gap-1.5 transition"
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Console Super Admin
          </button>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                logoutUser();
              }}
              className="flex-1 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-red-400 font-semibold text-xs flex items-center justify-center gap-1.5 transition"
            >
              <LogOut className="w-3.5 h-3.5" />
              Déconnexion
            </button>
            <button
              onClick={onClose}
              className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-xs transition"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

