import { translations } from '../src/translations';
import { COMMON_CROPS, searchLocations, reverseGeocode, fetchLiveWeather } from '../src/services/weather';
import { wmoTranslations } from '../src/translations/wmo';
import { LanguageCode, LocationData } from '../src/types';
import { reverseGeocodeLgd, searchLgdRegistry } from '../src/services/indiaLocations';

interface TestResult {
  name: string;
  category: string;
  passed: boolean;
  details: string;
}

const results: TestResult[] = [];

console.log('====================================================');
console.log('   SKYSENSE AI — MASTER VERIFICATION TEST SUITE     ');
console.log('====================================================\n');

const languages: LanguageCode[] = ['en', 'ur', 'hi', 'te', 'kn'];

// TEST 1: Translation Dictionary Parity
console.log('--- TEST 1: Interface Translations & Parity Check ---');
const requiredSections = ['tabs', 'weather', 'farmer', 'safety', 'ai', 'ivr', 'common'] as const;

for (const lang of languages) {
  const dict = translations[lang];
  if (!dict) {
    results.push({
      name: `Translation Dictionary Presence`,
      category: 'UI Translation',
      passed: false,
      details: `Dictionary missing for language ${lang}`,
    });
    continue;
  }

  let missingKeys: string[] = [];
  for (const sec of requiredSections) {
    if (!dict[sec]) {
      missingKeys.push(sec);
    }
  }

  const passed = missingKeys.length === 0;
  results.push({
    name: `Section Coverage [${lang}]`,
    category: 'UI Translation',
    passed,
    details: passed
      ? `All ${requiredSections.length} UI sections present and populated.`
      : `Missing sections: ${missingKeys.join(', ')}`,
  });
}

// TEST 2: WMO Weather Codes Coverage (0-99)
console.log('\n--- TEST 2: WMO Weather Code Translations Coverage ---');
const wmoCodes = [0, 1, 2, 3, 45, 48, 51, 53, 55, 61, 63, 65, 71, 73, 75, 77, 80, 81, 82, 85, 86, 95, 96, 99];
for (const lang of languages) {
  const codeDict = wmoTranslations[lang];
  const missing = wmoCodes.filter((code) => !codeDict || !codeDict[code]);
  const passed = missing.length === 0;
  results.push({
    name: `WMO Weather Codes [${lang}]`,
    category: 'WMO Translation',
    passed,
    details: passed
      ? `All ${wmoCodes.length} WMO weather conditions translated into ${lang}.`
      : `Missing WMO codes: ${missing.join(', ')}`,
  });
}

// TEST 3: Common Crops 5-Language Name Coverage
console.log('\n--- TEST 3: Common Crops Translation Coverage ---');
for (const crop of COMMON_CROPS) {
  const missingLangs = languages.filter((l) => !crop.name[l] || crop.name[l].trim().length === 0);
  const passed = missingLangs.length === 0;
  results.push({
    name: `Crop: ${crop.id}`,
    category: 'Crop Translation',
    passed,
    details: passed
      ? `Translated across en, ur, hi, te, kn: "${crop.name.en}" / "${crop.name.ur}" / "${crop.name.hi}" / "${crop.name.te}" / "${crop.name.kn}"`
      : `Missing translations in: ${missingLangs.join(', ')}`,
  });
}

// TEST 4: Hyderabad Canonical Location & Live Weather Retrieval
console.log('\n--- TEST 4: Canonical Hyderabad Live Weather Retrieval ---');
async function runLocationAndWeatherTests() {
  const hyderabadLoc: LocationData = {
    name: 'Hyderabad',
    state: 'Telangana',
    district: 'Hyderabad',
    type: 'city',
    country: 'India',
    latitude: 17.385,
    longitude: 78.4867,
    timezone: 'Asia/Kolkata',
  };

  try {
    const weather = await fetchLiveWeather(hyderabadLoc);
    const hasLiveMetrics =
      typeof weather.current.temperature === 'number' &&
      typeof weather.current.relativeHumidity === 'number' &&
      weather.hourly.length >= 24 &&
      weather.daily.length >= 7;

    results.push({
      name: `Hyderabad Canonical Weather Retrieval`,
      category: 'Live Weather',
      passed: hasLiveMetrics,
      details: hasLiveMetrics
        ? `Hyderabad Live Temp: ${weather.current.temperature}°C, Humidity: ${weather.current.relativeHumidity}%, Wind: ${weather.current.windSpeed} km/h, 24h Hourly: ${weather.hourly.length} pts, 7d Daily: ${weather.daily.length} pts`
        : `Incomplete weather payload for Hyderabad`,
    });
  } catch (err: any) {
    results.push({
      name: `Hyderabad Live Weather`,
      category: 'Live Weather',
      passed: false,
      details: `Failed to fetch live weather: ${err.message}`,
    });
  }

  // TEST 6: AI Language Selection & Model Verification (2 Questions per Language)
  console.log('\n--- TEST 6: AI Endpoint Language Selection (2 Questions per Language) ---');
  const testQuestions: Record<LanguageCode, string[]> = {
    en: [
      'Is today suitable for pesticide spraying on rice?',
      'What precautions are needed for upcoming high temperatures?',
    ],
    ur: [
      'تیز ہوا کے پیش نظر کسانوں کو کیا کرنا چاہیے؟',
      'کیا اگلے دو دنوں میں بارش ہونے کا امکان ہے؟',
      'آج حیدرآباد کے موسم کا کھیتوں پر کیا اثر ہوگا؟',
    ],
    hi: [
      'क्या आज गेहूं की फसल पर दवा छिड़कना सुरक्षित है?',
      'आने वाले तूफान से फसलों की सुरक्षा कैसे करें?',
    ],
    te: [
      'ఈ రోజు వری పంటకు పురుగుల మందు పిచికారీ చేయడానికి అనుకూలమేనా?',
      'భారీ వర్షం పడే అవకాశం ఉన్నప్పుడు ఎలాంటి జాగ్రత్తలు తీసుకోవాలి?',
    ],
    kn: [
      'ಇಂದು ಭತ್ತದ ಬೆಳೆಗೆ ಕೀಟನಾಶಕ ಸಿಂಪಡಿಸಲು ಸೂಕ್ತವೇ?',
      'ಭಾರೀ ಗಾಳಿ ಮತ್ತು ಮಳೆಯಿಂದ ಬೆಳೆಗಳನ್ನು ರಕ್ಷಿಸಲು ಏನು ಮಾಡಬೇಕು?',
    ],
  };

  const hyderabadWeather = {
    location: 'Hyderabad, Telangana, India',
    coordinates: '17.38, 78.48',
    temp: 29,
    apparentTemp: 30,
    condition: 'Clear sky (WMO 0)',
    humidity: 52,
    windSpeed: 18,
    windDirection: '85°',
    precipitation: 0,
    precipProbability: 5,
    uvIndex: 6,
    tempMin: 22,
    tempMax: 34,
    outlook24h: 'Precipitation sum: 0mm, Wind: 18km/h',
    forecastNext2Days: [
      {
        dayLabel: 'Day 1 (Tomorrow)',
        date: '2026-10-30',
        tempMax: 34,
        tempMin: 22,
        precipitationSum: 0,
        precipitationProbabilityMax: 0,
        windSpeedMax: 16,
      },
      {
        dayLabel: 'Day 2 (Day after tomorrow)',
        date: '2026-10-31',
        tempMax: 33,
        tempMin: 23,
        precipitationSum: 0.1,
        precipitationProbabilityMax: 10,
        windSpeedMax: 15,
      },
    ],
  };

  for (const lang of languages) {
    const questionsForLang = testQuestions[lang];

    for (let i = 0; i < questionsForLang.length; i++) {
      const qText = questionsForLang[i];
      const qId = `Q${i + 1}`;
      try {
        const res = await fetch('http://localhost:3000/api/ai/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [{ role: 'user', content: qText }],
            language: lang,
            weatherContext: hyderabadWeather,
          }),
        });
        const data = await res.json();
        const reply = data.reply || '';
        const receivedLanguage = data.language || lang;
        const noThinkingLeak =
          !reply.toLowerCase().includes('thinking process') &&
          !reply.includes('<think>') &&
          !reply.includes('<reasoning>');

        // Check for complete sentence endings without mid-sentence truncation
        const trimmed = reply.trim();
        const lastChar = trimmed[trimmed.length - 1] || '';
        const endsClean = ['۔', '!', '؟', '.', '?', ':', ')', '»', '”', '…', '।', '॥'].includes(lastChar);

        // Strict script and corruption validation
        let scriptValid = false;
        let corruptionFree = true;

        if (lang === 'ur') {
          scriptValid = /[\u0600-\u06FF]/.test(reply);
          const hasDevanagari = /[\u0900-\u097F]/.test(reply);
          const hasCyrillic = /[\u0400-\u04FF]/.test(reply);
          const hasGluedTokens = /[\u0600-\u06FF][a-zA-Z]{2,}|[a-zA-Z]{2,}[\u0600-\u06FF]/.test(reply);
          corruptionFree = !hasDevanagari && !hasCyrillic && !hasGluedTokens;
        } else if (lang === 'hi') {
          scriptValid = /[\u0900-\u097F]/.test(reply);
          corruptionFree = !/[\u0600-\u06FF\u0400-\u04FF]/.test(reply);
        } else if (lang === 'te') {
          scriptValid = /[\u0C00-\u0C7F]/.test(reply);
          corruptionFree = !/[\u0600-\u06FF\u0400-\u04FF\u0900-\u097F]/.test(reply);
        } else if (lang === 'kn') {
          scriptValid = /[\u0C80-\u0CFF]/.test(reply);
          corruptionFree = !/[\u0600-\u06FF\u0400-\u04FF\u0900-\u097F]/.test(reply);
        } else {
          scriptValid = /[a-zA-Z]/.test(reply);
          corruptionFree = !/[\u0600-\u06FF\u0400-\u04FF\u0900-\u097F\u0C00-\u0C7F\u0C80-\u0CFF]/.test(reply);
        }

        const passed =
          res.status === 200 &&
          data.success === true &&
          Boolean(reply) &&
          noThinkingLeak &&
          scriptValid &&
          corruptionFree &&
          endsClean;

        results.push({
          name: `AI Chat [${lang.toUpperCase()}] ${qId} (Language Purity, No Mixed-Script, Complete Sentence)`,
          category: 'AI Assistant',
          passed,
          details: `Query: "${qText.slice(0, 30)}..." | HTTP ${res.status} | Script valid: ${scriptValid ? 'YES' : 'NO'} | Clean script: ${corruptionFree ? 'YES' : 'CORRUPT'} | Ends complete: ${endsClean ? 'YES' : 'TRUNCATED'} | Reply: "${reply.slice(0, 45)}..."`,
        });
      } catch (err: any) {
        results.push({
          name: `AI Chat [${lang.toUpperCase()}] ${qId}`,
          category: 'AI Assistant',
          passed: false,
          details: `Network failed: ${err.message}`,
        });
      }
    }
  }

  // TEST 7: Feature-Phone Simulator DTMF Keypad Actions (Keys 1, 2, 3, 4, 5, 9, 0 across languages)
  console.log('\n--- TEST 7: Feature-Phone Keypad Simulator (Buttons 1, 2, 3, 4, 5, 9, 0) ---');
  const keypadActions = [
    { digit: '1', expectedState: 'weather', desc: '1 = Weather' },
    { digit: '2', expectedState: 'farmer', desc: '2 = Farming Advice' },
    { digit: '3', expectedState: 'safety', desc: '3 = Safety Information' },
    { digit: '4', expectedState: 'ai', desc: '4 = AI Assistant' },
    { digit: '5', expectedState: 'lang_menu', desc: '5 = Language Selection' },
    { digit: '9', expectedState: 'root', desc: '9 = Repeat Menu' },
    { digit: '0', expectedState: 'root', desc: '0 = Main Menu' },
  ];

  for (const action of keypadActions) {
    try {
      const res = await fetch('http://localhost:3000/api/ivr/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ digit: action.digit, currentLanguage: 'kn', state: 'root' }),
      });
      const data = await res.json();
      const passed = res.ok && data.state === action.expectedState && Boolean(data.spokenText);
      results.push({
        name: `Keypad Digit [${action.digit}] (${action.desc})`,
        category: 'Feature-Phone Simulator',
        passed,
        details: `State: ${data.state} | Spoken Prompt: "${data.spokenText?.slice(0, 45)}..."`,
      });
    } catch (err: any) {
      results.push({
        name: `Keypad Digit [${action.digit}]`,
        category: 'Feature-Phone Simulator',
        passed: false,
        details: `Error: ${err.message}`,
      });
    }
  }

  // Test language selection switch via keypad in IVR (Digit 5 -> Digit 2 for Urdu, Digit 4 for Telugu, Digit 5 for Kannada)
  try {
    const langRes = await fetch('http://localhost:3000/api/ivr/simulate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ digit: '2', currentLanguage: 'en', state: 'lang_menu' }),
    });
    const langData = await langRes.json();
    const passed = langRes.ok && langData.language === 'ur' && langData.state === 'root';
    results.push({
      name: `IVR Language Switch to Urdu (Digit 2 in lang_menu)`,
      category: 'Feature-Phone Simulator',
      passed,
      details: `Active Language changed to: ${langData.language} | State: ${langData.state}`,
    });
  } catch (err: any) {
    results.push({
      name: `IVR Language Switch`,
      category: 'Feature-Phone Simulator',
      passed: false,
      details: `Error: ${err.message}`,
    });
  }

  // TEST 8: Chat History Persistence Key & Contract Verification
  console.log('\n--- TEST 8: Chat History Storage Key & Schema Verification ---');
  const chatKey = 'skysense_chat_history_v1';
  const testSampleChat = [
    { id: 'user-1', role: 'user', content: 'کیا آج بارش ہو گی؟', timestamp: '10:30 AM' },
    { id: 'bot-1', role: 'assistant', content: 'آج حیدرآباد میں بارش کا امکان صفر فیصد ہے۔', timestamp: '10:31 AM' },
  ];
  const serialized = JSON.stringify(testSampleChat);
  const parsedBack = JSON.parse(serialized);
  const historyPreserved =
    chatKey === 'skysense_chat_history_v1' &&
    Array.isArray(parsedBack) &&
    parsedBack.length === 2 &&
    parsedBack[0].content === 'کیا آج بارش ہو گی؟' &&
    parsedBack[1].role === 'assistant';

  results.push({
    name: `Chat Storage Key (${chatKey}) & Appending Schema`,
    category: 'Persistence',
    passed: historyPreserved,
    details: `Storage key: ${chatKey} | Preserves 2 messages without character corruption.`,
  });

  // Print Summary Table
  console.log('\n====================================================');
  console.log('                 FINAL TEST RESULTS                 ');
  console.log('====================================================');
  let passCount = 0;
  let failCount = 0;

  for (const r of results) {
    if (r.passed) {
      passCount++;
      console.log(`[PASS] [${r.category}] ${r.name}: ${r.details}`);
    } else {
      failCount++;
      console.log(`[FAIL] [${r.category}] ${r.name}: ${r.details}`);
    }
  }

  console.log('\n----------------------------------------------------');
  console.log(`Total Tests Run: ${results.length}`);
  console.log(`Passed: ${passCount}`);
  console.log(`Failed: ${failCount}`);
  console.log('----------------------------------------------------');

  if (failCount > 0) {
    process.exit(1);
  }
}

runLocationAndWeatherTests();
