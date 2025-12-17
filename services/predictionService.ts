import { getAllHistory } from './db';
import { Station } from '../types';

export interface PredictionPoint {
  time: string; // HH:MM
  bikes: number;
  isProjected: boolean;
  confidenceHigh?: number;
  confidenceLow?: number;
}

/**
 * Generates a short-term prediction (next 1 hour) for a specific station.
 * Algorithm:
 * 1. Filter history for the specific station.
 * 2. Look for historical data points that match the current Day of Week and Time Interval.
 * 3. Calculate Average.
 * 4. Apply a "Decay" from the CURRENT real-time value towards the historical average.
 *    (If current is 0 but avg is 10, we don't jump to 10 immediately, we ramp up).
 */
export const predictStationAvailability = async (
  currentStation: Station
): Promise<PredictionPoint[]> => {
  const history = await getAllHistory();
  
  if (!history || history.length === 0) {
    return [];
  }

  const now = new Date();
  const currentBikes = currentStation.free_bikes;
  
  // Prepare time slots (Now, +15m, +30m, +45m, +60m)
  const timeSlots = [0, 15, 30, 45, 60];
  const predictions: PredictionPoint[] = [];

  // 1. Extract historical data for this station
  // Optimization: In a real app, DB would index by StationID. Here we filter in memory.
  // We transform structure to: { timestamp: number, bikes: number }
  const stationHistory = history
    .map(snap => {
      const s = snap.stations.find(st => st.id === currentStation.id);
      return s ? { timestamp: snap.timestamp, bikes: s.free_bikes } : null;
    })
    .filter(item => item !== null) as { timestamp: number, bikes: number }[];

  if (stationHistory.length < 5) {
      // Not enough data for prediction
      return [];
  }

  // 2. Generate Prediction for each slot
  for (const minutesOffset of timeSlots) {
    const targetTime = new Date(now.getTime() + minutesOffset * 60000);
    
    // Feature Engineering:
    // We look for similar moments in history.
    // "Similar" means: Same Day of Week AND Time of Day (+/- 30 mins window)
    const targetDay = targetTime.getDay();
    const targetHour = targetTime.getHours();
    const targetMinute = targetTime.getMinutes();
    const targetTotalMinutes = targetHour * 60 + targetMinute;

    const similarMoments = stationHistory.filter(h => {
        const hDate = new Date(h.timestamp);
        // Check Day of Week
        if (hDate.getDay() !== targetDay) return false;
        
        // Check Time Window (within 30 mins)
        const hTotalMinutes = hDate.getHours() * 60 + hDate.getMinutes();
        const diff = Math.abs(hTotalMinutes - targetTotalMinutes);
        return diff <= 30;
    });

    // Fallback: If not enough "Same Day" data (e.g., specific Tuesday), use "Any Day" data for that time
    // Commute patterns are often M-F similar.
    let samples = similarMoments;
    if (samples.length < 3) {
        const isWeekend = targetDay === 0 || targetDay === 6;
        samples = stationHistory.filter(h => {
             const hDate = new Date(h.timestamp);
             const hIsWeekend = hDate.getDay() === 0 || hDate.getDay() === 6;
             // Match Weekend/Weekday type
             if (isWeekend !== hIsWeekend) return false;
             
             const hTotalMinutes = hDate.getHours() * 60 + hDate.getMinutes();
             return Math.abs(hTotalMinutes - targetTotalMinutes) <= 30;
        });
    }

    // 3. Calculate Stats
    let predictedBikes = currentBikes;
    let stdDev = 0;

    if (minutesOffset === 0) {
        predictedBikes = currentBikes; // The "Now" point is always reality
    } else {
        if (samples.length > 0) {
            const sum = samples.reduce((acc, curr) => acc + curr.bikes, 0);
            const avg = sum / samples.length;

            // Calculate Standard Deviation for Confidence Interval
            const variance = samples.reduce((acc, curr) => acc + Math.pow(curr.bikes - avg, 2), 0) / samples.length;
            stdDev = Math.sqrt(variance);

            // 4. Weighting (Decay Logic)
            // As time moves forward, we trust the Historical Average more than the Current State.
            // T+15: 75% Current, 25% History
            // T+30: 50% Current, 50% History
            // T+60: 25% Current, 75% History
            const historicalWeight = minutesOffset / 60; // 0 to 1
            const currentWeight = 1 - historicalWeight;

            predictedBikes = (currentBikes * currentWeight) + (avg * historicalWeight);
        } else {
            // No history? Flat line prediction based on current
            predictedBikes = currentBikes;
            stdDev = 2; // Arbitrary uncertainty
        }
    }

    predictions.push({
        time: targetTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        bikes: Math.round(predictedBikes), // Round to nearest integer
        isProjected: minutesOffset > 0,
        confidenceHigh: Math.round(predictedBikes + stdDev),
        confidenceLow: Math.max(0, Math.round(predictedBikes - stdDev))
    });
  }

  return predictions;
};
