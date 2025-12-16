import { useMemo } from 'react';
import { Station, FilterCriteria } from '../types';

interface QuickFiltersState {
    onlyElectric: boolean;
    hasBikes: boolean;
    hasSlots: boolean;
}

export const useStationFilters = (
    stations: Station[], 
    criteria: FilterCriteria, 
    quickState: QuickFiltersState,
    mapCenter: [number, number],
    userLocation: [number, number] | null
) => {
    
    return useMemo(() => {
        let result = [...stations];
        const { minBikes, onlyEbikes, minSlots, minElectric, minMechanical, radius, useUserLocation } = criteria;

        // 1. Calculate Distances (We do this first to enable sorting/filtering by radius later)
        // Only if user location exists or we need it for radius
        if (userLocation || (radius && radius > 0)) {
            const referencePoint = (useUserLocation && userLocation) ? userLocation : mapCenter;
            const [refLat, refLng] = referencePoint;
            const R = 6371e3; // metres

            // Pre-calculate radians for reference to save math ops inside loop
            const φ1 = refLat * Math.PI/180;

            result.forEach(s => {
                const φ2 = s.latitude * Math.PI/180;
                const Δφ = (s.latitude - refLat) * Math.PI/180;
                const Δλ = (s.longitude - refLng) * Math.PI/180;
                const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
                          Math.cos(φ1) * Math.cos(φ2) *
                          Math.sin(Δλ/2) * Math.sin(Δλ/2);
                const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
                s.distanceToUser = R * c;
            });
        }

        // 2. Apply Radius Filter
        if (radius && radius > 0) {
            result = result.filter(s => (s.distanceToUser || Infinity) <= radius);
        }

        // 3. Apply Advanced Filters
        if (minBikes) result = result.filter(s => s.free_bikes >= minBikes);
        if (minSlots) result = result.filter(s => s.empty_slots >= minSlots);
        if (onlyEbikes) result = result.filter(s => (s.extra?.ebikes || 0) > 0);
        if (minElectric) result = result.filter(s => (s.extra?.ebikes || 0) >= minElectric);
        if (minMechanical) result = result.filter(s => (s.free_bikes - (s.extra?.ebikes || 0)) >= minMechanical);

        // 4. Apply Quick Filters
        if (quickState.onlyElectric) {
            result = result.filter(s => (s.extra?.ebikes || 0) > 0);
        }
        if (quickState.hasBikes) {
            result = result.filter(s => s.free_bikes > 0);
        }
        if (quickState.hasSlots) {
            result = result.filter(s => s.empty_slots > 0);
        }

        return result;
    }, [stations, criteria, quickState, mapCenter, userLocation]);
};