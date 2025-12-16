import React from 'react';
import { Zap, Bike, ParkingCircle, Filter } from 'lucide-react';

interface QuickFiltersProps {
  quickState: {
    onlyElectric: boolean;
    hasBikes: boolean;
    hasSlots: boolean;
  };
  onToggle: (key: 'onlyElectric' | 'hasBikes' | 'hasSlots') => void;
  onOpenAdvanced: () => void;
}

const QuickFilters: React.FC<QuickFiltersProps> = ({ quickState, onToggle, onOpenAdvanced }) => {
  const btnBase = "flex items-center gap-1.5 px-4 py-2.5 rounded-full text-sm font-bold shadow-lg border transition-all active:scale-95 whitespace-nowrap";
  const btnActive = "bg-slate-900 text-white border-slate-900 ring-2 ring-offset-1 ring-slate-200";
  const btnInactive = "bg-white text-slate-700 border-slate-200 hover:bg-slate-50";

  return (
    <div className="absolute bottom-6 left-0 right-0 z-[1000] flex justify-center pointer-events-none">
      <div className="flex items-center gap-2 overflow-x-auto px-4 py-2 pointer-events-auto max-w-full no-scrollbar pb-4 md:pb-2 snap-x">
        
        <button 
          onClick={() => onToggle('hasBikes')}
          className={`${btnBase} ${quickState.hasBikes ? "bg-red-600 text-white border-red-600" : btnInactive}`}
        >
          <Bike size={16} />
          {quickState.hasBikes ? 'Amb Bicis' : 'Bicis'}
        </button>

        <button 
          onClick={() => onToggle('onlyElectric')}
          className={`${btnBase} ${quickState.onlyElectric ? "bg-blue-600 text-white border-blue-600" : btnInactive}`}
        >
          <Zap size={16} fill={quickState.onlyElectric ? "currentColor" : "none"} />
          Elèctriques
        </button>

        <button 
          onClick={() => onToggle('hasSlots')}
          className={`${btnBase} ${quickState.hasSlots ? btnActive : btnInactive}`}
        >
          <ParkingCircle size={16} />
          Parking
        </button>

        <div className="w-[1px] h-8 bg-slate-300 mx-1"></div>

        <button 
          onClick={onOpenAdvanced}
          className={`${btnBase} bg-white text-slate-700 border-slate-200`}
        >
          <Filter size={16} />
          Més
        </button>
      </div>
    </div>
  );
};

export default QuickFilters;