import React, { useEffect, useState, useMemo } from 'react';
import { Station } from '../types';
import { getStationHistory, StationHistoryPoint } from '../services/db';
import { X, TrendingUp, Clock, BarChart3, BatteryCharging, Bike, AlertCircle, ChevronLeft, ShieldCheck, Zap, CalendarClock, Activity } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ComposedChart, Line, ReferenceLine, BarChart, Bar, Cell } from 'recharts';

interface StationAnalyticsModalProps {
  station: Station | null;
  onClose: () => void;
}

const StationAnalyticsModal: React.FC<StationAnalyticsModalProps> = ({ station, onClose }) => {
  const [history, setHistory] = useState<StationHistoryPoint[]>([]);
  const [loading, setLoading] = useState(false);

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
      if (history.length === 0) return null;

      // Buckets for 30-min slots
      const buckets = new Array(48).fill(0).map(() => ({ 
          totalBikes: 0, 
          count: 0,
          min: Number.MAX_SAFE_INTEGER,
          max: -1 
      }));
      
      let reliableCount = 0;
      let totalEbikes = 0;

      history.forEach(point => {
          if (point.free_bikes > 2) reliableCount++;
          totalEbikes += point.ebikes;

          // Bucket Calc
          const d = new Date(point.timestamp);
          const hour = d.getHours();
          const minute = d.getMinutes();
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
              range: hasData ? [data.min, data.max] : [0,0], // For Range Chart
              index
          };
      });

      const reliability = (reliableCount / history.length) * 100;
      const avgEbikes = totalEbikes / history.length;
      
      // Calculate best slot for display
      const bestSlot = [...patternData].sort((a, b) => b.avgBikes - a.avgBikes)[0];

      return {
          patternData,
          bestSlot,
          reliability,
          avgEbikes
      };
  }, [history]);

  if (!station) return null;

  return (
    <div className="fixed inset-0 z-[6000] flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full h-[95dvh] md:h-auto md:max-h-[90vh] md:max-w-4xl md:rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 flex justify-between items-center shrink-0 safe-area-top">
            <div className="flex items-center gap-3">
                 <button onClick={onClose} className="md:hidden p-2 -ml-2 text-slate-300 hover:text-white">
                     <ChevronLeft size={24} />
                 </button>
                <div>
                    <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-0.5">
                        ESTADÍSTIQUES
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
        ) : history.length < 5 ? (
             <div className="flex-1 flex flex-col items-center justify-center p-10 text-slate-400 text-center">
                 <AlertCircle size={48} className="mb-4 text-slate-300" />
                 <h3 className="text-lg font-bold text-slate-600">Dades Insuficients</h3>
                 <p className="max-w-md mx-auto mt-2 text-sm">
                     Necessitem més temps per generar gràfics útils.
                 </p>
            </div>
        ) : analysis && (
            <div className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-6 space-y-6">
                
                {/* 1. KEY STATS (Simplified) */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                        <div className="text-slate-500 text-[10px] font-bold uppercase mb-1 flex items-center gap-1">
                            <Clock size={12}/> Millor Hora
                        </div>
                        <div className="text-lg md:text-2xl font-black text-slate-800">
                            {analysis.bestSlot.time}
                        </div>
                    </div>
                    
                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                        <div className="text-slate-500 text-[10px] font-bold uppercase mb-1 flex items-center gap-1">
                            <ShieldCheck size={12}/> Fiabilitat
                        </div>
                        <div className={`text-lg md:text-2xl font-black ${analysis.reliability > 80 ? 'text-green-600' : 'text-orange-500'}`}>
                            {analysis.reliability.toFixed(0)}%
                        </div>
                    </div>

                    <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                        <div className="text-slate-500 text-[10px] font-bold uppercase mb-1 flex items-center gap-1">
                            <Zap size={12}/> Prob. Elèc
                        </div>
                        <div className="text-lg md:text-2xl font-black text-blue-600">
                             {(analysis.avgEbikes / (analysis.bestSlot.avgBikes || 1) * 100).toFixed(0)}%
                        </div>
                    </div>
                </div>

                {/* GRAPH 1: EVOLUCIÓ RECENT (Line/Area) */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 text-sm">
                        <Activity size={16} className="text-blue-500" /> Evolució Recent (24h)
                    </h3>
                    <div className="h-48 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={history}>
                                <defs>
                                    <linearGradient id="colorTotal" x1="0" y1="0" x2="0" y2="1">
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
                                <Area type="monotone" dataKey="free_bikes" stroke="#3b82f6" fill="url(#colorTotal)" strokeWidth={2} />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* GRAPH 2: BAR CHART (Patró Horari) */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
                    <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 text-sm">
                        <BarChart3 size={16} className="text-purple-500" /> Patró Horari (Mitjana)
                    </h3>
                    <div className="h-48 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={analysis.patternData} barCategoryGap={1}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                <XAxis 
                                    dataKey="time" 
                                    style={{ fontSize: '10px', fill: '#94a3b8' }} 
                                    interval={5}
                                />
                                <YAxis style={{ fontSize: '10px', fill: '#94a3b8' }} />
                                <Tooltip cursor={{fill: 'transparent'}} />
                                <Bar dataKey="avgBikes" radius={[2, 2, 0, 0]}>
                                    {analysis.patternData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.avgBikes > 5 ? '#8b5cf6' : '#c4b5fd'} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* GRAPH 3: AREA CHART (Rang de Certesa) */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 mb-6">
                    <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 text-sm">
                        <CalendarClock size={16} className="text-emerald-500" /> Rang de Certesa (Min-Max)
                    </h3>
                    <div className="h-48 w-full">
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
                                
                                {/* Area representing the Min-Max Range */}
                                <Area 
                                    dataKey="range" 
                                    stroke="#10b981" 
                                    fill="#d1fae5" 
                                    opacity={0.6}
                                    name="Rang Històric"
                                />
                                
                                {/* Line representing the Average */}
                                <Line 
                                    type="monotone" 
                                    dataKey="avgBikes" 
                                    stroke="#059669" 
                                    strokeWidth={2} 
                                    dot={false}
                                    name="Mitjana"
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>
        )}
      </div>
    </div>
  );
};

export default StationAnalyticsModal;