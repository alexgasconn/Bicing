import React, { useEffect, useState } from 'react';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Station } from '../types';
import { predictStationAvailability, PredictionPoint } from '../services/predictionService';
import { TrendingUp, AlertCircle, Loader2 } from 'lucide-react';

interface StationPredictionProps {
    station: Station;
}

const StationPrediction: React.FC<StationPredictionProps> = ({ station }) => {
    const [data, setData] = useState<PredictionPoint[]>([]);
    const [loading, setLoading] = useState(true);
    const [hasEnoughData, setHasEnoughData] = useState(true);

    useEffect(() => {
        let mounted = true;
        setLoading(true);

        predictStationAvailability(station).then(predictions => {
            if (mounted) {
                if (predictions.length === 0) {
                    setHasEnoughData(false);
                } else {
                    setData(predictions);
                    setHasEnoughData(true);
                }
                setLoading(false);
            }
        });

        return () => { mounted = false; };
    }, [station]);

    if (loading) {
        return (
            <div className="h-32 flex items-center justify-center text-slate-400 gap-2">
                <Loader2 className="animate-spin" size={16} /> Calculant tendència...
            </div>
        );
    }

    if (!hasEnoughData) {
        return (
            <div className="h-32 bg-slate-50 rounded-lg flex flex-col items-center justify-center text-slate-400 p-4 text-center">
                <AlertCircle size={20} className="mb-2" />
                <span className="text-xs">
                    No hi ha prou dades històriques per predir la disponibilitat d'aquesta estació.
                </span>
            </div>
        );
    }

    const trend = data[data.length - 1].bikes - data[0].bikes;
    const trendText = trend > 2 ? "Pujarà" : trend < -2 ? "Baixarà" : "Estable";
    const trendColor = trend > 2 ? "text-green-600" : trend < -2 ? "text-red-600" : "text-slate-600";

    return (
        <div className="mt-3 bg-slate-50 rounded-xl p-3 border border-slate-100">
            <div className="flex justify-between items-center mb-2">
                <h4 className="text-xs font-bold text-slate-700 flex items-center gap-1">
                    <TrendingUp size={12} /> Previsió (3h)
                </h4>
                <span className={`text-[10px] font-bold ${trendColor}`}>{trendText}</span>
            </div>

            <div className="h-32 w-full">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorBikes" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#ef4444" stopOpacity={0.3}/>
                                <stop offset="95%" stopColor="#ef4444" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                        <XAxis 
                            dataKey="time" 
                            fontSize={10} 
                            tickLine={false} 
                            axisLine={false} 
                            interval={3} // Show fewer ticks for 3h range
                        />
                        <YAxis 
                            fontSize={10} 
                            tickLine={false} 
                            axisLine={false} 
                            domain={[0, 'auto']} 
                        />
                        <Tooltip 
                            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)', fontSize: '12px' }}
                        />
                        <Area 
                            type="monotone" 
                            dataKey="confidenceHigh" 
                            stroke="none" 
                            fill="#cbd5e1" 
                            fillOpacity={0.2} 
                        />
                         <Area 
                            type="monotone" 
                            dataKey="bikes" 
                            stroke="#ef4444" 
                            strokeWidth={2}
                            fillOpacity={1} 
                            fill="url(#colorBikes)" 
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
            <p className="text-[9px] text-center text-slate-400 mt-1">
                *Predicció basada en dades històriques. Zona gris = marge d'error.
            </p>
        </div>
    );
};

export default StationPrediction;