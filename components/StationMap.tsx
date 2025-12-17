import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle, useMapEvents } from 'react-leaflet';
import L from 'leaflet';
import { Station, MapViewState, RadarPoint, RadarSelectionMode, SniperConfig, ZoneCluster } from '../types';
import { BatteryCharging, Bike, Heart, Navigation, Crosshair, Bell } from 'lucide-react';

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

// --- MARKER GENERATION LOGIC ---

const createIconHtml = (station: Station, isFavorite: boolean, isSniperTarget: boolean) => {
  const totalSlots = station.empty_slots || 0;
  const ebikes = station.extra?.ebikes || 0;
  const freeBikes = station.free_bikes || 0;
  const mechanical = Math.max(0, freeBikes - ebikes);
  
  const totalCapacity = totalSlots + freeBikes;
  const safeCapacity = totalCapacity <= 0 ? 1 : totalCapacity; 

  let ebikePct = (ebikes / safeCapacity) * 100;
  let mechPct = (mechanical / safeCapacity) * 100;

  if (isNaN(ebikePct)) ebikePct = 0;
  if (isNaN(mechPct)) mechPct = 0;

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
  if (isSniperTarget) borderColor = '#ec4899'; 
  else if (isFavorite) borderColor = '#eab308'; 

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
       ${isFavorite ? '<div style="position: absolute; top: -3px; right: -3px; width: 8px; height: 8px; background: #eab308; border-radius: 50%; border: 1px solid white;"></div>' : ''}
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

const createClusterIconHtml = (cluster: ZoneCluster, isLarge: boolean) => {
    // Color Logic: Traffic light system for quick readability
    let bgClass = '';
    let border = '';
    const count = cluster.totalBikes;

    // Scale thresholds if grouping is larger
    // Large zones aggregate more stations, so thresholds should be higher for "green"
    const scale = isLarge ? 2.5 : 1; 

    if (count === 0) {
         bgClass = '#64748b'; // Slate (Empty/Grey)
         border = '#475569';
    } else if (count < (10 * scale)) {
         bgClass = '#ef4444'; // Red (Critical)
         border = '#b91c1c';
    } else if (count < (30 * scale)) {
         bgClass = '#f59e0b'; // Amber (Medium)
         border = '#b45309';
    } else if (count < (60 * scale)) {
         bgClass = '#84cc16'; // Lime (Good)
         border = '#4d7c0f';
    } else {
         bgClass = '#22c55e'; // Green (Excellent)
         border = '#15803d';
    }

    const size = isLarge ? 64 : 48;
    const fontSize = isLarge ? 22 : 18;
    const badgeSize = isLarge ? 11 : 9;

    return `
        <div style="
            width: ${size}px;
            height: ${size}px;
            background: ${bgClass};
            border: 3px solid ${border};
            border-radius: 50%;
            display: flex;
            flex-direction: column;
            align-items: center;
            justify-content: center;
            box-shadow: 0 4px 10px rgba(0,0,0,0.3);
            color: white;
            font-family: sans-serif;
            transition: all 0.3s ease;
        ">
            <span style="font-size: ${fontSize}px; font-weight: 900; line-height: 1; text-shadow: 0 1px 2px rgba(0,0,0,0.2); margin-bottom: 2px;">${cluster.totalBikes}</span>
            
            <div style="display: flex; gap: 3px; align-items: center;">
                 <span style="font-size: ${badgeSize}px; font-weight: 700; opacity: 1;">⚡${cluster.totalEbikes}</span>
                 <span style="font-size: ${badgeSize}px; opacity: 0.7;">|</span>
                 <span style="font-size: ${badgeSize}px; font-weight: 700; opacity: 1;">P${cluster.totalSlots}</span>
            </div>
            ${isLarge ? '<div style="position: absolute; bottom: -18px; background: white; color: #1e293b; padding: 2px 6px; border-radius: 4px; font-size: 10px; font-weight: bold; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">ZONA</div>' : ''}
        </div>
    `;
};

const getClusterIcon = (cluster: ZoneCluster, isLarge: boolean) => {
    const size = isLarge ? 64 : 48;
    return L.divIcon({
        className: isLarge ? 'custom-cluster-large' : 'custom-cluster-small',
        html: createClusterIconHtml(cluster, isLarge),
        iconSize: [size, size],
        iconAnchor: [size/2, size/2]
    });
}

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
        iconAnchor: [15, 30], 
        popupAnchor: [0, -30]
    });
};

const isValidLatLng = (coords: any): boolean => {
    return Array.isArray(coords) && 
           coords.length === 2 && 
           typeof coords[0] === 'number' && !isNaN(coords[0]) && 
           typeof coords[1] === 'number' && !isNaN(coords[1]);
}

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
  onSetSniper?: (config: SniperConfig) => void;
  activeSniper?: SniperConfig | null;
}

const MapController: React.FC<{ viewState: MapViewState }> = ({ viewState }) => {
  const map = useMap();
  useEffect(() => {
    if (isValidLatLng(viewState.center)) {
        map.flyTo(viewState.center, viewState.zoom, { duration: 1.2 });
    }
  }, [viewState, map]);
  return null;
};

const MapInvalidator: React.FC = () => {
    const map = useMap();
    useEffect(() => {
        const timer = setTimeout(() => {
            map.invalidateSize();
        }, 100);
        return () => clearTimeout(timer);
    }, [map]);
    return null;
};

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

const LayerController: React.FC<{
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
    },
    resize: () => {
        setBounds(map.getBounds());
    }
  });

  useEffect(() => {
      setBounds(map.getBounds());
  }, [map]);

  // --- ZOOM LEVEL LOGIC ---
  // Zoom >= 15: Stations (Individual)
  // Zoom 13-14: Small Clusters (Neighborhoods)
  // Zoom < 13: Large Clusters (Districts/City)
  
  let viewMode: 'stations' | 'clusters-small' | 'clusters-large' = 'stations';
  if (zoom < 13) viewMode = 'clusters-large';
  else if (zoom < 15) viewMode = 'clusters-small';
  else viewMode = 'stations';

  const { visibleStations, clusters } = useMemo(() => {
    const paddedBounds = bounds ? bounds.pad(0.2) : null;

    if (viewMode === 'stations') {
        // Individual Mode
        const vis = stations.filter(s => {
            if (!s || isNaN(s.latitude) || isNaN(s.longitude)) return false;
            if (!paddedBounds) return true;
            try { return paddedBounds.contains([s.latitude, s.longitude]); } catch(e) { return false; }
        });
        return { visibleStations: vis, clusters: [] };
    } else {
        // Clustering Mode
        // Grid Size in degrees. 
        // 0.010 approx 1.1km (Neighborhood)
        // 0.035 approx 3.8km (District/Large Zone)
        const gridSize = viewMode === 'clusters-small' ? 0.010 : 0.035;
        
        const groups: Record<string, { latSum: number, lngSum: number, count: number, s: Station[] }> = {};

        stations.forEach(s => {
            if (!s || isNaN(s.latitude) || isNaN(s.longitude)) return;
            // Key based on grid cell
            const gridX = Math.floor(s.latitude / gridSize);
            const gridY = Math.floor(s.longitude / gridSize);
            const key = `${gridX}-${gridY}`;

            if (!groups[key]) {
                groups[key] = { latSum: 0, lngSum: 0, count: 0, s: [] };
            }
            groups[key].latSum += s.latitude;
            groups[key].lngSum += s.longitude;
            groups[key].count++;
            groups[key].s.push(s);
        });

        const zoneClusters: ZoneCluster[] = Object.entries(groups).map(([key, group]) => {
            const centerLat = group.latSum / group.count;
            const centerLng = group.lngSum / group.count;

            let tBikes = 0, tEbikes = 0, tMech = 0, tSlots = 0;
            group.s.forEach(st => {
                tBikes += st.free_bikes;
                tEbikes += (st.extra?.ebikes || 0);
                tSlots += st.empty_slots;
            });
            tMech = Math.max(0, tBikes - tEbikes);

            return {
                id: `cluster-${key}`,
                lat: centerLat,
                lng: centerLng,
                stationCount: group.count,
                totalBikes: tBikes,
                totalEbikes: tEbikes,
                totalMechanical: tMech,
                totalSlots: tSlots
            };
        });

        return { visibleStations: [], clusters: zoneClusters };
    }
  }, [stations, bounds, viewMode]);

  return (
    <>
      {/* Clusters Layer */}
      {viewMode !== 'stations' && clusters.map(cluster => (
          <Marker
            key={cluster.id}
            position={[cluster.lat, cluster.lng]}
            icon={getClusterIcon(cluster, viewMode === 'clusters-large')}
            eventHandlers={{
                click: () => {
                    // Smart Zoom: If Large -> Zoom to Medium (14). If Medium -> Zoom to Stations (16).
                    const targetZoom = viewMode === 'clusters-large' ? 14 : 16;
                    map.flyTo([cluster.lat, cluster.lng], targetZoom, { duration: 1.2 });
                }
            }}
          />
      ))}

      {/* Stations Layer */}
      {viewMode === 'stations' && visibleStations.map((station) => {
        if (isNaN(station.latitude) || isNaN(station.longitude)) return null;

        const ebikes = station.extra?.ebikes || 0;
        const mechanical = Math.max(0, station.free_bikes - ebikes);
        const isFav = favorites.includes(station.id);
        const isSniper = activeSniper?.stationId === station.id;
        
        return (
          <Marker 
            key={station.id} 
            position={[station.latitude, station.longitude]}
            icon={getIcon(station, isFav, isSniper)}
            zIndexOffset={isFav || isSniper ? 1000 : 0}
          >
            <Popup closeButton={false} className="rounded-xl overflow-hidden shadow-xl border-none p-0">
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
                    {station.distanceToUser !== undefined && !isNaN(station.distanceToUser) && (
                        <div className="mb-2 text-xs font-bold text-blue-600 flex items-center gap-1">
                            <Navigation size={10} /> {Math.round(station.distanceToUser)}m de tu
                        </div>
                    )}
                    
                    <div className="flex gap-2 mb-3">
                        <div className="flex-1 bg-slate-50 rounded-lg p-2 text-center border border-slate-100 relative overflow-hidden group">
                             <div className="text-xl font-black text-slate-800">{station.free_bikes}</div>
                             <div className="text-[10px] text-slate-400 font-bold uppercase">Bicis</div>
                             
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
  userLocation, 
  radarOrigin, 
  radarDestination, 
  selectionMode, 
  onMapClick, 
  onSetSniper, 
  activeSniper 
}) => {
  return (
    <MapContainer 
      center={viewState.center} 
      zoom={viewState.zoom} 
      style={{ height: '100%', width: '100%' }}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      
      <MapController viewState={viewState} />
      <MapInvalidator />
      <ClickHandler onMapClick={onMapClick} selectionMode={selectionMode} />

      <LayerController 
        stations={stations}
        favorites={favorites}
        onToggleFavorite={onToggleFavorite}
        onSetSniper={onSetSniper}
        activeSniper={activeSniper}
      />

      {/* User Location */}
      {userLocation && isValidLatLng(userLocation) && (
        <Marker position={userLocation} icon={getUserIcon()} zIndexOffset={2000} />
      )}

      {/* Radar Points */}
      {radarOrigin && (
         <Marker position={[radarOrigin.lat, radarOrigin.lng]} icon={getRadarIcon('origin')} zIndexOffset={3000} />
      )}
      {radarDestination && (
         <Marker position={[radarDestination.lat, radarDestination.lng]} icon={getRadarIcon('destination')} zIndexOffset={3000} />
      )}
    </MapContainer>
  );
};

export default StationMap;