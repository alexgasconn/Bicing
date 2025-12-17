import React, { useEffect } from 'react';
import { useMap } from 'react-leaflet';
import { Station, HeatmapMode } from '../types';

interface HeatmapLayerProps {
  stations: Station[];
  mode: HeatmapMode;
}

const HeatmapLayer: React.FC<HeatmapLayerProps> = ({ stations, mode }) => {
  const map = useMap();

  useEffect(() => {
    if (mode === 'none') return;

    // Prepare points based on mode
    // Format: [lat, lng, intensity]
    const points = stations.map(s => {
      let intensity = 0;
      const ebikes = s.extra?.ebikes || 0;
      const mechanical = Math.max(0, s.free_bikes - ebikes);

      if (mode === 'density') {
        intensity = s.free_bikes; // General bike density
      } else if (mode === 'electric') {
        intensity = ebikes;
      } else if (mode === 'mechanical') {
        intensity = mechanical;
      } else if (mode === 'slots') {
        intensity = s.empty_slots;
      }
      
      // High Visibility Normalization
      // Saturate faster: 4 units = Max Intensity (1.0)
      // This ensures even stations with very few bikes appear as "hot" spots clearly
      const normIntensity = Math.min(intensity / 4, 1.0);
      
      if (intensity > 0) {
          return [s.latitude, s.longitude, normIntensity];
      }
      return null;
    }).filter(Boolean) as [number, number, number][];

    // Ultra High Contrast Gradients
    let gradient: Record<number, string> = { 0.4: 'blue', 0.65: 'lime', 1: 'red' };

    if (mode === 'electric') {
        // Neon Blue
        gradient = { 
            0.1: '#93c5fd', // Light Blue
            0.4: '#3b82f6', // Blue 500
            0.7: '#1d4ed8', // Blue 700
            1.0: '#172554'  // Deep Navy
        }; 
    } else if (mode === 'mechanical') {
        // Neon Red
        gradient = { 
            0.1: '#fca5a5', // Light Red
            0.4: '#ef4444', // Red 500
            0.7: '#b91c1c', // Red 700
            1.0: '#450a0a'  // Deep Maroon
        }; 
    } else if (mode === 'slots') {
        // Dark/Grey Scale for Parking
        gradient = { 
            0.1: '#cbd5e1', // Slate 300
            0.4: '#64748b', // Slate 500
            0.7: '#334155', // Slate 700
            1.0: '#000000'  // Pure Black
        };
    } else {
        // Density (Mixed) - Hot Magma
        gradient = { 
            0.1: '#fcd34d', // Yellow
            0.4: '#f97316', // Orange
            0.7: '#ef4444', // Red
            1.0: '#7f1d1d'  // Dark Red
        }; 
    }

    // Access global L because leaflet.heat attaches to window.L (from script tag)
    const GlobalL = (window as any).L;

    if (!GlobalL || !GlobalL.heatLayer) {
        console.warn("Leaflet Heatmap plugin not found on global L object.");
        return;
    }

    const heat = GlobalL.heatLayer(points, {
        radius: 30, 
        blur: 20,   
        maxZoom: 17, // Matches the StationMap threshold
        gradient: gradient,
        minOpacity: 0.5 
    });

    heat.addTo(map);

    return () => {
      map.removeLayer(heat);
    };
  }, [stations, mode, map]);

  return null;
};

export default HeatmapLayer;