import React, { useState } from 'react';
import { usePoultryStore } from '../../store/usePoultryStore';
import { BroilerBreed } from '../../types';
import { X, Check } from 'lucide-react';
import { speakMessage } from '../../utils/audioSpeech';

interface NewBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NewBatchModal: React.FC<NewBatchModalProps> = ({ isOpen, onClose }) => {
  const createBatch = usePoultryStore((state) => state.createBatch);
  const isAudioEnabled = usePoultryStore((state) => state.isAudioEnabled);

  const [name, setName] = useState<string>('Lot #04 - Bâtiment B');
  const [initialChicks, setInitialChicks] = useState<number>(500);
  const [pricePerChickFCFA, setPricePerChickFCFA] = useState<number>(550);
  const [breed, setBreed] = useState<BroilerBreed>('Cobb 500');
  const [supplier, setSupplier] = useState<string>('SIPRA (Couvoir Azaguié)');
  const [startDate, setStartDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [targetHarvestDay, setTargetHarvestDay] = useState<number>(42);
  const [errorMsg, setErrorMsg] = useState<string>('');

  if (!isOpen) return null;

  const breeds: { name: BroilerBreed; desc: string }[] = [
    { name: 'Cobb 500', desc: 'Croissance rapide, forte poitrine' },
    { name: 'Ross 308', desc: 'Indice de consommation optimal' },
    { name: 'Hubbard', desc: 'Résistance chaleur tropicale' },
    { name: 'Goliath', desc: 'Race mixte rustique' },
  ];

  const popularSuppliers = [
    'SIPRA (Abidjan)',
    'FOANI Couvoir',
    'Couvoir National',
    'Sedima (Dakar)',
    'Avipole (Ouaga)',
  ];

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || initialChicks <= 0) {
      setErrorMsg('Veuillez renseigner un nom et un nombre valide.');
      return;
    }
    setErrorMsg('');

    createBatch({
      name: name.trim(),
      startDate,
      initialChicks,
      pricePerChickFCFA,
      breed,
      supplier,
      targetHarvestDay,
      targetWeightKg: 2.2,
      notes: `Démarrage de ${initialChicks} poussins ${breed}.`,
    });

    if (isAudioEnabled) {
      speakMessage(`Nouveau lot créé : ${name} avec ${initialChicks} poussins.`);
    }

    onClose();
  };

  const totalChickCost = initialChicks * pricePerChickFCFA;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 p-0 sm:p-4 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-slate-900 border border-slate-800 p-5 shadow-2xl text-slate-100 max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
          <div>
            <h3 className="font-bold text-base text-white">Nouveau Lot de Poussins</h3>
            <p className="text-xs text-slate-400">
              Paramétrage du lot et calendrier sanitaire
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleCreate} className="space-y-3">
          {/* Batch Name */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Nom du Lot :
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="ex: Lot #04 - Bâtiment B"
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none"
            />
          </div>

          {/* Number of Chicks */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Nombre de poussins :
            </label>
            <div className="flex items-center gap-2 mb-1.5">
              <input
                type="number"
                min="10"
                max="50000"
                required
                value={initialChicks || ''}
                onChange={(e) => setInitialChicks(parseInt(e.target.value, 10) || 0)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-sm font-bold focus:outline-none"
              />
              <span className="text-xs text-slate-400 shrink-0">sujets</span>
            </div>
            <div className="flex items-center gap-1">
              {[100, 250, 500, 1000].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setInitialChicks(count)}
                  className={`flex-1 py-1 rounded-md text-[11px] font-semibold border transition ${
                    initialChicks === count
                      ? 'bg-slate-800 text-white border-slate-600'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  {count}
                </button>
              ))}
            </div>
          </div>

          {/* Price per chick */}
          <div>
            <div className="flex items-center justify-between text-xs mb-1 text-slate-400">
              <label className="font-semibold">Prix unitaire du poussin :</label>
              <span className="font-semibold text-slate-200">{pricePerChickFCFA} FCFA</span>
            </div>
            <div className="flex items-center gap-1">
              {[450, 500, 550, 600].map((price) => (
                <button
                  key={price}
                  type="button"
                  onClick={() => setPricePerChickFCFA(price)}
                  className={`flex-1 py-1 rounded-md text-[11px] font-semibold border transition ${
                    pricePerChickFCFA === price
                      ? 'bg-slate-800 text-white border-slate-600'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  {price} F
                </button>
              ))}
            </div>
          </div>

          {/* Breed Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Souche :
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {breeds.map((b) => (
                <button
                  key={b.name}
                  type="button"
                  onClick={() => setBreed(b.name)}
                  className={`p-2 rounded-lg text-left border transition ${
                    breed === b.name
                      ? 'bg-slate-800 border-slate-600 text-white'
                      : 'bg-slate-950 border-slate-800 text-slate-400'
                  }`}
                >
                  <p className="text-xs font-semibold">{b.name}</p>
                  <p className="text-[10px] text-slate-500 line-clamp-1">{b.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Supplier */}
          <div>
            <label className="block text-xs font-semibold text-slate-400 mb-1">
              Couvoir / Fournisseur :
            </label>
            <input
              type="text"
              value={supplier}
              onChange={(e) => setSupplier(e.target.value)}
              placeholder="ex: SIPRA, FOANI"
              className="w-full px-3 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none mb-1"
            />
            <div className="flex items-center gap-1 overflow-x-auto text-[10px] pb-0.5">
              {popularSuppliers.map((sup) => (
                <button
                  key={sup}
                  type="button"
                  onClick={() => setSupplier(sup)}
                  className="px-2 py-0.5 rounded bg-slate-800 text-slate-400 hover:text-white shrink-0"
                >
                  {sup}
                </button>
              ))}
            </div>
          </div>

          {/* Arrival Date */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Date d'arrivée :
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">
                Objectif élevage :
              </label>
              <select
                value={targetHarvestDay}
                onChange={(e) => setTargetHarvestDay(parseInt(e.target.value, 10))}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-950 border border-slate-700 text-white text-xs focus:outline-none"
              >
                <option value={38}>38 jours (~1.8kg)</option>
                <option value={42}>42 jours (~2.2kg standard)</option>
                <option value={45}>45 jours (~2.5kg)</option>
              </select>
            </div>
          </div>

          {/* Total */}
          <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-xs flex items-center justify-between text-slate-400">
            <span>Coût poussins :</span>
            <strong className="text-white text-sm">
              {totalChickCost.toLocaleString('fr-FR')} FCFA
            </strong>
          </div>

          {errorMsg && (
            <div className="p-2 rounded-lg bg-red-950/50 border border-red-800/60 text-xs text-red-300 text-center">
              {errorMsg}
            </div>
          )}

          {/* Buttons */}
          <div className="mt-4 flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="flex-2 py-2.5 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition"
            >
              <Check className="w-4 h-4" />
              Lancer le Lot
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
