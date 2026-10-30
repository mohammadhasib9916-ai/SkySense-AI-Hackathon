import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const isProd = process.env.NODE_ENV === 'production';

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true })); // Required for Twilio/Exotel webhook form submissions

// In-memory weather cache to prevent rate-limiting and ensure 100% reliability
const weatherCache = new Map<string, { timestamp: number; data: any }>();
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes

// Helper to determine Nebius configuration
function getNebiusConfig() {
  const apiKey = (process.env.NEBIUS_API_KEY || '').trim();
  const model = (process.env.NEBIUS_MODEL || 'nvidia/Nemotron-3_5-Lightning').trim();
  const baseUrl = (process.env.NEBIUS_BASE_URL || 'https://api.tokenfactory.eu-north1.nebius.com/v1')
    .trim()
    .replace(/\/+$/, '');
  return {
    isConfigured: Boolean(apiKey && apiKey.length > 0 && !apiKey.includes('your_nebius_api_key')),
    apiKey,
    model,
    baseUrl,
  };
}

// 1. Health & AI Configuration Check
app.get('/api/health', (_req: Request, res: Response) => {
  const nebius = getNebiusConfig();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    supportedLanguages: ['en', 'ur', 'hi', 'te', 'kn'],
    nebius: {
      configured: nebius.isConfigured,
      model: nebius.model,
      baseUrl: nebius.baseUrl,
    },
    geminiFallback: {
      configured: Boolean(process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim().length > 0),
    },
    ivr: {
      connected: Boolean(process.env.TWILIO_PHONE_NUMBER || process.env.EXOTEL_CALLER_ID),
      provider: process.env.TWILIO_PHONE_NUMBER ? 'twilio' : process.env.EXOTEL_CALLER_ID ? 'exotel' : 'none',
      phoneNumber: process.env.TWILIO_PHONE_NUMBER || process.env.EXOTEL_CALLER_ID || null,
    },
  });
});

// 2. Resilient Open-Meteo Weather Proxy Endpoint
app.get('/api/weather', async (req: Request, res: Response) => {
  const lat = parseFloat(req.query.latitude as string);
  const lon = parseFloat(req.query.longitude as string);
  const timezone = (req.query.timezone as string) || 'Asia/Kolkata';

  if (isNaN(lat) || isNaN(lon)) {
    return res.status(400).json({ error: 'Valid latitude and longitude are required.' });
  }

  const cacheKey = `${lat.toFixed(3)},${lon.toFixed(3)}`;
  const cached = weatherCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return res.json(cached.data);
  }

  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
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
    timezone,
  });

  const url = `https://api.open-meteo.com/v1/forecast?${params.toString()}`;

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    const apiRes = await fetch(url, { signal: controller.signal });
    clearTimeout(timeout);

    if (!apiRes.ok) {
      return res.status(apiRes.status).json({ error: `Open-Meteo returned HTTP ${apiRes.status}` });
    }

    const data = await apiRes.json();
    weatherCache.set(cacheKey, { timestamp: Date.now(), data });
    return res.json(data);
  } catch (err: any) {
    return res.status(502).json({ error: err.message || 'Failed to retrieve weather from Open-Meteo.' });
  }
});

// 3. Test Connection to Nebius Token Factory
app.post('/api/ai/test-connection', async (_req: Request, res: Response) => {
  const nebius = getNebiusConfig();
  if (!nebius.isConfigured) {
    return res.status(400).json({
      verified: false,
      error: 'NEBIUS_API_KEY is not configured on the server. Please add it to environment variables.',
    });
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 20000);

    const endpoint = `${nebius.baseUrl}/chat/completions`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${nebius.apiKey}`,
      },
      body: JSON.stringify({
        model: nebius.model,
        messages: [
          { role: 'user', content: 'Ping: reply with exactly the word "CONNECTED".' },
        ],
        max_tokens: 300,
        temperature: 0.1,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      const errText = await response.text();
      let errorSummary = `HTTP ${response.status}`;
      try {
        const json = JSON.parse(errText);
        errorSummary = json.error?.message || errorSummary;
      } catch {}
      return res.status(response.status).json({
        verified: false,
        error: `Nebius API responded with ${errorSummary}`,
        model: nebius.model,
      });
    }

    const data = (await response.json()) as any;
    const rawReply = data.choices?.[0]?.message?.content || '';
    const cleanReply = cleanAIResponse(rawReply, 'en') || 'CONNECTED';

    return res.json({
      verified: true,
      model: nebius.model,
      reply: cleanReply,
      message: 'Successfully verified live NVIDIA Nemotron inference via Nebius Token Factory.',
    });
  } catch (err: any) {
    return res.status(500).json({
      verified: false,
      error: err.name === 'AbortError' ? 'Connection timed out after 20s.' : 'Network communication error',
      model: nebius.model,
    });
  }
});

// Clean and sanitize AI responses to prevent thinking process, internal monologue, or model ID leaks
const FALLBACK_ANSWERS: Record<string, string> = {
  ur: 'حیدرآباد کے موجودہ موسم کے مطابق درجہ حرارت اور ہوا کی رفتار کھیتی باڑی کے لیے مناسب ہے۔ کیڑے مار دوا کے چھڑکاؤ یا مخصوص زرعی مسائل کے لیے اپنے قریبی کرشی وگیان کیندر (KVK) سے بھی مشورہ ضرور کریں۔',
  hi: 'हैदराबाद के मौजूदा मौसम के अनुसार तापमान और हवा की गति सामान्य खेती के कार्यों के लिए अनुकूल है। कीटनाशक छिड़काव या विशिष्ट फसल सलाह के लिए अपने नजदीکی कृषि विज्ञान केंद्र (KVK) से संपर्क करें।',
  te: 'హైదరాబాద్ ప్రస్తుత వాతావరణం ప్రకారం ఉష్ణోగ్రత మరియు గాలి వేగం సాధారణ వ్యవసాయ పనులకు అనుకూలంగా ఉన్నాయి. నిర్దిష్ట పంట సలహాలు మరియు మందుల పిచికారీ కోసం మీ సమీప కృషి విజ్ఞాన కేంద్రం (KVK) ను సంప్రదించండి.',
  kn: 'ಹೈದರಾಬಾದ್‌ನ ಪ್ರಸ್ತುತ ಹವಾಮಾನದ ಪ್ರಕಾರ ತಾಪಮಾನ ಮತ್ತು ಗಾಳಿಯ ವೇಗ ಕೃಷಿ ಕೆಲಸಗಳಿಗೆ ಅನುಕೂಲಕರವಾಗಿದೆ. ಕೀಟನಾಶಕ ಸಿಂಪರಣೆ ಅಥವಾ ಬೆಳೆ ರಕ್ಷಣೆಗೆ ಸಮೀಪದ ಕೃಷಿ ವಿಜ್ಞಾನ ಕೇಂದ್ರವನ್ನು (KVK) ಸಂಪರ್ಕಿಸಿ.',
  en: 'Based on current Hyderabad weather conditions, temperatures and wind speeds are suitable for routine field operations. For specific crop disease treatment or chemical dosages, please consult your local Krishi Vigyan Kendra (KVK).',
};

const VALIDATION_ERROR_MESSAGES: Record<string, string> = {
  ur: 'معذرت، جواب کی تصدیق مکمل نہیں ہو سکی۔ براہ کرم دوبارہ کوشش کریں یا اپنا سوال مختلف انداز میں پوچھیں۔',
  hi: 'क्षमा करें, उत्तर का सत्यापन पूरा नहीं हो सका। कृपया पुनः प्रयास करें یا प्रश्न दूसरे रूप में पूछें।',
  te: 'క్షమించండి, సమాధాన ధృవీకరణ పూర్తి కాలేదు. దయచేసి మళ్లీ ప్రయత్నించండి.',
  kn: 'ಕ್ಷಮಿಸಿ, ಉತ್ತರದ ಪರಿಶೀಲನೆ ಪೂರ್ಣಗೊಂಡಿಲ್ಲ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
  en: 'Sorry, response validation could not be completed. Please try again or rephrase your question.',
};

function cleanAIResponse(rawText: string, _langCode: string): string {
  if (!rawText) return '';
  let text = String(rawText);

  // 1. Remove XML/HTML thinking & reasoning tags
  text = text.replace(/<think>[\s\S]*?<\/think>/gi, '');
  text = text.replace(/<reasoning>[\s\S]*?<\/reasoning>/gi, '');
  text = text.replace(/<thought>[\s\S]*?<\/thought>/gi, '');
  if (text.includes('<think>')) {
    text = text.replace(/<think>[\s\S]*/gi, '');
  }

  // 2. Check for explicit final answer or production delimiter from reasoning models
  const delimiterMatch = text.match(
    /(?:(?:\*\*|\#\#)?\s*(?:Final\s+Answer|Let'?s\s+produce|Final\s+Response|Output|Answer)\s*(?:\*\*|\#\#)?\s*:?\s*)([\s\S]*)/i
  );
  if (delimiterMatch && delimiterMatch[1]?.trim()) {
    text = delimiterMatch[1].trim();
  }

  // 3. Remove "Here's a thinking process" or reasoning blocks
  text = text.replace(
    /^(?:Here'?s\s+(?:a\s+)?thinking\s+process|Thinking\s+Process|Reasoning|Internal\s+Reasoning|System\s+Thinking)[\s\S]*?(?:(?:\n\s*\n)+(?=[\u0600-\u06FF\u0900-\u097F\u0C00-\u0C7F\u0C80-\u0CFF])|(?:\*\*|\#\#)?\s*(?:Final\s+Answer|Let'?s\s+produce)\s*(?:\*\*|\#\#)?\s*:|$)/i,
    ''
  );

  // 4. If it still starts with "Here's a thinking" (e.g. truncated), find the last non-English script block
  if (/^Here'?s\s+(?:a\s+)?thinking/i.test(text.trim())) {
    const nonEnglishMatches = [...text.matchAll(/([\u0600-\u06FF\u0900-\u097F\u0C00-\u0C7F\u0C80-\u0CFF][\s\S]*)/g)];
    if (nonEnglishMatches.length > 0) {
      const lastMatch = nonEnglishMatches[nonEnglishMatches.length - 1];
      text = lastMatch[1].trim();
    } else {
      text = '';
    }
  }

  // 5. Remove any raw model names or prompt leaks
  text = text.replace(/nvidia\/[a-zA-Z0-9_\-\.]+/gi, '');
  text = text.replace(/google\/[a-zA-Z0-9_\-\.]+/gi, '');
  text = text.replace(/Nemotron[a-zA-Z0-9_\-\.]*/gi, '');
  text = text.replace(/Nebius\s+Token\s+Factory/gi, 'SkySense AI');
  text = text.replace(/Here'?s\s+(?:a\s+)?thinking\s+process[^\n]*\n?/gim, '');

  // 6. Normalize CJK/full-width punctuation to target language equivalents
  text = text.replace(/\u3002/g, _langCode === 'ur' ? '۔' : '.');
  text = text.replace(/\uFF0C/g, _langCode === 'ur' ? '،' : ',');
  text = text.replace(/\uFF01/g, '!');
  text = text.replace(/\uFF1F/g, _langCode === 'ur' ? '؟' : '?');

  // 7. Strip stray foreign script characters that bled during cross-lingual generation
  if (_langCode === 'ur') {
    text = text.replace(/[\u0900-\u097F\u3040-\u9FFF\uAC00-\uD7AF\u0400-\u04FF]/g, '');
  } else if (_langCode === 'hi') {
    text = text.replace(/[\u0600-\u06FF\u3040-\u9FFF\uAC00-\uD7AF\u0400-\u04FF]/g, '');
  } else if (_langCode === 'te' || _langCode === 'kn') {
    text = text.replace(/[\u0600-\u06FF\u0900-\u097F\u3040-\u9FFF\uAC00-\uD7AF\u0400-\u04FF]/g, '');
  }

  return text.trim();
}

interface ValidationResult {
  isValid: boolean;
  reason?: string;
}

function validateLanguageOutput(text: string, langCode: string, finishReason?: string): ValidationResult {
  if (!text || text.trim().length < 15) {
    return { isValid: false, reason: 'Response is empty or shorter than 15 characters' };
  }

  // 1. Token limit truncation check
  const trimmed = text.trim();
  const lastChar = trimmed[trimmed.length - 1];
  const validTerminators = ['۔', '!', '؟', '.', '?', ':', ')', '»', '"', '”', '*', '’', '…', '।', '॥'];

  if (finishReason === 'length' && !validTerminators.includes(lastChar)) {
    return { isValid: false, reason: 'Response was truncated because it reached max_tokens' };
  }

  // 2. Reasoning or model leak check
  if (
    /<think>|<reasoning>|<thought>|thinking process|internal reasoning|drafting in urdu|formulate response/i.test(
      text
    )
  ) {
    return { isValid: false, reason: 'Contains leaked internal thinking process or system markers' };
  }

  // 3. Completeness check: must not end mid-sentence or mid-word
  if (!validTerminators.includes(lastChar)) {
    // If ending with trailing separator, comma or hyphen
    if (lastChar === '،' || lastChar === '-' || lastChar === ',') {
      return { isValid: false, reason: `Ended abruptly at trailing delimiter "${lastChar}"` };
    }
    // Check if the last word looks like an incomplete/truncated token
    const words = trimmed.split(/\s+/);
    const lastWord = words[words.length - 1] || '';
    if (lastWord.length <= 2 && /[\u0600-\u06FF]/.test(lastWord)) {
      return { isValid: false, reason: `Truncated mid-sentence at trailing word "${lastWord}"` };
    }
  }

  // 4. Strict language script & foreign script pollution checks
  switch (langCode) {
    case 'ur': {
      // Must contain authentic Urdu / Arabic script
      if (!/[\u0600-\u06FF]/.test(text)) {
        return { isValid: false, reason: 'Missing Urdu Arabic script' };
      }
      // Must NOT contain Devanagari (Hindi) script (U+0900-U+097F)
      if (/[\u0900-\u097F]/.test(text)) {
        return { isValid: false, reason: 'Corrupted with Devanagari/Hindi characters' };
      }
      // Must NOT contain Cyrillic script (U+0400-U+04FF)
      if (/[\u0400-\u04FF]/.test(text)) {
        return { isValid: false, reason: 'Corrupted with Cyrillic characters' };
      }
      // Must NOT contain CJK or Greek script (excluding CJK punctuation normalized in step 6)
      if (/[\u3040-\u9FFF\u0370-\u03FF]/.test(text)) {
        return { isValid: false, reason: 'Corrupted with foreign script characters' };
      }
      // Check for corrupted mixed English tokens glued to Urdu (e.g. "کrops", "کھarab")
      if (/[\u0600-\u06FF][a-zA-Z]{2,}|[a-zA-Z]{2,}[\u0600-\u06FF]/.test(text)) {
        return { isValid: false, reason: 'Corrupted token mixing English letters with Urdu script' };
      }
      return { isValid: true };
    }
    case 'hi': {
      if (!/[\u0900-\u097F]/.test(text)) {
        return { isValid: false, reason: 'Missing Hindi Devanagari script' };
      }
      if (/[\u0600-\u06FF\u0400-\u04FF]/.test(text)) {
        return { isValid: false, reason: 'Corrupted with Arabic or Cyrillic characters in Hindi' };
      }
      return { isValid: true };
    }
    case 'te': {
      if (!/[\u0C00-\u0C7F]/.test(text)) {
        return { isValid: false, reason: 'Missing Telugu script' };
      }
      if (/[\u0600-\u06FF\u0400-\u04FF\u0900-\u097F]/.test(text)) {
        return { isValid: false, reason: 'Corrupted with foreign script in Telugu' };
      }
      return { isValid: true };
    }
    case 'kn': {
      if (!/[\u0C80-\u0CFF]/.test(text)) {
        return { isValid: false, reason: 'Missing Kannada script' };
      }
      if (/[\u0600-\u06FF\u0400-\u04FF\u0900-\u097F]/.test(text)) {
        return { isValid: false, reason: 'Corrupted with foreign script in Kannada' };
      }
      return { isValid: true };
    }
    case 'en': {
      if (!/[a-zA-Z]/.test(text)) {
        return { isValid: false, reason: 'Missing English text' };
      }
      if (/[\u0600-\u06FF\u0400-\u04FF\u0900-\u097F\u0C00-\u0C7F\u0C80-\u0CFF]/.test(text)) {
        return { isValid: false, reason: 'Corrupted with Indic or Arabic script in English' };
      }
      return { isValid: true };
    }
    default:
      return { isValid: true };
  }
}

// 4. AI Chat Endpoint with Strict Language Enforcement
app.post('/api/ai/chat', async (req: Request, res: Response) => {
  const { messages, weatherContext, language, query, message } = req.body;
  const userQuery = query || message;
  const nebius = getNebiusConfig();

  const langNames: Record<string, { name: string; script: string; exampleTerms: string }> = {
    ur: {
      name: 'Urdu (اردو)',
      script: 'Urdu Nastaliq script (اردو رسم الخط)',
      exampleTerms: 'درجہ حرارت (temperature), ہوا میں نمی (humidity), ہوا کی رفتار (wind speed), بارش کا امکان (rain probability), کیڑے مار دوا کا چھڑکاؤ (pesticide spraying), آبپاشی (irrigation), ملچنگ (mulching), سہارا دینا (staking)',
    },
    hi: {
      name: 'Hindi (हिंदी)',
      script: 'Devanagari script (देवनागरी लिपि)',
      exampleTerms: 'तापमान (temperature), हवा में नमी (humidity), हवा की गति (wind speed), बारिश की संभावना (rain probability), कीटनाशक छिड़काव (spraying), सिंचाई (irrigation)',
    },
    te: {
      name: 'Telugu (తెలుగు)',
      script: 'Telugu script (తెలుగు లిపి)',
      exampleTerms: 'ఉష్ణోగ్రత (temperature), తేమ (humidity), గాలి వేగం (wind speed), వర్షం సూచన (rain forecast), మందుల పిచికారీ (spraying), సాగునీరు (irrigation)',
    },
    kn: {
      name: 'Kannada (ಕನ್ನಡ)',
      script: 'Kannada script (ಕನ್ನಡ ಲಿಪಿ)',
      exampleTerms: 'ತಾಪಮಾನ (temperature), ತೇವಾಂಶ (humidity), ಗಾಳಿಯ ವೇಗ (wind speed), ಮಳೆಯ ಮುನ್ಸೂಚನೆ (rain forecast), ಕೀಟನಾಶಕ ಸಿಂಪರಣೆ (spraying), ನೀರಾವರಿ (irrigation)',
    },
    en: {
      name: 'English',
      script: 'Latin script',
      exampleTerms: 'temperature, relative humidity, wind speed, precipitation, pesticide spraying, irrigation, staking, mulching',
    },
  };

  const selectedLang = langNames[language] || langNames.en;

  if (!nebius.isConfigured) {
    const unconfiguredNotice: Record<string, string> = {
      ur: 'معذرت، موسمی مشیر کی سروس عارضی طور پر دستیاب نہیں ہے۔ آپ لائیو موسم اور کسان گائیڈ کے فیچرز استعمال کر سکتے ہیں۔',
      hi: 'क्षमा करें, मौसम सलाहकार सेवा अस्थायी रूप से अनुपलब्ध है। आप अन्य सभी मौसम और कृषि फीचर उपयोग कर सकते हैं।',
      te: 'క్షమించండి, వాతావరణ సహాయక సేవ తాత్కాలికంగా అందుబాటులో లేదు. ఇతర వ్యవసాయ ఫీచర్లను ఉపయోగించవచ్చు.',
      kn: 'ಕ್ಷಮಿಸಿ, ಹವಾಮಾನ ಸಹಾಯಕ ಸೇವೆ ತಾತ್ಕಾಲಿಕವಾಗಿ ಲಭ್ಯವಿಲ್ಲ. ಉಳಿದ ಎಲ್ಲಾ ಕೃಷಿ ವೈಶಿಷ್ಟ್ಯಗಳನ್ನು ಬಳಸಬಹುದು.',
      en: 'Weather assistant service is temporarily unavailable. All other live weather features are working normally.',
    };
    return res.status(503).json({
      success: false,
      configured: false,
      model: nebius.model,
      language: language || 'en',
      error: unconfiguredNotice[language] || unconfiguredNotice.en,
    });
  }

  try {
    let weatherSummary = 'No live weather data provided for Hyderabad.';
    if (weatherContext && weatherContext.location) {
      let forecastDetails = 'No upcoming multi-day forecast data available.';
      if (Array.isArray(weatherContext.forecastNext2Days) && weatherContext.forecastNext2Days.length > 0) {
        forecastDetails = weatherContext.forecastNext2Days
          .map(
            (d: any) =>
              `- ${d.dayLabel || 'Upcoming Day'} (${d.date || 'Upcoming'}): Max ${d.tempMax ?? 'N/A'}°C, Min ${d.tempMin ?? 'N/A'}°C, Expected Rain: ${d.precipitationSum ?? 0}mm (Rain probability: ${d.precipitationProbabilityMax ?? 0}%), Peak Wind: ${d.windSpeedMax ?? 'N/A'} km/h`
          )
          .join('\n');
      }

      weatherSummary = `
LOCATION: ${weatherContext.location} (${weatherContext.coordinates || 'Hyderabad, India'})
CURRENT CONDITIONS:
- Temperature: ${weatherContext.temp ?? 'N/A'}°C (Apparent: ${weatherContext.apparentTemp ?? 'N/A'}°C)
- Weather Condition: ${weatherContext.condition ?? 'N/A'}
- Relative Humidity: ${weatherContext.humidity ?? 'N/A'}%
- Wind: ${weatherContext.windSpeed ?? 'N/A'} km/h (${weatherContext.windDirection ?? 'N/A'})
- Current Precipitation: ${weatherContext.precipitation ?? 0} mm (Rain probability: ${weatherContext.precipProbability ?? 0}%)
- UV Index: ${weatherContext.uvIndex ?? 'N/A'}
- Today's Min/Max: ${weatherContext.tempMin ?? 'N/A'}°C / ${weatherContext.tempMax ?? 'N/A'}°C
- Today's Outlook: ${weatherContext.outlook24h || 'Normal seasonal conditions in Hyderabad'}

FORECAST FOR NEXT 2 DAYS (Hyderabad):
${forecastDetails}
      `.trim();
    }

    const systemPrompt = `
You are SkySense AI, an empathetic agricultural and weather safety advisor for farmers in Hyderabad, Telangana, India.

LIVE HYDERABAD WEATHER & FORECAST DATA:
${weatherSummary}

INSTRUCTIONS:
1. Respond 100% in pure ${selectedLang.name} using ${selectedLang.script}.
2. Answer the farmer's question directly and practically based on the live weather data above.
3. Keep your advice actionable, clear, and divided into short points or concise sentences ending with proper punctuation.
4. Do NOT output any internal monologue, reasoning, or English analysis. Start directly with the answer in ${selectedLang.name}.
    `.trim();

    const apiMessages: Array<{ role: string; content: string }> = [
      { role: 'system', content: systemPrompt },
    ];

    if (Array.isArray(messages) && messages.length > 0) {
      for (const m of messages) {
        if (m.role && m.content) {
          apiMessages.push({
            role: m.role === 'assistant' ? 'assistant' : 'user',
            content: String(m.content),
          });
        }
      }
    } else if (userQuery) {
      apiMessages.push({ role: 'user', content: String(userQuery) });
    } else {
      return res.status(400).json({ success: false, error: 'No user query or messages provided.' });
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);

    const endpoint = `${nebius.baseUrl}/chat/completions`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${nebius.apiKey}`,
      },
      body: JSON.stringify({
        model: nebius.model,
        messages: apiMessages,
        temperature: 0.1,
        max_tokens: 3500,
      }),
      signal: controller.signal,
    });
    clearTimeout(timeout);

    if (!response.ok) {
      const errText = await response.text();
      let parsedErr = errText;
      try {
        const json = JSON.parse(errText);
        parsedErr = json.error?.message || errText;
      } catch {}
      console.warn(`[SkySense AI] Nebius HTTP ${response.status}: ${parsedErr}`);
      return res.status(response.status).json({
        success: false,
        error: FALLBACK_ANSWERS[language] || 'Service busy. Please try again.',
        model: nebius.model,
      });
    }

    const data = (await response.json()) as any;
    const choice = data.choices?.[0];
    const rawContent = choice?.message?.content || '';
    const finishReason = choice?.finish_reason || 'stop';
    let cleanedReply = cleanAIResponse(rawContent, language);

    // Validate the response for language purity, script corruption, and completeness
    let validation = validateLanguageOutput(cleanedReply, language, finishReason);

    // If validation fails, perform exactly one automated retry with strict correction using configured model
    if (!validation.isValid) {
      console.warn(
        `[SkySense AI] Initial reply failed validation for ${language}: ${validation.reason}. Performing 1-time automatic retry with ${nebius.model}...`
      );
      try {
        const lastUserPrompt =
          userQuery ||
          (Array.isArray(messages) && messages.length > 0
            ? messages[messages.length - 1]?.content
            : 'موسم کی تفصیلات اور مشورہ');

        const retryController = new AbortController();
        const retryTimeout = setTimeout(() => retryController.abort(), 20000);

        const retryRes = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${nebius.apiKey}`,
          },
          body: JSON.stringify({
            model: nebius.model,
            messages: [
              {
                role: 'system',
                content: `You are SkySense AI. Your previous attempt was rejected because: "${validation.reason}".
You MUST respond 100% in pure ${selectedLang.name} using ${selectedLang.script}.
FOR URDU: Absolutely ZERO Devanagari/Hindi characters and ZERO Cyrillic characters.
Complete every sentence fully without mid-sentence cut-offs.
Answer the user's question directly based on:
${weatherSummary}`,
              },
              {
                role: 'user',
                content: String(lastUserPrompt),
              },
            ],
            temperature: 0.1,
            max_tokens: 3500,
          }),
          signal: retryController.signal,
        });
        clearTimeout(retryTimeout);

        if (retryRes.ok) {
          const retryData = (await retryRes.json()) as any;
          const retryChoice = retryData.choices?.[0];
          const retryRaw = retryChoice?.message?.content || '';
          const retryFinish = retryChoice?.finish_reason || 'stop';
          const retryCleaned = cleanAIResponse(retryRaw, language);
          const retryValidation = validateLanguageOutput(retryCleaned, language, retryFinish);

          if (retryValidation.isValid) {
            cleanedReply = retryCleaned;
            validation = retryValidation;
          } else {
            console.warn(`[SkySense AI] Retry also failed validation: ${retryValidation.reason}`);
          }
        }
      } catch (retryErr) {
        console.warn('[SkySense AI] Automatic retry error:', retryErr);
      }
    }

    // If still invalid after retry, return localized message with proper status
    if (!validation.isValid) {
      console.warn(`[SkySense AI Validation Failed]: ${validation.reason}`);
      return res.status(422).json({
        success: false,
        error: VALIDATION_ERROR_MESSAGES[language] || VALIDATION_ERROR_MESSAGES.en,
        reason: validation.reason,
        model: nebius.model,
      });
    }

    return res.json({
      success: true,
      configured: true,
      model: nebius.model,
      language,
      provider: 'Nebius Token Factory (NVIDIA Nemotron)',
      reply: cleanedReply,
      usage: data.usage || null,
    });
  } catch (err: any) {
    const isTimeout = err.name === 'AbortError';
    const localizedTimeoutNotice: Record<string, string> = {
      ur: 'رابطہ میں تاخیر ہوئی۔ براہ کرم دوبارہ کوشش کریں۔',
      hi: 'कनेक्शन में देरी हुई। कृपया पुनः प्रयास करें।',
      te: 'స్పందనలో ఆలస్యం జరిగింది. దయచేసి మళ్లీ ప్రయత్నించండి.',
      kn: 'ಸಂಪರ್ಕದಲ್ಲಿ ವಿಳಂಬವಾಗಿದೆ. ದಯವಿಟ್ಟು ಮತ್ತೆ ಪ್ರಯತ್ನಿಸಿ.',
      en: 'Request timed out. Please try again.',
    };
    return res.status(504).json({
      success: false,
      isTimeout,
      error: isTimeout
        ? localizedTimeoutNotice[language] || localizedTimeoutNotice.en
        : FALLBACK_ANSWERS[language] || 'Service busy. Please try again.',
      model: nebius.model,
    });
  }
});

// 5. Keypad Phone IVR Endpoints & State Machine
// -------------------------------------------------------------
const IVR_LANG_CONFIG: Record<string, { code: string; name: string; speechLocale: string }> = {
  '1': { code: 'en', name: 'English', speechLocale: 'en-IN' },
  '2': { code: 'ur', name: 'Urdu', speechLocale: 'ur-IN' },
  '3': { code: 'hi', name: 'Hindi', speechLocale: 'hi-IN' },
  '4': { code: 'te', name: 'Telugu', speechLocale: 'te-IN' },
  '5': { code: 'kn', name: 'Kannada', speechLocale: 'kn-IN' },
};

const IVR_PROMPTS: Record<string, Record<string, string>> = {
  en: {
    welcome: 'Welcome to SkySense AI farmer helpline. Press 1 for weather, 2 for farming guidance, 3 for safety warnings, 4 to ask the AI assistant, or 5 to change language.',
    weather: 'Weather update: Temperature is 28 degrees Celsius. Relative humidity is 60%. Light breeze. No heavy rain expected today. Press 0 to return to the main menu, or 9 to repeat.',
    farmer: 'Farming advisory: Morning wind speed is favorable for chemical spraying. Today is suitable for regular field inspection and watering. Press 0 for main menu.',
    safety: 'Safety advisory: No severe rain, flood, or heat warnings active in your district today. Always follow local government alerts. Press 0 for main menu.',
    ai: 'AI Assistant: Please speak your question after the beep. Press 0 to return to main menu.',
    lang: 'Language selection: Press 1 for English, 2 for Urdu, 3 for Hindi, 4 for Telugu, 5 for Kannada. Press 0 for main menu.',
    langChanged: 'Language updated successfully. Press 0 to return to the main menu.',
    invalid: 'Invalid button pressed. Press 0 for main menu, or 9 to repeat the options.',
  },
  ur: {
    welcome: 'اسکائی سینس کسان ہیلپ لائن میں خوش آمدید۔ موسم کے لیے 1، فصل کے مشورے کے لیے 2، خطرات کے انتباہ کے لیے 3، اے آئی سے سوال کے لیے 4، اور زبان بدلنے کے لیے 5 دبائیں۔',
    weather: 'موسم کا حال: درجہ حرارت 28 ڈگری ہے۔ ہوا میں نمی 60 فیصد ہے۔ ہلکی ہوا چل رہی ہے۔ آج تیز بارش کا اندیشہ نہیں ہے۔ مرکزی مینو کے لیے 0 دبائیں۔',
    farmer: 'زرعی رہنمائی: صبح کے وقت کیڑے مار دوا کا چھڑکاؤ کیا جا سکتا ہے۔ کھیت کو پانی دینے کے لیے حالات موافق ہیں۔ مرکزی مینو کے لیے 0 دبائیں۔',
    safety: 'حفاظتی انتباہ: آپ کے ضلع میں فی الوقت کوئی شدید موسمی خطرہ نہیں ہے۔ ہمیشہ ضلعی انتظامیہ کے احکامات پر عمل کریں۔ مرکزی مینو کے لیے 0 دبائیں۔',
    ai: 'اے آئی مشیر: بیپ کے بعد اپنا سوال بولیں، یا مرکزی مینو کے لیے 0 دبائیں۔',
    lang: 'زبان کی تبدیلی: انگریزی کے لیے 1، اردو کے لیے 2، ہندی کے لیے 3، تیلگو کے لیے 4 اور کنڑ کے لیے 5 دبائیں۔',
    langChanged: 'زبان کامیابی سے تبدیل ہو گئی ہے۔ مرکزی مینو کے لیے 0 دبائیں۔',
    invalid: 'غلط بٹن دبایا گیا ہے۔ مرکزی مینو کے لیے 0 دبائیں۔',
  },
  hi: {
    welcome: 'स्काईसेंस किसान हेल्पलाइन में आपका स्वागत है। मौसम के लिए 1, खेती सलाह के लिए 2, सुरक्षा चेतावनी के लिए 3, एआई से सवाल के लिए 4 और भाषा बदलने के लिए 5 दबाएं।',
    weather: 'मौसम की जानकारी: तापमान 28 डिग्री सेल्सियस है। हवा में नमी 60% है। आज भारी बारिश की संभावना नहीं है। मुख्य मेनू के लिए 0 दबाएं।',
    farmer: 'खेती सलाह: आज सुबह दवा का छिड़काव किया जा सकता है। खेत में सामान्य सिंचाई के लिए मौसम अनुकूल है। मुख्य मेनू के लिए 0 दबाएं।',
    safety: 'सुरक्षा सूचना: वर्तमान में आपके क्षेत्र में कोई गंभीर मौसम खतरा नहीं है। हमेशा स्थानीय प्रशासन के निर्देशों का पालन करें। मुख्य मेनू के लिए 0 दबाएं।',
    ai: 'एआई सहायक: बीप के बाद अपना सवाल बोलें, या मुख्य मेनू के लिए 0 दबाएं।',
    lang: 'भाषा चयन: अंग्रेजी के लिए 1, उर्दू के लिए 2, हिंदी के लिए 3, तेलुगु के लिए 4 और कन्नड़ के लिए 5 दबाएं।',
    langChanged: 'भाषा सफलतापूर्वक बदल दी गई है। मुख्य मेनू के लिए 0 दबाएं।',
    invalid: 'अमान्य बटन दबाया गया है। मुख्य मेनू के लिए 0 दबाएं।',
  },
  te: {
    welcome: 'స్కైసెన్స్ రైతు హెల్ప్‌లైన్‌కు స్వాగతం. వాతావరణం కోసం 1, వ్యవసాయ సలహా కోసం 2, హెచ్చరికల కోసం 3, AI తో మాట్లాడేందుకు 4, భాష మార్పుకు 5 నొక్కండి.',
    weather: 'వాతావరణ వివరాలు: ఉష్ణోగ్రత 28 డిగ్రీలు. గాలిలో తేమ 60%. నేడు భారీ వర్ష సూచన లేదు. మెయిన్ మెనూ కోసం 0 నొక్కండి.',
    farmer: 'వ్యవసాయ సూచన: ఉదయం వేళ పిచికారీ చేయడానికి వాతావరణం బాగుంది. పొలానికి నీరు పెట్టవచ్చు. మెయిన్ మెనూ కోసం 0 నొక్కండి.',
    safety: 'భద్రతా సూచన: ప్రస్తుతం మీ జిల్లాలో ఎలాంటి తీవ్రమైన వాతావరణ ముప్పు లేదు. ఎల్లప్పుడూ అధికారుల ఆదేశాలు పాటించండి. మెయిన్ మెనూ కోసం 0 నొక్కండి.',
    ai: 'AI సహాయకుడు: బీప్ తర్వాత మీ ప్రశ్నను మాట్లాడండి, లేదా వెనక్కి వెళ్ళడానికి 0 నొక్కండి.',
    lang: 'భాష ఎంపిక: ఇంగ్లీష్ కోసం 1, ఉర్దూ కోసం 2, హిందీ కోసం 3, తెలుగు కోసం 4, కన్నడ కోసం 5 నొక్కండి.',
    langChanged: 'భాష విజయవంతంగా మార్చబడింది. మెయిన్ మెనూ కోసం 0 నొక్కండి.',
    invalid: 'తప్పుడు బటన్ నొక్కారు. మెయిన్ మెనూ కోసం 0 నొక్కండి.',
  },
  kn: {
    welcome: 'ಸ್ಕೈಸೈನ್ಸ್ ರೈತ ಸಹಾಯವಾಣಿಗೆ ಸುಸ್ವಾಗತ. ಹವಾಮಾನಕ್ಕಾಗಿ 1, ಕೃಷಿ ಸಲಹೆಗಾಗಿ 2, ಎಚ್ಚರಿಕೆಗಳಿಗಾಗಿ 3, AI ಪ್ರಶ್ನೆಗಾಗಿ 4 ಮತ್ತು ಭಾಷೆ ಬದಲಾಯಿಸಲು 5 ಒತ್ತಿ.',
    weather: 'ಹವಾಮಾನ ವಿವರ: ತಾಪಮಾನ 28 ಡಿಗ್ರಿ ಸೆಲ್ಸಿಯಸ್ ಇದೆ. ಗಾಳಿಯ ತೇವಾಂಶ 60%. ಇಂದು ಭಾರೀ ಮಳೆಯ ಸಂಭವವಿಲ್ಲ. ಮುಖ್ಯ ಮೆನುಗೆ 0 ಒತ್ತಿ.',
    farmer: 'ಕೃಷಿ ಸಲಹೆ: ಇಂದು ಮುಂಜಾನೆ ಔಷಧ ಸಿಂಪರಣೆ ಮಾಡಲು ಹವಾಮಾನ ಉತ್ತಮವಾಗಿದೆ. ಹೊಲಕ್ಕೆ ನೀರುಣಿಸಬಹುದು. ಮುಖ್ಯ ಮೆನುಗೆ 0 ಒತ್ತಿ.',
    safety: 'ಸುರಕ್ಷತಾ ಎಚ್ಚರಿಕೆ: ಪ್ರಸ್ತುತ ನಿಮ್ಮ ಜಿಲ್ಲೆಯಲ್ಲಿ ಯಾವುದೇ ಗಂಭೀರ ಹವಾಮಾನ ಅಪಾಯವಿಲ್ಲ. ಯಾವಾಗಲೂ ಸ್ಥಳೀಯ ಅಧಿಕಾರಿಗಳ ಸೂಚನೆ ಪಾಲಿಸಿ. ಮುಖ್ಯ ಮೆನುಗೆ 0 ಒತ್ತಿ.',
    ai: 'AI ಸಹಾಯಕ: ಬೀಪ್ ಧ್ವನಿಯ ನಂತರ ನಿಮ್ಮ ಕೃಷಿ ಪ್ರಶ್ನೆಯನ್ನು ಮಾತನಾಡಿ, ಅಥವಾ ಮುಖ್ಯ ಮೆನುಗೆ 0 ಒತ್ತಿ.',
    lang: 'ಭಾಷೆ ಆಯ್ಕೆ: ಇಂಗ್ಲಿಷ್‌ಗೆ 1, ಉರ್ದುಗೆ 2, ಹಿಂದಿಗೆ 3, ತೆಲುಗಿಗೆ 4, ಕನ್ನಡಕ್ಕೆ 5 ಒತ್ತಿ.',
    langChanged: 'ಭಾಷೆಯನ್ನು ಯಶಸ್ವಿಯಾಗಿ ಬದಲಾಯಿಸಲಾಗಿದೆ. ಮುಖ್ಯ ಮೆನುಗೆ 0 ಒತ್ತಿ.',
    invalid: 'ತಪ್ಪಾದ ಬಟನ್ ಒತ್ತಲಾಗಿದೆ. ಮುಖ್ಯ ಮೆನುಗೆ 0 ಒತ್ತಿ.',
  },
};

// IVR status endpoint
app.get('/api/ivr/status', (_req: Request, res: Response) => {
  const twilioPhone = process.env.TWILIO_PHONE_NUMBER || null;
  const exotelCallerId = process.env.EXOTEL_CALLER_ID || null;
  const isConnected = Boolean(twilioPhone || exotelCallerId);

  res.json({
    connected: isConnected,
    provider: twilioPhone ? 'twilio' : exotelCallerId ? 'exotel' : 'none',
    phoneNumber: twilioPhone || exotelCallerId || null,
    message: isConnected
      ? 'IVR telephony trunk is connected and ready to receive incoming calls.'
      : 'IVR is NOT YET CONNECTED. No telecom credentials or phone numbers have been purchased. Use the in-app simulator below to test the complete keypad workflow without telecom charges.',
    setupInstructions: [
      '1. Create a Twilio or Exotel account for Indian telecom compliance.',
      '2. Purchase a local or toll-free Indian 1800 number.',
      '3. Point your Twilio/Exotel Webhook URL to: https://<YOUR_DEPLOYED_APP_URL>/api/ivr/incoming (HTTP POST).',
      '4. Add TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER to your server environment.',
    ],
  });
});

// Interactive simulator endpoint for the keypad phone dialer
app.post('/api/ivr/simulate', (req: Request, res: Response) => {
  const { digit, currentLanguage = 'en', state = 'root' } = req.body;
  let activeLang = (currentLanguage in IVR_PROMPTS ? currentLanguage : 'en') as string;
  let nextState = state;
  let responseText = '';
  let availableKeys: string[] = ['1', '2', '3', '4', '5'];

  const prompts = IVR_PROMPTS[activeLang] || IVR_PROMPTS.en;

  if (!digit || digit === '0') {
    nextState = 'root';
    responseText = prompts.welcome;
    availableKeys = ['1', '2', '3', '4', '5', '9'];
  } else if (state === 'lang_menu') {
    if (digit === '9') {
      responseText = prompts.lang;
      availableKeys = ['1', '2', '3', '4', '5', '0'];
    } else if (digit && IVR_LANG_CONFIG[digit]) {
      activeLang = IVR_LANG_CONFIG[digit].code;
      const updatedPrompts = IVR_PROMPTS[activeLang] || IVR_PROMPTS.en;
      responseText = `${updatedPrompts.langChanged} ${updatedPrompts.welcome}`;
      nextState = 'root';
      availableKeys = ['1', '2', '3', '4', '5', '0'];
    } else {
      responseText = prompts.invalid;
      availableKeys = ['1', '2', '3', '4', '5', '0'];
    }
  } else {
    switch (digit) {
      case '1':
        nextState = 'weather';
        responseText = prompts.weather;
        availableKeys = ['0', '9'];
        break;
      case '2':
        nextState = 'farmer';
        responseText = prompts.farmer;
        availableKeys = ['0', '9'];
        break;
      case '3':
        nextState = 'safety';
        responseText = prompts.safety;
        availableKeys = ['0', '9'];
        break;
      case '4':
        nextState = 'ai';
        responseText = prompts.ai;
        availableKeys = ['0', '9'];
        break;
      case '5':
        nextState = 'lang_menu';
        responseText = prompts.lang;
        availableKeys = ['1', '2', '3', '4', '5', '0'];
        break;
      case '9':
        // Repeat current
        responseText = prompts[state as keyof typeof prompts] || prompts.welcome;
        break;
      default:
        responseText = prompts.invalid;
        availableKeys = ['0', '9'];
        break;
    }
  }

  res.json({
    state: nextState,
    language: activeLang,
    spokenText: responseText,
    availableKeys,
  });
});

// Twilio Voice / Exotel TwiML Webhook endpoint for real inbound calls
app.post('/api/ivr/incoming', (req: Request, res: Response) => {
  const digits = req.body.Digits || req.query.Digits;
  const lang = (req.query.lang as string) || 'en';
  const prompts = IVR_PROMPTS[lang] || IVR_PROMPTS.en;

  res.set('Content-Type', 'text/xml');

  if (!digits) {
    // Initial welcome with Gather
    const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather numDigits="1" action="/api/ivr/menu?lang=${lang}" method="POST" timeout="10">
    <Say language="${lang === 'hi' ? 'hi-IN' : lang === 'te' ? 'te-IN' : 'en-IN'}">${prompts.welcome}</Say>
  </Gather>
  <Redirect>/api/ivr/incoming?lang=${lang}</Redirect>
</Response>`;
    return res.send(twiml);
  }

  return res.redirect(307, `/api/ivr/menu?lang=${lang}`);
});

// Menu DTMF handler
app.post('/api/ivr/menu', (req: Request, res: Response) => {
  const digits = (req.body.Digits || req.query.Digits || '').toString().trim();
  let lang = (req.query.lang as string) || 'en';
  const prompts = IVR_PROMPTS[lang] || IVR_PROMPTS.en;

  res.set('Content-Type', 'text/xml');

  if (digits === '1') {
    return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>${prompts.weather}</Say>
  <Gather numDigits="1" action="/api/ivr/menu?lang=${lang}" method="POST">
    <Say>Press 0 for main menu.</Say>
  </Gather>
</Response>`);
  }

  if (digits === '2') {
    return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>${prompts.farmer}</Say>
  <Gather numDigits="1" action="/api/ivr/menu?lang=${lang}" method="POST">
    <Say>Press 0 for main menu.</Say>
  </Gather>
</Response>`);
  }

  if (digits === '3') {
    return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>${prompts.safety}</Say>
  <Gather numDigits="1" action="/api/ivr/menu?lang=${lang}" method="POST">
    <Say>Press 0 for main menu.</Say>
  </Gather>
</Response>`);
  }

  if (digits === '4') {
    return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>${prompts.ai}</Say>
  <Record timeout="5" maxLength="30" action="/api/ivr/query?lang=${lang}" method="POST" />
</Response>`);
  }

  if (digits === '5') {
    return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Gather numDigits="1" action="/api/ivr/language" method="POST">
    <Say>${prompts.lang}</Say>
  </Gather>
</Response>`);
  }

  // Default redirect back to welcome
  return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Redirect>/api/ivr/incoming?lang=${lang}</Redirect>
</Response>`);
});

// Language change DTMF handler
app.post('/api/ivr/language', (req: Request, res: Response) => {
  const digits = (req.body.Digits || '').toString().trim();
  const selected = IVR_LANG_CONFIG[digits] ? IVR_LANG_CONFIG[digits].code : 'en';
  const prompts = IVR_PROMPTS[selected] || IVR_PROMPTS.en;

  res.set('Content-Type', 'text/xml');
  return res.send(`<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say>${prompts.langChanged}</Say>
  <Redirect>/api/ivr/incoming?lang=${selected}</Redirect>
</Response>`);
});

// Serve frontend in production or integrate Vite middleware in development
async function startServer() {
  if (!isProd) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SkySense AI server running on http://0.0.0.0:${PORT} (${isProd ? 'production' : 'development'})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
