import React, { useMemo, useState, useEffect } from 'react';
import { Station } from '../types';
import { X, TrendingUp, Database, Signal, ChevronLeft, ScatterChart as ScatterIcon, LineChart, Download, Repeat, Zap, Bike } from 'lucide-react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell, CartesianGrid, ScatterChart, Scatter, PieChart, Pie, Legend, BarChart, Bar } from 'recharts';
import { downloadCSV, getSnapshotCount, getHistory, Snapshot } from '../services/db';

interface StatsModalProps {
  isOpen: boolean;
  onClose: () => void;
  stations: Station[];
  onForceSave: () => void;
}

const StatsModal: React.FC<StatsModalProps> = ({ isOpen, onClose, stations, onForceSave }) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'log'>('overview');
  const [rankTab, setRankTab] = useState<'bikes' | 'slots' | 'activity'>('bikes');
  const [recordCount, setRecordCount] = useState<number>(0);
  const [history, setHistory] = useState<Snapshot[]>([]);
  
  useEffect(() => {
      if (isOpen) {
          refreshData();
      }
  }, [isOpen]);

  const refreshData = () => {
      getSnapshotCount().then(setRecordCount);
      getHistory(150).then(setHistory);
  };

  const networkActivity = useMemo(() => {
      if (history.length < 2) return [];

      const hourlyFlow = new Array(24).fill(0).map((_, i) => ({ 
          hour: `${i.toString().padStart(2, '0')}:00`, 
          totalMoves: 0, 
          count: 0 
      }));

      for (let i = 1; i < history.length; i++) {
          const prev = history[i-1];
          const curr = history[i];
          const d = new Date(curr.timestamp);
          const h = d.getHours();

          let snapshotMoves = 0;
          curr.stations.forEach(currSt => {
              const prevSt = prev.stations.find(ps => ps.id === currSt.id);
              if (prevSt) {
                  snapshotMoves += Math.abs(currSt.free_bikes - prevSt.free_bikes);
              }
          });

          hourlyFlow[h].totalMoves += snapshotMoves;
          hourlyFlow[h].count++;
      }

      return hourlyFlow.map(f => ({
          hour: f.hour,
          activity: f.count > 0 ? parseFloat((f.totalMoves / f.count).toFixed(1)) : 0
      }));
  }, [history]);

  const stats = useMemo(() => {
    let totalBikes = 0;
    let totalEbikes = 0;
    let totalSlots = 0;
    let activeStations = 0;
    let offlineStationsCount = 0;
    let fullStationsCount = 0; 
    const scatterData = [] as any[];

    stations.forEach(s => {
      const bikes = s.free_bikes;
      const slots = s.empty_slots;
      totalBikes += bikes;
      totalEbikes += (s.extra?.ebikes || 0);
      totalSlots += slots;
      if (s.extra?.online !== false && s.extra?.status !== 'CLOSED') activeStations++;
      else offlineStationsCount++;
      if (slots === 0) fullStationsCount++;

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

    const top5Bikes = [...stations].sort((a, b) => b.free_bikes - a.free_bikes).slice(0, 5).map(s => ({ name: s.name.split('-')[1]?.trim() || s.name, value: s.free_bikes }));
    const top5Slots = [...stations].sort((a, b) => b.empty_slots - a.empty_slots).slice(0, 5).map(s => ({ name: s.name.split('-')[1]?.trim() || s.name, value: s.empty_slots }));
    
    return { totalBikes, totalEbikes, top5Bikes, top5Slots, scatterData, occupancyRate, fullStationsCount, offlineStationsCount, activeStations };
  }, [stations]);

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
                        <Database className="text-blue-600" /> Estadístiques Globals
                    </h2>
                 </div>
                 <div className="flex items-center gap-2">
                     <button onClick={downloadCSV} className="bg-slate-100 hover:bg-slate-200 text-slate-700 p-2 rounded-lg flex items-center gap-2 text-xs font-bold transition-colors border border-slate-200">
                        <Download size={16} /> <span className="hidden md:inline">CSV</span>
                     </button>
                     <button onClick={onClose} className="hidden md:block p-2 hover:bg-slate-100 rounded-full transition-colors"><X size={24} className="text-slate-500" /></button>
                 </div>
            </div>
            <div className="flex gap-4 mt-2">
                 <button onClick={() => setActiveTab('overview')} className={`text-sm font-bold pb-1 border-b-2 transition-colors ${activeTab === 'overview' ? 'text-blue-600 border-blue-600' : 'text-slate-400 border-transparent'}`}>Gràfiques</button>
                 <button onClick={() => setActiveTab('log')} className={`text-sm font-bold pb-1 border-b-2 transition-colors ${activeTab === 'log' ? 'text-blue-600 border-blue-600' : 'text-slate-400 border-transparent'}`}>Registre ({recordCount})</button>
            </div>
          </div>
        </div>

        <div className="p-4 md:p-6 space-y-6 overflow-y-auto flex-1 bg-slate-50">
          {activeTab === 'overview' ? (
            <>
                {/* Summary Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                    <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                        <div className="text-slate-500 font-bold mb-1 text-[10px] uppercase flex items-center gap-1"><Bike size={12}/> Flota Total</div>
                        <div className="text-2xl font-black text-slate-900">{stats.totalBikes}</div>
                        <div className="text-xs text-blue-600 font-bold">{stats.totalEbikes} elèctriques</div>
                    </div>
                    <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                        <div className="text-slate-500 font-bold mb-1 text-[10px] uppercase">Ocupació</div>
                        <div className="text-2xl font-black text-indigo-900">{stats.occupancyRate.toFixed(1)}%</div>
                    </div>
                    <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                        <div className="text-slate-500 font-bold mb-1 text-[10px] uppercase flex items-center gap-1"><Repeat size={12}/> Activitat Recenta</div>
                        <div className="text-2xl font-black text-green-600">{networkActivity.length > 0 ? networkActivity[new Date().getHours()].activity : '--'}</div>
                        <div className="text-[10px] text-slate-400">Canvis/Hora ara mateix</div>
                    </div>
                    <div className="p-4 bg-white rounded-xl border border-slate-100 shadow-sm">
                        <div className="text-slate-500 font-bold mb-1 text-[10px] uppercase">Estacions Off</div>
                        <div className="text-2xl font-black text-slate-400">{stats.offlineStationsCount}</div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* NEW: Network Activity Profile (24h Movements) */}
                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm lg:col-span-2">
                        <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                            <Repeat size={18} className="text-green-500" /> Perfil d'Activitat de la Xarxa (Entrades + Sortides)
                        </h3>
                        <div className="h-64">
                             {networkActivity.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={networkActivity}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                        <XAxis dataKey="hour" style={{fontSize: '10px'}} interval={1} />
                                        <YAxis style={{fontSize: '10px'}} />
                                        <Tooltip />
                                        <Bar dataKey="activity" name="Bicis mogudes/hora" fill="#22c55e" radius={[4, 4, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                             ) : (
                                <div className="h-full flex items-center justify-center text-slate-400">Carregant flux horari...</div>
                             )}
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                        <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                            <ScatterIcon size={18} className="text-purple-500" /> Distribució de la Flota
                        </h3>
                        <div className="h-48">
                             <ResponsiveContainer width="100%" height="100%">
                                <ScatterChart margin={{ top: 10, right: 10, bottom: 10, left: 10 }}>
                                    <CartesianGrid />
                                    <XAxis type="number" dataKey="capacity" name="Capacitat" style={{fontSize: '10px'}} />
                                    <YAxis type="number" dataKey="bikes" name="Bicis" style={{fontSize: '10px'}} />
                                    <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                                    <Scatter data={stats.scatterData} fill="#8884d8" />
                                </ScatterChart>
                             </ResponsiveContainer>
                        </div>
                    </div>

                    <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
                        <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                            <TrendingUp size={18} className="text-orange-500" /> Rànquings d'Estat
                        </h3>
                        <div className="flex bg-slate-100 rounded-lg p-1 mb-4">
                            <button onClick={() => setRankTab('bikes')} className={`flex-1 py-1 text-xs font-bold rounded ${rankTab === 'bikes' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>Bicis</button>
                            <button onClick={() => setRankTab('slots')} className={`flex-1 py-1 text-xs font-bold rounded ${rankTab === 'slots' ? 'bg-white shadow text-slate-800' : 'text-slate-500'}`}>Llocs</button>
                        </div>
                        <div className="space-y-2">
                            {(rankTab === 'bikes' ? stats.top5Bikes : stats.top5Slots).map((st, i) => (
                                <div key={i} className="flex justify-between p-2 bg-slate-50 rounded">
                                    <span className="text-xs font-medium text-slate-700 truncate">{i+1}. {st.name}</span>
                                    <span className="font-bold text-blue-600 text-xs">{st.value}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                 <table className="w-full text-xs text-left text-slate-600">
                    <thead className="bg-slate-50 border-b">
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