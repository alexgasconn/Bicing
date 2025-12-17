
export interface NetworkResponse {
  network: {
    id: string;
    name: string;
    location: {
      city: string;
      country: string;
      latitude: number;
      longitude: number;
    };
    stations: Station[];
  };
}

export interface Station {
  id: string;
  name: string;
  latitude: number;
  longitude: number;
  free_bikes: number;
  empty_slots: number;
  timestamp: string;
  distanceToUser?: number; // Calculated distance in meters
  extra?: {
    uid?: string;
    address?: string;
    slots?: number;
    ebikes?: number;
    has_ebikes?: boolean;
    online?: boolean;
    status?: string; 
  };
}

export interface MapViewState {
  center: [number, number];
  zoom: number;
}

export interface FilterCriteria {
  minBikes?: number;
  minMechanical?: number;
  minElectric?: number;
  minSlots?: number;
  radius?: number; // meters from user location or center
  useUserLocation?: boolean; // if true, radius is from user location
  onlyEbikes?: boolean;
}

export enum MessageRole {
  USER = 'user',
  ASSISTANT = 'assistant'
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  text: string;
}

// Radar Types
export interface RadarPoint {
    lat: number;
    lng: number;
    address?: string; // Optional nice name
}

export type RadarSelectionMode = 'none' | 'origin' | 'destination';

export type HeatmapMode = 'none' | 'density' | 'electric' | 'mechanical' | 'slots';

// Sniper (Alert) Types
export interface SniperConfig {
    stationId: string;
    targetType: 'bikes' | 'slots'; // Wait for bikes or wait for parking
    threshold: number; // usually > 0
    stationName: string;
}

// Zone Clustering
export interface ZoneCluster {
    id: string;
    lat: number;
    lng: number;
    stationCount: number;
    totalBikes: number;
    totalEbikes: number;
    totalMechanical: number;
    totalSlots: number;
}