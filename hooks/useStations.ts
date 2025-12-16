import { useState, useEffect, useCallback } from 'react';
import { Station } from '../types';
import { fetchStations } from '../services/bicingService';

export const useStations = (refreshIntervalMs: number = 60000) => {
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | undefined>(undefined);

  const loadData = useCallback(async () => {
    try {
      const data = await fetchStations();
      setStations(data);
      setLastUpdated(new Date());
      setError(null);
    } catch (err) {
      console.error("Failed to load stations", err);
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } else {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
    const interval = setInterval(loadData, refreshIntervalMs);
    return () => clearInterval(interval);
  }, [loadData, refreshIntervalMs]);

  return { stations, loading, error, lastUpdated, refresh: loadData };
};