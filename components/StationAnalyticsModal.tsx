import React, { useEffect, useState, useMemo } from 'react';
import { Station } from '../types';
import { getStationHistory, StationHistoryPoint } from '../services/db';
import { X, TrendingUp, Clock, BarChart3, BatteryCharging, Bike, AlertCircle, Info, ChevronLeft, ShieldCheck, Activity, Maximize, Zap } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ComposedChart, Line, ReferenceLine } from 'recharts';

interface StationAnalyticsModalProps {
  station: Station | null;
  onClose: () => void;
}

const StationAnalyticsModal: React.FC<StationAnalyticsModalProps> = ({ station, onClose }) => {
  const [history, setHistory] = useState<StationHistoryPoint[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'timeline' | 'patterns'>('timeline');

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

      // 1. Half-Hourly Pattern (Average, Min, Max by 30-min slots)
      // 48 bins: 00:00, 00:30, 01:00...
      const buckets = new Array(48).fill(0).map(() => ({ 
          totalBikes: 0, 
          count: 0,
          min: Number.MAX_SAFE_INTEGER,
          max: -1 
      }));
      
      let totalSum = 0;
      let totalSumSq = 0;
      let maxCapacity = 0;
      let reliableCount = 0;

      history.forEach(point => {
          // Global Stats Calc
          totalSum += point.free_bikes;
          totalSumSq += Math.pow(point.free_bikes, 2);
          
          const cap = point.free_bikes + point.empty_slots;
          if (cap > maxCapacity) maxCapacity = cap;
          
          if (point.free_bikes > 2) reliableCount++;

          // Bucket Calc
          const d = new Date(point.timestamp);
          const hour = d.getHours();
          const minute = d.getMinutes();
          // Map to 0-47 index
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
              // Range [min, max] for Area chart
              range: hasData ? [data.min, data.max] : [0,0],
              index
          };
      });

      // 2. Key Metrics
      const avgBikes = totalSum / history.length;
      const variance = (totalSumSq / history.length) - Math.pow(avgBikes, 2);
      const stdDev = Math.sqrt(Math.max(0, variance));
      
      const reliability = (reliableCount / history.length) * 100;
      
      const emptyInstances = history.filter(p => p.free_bikes === 0).length;
      const emptyProbability = (emptyInstances / history.length) * 100;
      const sortedSlots = [...patternData].sort((a, b) => b.avgBikes - a.avgBikes);
      const bestSlot = sortedSlots[0]; 
      
      return {
          patternData,
          emptyProbability,
          bestSlot,
          totalPoints: history.length,
          avgEbikes: history.reduce((acc, curr) => acc + curr.ebikes, 0) / history.length,
          reliability,
          volatility: stdDev,
          maxCapacity
      };
  }, [history]);

  if (!station) return null;

  return (
    <div className="fixed inset-0 z-[6000] flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full h-[100dvh] md:h-auto md:max-h-[90vh] md:max-w-4xl md:rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 md:p-5 flex justify-between items-center shrink-0 safe-area-top">
            <div className="flex items-center gap-3">
                 <button onClick={onClose} className="md:hidden p-2 -ml-2 text-slate-300 hover:text-white">
                     <ChevronLeft size={24} />
                 </button>
                <div>
                    <div className="text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-0.5">
                        ANÀLISI DETALLADA
                    </div>
                    <h2 className="text-xl md:text-2xl font-black leading-tight truncate max-w-[200px] md:max-w-full">{station.name}</h2>
                </div>
            </div>
            
            <div className="flex items-center gap-2">
                <div className="hidden md:flex items-center gap-3 text-sm text-slate-300 mr-4">
                    <span className="bg-slate-800 px-2 py-0.5 rounded flex items-center gap-1">
                        <Bike size={14} className="text-red-400"/> {station.free_bikes}
                    </span>
                    <span className="bg-slate-800 px-2 py-0.5 rounded flex items-center gap-1">
                        <BatteryCharging size={14} className="text-blue-400"/> {station.extra?.ebikes || 0}
                    </span>
                </div>
                <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white hidden md:block">
                    <X size={20} />
                </button>
            </div>
        </div>

        {/* Mobile Info Bar (Sticky) */}
        <div className="md:hidden flex items-center justify-around bg-slate-800 text-white py-2 text-xs shrink-0">
             <span className="flex items-center gap-1"><Bike size={12} className="text-red-400"/> {station.free_bikes} Bicis</span>
             <span className="flex items-center gap-1"><BatteryCharging size={12} className="text-blue-400"/> {station.extra?.ebikes || 0} Elèc.</span>
             <span className="text-slate-400">{history.length} pts</span>
        </div>

        {/* Loading State */}
        {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-slate-400">
                 <div className="animate-spin mb-4"><TrendingUp size={32} /></div>
                 <p>Processant dades històriques...</p>
            </div>
        ) : history.length < 5 ? (
             <div className="flex-1 flex flex-col items-center justify-center p-10 text-slate-400 text-center">
                 <AlertCircle size={48} className="mb-4 text-slate-300" />
                 <h3 className="text-lg font-bold text-slate-600">Dades Insuficients</h3>
                 <p className="max-w-md mx-auto mt-2 text-sm">
                     Necessitem més temps per generar estadístiques fiables.
                 </p>
            </div>
        ) : (
            <div className="flex-1 overflow-y-auto bg-slate-50 flex flex-col">
                
                {/* Tabs */}
                <div className="flex border-b border-slate-200 bg-white sticky top-0 z-10">
                    <button 
                        onClick={() => setActiveTab('timeline')}
                        className={`flex-1 py-3 text-xs md:text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'timeline' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                    >
                        <TrendingUp size={16} /> Evolució (24h)
                    </button>
                    <button 
                        onClick={() => setActiveTab('patterns')}
                        className={`flex-1 py-3 text-xs md:text-sm font-bold border-b-2 transition-colors flex items-center justify-center gap-2 ${activeTab === 'patterns' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                    >
                        <Clock size={16} /> Patrons (30m)
                    </button>
                </div>

                <div className="p-4 md:p-6 space-y-6 flex-1">
                    
                    {/* TIMELINE VIEW */}
                    {activeTab === 'timeline' && (
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 animate-in slide-in-from-left-2 h-full md:h-auto flex flex-col">
                            <h3 className="font-bold text-slate-700 mb-4 flex items-center justify-between shrink-0">
                                <span>Històric d'Ocupació</span>
                                <span className="text-[10px] font-normal text-slate-400 bg-slate-100 px-2 py-1 rounded">24h</span>
                            </h3>
                            <div className="flex-1 min-h-[300px] w-full">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={history}>
                                        <defs>
                                            <linearGradient id="colorMech" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
                                            </linearGradient>
                                            <linearGradient id="colorElec" x1="0" y1="0" x2="0" y2="1">
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
                                            style={{ fontSize: '11px', fill: '#94a3b8' }}
                                            minTickGap={50}
                                        />
                                        <YAxis style={{ fontSize: '11px', fill: '#94a3b8' }} />
                                        <Tooltip 
                                            labelFormatter={(unix) => new Date(unix).toLocaleString()}
                                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}
                                        />
                                        <Area 
                                            type="monotone" 
                                            dataKey="ebikes" 
                                            stackId="1" 
                                            stroke="#3b82f6" 
                                            fill="url(#colorElec)" 
                                            name="Elèctriques"
                                            animationDuration={500}
                                        />
                                        <Area 
                                            type="monotone" 
                                            dataKey="mechanical" 
                                            stackId="1" 
                                            stroke="#ef4444" 
                                            fill="url(#colorMech)" 
                                            name="Mecàniques"
                                            animationDuration={500}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {/* PATTERNS VIEW */}
                    {activeTab === 'patterns' && analysis && (
                        <div className="space-y-4 md:space-y-6 animate-in slide-in-from-right-2 pb-6">
                             {/* Extended Insights Grid */}
                             <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
                                
                                {/* 1. Best Time */}
                                <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-3 md:p-4 rounded-xl border border-green-100 col-span-2 md:col-span-1">
                                    <div className="text-green-800 text-xs font-bold uppercase mb-1 flex items-center gap-1"><Clock size={12}/> Millor Hora</div>
                                    <div className="text-2xl md:text-3xl font-black text-green-700">{analysis.bestSlot.time}</div>
                                    <div className="text-xs text-green-600 mt-1">
                                        ~{analysis.bestSlot.avgBikes} bicis
                                    </div>
                                </div>

                                {/* 2. Reliability */}
                                <div className="bg-white p-3 md:p-4 rounded-xl border border-slate-200">
                                     <div className="text-slate-500 text-[10px] md:text-xs font-bold uppercase mb-1 flex items-center gap-1"><ShieldCheck size={12}/> Fiabilitat</div>
                                     <div className={`text-xl md:text-2xl font-black ${analysis.reliability > 80 ? 'text-blue-600' : 'text-orange-500'}`}>
                                         {analysis.reliability.toFixed(0)}%
                                     </div>
                                     <div className="text-[10px] text-slate-400 mt-1 leading-tight">
                                         Temps amb +2 bicis
                                     </div>
                                </div>

                                {/* 3. Volatility */}
                                <div className="bg-white p-3 md:p-4 rounded-xl border border-slate-200">
                                     <div className="text-slate-500 text-[10px] md:text-xs font-bold uppercase mb-1 flex items-center gap-1"><Activity size={12}/> Volatilitat</div>
                                     <div className="text-xl md:text-2xl font-black text-slate-700">
                                         ±{analysis.volatility.toFixed(1)}
                                     </div>
                                     <div className="text-[10px] text-slate-400 mt-1 leading-tight">
                                         Desviació mitjana
                                     </div>
                                </div>

                                {/* 4. Risk */}
                                <div className={`p-3 md:p-4 rounded-xl border ${analysis.emptyProbability > 20 ? 'bg-red-50 border-red-100' : 'bg-white border-slate-200'}`}>
                                    <div className="text-slate-600 text-[10px] md:text-xs font-bold uppercase mb-1 flex items-center gap-1"><AlertCircle size={12}/> Risc Buit</div>
                                    <div className={`text-xl md:text-2xl font-black ${analysis.emptyProbability > 20 ? 'text-red-600' : 'text-slate-700'}`}>
                                        {analysis.emptyProbability.toFixed(1)}%
                                    </div>
                                </div>

                                 {/* 5. Max Capacity */}
                                 <div className="bg-white p-3 md:p-4 rounded-xl border border-slate-200">
                                     <div className="text-slate-500 text-[10px] md:text-xs font-bold uppercase mb-1 flex items-center gap-1"><Maximize size={12}/> Capacitat</div>
                                     <div className="text-xl md:text-2xl font-black text-slate-700">
                                         {analysis.maxCapacity}
                                     </div>
                                     <div className="text-[10px] text-slate-400 mt-1 leading-tight">
                                         Max bicis + llocs
                                     </div>
                                </div>

                                {/* 6. E-Bike Prob */}
                                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-3 md:p-4 rounded-xl border border-indigo-100">
                                    <div className="text-indigo-800 text-[10px] md:text-xs font-bold uppercase mb-1 flex items-center gap-1"><Zap size={12}/> % Elèctric</div>
                                    <div className="text-xl md:text-2xl font-black text-indigo-700">
                                        {(analysis.avgEbikes / (analysis.bestSlot.avgBikes || 1) * 100).toFixed(0)}%
                                    </div>
                                </div>
                            </div>

                            {/* Half-Hourly Range Chart (Min-Avg-Max) */}
                            <div className="bg-white p-4 md:p-5 rounded-xl shadow-sm border border-slate-100 h-[350px] md:h-auto flex flex-col">
                                <h3 className="font-bold text-slate-700 mb-4 md:mb-6 flex items-center gap-2 shrink-0">
                                    <BarChart3 size={18} /> Disponibilitat per Franges (Min-Max)
                                </h3>
                                <div className="flex-1 min-h-0">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <ComposedChart data={analysis.patternData} barGap={0} barCategoryGap="10%">
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis 
                                                dataKey="time" 
                                                style={{ fontSize: '10px' }} 
                                                interval={3} 
                                            />
                                            <YAxis style={{ fontSize: '10px' }} />
                                            <Tooltip 
                                                cursor={{fill: 'rgba(0,0,0,0.03)'}}
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}
                                                formatter={(value: any, name: string) => {
                                                    if (name === 'range') return null; // Hide raw range array
                                                    return [value, name === 'avgBikes' ? 'Mitjana' : name];
                                                }}
                                                labelStyle={{ fontWeight: 'bold', color: '#334155' }}
                                            />
                                            
                                            {/* Min-Max Range Area */}
                                            <Area 
                                                dataKey="range" 
                                                stroke="none" 
                                                fill="#93c5fd" 
                                                fillOpacity={0.4} 
                                                name="Rang (Min-Max)"
                                            />

                                            {/* Average Line */}
                                            <Line 
                                                type="monotone" 
                                                dataKey="avgBikes" 
                                                stroke="#2563eb" 
                                                strokeWidth={3} 
                                                dot={false}
                                                name="Mitjana"
                                                activeDot={{ r: 6 }}
                                            />

                                            <ReferenceLine y={0} stroke="#000" />
                                        </ComposedChart>
                                    </ResponsiveContainer>
                                </div>
                                <p className="text-xs text-center text-slate-400 mt-2 flex items-center justify-center gap-2 shrink-0">
                                    <Info size={12}/> Àrea blava indica el mínim i màxim històric per franja.
                                </p>
                            </div>
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