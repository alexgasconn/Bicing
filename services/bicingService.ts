import { API_URL, DEFAULT_CENTER } from '../constants';
import { NetworkResponse, Station } from '../types';

export const fetchStations = async (): Promise<Station[]> => {
  try {
    const response = await fetch(API_URL);
    if (!response.ok) {
      throw new Error(`Failed to fetch stations: ${response.statusText}`);
    }
    const data: NetworkResponse = await response.json();
    return data.network.stations;
  } catch (error) {
    console.error("Error fetching Bicing data:", error);
    // Return empty array or throw, UI should handle error state
    throw error;
  }
};

export const findNearestStations = (
  lat: number,
  lng: number,
  stations: Station[],
  limit: number = 5
): Station[] => {
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
