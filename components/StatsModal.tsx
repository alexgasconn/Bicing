import React, { useMemo, useState, useEffect } from 'react';
import { Station } from '../types';
import { X, BarChart3, TrendingUp, AlertTriangle, Activity, Database, BatteryCharging, Ban, CheckCircle, Download, Trash2, FileSpreadsheet, Save, Table, Clock, ServerOff, Signal } from 'lucide-react';
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
      // Wait a bit for DB to update then refresh count
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
    let fullStationsCount = 0; // 0 slots
    
    // Scatter data: Capacity vs Free Bikes
    const scatterData = [] as any[];

    stations.forEach(s => {
      const bikes = s.free_bikes;
      const slots = s.empty_slots;
      totalBikes += bikes;
      totalEbikes += (s.extra?.ebikes || 0);
      totalSlots += slots;

      // Check online status. Sometimes API sends "status": "IN_SERVICE" or "CLOSED"
      // Or extra.online boolean.
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

      // Downsample for scatter to avoid performance hit if many stations
      if (Math.random() > 0.5) {
          scatterData.push({
              x: bikes + s.empty_slots, // Capacity
              y: bikes, // Free bikes
              name: s.name
          });
      }
    });

    const totalMechanical = Math.max(0, totalBikes - totalEbikes);
    const totalCapacity = totalBikes + totalSlots;
    const occupancyRate = totalCapacity > 0 ? (totalBikes / totalCapacity) * 100 : 0;
    const ebikePercentage = totalBikes > 0 ? (totalEbikes / totalBikes) * 100 : 0;

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
        emptyStationsCount, 
        fullStationsCount,
        offlineStationsCount,
        activeStations,
        ebikePercentage
    };
  }, [stations]);

  return (
    <div className="fixed inset-0 z-[5000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-y-auto flex flex-col">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-slate-100 sticky top-0 bg-white z-10">
          <div>
            <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
              <Database className="text-blue-600" /> Dades i Estadístiques
            </h2>
            <div className="flex gap-4 mt-2">
                 <button 
                    onClick={() => setActiveTab('overview')}
                    className={`text-sm font-bold pb-1 border-b-2 transition-colors ${activeTab === 'overview' ? 'text-blue-600 border-blue-600' : 'text-slate-400 border-transparent hover:text-slate-600'}`}
                 >
                     Gràfiques
                 </button>
                 <button 
                    onClick={() => setActiveTab('log')}
                    className={`text-sm font-bold pb-1 border-b-2 transition-colors flex items-center gap-1 ${activeTab === 'log' ? 'text-blue-600 border-blue-600' : 'text-slate-400 border-transparent hover:text-slate-600'}`}
                 >
                     💾 Registre de Dades ({recordCount})
                 </button>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
            <X size={24} className="text-slate-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8">
          
          {/* Main Action Bar */}
          <div className="bg-slate-900 text-white p-4 rounded-xl shadow-lg flex flex-col md:flex-row justify-between items-center gap-4">
               <div className="flex items-center gap-3">
                   <div className="p-2 bg-slate-800 rounded-lg">
                       <Database className="text-emerald-400" size={24} />
                   </div>
                   <div>
                       <div className="font-bold text-sm">Estat de la Base de Dades</div>
                       <div className="text-xs text-slate-400">Guardant automàticament cada 5 min (append).</div>
                   </div>
               </div>
               <div className="flex gap-2">
                   <button 
                     onClick={handleManualSave}
                     className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 rounded-lg font-bold transition-all active:scale-95 text-xs"
                   >
                       <Save size={16} /> Capturar (Append)
                   </button>
                   <button 
                     onClick={downloadCSV}
                     className="flex items-center gap-2 bg-emerald-500 hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold transition-all active:scale-95 text-xs"
                   >
                       <FileSpreadsheet size={16} /> Baixar CSV ({recordCount})
                   </button>
                   <button 
                     onClick={handleClearDB}
                     className="flex items-center gap-2 bg-slate-800 hover:bg-red-900 text-slate-300 px-3 py-2 rounded-lg font-bold transition-all text-xs"
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
                  <div className="border rounded-xl overflow-hidden shadow-sm">
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-slate-600">
                            <thead className="text-xs text-slate-700 uppercase bg-slate-50">
                                <tr>
                                    <th className="px-6 py-3">Data i Hora</th>
                                    <th className="px-6 py-3">Estacions Registrades</th>
                                    <th className="px-6 py-3">Total Bicis Lliures</th>
                                    <th className="px-6 py-3">Total Espais Buits</th>
                                    <th className="px-6 py-3">Estat</th>
                                </tr>
                            </thead>
                            <tbody>
                                {history.length === 0 ? (
                                    <tr>
                                        <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                                            Encara no hi ha dades registrades. Prem "Capturar" per començar.
                                        </td>
                                    </tr>
                                ) : (
                                    history.map((row) => {
                                        const totalBikes = row.stations.reduce((acc, s) => acc + s.free_bikes, 0);
                                        const totalSlots = row.stations.reduce((acc, s) => acc + s.empty_slots, 0);
                                        
                                        return (
                                            <tr key={row.timestamp} className="bg-white border-b hover:bg-slate-50 transition-colors">
                                                <td className="px-6 py-4 font-mono">
                                                    <div className="flex items-center gap-2">
                                                        <Clock size={14} className="text-slate-400" />
                                                        {new Date(row.timestamp).toLocaleString()}
                                                    </div>
                                                </td>
                                                <td className="px-6 py-4">{row.stations.length}</td>
                                                <td className="px-6 py-4 font-bold text-blue-600">{totalBikes}</td>
                                                <td className="px-6 py-4 font-bold text-slate-600">{totalSlots}</td>
                                                <td className="px-6 py-4">
                                                    <span className="bg-green-100 text-green-800 text-xs px-2 py-0.5 rounded-full font-bold">
                                                        Guardat
                                                    </span>
                                                </td>
                                            </tr>
                                        );
                                    })
                                )}
                            </tbody>
                        </table>
                      </div>
                  </div>
                  <p className="text-xs text-slate-400 mt-2 text-center">
                      * Aquesta taula mostra un resum. El fitxer CSV descarregat conté el detall de les {stations.length} estacions per cada fila.
                  </p>
              </div>
          ) : (
            <>
                {/* Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="text-slate-500 font-bold mb-1 text-xs uppercase flex items-center gap-1"><Database size={12}/> Total Flota</div>
                        <div className="text-2xl font-black text-slate-900">{stats.totalBikes}</div>
                        <div className="text-[10px] text-slate-400 font-bold mt-1">
                             <span className="text-blue-600">{stats.totalEbikes} elèc</span> / <span className="text-red-600">{stats.totalMechanical} mec</span>
                        </div>
                    </div>
                    <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                        <div className="text-indigo-800 font-bold mb-1 text-xs uppercase flex items-center gap-1"><Activity size={12}/> Saturació</div>
                        <div className="text-2xl font-black text-indigo-900">{stats.occupancyRate.toFixed(1)}%</div>
                        <div className="w-full bg-indigo-200 h-1.5 rounded-full mt-2">
                             <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${stats.occupancyRate}%` }}></div>
                        </div>
                    </div>
                    <div className="p-4 bg-red-50 rounded-xl border border-red-100">
                        <div className="text-red-800 font-bold mb-1 text-xs uppercase flex items-center gap-1"><Ban size={12}/> Estacions Plenes</div>
                        <div className="text-2xl font-black text-red-900">{stats.fullStationsCount}</div>
                        <div className="text-[10px] text-red-600 font-bold">Impossible aparcar</div>
                    </div>
                    <div className="p-4 bg-gray-100 rounded-xl border border-gray-200">
                         <div className="text-gray-600 font-bold mb-1 text-xs uppercase flex items-center gap-1"><ServerOff size={12}/> Fora de Servei</div>
                        <div className="text-2xl font-black text-gray-800">{stats.offlineStationsCount}</div>
                        <div className="text-[10px] text-gray-500 font-bold">Manteniment / Error</div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    
                    {/* Status Breakdown Pie */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                        <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2">
                            <Signal size={18} className="text-blue-500" /> Salut de la Xarxa
                        </h3>
                        <div className="h-64 flex items-center">
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
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                    <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2">
                        <AlertTriangle size={18} className="text-amber-500" /> Distribució de Disponibilitat
                    </h3>
                    <div className="h-64">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={stats.availabilityBins}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} />
                            <YAxis fontSize={12} tickLine={false} axisLine={false} />
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
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Top Stations List */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="font-bold text-slate-700 flex items-center gap-2">
                            <TrendingUp size={18} className="text-purple-500" /> Rànquing Estacions
                        </h3>
                        <div className="flex bg-slate-100 rounded-lg p-1">
                            <button 
                                onClick={() => setRankTab('bikes')}
                                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${rankTab === 'bikes' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}
                            >
                                Més Bicis
                            </button>
                            <button 
                                onClick={() => setRankTab('slots')}
                                className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${rankTab === 'slots' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}
                            >
                                Més Aparcament
                            </button>
                        </div>
                    </div>
                    
                    <div className="space-y-3 flex-1">
                        {(rankTab === 'bikes' ? stats.top5Bikes : stats.top5Slots).map((st, i) => (
                            <div key={i} className="flex items-center justify-between p-3 bg-slate-50 rounded-lg">
                                <div className="flex items-center gap-3">
                                    <span className="w-6 h-6 flex items-center justify-center bg-slate-200 text-slate-600 font-bold text-xs rounded-full">
                                        {i + 1}
                                    </span>
                                    <span className="text-sm font-medium text-slate-700 truncate max-w-[200px]">{st.name}</span>
                                </div>
                                <span className={`text-sm font-black ${rankTab === 'bikes' ? 'text-blue-600' : 'text-slate-600'}`}>
                                    {st.value} {rankTab === 'bikes' ? 'bicis' : 'llocs'}
                                </span>
                            </div>
                        ))}
                    </div>
                    </div>

                    {/* Scatter Plot */}
                    <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm">
                        <h3 className="font-bold text-slate-700 mb-6 flex items-center gap-2">
                            <Activity size={18} className="text-indigo-500" /> Capacitat vs. Ús Real
                        </h3>
                        <div className="h-64">
                            <ResponsiveContainer width="100%" height="100%">
                            <ScatterChart margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis type="number" dataKey="x" name="Capacitat" unit=" slots" fontSize={10} />
                                <YAxis type="number" dataKey="y" name="Bicis" unit=" ut." fontSize={10} />
                                <ZAxis type="number" range={[50, 50]} />
                                <Tooltip cursor={{ strokeDasharray: '3 3' }} contentStyle={{ borderRadius: '8px' }} />
                                <Scatter name="Estacions" data={stats.scatterData} fill="#8884d8" opacity={0.6} />
                            </ScatterChart>
                            </ResponsiveContainer>
                        </div>
                        <p className="text-xs text-slate-400 mt-2 text-center">Mostra aleatòria del 50% d'estacions.</p>
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