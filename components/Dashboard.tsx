import React, { useMemo, useState } from 'react';
import { Station } from '../types';
import {
  BarChart3,
  Bike,
  ChevronDown,
  ChevronUp,
  Crosshair,
  Navigation,
  Smartphone,
  Wifi,
  WifiOff,
  Zap,
} from 'lucide-react';

interface DashboardProps {
  stations: Station[];
  totalStations: number;
  lastUpdated?: Date;
  favorites?: string[];
  allStations?: Station[];
  onCenterStation?: (lat: number, lng: number) => void;
  onOpenStats?: () => void;
  onLocateUser?: () => void;
  userLocation?: [number, number] | null;
  locationError?: string | null;
  isLocating?: boolean;
  isOnline?: boolean;
  isStandalone?: boolean;
}

const formatLastUpdated = (lastUpdated?: Date) => {
  if (!lastUpdated) {
    return 'Sense dades';
  }

  const minutes = Math.max(0, Math.round((Date.now() - lastUpdated.getTime()) / 60000));
  if (minutes === 0) {
    return 'Ara mateix';
  }
  if (minutes === 1) {
    return 'Fa 1 min';
  }

  return `Fa ${minutes} min`;
};

const Dashboard: React.FC<DashboardProps> = ({
  stations,
  totalStations,
  lastUpdated,
  allStations = [],
  onCenterStation,
  onOpenStats,
  onLocateUser,
  userLocation,
  locationError,
  isLocating = false,
  isOnline = true,
  isStandalone = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isNearExpanded, setIsNearExpanded] = useState(true);

  const stats = useMemo(() => {
    let totalBikes = 0;
    let totalEbikes = 0;
    let totalSlots = 0;

    stations.forEach((station) => {
      totalBikes += station.free_bikes;
      totalSlots += station.empty_slots;
      totalEbikes += station.extra?.ebikes || 0;
    });

    const mechanical = Math.max(0, totalBikes - totalEbikes);
    const totalCapacity = Math.max(1, totalBikes + totalSlots);

    return {
      totalBikes,
      totalEbikes,
      totalSlots,
      mechanical,
      occupancyRate: Math.round((totalBikes / totalCapacity) * 100),
      electricalRatio: Math.round((totalEbikes / Math.max(1, totalBikes)) * 100),
    };
  }, [stations]);

  const donutStyle = useMemo(() => {
    const totalCapacity = Math.max(1, stats.totalBikes + stats.totalSlots);
    const mechanicalPct = (stats.mechanical / totalCapacity) * 100;
    const electricPct = (stats.totalEbikes / totalCapacity) * 100;
    const bikePct = mechanicalPct + electricPct;

    return {
      background: `conic-gradient(#ef4444 0% ${mechanicalPct}%, #3b82f6 ${mechanicalPct}% ${bikePct}%, #e2e8f0 ${bikePct}% 100%)`,
    };
  }, [stats.mechanical, stats.totalBikes, stats.totalEbikes, stats.totalSlots]);

  const nearestStations = useMemo(() => {
    if (!userLocation || !allStations.length) {
      return [];
    }

    return [...allStations]
      .map((station) => {
        const radius = 6371e3;
        const lat1 = userLocation[0] * Math.PI / 180;
        const lat2 = station.latitude * Math.PI / 180;
        const deltaLat = (station.latitude - userLocation[0]) * Math.PI / 180;
        const deltaLng = (station.longitude - userLocation[1]) * Math.PI / 180;
        const arc =
          Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
          Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
        const distance = radius * (2 * Math.atan2(Math.sqrt(arc), Math.sqrt(1 - arc)));
        return { ...station, distanceToUser: distance };
      })
      .sort((left, right) => (left.distanceToUser || 99999) - (right.distanceToUser || 99999))
      .slice(0, 4);
  }, [allStations, userLocation]);

  return (
    <div className="absolute top-0 left-0 right-0 z-[1000] pointer-events-none flex flex-col items-center md:items-start gap-2 p-2 md:p-4 safe-area-top">
      <div className="glass-panel rounded-[28px] shadow-xl pointer-events-auto flex flex-col w-[calc(100%-8px)] md:w-[356px] overflow-hidden ring-1 ring-black/5">
        <div
          className="flex items-center justify-between gap-3 p-3.5 active:bg-slate-50 cursor-pointer"
          onClick={() => setIsExpanded((current) => !current)}
        >
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-red-600 via-red-500 to-slate-900 text-white shadow-lg shadow-red-200/60">
              <span className="font-display text-sm font-black">BCN</span>
            </div>
            <div className="min-w-0">
              <h1 className="font-display text-sm font-bold leading-tight text-slate-900 truncate">
                {stats.totalBikes} bicis disponibles ara
              </h1>
              <p className="text-[11px] font-medium text-slate-500 truncate">
                {stats.totalEbikes} elèctriques · {stats.totalSlots} espais · {totalStations} estacions
              </p>
            </div>
          </div>
          <button className="text-slate-400 p-2 -mr-2 shrink-0">
            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
          </button>
        </div>

        <div className="px-3.5 pb-3 flex flex-wrap gap-2">
          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold ${isOnline ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'}`}>
            {isOnline ? <Wifi size={12} /> : <WifiOff size={12} />}
            {isOnline ? 'En línia' : 'Sense connexió'}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">
            <Bike size={12} /> {formatLastUpdated(lastUpdated)}
          </span>
          {isStandalone && (
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-1 text-[10px] font-bold text-blue-700">
              <Smartphone size={12} /> Mode app
            </span>
          )}
        </div>

        {isExpanded && (
          <div className="border-t border-slate-100 bg-slate-50/80 px-3.5 py-3.5 space-y-3">
            <div className="grid grid-cols-[88px_1fr] items-center gap-4">
              <div className="relative mx-auto h-[88px] w-[88px] rounded-full p-[10px]" style={donutStyle}>
                <div className="flex h-full w-full items-center justify-center rounded-full bg-white shadow-inner">
                  <div className="text-center leading-tight">
                    <div className="font-display text-lg font-black text-slate-900">{stats.occupancyRate}%</div>
                    <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">ús</div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-2xl bg-white p-3 shadow-sm border border-slate-100">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Elèctriques</div>
                  <div className="mt-1 text-lg font-black text-blue-600">{stats.totalEbikes}</div>
                </div>
                <div className="rounded-2xl bg-white p-3 shadow-sm border border-slate-100">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Mecàniques</div>
                  <div className="mt-1 text-lg font-black text-red-600">{stats.mechanical}</div>
                </div>
                <div className="rounded-2xl bg-white p-3 shadow-sm border border-slate-100">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Espais lliures</div>
                  <div className="mt-1 text-lg font-black text-slate-800">{stats.totalSlots}</div>
                </div>
                <div className="rounded-2xl bg-white p-3 shadow-sm border border-slate-100">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Mix elèctric</div>
                  <div className="mt-1 text-lg font-black text-slate-800">{stats.electricalRatio}%</div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={onLocateUser}
                className={`rounded-2xl px-4 py-3 text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm ${userLocation ? 'bg-blue-600 text-white active:bg-blue-700' : 'bg-white text-slate-700 border border-slate-200 active:bg-slate-50'}`}
              >
                {isLocating ? <Navigation size={14} className="animate-pulse" /> : userLocation ? <Navigation size={14} /> : <Crosshair size={14} />}
                {isLocating ? 'Localitzant...' : userLocation ? 'Recentrar' : 'Localitza\'m'}
              </button>
              <button
                onClick={onOpenStats}
                className="rounded-2xl px-4 py-3 bg-white border border-slate-200 text-xs font-bold text-slate-700 flex items-center justify-center gap-2 active:bg-slate-50"
              >
                <BarChart3 size={14} /> Analítica
              </button>
            </div>

            {locationError && (
              <div className="rounded-2xl border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-700">
                {locationError}
              </div>
            )}
          </div>
        )}
      </div>

      {userLocation && nearestStations.length > 0 && (
        <div className="glass-panel rounded-[28px] shadow-xl border border-white/40 pointer-events-auto flex flex-col w-[calc(100%-8px)] md:w-[356px] overflow-hidden max-h-[42vh]">
          <div
            className="px-4 py-3 bg-blue-50/80 border-b border-blue-100 flex items-center justify-between cursor-pointer active:bg-blue-100"
            onClick={() => setIsNearExpanded((current) => !current)}
          >
            <span className="text-xs font-bold text-blue-800 flex items-center gap-1.5">
              <Navigation size={12} /> A prop teu
            </span>
            {isNearExpanded ? <ChevronUp size={14} className="text-blue-400" /> : <ChevronDown size={14} className="text-blue-400" />}
          </div>

          {isNearExpanded && (
            <div className="divide-y divide-slate-100 overflow-y-auto no-scrollbar">
              {nearestStations.map((station) => {
                const ebikes = station.extra?.ebikes || 0;
                return (
                  <div
                    key={station.id}
                    className="px-4 py-3 hover:bg-slate-50 cursor-pointer active:bg-slate-100"
                    onClick={() => onCenterStation?.(station.latitude, station.longitude)}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-slate-700 truncate">{station.name}</div>
                        <div className="mt-1 text-[11px] font-medium text-slate-400">
                          {station.distanceToUser ? Math.round(station.distanceToUser) : '?'} m · {station.free_bikes} bicis
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        {ebikes > 0 && (
                          <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                            <Zap size={8} /> {ebikes}
                          </span>
                        )}
                        <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                          P {station.empty_slots}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default Dashboard;