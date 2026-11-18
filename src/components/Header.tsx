import React, { useState } from 'react';
import { usePoultryStore } from '../store/usePoultryStore';
import { WestAfricanCountry } from '../types';
import {
  Volume2,
  VolumeX,
  Plus,
  ChevronDown,
  Layers,
  Sun,
  Moon,
  Settings,
  User,
} from 'lucide-react';
import { speakMessage, stopSpeaking } from '../utils/audioSpeech';
import { useTripleTap } from '../hooks/useTripleTap';

interface HeaderProps {
  onOpenNewBatchModal: () => void;
  onOpenMobileMoneyModal: () => void;
  onOpenSettingsModal: () => void;
  onOpenUserPage: () => void;
  onOpenAdminPin: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenNewBatchModal,
  onOpenSettingsModal,
  onOpenUserPage,
  onOpenAdminPin,
}) => {
  const currentUser = usePoultryStore((state) => state.currentUser);
  const batches = usePoultryStore((state) => state.batches);
  const activeBatchId = usePoultryStore((state) => state.activeBatchId);
  const setActiveBatchId = usePoultryStore((state) => state.setActiveBatchId);
  const country = usePoultryStore((state) => state.country);
  const setCountry = usePoultryStore((state) => state.setCountry);
  const isAudioEnabled = usePoultryStore((state) => state.isAudioEnabled);
  const toggleAudio = usePoultryStore((state) => state.toggleAudio);
  const themeMode = usePoultryStore((state) => state.themeMode);
  const toggleThemeMode = usePoultryStore((state) => state.toggleThemeMode);

  const [showBatchDropdown, setShowBatchDropdown] = useState(false);
  const [showCountryDropdown, setShowCountryDropdown] = useState(false);

  const handleLogoTap = useTripleTap(onOpenAdminPin);
  const activeBatch = batches.find((b) => b.id === activeBatchId) || batches[0];
  const isLight = themeMode === 'light';

  const countries: { code: WestAfricanCountry; name: string; flag: string }[] = [
    { code: 'CI', name: 'Côte d\'Ivoire', flag: '🇨🇮' },
    { code: 'SN', name: 'Sénégal', flag: '🇸🇳' },
    { code: 'BF', name: 'Burkina Faso', flag: '🇧🇫' },
    { code: 'ML', name: 'Mali', flag: '🇲🇱' },
  ];

  const handleAudioToggle = () => {
    if (isAudioEnabled) {
      stopSpeaking();
      toggleAudio();
    } else {
      toggleAudio();
      speakMessage('Guide vocal activé.');
    }
  };

  const handleThemeToggle = () => {
    toggleThemeMode();
    if (isAudioEnabled) {
      speakMessage(!isLight ? 'Mode Plein Soleil activé.' : 'Mode sombre activé.');
    }
  };

  return (
    <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-40">
      <div className="max-w-md mx-auto px-3.5 py-2.5">
        <div className="flex items-center justify-between gap-2">
          {/* Logo & Brand (Triple-click / Triple-tap opens Super Admin PIN) */}
          <button
            type="button"
            onClick={handleLogoTap}
            className="flex items-center gap-2 text-left select-none focus:outline-none min-w-0"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center font-bold text-sm shrink-0">
              🐔
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-bold text-white text-base tracking-tight">
                  FermeFacile
                </span>
                <span className="text-[10px] text-slate-400 font-medium">
                  Avicole
                </span>
              </div>
              <p className="text-[10px] text-slate-400 truncate max-w-[140px]">
                {currentUser ? currentUser.farmName : '100% Hors-Ligne'}
              </p>
            </div>
          </button>

          {/* Right Header Controls - Clean Neutral Palette */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Sunlight / Dark mode toggle */}
            <button
              onClick={handleThemeToggle}
              title={isLight ? 'Mode Sombre' : 'Mode Plein Soleil'}
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/80 transition active:scale-95"
            >
              {isLight ? <Sun className="w-4 h-4 text-amber-500" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Audio toggle */}
            <button
              onClick={handleAudioToggle}
              title={isAudioEnabled ? 'Désactiver le son' : 'Activer le son'}
              className={`p-2 rounded-lg border transition active:scale-95 ${
                isAudioEnabled
                  ? 'bg-slate-800 border-slate-600 text-emerald-400'
                  : 'bg-slate-800 border-slate-700/80 text-slate-400'
              }`}
            >
              {isAudioEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>

            {/* Country Selector */}
            <div className="relative">
              <button
                onClick={() => {
                  setShowCountryDropdown(!showCountryDropdown);
                  setShowBatchDropdown(false);
                }}
                className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 border border-slate-700/80 px-2 py-1.5 rounded-lg text-xs font-medium text-slate-200 transition"
              >
                <span>{countries.find((c) => c.code === country)?.flag}</span>
                <span className="text-[11px] font-semibold">{country}</span>
                <ChevronDown className="w-3 h-3 text-slate-400" />
              </button>

              {showCountryDropdown && (
                <div className="absolute right-0 mt-2 w-44 bg-slate-900 border border-slate-700 rounded-xl shadow-xl z-50 p-1">
                  <p className="text-[10px] uppercase text-slate-400 font-semibold px-2 py-1 border-b border-slate-800">
                    Pays (FCFA)
                  </p>
                  {countries.map((c) => (
                    <button
                      key={c.code}
                      onClick={() => {
                        setCountry(c.code);
                        setShowCountryDropdown(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs text-left transition ${
                        country === c.code
                          ? 'bg-slate-800 text-white font-bold'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <span>{c.flag}</span>
                        <span>{c.name}</span>
                      </span>
                      {country === c.code && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* My Page Button */}
            <button
              onClick={onOpenUserPage}
              title="Ma Page & Abonnement"
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700/80 transition"
            >
              <User className="w-4 h-4" />
            </button>

            {/* Settings Button */}
            <button
              onClick={onOpenSettingsModal}
              title="Paramètres"
              className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/80 transition"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Batch Selector Bar */}
        <div className="mt-2 pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
          <div className="relative flex-1">
            <button
              onClick={() => {
                setShowBatchDropdown(!showBatchDropdown);
                setShowCountryDropdown(false);
              }}
              className="w-full flex items-center justify-between bg-slate-800/60 hover:bg-slate-800 border border-slate-700/80 px-2.5 py-1.5 rounded-lg text-xs text-left transition"
            >
              <div className="flex items-center gap-2 overflow-hidden">
                <Layers className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="font-medium text-slate-100 truncate">
                  {activeBatch?.name || 'Sélectionner un lot'}
                </span>
                <span className="text-[10px] text-slate-400 shrink-0 font-mono">
                  {activeBatch?.breed}
                </span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
            </button>

            {showBatchDropdown && (
              <div className="absolute left-0 mt-2 w-full bg-slate-900 border border-slate-700 rounded-xl shadow-xl z-50 p-1.5">
                <div className="flex items-center justify-between px-2 py-1 text-[11px] font-semibold text-slate-400">
                  <span>Mes Lots ({batches.length})</span>
                  <button
                    onClick={() => {
                      setShowBatchDropdown(false);
                      onOpenNewBatchModal();
                    }}
                    className="text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Nouveau Lot
                  </button>
                </div>
                <div className="space-y-1 mt-1 max-h-48 overflow-y-auto">
                  {batches.map((b) => (
                    <button
                      key={b.id}
                      onClick={() => {
                        setActiveBatchId(b.id);
                        setShowBatchDropdown(false);
                      }}
                      className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs text-left transition ${
                        b.id === activeBatch?.id
                          ? 'bg-slate-800 text-white font-bold border border-slate-700'
                          : 'text-slate-300 hover:bg-slate-800'
                      }`}
                    >
                      <div>
                        <p className="font-medium text-white">{b.name}</p>
                        <p className="text-[10px] text-slate-400">
                          {b.initialChicks} poussins • {b.supplier}
                        </p>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {b.breed}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Quick Create Batch Button */}
          <button
            onClick={onOpenNewBatchModal}
            title="Créer un nouveau lot"
            className="bg-emerald-700 hover:bg-emerald-600 text-white p-1.5 rounded-lg transition shrink-0"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
      </div>
    </header>
  );
};
