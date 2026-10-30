import React from 'react';
import {
  Sun,
  Moon,
  Cloud,
  CloudSun,
  CloudMoon,
  CloudRain,
  CloudLightning,
  CloudDrizzle,
  CloudSnow,
  CloudFog,
  Wind,
  Droplets,
  Thermometer,
  ShieldAlert,
} from 'lucide-react';

interface WeatherIconProps {
  code: number;
  isDay?: boolean;
  className?: string;
  size?: number;
}

export const WeatherIcon: React.FC<WeatherIconProps> = ({
  code,
  isDay = true,
  className = 'w-8 h-8',
  size = 32,
}) => {
  // Clear sky
  if (code === 0) {
    return isDay ? (
      <Sun className={`text-amber-400 animate-pulse ${className}`} size={size} />
    ) : (
      <Moon className={`text-indigo-200 ${className}`} size={size} />
    );
  }

  // Mainly clear & partly cloudy
  if (code === 1 || code === 2) {
    return isDay ? (
      <CloudSun className={`text-amber-300 ${className}`} size={size} />
    ) : (
      <CloudMoon className={`text-indigo-300 ${className}`} size={size} />
    );
  }

  // Overcast
  if (code === 3) {
    return <Cloud className={`text-slate-300 ${className}`} size={size} />;
  }

  // Fog
  if (code === 45 || code === 48) {
    return <CloudFog className={`text-slate-400 ${className}`} size={size} />;
  }

  // Drizzle
  if (code >= 51 && code <= 57) {
    return <CloudDrizzle className={`text-cyan-400 ${className}`} size={size} />;
  }

  // Rain showers / Rain
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) {
    return <CloudRain className={`text-blue-400 ${className}`} size={size} />;
  }

  // Snow
  if ((code >= 71 && code <= 77) || (code >= 85 && code <= 86)) {
    return <CloudSnow className={`text-cyan-200 ${className}`} size={size} />;
  }

  // Thunderstorm
  if (code >= 95 && code <= 99) {
    return <CloudLightning className={`text-amber-300 animate-bounce ${className}`} size={size} />;
  }

  return <Sun className={`text-amber-400 ${className}`} size={size} />;
};
