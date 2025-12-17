import React, { useMemo, useState, useEffect } from 'react';
import { Station } from '../types';
import { X, TrendingUp, Activity, Database, Signal, ChevronLeft, ScatterChart as ScatterIcon, LineChart, Download, Trash2 } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid, ScatterChart, Scatter, PieChart, Pie, Legend } from 'recharts';
import { downloadCSV, getSnapshotCount, clearDatabase, getHistory, Snapshot } from '../services/db';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stations: Station[];
  onForceSave: () => void;
}

const StatsModal: React.FC<StatsModalProps> = ({ isOpen, onClose, stations, onForceSave }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'log'>('overview');
  const [rankTab, setRankTab] = useState<'bikes' | 'slots'>('bikes');
  const [recordCount, setRecordCount] = useState<number>(0);
  const [history, setHistory] = useState<Snapshot[]>([]);
  
  useEffect(() => {
      if (isOpen) {
          refreshData();
      }
  }, [isOpen]);

  const refreshData = () => {
      getSnapshotCount().then(setRecordCount);
      getHistory(100).then(setHistory);
  };

  const handleClearDB = async () => {
      if (confirm("Segur que vols esborrar l'historial? Això eliminarà totes les dades CSV guardades al navegador.")) {
          await clearDatabase();
          refreshData();
      }
  };

  const stats = useMemo(() => {
    // 1. Availability Histogram
    const availabilityBins = [
      { name: 'Buides (0)', count: 0, color: '#94a3b8' },
      { name: 'Crític (1-5)', count: 0, color: '#ef4444' },
      { name: 'Mig (6-15)', count: 0, color: '#eab308' },
      { name: 'Alt (15+)', count: 0, color: '#22c55e' },
    ];

    let totalBikes = 0;
    let totalEbikes = 0;
    let totalSlots = 0;
    let activeStations = 0;
    let offlineStationsCount = 0;
    let fullStationsCount = 0; 
    
    // Scatter data: Capacity vs Free Bikes
    const scatterData = [] as any[];

    stations.forEach(s => {
      const bikes = s.free_bikes;
      const slots = s.empty_slots;
      totalBikes += bikes;
      totalEbikes += (s.extra?.ebikes || 0);
      totalSlots += slots;

      const isOnline = s.extra?.online !== false && s.extra?.status !== 'CLOSED';
      if (isOnline) {
          activeStations++;
      } else {
          offlineStationsCount++;
      }

      if (bikes === 0) availabilityBins[0].count++;
      else if (bikes <= 5) availabilityBins[1].count++;
      else if (bikes <= 15) availabilityBins[2].count++;
      else availabilityBins[3].count++;

      if (slots === 0) fullStationsCount++;

      // Scatter Data (Downsampled for performance)
      if (Math.random() > 0.3) {
          scatterData.push({
              capacity: bikes + slots,
              bikes: bikes,
              name: s.name,
              fill: bikes === 0 ? '#ef4444' : '#3b82f6'
          });
      }
    });

    const totalCapacity = totalBikes + totalSlots;
    const occupancyRate = totalCapacity > 0 ? (totalBikes / totalCapacity) * 100 : 0;

    const statusData = [
        { name: 'Operatives', value: activeStations, color: '#22c55e' },
        { name: 'Fora de Servei', value: offlineStationsCount, color: '#64748b' },
    ];

    const sortedByBikes = [...stations].sort((a, b) => b.free_bikes - a.free_bikes);
    const top5Bikes = sortedByBikes.slice(0, 5).map(s => ({ name: s.name.split('-')[1]?.trim() || s.name, value: s.free_bikes }));

    const sortedBySlots = [...stations].sort((a, b) => b.empty_slots - a.empty_slots);
    const top5Slots = sortedBySlots.slice(0, 5).map(s => ({ name: s.name.split('-')[1]?.trim() || s.name, value: s.empty_slots }));
    
    return { 
        availabilityBins, 
        totalBikes, 
        totalEbikes, 
        top5Bikes, 
        top5Slots, 
        scatterData, 
        occupancyRate, 
        statusData, 
        fullStationsCount,
        offlineStationsCount,
    };
  }, [stations]);

  // Network Trend Data from History
  const networkTrend = useMemo(() => {
      return history.map(snap => {
          const total = snap.stations.reduce((acc, s) => acc + s.free_bikes, 0);
          return {
              time: snap.timestamp,
              total
          };
      });
  }, [history]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[5000] flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full h-[100dvh] md:h-auto md:max-h-[90vh] md:max-w-5xl md:rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 md:p-6 border-b border-slate-100 bg-white z-10 shrink-0 safe-area-top">
          <div className="flex flex-col gap-1 w-full">
            <div className="flex items-center justify-between gap-2">
                 <div className="flex items-center gap-2">
                    <button onClick={onClose} className="md:hidden p-1 -ml-2 text-slate-500">
                        <ChevronLeft size={24} />
                    </button>
                    <h2 className="text-xl md:text-2xl font-black text-slate-800 flex items-center gap-2">
                        <Database className="text-blue-600" /> Estadístiques
                    </h2>
                 </div>
                 
                 {/* ACTION BUTTONS */}
                 <div className="flex items-center gap-2">
                     <button 
                        onClick={downloadCSV}
                        className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-2 rounded-lg flex items-center gap-2 text-xs font-bold transition-colors"
                        title="Descarregar CSV"
                     >
                        <Download size={16} /> 
                        <span className="hidden md:inline">CSV</span>
                     </button>
                     <button 
                        onClick={handleClearDB}
                        className="bg-red-50 hover:bg-red-100 text-red-600 p-2 rounded-lg flex items-center gap-2 text-xs font-bold transition-colors"
                        title="Esborrar Històric"
                     >
                        <Trash2 size={16} />
                     </button>
                     <button onClick={onClose} className="hidden md:block p-2 hover:bg-slate-100 rounded-full transition-colors">
                        <X size={24} className="text-slate-500" />
                    </button>
                 </div>
            </div>
            
            <div className="flex gap-4 mt-2">
                 <button 
                    onClick={() => setActiveTab('overview')}
                    className={`text-sm font-bold pb-1 border-b-2 transition-colors ${activeTab === 'overview' ? 'text-blue-600 border-blue-600' : 'text-slate-400 border-transparent'}`}
                 >
                     Gràfiques
                 </button>
                 <button 
                    onClick={() => setActiveTab('log')}
                    className={`text-sm font-bold pb-1 border-b-2 transition-colors ${activeTab === 'log' ? 'text-blue-600 border-blue-600' : 'text-slate-400 border-transparent'}`}
                 >
                     Registre ({recordCount})
                 </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-4 md:p-6 space-y-6 overflow-y-auto flex-1 bg-slate-50">
          
          {activeTab === 'overview' ? (
            <>
                {/* Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                    <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                        <div className="text-slate-500 font-bold mb-1 text-[10px] uppercase">Flota Total</div>
                        <div className="text-2xl font-black text-slate-900">{stats.totalBikes}</div>
                        <div className="text-xs text-blue-600 font-bold">{stats.totalEbikes} elèctriques</div>
                    </div>
                    <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                        <div className="text-slate-500 font-bold mb-1 text-[10px] uppercase">Ocupació</div>
                        <div className="text-2xl font-black text-indigo-900">{stats.occupancyRate.toFixed(1)}%</div>
                        <div className="w-full h-1 bg-indigo-100 mt-2 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-600" style={{ width: `${stats.occupancyRate}%` }}></div>
                        </div>
                    </div>
                    <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                        <div className="text-slate-500 font-bold mb-1 text-[10px] uppercase">Estacions Plenes</div>
                        <div className="text-2xl font-black text-red-600">{stats.fullStationsCount}</div>
                    </div>
                    <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                        <div className="text-slate-500 font-bold mb-1 text-[10px] uppercase">Fora de Servei</div>
                        <div className="text-2xl font-black text-gray-500">{stats.offlineStationsCount}</div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    
                    {/* NEW: Network Trend Chart */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                         <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                            <LineChart size={18} className="text-blue-500" /> Tendència de la Xarxa
                        </h3>
                        <div className="h-48">
                            {networkTrend.length > 1 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={networkTrend}>
                                        <defs>
                                            <linearGradient id="colorNet" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.5}/>
                                                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="time" type="number" domain={['dataMin', 'dataMax']} tickFormatter={t => new Date(t).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})} style={{fontSize: '10px'}} />
                                        <YAxis domain={['auto', 'auto']} style={{fontSize: '10px'}} />
                                        <Tooltip labelFormatter={t => new Date(t).toLocaleTimeString()} />
                                        <Area type="monotone" dataKey="total" stroke="#2563eb" fill="url(#colorNet)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="h-full flex items-center justify-center text-slate-400 text-sm">
                                    Necessitem més dades històriques.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Status Pie */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                        <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                            <Signal size={18} className="text-green-500" /> Estat del Servei
                        </h3>
                        <div className="h-48">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie data={stats.statusData} cx="50%" cy="50%" innerRadius={40} outerRadius={60} paddingAngle={5} dataKey="value">
                                        {stats.statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                                    </Pie>
                                    <Tooltip />
                                    <Legend verticalAlign="middle" align="right" layout="vertical" />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* NEW: Scatter Chart (Distribution) */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm lg:col-span-2">
                        <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                            <ScatterIcon size={18} className="text-purple-500" /> Distribució (Capacitat vs Bicis)
                        </h3>
                        <div className="h-64">
                             <ResponsiveContainer width="100%" height="100%">
                                <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                    <CartesianGrid />
                                    <XAxis type="number" dataKey="capacity" name="Capacitat Total" unit=" llocs" style={{fontSize: '10px'}} />
                                    <YAxis type="number" dataKey="bikes" name="Bicis Disponibles" unit=" bicis" style={{fontSize: '10px'}} />
                                    <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                                    <Scatter name="Estacions" data={stats.scatterData} fill="#8884d8" />
                                </ScatterChart>
                             </ResponsiveContainer>
                        </div>
                        <p className="text-[10px] text-center text-slate-400">
                            Cada punt és una estació. X: Mida de l'estació, Y: Bicis actuals.
                        </p>
                    </div>

                    {/* Rankings */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm lg:col-span-2">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-slate-700 flex items-center gap-2">
                                <TrendingUp size={18} className="text-orange-500" /> Top Estacions
                            </h3>
                            <div className="flex bg-slate-100 rounded-lg p-1">
                                <button onClick={() => setRankTab('bikes')} className={`px-3 py-1 text-xs font-bold rounded ${rankTab === 'bikes' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>Bicis</button>
                                <button onClick={() => setRankTab('slots')} className={`px-3 py-1 text-xs font-bold rounded ${rankTab === 'slots' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>Llocs</button>
                            </div>
                        </div>
                        <div className="space-y-2">
                            {(rankTab === 'bikes' ? stats.top5Bikes : stats.top5Slots).map((st, i) => (
                                <div key={i} className="flex justify-between p-2 bg-slate-50 rounded">
                                    <span className="text-sm font-medium text-slate-700 truncate w-2/3">{i+1}. {st.name}</span>
                                    <span className="font-bold text-blue-600">{st.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                 <table className="w-full text-sm text-left text-slate-600">
                    <thead className="text-xs text-slate-700 uppercase bg-slate-50 border-b">
                        <tr>
                            <th className="px-4 py-3">Data</th>
                            <th className="px-4 py-3">Estacions</th>
                            <th className="px-4 py-3">Bicis</th>
                        </tr>
                    </thead>
                    <tbody>
                        {history.map((row) => (
                            <tr key={row.timestamp} className="border-b hover:bg-slate-50">
                                <td className="px-4 py-3">{new Date(row.timestamp).toLocaleTimeString()}</td>
                                <td className="px-4 py-3">{row.stations.length}</td>
                                <td className="px-4 py-3 font-bold">{row.stations.reduce((a,b)=>a+b.free_bikes,0)}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StatsModal;