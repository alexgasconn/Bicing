import React, { useEffect, useState, useMemo } from 'react';
import { Station } from '../types';
import { getStationHistory, StationHistoryPoint } from '../services/db';
import { X, TrendingUp, Clock, Calendar, BarChart3, BatteryCharging, Bike, AlertCircle, Info } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar, Cell, ReferenceLine } from 'recharts';

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

      // 1. Hourly Pattern (Average bikes by Hour of Day)
      const hourlyAccumulator = new Array(24).fill(0).map(() => ({ totalBikes: 0, count: 0 }));
      
      history.forEach(point => {
          const hour = new Date(point.timestamp).getHours();
          hourlyAccumulator[hour].totalBikes += point.free_bikes;
          hourlyAccumulator[hour].count++;
      });

      const hourlyPattern = hourlyAccumulator.map((data, hour) => ({
          hour: `${hour}:00`,
          avgBikes: data.count > 0 ? parseFloat((data.totalBikes / data.count).toFixed(1)) : 0,
          hourInt: hour
      }));

      // 2. Key Metrics
      const totalCapacity = (history[0].free_bikes + history[0].empty_slots) || 1;
      const emptyInstances = history.filter(p => p.free_bikes === 0).length;
      const fullInstances = history.filter(p => p.empty_slots === 0).length;
      
      const emptyProbability = (emptyInstances / history.length) * 100;
      const fullProbability = (fullInstances / history.length) * 100;

      // Find "Best" and "Worst" hours
      const sortedHours = [...hourlyPattern].sort((a, b) => b.avgBikes - a.avgBikes);
      const bestHourForBikes = sortedHours[0]; // Most bikes
      const worstHourForBikes = sortedHours[sortedHours.length - 1]; // Least bikes (best for parking)

      return {
          hourlyPattern,
          emptyProbability,
          fullProbability,
          bestHourForBikes,
          worstHourForBikes,
          totalPoints: history.length,
          avgEbikes: history.reduce((acc, curr) => acc + curr.ebikes, 0) / history.length
      };
  }, [history]);

  if (!station) return null;

  return (
    <div className="fixed inset-0 z-[6000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in zoom-in-95 duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-5 flex justify-between items-start">
            <div>
                <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">
                    ANÀLISI DETALLADA
                </div>
                <h2 className="text-2xl font-black leading-tight">{station.name}</h2>
                <div className="flex items-center gap-3 mt-2 text-sm text-slate-300">
                    <span className="bg-slate-800 px-2 py-0.5 rounded flex items-center gap-1">
                        <Bike size={14} className="text-red-400"/> {station.free_bikes}
                    </span>
                    <span className="bg-slate-800 px-2 py-0.5 rounded flex items-center gap-1">
                        <BatteryCharging size={14} className="text-blue-400"/> {station.extra?.ebikes || 0}
                    </span>
                    <span className="bg-slate-800 px-2 py-0.5 rounded">
                        {history.length} punts de dades
                    </span>
                </div>
            </div>
            <button onClick={onClose} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors text-white">
                <X size={20} />
            </button>
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
                 <p className="max-w-md mx-auto mt-2">
                     Necessitem més temps per generar estadístiques fiables d'aquesta estació. 
                     Deixa l'aplicació oberta o torna més tard.
                 </p>
            </div>
        ) : (
            <div className="flex-1 overflow-y-auto bg-slate-50">
                
                {/* Tabs */}
                <div className="flex border-b border-slate-200 bg-white sticky top-0 z-10 px-4">
                    <button 
                        onClick={() => setActiveTab('timeline')}
                        className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'timeline' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                    >
                        <TrendingUp size={16} /> Evolució Temporal
                    </button>
                    <button 
                        onClick={() => setActiveTab('patterns')}
                        className={`px-4 py-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 ${activeTab === 'patterns' ? 'border-purple-600 text-purple-600' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
                    >
                        <Clock size={16} /> Patrons Diaris
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    
                    {/* TIMELINE VIEW */}
                    {activeTab === 'timeline' && (
                        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 animate-in slide-in-from-left-2">
                            <h3 className="font-bold text-slate-700 mb-4 flex items-center justify-between">
                                <span>Històric d'Ocupació</span>
                                <span className="text-xs font-normal text-slate-400 bg-slate-100 px-2 py-1 rounded">Darreres 24h / Tot</span>
                            </h3>
                            <div className="h-[300px] w-full">
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
                        <div className="space-y-6 animate-in slide-in-from-right-2">
                             {/* Insights Grid */}
                             <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-4 rounded-xl border border-green-100">
                                    <div className="text-green-800 text-xs font-bold uppercase mb-1">Millor hora per Bici</div>
                                    <div className="text-2xl font-black text-green-700">{analysis.bestHourForBikes.hour}</div>
                                    <div className="text-xs text-green-600 mt-1">
                                        Mitjana de {analysis.bestHourForBikes.avgBikes} bicis
                                    </div>
                                </div>
                                <div className="bg-gradient-to-br from-indigo-50 to-blue-50 p-4 rounded-xl border border-indigo-100">
                                    <div className="text-indigo-800 text-xs font-bold uppercase mb-1">Probabilitat Elèctrica</div>
                                    <div className="text-2xl font-black text-indigo-700">
                                        {(analysis.avgEbikes / (analysis.bestHourForBikes.avgBikes || 1) * 100).toFixed(0)}%
                                    </div>
                                    <div className="text-xs text-indigo-600 mt-1">
                                        de la flota sol ser elèctrica
                                    </div>
                                </div>
                                <div className={`p-4 rounded-xl border ${analysis.emptyProbability > 20 ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'}`}>
                                    <div className="text-slate-600 text-xs font-bold uppercase mb-1">Risc d'Estació Buida</div>
                                    <div className={`text-2xl font-black ${analysis.emptyProbability > 20 ? 'text-red-600' : 'text-slate-700'}`}>
                                        {analysis.emptyProbability.toFixed(1)}%
                                    </div>
                                    <div className="text-xs text-slate-500 mt-1">
                                        del temps està a 0 bicis
                                    </div>
                                </div>
                            </div>

                            {/* Hourly Chart */}
                            <div className="bg-white p-5 rounded-xl shadow-sm border border-slate-100">
                                <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2">
                                    <BarChart3 size={18} /> Disponibilitat Mitjana per Hora
                                </h3>
                                <div className="h-[250px]">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={analysis.hourlyPattern}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis 
                                                dataKey="hour" 
                                                style={{ fontSize: '10px' }} 
                                                interval={2}
                                            />
                                            <YAxis style={{ fontSize: '10px' }} />
                                            <Tooltip 
                                                cursor={{fill: 'rgba(0,0,0,0.03)'}}
                                                contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }}
                                            />
                                            <Bar dataKey="avgBikes" name="Mitjana Bicis" radius={[4, 4, 0, 0]}>
                                                {analysis.hourlyPattern.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.avgBikes > 5 ? '#22c55e' : entry.avgBikes > 2 ? '#eab308' : '#ef4444'} />
                                                ))}
                                            </Bar>
                                            <ReferenceLine y={0} stroke="#000" />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                                <p className="text-xs text-center text-slate-400 mt-2 flex items-center justify-center gap-2">
                                    <Info size={12}/> Es mostra la mitjana de bicis disponibles a cada hora del dia (basat en tot l'historial).
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