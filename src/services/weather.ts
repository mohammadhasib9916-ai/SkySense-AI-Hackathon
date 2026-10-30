import {
  LocationData,
  FullWeatherData,
  ActivitySuitability,
  WeatherAlertNotice,
  CropInfo,
  LanguageCode,
} from '../types';
import {
  searchLgdRegistry,
  reverseGeocodeLgd,
  transliterateIndicToLatin,
  getHaversineDistanceKm,
} from './indiaLocations';

// Canonical Hyderabad Location (Sole supported location)
export const HYDERABAD_LOCATION: LocationData = {
  name: 'Hyderabad',
  state: 'Telangana',
  district: 'Hyderabad',
  type: 'city',
  country: 'India',
  latitude: 17.385,
  longitude: 78.4867,
  timezone: 'Asia/Kolkata',
};

// Preset representative sample locations
export const POPULAR_INDIAN_LOCATIONS: LocationData[] = [
  HYDERABAD_LOCATION,
  { name: 'Kalaburagi', state: 'Karnataka', district: 'Kalaburagi', type: 'city', country: 'India', latitude: 17.3358, longitude: 76.8376, timezone: 'Asia/Kolkata' },
  { name: 'Varanasi', state: 'Uttar Pradesh', district: 'Varanasi', type: 'city', country: 'India', latitude: 25.3176, longitude: 82.9739, timezone: 'Asia/Kolkata' },
  { name: 'Anand', state: 'Gujarat', district: 'Anand', type: 'city', country: 'India', latitude: 22.5645, longitude: 72.9289, timezone: 'Asia/Kolkata' },
  { name: 'Ludhiana', state: 'Punjab', district: 'Ludhiana', type: 'city', country: 'India', latitude: 30.901, longitude: 75.8573, timezone: 'Asia/Kolkata' },
  { name: 'Wayanad', state: 'Kerala', district: 'Wayanad', type: 'district', country: 'India', latitude: 11.6854, longitude: 76.132, timezone: 'Asia/Kolkata' },
  { name: 'Warangal', state: 'Telangana', district: 'Warangal', type: 'city', country: 'India', latitude: 17.9689, longitude: 79.5941, timezone: 'Asia/Kolkata' },
  { name: 'Bengaluru', state: 'Karnataka', district: 'Bengaluru Urban', type: 'city', country: 'India', latitude: 12.9716, longitude: 77.5946, timezone: 'Asia/Kolkata' },
  { name: 'Pune', state: 'Maharashtra', district: 'Pune', type: 'city', country: 'India', latitude: 18.5204, longitude: 73.8567, timezone: 'Asia/Kolkata' },
  { name: 'Patna', state: 'Bihar', district: 'Patna', type: 'city', country: 'India', latitude: 25.5941, longitude: 85.1376, timezone: 'Asia/Kolkata' },
  { name: 'Jaipur', state: 'Rajasthan', district: 'Jaipur', type: 'city', country: 'India', latitude: 26.9124, longitude: 75.7873, timezone: 'Asia/Kolkata' },
];

export const COMMON_CROPS: CropInfo[] = [
  {
    id: 'rice',
    name: {
      en: 'Rice / Paddy',
      hi: 'धान / चावल',
      ur: 'دھان / چاول',
      te: 'వరి / ధాన్యం',
      kn: 'ಭತ್ತ / ಅಕ್ಕಿ',
    },
    category: 'Cereal',
    idealTempMin: 20,
    idealTempMax: 35,
    rainSensitivity: 'low',
    windSensitivity: 'medium',
  },
  {
    id: 'cotton',
    name: {
      en: 'Cotton',
      hi: 'कपास',
      ur: 'کپاس',
      te: 'పత్తి',
      kn: 'ಹತ್ತಿ',
    },
    category: 'Cash Crop',
    idealTempMin: 21,
    idealTempMax: 36,
    rainSensitivity: 'high',
    windSensitivity: 'high',
  },
  {
    id: 'chilli',
    name: {
      en: 'Chilli',
      hi: 'मिर्च',
      ur: 'مرچ',
      te: 'మిరప',
      kn: 'ಮೆಣಸಿನಕಾಯಿ',
    },
    category: 'Spice',
    idealTempMin: 18,
    idealTempMax: 32,
    rainSensitivity: 'high',
    windSensitivity: 'medium',
  },
  {
    id: 'wheat',
    name: {
      en: 'Wheat',
      hi: 'गेहूं',
      ur: 'گندم',
      te: 'గోధుమ',
      kn: 'ಗೋಧಿ',
    },
    category: 'Cereal',
    idealTempMin: 12,
    idealTempMax: 25,
    rainSensitivity: 'medium',
    windSensitivity: 'medium',
  },
  {
    id: 'mustard',
    name: {
      en: 'Mustard',
      hi: 'सरसों',
      ur: 'سرسوں',
      te: 'ఆవాలు',
      kn: 'ಸಾಸಿವೆ',
    },
    category: 'Oilseed',
    idealTempMin: 15,
    idealTempMax: 28,
    rainSensitivity: 'high',
    windSensitivity: 'medium',
  },
  {
    id: 'tomato',
    name: {
      en: 'Tomato',
      hi: 'टमाटर',
      ur: 'ٹماٹر',
      te: 'టమోటా',
      kn: 'ಟೊಮೆಟೊ',
    },
    category: 'Vegetable',
    idealTempMin: 18,
    idealTempMax: 30,
    rainSensitivity: 'high',
    windSensitivity: 'high',
  },
];

// Search locations using Open-Meteo Geocoding with India countryCode=IN and LGD integration
export async function searchLocations(query: string): Promise<LocationData[]> {
  const clean = query.trim();
  if (clean.length < 2) return [];

  const results: LocationData[] = [];
  const seenKeys = new Set<string>();

  const addUnique = (loc: LocationData) => {
    // Deduplicate by coordinate proximity (~3km) or exact name + district/state
    const coordKey = `${loc.latitude.toFixed(2)}_${loc.longitude.toFixed(2)}`;
    const nameKey = `${loc.name.toLowerCase()}_${(loc.district || loc.state || '').toLowerCase()}`;
    if (!seenKeys.has(coordKey) && !seenKeys.has(nameKey)) {
      seenKeys.add(coordKey);
      seenKeys.add(nameKey);
      results.push(loc);
    }
  };

  // 1. Search India Local Government Directory (LGD) directly (matches English, Hindi, Urdu, Telugu, Kannada, aliases)
  try {
    const lgdMatches = searchLgdRegistry(clean);
    for (const match of lgdMatches) {
      addUnique(match);
    }
  } catch (lgdErr) {
    console.warn('LGD search error:', lgdErr);
  }

  // 2. Transliterate Indic script queries if needed
  const latinQuery = transliterateIndicToLatin(clean);
  const searchTerms = [clean];
  if (latinQuery && latinQuery !== clean) {
    searchTerms.push(latinQuery);
  }

  // 3. Query Open-Meteo Geocoding API with India country filtering ("countryCode=IN")
  for (const term of searchTerms) {
    try {
      const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
        term
      )}&count=12&countryCode=IN&language=en&format=json`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.results && Array.isArray(data.results)) {
          for (const item of data.results) {
            let locType: 'village' | 'town' | 'city' | 'district' | 'state' | 'ut' = 'town';
            if (item.feature_code === 'ADM1') {
              locType = 'state';
            } else if (item.feature_code === 'ADM2') {
              locType = 'district';
            } else if (item.feature_code === 'PPL') {
              if (item.population && item.population > 100000) {
                locType = 'city';
              } else if (item.population && item.population < 15000) {
                locType = 'village';
              } else {
                locType = 'town';
              }
            }

            addUnique({
              name: item.name,
              state: item.admin1 || '',
              district: item.admin2 || item.admin3 || '',
              subdistrict: item.admin3 || '',
              type: locType,
              country: item.country || 'India',
              latitude: item.latitude,
              longitude: item.longitude,
              timezone: item.timezone || 'Asia/Kolkata',
            });
          }
        }
      }
    } catch (err) {
      console.warn(`Open-Meteo geocoding fetch error for term "${term}":`, err);
    }
  }

  return results;
}

// Reverse geocoding for browser GPS coordinates using official India LGD reference
export async function reverseGeocode(lat: number, lon: number): Promise<LocationData> {
  // Uses instant in-memory Haversine distance against all Indian districts, states, and hubs
  // 100% reliable, zero external IP rate limits, and accurate administrative hierarchy
  return reverseGeocodeLgd(lat, lon);
}

// Fetch Full Live Weather Data from Open-Meteo with server fallback
export async function fetchLiveWeather(loc: LocationData): Promise<FullWeatherData> {
  const params = new URLSearchParams({
    latitude: loc.latitude.toString(),
    longitude: loc.longitude.toString(),
    current: [
      'temperature_2m',
      'relative_humidity_2m',
      'apparent_temperature',
      'is_day',
      'precipitation',
      'rain',
      'weather_code',
      'cloud_cover',
      'surface_pressure',
      'wind_speed_10m',
      'wind_direction_10m',
      'wind_gusts_10m',
    ].join(','),
    hourly: [
      'temperature_2m',
      'relative_humidity_2m',
      'precipitation_probability',
      'precipitation',
      'weather_code',
      'wind_speed_10m',
      'uv_index',
    ].join(','),
    daily: [
      'weather_code',
      'temperature_2m_max',
      'temperature_2m_min',
      'apparent_temperature_max',
      'apparent_temperature_min',
      'sunrise',
      'sunset',
      'uv_index_max',
      'precipitation_sum',
      'precipitation_probability_max',
      'wind_speed_10m_max',
    ].join(','),
    timezone: loc.timezone || 'Asia/Kolkata',
  });

  let json: any = null;

  // 1. Try direct Open-Meteo API
  try {
    const directUrl = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 9000);
    const response = await fetch(directUrl, { signal: controller.signal });
    clearTimeout(timeout);
    if (response.ok) {
      json = await response.json();
    }
  } catch (directErr) {
    console.warn('Direct Open-Meteo fetch failed or timed out, trying server proxy...', directErr);
  }

  // 2. If direct fetch failed, try backend proxy `/api/weather`
  if (!json || !json.current) {
    const proxyUrl = `/api/weather?latitude=${loc.latitude}&longitude=${loc.longitude}&timezone=${encodeURIComponent(
      loc.timezone || 'Asia/Kolkata'
    )}`;
    const proxyRes = await fetch(proxyUrl);
    if (!proxyRes.ok) {
      throw new Error(`Weather service returned HTTP ${proxyRes.status}`);
    }
    json = await proxyRes.json();
  }

  if (!json || !json.current) {
    throw new Error('Weather data payload is empty or invalid.');
  }

  const current = {
    temperature: Math.round(json.current.temperature_2m ?? 0),
    apparentTemperature: Math.round(json.current.apparent_temperature ?? json.current.temperature_2m ?? 0),
    relativeHumidity: Math.round(json.current.relative_humidity_2m ?? 0),
    precipitation: json.current.precipitation ?? 0,
    weatherCode: json.current.weather_code ?? 0,
    windSpeed: Math.round(json.current.wind_speed_10m ?? 0),
    windDirection: Math.round(json.current.wind_direction_10m ?? 0),
    windGusts: json.current.wind_gusts_10m ? Math.round(json.current.wind_gusts_10m) : undefined,
    pressure: Math.round(json.current.surface_pressure ?? 1013),
    cloudCover: Math.round(json.current.cloud_cover ?? 0),
    isDay: Boolean(json.current.is_day ?? 1),
    time: json.current.time || new Date().toISOString(),
  };

  // Process next 24 hourly points starting from current hour
  const rawHourlyTimes: string[] = json.hourly?.time || [];
  const currentTimeHour = current.time.slice(0, 13);
  let startIndex = rawHourlyTimes.findIndex((t) => t.startsWith(currentTimeHour));
  if (startIndex === -1) startIndex = 0;

  const hourly = rawHourlyTimes.slice(startIndex, startIndex + 24).map((timeStr, idx) => {
    const originalIdx = startIndex + idx;
    return {
      time: timeStr,
      temperature: Math.round(json.hourly.temperature_2m?.[originalIdx] ?? current.temperature),
      precipitationProbability: Math.round(json.hourly.precipitation_probability?.[originalIdx] ?? 0),
      precipitation: json.hourly.precipitation?.[originalIdx] ?? 0,
      weatherCode: json.hourly.weather_code?.[originalIdx] ?? 0,
      windSpeed: Math.round(json.hourly.wind_speed_10m?.[originalIdx] ?? 0),
      uvIndex: Math.round(json.hourly.uv_index?.[originalIdx] ?? 0),
    };
  });

  // Process next 7 daily points
  const rawDailyTimes: string[] = json.daily?.time || [];
  const daily = rawDailyTimes.slice(0, 7).map((dateStr, i) => ({
    date: dateStr,
    weatherCode: json.daily.weather_code?.[i] ?? 0,
    tempMax: Math.round(json.daily.temperature_2m_max?.[i] ?? current.temperature),
    tempMin: Math.round(json.daily.temperature_2m_min?.[i] ?? current.temperature),
    precipitationSum: Math.round((json.daily.precipitation_sum?.[i] ?? 0) * 10) / 10,
    precipitationProbabilityMax: Math.round(json.daily.precipitation_probability_max?.[i] ?? 0),
    windSpeedMax: Math.round(json.daily.wind_speed_10m_max?.[i] ?? 0),
    uvIndexMax: Math.round(json.daily.uv_index_max?.[i] ?? 0),
    sunrise: json.daily.sunrise?.[i] ? json.daily.sunrise[i].slice(11, 16) : '06:00',
    sunset: json.daily.sunset?.[i] ? json.daily.sunset[i].slice(11, 16) : '18:30',
  }));

  return {
    location: loc,
    current,
    hourly,
    daily,
    lastUpdated: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
}

// Convert wind direction degrees to compass label
export function getWindDirectionLabel(deg: number): string {
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(deg / 45) % 8;
  return directions[index];
}

// Calculate Agricultural Suitability in the user's selected language
export function evaluateAgriculturalSuitability(
  data: FullWeatherData,
  cropName: string,
  lang: LanguageCode
): ActivitySuitability[] {
  const current = data.current;
  const next12hRainMax = Math.max(
    ...data.hourly.slice(0, 12).map((h) => h.precipitationProbability),
    0
  );
  const next24hPrecipSum = data.daily[0]?.precipitationSum || 0;

  // 1. Spraying evaluation
  let sprayRating: 'optimal' | 'moderate' | 'unfavorable' = 'optimal';
  let sprayScore = 90;
  let sprayReason = '';

  if (current.windSpeed > 20) {
    sprayRating = 'unfavorable';
    sprayScore = 20;
    if (lang === 'ur') sprayReason = `ہوا کی رفتار بہت تیز ہے (${current.windSpeed} کلومیٹر فی گھنٹہ)۔ دوا اڑ جانے کا خطرہ ہے۔`;
    else if (lang === 'hi') sprayReason = `हवा की गति बहुत तेज है (${current.windSpeed} किमी/घंटा)। दवा के उड़ने का खतरा है।`;
    else if (lang === 'te') sprayReason = `గాలి వేగం ఎక్కువగా ఉంది (${current.windSpeed} km/h). మందు గాల్లోకి కొట్టుకుపోయే ప్రమాదం ఉంది.`;
    else if (lang === 'kn') sprayReason = `ಗಾಳಿಯ ವೇಗ ತುಂಬಾ ಹೆಚ್ಚಾಗಿದೆ (${current.windSpeed} km/h). ಔಷಧ ಹಾರಿಹೋಗುವ ಅಪಾಯವಿದೆ.`;
    else sprayReason = `High wind speed (${current.windSpeed} km/h). Severe risk of pesticide drift.`;
  } else if (current.windSpeed > 14) {
    sprayRating = 'moderate';
    sprayScore = 55;
    if (lang === 'ur') sprayReason = `ہوا کی رفتار درمیانی ہے (${current.windSpeed} کلومیٹر فی گھنٹہ)۔ احتیاط سے چھڑکاؤ کریں۔`;
    else if (lang === 'hi') sprayReason = `हवा मध्यम है (${current.windSpeed} किमी/घंटा)। सावधानी से छिड़काव करें।`;
    else if (lang === 'te') sprayReason = `గాలి మోస్తరుగా ఉంది (${current.windSpeed} km/h). జాగ్రత్తగా పిచికారీ చేయండి.`;
    else if (lang === 'kn') sprayReason = `ಸಾಧಾರಣ ಗಾಳಿ ಬೀಸುತ್ತಿದೆ (${current.windSpeed} km/h). ಎಚ್ಚರಿಕೆಯಿಂದ ಸಿಂಪಡಿಸಿ.`;
    else sprayReason = `Moderate wind (${current.windSpeed} km/h). Exercise care with nozzle drift.`;
  } else if (next12hRainMax > 50 || current.precipitation > 0) {
    sprayRating = 'unfavorable';
    sprayScore = 25;
    if (lang === 'ur') sprayReason = `بارش کا اندیشہ ہے (${next12hRainMax} فیصد)۔ دوا بارش کے پانی میں بہہ سکتی ہے۔`;
    else if (lang === 'hi') sprayReason = `बारिश की संभावना अधिक है (${next12hRainMax}%)। दवा धुलने का खतरा है।`;
    else if (lang === 'te') sprayReason = `వర్షం పడే అవకాశం ఉంది (${next12hRainMax}%). మందు కొట్టుకుపోయే ప్రమాదం ఉంది.`;
    else if (lang === 'kn') sprayReason = `ಮಳೆಯ ಸಾಧ್ಯತೆ ಹೆಚ್ಚಿದೆ (${next12hRainMax}%). ಔಷಧ ತೊಳೆದುಹೋಗುವ ಅಪಾಯವಿದೆ.`;
    else sprayReason = `High rain chance (${next12hRainMax}%). Spray will be washed off by rain.`;
  } else {
    if (lang === 'ur') sprayReason = 'ہوا اور موسم کی حالت دوا کے چھڑکاؤ کے لیے بالکل موزوں ہے۔ صبح یا شام کو کریں۔';
    else if (lang === 'hi') sprayReason = 'हवा और मौसम छिड़काव के लिए बहुत अनुकूल है। सुबह या शाम के समय करें।';
    else if (lang === 'te') sprayReason = 'గాలి మరియు వాతావరణం మందుల పిచికారీకి అనుకూలంగా ఉంది. ఉదయం చేయండి.';
    else if (lang === 'kn') sprayReason = 'ಗಾಳಿ ಮತ್ತು ಹವಾಮಾನವು ಔಷಧ ಸಿಂಪರಣೆಗೆ ಅತ್ಯುತ್ತಮವಾಗಿದೆ. ಮುಂಜಾನೆ ಸಿಂಪಡಿಸಿ.';
    else sprayReason = 'Ideal wind and weather conditions for chemical spraying. Apply early morning or evening.';
  }

  // 2. Irrigation evaluation
  let irrRating: 'optimal' | 'moderate' | 'unfavorable' = 'optimal';
  let irrScore = 85;
  let irrReason = '';

  if (next24hPrecipSum > 10 || next12hRainMax > 65) {
    irrRating = 'unfavorable';
    irrScore = 20;
    if (lang === 'ur') irrReason = `بارش متوقع ہے (${next24hPrecipSum} ملی میٹر)۔ کھیت میں پانی کھڑا ہونے سے بچنے کے لیے ابھی پانی نہ دیں۔`;
    else if (lang === 'hi') irrReason = `बारिश होने वाली है (${next24hPrecipSum} मिमी)। जलभराव से बचने के लिए अभी सिंचाई रोकें।`;
    else if (lang === 'te') irrReason = `వర్షం పడే అవకాశం ఉంది (${next24hPrecipSum} mm). నీరు నిల్వ ఉండకుండా ఉండటానికి సాగునీరు ఆపండి.`;
    else if (lang === 'kn') irrReason = `ಮಳೆಯ ಮುನ್ಸೂಚನೆ ಇದೆ (${next24hPrecipSum} mm). ನೀರು ನಿಲ್ಲುವುದನ್ನು ತಪ್ಪಿಸಲು ನೀರಾವರಿ ಮುಂದೂಡಿ.`;
    else irrReason = `Rain forecast (${next24hPrecipSum} mm). Delay irrigation to prevent waterlogging.`;
  } else if (current.temperature > 37 && current.relativeHumidity < 30) {
    irrRating = 'optimal';
    irrScore = 95;
    if (lang === 'ur') irrReason = `گرمی اور خشکی زیادہ ہے (${current.temperature} ڈگری)۔ پودوں کو نمی کے لیے پانی دینا ضروری ہے۔`;
    else if (lang === 'hi') irrReason = `गर्मी और शुष्कता अधिक है (${current.temperature}°C)। फसल को पर्याप्त पानी दें।`;
    else if (lang === 'te') irrReason = `ఎండ తీవ్రత ఎక్కువగా ఉంది (${current.temperature}°C). పంటకు తగినంత నీరు అందించండి.`;
    else if (lang === 'kn') irrReason = `ಬಿಸಿಲು ಮತ್ತು ಒಣ ಹವೆ ಹೆಚ್ಚಾಗಿದೆ (${current.temperature}°C). ಬೆಳೆಗೆ ಅಗತ್ಯ ನೀರುಣಿಸಿ.`;
    else irrReason = `High heat (${current.temperature}°C) and low humidity. Ensure adequate irrigation.`;
  } else {
    if (lang === 'ur') irrReason = 'معمول کے مطابق کھیت کو پانی دیا جا سکتا ہے۔';
    else if (lang === 'hi') irrReason = 'सामान्य आवश्यकतानुसार खेत में पानी दे सकते हैं।';
    else if (lang === 'te') irrReason = 'సాధారణ అవసరాలకు అనుగుಣంగా పొలానికి నీరు పెట్టవచ్చు.';
    else if (lang === 'kn') irrReason = 'ಸಾಮಾನ್ಯ ನಿಯಮದಂತೆ ಹೊಲಕ್ಕೆ ನೀರುಣಿಸಬಹುದು.';
    else irrReason = 'Normal watering schedule is suitable. No heavy precipitation expected.';
  }

  // 3. Harvesting evaluation
  let harvRating: 'optimal' | 'moderate' | 'unfavorable' = 'optimal';
  let harvScore = 90;
  let harvReason = '';

  if (current.precipitation > 0 || next12hRainMax > 45) {
    harvRating = 'unfavorable';
    harvScore = 25;
    if (lang === 'ur') harvReason = 'بارش کا امکان ہے۔ کٹائی یا کھلے میں فصل سکھانا نقصان دہ ہو سکتا ہے۔';
    else if (lang === 'hi') harvReason = 'बारिश की संभावना है। फसल कटाई या खुले में सुखाना नुकसानदेह हो सकता है।';
    else if (lang === 'te') harvReason = 'వర్షం ముప్పు ఉంది. పంట కోత లేదా ఆరబెట్టడం వల్ల నష్టం జరగవచ్చు.';
    else if (lang === 'kn') harvReason = 'ಮಳೆಯ ಸಾಧ್ಯತೆ ಇದೆ. ಬೆಳೆ ಕಟಾವು ಅಥವಾ ಒಣಗಿಸುವುದು ನಷ್ಟಕ್ಕೆ ಕಾರಣವಾಗಬಹುದು.';
    else harvReason = 'Rain threat. Reaping or open-air grain drying risks moisture spoil.';
  } else {
    if (lang === 'ur') harvReason = 'آسمان صاف ہے اور موسم کٹائی اور سکھانے کے لیے بہت موافق ہے۔';
    else if (lang === 'hi') harvReason = 'आसमान साफ है। फसल कटाई और सुखाने के लिए मौसम बहुत अच्छा है।';
    else if (lang === 'te') harvReason = 'ఆకాశం నిర్మలంగా ఉంది. పంట కోత మరియు ఆరబెట్టడానికి అనుకూలం.';
    else if (lang === 'kn') harvReason = 'ಆಕಾಶ ಸ್ವಚ್ಛವಾಗಿದೆ. ಬೆಳೆ ಕಟಾವು ಮತ್ತು ಒಣಗಿಸಲು ಹವಾಮಾನ ಉತ್ತಮವಾಗಿದೆ.';
    else harvReason = 'Clear skies. Optimal conditions for field harvesting and drying.';
  }

  // 4. Sowing evaluation
  let sowRating: 'optimal' | 'moderate' | 'unfavorable' = 'optimal';
  let sowScore = 80;
  let sowReason = '';

  if (current.temperature > 42 || current.temperature < 8) {
    sowRating = 'unfavorable';
    sowScore = 30;
    if (lang === 'ur') sowReason = 'درجہ حرارت حد سے زیادہ ہے جس سے بیج کے اگنے میں رکاوٹ آ سکتی ہے۔';
    else if (lang === 'hi') sowReason = 'तापमान प्रतिकूल है जिससे बीज अंकुरण प्रभावित हो सकता है।';
    else if (lang === 'te') sowReason = 'ఉష్ణోగ్రత ప్రతికూలంగా ఉంది, విత్తన మొలకకు ఆటంకం కలగవచ్చు.';
    else if (lang === 'kn') sowReason = 'ತಾಪಮಾನ ಪ್ರತಿಕೂಲವಾಗಿದೆ, ಬೀಜ ಮೊಳಕೆಯೊಡೆಯುವುದು ಕಷ್ಟವಾಗಬಹುದು.';
    else sowReason = `Extreme temperature (${current.temperature}°C) impairs seedling germination.`;
  } else {
    if (lang === 'ur') sowReason = 'مٹی کی نمی اور درجہ حرارت بیج بونے کے لیے موافق ہیں۔';
    else if (lang === 'hi') sowReason = 'मिट्टी की नमी और तापमान बुवाई के लिए पूरी तरह अनुकूल हैं।';
    else if (lang === 'te') sowReason = 'నేలలో తేమ మరియు ఉష్ణోగ్రత విత్తనాలు నాటడానికి అనుకూలంగా ఉన్నాయి.';
    else if (lang === 'kn') sowReason = 'ಮಣ್ಣಿನ ತೇವಾಂಶ ಮತ್ತು ತಾಪಮಾನವು ಬಿತ್ತನೆಗೆ ಅತ್ಯಂತ ಸೂಕ್ತವಾಗಿದೆ.';
    else sowReason = 'Conducive soil temperature and ambient moisture for seed drilling.';
  }

  return [
    { activity: 'spraying', rating: sprayRating, score: sprayScore, reasonKey: 'spraying', details: sprayReason },
    { activity: 'irrigation', rating: irrRating, score: irrScore, reasonKey: 'irrigation', details: irrReason },
    { activity: 'harvesting', rating: harvRating, score: harvScore, reasonKey: 'harvesting', details: harvReason },
    { activity: 'sowing', rating: sowRating, score: sowScore, reasonKey: 'sowing', details: sowReason },
  ];
}

// Compute Safety Alerts derived objectively from thresholds in the user's language
export function evaluateSafetyAdvisories(data: FullWeatherData, lang: LanguageCode): WeatherAlertNotice[] {
  const alerts: WeatherAlertNotice[] = [];
  const current = data.current;
  const todayRainMax = data.daily[0]?.precipitationSum || 0;
  const maxWindSpeed = Math.max(current.windSpeed, data.daily[0]?.windSpeedMax || 0);
  const maxTemp = data.daily[0]?.tempMax || current.temperature;

  // 1. Heatwave Warning
  if (maxTemp >= 44) {
    const titles: Record<LanguageCode, string> = {
      ur: 'شدید لو اور گرمی کی وارننگ',
      hi: 'भीषण लू व गर्मी की चेतावनी',
      te: 'తీవ్రమైన వడಗಾడ్పు హెచ్చరిక',
      kn: 'ತೀವ್ರ ಬಿಸಿಗಾಳಿ ಎಚ್ಚರಿಕೆ',
      en: 'Severe Heatwave Warning (Threshold Alert)',
    };
    const descs: Record<LanguageCode, string> = {
      ur: `درجہ حرارت ${maxTemp} ڈگری تک پہنچنے کا اندیشہ ہے۔ دوپہر 11:30 سے 3:30 تک کھیت میں سخت دھوپ سے بچیں۔ جانوروں کو سائے میں رکھیں۔`,
      hi: `तापमान ${maxTemp}°C तक पहुंचने का अनुमान है। दोपहर 11:30 से 3:30 बजे तक धूप में सीधे काम से बचें। मवेशियों को छाया व पानी दें।`,
      te: `ఉష్ణోగ్రత ${maxTemp}°C కి చేరే అవకాశం ఉంది. మధ్యాహ్నం వేళ ఎండలో పని చేయడం మానుకోండి. పశువులకు నీడ కల్పించండి.`,
      kn: `ತಾಪಮಾನ ${maxTemp}°C ತಲುಪುವ ಸಾಧ್ಯತೆಯಿದೆ. ಮಧ್ಯಾಹ್ನ ಬಿಸಿಲಿನಲ್ಲಿ ಕೆಲಸ ಮಾಡಬೇಡಿ. ಜಾನುವಾರುಗಳಿಗೆ ನೆರಳು ಮತ್ತು ನೀರು ನೀಡಿ.`,
      en: `Extreme temperatures reaching ${maxTemp}°C. Severe threat of heat exhaustion. Avoid direct labor during midday hours.`,
    };
    alerts.push({
      severity: 'red',
      title: titles[lang],
      description: descs[lang],
      source: `Peak Temp: ${maxTemp}°C`,
      parameter: `${maxTemp}°C`,
      isDerivedFromForecast: true,
    });
  } else if (maxTemp >= 40) {
    const titles: Record<LanguageCode, string> = {
      ur: 'گرمی اور لو کا انتباہ',
      hi: 'तेज धूप व लू की सावधानी',
      te: 'ఎండ తీవ్రత హెచ్చరిక',
      kn: 'ಬಿಸಿಲಿನ ತೀವ್ರತೆ ಎಚ್ಚರಿಕೆ',
      en: 'Heatwave Advisory (Threshold Alert)',
    };
    const descs: Record<LanguageCode, string> = {
      ur: `درجہ حرارت ${maxTemp} ڈگری رہے گا۔ کسان پانی اور لیموں پانی کا استعمال بڑھائیں اور مویشیوں کا خیال رکھیں۔`,
      hi: `तापमान ${maxTemp}°C तक जा सकता है। पानी और ओआरएस पिएं और धूप से बचाव रखें।`,
      te: `ఉష్ణోగ్రత ${maxTemp}°C కి చేరవచ్చు. తగినంత మంచినీరు తాగి ఎండదెబ్బ తగలకుండా జాగ్రత్తపడండి.`,
      kn: `ತಾಪಮಾನ ${maxTemp}°C ಮುಟ್ಟಬಹುದು. ಸಾಕಷ್ಟು ನೀರು, ಮಜ್ಜಿಗೆ ಕುಡಿದು ಜಾಗರೂಕರಾಗಿರಿ.`,
      en: `High temperatures expected to peak at ${maxTemp}°C. Maintain hydration and seek shade.`,
    };
    alerts.push({
      severity: 'orange',
      title: titles[lang],
      description: descs[lang],
      source: `Peak Temp: ${maxTemp}°C`,
      parameter: `${maxTemp}°C`,
      isDerivedFromForecast: true,
    });
  }

  // 2. Heavy Rainfall / Flood Caution
  if (todayRainMax >= 65 || current.precipitation >= 20) {
    const titles: Record<LanguageCode, string> = {
      ur: 'بھاری بارش اور پانی بھرنے کا انتباہ',
      hi: 'भारी बारिश व जलभराव की चेतावनी',
      te: 'భారీ వర్షం మరియు వరద ముప్పు హెచ్చరిక',
      kn: 'ಭಾರೀ ಮಳೆ ಮತ್ತು ಪ್ರವಾಹ ಎಚ್ಚರಿಕೆ',
      en: 'Heavy Rainfall & Waterlogging Caution',
    };
    const descs: Record<LanguageCode, string> = {
      ur: `تقریباً ${todayRainMax} ملی میٹر بارش متوقع ہے۔ نچلے کھیتوں سے پانی کے نکاس کا انتظام کریں اور مویشیوں کو محفوظ اونچی جگہ منتقل کریں۔`,
      hi: `लगभग ${todayRainMax} मिमी बारिश का अनुमान है। निचले खेतों में जल निकासी की व्यवस्था करें और मवेशियों को सुरक्षित स्थान पर ले जाएं।`,
      te: `సుమారు ${todayRainMax} mm వర్షం కురిసే అవకాశం ఉంది. పొలాల్లో నీటి నిల్వ తొలగించండి, పశువులను ఎತ್ತైన ప్రదేశాలకు తరలించండి.`,
      kn: `ಸುಮಾರು ${todayRainMax} mm ಮಳೆಯಾಗುವ ಸಾಧ್ಯತೆಯಿದೆ. ಹೊಲಗಳಲ್ಲಿ ನೀರು ಸರಾಗವಾಗಿ ಹರಿಯಲು ದಾರಿ ಮಾಡಿ, ಜಾನುವಾರುಗಳನ್ನು ಸುರಕ್ಷಿತ ಸ್ಥಳಕ್ಕೆ ಸಾಗಿಸಿ.`,
      en: `Estimated ${todayRainMax} mm rainfall. Ensure drainage in low fields and move livestock to higher ground.`,
    };
    alerts.push({
      severity: 'red',
      title: titles[lang],
      description: descs[lang],
      source: `Rain: ${todayRainMax} mm`,
      parameter: `${todayRainMax} mm`,
      isDerivedFromForecast: true,
    });
  } else if (todayRainMax >= 25) {
    const titles: Record<LanguageCode, string> = {
      ur: 'درمیانی سے تیز بارش کا امکان',
      hi: 'मध्यम से तेज बारिश की संभावना',
      te: 'మోస్తరు నుండి భారీ వర్ష సూచన',
      kn: 'ಸಾಧಾರಣದಿಂದ ಬಿರುಸಾದ ಮಳೆ ಸೂಚನೆ',
      en: 'Moderate to Heavy Rain Precaution',
    };
    const descs: Record<LanguageCode, string> = {
      ur: `${todayRainMax} ملی میٹر تک بارش ہو سکتی ہے۔ کٹی ہوئی فصل کو ڈھانپ کر رکھیں اور کھلے اناج کی حفاظت کریں۔`,
      hi: `${todayRainMax} मिमी तक बारिश हो सकती है। कटी फसल को सुरक्षित ढकें और अनाज को भीगने से बचाएं।`,
      te: `${todayRainMax} mm వరకు వర్షం కురవవచ్చు. కోసిన పంటను సురక్షితంగా కప్పి ఉంచండి.`,
      kn: `${todayRainMax} mm ವರೆಗೆ ಮಳೆಯಾಗಬಹುದು. ಕಟಾವು ಮಾಡಿದ ಬೆಳೆಗಳನ್ನು ಸುರಕ್ಷಿತವಾಗಿ ಮುಚ್ಚಿಡಿ.`,
      en: `Expected ${todayRainMax} mm rainfall. Keep harvested grains covered.`,
    };
    alerts.push({
      severity: 'yellow',
      title: titles[lang],
      description: descs[lang],
      source: `Rain: ${todayRainMax} mm`,
      parameter: `${todayRainMax} mm`,
      isDerivedFromForecast: true,
    });
  }

  // 3. High Wind / Gale Alert
  if (maxWindSpeed >= 45) {
    const titles: Record<LanguageCode, string> = {
      ur: 'تیز آندھی اور جھکڑ کا انتباہ',
      hi: 'तेज आंधी व तूफानी हवा की चेतावनी',
      te: 'తీవ్ర ఈదురు గాలుల హెచ్చరిక',
      kn: 'ತೀವ್ರ ಬಿರುಗಾಳಿ ಎಚ್ಚರಿಕೆ',
      en: 'High Wind / Gale Advisory',
    };
    const descs: Record<LanguageCode, string> = {
      ur: `ہوا کی رفتار ${maxWindSpeed} کلومیٹر فی گھنٹہ تک پہنچ سکتی ہے۔ ٹین کے چھپر اور ترپالیں باندھ لیں اور لمبے پودوں کو سہارا دیں۔`,
      hi: `हवा की गति ${maxWindSpeed} किमी/घंटा तक जा सकती है। टीन शेड व तिरपाल मजबूती से बांधें और कमजोर पौधों को सहारा दें।`,
      te: `గాలి వేగం ${maxWindSpeed} km/h కి చేరవచ్చు. రేకుల షెడ్లను భద్రపరచండి, ఎత్తైన పంటలకు మద్దతు ఇవ్వండి.`,
      kn: `ಗಾಳಿಯ ವೇಗ ${maxWindSpeed} km/h ತಲುಪಬಹುದು. ತಗಡಿನ ಶೆಡ್‌ಗಳನ್ನು ಭದ್ರಪಡಿಸಿ, ಎತ್ತರದ ಬೆಳೆಗಳಿಗೆ ಆಸರೆ ನೀಡಿ.`,
      en: `Wind gusts reaching ${maxWindSpeed} km/h. Secure loose sheets and thatch.`,
    };
    alerts.push({
      severity: 'orange',
      title: titles[lang],
      description: descs[lang],
      source: `Wind: ${maxWindSpeed} km/h`,
      parameter: `${maxWindSpeed} km/h`,
      isDerivedFromForecast: true,
    });
  }

  // 4. Thunderstorm / Lightning
  if ([95, 96, 99].includes(current.weatherCode)) {
    const titles: Record<LanguageCode, string> = {
      ur: 'آسمانی بجلی اور گرج چمک کا خطرہ',
      hi: 'आकाशीय बिजली व आंधी का गंभीर खतरा',
      te: 'పిడుగుపాటు మరియు ఉరుముల తీవ్ర ముప్పు',
      kn: 'ಸಿಡಿಲು ಮತ್ತು ಗುಡುಗು ಬಿರುಗಾಳಿಯ ಗಂಭೀರ ಅಪಾಯ',
      en: 'Active Thunderstorm & Lightning Hazard',
    };
    const descs: Record<LanguageCode, string> = {
      ur: 'علاقے میں بجلی کڑک رہی ہے۔ اکیلے اونچے درختوں کے نیچے کھڑے نہ ہوں۔ فوری طور پر پکے مکان میں پناہ لیں۔',
      hi: 'बिजली गिरने का खतरा है। पेड़ या बिजली के खंभे के नीचे खड़े न हों। तुरंत पक्के मकान में जाएं।',
      te: 'పిడుగులు పడే ప్రమాదం ఉంది. చెట్ల కింద నిలబడవద్దు. వెంటనే పక్కా భవనంలోకి వెళ్ళండి.',
      kn: 'ಸಿಡಿಲು ಬಡಿಯುವ ಅಪಾಯವಿದೆ. ಮರದ ಕೆಳಗೆ ನಿಲ್ಲಬೇಡಿ. ತಕ್ಷಣ ಪಕ್ಕಾ ಕಟ್ಟಡದೊಳಗೆ ಆಶ್ರಯ ಪಡೆಯಿರಿ.',
      en: 'Electrical storm active. Never shelter under lone trees. Seek indoor pucca shelter immediately.',
    };
    alerts.push({
      severity: 'red',
      title: titles[lang],
      description: descs[lang],
      source: 'WMO 95-99',
      parameter: `Code ${current.weatherCode}`,
      isDerivedFromForecast: false,
    });
  }

  return alerts;
}
