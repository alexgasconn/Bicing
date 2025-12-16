import React, { useState, useEffect } from 'react';
import { MapViewState, FilterCriteria, RadarPoint, RadarSelectionMode } from './types';
import { DEFAULT_CENTER, DEFAULT_ZOOM } from './constants';
import StationMap from './components/StationMap';
import Dashboard from './components/Dashboard';
import StatsModal from './components/StatsModal';
import FilterPanel from './components/FilterPanel';
import QuickFilters from './components/QuickFilters';
import CommuteRadar from './components/CommuteRadar';
import { Activity, Map as MapIcon, Crosshair } from 'lucide-react';

// Hooks
import { useStations } from './hooks/useStations';
import { useUserLocation } from './hooks/useUserLocation';
import { useStationFilters } from './hooks/useStationFilters';
import { useSniper } from './hooks/useSniper';
import { useDataRecorder } from './hooks/useDataRecorder';

const App: React.FC = () => {
  // 1. Data & Location Logic
  const { stations, lastUpdated } = useStations();
  const { userLocation, locateUser } = useUserLocation();
  const { sniperConfig, setSniper, clearSniper } = useSniper(stations);
  
  // Initialize Data Recorder (Runs automatically in background)
  const { forceSave } = useDataRecorder(stations);
  
  // 2. View State
  const [viewState, setViewState] = useState<MapViewState>({
    center: DEFAULT_CENTER,
    zoom: DEFAULT_ZOOM,
  });

  // 3. Filter State
  const [filterCriteria, setFilterCriteria] = useState<FilterCriteria>({ useUserLocation: true });
  const [quickState, setQuickState] = useState({ onlyElectric: false, hasBikes: false, hasSlots: false });

  // 4. Modal States
  const [isStatsOpen, setIsStatsOpen] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  
  // 5. Radar State
  const [isRadarOpen, setIsRadarOpen] = useState(false);
  const [radarOrigin, setRadarOrigin] = useState<RadarPoint | null>(null);
  const [radarDestination, setRadarDestination] = useState<RadarPoint | null>(null);
  const [radarSelectionMode, setRadarSelectionMode] = useState<RadarSelectionMode>('none');

  // 6. Layer State
  const [showBikeLanes, setShowBikeLanes] = useState(false);

  // 7. Favorites State
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('bicing_favorites');
    return saved ? JSON.parse(saved) : [];
  });

  // --- Logic Pipelines ---

  // Filter Stations using Custom Hook
  const filteredStations = useStationFilters(
      stations, 
      filterCriteria, 
      quickState, 
      viewState.center, 
      userLocation
  );

  // Auto-center map when user locates
  useEffect(() => {
      if (userLocation) {
          setViewState({ center: userLocation, zoom: 16 });
          // If Radar is waiting for Origin, auto-set it
          if (isRadarOpen && radarSelectionMode === 'origin') {
              setRadarOrigin({ lat: userLocation[0], lng: userLocation[1] });
              setRadarSelectionMode('destination');
          }
      }
  }, [userLocation]); // Intentionally sparse dependency array

  // --- Handlers ---

  const toggleFavorite = (stationId: string) => {
    setFavorites(prev => {
      const newFavs = prev.includes(stationId) 
        ? prev.filter(id => id !== stationId)
        : [...prev, stationId];
      localStorage.setItem('bicing_favorites', JSON.stringify(newFavs));
      return newFavs;
    });
  };

  const handleQuickToggle = (key: 'onlyElectric' | 'hasBikes' | 'hasSlots') => {
      setQuickState(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleMapClick = (lat: number, lng: number) => {
      if (radarSelectionMode === 'origin') {
          setRadarOrigin({ lat, lng });
          setRadarSelectionMode('destination');
      } else if (radarSelectionMode === 'destination') {
          setRadarDestination({ lat, lng });
          setRadarSelectionMode('none');
      }
  };

  const openRadar = () => {
      setIsRadarOpen(true);
      if (!radarOrigin && userLocation) {
          setRadarOrigin({ lat: userLocation[0], lng: userLocation[1] });
          setRadarSelectionMode('destination');
      } else if (!radarOrigin) {
          setRadarSelectionMode('origin');
      }
  };

  return (
    <div className="flex h-screen w-screen relative overflow-hidden bg-slate-100">
      {/* Map Area */}
      <div className="flex-1 relative h-full">
        <StationMap 
          stations={filteredStations} 
          viewState={viewState} 
          favorites={favorites}
          onToggleFavorite={toggleFavorite}
          filterRadius={filterCriteria.radius}
          userLocation={userLocation}
          radarOrigin={radarOrigin}
          radarDestination={radarDestination}
          selectionMode={radarSelectionMode}
          onMapClick={handleMapClick}
          showBikeLanes={showBikeLanes}
          onSetSniper={setSniper}
          activeSniper={sniperConfig}
        />
        
        {/* Overlay Dashboard */}
        {!isRadarOpen && (
            <Dashboard 
                stations={filteredStations} 
                totalStations={stations.length} 
                lastUpdated={lastUpdated}
                favorites={favorites}
                allStations={stations}
                onCenterStation={(lat, lng) => setViewState({ center: [lat, lng], zoom: 18 })}
                onOpenStats={() => setIsStatsOpen(true)}
                onLocateUser={locateUser}
                userLocation={userLocation}
            />
        )}

        {/* Action Buttons Container (Right Side) */}
        {!isRadarOpen && (
            <div className="absolute top-20 right-4 z-[1000] flex flex-col gap-3">
                {/* Radar Trigger */}
                <button 
                    onClick={openRadar}
                    className="bg-white p-3 rounded-full shadow-lg border border-slate-200 text-slate-700 hover:text-blue-600 transition-all active:scale-95"
                    title="Obrir Radar de Trajecte"
                >
                    <Activity size={24} />
                </button>

                {/* Bike Lane Toggle */}
                <button 
                    onClick={() => setShowBikeLanes(!showBikeLanes)}
                    className={`p-3 rounded-full shadow-lg border transition-all active:scale-95 ${showBikeLanes ? 'bg-emerald-500 text-white border-emerald-600' : 'bg-white text-slate-700 border-slate-200 hover:text-emerald-600'}`}
                    title="Mostrar Carrils Bici"
                >
                    <MapIcon size={24} />
                </button>
            </div>
        )}

        {/* Sniper Active Indicator */}
        {sniperConfig && !isRadarOpen && (
            <div className="absolute top-48 right-4 z-[1000] bg-pink-600 text-white p-2 rounded-lg shadow-xl animate-pulse flex flex-col items-center gap-1 cursor-pointer" onClick={clearSniper} title="Cancel·lar Alerta">
                <Crosshair size={20} />
                <span className="text-[10px] font-bold">ACTIU</span>
            </div>
        )}

        {/* Features & Modals */}
        {isRadarOpen && (
            <CommuteRadar 
                isOpen={isRadarOpen}
                onClose={() => setIsRadarOpen(false)}
                stations={stations}
                origin={radarOrigin}
                destination={radarDestination}
                selectionMode={radarSelectionMode}
                setSelectionMode={setRadarSelectionMode}
            />
        )}

        <QuickFilters 
            quickState={quickState}
            onToggle={handleQuickToggle}
            onOpenAdvanced={() => setIsFiltersOpen(true)}
        />

        {isStatsOpen && (
            <StatsModal 
                isOpen={isStatsOpen} 
                onClose={() => setIsStatsOpen(false)} 
                stations={filteredStations}
                onForceSave={forceSave} 
            />
        )}

        {isFiltersOpen && (
            <FilterPanel 
                isOpen={isFiltersOpen}
                onClose={() => setIsFiltersOpen(false)}
                criteria={filterCriteria}
                onCriteriaChange={setFilterCriteria}
                totalResults={filteredStations.length}
                userLocation={userLocation}
            />
        )}
      </div>
    </div>
  );
};

export default App;