import React, { useEffect, useState } from 'react';
import { GeoJSON } from 'react-leaflet';
import L from 'leaflet';

const BikeLaneLayer: React.FC = () => {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    // Corrected URL: using singular 'carril-bici' which is the valid path in the bcn-geodata repo
    const url = "https://raw.githubusercontent.com/martgnz/bcn-geodata/master/carril-bici/carril-bici.geojson";
    
    fetch(url)
      .then(res => {
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status}`);
        }
        return res.json();
      })
      .then(geoJson => setData(geoJson))
      .catch(err => console.error("Could not load bike lanes:", err));
  }, []);

  if (!data) return null;

  return (
    <GeoJSON 
        data={data} 
        style={{
            color: '#10b981', // Emerald 500
            weight: 3,
            opacity: 0.6,
            dashArray: '5, 5' // Dashed line to distinguish from roads
        }} 
    />
  );
};

export default BikeLaneLayer;