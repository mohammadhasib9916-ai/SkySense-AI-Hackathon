import { LanguageCode, FullWeatherData, ChatMessage } from '../types';

export interface AIStatusResponse {
  configured: boolean;
  model: string;
  keyHint?: string | null;
  verified?: boolean;
}

export interface AIChatResponse {
  success: boolean;
  reply?: string;
  error?: string;
  configured?: boolean;
  model?: string;
  provider?: string;
  troubleshooting?: string[];
}

export interface AITestResponse {
  verified: boolean;
  model?: string;
  reply?: string;
  error?: string;
  message?: string;
}

// Check if Nebius server credentials are ready
export async function checkAIHealth(): Promise<AIStatusResponse> {
  try {
    const res = await fetch('/api/health');
    if (!res.ok) throw new Error(`Health check returned ${res.status}`);
    const data = await res.json();
    return {
      configured: Boolean(data?.nebius?.configured),
      model: data?.nebius?.model || 'nvidia/Nemotron-3_5-Lightning',
    };
  } catch (err) {
    console.warn('AI health check failed:', err);
    return {
      configured: false,
      model: 'nvidia/Nemotron-3_5-Lightning',
    };
  }
}

// Test live connectivity to Nebius Token Factory
export async function testNebiusConnection(): Promise<AITestResponse> {
  try {
    const res = await fetch('/api/ai/test-connection', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    return {
      verified: Boolean(data.verified),
      model: data.model,
      reply: data.reply,
      error: data.error,
      message: data.message,
    };
  } catch (err: any) {
    return {
      verified: false,
      error: err.message || 'Failed to communicate with local server.',
    };
  }
}

// Send chat message with full live weather context
export async function sendChatMessage(
  messages: Array<{ role: string; content: string }>,
  weatherData: FullWeatherData | null,
  language: LanguageCode,
  signal?: AbortSignal
): Promise<AIChatResponse> {
  let weatherContext = null;
  if (weatherData) {
    weatherContext = {
      location: `${weatherData.location.name}${weatherData.location.state ? ', ' + weatherData.location.state : ''}`,
      coordinates: `${weatherData.location.latitude.toFixed(2)}, ${weatherData.location.longitude.toFixed(2)}`,
      temp: weatherData.current.temperature,
      apparentTemp: weatherData.current.apparentTemperature,
      condition: `WMO Code ${weatherData.current.weatherCode}`,
      humidity: weatherData.current.relativeHumidity,
      windSpeed: weatherData.current.windSpeed,
      windDirection: `${weatherData.current.windDirection}°`,
      precipitation: weatherData.current.precipitation,
      precipProbability: weatherData.hourly[0]?.precipitationProbability ?? 0,
      uvIndex: weatherData.daily[0]?.uvIndexMax ?? 0,
      tempMin: weatherData.daily[0]?.tempMin,
      tempMax: weatherData.daily[0]?.tempMax,
      outlook24h: `Precipitation sum expected: ${weatherData.daily[0]?.precipitationSum || 0}mm, Wind peak: ${weatherData.daily[0]?.windSpeedMax || 0}km/h`,
      forecastNext2Days: weatherData.daily?.slice(1, 3).map((d, idx) => ({
        dayLabel: idx === 0 ? 'Day 1 (Tomorrow)' : 'Day 2 (Day after tomorrow)',
        date: d.date,
        tempMax: d.tempMax,
        tempMin: d.tempMin,
        precipitationSum: d.precipitationSum ?? 0,
        precipitationProbabilityMax: d.precipitationProbabilityMax ?? 0,
        windSpeedMax: d.windSpeedMax ?? 0,
        weatherCode: d.weatherCode,
      })) || [],
    };
  }

  try {
    const res = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages,
        weatherContext,
        language,
      }),
      signal,
    });

    const data = await res.json();
    if (!res.ok) {
      return {
        success: false,
        configured: data.configured ?? false,
        model: data.model,
        error: data.error || `Server returned error HTTP ${res.status}`,
        troubleshooting: data.troubleshooting,
      };
    }

    return {
      success: true,
      configured: true,
      reply: data.reply,
      model: data.model,
      provider: data.provider,
    };
  } catch (err: any) {
    return {
      success: false,
      error: err.name === 'AbortError' ? 'Request was aborted or timed out.' : err.message || 'Network error',
    };
  }
}
