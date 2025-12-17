import { getStationHistory } from './db';
import { Station } from '../types';

export interface PredictionPoint {
  time: string; // HH:MM
  bikes: number;
  isProjected: boolean;
  confidenceHigh?: number;
  confidenceLow?: number;
}

/**
 * Generates a prediction (next 3 hours) for a specific station.
 * Algorithm:
 * 1. Fetch specific station history (Optimized).
 * 2. Look for similar moments (Day of Week + Time).
 * 3. Decay from Current State to Historical Average over time.
 */
export const predictStationAvailability = async (
  currentStation: Station
): Promise<PredictionPoint[]> => {
  // OPTIMIZATION: Use getStationHistory instead of loading the entire network history
  const stationHistory = await getStationHistory(currentStation.id);
  
  if (!stationHistory || stationHistory.length < 5) {
    return [];
  }

  const now = new Date();
  const currentBikes = currentStation.free_bikes;
  
  // Prepare time slots (Now, +15, +30, ..., +180 minutes) -> 3 Hours
  const timeSlots: number[] = [];
  for (let i = 0; i <= 180; i += 15) {
      timeSlots.push(i);
  }

  const predictions: PredictionPoint[] = [];

  // Simplified mapping for the algorithm
  const cleanHistory = stationHistory.map(h => ({
      timestamp: h.timestamp,
      bikes: h.free_bikes
  }));

  // 2. Generate Prediction for each slot
  for (const minutesOffset of timeSlots) {
    const targetTime = new Date(now.getTime() + minutesOffset * 60000);
    
    // Feature Engineering:
    // We look for similar moments in history.
    const targetDay = targetTime.getDay();
    const targetHour = targetTime.getHours();
    const targetMinute = targetTime.getMinutes();
    const targetTotalMinutes = targetHour * 60 + targetMinute;

    const similarMoments = cleanHistory.filter(h => {
        const hDate = new Date(h.timestamp);
        // Check Day of Week
        if (hDate.getDay() !== targetDay) return false;
        
        // Check Time Window (within 30 mins)
        const hTotalMinutes = hDate.getHours() * 60 + hDate.getMinutes();
        const diff = Math.abs(hTotalMinutes - targetTotalMinutes);
        return diff <= 30;
    });

    // Fallback: If not enough "Same Day" data, use "Weekday/Weekend" data
    let samples = similarMoments;
    if (samples.length < 3) {
        const isWeekend = targetDay === 0 || targetDay === 6;
        samples = cleanHistory.filter(h => {
             const hDate = new Date(h.timestamp);
             const hIsWeekend = hDate.getDay() === 0 || hDate.getDay() === 6;
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
            // 3 Hours Horizon.
            // We fully trust history after 90 minutes.
            // T+0: 100% Current
            // T+45: 50% Current, 50% History
            // T+90+: 0% Current, 100% History
            const decayDuration = 90;
            const historicalWeight = Math.min(minutesOffset / decayDuration, 1); 
            const currentWeight = 1 - historicalWeight;

            predictedBikes = (currentBikes * currentWeight) + (avg * historicalWeight);
        } else {
            // No history? Flat line prediction based on current
            predictedBikes = currentBikes;
            stdDev = 2; 
        }
    }

    // Expand uncertainty window as we go further in time
    const uncertaintyMultiplier = 1 + (minutesOffset / 60) * 0.5; // +50% uncertainty per hour
    const finalStdDev = Math.max(1, stdDev * uncertaintyMultiplier);

    predictions.push({
        time: targetTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        bikes: Math.round(predictedBikes),
        isProjected: minutesOffset > 0,
        confidenceHigh: Math.round(predictedBikes + finalStdDev),
        confidenceLow: Math.max(0, Math.round(predictedBikes - finalStdDev))
    });
  }

  return predictions;
};