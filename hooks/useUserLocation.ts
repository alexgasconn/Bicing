import { useState, useCallback } from 'react';

export const useUserLocation = () => {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [isLocating, setIsLocating] = useState(false);

  const locateUser = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError("La geolocalització no està disponible al navegador.");
      return;
    }

    setIsLocating(true);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude } = position.coords;
        setUserLocation([latitude, longitude]);
        setLocationError(null);
        setIsLocating(false);
      },
      (error) => {
        console.error('Error getting location', error);
        let msg = "Error desconegut al obtenir ubicació.";
        if (error.code === 1) msg = "Permís denegat per a la ubicació.";
        if (error.code === 2) msg = "Ubicació no disponible.";
        if (error.code === 3) msg = "Temps d'espera esgotat.";
        setLocationError(msg);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 9000, maximumAge: 60000 }
    );
  }, []);

  return { userLocation, locateUser, locationError, isLocating };
};