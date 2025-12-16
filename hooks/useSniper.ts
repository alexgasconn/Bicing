import { useState, useEffect, useCallback } from 'react';
import { Station, SniperConfig } from '../types';

export const useSniper = (stations: Station[]) => {
    const [sniperConfig, setSniperConfig] = useState<SniperConfig | null>(null);
    const [permission, setPermission] = useState<NotificationPermission>('default');

    // Request permission on mount if needed
    useEffect(() => {
        if ('Notification' in window) {
            setPermission(Notification.permission);
        }
    }, []);

    const requestPermission = useCallback(async () => {
        if ('Notification' in window) {
            const result = await Notification.requestPermission();
            setPermission(result);
            return result === 'granted';
        }
        return false;
    }, []);

    const setSniper = useCallback(async (config: SniperConfig) => {
        if (permission !== 'granted') {
            const granted = await requestPermission();
            if (!granted) {
                alert("Necessitem permís de notificacions per avisar-te!");
                return;
            }
        }
        setSniperConfig(config);
    }, [permission, requestPermission]);

    const clearSniper = () => setSniperConfig(null);

    // Monitor Logic
    useEffect(() => {
        if (!sniperConfig || stations.length === 0) return;

        const targetStation = stations.find(s => s.id === sniperConfig.stationId);
        
        if (targetStation) {
            let triggered = false;
            let message = "";

            if (sniperConfig.targetType === 'bikes' && targetStation.free_bikes > sniperConfig.threshold) {
                triggered = true;
                message = `🚴 ¡Bici trobada a ${targetStation.name}! (${targetStation.free_bikes} disponibles)`;
            } else if (sniperConfig.targetType === 'slots' && targetStation.empty_slots > sniperConfig.threshold) {
                triggered = true;
                message = `🅿️ ¡Lloc lliure a ${targetStation.name}! (${targetStation.empty_slots} espais)`;
            }

            if (triggered) {
                // Browser Notification
                if (permission === 'granted') {
                    new Notification("BicingAI Sniper", {
                        body: message,
                        icon: '/favicon.ico' // Assuming standard vite favicon
                    });
                }
                
                // Audio Alert
                try {
                    const audio = new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3'); // Simple ping sound
                    audio.play().catch(e => console.log("Audio play failed interaction", e));
                } catch (e) {}

                // Clear config to stop spamming
                alert(message); // Fallback alert
                setSniperConfig(null);
            }
        }
    }, [stations, sniperConfig, permission]);

    return { sniperConfig, setSniper, clearSniper };
};