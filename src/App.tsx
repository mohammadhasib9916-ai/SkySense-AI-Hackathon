import React, { useState, useEffect, useCallback } from 'react';
import {
  CloudSun,
  Tractor,
  ShieldAlert,
  Bot,
  Phone,
  AlertCircle,
  MapPin,
  RefreshCw,
} from 'lucide-react';
import {
  LanguageCode,
  FullWeatherData,
} from './types';
import { translations } from './translations';
import {
  fetchLiveWeather,
  HYDERABAD_LOCATION,
} from './services/weather';
import {
  checkAIHealth,
  testNebiusConnection,
  AIStatusResponse,
} from './services/ai';

import { Header } from './components/Header';
import { WeatherDashboard } from './components/WeatherDashboard';
import { FarmerAdvisor } from './components/FarmerAdvisor';
import { SafetyAlerts } from './components/SafetyAlerts';
import { AIAssistant } from './components/AIAssistant';
import { KeypadPhoneIVR } from './components/KeypadPhoneIVR';
import { HackathonModal } from './components/HackathonModal';

type NavTab = 'dashboard' | 'farmer' | 'safety' | 'ai' | 'ivr';

export default function App() {
  // 1. Language state (supports 'ur', 'hi', 'te', 'kn', 'en')
  const [currentLanguage, setCurrentLanguage] = useState<LanguageCode>(() => {
    const saved = localStorage.getItem('skysense_lang');
    if (saved && ['ur', 'hi', 'te', 'kn', 'en'].includes(saved)) {
      return saved as LanguageCode;
    }
    return 'en';
  });

  // 2. Unit preference
  const [unit, setUnit] = useState<'C' | 'F'>(() => {
    const saved = localStorage.getItem('skysense_unit');
    return saved === 'F' ? 'F' : 'C';
  });

  // 3. Navigation
  const [activeTab, setActiveTab] = useState<NavTab>('dashboard');

  // 4. Fixed Hyderabad Location & Live Weather State
  const selectedLocation = HYDERABAD_LOCATION;
  const [weatherData, setWeatherData] = useState<FullWeatherData | null>(null);
  const [isLoadingWeather, setIsLoadingWeather] = useState(false);
  const [weatherError, setWeatherError] = useState<string | null>(null);

  // 5. AI Service state
  const [aiStatus, setAiStatus] = useState<AIStatusResponse | null>(null);
  const [isAiVerified, setIsAiVerified] = useState(false);
  const [pendingAiPrompt, setPendingAiPrompt] = useState<string | null>(null);

  // 6. Guide / Hackathon modal
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Sync Language and Directionality
  useEffect(() => {
    localStorage.setItem('skysense_lang', currentLanguage);
    const isRtl = currentLanguage === 'ur';
    document.documentElement.dir = isRtl ? 'rtl' : 'ltr';
    document.documentElement.lang = currentLanguage;
  }, [currentLanguage]);

  // Sync Unit preference
  useEffect(() => {
    localStorage.setItem('skysense_unit', unit);
  }, [unit]);

  // Check AI Health on initial mount
  useEffect(() => {
    async function loadHealth() {
      const status = await checkAIHealth();
      setAiStatus(status);
      if (status.configured) {
        const testRes = await testNebiusConnection();
        if (testRes.verified) {
          setIsAiVerified(true);
        }
      }
    }
    loadHealth();
  }, []);

  // Fetch Weather for Hyderabad with clean localized error handling
  const loadWeather = useCallback(async () => {
    setIsLoadingWeather(true);
    setWeatherError(null);
    try {
      const data = await fetchLiveWeather(HYDERABAD_LOCATION);
      setWeatherData(data);
    } catch (err: any) {
      console.warn('Weather fetch error for Hyderabad:', err);
      setWeatherError('WEATHER_FETCH_FAILED');
    } finally {
      setIsLoadingWeather(false);
    }
  }, []);

  // Fetch Hyderabad weather on mount
  useEffect(() => {
    loadWeather();
  }, [loadWeather]);

  const handleOpenAiWithPrompt = (prompt: string) => {
    setPendingAiPrompt(prompt);
    setActiveTab('ai');
  };

  const handleManualVerifyAi = async () => {
    const res = await testNebiusConnection();
    if (res.verified) {
      setIsAiVerified(true);
    }
  };

  const t = translations[currentLanguage];
  const isRtl = currentLanguage === 'ur';
  const langFontClass =
    currentLanguage === 'ur'
      ? 'font-urdu'
      : currentLanguage === 'hi'
      ? 'font-devanagari'
      : currentLanguage === 'te'
      ? 'font-telugu'
      : currentLanguage === 'kn'
      ? 'font-kannada'
      : '';

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className={`min-h-screen bg-[#070D1E] text-slate-100 flex flex-col ${langFontClass}`}
    >
      {/* Top Header */}
      <Header
        currentLanguage={currentLanguage}
        onLanguageChange={setCurrentLanguage}
        unit={unit}
        onToggleUnit={() => setUnit((prev) => (prev === 'C' ? 'F' : 'C'))}
        aiStatus={aiStatus}
        isAiVerified={isAiVerified}
        onOpenGuide={() => setIsGuideOpen(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 py-4 pb-24 sm:pb-8">
        {/* Hyderabad Weather Location & Refresh Control Bar */}
        <section className="mb-5">
          <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-cyan-500/25 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg bg-slate-900/80">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white flex-shrink-0 shadow-md">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                    Hyderabad, Telangana, India
                  </h2>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                    17.385° N, 78.487° E
                  </span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    Live
                  </span>
                </div>
                <p className="text-xs text-slate-300 mt-0.5 flex items-center gap-2 flex-wrap">
                  <span className="inline-block w-2 h-2 rounded-full bg-emerald-400"></span>
                  <span>{t.weather.liveSource}: Open-Meteo</span>
                  {weatherData && (
                    <span className="text-slate-400">
                      • {t.weather.lastUpdated}: {new Date(weatherData.current.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  )}
                </p>
              </div>
            </div>

            <button
              onClick={() => loadWeather()}
              disabled={isLoadingWeather}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-cyan-300 hover:text-white text-xs font-semibold shadow transition-all active:scale-95 cursor-pointer disabled:opacity-50"
              title={t.weather.refresh}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoadingWeather ? 'animate-spin text-cyan-400' : ''}`} />
              <span>{t.weather.refresh}</span>
            </button>
          </div>

          {/* Localized Weather Error Alert if live weather fails */}
          {weatherError && (
            <div className="mt-3 p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs sm:text-sm flex items-center justify-between gap-3 shadow-lg">
              <div className="flex items-center gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <div>
                  <span className="font-semibold">{t.weather.errorFetching}</span>
                  <p className="text-[11px] text-rose-300/80 mt-0.5">
                    Live Open-Meteo weather could not be fetched for Hyderabad. Please check connection and retry.
                  </p>
                </div>
              </div>
              <button
                onClick={() => loadWeather()}
                className="px-3 py-1.5 rounded-lg bg-rose-800 hover:bg-rose-700 text-white text-xs font-semibold cursor-pointer shadow flex-shrink-0"
              >
                {t.common.retry}
              </button>
            </div>
          )}
        </section>

        {/* Navigation Tabs (Desktop & Tablet) */}
        <div className="hidden sm:flex items-center gap-1.5 p-1 rounded-2xl bg-slate-900/80 border border-slate-800 mb-5 overflow-x-auto">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'dashboard'
                ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md shadow-cyan-600/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <CloudSun className="w-4 h-4" />
            <span>{t.tabs.dashboard}</span>
          </button>

          <button
            onClick={() => setActiveTab('farmer')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'farmer'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-600/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Tractor className="w-4 h-4" />
            <span>{t.tabs.farmer}</span>
          </button>

          <button
            onClick={() => setActiveTab('safety')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'safety'
                ? 'bg-gradient-to-r from-amber-600 to-rose-600 text-white shadow-md shadow-amber-600/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <ShieldAlert className="w-4 h-4" />
            <span>{t.tabs.safety}</span>
          </button>

          <button
            onClick={() => setActiveTab('ai')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'ai'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md shadow-indigo-600/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Bot className="w-4 h-4" />
            <span>{t.tabs.ai}</span>
            {isAiVerified && (
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('ivr')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'ivr'
                ? 'bg-gradient-to-r from-sky-600 to-cyan-600 text-white shadow-md shadow-sky-600/25'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Phone className="w-4 h-4" />
            <span>{t.tabs.ivr}</span>
          </button>
        </div>

        {/* Tab Content Views */}
        <div className="transition-opacity duration-300">
          {activeTab === 'dashboard' && (
            <WeatherDashboard
              weather={weatherData}
              currentLanguage={currentLanguage}
              unit={unit}
              onRefresh={loadWeather}
              isLoading={isLoadingWeather}
              onOpenAiWithPrompt={handleOpenAiWithPrompt}
            />
          )}

          {activeTab === 'farmer' && (
            <FarmerAdvisor
              weather={weatherData}
              currentLanguage={currentLanguage}
              onAskAiWithPrompt={handleOpenAiWithPrompt}
            />
          )}

          {activeTab === 'safety' && (
            <SafetyAlerts
              weather={weatherData}
              currentLanguage={currentLanguage}
            />
          )}

          {activeTab === 'ai' && (
            <AIAssistant
              weather={weatherData}
              currentLanguage={currentLanguage}
              aiStatus={aiStatus}
              isAiVerified={isAiVerified}
              onVerifyAi={handleManualVerifyAi}
              initialPrompt={pendingAiPrompt}
              onClearInitialPrompt={() => setPendingAiPrompt(null)}
            />
          )}

          {activeTab === 'ivr' && (
            <KeypadPhoneIVR
              currentLanguage={currentLanguage}
              onLanguageChange={setCurrentLanguage}
              weather={weatherData}
            />
          )}
        </div>
      </main>

      {/* Mobile-First Bottom Navigation Bar (5 tabs) */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#070D1E]/95 backdrop-blur-lg border-t border-slate-800 px-1 py-1.5 flex items-center justify-around shadow-2xl">
        <button
          onClick={() => setActiveTab('dashboard')}
          className={`flex flex-col items-center justify-center p-1 rounded-xl transition-all cursor-pointer ${
            activeTab === 'dashboard'
              ? 'text-cyan-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <CloudSun className="w-4 h-4" />
          <span className="text-[9px] mt-0.5">{t.tabs.dashboard}</span>
        </button>

        <button
          onClick={() => setActiveTab('farmer')}
          className={`flex flex-col items-center justify-center p-1 rounded-xl transition-all cursor-pointer ${
            activeTab === 'farmer'
              ? 'text-emerald-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Tractor className="w-4 h-4" />
          <span className="text-[9px] mt-0.5">{t.tabs.farmer}</span>
        </button>

        <button
          onClick={() => setActiveTab('safety')}
          className={`flex flex-col items-center justify-center p-1 rounded-xl transition-all cursor-pointer ${
            activeTab === 'safety'
              ? 'text-amber-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          <span className="text-[9px] mt-0.5">{t.tabs.safety}</span>
        </button>

        <button
          onClick={() => setActiveTab('ai')}
          className={`flex flex-col items-center justify-center p-1 rounded-xl transition-all cursor-pointer relative ${
            activeTab === 'ai'
              ? 'text-indigo-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Bot className="w-4 h-4" />
          <span className="text-[9px] mt-0.5">{t.tabs.ai}</span>
          {isAiVerified && (
            <span className="absolute top-0.5 right-1.5 w-1.5 h-1.5 rounded-full bg-emerald-400" />
          )}
        </button>

        <button
          onClick={() => setActiveTab('ivr')}
          className={`flex flex-col items-center justify-center p-1 rounded-xl transition-all cursor-pointer ${
            activeTab === 'ivr'
              ? 'text-sky-400 font-bold'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Phone className="w-4 h-4" />
          <span className="text-[9px] mt-0.5">{t.tabs.ivr}</span>
        </button>
      </nav>

      {/* Guide & Architecture Modal */}
      <HackathonModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
        aiStatus={aiStatus}
        isAiVerified={isAiVerified}
      />
    </div>
  );
}
