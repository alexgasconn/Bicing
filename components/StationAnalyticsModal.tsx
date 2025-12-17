import React, { useEffect, useState, useMemo } from 'react';
import { Station } from '../types';
import { getStationHistory, StationHistoryPoint } from '../services/db';
import { X, TrendingUp, Clock, BarChart3, BatteryCharging, AlertCircle, ChevronLeft, ShieldCheck, Zap, CalendarClock, Activity, Maximize, LayoutDashboard } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ComposedChart, Line, BarChart, Bar, Cell, Legend } from 'recharts';

interface StationAnalyticsModalProps {
  station: Station | null;
  onClose: () => void;
}

type TabType = 'stats' | 'evolution' | 'pattern' | 'range';

const StationAnalyticsModal: React.FC<StationAnalyticsModalProps> = ({ station, onClose }) => {
  const [history, setHistory] = useState<StationHistoryPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('stats');

  useEffect(() => {
    if (station) {
      setLoading(true);
      getStationHistory(station.id).then((data) => {
          setHistory(data);
          setLoading(false);
      });
    }
  }, [station]);

  // --- ANALYTICS LOGIC ---
  const analysis = useMemo(() => {
      // Allow visualization with just 2 points so user sees something immediately
      if (history.length < 2) return null;

      const buckets = new Array(48).fill(0).map(() => ({ 
          totalBikes: 0, 
          count: 0,
          min: Number.MAX_SAFE_INTEGER,
          max: -1 
      }));
      
      let reliableCount = 0;
      let totalEbikes = 0;
      let maxCapacityObserved = 0;

      history.forEach(point => {
          if (point.free_bikes > 2) reliableCount++;
          totalEbikes += point.ebikes;
          
          const cap = point.free_bikes + point.empty_slots;
          if (cap > maxCapacityObserved) maxCapacityObserved = cap;

          const d = new Date(point.timestamp);
          const hour = d.getHours();
          const minute = d.getMinutes();
          // Map to 0-47 index (30 min slots)
          const index = hour * 2 + (minute >= 30 ? 1 : 0);
          
          buckets[index].totalBikes += point.free_bikes;
          buckets[index].count++;
          if (point.free_bikes < buckets[index].min) buckets[index].min = point.free_bikes;
          if (point.free_bikes > buckets[index].max) buckets[index].max = point.free_bikes;
      });

      const patternData = buckets.map((data, index) => {
          const hour = Math.floor(index / 2);
          const isHalf = index % 2 === 1;
          const timeLabel = `${hour.toString().padStart(2, '0')}:${isHalf ? '30' : '00'}`;
          
          const hasData = data.count > 0;
          return {
              time: timeLabel,
              avgBikes: hasData ? parseFloat((data.totalBikes / data.count).toFixed(1)) : 0,
              min: hasData ? data.min : 0,
              max: hasData ? data.max : 0,
              range: hasData ? [data.min, data.max] : [0,0],
              index
          };
      });

      const reliability = (reliableCount / history.length) * 100;
      const avgEbikes = totalEbikes / history.length;
      // Best slot logic
      const bestSlot = [...patternData].sort((a, b) => b.avgBikes - a.avgBikes)[0];

      return {
          patternData,
          bestSlot,
          reliability,
          avgEbikes,
          maxCapacityObserved
      };
  }, [history]);

  if (!station) return null;

  return (
    <div className="fixed inset-0 z-[6000] flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full h-[90dvh] md:h-auto md:max-h-[85vh] md:max-w-4xl md:rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 flex justify-between items-center shrink-0 safe-area-top">
            <div className="flex items-center gap-3">
                 <button onClick={onClose} className="md:hidden p-2 -ml-2 text-slate-300 hover:text-white">
                     <ChevronLeft size={24} />
                 </button>
                <div>
                    <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-0.5">
                        ANALÍTICA D'ESTACIÓ
                    </div>
                    <h2 className="text-xl font-black leading-tight truncate max-w-[200px] md:max-w-full">{station.name}</h2>
                </div>
            </div>
            <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white hidden md:block">
                <X size={20} />
            </button>
        </div>

        {/* Loading State */}
        {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-slate-400">
                 <div className="animate-spin mb-4"><TrendingUp size={32} /></div>
                 <p>Carregant dades...</p>
            </div>
        ) : (!analysis) ? (
             <div className="flex-1 flex flex-col items-center justify-center p-10 text-slate-400 text-center">
                 <AlertCircle size={48} className="mb-4 text-slate-300" />
                 <h3 className="text-lg font-bold text-slate-600">Dades Insuficients</h3>
                 <p className="max-w-md mx-auto mt-2 text-sm">
                     Necessitem almenys 2 lectures històriques per començar a dibuixar gràfics.
                 </p>
            </div>
        ) : (
            <div className="flex flex-col h-full overflow-hidden">
                
                {/* Tabs Navigation */}
                <div className="flex border-b border-slate-200 overflow-x-auto no-scrollbar shrink-0 bg-white">
                    <button 
                        onClick={() => setActiveTab('stats')}
                        className={`flex-1 py-3 px-4 text-xs font-bold border-b-2 transition-colors whitespace-nowrap flex items-center justify-center gap-2 ${activeTab === 'stats' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}
                    >
                        <LayoutDashboard size={14} /> Stats
                    </button>
                    <button 
                        onClick={() => setActiveTab('evolution')}
                        className={`flex-1 py-3 px-4 text-xs font-bold border-b-2 transition-colors whitespace-nowrap flex items-center justify-center gap-2 ${activeTab === 'evolution' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-500'}`}
                    >
                        <Activity size={14} /> Evolució
                    </button>
                    <button 
                        onClick={() => setActiveTab('pattern')}
                        className={`flex-1 py-3 px-4 text-xs font-bold border-b-2 transition-colors whitespace-nowrap flex items-center justify-center gap-2 ${activeTab === 'pattern' ? 'border-orange-600 text-orange-600' : 'border-transparent text-slate-500'}`}
                    >
                        <BarChart3 size={14} /> Patrons
                    </button>
                    <button 
                        onClick={() => setActiveTab('range')}
                        className={`flex-1 py-3 px-4 text-xs font-bold border-b-2 transition-colors whitespace-nowrap flex items-center justify-center gap-2 ${activeTab === 'range' ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-slate-500'}`}
                    >
                        <CalendarClock size={14} /> Rangs
                    </button>
                </div>

                {/* Content Area */}
                <div className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-6">
                    
                    {/* TAB 1: STATS (RESUM) */}
                    {activeTab === 'stats' && (
                        <div className="grid grid-cols-2 gap-3 md:gap-4 animate-in slide-in-from-left-2">
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm col-span-2">
                                <div className="text-slate-500 text-xs font-bold uppercase mb-1 flex items-center gap-1">
                                    <Clock size={14}/> Millor Hora (30 min)
                                </div>
                                <div className="text-4xl font-black text-slate-800">
                                    {analysis.bestSlot.time}
                                </div>
                                <div className="text-sm text-slate-500 mt-1">
                                    Mitjana de {analysis.bestSlot.avgBikes} bicis
                                </div>
                            </div>
                            
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                <div className="text-slate-500 text-[10px] font-bold uppercase mb-1 flex items-center gap-1">
                                    <ShieldCheck size={14}/> Fiabilitat
                                </div>
                                <div className={`text-2xl font-black ${analysis.reliability > 80 ? 'text-green-600' : 'text-orange-500'}`}>
                                    {analysis.reliability.toFixed(0)}%
                                </div>
                                <div className="text-[10px] text-slate-400 leading-tight mt-1">
                                    Disponibilitat &gt; 2
                                </div>
                            </div>

                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                <div className="text-slate-500 text-[10px] font-bold uppercase mb-1 flex items-center gap-1">
                                    <Zap size={14}/> % Elèctric
                                </div>
                                <div className="text-2xl font-black text-blue-600">
                                     {(analysis.avgEbikes / (analysis.bestSlot.avgBikes || 1) * 100).toFixed(0)}%
                                </div>
                                <div className="text-[10px] text-slate-400 leading-tight mt-1">
                                    Mitjana de flota
                                </div>
                            </div>

                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm col-span-2">
                                <div className="text-slate-500 text-xs font-bold uppercase mb-1 flex items-center gap-1">
                                    <Maximize size={14}/> Capacitat Màxima
                                </div>
                                <div className="text-3xl font-black text-slate-700">
                                    {analysis.maxCapacityObserved}
                                </div>
                                <div className="text-xs text-slate-400 mt-1">
                                    Bicis + Llocs buits
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB 2: EVOLUTION (Elèctric vs Mecànic) */}
                    {activeTab === 'evolution' && (
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col animate-in slide-in-from-right-2">
                            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 text-sm">
                                <Activity size={16} className="text-blue-500" /> Evolució (Elèctric vs Mecànic)
                            </h3>
                            {/* FIXED HEIGHT IS CRITICAL FOR RECHARTS IN MODALS */}
                            <div className="w-full h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={history}>
                                        <defs>
                                            <linearGradient id="colorMechEvo" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
                                            </linearGradient>
                                            <linearGradient id="colorElecEvo" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis 
                                            dataKey="timestamp" 
                                            type="number"
                                            domain={['dataMin', 'dataMax']} 
                                            tickFormatter={(unix) => new Date(unix).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                                            style={{ fontSize: '10px', fill: '#94a3b8' }}
                                            minTickGap={40}
                                        />
                                        <YAxis style={{ fontSize: '10px', fill: '#94a3b8' }} />
                                        <Tooltip labelFormatter={(t) => new Date(t).toLocaleTimeString()} />
                                        <Legend verticalAlign="top" height={36}/>
                                        <Area 
                                            type="monotone" 
                                            dataKey="ebikes" 
                                            stackId="1" 
                                            stroke="#3b82f6" 
                                            fill="url(#colorElecEvo)" 
                                            name="Elèctriques"
                                            animationDuration={500}
                                        />
                                        <Area 
                                            type="monotone" 
                                            dataKey="mechanical" 
                                            stackId="1" 
                                            stroke="#ef4444" 
                                            fill="url(#colorMechEvo)" 
                                            name="Mecàniques"
                                            animationDuration={500}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {/* TAB 3: PATTERNS (Bar Chart) */}
                    {activeTab === 'pattern' && (
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col animate-in slide-in-from-right-2">
                            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 text-sm">
                                <BarChart3 size={16} className="text-orange-500" /> Disponibilitat Mitjana per Mitja Hora
                            </h3>
                            <div className="w-full h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={analysis.patternData} barCategoryGap={2}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis 
                                            dataKey="time" 
                                            style={{ fontSize: '10px', fill: '#94a3b8' }} 
                                            interval={5}
                                        />
                                        <YAxis style={{ fontSize: '10px', fill: '#94a3b8' }} />
                                        <Tooltip cursor={{fill: 'rgba(0,0,0,0.05)'}} />
                                        <Bar dataKey="avgBikes" name="Mitjana Bicis" radius={[2, 2, 0, 0]}>
                                            {analysis.patternData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.avgBikes > 5 ? '#f97316' : '#fdba74'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {/* TAB 4: RANGE (Composed Area Chart) */}
                    {activeTab === 'range' && (
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col animate-in slide-in-from-right-2">
                            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 text-sm">
                                <CalendarClock size={16} className="text-emerald-500" /> Variabilitat i Rangs (Min-Max)
                            </h3>
                            <div className="w-full h-[300px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={analysis.patternData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis 
                                            dataKey="time" 
                                            style={{ fontSize: '10px', fill: '#94a3b8' }} 
                                            interval={5}
                                        />
                                        <YAxis style={{ fontSize: '10px', fill: '#94a3b8' }} />
                                        <Tooltip labelStyle={{color: '#333'}} />
                                        <Legend verticalAlign="top" height={36}/>
                                        
                                        {/* The 'range' dataKey expects [min, max] array which we calculate in analysis */}
                                        <Area 
                                            dataKey="range" 
                                            stroke="#10b981" 
                                            fill="#d1fae5" 
                                            opacity={0.6}
                                            name="Rang (Min-Max)"
                                            animationDuration={500}
                                        />
                                        
                                        <Line 
                                            type="monotone" 
                                            dataKey="avgBikes" 
                                            stroke="#059669" 
                                            strokeWidth={3} 
                                            dot={false}
                                            name="Mitjana"
                                            animationDuration={500}
                                        />
                                    </ComposedChart>
                                </ResponsiveContainer>
                            </div>
                            <p className="text-[10px] text-center text-slate-400 mt-2">
                                *Àrea verda: Diferència històrica entre el mínim i el màxim registrat a aquesta hora.
                            </p>
                        </div>
                    )}

                </div>
            </div>
        )}
      </div>
    </div>
  );
};

export default StationAnalyticsModal;