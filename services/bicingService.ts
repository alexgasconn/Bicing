import { API_URL, DEFAULT_CENTER } from '../constants';
import { NetworkResponse, Station } from '../types';

export const fetchStations = async (): Promise<Station[]> => {
  try {
    const response = await fetch(API_URL);
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
      distance: Math.sqrt(
        Math.pow(station.latitude - lat, 2) + Math.pow(station.longitude - lng, 2)
      ),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, limit);
};