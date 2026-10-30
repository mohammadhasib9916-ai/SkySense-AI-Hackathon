import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Phone,
  PhoneCall,
  PhoneOff,
  Volume2,
  VolumeX,
  AlertCircle,
  CheckCircle2,
  HelpCircle,
  RotateCcw,
  Radio,
  FileCode,
  ExternalLink,
  Bot,
  Send,
  Mic,
  MicOff,
  Loader2,
  Sparkles,
} from 'lucide-react';
import { LanguageCode, FullWeatherData, ChatMessage } from '../types';
import { translations } from '../translations';
import {
  SpeechPlayer,
  VoiceRecognizer,
  isSpeechSynthesisSupported,
  isSpeechRecognitionSupported,
} from '../services/speech';
import { appendToChatHistory } from '../services/chatHistory';

interface KeypadPhoneIVRProps {
  currentLanguage: LanguageCode;
  onLanguageChange: (lang: LanguageCode) => void;
  weather?: FullWeatherData | null;
}

const SUGGESTED_IVR_QUESTIONS: Record<LanguageCode, string[]> = {
  ur: [
    'کیا آج حیدرآباد میں دھان یا سبزیوں پر کیڑے مار دوا کا چھڑکاؤ کیا جا سکتا ہے؟',
    'حیدرآباد کے موسم کے مطابق اگلے چوبیس گھنٹوں میں بارش کا کیا امکان ہے؟',
    'گرمی اور تیز دھوپ میں فصل کی آبپاشی کے لیے کون سا وقت بہترین ہے؟',
  ],
  hi: [
    'क्या आज हैदराबाद में फसल पर कीटनाशक दवा का छिड़काव करना सुरक्षित है?',
    'हैदराबाद में अगले 24 घंटों में बारिश की क्या संभावना है?',
    'तेज धूप में फसलों की सिंचाई के लिए कौन सा समय सबसे उत्तम है?',
  ],
  te: [
    'ఈ రోజు హైదరాబాద్‌లో పంటపై పురుగుల మందు పిచికారీ చేయడానికి వాతావరణం అనుకూలమా?',
    'హైదరాబాద్‌లో రాబోయే 24 గంటల్లో వర్షం పడే అవకాశం ఎంత ఉంది?',
    'ఎండల వేడి నుంచి పంటను కాపాడుకోవడానికి ఎప్పుడు నీరు పెట్టాలి?',
  ],
  kn: [
    'ಇಂದು ಹೈದರಾಬಾದ್‌ನಲ್ಲಿ ಬೆಳೆಗೆ ಕೀಟನಾಶಕ ಸಿಂಪಡಿಸಲು ಹವಾಮಾನ ಸೂಕ್ತವೇ?',
    'ಮುಂದಿನ 24 ಗಂಟೆಗಳಲ್ಲಿ ಹೈದರಾಬಾದ್‌ನಲ್ಲಿ ಮಳೆಯ ಮುನ್ಸೂಚನೆ ಹೇಗಿದೆ?',
    'ಹೆಚ್ಚಿನ ಬಿಸಿಲಿನ ಸಮಯದಲ್ಲಿ ಹೊಲಕ್ಕೆ ನೀರುಣಿಸಲು ಉತ್ತಮ ಸಮಯ ಯಾವುದು?',
  ],
  en: [
    'Is today suitable for pesticide spraying in Hyderabad based on wind and humidity?',
    'What is the 24-hour rainfall and temperature outlook for Hyderabad?',
    'What irrigation schedule is recommended for current Hyderabad weather conditions?',
  ],
};

export const KeypadPhoneIVR: React.FC<KeypadPhoneIVRProps> = ({
  currentLanguage,
  onLanguageChange,
  weather,
}) => {
  const t = translations[currentLanguage];

  const [callStatus, setCallStatus] = useState<'idle' | 'calling' | 'connected' | 'ended'>('idle');
  const [ivrState, setIvrState] = useState<string>('root');
  const [currentPromptText, setCurrentPromptText] = useState<string>('');
  const [activeLang, setActiveLang] = useState<LanguageCode>(currentLanguage);
  const [isSpeaking, setIsSpeaking] = useState<boolean>(false);
  const [audioMuted, setAudioMuted] = useState<boolean>(false);
  const [serverIvrStatus, setServerIvrStatus] = useState<any>(null);

  // AI Assistant in Phone Simulator State
  const [aiQuestion, setAiQuestion] = useState<string>('');
  const [isAiLoading, setIsAiLoading] = useState<boolean>(false);
  const [aiAnswer, setAiAnswer] = useState<string | null>(null);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isListeningMic, setIsListeningMic] = useState<boolean>(false);

  const speechPlayerRef = useRef<SpeechPlayer | null>(null);
  const voiceRecognizerRef = useRef<VoiceRecognizer | null>(null);
  const capturedSpeechRef = useRef<string>('');
  const hasSubmittedRef = useRef<boolean>(false);

  // Sync active language when parent changes
  useEffect(() => {
    setActiveLang(currentLanguage);
  }, [currentLanguage]);

  useEffect(() => {
    speechPlayerRef.current = new SpeechPlayer();
    voiceRecognizerRef.current = new VoiceRecognizer();

    // Fetch real IVR status from server
    fetch('/api/ivr/status')
      .then((res) => res.json())
      .then((data) => setServerIvrStatus(data))
      .catch((err) => console.warn('Could not check IVR status:', err));

    return () => {
      speechPlayerRef.current?.stop();
      voiceRecognizerRef.current?.stop();
    };
  }, []);

  // Web Audio IVR Beep
  const playBeep = useCallback(() => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      gain.gain.setValueAtTime(0.15, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.18);
    } catch {}
  }, []);

  // Update prompt voice output
  const playPromptAudio = useCallback(
    (text: string, lang: LanguageCode, onEndCallback?: () => void) => {
      setCurrentPromptText(text);
      if (audioMuted || !isSpeechSynthesisSupported()) {
        onEndCallback?.();
        return;
      }

      speechPlayerRef.current?.speak(
        text,
        lang,
        () => setIsSpeaking(true),
        () => {
          setIsSpeaking(false);
          onEndCallback?.();
        },
        () => {
          setIsSpeaking(false);
          onEndCallback?.();
        }
      );
    },
    [audioMuted]
  );

  // Start Call
  const handleStartCall = async () => {
    setCallStatus('calling');
    speechPlayerRef.current?.stop();
    setAiAnswer(null);
    setAiError(null);
    setAiQuestion('');

    setTimeout(async () => {
      setCallStatus('connected');
      try {
        const res = await fetch('/api/ivr/simulate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ digit: '0', currentLanguage: activeLang, state: 'root' }),
        });
        const data = await res.json();
        setIvrState(data.state);
        playPromptAudio(data.spokenText, activeLang);
      } catch {
        const welcomeText = t.ivr.promptWelcome;
        playPromptAudio(welcomeText, activeLang);
      }
    }, 1200);
  };

  // End Call
  const handleEndCall = () => {
    speechPlayerRef.current?.stop();
    voiceRecognizerRef.current?.stop();
    setIsSpeaking(false);
    setIsListeningMic(false);
    setCallStatus('ended');
    setTimeout(() => {
      setCallStatus('idle');
      setIvrState('root');
      setCurrentPromptText('');
      setAiAnswer(null);
      setAiError(null);
      setAiQuestion('');
    }, 1500);
  };

  // Build weather context for Hyderabad
  const getHyderabadWeatherContext = () => {
    if (weather) {
      return {
        location: `${weather.location.name}, ${weather.location.state}`,
        coordinates: `${weather.location.latitude.toFixed(2)}, ${weather.location.longitude.toFixed(2)}`,
        temp: weather.current.temperature,
        apparentTemp: weather.current.apparentTemperature,
        condition: t.weather.wmo[weather.current.weatherCode] || 'Normal conditions',
        humidity: weather.current.relativeHumidity,
        windSpeed: weather.current.windSpeed,
        windDirection: `${weather.current.windDirection}°`,
        precipitation: weather.current.precipitation,
        precipProbability: weather.hourly[0]?.precipitationProbability ?? 0,
        uvIndex: weather.hourly[0]?.uvIndex ?? weather.daily[0]?.uvIndexMax ?? 5,
        tempMin: weather.daily[0]?.tempMin ?? 20,
        tempMax: weather.daily[0]?.tempMax ?? 33,
        outlook24h: `Min: ${weather.daily[0]?.tempMin}°C, Max: ${weather.daily[0]?.tempMax}°C, Rain chance: ${weather.daily[0]?.precipitationProbabilityMax ?? 0}%`,
        forecastNext2Days: weather.daily?.slice(1, 3).map((d, idx) => ({
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
    return {
      location: 'Hyderabad, Telangana, India',
      coordinates: '17.39, 78.49',
      temp: 28,
      apparentTemp: 29,
      condition: 'Partly cloudy',
      humidity: 60,
      windSpeed: 10,
      windDirection: '90°',
      precipitation: 0,
      precipProbability: 10,
      uvIndex: 6,
      tempMin: 21,
      tempMax: 32,
      outlook24h: 'Normal seasonal Hyderabad conditions',
      forecastNext2Days: [
        { dayLabel: 'Day 1 (Tomorrow)', date: 'Tomorrow', tempMax: 33, tempMin: 22, precipitationSum: 0, precipitationProbabilityMax: 0, windSpeedMax: 12 },
        { dayLabel: 'Day 2 (Day after tomorrow)', date: 'Day after', tempMax: 34, tempMin: 23, precipitationSum: 0, precipitationProbabilityMax: 5, windSpeedMax: 14 }
      ],
    };
  };

  // Submit AI Question from Keypad Option 4
  const handleAskAIQuestion = async (customQuery?: string) => {
    const questionText = (customQuery || aiQuestion || '').trim();
    if (!questionText) {
      const emptyMsg =
        activeLang === 'ur'
          ? 'براہ کرم مائیک کے ذریعے سوال بولیں یا نیچے لکھ کر پوچھیں۔'
          : activeLang === 'hi'
          ? 'कृपया माइक से अपना सवाल बोलें या नीचे लिखकर पूछें।'
          : activeLang === 'te'
          ? 'దయచేసి మైక్రోఫోన్ ద్వారా మాట్లాడండి లేదా కింద టైప్ చేయండి.'
          : activeLang === 'kn'
          ? 'ದಯವಿಟ್ಟು ಮೈಕ್ರೊಫೋನ್ ಮೂಲಕ ಮಾತನಾಡಿ ಅಥವಾ ಕೆಳಗೆ ಟೈಪ್ ಮಾಡಿ.'
          : 'Please speak your question using the microphone or enter it below.';
      setAiError(emptyMsg);
      return;
    }

    speechPlayerRef.current?.stop();
    voiceRecognizerRef.current?.stop();
    setIsListeningMic(false);
    setIsAiLoading(true);
    setAiError(null);
    setAiAnswer(null);

    // Save user question to persistent chat history
    const userMsg: ChatMessage = {
      id: `ivr-user-${Date.now()}`,
      role: 'user',
      content: questionText,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    appendToChatHistory(userMsg, activeLang);

    try {
      const weatherContext = getHyderabadWeatherContext();
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [{ role: 'user', content: questionText }],
          language: activeLang,
          weatherContext,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.reply) {
        throw new Error(data.error || 'AI assistant request could not be processed.');
      }

      const reply = data.reply;
      setAiAnswer(reply);
      setCurrentPromptText(reply);
      playPromptAudio(reply, activeLang);

      // Save AI answer to persistent chat history
      const aiMsg: ChatMessage = {
        id: `ivr-bot-${Date.now()}`,
        role: 'assistant',
        content: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      appendToChatHistory(aiMsg, activeLang);
    } catch (err: any) {
      console.error('IVR AI Query error:', err);
      const errMsg = err.message || t.common.error;
      setAiError(errMsg);
      setCurrentPromptText(errMsg);
      playPromptAudio(errMsg, activeLang);
    } finally {
      setIsAiLoading(false);
    }
  };

  // Start speech recognition listener with audio feedback
  const handleStartVoiceRecognition = useCallback(() => {
    if (!isSpeechRecognitionSupported()) {
      setAiError(t.ai.voiceUnsupported);
      return;
    }

    speechPlayerRef.current?.stop();
    capturedSpeechRef.current = '';
    hasSubmittedRef.current = false;
    setAiError(null);

    voiceRecognizerRef.current?.start(activeLang, {
      onStart: () => {
        setIsListeningMic(true);
      },
      onResult: (transcript, isFinal) => {
        const clean = (transcript || '').trim();
        if (clean) {
          setAiQuestion(clean);
          capturedSpeechRef.current = clean;
        }
        if (isFinal && clean && !hasSubmittedRef.current) {
          hasSubmittedRef.current = true;
          setIsListeningMic(false);
          voiceRecognizerRef.current?.stop();
          handleAskAIQuestion(clean);
        }
      },
      onError: (err) => {
        setIsListeningMic(false);
        console.warn('Voice recognition error:', err);
        if (err && !err.includes('no-speech')) {
          setAiError(err);
        }
      },
      onEnd: () => {
        setIsListeningMic(false);
        const finalSpoken = capturedSpeechRef.current.trim();
        if (!hasSubmittedRef.current && finalSpoken) {
          hasSubmittedRef.current = true;
          handleAskAIQuestion(finalSpoken);
        }
      },
    });
  }, [activeLang, t.ai.voiceUnsupported]);

  // Toggle voice recognition for Option 4
  const handleToggleVoiceInput = () => {
    if (isListeningMic) {
      voiceRecognizerRef.current?.stop();
      setIsListeningMic(false);
      return;
    }

    if (!isSpeechRecognitionSupported()) {
      setAiError(t.ai.voiceUnsupported);
      return;
    }

    playBeep();
    handleStartVoiceRecognition();
  };

  // Return to root main menu
  const handleReturnToRoot = async () => {
    speechPlayerRef.current?.stop();
    voiceRecognizerRef.current?.stop();
    setIsListeningMic(false);
    setAiAnswer(null);
    setAiError(null);
    setAiQuestion('');
    try {
      const res = await fetch('/api/ivr/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ digit: '0', currentLanguage: activeLang, state: 'root' }),
      });
      const data = await res.json();
      setIvrState(data.state);
      playPromptAudio(data.spokenText, activeLang);
    } catch {
      setIvrState('root');
      playPromptAudio(t.ivr.promptWelcome, activeLang);
    }
  };

  // Press Keypad Digit
  const handlePressDigit = async (digit: string) => {
    if (callStatus !== 'connected') return;

    speechPlayerRef.current?.stop();
    voiceRecognizerRef.current?.stop();
    setIsListeningMic(false);

    // Key 0: Always return to Main Menu
    if (digit === '0') {
      await handleReturnToRoot();
      return;
    }

    // Key 9: Repeat current prompt or current AI answer
    if (digit === '9') {
      if (ivrState === 'ai' && aiAnswer) {
        playPromptAudio(aiAnswer, activeLang);
      } else {
        playPromptAudio(currentPromptText || t.ivr.promptWelcome, activeLang);
      }
      return;
    }

    try {
      const res = await fetch('/api/ivr/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ digit, currentLanguage: activeLang, state: ivrState }),
      });
      const data = await res.json();

      setIvrState(data.state);
      if (data.language && data.language !== activeLang) {
        setActiveLang(data.language as LanguageCode);
        onLanguageChange(data.language as LanguageCode);
      }

      // If switching into AI state, reset previous answers and listen after beep
      if (data.state === 'ai') {
        setAiAnswer(null);
        setAiError(null);
        setAiQuestion('');
        playPromptAudio(data.spokenText, (data.language as LanguageCode) || activeLang, () => {
          playBeep();
          setTimeout(() => {
            handleStartVoiceRecognition();
          }, 300);
        });
      } else {
        playPromptAudio(data.spokenText, (data.language as LanguageCode) || activeLang);
      }
    } catch (err) {
      console.warn('IVR simulation error:', err);
    }
  };

  const dialKeys = [
    { num: '1', sub: 'Weather' },
    { num: '2', sub: 'Farmer' },
    { num: '3', sub: 'Safety' },
    { num: '4', sub: 'Ask AI' },
    { num: '5', sub: 'Language' },
    { num: '6', sub: '' },
    { num: '7', sub: '' },
    { num: '8', sub: '' },
    { num: '9', sub: 'Repeat' },
    { num: '*', sub: '' },
    { num: '0', sub: 'Main Menu' },
    { num: '#', sub: '' },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* 1. Header Banner */}
      <div className="glass-panel rounded-2xl p-5 border border-cyan-500/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-blue-600 flex items-center justify-center text-white flex-shrink-0 shadow-md">
              <Phone className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                  {t.ivr.title}
                </h2>
                {serverIvrStatus?.connected ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    {t.ivr.badgeConnected}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40">
                    <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                    {t.ivr.badgeNotConnected}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                {t.ivr.subtitle}
              </p>
            </div>
          </div>

          <div className="text-xs text-slate-400 flex items-center gap-2">
            <Radio className="w-4 h-4 text-cyan-400" />
            <span>Interactive Simulator Ready</span>
          </div>
        </div>

        {/* Status Notice */}
        <div className="mt-3.5 p-3 rounded-xl bg-slate-900/80 border border-slate-800 text-xs text-slate-300 space-y-1">
          <div className="font-semibold text-white flex items-center gap-1.5">
            <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
            <span>{t.ivr.statusNoticeTitle}</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            {t.ivr.statusNoticeDesc}
          </p>
        </div>
      </div>

      {/* 2. Interactive Keypad Phone Simulator & Dynamic Content Panel */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
        {/* Phone Frame Simulator (5 cols) */}
        <div className="md:col-span-5 max-w-sm mx-auto w-full">
          <div className="p-4 sm:p-5 rounded-3xl bg-[#0b1426] border-2 border-slate-700 shadow-2xl relative">
            {/* Phone Earpiece */}
            <div className="w-16 h-1 bg-slate-600 rounded-full mx-auto mb-3" />

            {/* LCD Screen */}
            <div className="rounded-2xl p-3.5 bg-[#0e3b3b]/60 border border-cyan-500/40 text-cyan-200 font-mono shadow-inner mb-4 min-h-[150px] flex flex-col justify-between">
              <div className="flex items-center justify-between text-[10px] text-cyan-400 pb-1 border-b border-cyan-500/20">
                <span>SKYSENSE 1800-HEAR</span>
                <span>LANG: {activeLang.toUpperCase()}</span>
              </div>

              <div className="my-2 text-center">
                {callStatus === 'idle' && (
                  <div className="text-xs font-bold text-slate-300 animate-pulse">
                    {t.ivr.phoneScreenReady}
                  </div>
                )}
                {callStatus === 'calling' && (
                  <div className="text-xs font-bold text-amber-300 animate-bounce">
                    {t.ivr.phoneScreenCalling}
                  </div>
                )}
                {callStatus === 'connected' && (
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-emerald-300 flex items-center justify-center gap-1">
                      <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                      {ivrState === 'ai' ? 'OPTION 4: AI ASSISTANT' : t.ivr.phoneScreenConnected}
                    </div>

                    {ivrState === 'ai' && isAiLoading ? (
                      <div className="py-2 flex flex-col items-center justify-center gap-1 text-cyan-300">
                        <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
                        <span className="text-[11px] font-sans font-semibold">
                          {activeLang === 'ur'
                            ? 'سوچ رہا ہے...'
                            : activeLang === 'hi'
                            ? 'सोच रहा है...'
                            : activeLang === 'te'
                            ? 'ఆలోచిస్తోంది...'
                            : activeLang === 'kn'
                            ? 'ಯೋಚಿಸುತ್ತಿದೆ...'
                            : 'AI Thinking...'}
                        </span>
                      </div>
                    ) : (
                      <div className="text-[10px] text-cyan-300 font-sans line-clamp-4 leading-snug">
                        {aiAnswer || currentPromptText || t.ivr.promptWelcome}
                      </div>
                    )}
                  </div>
                )}
                {callStatus === 'ended' && (
                  <div className="text-xs font-bold text-rose-300">
                    {t.ivr.phoneScreenEnded}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between text-[10px] text-cyan-400/80 pt-1 border-t border-cyan-500/20">
                <span>KEYPAD DTMF</span>
                <span>{isSpeaking ? 'SPEECH ACTIVE 🔊' : isListeningMic ? 'MIC LISTENING 🎙️' : 'LISTENING 👂'}</span>
              </div>
            </div>

            {/* Call Control Buttons */}
            <div className="grid grid-cols-2 gap-2 mb-3">
              <button
                onClick={handleStartCall}
                disabled={callStatus === 'connected' || callStatus === 'calling'}
                className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <PhoneCall className="w-4 h-4" />
                <span>{t.ivr.callButton}</span>
              </button>

              <button
                onClick={handleEndCall}
                disabled={callStatus === 'idle'}
                className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-40 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md transition-all active:scale-95 cursor-pointer"
              >
                <PhoneOff className="w-4 h-4" />
                <span>{t.ivr.endCallButton}</span>
              </button>
            </div>

            {/* 12-Button Keypad Grid */}
            <div className="grid grid-cols-3 gap-2">
              {dialKeys.map((key) => {
                const isHighlight =
                  callStatus === 'connected' && ['1', '2', '3', '4', '5', '0', '9'].includes(key.num);
                const isCurrentActive =
                  (ivrState === 'ai' && key.num === '4') ||
                  (ivrState === 'weather' && key.num === '1') ||
                  (ivrState === 'farmer' && key.num === '2') ||
                  (ivrState === 'safety' && key.num === '3') ||
                  (ivrState === 'lang_menu' && key.num === '5');

                return (
                  <button
                    key={key.num}
                    onClick={() => handlePressDigit(key.num)}
                    disabled={callStatus !== 'connected'}
                    className={`py-3 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer select-none active:scale-90 ${
                      isCurrentActive
                        ? 'bg-gradient-to-tr from-indigo-700 to-purple-700 border-indigo-400 text-white shadow-lg ring-2 ring-indigo-400/50'
                        : isHighlight
                        ? 'bg-slate-800 hover:bg-slate-700 border-cyan-500/50 text-white hover:text-cyan-300 shadow-md'
                        : 'bg-slate-900/60 border-slate-800 text-slate-500 hover:text-slate-300'
                    }`}
                  >
                    <span className="text-base font-bold">{key.num}</span>
                    {key.sub && (
                      <span className="text-[9px] text-cyan-400 font-semibold tracking-tighter">
                        {key.sub}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Audio Mute / Voice Toggle */}
            <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
              <span className="text-[11px]">Browser Audio Voice:</span>
              <button
                onClick={() => setAudioMuted(!audioMuted)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-cyan-300 flex items-center gap-1 cursor-pointer"
              >
                {audioMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-400" />}
                <span className="text-[11px]">{audioMuted ? 'Muted' : 'Speaking'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Dynamic Context Panel: AI Question Console (Option 4) or Menu Guide (7 cols) */}
        <div className="md:col-span-7 space-y-4">
          {/* OPTION 4 ACTIVE: Dedicated Live AI Question Console */}
          {ivrState === 'ai' && callStatus === 'connected' ? (
            <div className="glass-panel rounded-2xl p-5 border-2 border-indigo-500/40 shadow-xl bg-slate-900/95 space-y-4 animate-in fade-in duration-200">
              <div className="flex items-center justify-between pb-3 border-b border-indigo-500/20">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-md">
                    <Bot className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <span>{t.ivr.menu4}</span>
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-indigo-950 text-indigo-300 border border-indigo-500/30">
                        {t.ai.title || 'AI Assistant'}
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-300">
                      Hyderabad Live Weather Grounded • {activeLang.toUpperCase()} Mode
                    </p>
                  </div>
                </div>

                <button
                  onClick={handleReturnToRoot}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-3 h-3 text-cyan-400" />
                  <span>Main Menu (0)</span>
                </button>
              </div>

              {/* Question Input Form */}
              <div className="space-y-2.5">
                <label className="text-xs font-semibold text-slate-200 block">
                  {t.ai.placeholder}
                </label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleToggleVoiceInput}
                    title={isListeningMic ? 'Stop microphone' : 'Speak your question'}
                    className={`p-2.5 min-w-[42px] min-h-[42px] rounded-xl border flex-shrink-0 flex items-center justify-center transition-all cursor-pointer ${
                      isListeningMic
                        ? 'bg-rose-600 text-white border-rose-400 animate-pulse'
                        : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-cyan-300'
                    }`}
                  >
                    {isListeningMic ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>

                  <input
                    type="text"
                    dir={activeLang === 'ur' ? 'rtl' : 'ltr'}
                    value={aiQuestion}
                    onChange={(e) => setAiQuestion(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleAskAIQuestion();
                      }
                    }}
                    placeholder={t.ai.placeholder}
                    className={`flex-1 min-w-0 bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 outline-none transition-colors ${
                      activeLang === 'ur' ? 'font-urdu' : ''
                    }`}
                  />

                  <button
                    type="button"
                    onClick={() => handleAskAIQuestion()}
                    disabled={isAiLoading || !aiQuestion.trim()}
                    className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 disabled:opacity-40 text-white font-bold text-xs flex items-center gap-1.5 shadow-md cursor-pointer transition-all active:scale-95 flex-shrink-0"
                  >
                    {isAiLoading ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                    <span>{t.ai.send}</span>
                  </button>
                </div>
              </div>

              {/* Quick Sample Questions Chips */}
              <div>
                <span className="text-[11px] text-slate-400 block mb-1.5 font-medium">
                  Quick Questions for Hyderabad:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {(SUGGESTED_IVR_QUESTIONS[activeLang] || SUGGESTED_IVR_QUESTIONS.en).map(
                    (q, idx) => (
                      <button
                        key={idx}
                        onClick={() => {
                          setAiQuestion(q);
                          handleAskAIQuestion(q);
                        }}
                        disabled={isAiLoading}
                        className="text-left px-2.5 py-1.5 rounded-lg bg-slate-800/80 hover:bg-slate-700 border border-slate-700/80 text-[11px] text-indigo-200 hover:text-white cursor-pointer transition-colors leading-snug"
                      >
                        {q}
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* Loading State Display */}
              {isAiLoading && (
                <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-500/30 flex items-center justify-center gap-3 text-xs text-indigo-300 animate-pulse">
                  <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
                  <span>
                    {activeLang === 'ur'
                      ? 'حیدرآباد کے موسم کے تناظر میں جواب تیار کیا جا رہا ہے...'
                      : activeLang === 'hi'
                      ? 'हैदराबाद के मौसम के आधार पर उत्तर तैयार किया जा रहा है...'
                      : activeLang === 'te'
                      ? 'హైదరాబాద్ వాతావరణం ఆధారంగా సమాధానం సిద్ధమవుతోంది...'
                      : activeLang === 'kn'
                      ? 'ಹೈದರಾಬಾದ್ ಹವಾಮಾನದ ಆಧಾರದ ಮೇಲೆ ಉತ್ತರ ಸಿದ್ಧವಾಗುತ್ತಿದೆ...'
                      : 'Consulting NVIDIA Nemotron with live Hyderabad weather context...'}
                  </span>
                </div>
              )}

              {/* Error Display */}
              {aiError && !isAiLoading && (
                <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-xs flex items-center justify-between gap-2 shadow-md">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                    <span>{aiError}</span>
                  </div>
                  <button
                    onClick={() => handleAskAIQuestion()}
                    className="px-2.5 py-1 rounded-lg bg-rose-900/80 hover:bg-rose-800 text-white text-[11px] font-semibold cursor-pointer"
                  >
                    {t.common.retry}
                  </button>
                </div>
              )}

              {/* AI Answer Display Card */}
              {aiAnswer && !isAiLoading && (
                <div className="p-4 rounded-xl bg-slate-950 border border-indigo-500/40 text-slate-100 text-xs sm:text-sm leading-relaxed space-y-3 shadow-inner">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="font-bold text-indigo-300 flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-400" />
                      SkySense AI Response:
                    </span>
                    <button
                      onClick={() => playPromptAudio(aiAnswer, activeLang)}
                      className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                      title="Repeat audio (Keypad 9)"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Repeat (9)</span>
                    </button>
                  </div>

                  <div
                    dir={activeLang === 'ur' ? 'rtl' : 'ltr'}
                    className={`whitespace-pre-line text-slate-200 break-words overflow-hidden ${
                      activeLang === 'ur' ? 'font-urdu leading-[2.2] text-right' : 'font-sans'
                    }`}
                  >
                    {aiAnswer}
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-[11px] text-slate-400">
                    <span>Press <strong>0</strong> to return to Main Menu</span>
                    <span>Press <strong>9</strong> to repeat speech</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Current Spoken Message Display */}
              <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-cyan-500/25">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Volume2 className="w-4 h-4 text-cyan-400" />
                    <span>{t.ivr.currentAudioLabel}</span>
                  </h3>
                  <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-cyan-950 text-cyan-300 border border-cyan-500/30">
                    {activeLang}
                  </span>
                </div>

                <div
                  dir={activeLang === 'ur' ? 'rtl' : 'ltr'}
                  className={`p-3.5 rounded-xl bg-slate-900/90 border border-slate-800 min-h-[80px] flex items-center text-xs sm:text-sm text-cyan-100 leading-relaxed font-medium break-words overflow-hidden ${
                    activeLang === 'ur' ? 'font-urdu leading-[2.2] text-right' : ''
                  }`}
                >
                  {currentPromptText ? (
                    <span>&quot;{currentPromptText}&quot;</span>
                  ) : (
                    <span className="text-slate-500 italic">
                      Press &apos;{t.ivr.callButton}&apos; on the keypad to start hearing the voice menu.
                    </span>
                  )}
                </div>
              </div>

              {/* Keypad Menu Hierarchy Guide */}
              <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-slate-800">
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <FileCode className="w-4 h-4 text-cyan-400" />
                  <span>{t.ivr.instructionsTitle}</span>
                </h3>

                <div className="space-y-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-cyan-900/80 text-cyan-300 font-bold flex items-center justify-center flex-shrink-0 text-xs">
                        1
                      </span>
                      <span className="text-slate-200">{t.ivr.instruction1}</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-emerald-900/80 text-emerald-300 font-bold flex items-center justify-center flex-shrink-0 text-xs">
                        2
                      </span>
                      <span className="text-slate-200">{t.ivr.instruction2}</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-amber-900/80 text-amber-300 font-bold flex items-center justify-center flex-shrink-0 text-xs">
                        3
                      </span>
                      <span className="text-slate-200">{t.ivr.instruction3}</span>
                    </div>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900/70 border border-indigo-500/40 flex items-center justify-between bg-indigo-950/20">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-indigo-800 text-indigo-200 font-bold flex items-center justify-center flex-shrink-0 text-xs">
                        4
                      </span>
                      <span className="text-indigo-100 font-semibold">{t.ivr.instruction4}</span>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-indigo-900 text-indigo-300 font-medium">
                      Interactive AI
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-900/70 border border-slate-800 flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="w-6 h-6 rounded-lg bg-purple-900/80 text-purple-300 font-bold flex items-center justify-center flex-shrink-0 text-xs">
                        5
                      </span>
                      <span className="text-slate-200">{t.ivr.instruction5}</span>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Telephony Webhook Configuration Guide */}
          <div className="rounded-2xl bg-cyan-950/20 border border-cyan-500/20 p-4 text-xs text-slate-300 space-y-2">
            <h4 className="font-bold text-cyan-300 flex items-center gap-1.5">
              <span>Production Telecom Setup (Exotel / Twilio):</span>
            </h4>
            <p className="text-[11px] leading-relaxed text-slate-400">
              When ready to deploy on a real 1800 toll-free or local phone number:
              <br />
              1. Webhook endpoint: <code className="bg-slate-900 text-cyan-300 px-1 py-0.5 rounded font-mono">/api/ivr/incoming</code> (POST).
              <br />
              2. Language parameter: pass <code className="bg-slate-900 text-cyan-300 px-1 py-0.5 rounded font-mono">?lang=ur|hi|te|kn|en</code> based on caller caller-ID district.
              <br />
              3. Telephony credentials remain safe in server environment variables.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
