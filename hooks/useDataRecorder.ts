import { useEffect, useRef } from 'react';
import { Station } from '../types';
import { saveSnapshot } from '../services/db';

const STORAGE_KEY = 'bicing_last_save_time';
const INTERVAL_MS = 60 * 60 * 1000; // 1 Hour

export const useDataRecorder = (stations: Station[]) => {
  const lastSaveRef = useRef<number>(0);

  useEffect(() => {
    // Load last save time from local storage on mount
    const savedTime = localStorage.getItem(STORAGE_KEY);
    if (savedTime) {
      lastSaveRef.current = parseInt(savedTime, 10);
    }
  }, []);

  useEffect(() => {
    if (stations.length === 0) return;

    const checkAndSave = () => {
      const now = Date.now();
      // If never saved, or more than 1 hour passed
      if (!lastSaveRef.current || (now - lastSaveRef.current) > INTERVAL_MS) {
        saveSnapshot(stations);
        lastSaveRef.current = now;
        localStorage.setItem(STORAGE_KEY, now.toString());
      }
    };

    // Check immediately when data loads
    checkAndSave();

    // Then check every minute if we need to save
    const timer = setInterval(checkAndSave, 60000);

    return () => clearInterval(timer);
  }, [stations]);
  
  // Manual trigger for testing
  const forceSave = () => {
      saveSnapshot(stations);
      const now = Date.now();
      lastSaveRef.current = now;
      localStorage.setItem(STORAGE_KEY, now.toString());
      alert("Dades guardades manualment a la BBDD local.");
  };

  return { forceSave };
};