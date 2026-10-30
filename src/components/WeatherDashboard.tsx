import React from 'react';
import {
  RefreshCw,
  Droplets,
  Wind,
  Compass,
  Sun,
  Sunrise,
  Sunset,
  CloudRain,
  Gauge,
  ArrowUp,
  ArrowDown,
  MapPin,
  Clock,
  Sparkles,
  Navigation,
} from 'lucide-react';
import { FullWeatherData, LanguageCode, LocationData } from '../types';
import { translations } from '../translations';
import { WeatherIcon } from './WeatherIcons';
import { getWindDirectionLabel } from '../services/weather';

interface WeatherDashboardProps {
  weather: FullWeatherData | null;
  currentLanguage: LanguageCode;
  unit: 'C' | 'F';
  onRefresh: () => void;
  isLoading: boolean;
  onOpenAiWithPrompt?: (prompt: string) => void;
}

export const WeatherDashboard: React.FC<WeatherDashboardProps> = ({
  weather,
  currentLanguage,
  unit,
  onRefresh,
  isLoading,
  onOpenAiWithPrompt,
}) => {
  const t = translations[currentLanguage];

  const formatTemp = (celsius: number) => {
    if (unit === 'F') {
      const fahrenheit = Math.round((celsius * 9) / 5 + 32);
      return `${fahrenheit}°`;
    }
    return `${celsius}°`;
  };

  if (!weather) {
    return (
      <div className="glass-panel rounded-3xl p-6 sm:p-10 text-center max-w-xl mx-auto my-6 border border-cyan-500/30 shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center mx-auto mb-4 text-cyan-400">
          <MapPin className="w-8 h-8 animate-bounce" />
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
          Hyderabad, Telangana, India
        </h2>
        <p className="text-sm text-slate-300 leading-relaxed mb-6">
          {isLoading ? t.common.loading : t.weather.errorFetching}
        </p>
        <button
          onClick={onRefresh}
          disabled={isLoading}
          className="w-full sm:w-auto px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-sm shadow-lg shadow-cyan-600/30 flex items-center justify-center gap-2 mx-auto transition-all active:scale-95 cursor-pointer disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          <span>{t.weather.refresh}</span>
        </button>
      </div>
    );
  }

  const { location, current, hourly, daily, lastUpdated } = weather;
  const conditionLabel = t.weather.wmo[current.weatherCode] || t.weather.wmo[0];
  const windDirLabel = getWindDirectionLabel(current.windDirection);
  const currentRainProb = hourly[0]?.precipitationProbability ?? 0;
  const todayDaily = daily[0];

  return (
    <div className="space-y-5">
      {/* 1. Main Current Weather Hero Card */}
      <div className="relative overflow-hidden rounded-3xl p-5 sm:p-7 bg-gradient-to-br from-slate-900/90 via-slate-900/80 to-[#0e274a]/90 border border-cyan-500/25 shadow-2xl backdrop-blur-md">
        <div className="absolute -top-16 -right-16 w-56 h-56 bg-cyan-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-16 w-64 h-64 bg-indigo-500/15 rounded-full blur-3xl pointer-events-none" />

        {/* Location & Refresh Strip */}
        <div className="relative z-10 flex items-start justify-between gap-3 mb-4">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              {location.isGps ? (
                <Navigation className="w-4 h-4 text-emerald-400 flex-shrink-0 animate-pulse" />
              ) : (
                <MapPin className="w-4 h-4 text-cyan-400 flex-shrink-0" />
              )}
              <h2 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                {location.name}
              </h2>
              {location.district && location.district !== location.name && (
                <span className="text-xs sm:text-sm font-medium text-slate-300">
                  • {location.district}
                </span>
              )}
              {location.state && (
                <span className="text-xs sm:text-sm font-medium text-sky-300">
                  ({location.state})
                </span>
              )}
              {location.isGps && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Live GPS
                </span>
              )}
              {location.type && !location.isGps && (
                <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/30 uppercase">
                  {location.type}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400 mt-1">
              <Clock className="w-3 h-3 text-slate-500" />
              <span>
                {t.weather.lastUpdated} {lastUpdated}
              </span>
              <span>•</span>
              <span className="text-emerald-400 font-medium">{t.weather.liveSource}</span>
              <span>•</span>
              <span className="font-mono text-slate-400">
                {location.latitude.toFixed(2)}°N, {location.longitude.toFixed(2)}°E
              </span>
            </div>
          </div>

          <button
            onClick={onRefresh}
            disabled={isLoading}
            title={t.weather.refresh}
            className="p-2 sm:px-3 sm:py-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-all active:scale-95 disabled:opacity-50 cursor-pointer shadow-md"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">{t.weather.refresh}</span>
          </button>
        </div>

        {/* Hero Weather Display */}
        <div className="relative z-10 grid grid-cols-1 sm:grid-cols-2 gap-5 items-center my-3">
          <div className="flex items-center gap-5">
            <div className="p-3.5 rounded-2xl bg-cyan-950/40 border border-cyan-500/20 shadow-inner flex items-center justify-center">
              <WeatherIcon code={current.weatherCode} isDay={current.isDay} size={54} />
            </div>
            <div>
              <div className="flex items-baseline">
                <span className="text-5xl sm:text-6xl font-black text-white tracking-tighter">
                  {formatTemp(current.temperature)}
                </span>
                <span className="text-xl sm:text-2xl font-bold text-cyan-400 ml-1">
                  {unit}
                </span>
              </div>
              <p className="text-base sm:text-lg font-semibold text-sky-200 mt-0.5">
                {conditionLabel}
              </p>
              <div className="flex items-center gap-3 text-xs text-slate-300 mt-1">
                <span>
                  {t.weather.feelsLike}:{' '}
                  <strong className="text-white">{formatTemp(current.apparentTemperature)}</strong>
                </span>
                {todayDaily && (
                  <span className="flex items-center gap-1">
                    <ArrowUp className="w-3 h-3 text-rose-400" />
                    {formatTemp(todayDaily.tempMax)}
                    <ArrowDown className="w-3 h-3 text-cyan-400 ml-0.5" />
                    {formatTemp(todayDaily.tempMin)}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-slate-800/50 border border-slate-700/60 p-3.5 flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">{t.weather.rainChance}:</span>
              <span className={`font-bold ${currentRainProb > 40 ? 'text-cyan-300' : 'text-slate-200'}`}>
                {currentRainProb}%
              </span>
            </div>
            <div className="w-full bg-slate-700/60 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-cyan-400 to-blue-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(currentRainProb, 100)}%` }}
              />
            </div>
            {onOpenAiWithPrompt && (
              <button
                onClick={() =>
                  onOpenAiWithPrompt(
                    currentLanguage === 'ur'
                      ? `آج ${location.name} کے موسم کا تفصیلی جائزہ اور کھیت کے کاموں پر اس کے اثرات بتائیں۔`
                      : currentLanguage === 'hi'
                      ? `आज ${location.name} के मौसम और खेत के कार्यों पर इसके प्रभाव का विवरण दें।`
                      : currentLanguage === 'te'
                      ? `నేడు ${location.name} లో వాతావరణం మరియు పొలం పనులపై దాని ప్రభావం గురించి తెలపండి.`
                      : currentLanguage === 'kn'
                      ? `ಇಂದು ${location.name} ನಲ್ಲಿ ಹವಾಮಾನ ಮತ್ತು ಕೃಷಿ ಕೆಲಸಗಳ ಮೇಲೆ ಅದರ ಪ್ರಭಾವದ ಬಗ್ಗೆ ತಿಳಿಸಿ.`
                      : `Give me a complete summary of today's weather in ${location.name} and how it impacts outdoor farm work.`
                  )
                }
                className="w-full mt-1 py-1.5 px-3 rounded-lg bg-gradient-to-r from-cyan-600/30 to-blue-600/30 hover:from-cyan-600/50 hover:to-blue-600/50 border border-cyan-500/30 text-[11px] font-semibold text-cyan-200 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                <span>{t.weather.askAiAboutForecast}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Key Atmospheric Metrics Grid (6 tiles) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3">
        {/* Humidity */}
        <div className="glass-panel rounded-2xl p-3.5 border border-slate-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium">{t.weather.humidity}</span>
            <Droplets className="w-4 h-4 text-cyan-400" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold text-white">
              {current.relativeHumidity}%
            </div>
            <span className="text-[10px] text-slate-400">
              {current.relativeHumidity > 70
                ? t.weather.moist
                : current.relativeHumidity < 30
                ? t.weather.dry
                : t.weather.moderateHumidity}
            </span>
          </div>
        </div>

        {/* Wind */}
        <div className="glass-panel rounded-2xl p-3.5 border border-slate-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium">{t.weather.wind}</span>
            <Wind className="w-4 h-4 text-sky-400" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold text-white">
              {current.windSpeed} <span className="text-xs font-normal text-slate-400">km/h</span>
            </div>
            <span className="text-[10px] text-slate-400 flex items-center gap-1">
              <Compass className="w-3 h-3 text-cyan-400" />
              {t.weather.windDirection}: {windDirLabel} ({current.windDirection}°)
            </span>
          </div>
        </div>

        {/* Precipitation */}
        <div className="glass-panel rounded-2xl p-3.5 border border-slate-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium">{t.weather.precipitation}</span>
            <CloudRain className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold text-white">
              {current.precipitation} <span className="text-xs font-normal text-slate-400">mm</span>
            </div>
            <span className="text-[10px] text-slate-400">
              {t.weather.rainChance}: {currentRainProb}%
            </span>
          </div>
        </div>

        {/* UV Index */}
        <div className="glass-panel rounded-2xl p-3.5 border border-slate-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium">{t.weather.uvIndex}</span>
            <Sun className="w-4 h-4 text-amber-400" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold text-white">
              {todayDaily?.uvIndexMax ?? 0}
            </div>
            <span className="text-[10px] text-slate-400">
              {(todayDaily?.uvIndexMax ?? 0) >= 8
                ? t.weather.uvHigh
                : (todayDaily?.uvIndexMax ?? 0) >= 5
                ? t.weather.uvModerate
                : t.weather.uvLow}
            </span>
          </div>
        </div>

        {/* Pressure */}
        <div className="glass-panel rounded-2xl p-3.5 border border-slate-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium">{t.weather.pressure}</span>
            <Gauge className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <div className="text-xl sm:text-2xl font-bold text-white">
              {current.pressure} <span className="text-xs font-normal text-slate-400">hPa</span>
            </div>
            <span className="text-[10px] text-slate-400">{t.weather.surfaceBarometric}</span>
          </div>
        </div>

        {/* Sunrise & Sunset */}
        <div className="glass-panel rounded-2xl p-3.5 border border-slate-800/80 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px] font-medium">{t.weather.sunTimes}</span>
            <Sunrise className="w-4 h-4 text-amber-300" />
          </div>
          <div className="space-y-0.5">
            <div className="text-xs font-bold text-slate-200 flex items-center justify-between">
              <span className="text-slate-400 font-normal">{t.weather.sunrise}:</span>
              <span>{todayDaily?.sunrise || '06:00'}</span>
            </div>
            <div className="text-xs font-bold text-slate-200 flex items-center justify-between">
              <span className="text-slate-400 font-normal">{t.weather.sunset}:</span>
              <span>{todayDaily?.sunset || '18:30'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* 3. 24-Hour Hourly Forecast Strip */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-slate-800/90 shadow-lg">
        <div className="flex items-center justify-between mb-3.5">
          <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
            <Clock className="w-4 h-4 text-cyan-400" />
            {t.weather.hourlyTitle}
          </h3>
          <span className="text-[11px] text-slate-400">{t.weather.next24Hours}</span>
        </div>

        <div className="flex gap-2.5 overflow-x-auto pb-2 pt-1 scroll-smooth">
          {hourly.slice(0, 24).map((h, idx) => {
            const timeLabel = idx === 0 ? t.weather.now : h.time.slice(11, 16);
            return (
              <div
                key={h.time}
                className="flex flex-col items-center justify-between min-w-[72px] sm:min-w-[80px] p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-cyan-500/40 transition-all flex-shrink-0"
              >
                <span className="text-[11px] font-semibold text-slate-300">
                  {timeLabel}
                </span>
                <div className="my-2">
                  <WeatherIcon code={h.weatherCode} size={28} />
                </div>
                <span className="text-sm font-bold text-white">
                  {formatTemp(h.temperature)}
                </span>
                <span className="text-[10px] text-cyan-300 font-medium mt-1">
                  💧 {h.precipitationProbability}%
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. 7-Day Daily Outlook */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-slate-800/90 shadow-lg">
        <div className="flex items-center justify-between mb-3.5">
          <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
            <Sun className="w-4 h-4 text-amber-400" />
            {t.weather.dailyTitle}
          </h3>
          <span className="text-[11px] text-slate-400">{t.weather.multiDayOutlook}</span>
        </div>

        <div className="space-y-2">
          {daily.map((day, i) => {
            const dateObj = new Date(day.date);
            const localeCode =
              currentLanguage === 'ur'
                ? 'ur-PK'
                : currentLanguage === 'hi'
                ? 'hi-IN'
                : currentLanguage === 'te'
                ? 'te-IN'
                : currentLanguage === 'kn'
                ? 'kn-IN'
                : 'en-US';

            const dayName =
              i === 0
                ? t.weather.today
                : i === 1
                ? t.weather.tomorrow
                : dateObj.toLocaleDateString(localeCode, {
                    weekday: 'short',
                    month: 'short',
                    day: 'numeric',
                  });

            const dayCondition = t.weather.wmo[day.weatherCode] || t.weather.wmo[0];

            return (
              <div
                key={day.date}
                className="flex items-center justify-between p-3 rounded-xl bg-slate-900/50 border border-slate-800/70 hover:bg-slate-800/50 transition-colors"
              >
                <div className="flex items-center gap-3 w-32 sm:w-44 min-w-0">
                  <div className="flex-shrink-0">
                    <WeatherIcon code={day.weatherCode} size={26} />
                  </div>
                  <div className="truncate">
                    <div className="text-xs sm:text-sm font-bold text-white truncate">
                      {dayName}
                    </div>
                    <div className="text-[11px] text-slate-400 truncate">
                      {dayCondition}
                    </div>
                  </div>
                </div>

                <div className="text-xs text-cyan-300 font-medium hidden xs:block text-center w-20">
                  {day.precipitationSum > 0 ? (
                    <span>💧 {day.precipitationSum} mm</span>
                  ) : (
                    <span className="text-slate-500">{t.weather.dry}</span>
                  )}
                </div>

                <div className="flex items-center gap-2 sm:gap-3 text-xs sm:text-sm">
                  <span className="text-slate-400 font-medium">
                    {formatTemp(day.tempMin)}
                  </span>
                  <div className="w-16 sm:w-28 bg-slate-800 rounded-full h-2 overflow-hidden hidden xxs:block">
                    <div
                      className="bg-gradient-to-r from-cyan-400 via-amber-300 to-rose-400 h-full rounded-full"
                      style={{ width: '100%' }}
                    />
                  </div>
                  <span className="text-white font-bold">
                    {formatTemp(day.tempMax)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
