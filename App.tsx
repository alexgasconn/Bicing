import React, { Suspense, lazy, useDeferredValue, useEffect, useState } from 'react';
import { MapViewState, FilterCriteria, RadarPoint, RadarSelectionMode, Station } from './types';
import { DEFAULT_CENTER, DEFAULT_ZOOM } from './constants';
import StationMap from './components/StationMap';
import Dashboard from './components/Dashboard';
import FilterPanel from './components/FilterPanel';
import QuickFilters from './components/QuickFilters';
import CommuteRadar from './components/CommuteRadar';
import InstallBanner from './components/InstallBanner';
import { Activity, Crosshair } from 'lucide-react';
import { seedDatabaseFromCSV } from './services/db';

// Hooks
import { useStations } from './hooks/useStations';
import { useUserLocation } from './hooks/useUserLocation';
import { useStationFilters } from './hooks/useStationFilters';
import { useSniper } from './hooks/useSniper';
import { useDataRecorder } from './hooks/useDataRecorder';
import { usePwaInstall } from './hooks/usePwaInstall';

const StatsModal = lazy(() => import('./components/StatsModal'));
const StationAnalyticsModal = lazy(() => import('./components/StationAnalyticsModal'));

const ModalFallback: React.FC = () => (
    <div className="fixed inset-0 z-[5100] flex items-center justify-center bg-slate-950/30 backdrop-blur-sm">
        <div className="glass-panel rounded-2xl px-5 py-4 text-sm font-bold text-slate-700 shadow-xl">
            Carregant panell...
        </div>
    </div>
);

const App: React.FC = () => {
  // 1. Data & Location Logic
  const { stations, lastUpdated } = useStations();
    const { userLocation, locateUser, locationError, isLocating } = useUserLocation();
  const { sniperConfig, setSniper, clearSniper } = useSniper(stations);
    const { canInstall, isStandalone, promptInstall, dismissInstall } = usePwaInstall();
    const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  
  // Initialize Data Recorder
  const { forceSave } = useDataRecorder(stations);

  // Initialize DB Seeding
  useEffect(() => {
        const timer = window.setTimeout(() => {
            seedDatabaseFromCSV('/seed_data.csv').then((success) => {
                    if (success) {
                            console.log('Historical data loaded successfully.');
                    }
            });
        }, 750);

        return () => window.clearTimeout(timer);
  }, []);

    useEffect(() => {
        const handleOnline = () => setIsOnline(true);
        const handleOffline = () => setIsOnline(false);

        window.addEventListener('online', handleOnline);
        window.addEventListener('offline', handleOffline);

        return () => {
            window.removeEventListener('online', handleOnline);
            window.removeEventListener('offline', handleOffline);
        };
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
  const [selectedStationForStats, setSelectedStationForStats] = useState<Station | null>(null);
  
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
  const deferredStations = useDeferredValue(filteredStations);

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
    }, [isRadarOpen, radarSelectionMode, userLocation]);

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

    useEffect(() => {
        const focus = new URLSearchParams(window.location.search).get('focus');
        if (focus === 'radar') {
            openRadar();
        }
        if (focus === 'nearby') {
            locateUser();
        }
    }, [locateUser]);

  return (
        <div className="app-shell flex h-screen w-screen">
      {/* Map Area */}
      <div className="flex-1 relative h-full">
                <InstallBanner
                    visible={canInstall && !isRadarOpen}
                    onInstall={() => {
                        void promptInstall();
                    }}
                    onDismiss={dismissInstall}
                />

        <StationMap 
                    stations={deferredStations} 
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
          onOpenStationStats={(s) => setSelectedStationForStats(s)}
        />
        
        {/* Overlay Dashboard */}
        {!isRadarOpen && (
            <Dashboard 
                stations={deferredStations} 
                totalStations={stations.length} 
                lastUpdated={lastUpdated}
                favorites={favorites}
                allStations={stations}
                onCenterStation={(lat, lng) => setViewState({ center: [lat, lng], zoom: 18 })}
                onOpenStats={() => setIsStatsOpen(true)}
                onLocateUser={locateUser}
                userLocation={userLocation}
                locationError={locationError}
                isLocating={isLocating}
                isOnline={isOnline}
                isStandalone={isStandalone}
            />
        )}

        {/* Action Buttons Container (Right Side) */}
        {!isRadarOpen && (
            <div className="absolute top-24 right-3 z-[1000] flex flex-col gap-3 safe-area-top md:right-4">
                <button 
                    onClick={openRadar}
                    className="glass-panel p-3 rounded-full shadow-lg text-slate-700 hover:text-blue-600 transition-all active:scale-95"
                    title="Obrir Radar de Trajecte"
                >
                    <Activity size={24} />
                </button>
            </div>
        )}

        {/* Sniper Active Indicator */}
        {sniperConfig && !isRadarOpen && (
            <div className="absolute top-52 right-3 z-[1000] bg-pink-600 text-white p-2 rounded-2xl shadow-xl animate-pulse flex flex-col items-center gap-1 cursor-pointer md:right-4" onClick={clearSniper} title="Cancel·lar alerta">
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

        <Suspense fallback={<ModalFallback />}>
          {isStatsOpen && (
              <StatsModal 
                  isOpen={isStatsOpen} 
                  onClose={() => setIsStatsOpen(false)} 
                  stations={filteredStations}
                  onForceSave={forceSave} 
              />
          )}
        </Suspense>

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

        <Suspense fallback={<ModalFallback />}>
          {selectedStationForStats && (
              <StationAnalyticsModal 
                  station={selectedStationForStats}
                  onClose={() => setSelectedStationForStats(null)}
              />
          )}
        </Suspense>
      </div>
    </div>
  );
};

export default App;