import React, { useMemo, useState, useEffect } from 'react';
import { Station } from '../types';
import { X, BarChart3, TrendingUp, AlertTriangle, Activity, Database, BatteryCharging, Ban, CheckCircle, Download, Trash2, FileSpreadsheet, Save, Table, Clock, ServerOff, Signal, ChevronLeft } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid, ScatterChart, Scatter, ZAxis, PieChart, Pie, Legend } from 'recharts';
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
  
  // Refresh DB count and history when modal opens
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

  const handleManualSave = () => {
      onForceSave();
      setTimeout(() => {
          refreshData();
      }, 500);
  };

  if (!isOpen) return null;

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
    let emptyStationsCount = 0;
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

      if (bikes === 0) emptyStationsCount++;
      if (slots === 0) fullStationsCount++;

      if (bikes === 0) availabilityBins[0].count++;
      else if (bikes <= 5) availabilityBins[1].count++;
      else if (bikes <= 15) availabilityBins[2].count++;
      else availabilityBins[3].count++;

      // Downsample for scatter
      if (Math.random() > 0.5) {
          scatterData.push({
              x: bikes + s.empty_slots,
              y: bikes,
              name: s.name
          });
      }
    });

    const totalMechanical = Math.max(0, totalBikes - totalEbikes);
    const totalCapacity = totalBikes + totalSlots;
    const occupancyRate = totalCapacity > 0 ? (totalBikes / totalCapacity) * 100 : 0;

    // Status Pie Data
    const statusData = [
        { name: 'Operatives', value: activeStations, color: '#22c55e' },
        { name: 'Fora de Servei', value: offlineStationsCount, color: '#64748b' },
    ];

    // 2. Rankings
    const sortedByBikes = [...stations].sort((a, b) => b.free_bikes - a.free_bikes);
    const top5Bikes = sortedByBikes.slice(0, 5).map(s => ({ name: s.name.split('-')[1]?.trim() || s.name, value: s.free_bikes }));

    const sortedBySlots = [...stations].sort((a, b) => b.empty_slots - a.empty_slots);
    const top5Slots = sortedBySlots.slice(0, 5).map(s => ({ name: s.name.split('-')[1]?.trim() || s.name, value: s.empty_slots }));
    
    return { 
        availabilityBins, 
        totalBikes, 
        totalEbikes, 
        totalMechanical, 
        top5Bikes, 
        top5Slots, 
        scatterData, 
        occupancyRate, 
        statusData, 
        fullStationsCount,
        offlineStationsCount,
    };
  }, [stations]);

  return (
    <div className="fixed inset-0 z-[5000] flex items-end md:items-center justify-center bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white w-full h-[100dvh] md:h-auto md:max-h-[90vh] md:max-w-5xl md:rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-4 md:p-6 border-b border-slate-100 bg-white z-10 shrink-0 safe-area-top">
          <div className="flex flex-col gap-1 w-full">
            <div className="flex items-center gap-2">
                 <button onClick={onClose} className="md:hidden p-1 -ml-2 text-slate-500">
                     <ChevronLeft size={24} />
                 </button>
                 <h2 className="text-xl md:text-2xl font-black text-slate-800 flex items-center gap-2">
                    <Database className="text-blue-600" /> Estadístiques
                </h2>
            </div>
            
            <div className="flex gap-4 mt-2 overflow-x-auto no-scrollbar">
                 <button 
                    onClick={() => setActiveTab('overview')}
                    className={`text-sm font-bold pb-1 border-b-2 transition-colors whitespace-nowrap ${activeTab === 'overview' ? 'text-blue-600 border-blue-600' : 'text-slate-400 border-transparent hover:text-slate-600'}`}
                 >
                     Gràfiques
                 </button>
                 <button 
                    onClick={() => setActiveTab('log')}
                    className={`text-sm font-bold pb-1 border-b-2 transition-colors flex items-center gap-1 whitespace-nowrap ${activeTab === 'log' ? 'text-blue-600 border-blue-600' : 'text-slate-400 border-transparent hover:text-slate-600'}`}
                 >
                     💾 Registre de Dades ({recordCount})
                 </button>
            </div>
          </div>
          <button onClick={onClose} className="hidden md:block p-2 hover:bg-slate-100 rounded-full transition-colors self-start">
            <X size={24} className="text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 md:p-6 space-y-6 overflow-y-auto flex-1 bg-slate-50">
          
          {/* Main Action Bar */}
          <div className="bg-slate-900 text-white p-4 rounded-xl shadow-lg flex flex-col md:flex-row justify-between items-center gap-4">
               <div className="flex items-center gap-3 w-full md:w-auto">
                   <div className="p-2 bg-slate-800 rounded-lg">
                       <Database className="text-emerald-400" size={24} />
                   </div>
                   <div className="flex-1">
                       <div className="font-bold text-sm">Base de Dades Local</div>
                       <div className="text-xs text-slate-400">Guarda l'històric al navegador.</div>
                   </div>
               </div>
               <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                   <button 
                     onClick={handleManualSave}
                     className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg font-bold transition-all active:scale-95 text-xs whitespace-nowrap"
                   >
                       <Save size={16} /> Capturar
                   </button>
                   <button 
                     onClick={downloadCSV}
                     className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold transition-all active:scale-95 text-xs whitespace-nowrap"
                   >
                       <FileSpreadsheet size={16} /> CSV
                   </button>
                   <button 
                     onClick={handleClearDB}
                     className="flex-none flex items-center justify-center gap-2 bg-slate-800 hover:bg-red-900 text-slate-300 px-3 py-2 rounded-lg font-bold transition-all text-xs"
                     title="Esborrar tot"
                   >
                       <Trash2 size={16} />
                   </button>
               </div>
          </div>

          {activeTab === 'log' ? (
              <div className="animate-in fade-in slide-in-from-bottom-2">
                  <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                      <Table size={18} /> Registre de Captures (Últimes 50)
                  </h3>
                  <div className="border rounded-xl overflow-hidden shadow-sm bg-white">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-slate-600 min-w-[600px]">
                            <thead className="text-xs text-slate-700 uppercase bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3">Data</th>
                                    <th className="px-6 py-3">Estacions</th>
                                    <th className="px-6 py-3">Bicis</th>
                                    <th className="px-6 py-3">Espais</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                                            Encara no hi ha dades. Prem "Capturar".
                                        </td>
                                    </tr>
                                ) : (
                                    history.map((row) => {
                                        const totalBikes = row.stations.reduce((acc, s) => acc + s.free_bikes, 0);
                                        const totalSlots = row.stations.reduce((acc, s) => acc + s.empty_slots, 0);
                                        
                                        return (
                                            <tr key={row.timestamp} className="bg-white border-b hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4 font-mono whitespace-nowrap">
                                                    {new Date(row.timestamp).toLocaleString()}
                                                </td>
                                                <td className="px-6 py-4">{row.stations.length}</td>
                                                <td className="px-6 py-4 font-bold text-blue-600">{totalBikes}</td>
                                                <td className="px-6 py-4 font-bold text-slate-600">{totalSlots}</td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                      </div>
                  </div>
              </div>
          ) : (
            <>
                {/* Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                    <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                        <div className="text-slate-500 font-bold mb-1 text-[10px] md:text-xs uppercase flex items-center gap-1"><Database size={12}/> Flota</div>
                        <div className="text-xl md:text-2xl font-black text-slate-900">{stats.totalBikes}</div>
                        <div className="text-[10px] text-slate-400 font-bold mt-1">
                             <span className="text-blue-600">{stats.totalEbikes} elèc</span>
                        </div>
                    </div>
                    <div className="p-4 bg-white rounded-xl border border-indigo-100 shadow-sm relative overflow-hidden">
                        <div className="absolute top-0 left-0 h-1 bg-indigo-500" style={{ width: `${stats.occupancyRate}%` }}></div>
                        <div className="text-indigo-800 font-bold mb-1 text-[10px] md:text-xs uppercase flex items-center gap-1"><Activity size={12}/> Saturació</div>
                        <div className="text-xl md:text-2xl font-black text-indigo-900">{stats.occupancyRate.toFixed(1)}%</div>
                    </div>
                    <div className="p-4 bg-white rounded-xl border border-red-100 shadow-sm">
                        <div className="text-red-800 font-bold mb-1 text-[10px] md:text-xs uppercase flex items-center gap-1"><Ban size={12}/> Plenes</div>
                        <div className="text-xl md:text-2xl font-black text-red-900">{stats.fullStationsCount}</div>
                    </div>
                    <div className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm">
                         <div className="text-gray-600 font-bold mb-1 text-[10px] md:text-xs uppercase flex items-center gap-1"><ServerOff size={12}/> Offline</div>
                        <div className="text-xl md:text-2xl font-black text-gray-800">{stats.offlineStationsCount}</div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 pb-10">
                    
                    {/* Status Breakdown Pie */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                        <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                            <Signal size={18} className="text-blue-500" /> Salut de la Xarxa
                        </h3>
                        <div className="h-56 flex items-center">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={stats.statusData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={60}
                                        outerRadius={80}
                                        paddingAngle={5}
                                        dataKey="value"
                                    >
                                        {stats.statusData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                        ))}
                                    </Pie>
                                    <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                                    <Legend verticalAlign="middle" align="right" layout="vertical" iconType="circle" />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Availability Histogram */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                        <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                            <AlertTriangle size={18} className="text-amber-500" /> Disponibilitat
                        </h3>
                        <div className="h-56">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={stats.availabilityBins}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" fontSize={10} tickLine={false} axisLine={false} />
                                <YAxis fontSize={10} tickLine={false} axisLine={false} />
                                <Tooltip 
                                    cursor={{fill: 'rgba(0,0,0,0.05)'}}
                                    contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                                />
                                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                    {stats.availabilityBins.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>

                    {/* Top Stations List */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col lg:col-span-2">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-slate-700 flex items-center gap-2">
                                <TrendingUp size={18} className="text-purple-500" /> Rànquing TOP 5
                            </h3>
                            <div className="flex bg-slate-100 rounded-lg p-1">
                                <button 
                                    onClick={() => setRankTab('bikes')}
                                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${rankTab === 'bikes' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}
                                >
                                    Bicis
                                </button>
                                <button 
                                    onClick={() => setRankTab('slots')}
                                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${rankTab === 'slots' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}
                                >
                                    Parking
                                </button>
                            </div>
                        </div>
                        
                        <div className="space-y-3 flex-1">
                            {(rankTab === 'bikes' ? stats.top5Bikes : stats.top5Slots).map((st, i) => (
                                <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                    <div className="flex items-center gap-3 overflow-hidden">
                                        <span className="w-6 h-6 shrink-0 flex items-center justify-center bg-slate-200 text-slate-600 font-bold text-xs rounded-full">
                                            {i + 1}
                                        </span>
                                        <span className="text-sm font-medium text-slate-700 truncate">{st.name}</span>
                                    </div>
                                    <span className={`text-sm font-black whitespace-nowrap ml-2 ${rankTab === 'bikes' ? 'text-blue-600' : 'text-slate-600'}`}>
                                        {st.value} {rankTab === 'bikes' ? 'bicis' : 'llocs'}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
};

export default StatsModal;