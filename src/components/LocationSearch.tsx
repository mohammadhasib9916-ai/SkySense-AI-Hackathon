import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  MapPin,
  Navigation,
  Loader2,
  AlertCircle,
  X,
  Compass,
} from 'lucide-react';
import { LocationData, LanguageCode } from '../types';
import { translations } from '../translations';
import {
  searchLocations,
  reverseGeocode,
  POPULAR_INDIAN_LOCATIONS,
} from '../services/weather';

interface LocationSearchProps {
  currentLanguage: LanguageCode;
  selectedLocation: LocationData | null;
  onSelectLocation: (loc: LocationData) => void;
  isLoading: boolean;
}

export const LocationSearch: React.FC<LocationSearchProps> = ({
  currentLanguage,
  selectedLocation,
  onSelectLocation,
  isLoading,
}) => {
  const t = translations[currentLanguage];
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LocationData[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Debounced search
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults([]);
      setShowDropdown(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      setErrorMessage(null);
      try {
        const hits = await searchLocations(query);
        setResults(hits);
        setShowDropdown(true);
        if (hits.length === 0) {
          setErrorMessage(t.weather.locationNotFound);
        }
      } catch (err) {
        setErrorMessage(t.weather.errorFetching);
      } finally {
        setIsSearching(false);
      }
    }, 380);

    return () => clearTimeout(timer);
  }, [query, t]);

  // Request browser GPS location
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      setErrorMessage(t.weather.gpsDenied);
      return;
    }

    setGpsLoading(true);
    setErrorMessage(null);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const loc = await reverseGeocode(pos.coords.latitude, pos.coords.longitude);
          onSelectLocation(loc);
          setQuery('');
          setShowDropdown(false);
          setErrorMessage(null);
        } catch (err) {
          setErrorMessage(t.weather.errorFetching);
        } finally {
          setGpsLoading(false);
        }
      },
      (err) => {
        setGpsLoading(false);
        if (err.code === err.PERMISSION_DENIED) {
          setErrorMessage(`${t.weather.gpsDenied} — Please search for your village, town, or district above.`);
        } else if (err.code === err.TIMEOUT) {
          setErrorMessage('GPS request timed out. Please retry or search by location name.');
        } else {
          setErrorMessage('Location unavailable from device GPS. Please search your village or city manually.');
        }
      },
      { timeout: 12000, enableHighAccuracy: true }
    );
  };

  const handleSelect = (loc: LocationData) => {
    onSelectLocation(loc);
    setQuery('');
    setResults([]);
    setShowDropdown(false);
    setErrorMessage(null);
  };

  const getTypeBadge = (type?: string) => {
    switch (type) {
      case 'village':
        return <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 uppercase">Village</span>;
      case 'district':
        return <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 uppercase">District</span>;
      case 'state':
      case 'ut':
        return <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">State/UT</span>;
      case 'city':
        return <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 uppercase">City</span>;
      default:
        return <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded bg-slate-700/60 text-slate-300 uppercase">Town</span>;
    }
  };

  return (
    <div className="w-full relative" ref={dropdownRef}>
      {/* Search Input Bar */}
      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
            {isSearching ? (
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
            ) : (
              <Search className="w-4 h-4 text-cyan-400" />
            )}
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => {
              if (results.length > 0) setShowDropdown(true);
            }}
            placeholder={t.weather.searchPlaceholder}
            className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-slate-900/90 border border-slate-700/80 text-sm text-slate-100 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500 shadow-inner"
          />
          {query && (
            <button
              onClick={() => {
                setQuery('');
                setResults([]);
                setShowDropdown(false);
              }}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
            >
              <X className="w-4 h-4" />
            </button>
          )}

          {/* Autocomplete dropdown */}
          {showDropdown && results.length > 0 && (
            <div className="absolute left-0 right-0 mt-1.5 py-1 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl z-50 max-h-72 overflow-y-auto backdrop-blur-md">
              <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-400 border-b border-slate-800 flex items-center justify-between">
                <span>Matching Indian Locations ({results.length})</span>
                <span className="text-[10px] text-cyan-400">Select to view live weather</span>
              </div>
              {results.map((loc, idx) => (
                <button
                  key={`${loc.latitude}-${loc.longitude}-${idx}`}
                  onClick={() => handleSelect(loc)}
                  className="w-full px-4 py-2.5 text-left text-sm hover:bg-slate-800/80 flex items-center justify-between border-b border-slate-800/50 last:border-b-0 cursor-pointer transition-colors"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <MapPin className="w-4 h-4 text-cyan-400 flex-shrink-0" />
                    <div className="truncate">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white">{loc.name}</span>
                        {getTypeBadge(loc.type)}
                      </div>
                      <div className="text-slate-400 text-xs truncate">
                        {loc.district && loc.district !== loc.name ? `${loc.district}, ` : ''}
                        {loc.state ? `${loc.state}, ` : ''}
                        {loc.country}
                      </div>
                    </div>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono flex-shrink-0 ml-2">
                    {loc.latitude.toFixed(2)}°, {loc.longitude.toFixed(2)}°
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* GPS Current Location Button */}
        <button
          onClick={handleUseCurrentLocation}
          disabled={gpsLoading || isLoading}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/40 text-xs sm:text-sm font-semibold transition-all active:scale-95 disabled:opacity-50 cursor-pointer flex-shrink-0"
        >
          {gpsLoading ? (
            <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
          ) : (
            <Navigation className="w-4 h-4 text-cyan-400" />
          )}
          <span>{gpsLoading ? t.weather.locating : t.weather.useGps}</span>
        </button>
      </div>

      {/* Error Banner with Retry */}
      {errorMessage && (
        <div className="mt-2.5 p-2.5 rounded-lg bg-rose-950/50 border border-rose-500/40 text-rose-300 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
            <span className="truncate">{errorMessage}</span>
          </div>
          <button
            onClick={handleUseCurrentLocation}
            className="px-2 py-0.5 rounded bg-rose-900/60 hover:bg-rose-800 text-white text-[11px] font-semibold flex-shrink-0 cursor-pointer"
          >
            {t.common.retry}
          </button>
        </div>
      )}

      {/* Quick Select Popular Indian Regions */}
      <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
        <span className="text-slate-400 font-medium whitespace-nowrap flex items-center gap-1 text-[11px]">
          <Compass className="w-3.5 h-3.5 text-cyan-400" />
          {t.weather.popularLocations}:
        </span>
        {POPULAR_INDIAN_LOCATIONS.slice(0, 8).map((loc) => {
          const isSelected =
            selectedLocation?.latitude.toFixed(2) === loc.latitude.toFixed(2) &&
            selectedLocation?.longitude.toFixed(2) === loc.longitude.toFixed(2);

          return (
            <button
              key={`${loc.name}-${loc.state}`}
              onClick={() => handleSelect(loc)}
              className={`whitespace-nowrap px-2.5 py-1 rounded-full text-[11px] font-medium transition-all cursor-pointer ${
                isSelected
                  ? 'bg-cyan-500 text-slate-950 font-bold shadow-md shadow-cyan-500/20'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/80 border border-slate-700/60'
              }`}
            >
              {loc.name}
            </button>
          );
        })}
      </div>
    </div>
  );
};
