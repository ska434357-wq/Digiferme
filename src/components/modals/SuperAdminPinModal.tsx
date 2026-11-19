import React, { useState, useEffect, useCallback, useRef } from 'react';
import { X, Lock, Delete, ShieldCheck } from 'lucide-react';
import { isJsonResponse, verifyLocalAdminPin } from '../../services/localSaasService';

interface SuperAdminPinModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (adminToken: string) => void;
}

export const SuperAdminPinModal: React.FC<SuperAdminPinModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [pin, setPin] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const verifyingRef = useRef<boolean>(false);

  const verifyPin = useCallback(
    async (candidatePin: string) => {
      if (candidatePin.length !== 6 || verifyingRef.current) return;
      verifyingRef.current = true;
      setIsVerifying(true);
      setError('');

      try {
        const res = await fetch('/api/admin/verify-pin', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ pin: candidatePin }),
        });
        if (isJsonResponse(res)) {
          const data = await res.json();
          if (res.ok && data.valid && data.adminToken) {
            setPin('');
            onSuccess(data.adminToken);
            return;
          }
          setError(data.error || 'Code PIN incorrect.');
          setPin('');
          return;
        }
      } catch {
        // Backend unreachable or offline: fall back to local PIN verification below
      } finally {
        verifyingRef.current = false;
        setIsVerifying(false);
      }

      const localResult = await verifyLocalAdminPin(candidatePin);
      if (localResult.valid && localResult.adminToken) {
        setPin('');
        onSuccess(localResult.adminToken);
      } else {
        setError(localResult.error || 'Code PIN incorrect.');
        setPin('');
      }
    },
    [onSuccess]
  );

  // Trigger verification cleanly outside state updaters when 6 digits are entered
  useEffect(() => {
    if (isOpen && pin.length === 6 && !verifyingRef.current) {
      void verifyPin(pin);
    }
  }, [isOpen, pin, verifyPin]);

  const handleDigit = useCallback((digit: string) => {
    if (verifyingRef.current) return;
    setError('');
    setPin((prev) => (prev.length >= 6 ? prev : prev + digit));
  }, []);

  const handleBackspace = useCallback(() => {
    if (verifyingRef.current) return;
    setError('');
    setPin((prev) => prev.slice(0, -1));
  }, []);

  useEffect(() => {
    if (!isOpen) {
      setPin('');
      setError('');
      verifyingRef.current = false;
      setIsVerifying(false);
      return;
    }

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === 'Backspace') {
        handleBackspace();
      } else if (e.key === 'Escape') {
        onClose();
      }
    };

    const onPaste = (e: ClipboardEvent) => {
      const pasted = e.clipboardData?.getData('text') || '';
      const digitsOnly = pasted.replace(/\D/g, '').slice(0, 6);
      if (digitsOnly.length > 0) {
        e.preventDefault();
        setError('');
        setPin(digitsOnly);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('paste', onPaste);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('paste', onPaste);
    };
  }, [isOpen, handleDigit, handleBackspace, onClose]);

  if (!isOpen) return null;

  const digits = ['1', '2', '3', '4', '5', '6', '7', '8', '9'];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-xs">
      <div className="w-full max-w-xs rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-2xl text-slate-100">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-slate-800 border border-slate-700 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm text-white">Accès Super Admin</h3>
              <p className="text-[11px] text-slate-400">
                {isVerifying ? 'Vérification en cours...' : 'Entrez le code PIN à 6 chiffres'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white touch-manipulation"
            aria-label="Fermer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 6-dot PIN Indicator */}
        <div className="flex items-center justify-center gap-3 my-4">
          {[0, 1, 2, 3, 4, 5].map((idx) => (
            <div
              key={idx}
              className={`w-3.5 h-3.5 rounded-full border transition-all ${
                idx < pin.length
                  ? 'bg-emerald-500 border-emerald-400 scale-110'
                  : 'bg-slate-950 border-slate-700'
              }`}
            />
          ))}
        </div>

        {error && (
          <div className="mb-3 p-2 rounded-lg bg-red-950/50 border border-red-800/60 text-red-300 text-xs text-center font-medium">
            {error}
          </div>
        )}

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-2">
          {digits.map((d) => (
            <button
              key={d}
              type="button"
              disabled={isVerifying}
              onClick={() => handleDigit(d)}
              className="py-3 min-h-[48px] rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-white font-bold text-base transition active:scale-95 disabled:opacity-50 touch-manipulation select-none"
            >
              {d}
            </button>
          ))}
          <button
            type="button"
            disabled={isVerifying}
            onClick={() => {
              setError('');
              setPin('');
            }}
            className="py-3 min-h-[48px] rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-400 font-semibold text-xs transition touch-manipulation select-none"
          >
            Effacer
          </button>
          <button
            type="button"
            disabled={isVerifying}
            onClick={() => handleDigit('0')}
            className="py-3 min-h-[48px] rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-white font-bold text-base transition active:scale-95 disabled:opacity-50 touch-manipulation select-none"
          >
            0
          </button>
          <button
            type="button"
            disabled={isVerifying}
            onClick={handleBackspace}
            className="py-3 min-h-[48px] rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 flex items-center justify-center transition active:scale-95 disabled:opacity-50 touch-manipulation select-none"
            aria-label="Supprimer un chiffre"
          >
            <Delete className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
          <Lock className="w-3 h-3" />
          <span>Espace protégé d'administration SaaS</span>
        </div>
      </div>
    </div>
  );
};
