import React, { useState, useEffect } from 'react';
import { MapViewState, FilterCriteria, RadarPoint, RadarSelectionMode } from './types';
import { DEFAULT_CENTER, DEFAULT_ZOOM } from './constants';
import StationMap from './components/StationMap';
import Dashboard from './components/Dashboard';
import StatsModal from './components/StatsModal';
import FilterPanel from './components/FilterPanel';
import QuickFilters from './components/QuickFilters';
import CommuteRadar from './components/CommuteRadar';
import { Activity, Crosshair } from 'lucide-react';
import { seedDatabaseFromCSV } from './services/db';

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
  
  // Initialize Data Recorder
  const { forceSave } = useDataRecorder(stations);

  // Initialize DB Seeding
  useEffect(() => {
    seedDatabaseFromCSV('/seed_data.csv').then((success) => {
        if (success) {
            console.log("Historical data loaded successfully.");
        }
    });
  }, []);
  
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

  // 6. Favorites State
  const [favorites, setFavorites] = useState<string[]>(() => {
    const saved = localStorage.getItem('bicing_favorites');
    return saved ? JSON.parse(saved) : [];
  });

  // --- Logic Pipelines ---

  const filteredStations = useStationFilters(
      stations, 
      filterCriteria, 
      quickState, 
      viewState.center, 
      userLocation
  );

  useEffect(() => {
      const isValid = Array.isArray(userLocation) && 
                      userLocation.length === 2 && 
                      !isNaN(userLocation[0]) && 
                      !isNaN(userLocation[1]);

      if (isValid && userLocation) {
          setViewState({ center: userLocation, zoom: 16 });
          if (isRadarOpen && radarSelectionMode === 'origin') {
              setRadarOrigin({ lat: userLocation[0], lng: userLocation[1] });
              setRadarSelectionMode('destination');
          }
      }
  }, [userLocation]);

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
      if (isNaN(lat) || isNaN(lng)) return;

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
      const isValidLoc = userLocation && !isNaN(userLocation[0]) && !isNaN(userLocation[1]);
      
      if (!radarOrigin && isValidLoc && userLocation) {
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
                <button 
                    onClick={openRadar}
                    className="bg-white p-3 rounded-full shadow-lg border border-slate-200 text-slate-700 hover:text-blue-600 transition-all active:scale-95"
                    title="Obrir Radar de Trajecte"
                >
                    <Activity size={24} />
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