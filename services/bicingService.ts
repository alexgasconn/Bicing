import { API_URL, DEFAULT_CENTER } from '../constants';
import { NetworkResponse, Station } from '../types';

export const fetchStations = async (): Promise<Station[]> => {
  try {
    const response = await fetch(API_URL, {
      headers: {
        Accept: 'application/json'
      },
      cache: 'no-store'
    });
    if (!response.ok) {
      throw new Error(`Failed to fetch stations: ${response.statusText}`);
    }
    const data: NetworkResponse = await response.json();
    
    // Sanitize data: Ensure coordinates and key metrics are valid numbers
    const validStations = data.network.stations.map(s => ({
        ...s,
        // Ensure numbers, fallback to 0 if missing/invalid
        latitude: typeof s.latitude === 'number' && !isNaN(s.latitude) ? s.latitude : 0,
        longitude: typeof s.longitude === 'number' && !isNaN(s.longitude) ? s.longitude : 0,
        free_bikes: typeof s.free_bikes === 'number' && !isNaN(s.free_bikes) ? s.free_bikes : 0,
        empty_slots: typeof s.empty_slots === 'number' && !isNaN(s.empty_slots) ? s.empty_slots : 0,
        extra: {
            ...s.extra,
            ebikes: typeof s.extra?.ebikes === 'number' && !isNaN(s.extra.ebikes) ? s.extra.ebikes : 0
        }
    })).filter(s => 
      // Final check: filter out those that are still 0,0 (unless Barcelona moves to the equator)
      s.latitude !== 0 && s.longitude !== 0
    );

    return validStations;
  } catch (error) {
    console.error("Error fetching Bicing data:", error);
    // Return empty array instead of throwing to prevent app crash, UI will show empty state
    return [];
  }
};

export const findNearestStations = (
  lat: number,
  lng: number,
  stations: Station[],
  limit: number = 5
): Station[] => {
  if (!stations.length || isNaN(lat) || isNaN(lng)) return [];
  
  return stations
    .map((station) => ({
      ...station,
      distance: (() => {
        const radius = 6371e3;
        const lat1 = lat * Math.PI / 180;
        const lat2 = station.latitude * Math.PI / 180;
        const deltaLat = (station.latitude - lat) * Math.PI / 180;
        const deltaLng = (station.longitude - lng) * Math.PI / 180;
        const arc = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
          Math.cos(lat1) * Math.cos(lat2) * Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
        return radius * (2 * Math.atan2(Math.sqrt(arc), Math.sqrt(1 - arc)));
      })(),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);
};