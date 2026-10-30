import React, { useState } from 'react';
import {
  Tractor,
  SprayCan,
  Droplets,
  Scissors,
  Sprout,
  AlertTriangle,
  Info,
  CheckCircle2,
  XCircle,
  Sparkles,
} from 'lucide-react';
import { FullWeatherData, LanguageCode } from '../types';
import { translations } from '../translations';
import {
  evaluateAgriculturalSuitability,
  COMMON_CROPS,
} from '../services/weather';

interface FarmerAdvisorProps {
  weather: FullWeatherData | null;
  currentLanguage: LanguageCode;
  onAskAiWithPrompt: (prompt: string) => void;
}

export const FarmerAdvisor: React.FC<FarmerAdvisorProps> = ({
  weather,
  currentLanguage,
  onAskAiWithPrompt,
}) => {
  const t = translations[currentLanguage];
  const [selectedCropId, setSelectedCropId] = useState<string>('rice');
  const [customCrop, setCustomCrop] = useState<string>('');

  if (!weather) {
    return (
      <div className="glass-panel rounded-2xl p-8 text-center max-w-lg mx-auto my-6 border border-slate-700/60">
        <Tractor className="w-12 h-12 text-cyan-400 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-white mb-2">{t.farmer.title}</h3>
        <p className="text-sm text-slate-300">
          {t.weather.noLocationPrompt}
        </p>
      </div>
    );
  }

  const selectedCrop = COMMON_CROPS.find((c) => c.id === selectedCropId);
  const activeCropName =
    customCrop.trim() ||
    (selectedCrop ? selectedCrop.name[currentLanguage] || selectedCrop.name.en : 'Crop');

  // Compute operational suitability with strict language parameter
  const suitabilities = evaluateAgriculturalSuitability(weather, activeCropName, currentLanguage);

  const getStatusBadge = (rating: 'optimal' | 'moderate' | 'unfavorable') => {
    switch (rating) {
      case 'optimal':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            {t.farmer.optimal}
          </span>
        );
      case 'moderate':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-500/15 text-amber-300 border border-amber-500/30">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            {t.farmer.moderate}
          </span>
        );
      case 'unfavorable':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg bg-rose-500/15 text-rose-300 border border-rose-500/30">
            <XCircle className="w-3.5 h-3.5 text-rose-400" />
            {t.farmer.unfavorable}
          </span>
        );
    }
  };

  const getActivityIcon = (activity: string) => {
    switch (activity) {
      case 'spraying':
        return <SprayCan className="w-5 h-5 text-cyan-400" />;
      case 'irrigation':
        return <Droplets className="w-5 h-5 text-blue-400" />;
      case 'harvesting':
        return <Scissors className="w-5 h-5 text-amber-400" />;
      case 'sowing':
        return <Sprout className="w-5 h-5 text-emerald-400" />;
      default:
        return <Tractor className="w-5 h-5 text-slate-300" />;
    }
  };

  const getActivityName = (activity: string) => {
    switch (activity) {
      case 'spraying':
        return t.farmer.spraying;
      case 'irrigation':
        return t.farmer.irrigation;
      case 'harvesting':
        return t.farmer.harvesting;
      case 'sowing':
        return t.farmer.sowing;
      default:
        return activity;
    }
  };

  const generateLocalizedPrompt = () => {
    if (currentLanguage === 'ur') {
      return `میں ${weather.location.name} میں ${activeCropName} اگا رہا ہوں۔ آج کے موسم (${weather.current.temperature} ڈگری، ہوا کی رفتار ${weather.current.windSpeed} کلومیٹر، بارش کا امکان ${weather.hourly[0]?.precipitationProbability ?? 0} فیصد) کے مطابق کیڑے مار دوا کا چھڑکاؤ اور پانی دینے کا کیا طریقہ مناسب رہے گا؟`;
    }
    if (currentLanguage === 'hi') {
      return `मैं ${weather.location.name} में ${activeCropName} की खेती कर रहा हूँ। आज के मौसम (${weather.current.temperature}°C, हवा ${weather.current.windSpeed} किमी/घंटा, बारिश की संभावना ${weather.hourly[0]?.precipitationProbability ?? 0}%) के आधार पर आज खेत में कौन से कार्य करने चाहिए और कौन से टालने चाहिए?`;
    }
    if (currentLanguage === 'te') {
      return `నేను ${weather.location.name} లో ${activeCropName} సాగు చేస్తున్నాను. నేటి వాతావరణం (${weather.current.temperature}°C, గాలి ${weather.current.windSpeed} km/h, వర్షం అవకాశం ${weather.hourly[0]?.precipitationProbability ?? 0}%) ప్రకారం పిచికారీ మరియు సాగునీటిపై ఎలాంటి జాగ్రత్తలు తీసుకోవాలి?`;
    }
    if (currentLanguage === 'kn') {
      return `ನಾನು ${weather.location.name} ನಲ್ಲಿ ${activeCropName} ಬೆಳೆಯುತ್ತಿದ್ದೇನೆ. ಇಂದಿನ ಹವಾಮಾನದ (${weather.current.temperature}°C, ಗಾಳಿ ${weather.current.windSpeed} km/h, ಮಳೆ ಸಾಧ್ಯತೆ ${weather.hourly[0]?.precipitationProbability ?? 0}%) ಪ್ರಕಾರ ಕೀಟನಾಶಕ ಸಿಂಪರಣೆ ಮತ್ತು ನೀರಾವರಿ ಕೆಲಸಗಳ ಬಗ್ಗೆ ಸೂಕ್ತ ಸಲಹೆ ನೀಡಿ.`;
    }
    return `I am growing ${activeCropName} in ${weather.location.name}. Based on today's weather (${weather.current.temperature}°C, ${weather.current.relativeHumidity}% humidity, ${weather.current.windSpeed} km/h wind, rain probability ${weather.hourly[0]?.precipitationProbability ?? 0}%), what field operations are advisable today and what should be delayed?`;
  };

  return (
    <div className="space-y-5">
      {/* Section Header */}
      <div className="glass-panel rounded-2xl p-5 border border-cyan-500/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-950/60 border border-emerald-500/30 flex items-center justify-center text-emerald-400 flex-shrink-0">
              <Tractor className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                {t.farmer.title}
              </h2>
              <p className="text-xs text-slate-300 mt-0.5">
                {t.farmer.subtitle} • {weather.location.name}
              </p>
            </div>
          </div>

          <button
            onClick={() => onAskAiWithPrompt(generateLocalizedPrompt())}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600/40 via-cyan-600/40 to-sky-600/40 hover:from-emerald-600/60 hover:to-cyan-600/60 border border-emerald-500/40 text-xs font-semibold text-emerald-200 flex items-center justify-center gap-2 transition-all cursor-pointer shadow-md"
          >
            <Sparkles className="w-4 h-4 text-emerald-300 animate-pulse" />
            <span>{t.farmer.askAiFarmerBtn}</span>
          </button>
        </div>

        {/* Crop Selection Filter */}
        <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1">
              {t.farmer.selectCrop}:
            </label>
            <div className="flex flex-wrap gap-1.5">
              {COMMON_CROPS.map((crop) => (
                <button
                  key={crop.id}
                  onClick={() => {
                    setSelectedCropId(crop.id);
                    setCustomCrop('');
                  }}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                    selectedCropId === crop.id && !customCrop
                      ? 'bg-emerald-500 text-slate-950 font-bold shadow-md shadow-emerald-500/20'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80 border border-slate-700'
                  }`}
                >
                  {crop.name[currentLanguage] || crop.name.en}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-400 block mb-1">
              {t.farmer.customCropLabel}:
            </label>
            <input
              type="text"
              value={customCrop}
              onChange={(e) => setCustomCrop(e.target.value)}
              placeholder={t.farmer.customCropPlaceholder}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-900/80 border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-400"
            />
          </div>
        </div>
      </div>

      {/* Field Activity Suitability Matrix (4 Cards) */}
      <div>
        <h3 className="text-sm font-bold text-white mb-2.5 flex items-center gap-2">
          <span>{t.farmer.suitabilityTitle}</span>
          <span className="text-xs font-normal text-slate-400">
            ({activeCropName})
          </span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {suitabilities.map((item) => (
            <div
              key={item.activity}
              className="glass-panel rounded-2xl p-4 border border-slate-800/90 hover:border-slate-700 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 rounded-xl bg-slate-800/80 border border-slate-700/60">
                      {getActivityIcon(item.activity)}
                    </div>
                    <span className="text-sm font-bold text-white">
                      {getActivityName(item.activity)}
                    </span>
                  </div>
                  {getStatusBadge(item.rating)}
                </div>

                <p className="text-xs text-slate-300 leading-relaxed mt-2.5">
                  {item.details}
                </p>
              </div>

              <div className="mt-3.5 pt-2.5 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
                <span>{t.farmer.suitabilityIndex}:</span>
                <span className="font-semibold text-white font-mono">
                  {item.score} / 100
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* KVK Agronomic Disclaimer */}
      <div className="rounded-2xl bg-amber-950/20 border border-amber-500/30 p-4 text-xs text-amber-200/90 space-y-2">
        <div className="flex items-center gap-2 text-amber-400 font-semibold">
          <Info className="w-4 h-4 flex-shrink-0" />
          <span>{t.farmer.statutoryNotice}</span>
        </div>
        <p className="leading-relaxed">
          {t.farmer.disclaimer}
        </p>
        <p className="text-[11px] text-amber-300/80 italic">
          {t.farmer.kvkNotice}
        </p>
      </div>
    </div>
  );
};
