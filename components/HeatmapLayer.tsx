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
        intensity = s.free_bikes; // Total density
      } else if (mode === 'electric') {
        intensity = ebikes;
      } else if (mode === 'mechanical') {
        intensity = mechanical;
      }
      
      // Normalize intensity slightly for better visuals (cap at a reasonable number like 20)
      const normIntensity = Math.min(intensity / 10, 1);
      
      // Return point only if it contributes
      if (intensity > 0) {
          return [s.latitude, s.longitude, normIntensity];
      }
      return null;
    }).filter(Boolean) as [number, number, number][];

    // Configure Gradient colors
    let gradient: Record<number, string> = { 0.4: 'blue', 0.65: 'lime', 1: 'red' };
    if (mode === 'electric') {
        gradient = { 0.4: '#93c5fd', 0.7: '#3b82f6', 1: '#1e3a8a' }; // Light blue to Dark blue
    } else if (mode === 'mechanical') {
        gradient = { 0.4: '#fca5a5', 0.7: '#ef4444', 1: '#7f1d1d' }; // Light red to Dark red
    }

    // Access global L because leaflet.heat attaches to window.L (from script tag), 
    // not the module L (from import)
    const GlobalL = (window as any).L;

    if (!GlobalL || !GlobalL.heatLayer) {
        console.warn("Leaflet Heatmap plugin not found on global L object.");
        return;
    }

    const heat = GlobalL.heatLayer(points, {
        radius: 25,
        blur: 15,
        maxZoom: 17,
        gradient: gradient
    });

    heat.addTo(map);

    return () => {
      map.removeLayer(heat);
    };
  }, [stations, mode, map]);

  return null;
};

export default HeatmapLayer;