import { Station } from '../types';

const DB_NAME = 'BicingHistoryDB';
const STORE_NAME = 'hourly_snapshots';
const DB_VERSION = 1;

export interface Snapshot {
  id?: number;
  timestamp: number;
  stations: Station[];
}

// Open Database Helper
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
      }
    };
  });
};

// Save a snapshot of current stations
export const saveSnapshot = async (stations: Station[]): Promise<void> => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    
    const snapshot: Snapshot = {
      timestamp: Date.now(),
      stations: stations.map(s => ({
        // Minimize storage: keep only essential data
        id: s.id,
        name: s.name,
        latitude: s.latitude,
        longitude: s.longitude,
        free_bikes: s.free_bikes,
        empty_slots: s.empty_slots,
        timestamp: s.timestamp,
        extra: { ebikes: s.extra?.ebikes }
      }))
    };

    store.add(snapshot);
    console.log(`[DB] Snapshot saved at ${new Date().toLocaleTimeString()}`);
  } catch (err) {
    console.error("[DB] Failed to save snapshot", err);
  }
};

// Get snapshot count
export const getSnapshotCount = async (): Promise<number> => {
    try {
        const db = await openDB();
        return new Promise((resolve) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const req = store.count();
            req.onsuccess = () => resolve(req.result);
        });
    } catch (e) {
        return 0;
    }
};

// Get recent history (for UI visualization)
export const getHistory = async (limit: number = 50): Promise<Snapshot[]> => {
    try {
        const db = await openDB();
        return new Promise((resolve) => {
            const tx = db.transaction(STORE_NAME, 'readonly');
            const store = tx.objectStore(STORE_NAME);
            const req = store.getAll();
            req.onsuccess = () => {
                const all = req.result as Snapshot[];
                resolve(all.reverse().slice(0, limit));
            };
        });
    } catch (e) {
        return [];
    }
};

// Clear DB
export const clearDatabase = async (): Promise<void> => {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    tx.objectStore(STORE_NAME).clear();
};

// Seed Database from CSV
export const seedDatabaseFromCSV = async (csvUrl: string): Promise<boolean> => {
    try {
        const count = await getSnapshotCount();
        if (count > 0) {
            console.log("[DB] Database already has data. Skipping seed.");
            return false;
        }

        console.log("[DB] Fetching seed data from:", csvUrl);
        const response = await fetch(csvUrl);
        if (!response.ok) throw new Error("Seed file not found");
        
        const csvText = await response.text();
        const lines = csvText.split('\n');
        
        // Skip header
        const dataLines = lines.slice(1);
        
        // Group by Timestamp (Map<TimestampISO, Station[]>)
        const snapshotsMap = new Map<string, Station[]>();
        
        dataLines.forEach(line => {
            if (!line.trim()) return;
            // CSV Format: Timestamp_ISO;Timestamp_Local;Station_ID;Station_Name;Free_Bikes;Empty_Slots;E_Bikes
            const cols = line.split(';');
            if (cols.length < 7) return;

            const isoDate = cols[0];
            const station: Station = {
                id: cols[2],
                name: cols[3].replace(/^"|"$/g, ''), // Remove quotes
                free_bikes: parseInt(cols[4]),
                empty_slots: parseInt(cols[5]),
                timestamp: isoDate,
                latitude: 0, // CSV doesn't have coords to save space, but UI might need logic handling this
                longitude: 0, 
                extra: { ebikes: parseInt(cols[6]) }
            };

            if (!snapshotsMap.has(isoDate)) {
                snapshotsMap.set(isoDate, []);
            }
            snapshotsMap.get(isoDate)?.push(station);
        });

        if (snapshotsMap.size === 0) return false;

        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);

        let inserted = 0;
        snapshotsMap.forEach((stations, isoDate) => {
            const timestamp = new Date(isoDate).getTime();
            // We need coords for the map logic to work ideally, but historical data is mostly for charts/stats.
            // If we wanted coords, we'd need to merge with current station list or save them in CSV (larger file).
            
            store.add({
                timestamp,
                stations
            });
            inserted++;
        });

        return new Promise((resolve) => {
            tx.oncomplete = () => {
                console.log(`[DB] Successfully seeded ${inserted} historical snapshots.`);
                resolve(true);
            };
            tx.onerror = () => resolve(false);
        });

    } catch (e) {
        console.warn("[DB] Could not seed database:", e);
        return false;
    }
}

// Generate and Download CSV
export const downloadCSV = async () => {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, 'readonly');
  const store = tx.objectStore(STORE_NAME);
  const request = store.getAll();

  request.onsuccess = () => {
    const snapshots: Snapshot[] = request.result;
    if (snapshots.length === 0) {
      alert("No hay datos guardados aún.");
      return;
    }

    // CSV Header (using semicolon separator)
    let csvContent = "Timestamp_ISO;Timestamp_Local;Station_ID;Station_Name;Free_Bikes;Empty_Slots;E_Bikes\n";

    // Flatten Data
    snapshots.forEach(snap => {
      const dateISO = new Date(snap.timestamp).toISOString();
      const dateLocal = new Date(snap.timestamp).toLocaleString();
      
      snap.stations.forEach(st => {
        // Escape commas/quotes in names
        const safeName = `"${st.name.replace(/"/g, '""')}"`;
        const ebikes = st.extra?.ebikes || 0;
        
        const row = [
          dateISO,
          dateLocal,
          st.id,
          safeName,
          st.free_bikes,
          st.empty_slots,
          ebikes
        ].join(";");
        
        csvContent += row + "\n";
      });
    });

    // Create Blob and Link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `seed_data.csv`); // Changed default name to suggest using it as seed
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };
};