export type LanguageCode = 'ur' | 'hi' | 'te' | 'kn' | 'en';

export interface LocationData {
  name: string;
  state?: string;
  district?: string;
  subdistrict?: string;
  type?: 'village' | 'town' | 'city' | 'district' | 'state' | 'ut' | 'gps';
  country: string;
  latitude: number;
  longitude: number;
  timezone?: string;
  isGps?: boolean;
}

export interface CurrentWeather {
  temperature: number;
  apparentTemperature: number;
  relativeHumidity: number;
  precipitation: number;
  weatherCode: number;
  windSpeed: number;
  windDirection: number;
  windGusts?: number;
  pressure: number;
  cloudCover: number;
  isDay: boolean;
  time: string;
}

export interface HourlyForecastItem {
  time: string;
  temperature: number;
  precipitationProbability: number;
  precipitation: number;
  weatherCode: number;
  windSpeed: number;
  uvIndex: number;
}

export interface DailyForecastItem {
  date: string;
  weatherCode: number;
  tempMax: number;
  tempMin: number;
  precipitationSum: number;
  precipitationProbabilityMax: number;
  windSpeedMax: number;
  uvIndexMax: number;
  sunrise: string;
  sunset: string;
}

export interface FullWeatherData {
  location: LocationData;
  current: CurrentWeather;
  hourly: HourlyForecastItem[];
  daily: DailyForecastItem[];
  lastUpdated: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  model?: string;
}

export interface CropInfo {
  id: string;
  name: Record<LanguageCode, string>;
  category: string;
  idealTempMin: number;
  idealTempMax: number;
  rainSensitivity: 'high' | 'medium' | 'low';
  windSensitivity: 'high' | 'medium' | 'low';
}

export interface ActivitySuitability {
  activity: 'spraying' | 'irrigation' | 'harvesting' | 'sowing';
  rating: 'optimal' | 'moderate' | 'unfavorable';
  score: number; // 0 to 100
  reasonKey: string;
  details: string;
}

export interface WeatherAlertNotice {
  severity: 'green' | 'yellow' | 'orange' | 'red';
  title: string;
  description: string;
  source: string;
  parameter: string;
  isDerivedFromForecast: boolean;
}

export interface IVRStatusResponse {
  connected: boolean;
  provider: 'twilio' | 'exotel' | 'none';
  phoneNumber: string | null;
  message: string;
  setupInstructions: string[];
}
