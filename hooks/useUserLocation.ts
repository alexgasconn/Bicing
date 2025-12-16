import { useState, useCallback } from 'react';

export const useUserLocation = () => {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  const locateUser = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError("La geolocalización no está soportada por tu navegador.");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation([latitude, longitude]);
        setLocationError(null);
      },
      (error) => {
        console.error("Error getting location", error);
        let msg = "Error desconegut al obtenir ubicació.";
        if (error.code === 1) msg = "Permís denegat per a la ubicació.";
        if (error.code === 2) msg = "Ubicació no disponible.";
        if (error.code === 3) msg = "Temps d'espera esgotat.";
        setLocationError(msg);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  }, []);

  return { userLocation, locateUser, locationError };
};