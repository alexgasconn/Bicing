import React from 'react';
import { FilterCriteria } from '../types';
import { X, Filter, Zap, Bike, ParkingCircle, Navigation, MapPin } from 'lucide-react';

interface FilterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  criteria: FilterCriteria;
  onCriteriaChange: (c: FilterCriteria) => void;
  totalResults: number;
  userLocation: [number, number] | null;
}

const FilterPanel: React.FC<FilterPanelProps> = ({ 
    isOpen, 
    onClose, 
    criteria, 
    onCriteriaChange,
    totalResults,
    userLocation
}) => {
  if (!isOpen) return null;

  const handleReset = () => {
    onCriteriaChange({});
  };

  const updateCriteria = (key: keyof FilterCriteria, value: any) => {
    onCriteriaChange({ ...criteria, [key]: value > 0 ? value : undefined });
  };

  const toggleLocationUsage = (use: boolean) => {
      onCriteriaChange({ ...criteria, useUserLocation: use });
    };

  return (
        <div className="fixed inset-0 z-[5000] flex items-end md:items-center justify-center bg-black/30 backdrop-blur-sm p-0 md:p-4 animate-in fade-in duration-200">
            <div className="bg-white rounded-t-[28px] md:rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col h-[88dvh] md:h-auto md:max-h-[90vh] safe-area-bottom">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50 safe-area-top">
            <h2 className="font-bold text-slate-800 flex items-center gap-2">
                                <Filter size={18} /> Filtres d'estacions
            </h2>
            <button onClick={onClose} className="p-1 hover:bg-slate-200 rounded-full text-slate-500">
                <X size={20} />
            </button>
        </div>

                <div className="p-5 space-y-6 overflow-y-auto flex-1">
            
            <section className="space-y-4">
                
                <div>
                    <div className="flex justify-between text-sm mb-1.5">
                        <label className="font-medium text-slate-700 flex items-center gap-2"><ParkingCircle size={14} /> Mín. Espais</label>
                        <span className="font-bold text-slate-900">{criteria.minSlots || 0}</span>
                    </div>
                    <input 
                        type="range" min="0" max="30" step="1" 
                        value={criteria.minSlots || 0}
                        onChange={(e) => updateCriteria('minSlots', parseInt(e.target.value))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-slate-800"
                    />
                </div>

                <div>
                    <div className="flex justify-between text-sm mb-1.5">
                        <label className="font-medium text-blue-700 flex items-center gap-2"><Zap size={14} /> Mín. Elèctriques</label>
                        <span className="font-bold text-blue-900">{criteria.minElectric || 0}</span>
                    </div>
                    <input 
                        type="range" min="0" max="20" step="1" 
                        value={criteria.minElectric || 0}
                        onChange={(e) => updateCriteria('minElectric', parseInt(e.target.value))}
                        className="w-full h-2 bg-blue-100 rounded-lg appearance-none cursor-pointer accent-blue-600"
                    />
                </div>

                 <div>
                    <div className="flex justify-between text-sm mb-1.5">
                        <label className="font-medium text-red-700 flex items-center gap-2"><Bike size={14} /> Mín. Mecàniques</label>
                        <span className="font-bold text-red-900">{criteria.minMechanical || 0}</span>
                    </div>
                    <input 
                        type="range" min="0" max="20" step="1" 
                        value={criteria.minMechanical || 0}
                        onChange={(e) => updateCriteria('minMechanical', parseInt(e.target.value))}
                        className="w-full h-2 bg-red-100 rounded-lg appearance-none cursor-pointer accent-red-600"
                    />
                </div>

                <hr className="border-slate-100 my-4" />

                <div>
                    <div className="flex justify-between text-sm mb-1.5">
                        <label className="font-medium text-slate-700 flex items-center gap-2"><Navigation size={14} /> Distància màxima</label>
                        <span className="font-bold text-slate-900">{criteria.radius ? `${criteria.radius}m` : 'Tot BCN'}</span>
                    </div>
                    
                    {!userLocation && criteria.useUserLocation && (
                        <div className="mb-2 text-xs text-amber-600 bg-amber-50 p-2 rounded">
                            Ubicació no detectada. Fem servir el centre del mapa.
                        </div>
                    )}

                    <div className="flex gap-2 mb-3">
                         <button 
                            onClick={() => toggleLocationUsage(true)}
                            className={`flex-1 py-1.5 text-xs font-bold rounded border ${criteria.useUserLocation ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-slate-600 border-slate-200'}`}
                         >
                            Des de la meva posició
                         </button>
                         <button 
                            onClick={() => toggleLocationUsage(false)}
                            className={`flex-1 py-1.5 text-xs font-bold rounded border ${!criteria.useUserLocation ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200'}`}
                         >
                            Des del centre
                         </button>
                    </div>

                    <input 
                        type="range" min="0" max="2000" step="100" 
                        value={criteria.radius || 0}
                        onChange={(e) => updateCriteria('radius', parseInt(e.target.value))}
                        className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-red-600"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                        {criteria.radius ? `Mostrant estacions a menys de ${criteria.radius} m.` : 'Mostrant tota la ciutat.'}
                    </p>
                </div>
            </section>
        </div>

        <div className="p-4 border-t border-slate-100 bg-slate-50 flex justify-between items-center">
            <span className="text-xs font-medium text-slate-500">
                {totalResults} estacions
            </span>
            <div className="flex gap-2">
                <button 
                    onClick={handleReset}
                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
                >
                    Netejar
                </button>
                <button 
                    onClick={onClose}
                    className="px-6 py-2 bg-slate-800 text-white text-sm font-bold rounded-xl hover:bg-slate-900 transition-colors shadow-lg shadow-slate-200"
                >
                    Aplicar
                </button>
            </div>
        </div>
      </div>
    </div>
  );
};

export default FilterPanel;