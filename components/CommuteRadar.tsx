import React, { useMemo } from 'react';
import { Station, RadarPoint, RadarSelectionMode } from '../types';
import { findNearestStations } from '../services/bicingService';
import { Navigation, Clock, Activity, ArrowRight, Ban, CheckCircle, AlertTriangle, Mountain, X, ChevronDown } from 'lucide-react';

interface CommuteRadarProps {
  isOpen: boolean;
  onClose: () => void;
  stations: Station[];
  origin: RadarPoint | null;
  destination: RadarPoint | null;
  selectionMode: RadarSelectionMode;
  setSelectionMode: (mode: RadarSelectionMode) => void;
}

const CommuteRadar: React.FC<CommuteRadarProps> = ({
  isOpen,
  onClose,
  stations,
  origin,
  destination,
  selectionMode,
  setSelectionMode
}) => {
  if (!isOpen) return null;

  // Analysis Logic
  const analysis = useMemo(() => {
    if (!origin || !destination) return null;

    // 1. Calculate Distance (Haversine)
    const R = 6371e3; // metres
    const φ1 = origin.lat * Math.PI/180;
    const φ2 = destination.lat * Math.PI/180;
    const Δφ = (destination.lat-origin.lat) * Math.PI/180;
    const Δλ = (destination.lng-origin.lng) * Math.PI/180;
    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distanceMeters = R * c;
    const distanceKm = distanceMeters / 1000;

    // 2. Estimate Time (Avg cycling speed in city: 14km/h + 2 min overhead)
    const timeHours = distanceKm / 14;
    const timeMinutes = Math.round((timeHours * 60) + 2);

    // 3. Find Nearest Stations
    const startStation = findNearestStations(origin.lat, origin.lng, stations, 1)[0];
    const endStation = findNearestStations(destination.lat, destination.lng, stations, 1)[0];

    // 4. Fake Elevation (Heuristic based on distance for demo purposes)
    const estimatedElevationGain = Math.round(distanceKm * 15 + (Math.random() * 10)); 

    // 5. Determine Status
    let status: 'green' | 'yellow' | 'red' = 'green';
    let message = "Trajecte viable. Bon viatge!";

    if (!startStation || !endStation) {
        status = 'red';
        message = "No hi ha estacions properes.";
    } else {
        const bikes = startStation.free_bikes;
        const slots = endStation.empty_slots;

        if (bikes === 0 || slots === 0) {
            status = 'red';
            message = bikes === 0 ? "Sense bicis a l'origen!" : "Destí completament ple!";
        } else if (bikes < 3 || slots < 3) {
            status = 'yellow';
            message = "Disponibilitat justa.";
        }
    }

    return {
        distanceKm,
        timeMinutes,
        startStation,
        endStation,
        estimatedElevationGain,
        status,
        message
    };
  }, [origin, destination, stations]);

  return (
    <div className="absolute bottom-0 left-0 right-0 md:top-20 md:bottom-auto md:left-auto md:right-4 md:w-96 bg-white rounded-t-2xl md:rounded-2xl shadow-2xl z-[2000] overflow-hidden border border-slate-200 animate-in slide-in-from-bottom-4 md:slide-in-from-top-4 fade-in flex flex-col max-h-[70vh]">
        
        {/* Header */}
        <div className="bg-slate-900 text-white p-4 flex justify-between items-center shrink-0">
            <h2 className="font-bold flex items-center gap-2">
                <Activity className="text-blue-400" /> Radar de Trajecte
            </h2>
            <button onClick={onClose} className="hover:bg-white/20 p-1 rounded-full transition-colors">
                <ChevronDown size={20} className="md:hidden" />
                <X size={18} className="hidden md:block" />
            </button>
        </div>

        <div className="overflow-y-auto">
            {/* Inputs */}
            <div className="p-4 space-y-4 bg-slate-50 border-b border-slate-100">
                {/* Origin Input */}
                <div 
                    onClick={() => setSelectionMode('origin')}
                    className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between ${selectionMode === 'origin' ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white hover:border-blue-300'}`}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xs">
                            A
                        </div>
                        <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-500 uppercase">Origen</div>
                            <div className="text-sm font-bold text-slate-800 truncate max-w-[180px]">
                                {origin ? `Lat: ${origin.lat.toFixed(3)}, Lng: ${origin.lng.toFixed(3)}` : 'Toca al mapa...'}
                            </div>
                        </div>
                    </div>
                    {selectionMode === 'origin' && <div className="text-xs font-bold text-blue-600 animate-pulse whitespace-nowrap">Seleccionant...</div>}
                </div>

                {/* Destination Input */}
                <div 
                    onClick={() => setSelectionMode('destination')}
                    className={`p-3 rounded-xl border-2 cursor-pointer transition-all flex items-center justify-between ${selectionMode === 'destination' ? 'border-red-500 bg-red-50' : 'border-slate-200 bg-white hover:border-red-300'}`}
                >
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-red-100 text-red-600 flex items-center justify-center font-bold text-xs">
                            B
                        </div>
                        <div className="min-w-0">
                            <div className="text-xs font-bold text-slate-500 uppercase">Destí</div>
                            <div className="text-sm font-bold text-slate-800 truncate max-w-[180px]">
                                {destination ? `Lat: ${destination.lat.toFixed(3)}, Lng: ${destination.lng.toFixed(3)}` : 'Toca al mapa...'}
                            </div>
                        </div>
                    </div>
                    {selectionMode === 'destination' && <div className="text-xs font-bold text-red-600 animate-pulse whitespace-nowrap">Seleccionant...</div>}
                </div>
            </div>

            {/* Results Report */}
            {analysis ? (
                <div className="p-4 space-y-4 pb-8 md:pb-4">
                    {/* Status Banner */}
                    <div className={`p-3 rounded-lg flex items-center gap-3 ${
                        analysis.status === 'green' ? 'bg-green-100 text-green-800' : 
                        analysis.status === 'yellow' ? 'bg-yellow-100 text-yellow-800' : 'bg-red-100 text-red-800'
                    }`}>
                        {analysis.status === 'green' ? <CheckCircle size={24} className="shrink-0" /> : 
                        analysis.status === 'yellow' ? <AlertTriangle size={24} className="shrink-0" /> : <Ban size={24} className="shrink-0" />}
                        <div className="font-bold text-sm leading-tight">{analysis.message}</div>
                    </div>

                    {/* Mini Stats Grid */}
                    <div className="grid grid-cols-3 gap-2">
                        <div className="bg-slate-50 p-2 rounded-lg text-center border border-slate-100">
                            <Navigation size={16} className="mx-auto mb-1 text-slate-400" />
                            <div className="text-lg font-black text-slate-800">{analysis.distanceKm.toFixed(1)} <span className="text-[10px] font-normal text-slate-500">km</span></div>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-lg text-center border border-slate-100">
                            <Clock size={16} className="mx-auto mb-1 text-slate-400" />
                            <div className="text-lg font-black text-slate-800">{analysis.timeMinutes} <span className="text-[10px] font-normal text-slate-500">min</span></div>
                        </div>
                        <div className="bg-slate-50 p-2 rounded-lg text-center border border-slate-100">
                            <Mountain size={16} className="mx-auto mb-1 text-slate-400" />
                            <div className="text-lg font-black text-slate-800">~{analysis.estimatedElevationGain} <span className="text-[10px] font-normal text-slate-500">m</span></div>
                        </div>
                    </div>

                    {/* Stations Details */}
                    <div className="space-y-2 text-sm">
                        <div className="flex justify-between items-center p-2 bg-blue-50 rounded border border-blue-100">
                            <span className="font-bold text-blue-800 truncate mr-2">A: {analysis.startStation.name}</span>
                            <span className="font-black bg-white px-2 rounded text-blue-600 border border-blue-200 whitespace-nowrap">{analysis.startStation.free_bikes} Bicis</span>
                        </div>
                        <div className="flex justify-center">
                            <ArrowRight className="text-slate-300 rotate-90 md:rotate-0" />
                        </div>
                        <div className="flex justify-between items-center p-2 bg-red-50 rounded border border-red-100">
                            <span className="font-bold text-red-800 truncate mr-2">B: {analysis.endStation.name}</span>
                            <span className="font-black bg-white px-2 rounded text-red-600 border border-red-200 whitespace-nowrap">{analysis.endStation.empty_slots} Llocs</span>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="p-8 text-center text-slate-400 text-sm pb-12">
                    Selecciona els dos punts al mapa per calcular la ruta i disponibilitat.
                </div>
            )}
        </div>
    </div>
  );
};

export default CommuteRadar;