import React, { useEffect, useState, useMemo } from 'react';
import { Station } from '../types';
import { getStationHistory, StationHistoryPoint } from '../services/db';
import { X, TrendingUp, Clock, BarChart3, BatteryCharging, AlertCircle, ChevronLeft, ShieldCheck, Zap, CalendarClock, Activity, Maximize, LayoutDashboard, History, Timer, ArrowDownToDot, ArrowUpRight, ArrowDownLeft, Repeat } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ComposedChart, Line, BarChart, Bar, Cell, Legend, ReferenceLine } from 'recharts';

interface StationAnalyticsModalProps {
  station: Station | null;
  onClose: () => void;
}

type TabType = 'stats' | 'evolution' | 'pattern' | 'range' | 'activity';

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
      if (history.length < 2) return null;

      const buckets = new Array(48).fill(0).map(() => ({ 
          totalBikes: 0, 
          totalEbikes: 0,
          totalMech: 0,
          count: 0,
          min: Number.MAX_SAFE_INTEGER,
          max: -1,
          totalIn: 0,
          totalOut: 0
      }));
      
      let reliableCount = 0;
      let totalEbikesRaw = 0;
      let maxCapacityObserved = 0;
      let emptyInstances = 0;
      let totalMoves = 0;

      let lastBikes = -1;

      history.forEach(point => {
          if (point.free_bikes > 2) reliableCount++;
          if (point.free_bikes === 0) emptyInstances++;
          totalEbikesRaw += point.ebikes;
          
          const cap = point.free_bikes + point.empty_slots;
          if (cap > maxCapacityObserved) maxCapacityObserved = cap;

          const d = new Date(point.timestamp);
          const hour = d.getHours();
          const minute = d.getMinutes();
          const index = hour * 2 + (minute >= 30 ? 1 : 0);
          
          buckets[index].totalBikes += point.free_bikes;
          buckets[index].totalEbikes += point.ebikes;
          buckets[index].totalMech += point.mechanical;
          buckets[index].count++;
          
          if (point.free_bikes < buckets[index].min) buckets[index].min = point.free_bikes;
          if (point.free_bikes > buckets[index].max) buckets[index].max = point.free_bikes;

          // Flow Calculation (Activity)
          if (lastBikes !== -1) {
              const delta = point.free_bikes - lastBikes;
              if (delta > 0) {
                  buckets[index].totalIn += delta;
                  totalMoves += delta;
              } else if (delta < 0) {
                  buckets[index].totalOut += Math.abs(delta);
                  totalMoves += Math.abs(delta);
              }
          }
          lastBikes = point.free_bikes;
      });

      const patternData = buckets.map((data, index) => {
          const hour = Math.floor(index / 2);
          const isHalf = index % 2 === 1;
          const timeLabel = `${hour.toString().padStart(2, '0')}:${isHalf ? '30' : '00'}`;
          
          const hasData = data.count > 0;
          return {
              time: timeLabel,
              avgBikes: hasData ? parseFloat((data.totalBikes / data.count).toFixed(1)) : 0,
              avgEbikes: hasData ? parseFloat((data.totalEbikes / data.count).toFixed(1)) : 0,
              avgMech: hasData ? parseFloat((data.totalMech / data.count).toFixed(1)) : 0,
              min: hasData ? data.min : 0,
              max: hasData ? data.max : 0,
              range: hasData ? [data.min, data.max] : [0,0],
              // Average activity per slot
              avgIn: hasData ? parseFloat((data.totalIn / (data.count / 2)).toFixed(1)) : 0, 
              avgOut: hasData ? -parseFloat((data.totalOut / (data.count / 2)).toFixed(1)) : 0,
              index
          };
      });

      const reliability = (reliableCount / history.length) * 100;
      const emptyRatio = (emptyInstances / history.length) * 100;
      const avgEbikes = totalEbikesRaw / history.length;
      const bestSlot = [...patternData].sort((a, b) => b.avgBikes - a.avgBikes)[0];
      const worstSlot = [...patternData].sort((a, b) => a.avgBikes - b.avgBikes)[0];
      const avgHourlyFlow = totalMoves / (history.length / 12); // Approximate hourly based on 5-min intervals

      return {
          patternData,
          bestSlot,
          worstSlot,
          reliability,
          emptyRatio,
          avgEbikes,
          maxCapacityObserved,
          totalPoints: history.length,
          avgHourlyFlow
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
                        TENDÈNCIES 24H ACUMULADES
                    </div>
                    <h2 className="text-xl font-black leading-tight truncate max-w-[200px] md:max-w-full">{station.name}</h2>
                </div>
            </div>
            <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white hidden md:block">
                <X size={20} />
            </button>
        </div>

        {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center p-10 text-slate-400">
                 <div className="animate-spin mb-4"><TrendingUp size={32} /></div>
                 <p>Processant dades històriques...</p>
            </div>
        ) : !analysis ? (
             <div className="flex-1 flex flex-col items-center justify-center p-10 text-slate-400 text-center">
                 <AlertCircle size={48} className="mb-4 text-slate-300" />
                 <h3 className="text-lg font-bold text-slate-600">Dades Insuficients</h3>
                 <p className="max-w-md mx-auto mt-2 text-sm">
                     Es necessiten almenys 2 captures per generar les tendències.
                 </p>
            </div>
        ) : (
            <div className="flex flex-col h-full overflow-hidden">
                
                {/* Tabs */}
                <div className="flex border-b border-slate-200 overflow-x-auto no-scrollbar shrink-0 bg-white">
                    {([
                        {id:'stats', icon:<LayoutDashboard size={14}/>, label:'Stats'},
                        {id:'evolution', icon:<Activity size={14}/>, label:'Evolució'},
                        {id:'activity', icon:<Repeat size={14}/>, label:'Activitat'},
                        {id:'pattern', icon:<BarChart3 size={14}/>, label:'Barres'},
                        {id:'range', icon:<CalendarClock size={14}/>, label:'Àrea'}
                    ] as const).map(tab => (
                        <button 
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`flex-1 py-3 px-4 text-xs font-bold border-b-2 transition-colors whitespace-nowrap flex items-center justify-center gap-2 ${activeTab === tab.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500'}`}
                        >
                            {tab.icon} {tab.label}
                        </button>
                    ))}
                </div>

                <div className="flex-1 overflow-y-auto bg-slate-50 p-4 md:p-6">
                    
                    {/* TAB: STATS */}
                    {activeTab === 'stats' && (
                        <div className="grid grid-cols-2 gap-3 md:gap-4 animate-in slide-in-from-left-2 pb-10">
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm col-span-2">
                                <div className="text-slate-500 text-xs font-bold uppercase mb-1 flex items-center gap-1">
                                    <Clock size={14}/> Hora punta de bicis
                                </div>
                                <div className="text-4xl font-black text-slate-800">
                                    {analysis.bestSlot.time}
                                </div>
                                <div className="text-sm text-slate-500 mt-1">
                                    Mitjana màxima: {analysis.bestSlot.avgBikes} unitats
                                </div>
                            </div>
                            
                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                <div className="text-slate-500 text-[10px] font-bold uppercase mb-1 flex items-center gap-1">
                                    <ShieldCheck size={14}/> Fiabilitat
                                </div>
                                <div className={`text-2xl font-black ${analysis.reliability > 80 ? 'text-green-600' : 'text-orange-500'}`}>
                                    {analysis.reliability.toFixed(0)}%
                                </div>
                            </div>

                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                <div className="text-slate-500 text-[10px] font-bold uppercase mb-1 flex items-center gap-1">
                                    <Repeat size={14}/> Flux/Hora
                                </div>
                                <div className="text-2xl font-black text-blue-600">
                                     {analysis.avgHourlyFlow.toFixed(1)}
                                </div>
                            </div>

                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                <div className="text-slate-500 text-[10px] font-bold uppercase mb-1 flex items-center gap-1">
                                    <Timer size={14}/> Temps buida
                                </div>
                                <div className={`text-2xl font-black ${analysis.emptyRatio > 20 ? 'text-red-600' : 'text-slate-700'}`}>
                                     {analysis.emptyRatio.toFixed(1)}%
                                </div>
                            </div>

                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                <div className="text-slate-500 text-[10px] font-bold uppercase mb-1 flex items-center gap-1">
                                    <History size={14}/> Lectures
                                </div>
                                <div className="text-2xl font-black text-slate-700">
                                     {analysis.totalPoints}
                                </div>
                            </div>

                            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm col-span-2">
                                <div className="text-slate-500 text-xs font-bold uppercase mb-1 flex items-center gap-1">
                                    <Maximize size={14}/> Capacitat i Mix
                                </div>
                                <div className="text-2xl font-black text-slate-700">
                                    {analysis.maxCapacityObserved} <span className="text-xs font-normal text-slate-400">places</span>
                                </div>
                                <div className="text-xs text-blue-600 font-bold mt-1">
                                    {(analysis.avgEbikes / (analysis.bestSlot.avgBikes || 1) * 100).toFixed(0)}% elèctrica mitjana
                                </div>
                            </div>
                        </div>
                    )}

                    {/* TAB: ACTIVITY (In vs Out) */}
                    {activeTab === 'activity' && (
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col animate-in slide-in-from-right-2">
                            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 text-sm">
                                <Repeat size={16} className="text-blue-500" /> Flux de Bicis (Entrades vs Sortides)
                            </h3>
                            <div className="w-full h-[320px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={analysis.patternData} stackOffset="sign">
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="time" style={{ fontSize: '10px', fill: '#94a3b8' }} interval={5} />
                                        <YAxis style={{ fontSize: '10px', fill: '#94a3b8' }} />
                                        <Tooltip />
                                        <Legend verticalAlign="top" height={36}/>
                                        <ReferenceLine y={0} stroke="#cbd5e1" />
                                        <Bar dataKey="avgIn" name="Entrades (+)" fill="#22c55e" radius={[2, 2, 0, 0]} />
                                        <Bar dataKey="avgOut" name="Sortides (-)" fill="#ef4444" radius={[0, 0, 2, 2]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <p className="text-[10px] text-center text-slate-400 mt-2">
                                *Mitjana de bicis que canvien d'estat en aquesta franja horària.
                            </p>
                        </div>
                    )}

                    {/* TAB: EVOLUTION */}
                    {activeTab === 'evolution' && (
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col animate-in slide-in-from-right-2">
                            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 text-sm">
                                <Activity size={16} className="text-blue-500" /> Evolució Mitjana (00:00 - 24:00)
                            </h3>
                            <div className="w-full h-[320px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={analysis.patternData}>
                                        <defs>
                                            <linearGradient id="colorMechAgg" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.8}/>
                                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0.1}/>
                                            </linearGradient>
                                            <linearGradient id="colorElecAgg" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8}/>
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0.1}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="time" style={{ fontSize: '10px', fill: '#94a3b8' }} interval={5} />
                                        <YAxis style={{ fontSize: '10px', fill: '#94a3b8' }} />
                                        <Tooltip />
                                        <Legend verticalAlign="top" height={36}/>
                                        <Area type="monotone" dataKey="avgEbikes" stackId="1" stroke="#3b82f6" fill="url(#colorElecAgg)" name="Elèctriques" />
                                        <Area type="monotone" dataKey="avgMech" stackId="1" stroke="#ef4444" fill="url(#colorMechAgg)" name="Mecàniques" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {/* TAB: PATTERNS */}
                    {activeTab === 'pattern' && (
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col animate-in slide-in-from-right-2">
                            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 text-sm">
                                <BarChart3 size={16} className="text-orange-500" /> Disponibilitat per Franges
                            </h3>
                            <div className="w-full h-[320px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={analysis.patternData} barCategoryGap={1}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="time" style={{ fontSize: '10px', fill: '#94a3b8' }} interval={5} />
                                        <YAxis style={{ fontSize: '10px', fill: '#94a3b8' }} />
                                        <Tooltip cursor={{fill: 'rgba(0,0,0,0.05)'}} />
                                        <Bar dataKey="avgBikes" name="Bicis" radius={[1, 1, 0, 0]}>
                                            {analysis.patternData.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.avgBikes > 5 ? '#f97316' : '#fdba74'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    )}

                    {/* TAB: RANGE */}
                    {activeTab === 'range' && (
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col animate-in slide-in-from-right-2">
                            <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2 text-sm">
                                <CalendarClock size={16} className="text-emerald-500" /> Certesa i Rangs Històrics
                            </h3>
                            <div className="w-full h-[320px]">
                                <ResponsiveContainer width="100%" height="100%">
                                    <ComposedChart data={analysis.patternData}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="time" style={{ fontSize: '10px', fill: '#94a3b8' }} interval={5} />
                                        <YAxis style={{ fontSize: '10px', fill: '#94a3b8' }} />
                                        <Tooltip />
                                        <Legend verticalAlign="top" height={36}/>
                                        <Area dataKey="range" stroke="#10b981" fill="#d1fae5" opacity={0.6} name="Rang (Min-Max)" />
                                        <Line type="monotone" dataKey="avgBikes" stroke="#059669" strokeWidth={3} dot={false} name="Mitjana" />
                                    </ComposedChart>
                                </ResponsiveContainer>
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