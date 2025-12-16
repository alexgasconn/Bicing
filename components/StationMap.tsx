import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Station, MapViewState, RadarPoint, RadarSelectionMode, SniperConfig } from '../types';
import { BatteryCharging, Bike, Heart, Navigation, Crosshair, Bell } from 'lucide-react';
import BikeLaneLayer from './BikeLaneLayer';

// Fix Leaflet default icon issues
const DefaultIcon = L.icon({
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

/**
 * Generates a dynamic CSS-based icon.
 */
const createIconHtml = (station: Station, isFavorite: boolean, isSniperTarget: boolean) => {
  const totalSlots = station.empty_slots;
  const ebikes = station.extra?.ebikes || 0;
  const mechanical = Math.max(0, station.free_bikes - ebikes);
  const totalCapacity = totalSlots + station.free_bikes;
  const safeCapacity = totalCapacity === 0 ? 1 : totalCapacity;

  const ebikePct = (ebikes / safeCapacity) * 100;
  const mechPct = (mechanical / safeCapacity) * 100;

  const stop1 = ebikePct;
  const stop2 = ebikePct + mechPct;

  const cElec = '#3b82f6'; 
  const cMech = '#ef4444'; 
  const cSlot = '#cbd5e1'; 

  const gradient = `conic-gradient(
    ${cElec} 0% ${stop1}%, 
    ${cMech} ${stop1}% ${stop2}%, 
    ${cSlot} ${stop2}% 100%
  )`;

  const size = isFavorite || isSniperTarget ? 28 : 20; 
  let borderColor = '#fff';
  if (isSniperTarget) borderColor = '#ec4899'; // Pink for Sniper
  else if (isFavorite) borderColor = '#eab308'; // Yellow for Fav

  const borderWidth = isFavorite || isSniperTarget ? 3 : 2;
  const shadow = isSniperTarget ? '0 0 0 4px rgba(236, 72, 153, 0.3)' : '0 3px 6px rgba(0,0,0,0.4)';

  return `
    <div style="
      width: ${size}px; 
      height: ${size}px; 
      background: ${gradient};
      border-radius: 50%; 
      border: ${borderWidth}px solid ${borderColor}; 
      box-shadow: ${shadow};
      position: relative;
    ">
       ${isFavorite ? '<div style="position: absolute; -top: 3px; -right: 3px; width: 8px; height: 8px; background: #eab308; border-radius: 50%; border: 1px solid white;"></div>' : ''}
       ${isSniperTarget ? '<div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); color: white; font-size: 10px;">🎯</div>' : ''}
    </div>
  `;
};

const getIcon = (station: Station, isFavorite: boolean, isSniperTarget: boolean) => {
    const size = isFavorite || isSniperTarget ? 28 : 20;
    return L.divIcon({
        className: isFavorite ? 'custom-donut-fav' : 'custom-donut',
        html: createIconHtml(station, isFavorite, isSniperTarget),
        iconSize: [size, size],
        iconAnchor: [size/2, size/2],
        popupAnchor: [0, -10],
    });
};

const getUserIcon = () => {
  return L.divIcon({
    className: 'user-location-marker',
    html: '<div class="user-pulse"></div>',
    iconSize: [20, 20],
    iconAnchor: [10, 10],
  });
};

const getRadarIcon = (type: 'origin' | 'destination') => {
    const color = type === 'origin' ? '#3b82f6' : '#ef4444';
    const label = type === 'origin' ? 'A' : 'B';
    return L.divIcon({
        className: `radar-marker-${type}`,
        html: `<div style="background:${color}; color:white; width:30px; height:30px; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:bold; border:3px solid white; box-shadow:0 4px 6px rgba(0,0,0,0.3);">${label}</div>`,
        iconSize: [30, 30],
        iconAnchor: [15, 30], // Anchor bottom-center-ish
        popupAnchor: [0, -30]
    });
};

interface StationMapProps {
  stations: Station[];
  viewState: MapViewState;
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  filterRadius?: number;
  userLocation: [number, number] | null;
  radarOrigin?: RadarPoint | null;
  radarDestination?: RadarPoint | null;
  selectionMode?: RadarSelectionMode;
  onMapClick?: (lat: number, lng: number) => void;
  showBikeLanes?: boolean;
  onSetSniper?: (config: SniperConfig) => void;
  activeSniper?: SniperConfig | null;
}

const MapController: React.FC<{ viewState: MapViewState }> = ({ viewState }) => {
  const map = useMap();
  useEffect(() => {
    map.flyTo(viewState.center, viewState.zoom, { duration: 1.2 });
  }, [viewState, map]);
  return null;
};

// Handle clicks for Radar
const ClickHandler: React.FC<{ onMapClick?: (lat: number, lng: number) => void; selectionMode?: RadarSelectionMode }> = ({ onMapClick, selectionMode }) => {
    useMapEvents({
        click(e) {
            if (selectionMode && selectionMode !== 'none' && onMapClick) {
                onMapClick(e.latlng.lat, e.latlng.lng);
            }
        }
    });
    return null;
};

// Component to handle viewport culling (Performance magic)
const VisibleMarkers: React.FC<{
  stations: Station[];
  favorites: string[];
  onToggleFavorite: (id: string) => void;
  onSetSniper?: (config: SniperConfig) => void;
  activeSniper?: SniperConfig | null;
}> = ({ stations, favorites, onToggleFavorite, onSetSniper, activeSniper }) => {
  const map = useMap();
  const [bounds, setBounds] = useState(map.getBounds());
  const [zoom, setZoom] = useState(map.getZoom());

  useMapEvents({
    moveend: () => {
      setBounds(map.getBounds());
      setZoom(map.getZoom());
    },
    zoomend: () => {
        setZoom(map.getZoom());
    }
  });

  const visibleStations = useMemo(() => {
    const paddedBounds = bounds.pad(0.2); 
    return stations.filter(s => paddedBounds.contains([s.latitude, s.longitude]));
  }, [stations, bounds]);

  return (
    <>
      {visibleStations.map((station) => {
        const ebikes = station.extra?.ebikes || 0;
        const mechanical = Math.max(0, station.free_bikes - ebikes);
        const isFav = favorites.includes(station.id);
        const isSniper = activeSniper?.stationId === station.id;
        
        // Hide very dense markers if zoomed out too much, unless favorite or sniper target
        if (zoom < 14 && !isFav && !isSniper) return null; 

        return (
          <Marker 
            key={station.id} 
            position={[station.latitude, station.longitude]}
            icon={getIcon(station, isFav, isSniper)}
            zIndexOffset={isFav || isSniper ? 1000 : 0}
          >
            <Popup closeButton={false} className="rounded-xl overflow-hidden shadow-xl border-none p-0">
               {/* Custom compact popup */}
              <div className="min-w-[220px]">
                <div className="bg-slate-900 text-white p-3 flex justify-between items-start">
                   <div className="w-5/6">
                       <h3 className="font-bold text-sm leading-tight pr-2">{station.name}</h3>
                   </div>
                   <button 
                     onClick={() => onToggleFavorite(station.id)}
                     className="text-white hover:text-yellow-400"
                   >
                     <Heart size={18} fill={isFav ? "currentColor" : "none"} />
                   </button>
                </div>

                <div className="p-3 bg-white">
                    {station.distanceToUser !== undefined && (
                        <div className="mb-2 text-xs font-bold text-blue-600 flex items-center gap-1">
                            <Navigation size={10} /> {Math.round(station.distanceToUser)}m de tu
                        </div>
                    )}
                    
                    <div className="flex gap-2 mb-3">
                        <div className="flex-1 bg-slate-50 rounded-lg p-2 text-center border border-slate-100 relative overflow-hidden group">
                             <div className="text-xl font-black text-slate-800">{station.free_bikes}</div>
                             <div className="text-[10px] text-slate-400 font-bold uppercase">Bicis</div>
                             
                             {/* Sniper Trigger for Bikes */}
                             {station.free_bikes === 0 && onSetSniper && (
                                 <button 
                                    onClick={() => onSetSniper({ stationId: station.id, targetType: 'bikes', threshold: 0, stationName: station.name })}
                                    className="absolute inset-0 bg-pink-600/90 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Avisa'm quan hi hagi bici"
                                >
                                    <Bell size={16} className="animate-bounce"/>
                                    <span className="text-[10px] font-bold">Avisa'm</span>
                                 </button>
                             )}
                        </div>
                        <div className="flex-1 bg-slate-50 rounded-lg p-2 text-center border border-slate-100 relative overflow-hidden group">
                             <div className="text-xl font-black text-slate-400">{station.empty_slots}</div>
                             <div className="text-[10px] text-slate-400 font-bold uppercase">Espais</div>

                             {/* Sniper Trigger for Slots */}
                             {station.empty_slots === 0 && onSetSniper && (
                                 <button 
                                    onClick={() => onSetSniper({ stationId: station.id, targetType: 'slots', threshold: 0, stationName: station.name })}
                                    className="absolute inset-0 bg-pink-600/90 text-white flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Avisa'm quan hi hagi lloc"
                                >
                                    <Bell size={16} className="animate-bounce"/>
                                    <span className="text-[10px] font-bold">Avisa'm</span>
                                 </button>
                             )}
                        </div>
                    </div>

                    <div className="space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                             <span className="flex items-center gap-1 font-medium text-blue-600">
                                <BatteryCharging size={12} /> Elèctriques
                             </span>
                             <span className="font-bold">{ebikes}</span>
                        </div>
                        <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-blue-500" style={{ width: `${station.free_bikes > 0 ? (ebikes/station.free_bikes)*100 : 0}%`}}></div>
                        </div>

                        <div className="flex items-center justify-between pt-1">
                             <span className="flex items-center gap-1 font-medium text-red-600">
                                <Bike size={12} /> Mecàniques
                             </span>
                             <span className="font-bold">{mechanical}</span>
                        </div>
                         <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-red-500" style={{ width: `${station.free_bikes > 0 ? (mechanical/station.free_bikes)*100 : 0}%`}}></div>
                        </div>
                    </div>

                    {isSniper && (
                         <div className="mt-2 bg-pink-50 text-pink-700 text-[10px] p-1.5 rounded text-center font-bold flex items-center justify-center gap-1">
                             <Crosshair size={12}/> VIGILANT AQUESTA ESTACIÓ
                         </div>
                    )}
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </>
  );
};

const StationMap: React.FC<StationMapProps> = ({ 
    stations, 
    viewState, 
    favorites, 
    onToggleFavorite,
    filterRadius,
    userLocation,
    radarOrigin,
    radarDestination,
    selectionMode,
    onMapClick,
    showBikeLanes,
    onSetSniper,
    activeSniper
}) => {
  
  return (
    <MapContainer 
      center={viewState.center} 
      zoom={viewState.zoom} 
      style={{ height: '100%', width: '100%' }}
      zoomControl={false}
      preferCanvas={true} // Performance boost for rendering
    >
      <TileLayer
        attribution='&copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      
      {showBikeLanes && <BikeLaneLayer />}

      <MapController viewState={viewState} />
      
      <ClickHandler onMapClick={onMapClick} selectionMode={selectionMode} />

      {/* Radius Filter Visualizer */}
      {filterRadius && filterRadius > 0 && (
          <Circle 
            center={userLocation || viewState.center} 
            radius={filterRadius} 
            pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.05, dashArray: '5, 5', interactive: false }} 
          />
      )}
      
      {/* User Location Marker */}
      {userLocation && (
        <Marker position={userLocation} icon={getUserIcon()} zIndexOffset={2000}>
            <Popup autoClose={false} closeButton={false} className="custom-popup">
                <div className="text-xs font-bold text-center">Ets aquí</div>
            </Popup>
        </Marker>
      )}

      {/* Radar Markers */}
      {radarOrigin && (
          <Marker position={[radarOrigin.lat, radarOrigin.lng]} icon={getRadarIcon('origin')} zIndexOffset={3000} />
      )}
      {radarDestination && (
          <Marker position={[radarDestination.lat, radarDestination.lng]} icon={getRadarIcon('destination')} zIndexOffset={3000} />
      )}

      <VisibleMarkers 
        stations={stations} 
        favorites={favorites} 
        onToggleFavorite={onToggleFavorite}
        onSetSniper={onSetSniper}
        activeSniper={activeSniper}
      />

    </MapContainer>
  );
};

export default StationMap;