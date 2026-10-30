import React from 'react';
import {
  CloudLightning,
  Globe,
  HelpCircle,
  CheckCircle2,
  Sparkles,
} from 'lucide-react';
import { LanguageCode } from '../types';
import { translations } from '../translations';
import { AIStatusResponse } from '../services/ai';

interface HeaderProps {
  currentLanguage: LanguageCode;
  onLanguageChange: (lang: LanguageCode) => void;
  unit: 'C' | 'F';
  onToggleUnit: () => void;
  aiStatus: AIStatusResponse | null;
  isAiVerified: boolean;
  onOpenGuide: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentLanguage,
  onLanguageChange,
  unit,
  onToggleUnit,
  aiStatus,
  isAiVerified,
  onOpenGuide,
}) => {
  const t = translations[currentLanguage];

  const languageOptions: Array<{ code: LanguageCode; label: string; native: string }> = [
    { code: 'en', label: 'English', native: 'English' },
    { code: 'ur', label: 'Urdu', native: 'اردو' },
    { code: 'hi', label: 'Hindi', native: 'हिंदी' },
    { code: 'te', label: 'Telugu', native: 'తెలుగు' },
    { code: 'kn', label: 'Kannada', native: 'ಕನ್ನಡ' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-cyan-500/15 bg-[#070D1E]/90 backdrop-blur-md px-3 sm:px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
        {/* Brand identity */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 via-sky-500 to-indigo-600 p-0.5 shadow-lg shadow-cyan-500/20 flex items-center justify-center flex-shrink-0">
            <div className="w-full h-full bg-[#070D1E] rounded-[10px] flex items-center justify-center">
              <CloudLightning className="w-5 h-5 text-cyan-400" />
            </div>
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold tracking-tight bg-gradient-to-r from-white via-sky-100 to-cyan-300 bg-clip-text text-transparent truncate">
                {t.appName}
              </h1>
              {isAiVerified ? (
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 rounded-full">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  {t.ai.verifiedBadge}
                </span>
              ) : aiStatus?.configured ? (
                <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold tracking-wide uppercase bg-sky-500/15 text-sky-300 border border-sky-500/30 rounded-full">
                  <Sparkles className="w-3 h-3 text-sky-400" />
                  {t.ai.configuredBadge}
                </span>
              ) : null}
            </div>
            <p className="text-[11px] text-slate-400 truncate hidden xs:block">
              {t.tagline}
            </p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2.5 flex-shrink-0">
          {/* Unit Toggle */}
          <button
            onClick={onToggleUnit}
            title={unit === 'C' ? t.weather.celsius : t.weather.fahrenheit}
            className="px-2.5 py-1.5 text-xs font-semibold rounded-lg bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-sky-300 transition-all active:scale-95 cursor-pointer"
          >
            °{unit}
          </button>

          {/* Language Selector */}
          <div className="relative flex items-center">
            <div className="flex items-center bg-slate-800/80 border border-slate-700 rounded-lg px-2 py-1 gap-1.5 focus-within:ring-2 focus-within:ring-cyan-500/50">
              <Globe className="w-3.5 h-3.5 text-cyan-400 flex-shrink-0" />
              <select
                value={currentLanguage}
                onChange={(e) => onLanguageChange(e.target.value as LanguageCode)}
                className="bg-transparent text-xs font-medium text-slate-200 outline-none cursor-pointer pr-1"
                aria-label="Select Language"
              >
                {languageOptions.map((opt) => (
                  <option key={opt.code} value={opt.code} className="bg-slate-900 text-white py-1">
                    {opt.native} ({opt.label})
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Info / Guide button */}
          <button
            onClick={onOpenGuide}
            title={t.tabs.guide}
            className="p-1.5 sm:px-2.5 sm:py-1.5 text-xs rounded-lg bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-500/30 text-cyan-300 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <HelpCircle className="w-4 h-4 text-cyan-400" />
            <span className="hidden md:inline font-medium">{t.tabs.guide}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
