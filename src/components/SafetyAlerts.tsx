import React from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  Flame,
  CloudRain,
  Zap,
  ExternalLink,
  ShieldCheck,
  Building2,
  Info,
} from 'lucide-react';
import { FullWeatherData, LanguageCode } from '../types';
import { translations } from '../translations';
import { evaluateSafetyAdvisories } from '../services/weather';

interface SafetyAlertsProps {
  weather: FullWeatherData | null;
  currentLanguage: LanguageCode;
}

export const SafetyAlerts: React.FC<SafetyAlertsProps> = ({
  weather,
  currentLanguage,
}) => {
  const t = translations[currentLanguage];

  if (!weather) {
    return (
      <div className="glass-panel rounded-2xl p-8 text-center max-w-lg mx-auto my-6 border border-slate-700/60">
        <ShieldAlert className="w-12 h-12 text-cyan-400 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-white mb-2">{t.safety.title}</h3>
        <p className="text-sm text-slate-300">{t.weather.noLocationPrompt}</p>
      </div>
    );
  }

  // Derive evaluated risks objectively in the user's language
  const notices = evaluateSafetyAdvisories(weather, currentLanguage);

  const getSeverityStyle = (severity: 'green' | 'yellow' | 'orange' | 'red') => {
    switch (severity) {
      case 'red':
        return {
          bg: 'bg-rose-950/40 border-rose-500/40 text-rose-200',
          badge: 'bg-rose-500 text-white',
          icon: <ShieldAlert className="w-5 h-5 text-rose-400" />,
        };
      case 'orange':
        return {
          bg: 'bg-amber-950/40 border-amber-500/40 text-amber-200',
          badge: 'bg-amber-500 text-slate-950',
          icon: <AlertTriangle className="w-5 h-5 text-amber-400" />,
        };
      case 'yellow':
        return {
          bg: 'bg-yellow-950/30 border-yellow-500/30 text-yellow-200',
          badge: 'bg-yellow-400 text-slate-950',
          icon: <Info className="w-5 h-5 text-yellow-400" />,
        };
      default:
        return {
          bg: 'bg-emerald-950/30 border-emerald-500/30 text-emerald-200',
          badge: 'bg-emerald-500 text-white',
          icon: <ShieldCheck className="w-5 h-5 text-emerald-400" />,
        };
    }
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="glass-panel rounded-2xl p-5 border border-cyan-500/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-cyan-400 flex-shrink-0">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
              {t.safety.title}
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              {t.safety.subtitle} • {weather.location.name}
            </p>
          </div>
        </div>

        {/* Forecast-Derived Transparency Banner */}
        <div className="mt-3.5 p-3 rounded-xl bg-slate-900/70 border border-slate-800 text-[11px] text-slate-300 leading-relaxed">
          <p>{t.safety.forecastDerivedNotice}</p>
        </div>
      </div>

      {/* Active Threshold Advisories */}
      <div>
        <h3 className="text-sm font-bold text-white mb-2.5 flex items-center gap-2">
          <span>{t.safety.activeAdvisories}</span>
          <span className="text-xs font-normal text-slate-400">
            ({notices.length} {t.safety.activeCountSuffix})
          </span>
        </h3>

        {notices.length === 0 ? (
          <div className="glass-panel rounded-2xl p-6 text-center border border-emerald-500/20">
            <ShieldCheck className="w-10 h-10 text-emerald-400 mx-auto mb-2" />
            <p className="text-sm font-semibold text-emerald-300">
              {t.safety.noImmediateDanger}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {t.safety.noImmediateDangerDesc}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {notices.map((alert, idx) => {
              const style = getSeverityStyle(alert.severity);
              return (
                <div
                  key={idx}
                  className={`rounded-2xl p-4 border backdrop-blur-md ${style.bg} transition-all`}
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <div className="flex items-center gap-2.5">
                      {style.icon}
                      <h4 className="text-sm font-bold text-white">
                        {alert.title}
                      </h4>
                    </div>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${style.badge}`}
                    >
                      {alert.severity}
                    </span>
                  </div>

                  <p className="text-xs text-slate-200 leading-relaxed mt-1">
                    {alert.description}
                  </p>

                  <div className="mt-3 pt-2.5 border-t border-white/10 flex flex-wrap items-center justify-between text-[10px] text-slate-400 gap-2">
                    <span>
                      {t.safety.triggerLabel}: <strong className="text-slate-300">{alert.parameter}</strong>
                    </span>
                    <span className="italic">
                      {t.safety.basisLabel}: {alert.source}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Official Government Disaster Portals */}
      <div className="glass-panel rounded-2xl p-5 border border-slate-800">
        <h3 className="text-sm font-bold text-white mb-1.5 flex items-center gap-2">
          <Building2 className="w-4 h-4 text-cyan-400" />
          {t.safety.officialPortalsTitle}
        </h3>
        <p className="text-xs text-slate-400 mb-3.5">
          {t.safety.officialPortalsSubtitle}
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
          <a
            href="https://mausam.imd.gov.in/"
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-xs font-semibold text-sky-200 flex items-center justify-between group transition-all"
          >
            <div>
              <div className="text-white group-hover:text-cyan-300">
                {t.safety.imdPortal}
              </div>
              <div className="text-[10px] text-slate-400 font-normal">
                mausam.imd.gov.in
              </div>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-400" />
          </a>

          <a
            href="https://ndma.gov.in/"
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-xs font-semibold text-sky-200 flex items-center justify-between group transition-all"
          >
            <div>
              <div className="text-white group-hover:text-cyan-300">
                {t.safety.ndmaPortal}
              </div>
              <div className="text-[10px] text-slate-400 font-normal">
                ndma.gov.in
              </div>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-400" />
          </a>

          <a
            href="https://sachet.ndma.gov.in/"
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 border border-slate-700/80 text-xs font-semibold text-sky-200 flex items-center justify-between group transition-all"
          >
            <div>
              <div className="text-white group-hover:text-cyan-300">
                {t.safety.sachetPortal}
              </div>
              <div className="text-[10px] text-slate-400 font-normal">
                sachet.ndma.gov.in
              </div>
            </div>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-cyan-400" />
          </a>
        </div>
      </div>

      {/* Standard Preparedness Protocols */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Flood & Rain */}
        <div className="glass-panel rounded-2xl p-4 border border-slate-800">
          <div className="flex items-center gap-2 mb-2 text-cyan-400">
            <CloudRain className="w-4 h-4" />
            <h4 className="text-xs font-bold text-white">{t.safety.floodSafety}</h4>
          </div>
          <ul className="text-[11px] text-slate-300 space-y-1.5 list-disc pl-3.5">
            {t.safety.floodTips.map((tip, idx) => (
              <li key={idx}>{tip}</li>
            ))}
          </ul>
        </div>

        {/* Heatwave */}
        <div className="glass-panel rounded-2xl p-4 border border-slate-800">
          <div className="flex items-center gap-2 mb-2 text-amber-400">
            <Flame className="w-4 h-4" />
            <h4 className="text-xs font-bold text-white">{t.safety.heatSafety}</h4>
          </div>
          <ul className="text-[11px] text-slate-300 space-y-1.5 list-disc pl-3.5">
            {t.safety.heatTips.map((tip, idx) => (
              <li key={idx}>{tip}</li>
            ))}
          </ul>
        </div>

        {/* Thunderstorm / Lightning */}
        <div className="glass-panel rounded-2xl p-4 border border-slate-800">
          <div className="flex items-center gap-2 mb-2 text-amber-300">
            <Zap className="w-4 h-4" />
            <h4 className="text-xs font-bold text-white">{t.safety.thunderstormSafety}</h4>
          </div>
          <ul className="text-[11px] text-slate-300 space-y-1.5 list-disc pl-3.5">
            {t.safety.thunderstormTips.map((tip, idx) => (
              <li key={idx}>{tip}</li>
            ))}
          </ul>
        </div>
      </div>

      {/* Emergency Authorities Disclaimer */}
      <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 text-xs text-slate-400 text-center">
        <p>{t.safety.disclaimer}</p>
      </div>
    </div>
  );
};
