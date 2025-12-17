import { useEffect, useRef } from 'react';
import { Station } from '../types';
import { saveSnapshot } from '../services/db';

const STORAGE_KEY = 'bicing_last_save_time';
const INTERVAL_MS = 5 * 60 * 1000; // 5 Minutes

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
      // If never saved, or more than interval passed
      if (!lastSaveRef.current || (now - lastSaveRef.current) > INTERVAL_MS) {
        saveSnapshot(stations);
        lastSaveRef.current = now;
        localStorage.setItem(STORAGE_KEY, now.toString());
      }
    };

    // Check immediately when data loads
    checkAndSave();

    // Check frequently (every minute) to ensure we trigger close to the 5 min mark
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