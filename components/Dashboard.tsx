import React, { useMemo, useState } from 'react';
import { Station } from '../types';
import { Bike, Zap, ChevronUp, ChevronDown, BarChart3, Navigation, Crosshair } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

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
}

const Dashboard: React.FC<DashboardProps> = ({ 
  stations, 
  allStations = [],
  onCenterStation,
  onOpenStats,
  onLocateUser,
  userLocation
}) => {
  const [isExpanded, setIsExpanded] = useState(false); // Collapsed by default on mobile load
  const [isNearExpanded, setIsNearExpanded] = useState(true);

  const stats = useMemo(() => {
    let totalBikes = 0;
    let totalEbikes = 0;
    let totalSlots = 0;

    stations.forEach(s => {
      totalBikes += s.free_bikes;
      totalSlots += s.empty_slots;
      if (s.extra?.ebikes) {
        totalEbikes += s.extra.ebikes;
      }
    });

    const mechanical = Math.max(0, totalBikes - totalEbikes);
    return { totalBikes, totalEbikes, mechanical, totalSlots };
  }, [stations]);

  // Calculate nearest stations if user location is available
  const nearestStations = useMemo(() => {
      if (!userLocation || !allStations.length) return [];
      // Logic handled in Dashboard purely for display
      return [...allStations]
        .map(s => {
            const R = 6371e3; 
            const φ1 = userLocation[0] * Math.PI/180;
            const φ2 = s.latitude * Math.PI/180;
            const Δφ = (s.latitude-userLocation[0]) * Math.PI/180;
            const Δλ = (s.longitude-userLocation[1]) * Math.PI/180;
            const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                      Math.cos(φ1) * Math.cos(φ2) *
                      Math.sin(Δλ/2) * Math.sin(Δλ/2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
            const d = R * c;
            return { ...s, distanceToUser: d };
        })
        .sort((a, b) => (a.distanceToUser || 99999) - (b.distanceToUser || 99999))
        .slice(0, 3); // Only top 3 on mobile
  }, [userLocation, allStations]);

  const data = [
    { name: 'Elèctriques', value: stats.totalEbikes, color: '#3b82f6' }, 
    { name: 'Mecàniques', value: stats.mechanical, color: '#ef4444' }, 
  ];
  const emptyColor = '#e2e8f0';

  // Compact Header View (Mobile Friendly)
  return (
    <div className="absolute top-0 left-0 right-0 p-3 md:p-4 z-[1000] pointer-events-none flex flex-col items-start gap-3">
        
        {/* Main Status Bar - Floating & Flexible */}
        <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-lg border border-white/50 pointer-events-auto flex flex-col w-full md:w-[320px] transition-all overflow-hidden">
            
            <div className="flex items-center justify-between p-3" onClick={() => setIsExpanded(!isExpanded)}>
               <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-red-600 to-red-700 rounded-xl flex items-center justify-center text-white font-black text-xs shadow-red-200 shadow-lg">
                    BCN
                  </div>
                  <div>
                    <h1 className="text-sm font-bold text-slate-800 leading-tight flex items-center gap-1">
                        {stats.totalBikes} Bicis
                    </h1>
                    <p className="text-[10px] text-slate-400 font-medium">
                        {stats.totalEbikes} Elèctriques • {stats.totalSlots} Espais
                    </p>
                  </div>
               </div>
               <button className="text-slate-400 p-1">
                   {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
               </button>
            </div>

            {/* Expanded Details */}
            {isExpanded && (
                <div className="border-t border-slate-100 bg-slate-50 p-3 space-y-3">
                    <div className="flex items-center gap-4 h-24">
                         <div className="flex-1 h-full relative">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                    data={stats.totalBikes > 0 ? data : [{value: 1, color: emptyColor}]}
                                    cx="50%" cy="50%" innerRadius={25} outerRadius={35}
                                    paddingAngle={5} dataKey="value" stroke="none"
                                    >
                                    {stats.totalBikes > 0 && data.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                    {stats.totalBikes === 0 && <Cell fill={emptyColor} />}
                                    </Pie>
                                </PieChart>
                            </ResponsiveContainer>
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                <Bike size={16} className="text-slate-300" />
                            </div>
                         </div>
                         <div className="flex-1 space-y-2">
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-blue-600 font-bold">Elèctriques</span>
                                <span className="bg-white px-2 py-0.5 rounded shadow-sm font-mono">{stats.totalEbikes}</span>
                            </div>
                            <div className="flex justify-between items-center text-xs">
                                <span className="text-red-600 font-bold">Mecàniques</span>
                                <span className="bg-white px-2 py-0.5 rounded shadow-sm font-mono">{stats.mechanical}</span>
                            </div>
                         </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        <button 
                            onClick={onLocateUser}
                            className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-sm ${userLocation ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 border border-slate-200'}`}
                        >
                            {userLocation ? <Navigation size={14} className="animate-pulse" /> : <Crosshair size={14} />}
                            {userLocation ? 'Ubica\'m' : 'Localitzar'}
                        </button>
                        <button 
                            onClick={onOpenStats}
                            className="py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 flex items-center justify-center gap-2"
                        >
                            <BarChart3 size={14} /> Estadístiques
                        </button>
                    </div>
                </div>
            )}
        </div>

        {/* Nearest Stations Mini-List (Only if located) */}
        {userLocation && nearestStations.length > 0 && (
             <div className="bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-white/50 pointer-events-auto flex flex-col w-full md:w-[320px] overflow-hidden animate-in slide-in-from-left-4 fade-in">
                <div 
                    className="p-2.5 px-3 bg-blue-50/80 border-b border-blue-100 flex items-center justify-between cursor-pointer"
                    onClick={() => setIsNearExpanded(!isNearExpanded)}
                >
                    <span className="text-xs font-bold text-blue-800 flex items-center gap-1.5">
                        <Navigation size={12} /> A PROP TEU
                    </span>
                    {isNearExpanded ? <ChevronUp size={14} className="text-blue-400" /> : <ChevronDown size={14} className="text-blue-400" />}
                </div>
                
                {isNearExpanded && (
                    <div className="divide-y divide-slate-100">
                        {nearestStations.map(st => {
                           const ebikes = st.extra?.ebikes || 0;
                            return (
                               <div 
                                   key={st.id} 
                                   className="p-2.5 hover:bg-slate-50 cursor-pointer active:bg-slate-100"
                                   onClick={() => onCenterStation && onCenterStation(st.latitude, st.longitude)}
                               >
                                   <div className="flex justify-between items-start">
                                       <div className="flex flex-col min-w-0 pr-2">
                                            <span className="text-xs font-bold text-slate-700 truncate">{st.name}</span>
                                            <span className="text-[10px] text-slate-400 font-medium">
                                                {st.distanceToUser ? Math.round(st.distanceToUser) : '?'}m • {st.free_bikes} bicis
                                            </span>
                                       </div>
                                       <div className="flex gap-1 shrink-0">
                                            {ebikes > 0 && (
                                                <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                                    <Zap size={8} /> {ebikes}
                                                </span>
                                            )}
                                            <span className="bg-slate-100 text-slate-600 text-[10px] font-bold px-1.5 py-0.5 rounded">
                                                P: {st.empty_slots}
                                            </span>
                                       </div>
                                   </div>
                               </div>
                            )
                        })}
                    </div>
                )}
           </div>
        )}
    </div>
  );
};

export default Dashboard;