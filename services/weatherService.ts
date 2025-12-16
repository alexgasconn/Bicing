export interface WeatherData {
  temperature: number;
  weathercode: number;
  windspeed: number;
  is_day: number;
}

export const fetchWeather = async (lat: number, lng: number): Promise<WeatherData> => {
  try {
    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}&current_weather=true`
    );
    const data = await response.json();
    return data.current_weather;
  } catch (error) {
    console.error("Error fetching weather:", error);
    throw error;
  }
};

export const getWeatherDescription = (code: number): { label: string; icon: string } => {
  // WMO Weather interpretation codes
  if (code === 0) return { label: "Cel clar", icon: "sun" };
  if (code >= 1 && code <= 3) return { label: "Ennuvolat", icon: "cloud" };
  if (code >= 45 && code <= 48) return { label: "Boira", icon: "cloud-fog" };
  if (code >= 51 && code <= 67) return { label: "Plugim", icon: "cloud-drizzle" };
  if (code >= 71 && code <= 77) return { label: "Neu", icon: "snowflake" };
  if (code >= 80 && code <= 82) return { label: "Pluja", icon: "cloud-rain" };
  if (code >= 95) return { label: "Tempesta", icon: "cloud-lightning" };
  return { label: "Variable", icon: "cloud" };
};

export const getCyclingAdvice = (weather: WeatherData): { text: string; color: string } => {
  if (weather.windspeed > 30) {
    return { text: "⚠️ Vent molt fort! Ves amb compte.", color: "text-red-600 bg-red-50" };
  }
  if (weather.weathercode >= 95) {
    return { text: "⛈️ Tempesta. Millor no agafar la bici.", color: "text-purple-600 bg-purple-50" };
  }
  if (weather.weathercode >= 80 || (weather.weathercode >= 51 && weather.weathercode <= 67)) {
    return { text: "☔ Plou. Porta impermeable!", color: "text-blue-600 bg-blue-50" };
  }
  if (weather.windspeed > 20) {
    return { text: "💨 Vent moderat. Et costarà pedalar.", color: "text-orange-600 bg-orange-50" };
  }
  if (weather.temperature > 30) {
    return { text: "☀️ Molta calor. Hidrata't bé.", color: "text-orange-600 bg-orange-50" };
  }
  if (weather.temperature < 5) {
    return { text: "🧣 Fa fred. Abriga't bé!", color: "text-blue-600 bg-blue-50" };
  }
  
  return { text: "🚲 Dia perfecte per pedalar!", color: "text-green-700 bg-green-50" };
};