import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  RotateCcw,
  Sparkles,
  Bot,
  User,
  AlertCircle,
  CheckCircle2,
  Copy,
  Check,
  Loader2,
  Terminal,
  Info,
} from 'lucide-react';
import {
  ChatMessage,
  FullWeatherData,
  LanguageCode,
} from '../types';
import { translations } from '../translations';
import {
  sendChatMessage,
  testNebiusConnection,
  AIStatusResponse,
} from '../services/ai';
import {
  VoiceRecognizer,
  SpeechPlayer,
  isSpeechRecognitionSupported,
  isSpeechSynthesisSupported,
} from '../services/speech';
import {
  loadSavedChatHistory,
  saveChatHistory,
  clearSavedChatHistory,
  getLocalizedWelcomeMessage,
  CHAT_UPDATED_EVENT,
} from '../services/chatHistory';

interface AIAssistantProps {
  weather: FullWeatherData | null;
  currentLanguage: LanguageCode;
  aiStatus: AIStatusResponse | null;
  isAiVerified: boolean;
  onVerifyAi: () => Promise<void>;
  initialPrompt?: string | null;
  onClearInitialPrompt?: () => void;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({
  weather,
  currentLanguage,
  aiStatus,
  isAiVerified,
  onVerifyAi,
  initialPrompt,
  onClearInitialPrompt,
}) => {
  const t = translations[currentLanguage];

  // Initialize from persistent storage key: skysense_chat_history_v1
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = loadSavedChatHistory(currentLanguage);
    if (saved.length > 0) return saved;
    return [getLocalizedWelcomeMessage(currentLanguage)];
  });

  // Listen for updates from Option 4 or other components
  useEffect(() => {
    const handleHistoryUpdate = (e: any) => {
      if (Array.isArray(e.detail) && e.detail.length > 0) {
        setMessages(e.detail);
      }
    };
    window.addEventListener(CHAT_UPDATED_EVENT, handleHistoryUpdate);
    return () => window.removeEventListener(CHAT_UPDATED_EVENT, handleHistoryUpdate);
  }, []);

  // If language changes and only the initial welcome message exists, update it to the active language
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].id.startsWith('welcome')) {
        return [getLocalizedWelcomeMessage(currentLanguage)];
      }
      return prev;
    });
  }, [currentLanguage]);

  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastFailedQuery, setLastFailedQuery] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyMessage, setVerifyMessage] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const voiceRecognizerRef = useRef<VoiceRecognizer | null>(null);
  const speechPlayerRef = useRef<SpeechPlayer | null>(null);

  useEffect(() => {
    voiceRecognizerRef.current = new VoiceRecognizer();
    speechPlayerRef.current = new SpeechPlayer();

    return () => {
      voiceRecognizerRef.current?.stop();
      speechPlayerRef.current?.stop();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  useEffect(() => {
    if (initialPrompt && initialPrompt.trim()) {
      handleSendMessage(initialPrompt.trim());
      onClearInitialPrompt?.();
    }
  }, [initialPrompt]);

  const handleSendMessage = async (textToSend?: string, isRetry: boolean = false) => {
    const query = (textToSend || input).trim();
    if (!query || isLoading) return;

    speechPlayerRef.current?.stop();
    setSpeakingMessageId(null);
    if (isListening) {
      voiceRecognizerRef.current?.stop();
      setIsListening(false);
    }

    let nextWithUser = messages;
    if (!isRetry) {
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        role: 'user',
        content: query,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      // Filter out initial welcome placeholder if user starts real conversation
      const baseMessages = messages.filter((m) => !m.id.startsWith('welcome'));
      nextWithUser = [...baseMessages, userMessage];

      setMessages(nextWithUser);
      saveChatHistory(nextWithUser);
      setInput('');
    }

    setIsLoading(true);
    setErrorMessage(null);
    setLastFailedQuery(null);

    const history = nextWithUser.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    try {
      const result = await sendChatMessage(history, weather, currentLanguage);

      if (!result.success) {
        setErrorMessage(result.error || t.common.error);
        setLastFailedQuery(query);
      } else {
        const assistantMsg: ChatMessage = {
          id: `bot-${Date.now()}`,
          role: 'assistant',
          content: result.reply || 'No response returned.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => {
          const updated = [...prev, assistantMsg];
          saveChatHistory(updated);
          return updated;
        });
      }
    } catch (err: any) {
      setErrorMessage(err.message || t.common.error);
      setLastFailedQuery(query);
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleVoiceInput = () => {
    if (!isSpeechRecognitionSupported()) {
      setErrorMessage(t.ai.voiceUnsupported);
      return;
    }

    if (isListening) {
      voiceRecognizerRef.current?.stop();
      setIsListening(false);
    } else {
      setErrorMessage(null);
      voiceRecognizerRef.current?.start(currentLanguage, {
        onStart: () => setIsListening(true),
        onResult: (transcript, isFinal) => {
          setInput(transcript);
          if (isFinal) {
            setIsListening(false);
          }
        },
        onError: (err) => {
          setIsListening(false);
          setErrorMessage(err);
        },
        onEnd: () => setIsListening(false),
      });
    }
  };

  const handleSpeak = (msgId: string, text: string) => {
    if (!isSpeechSynthesisSupported()) {
      setErrorMessage('Speech synthesis is not supported on this device.');
      return;
    }

    if (speakingMessageId === msgId) {
      speechPlayerRef.current?.stop();
      setSpeakingMessageId(null);
      return;
    }

    speechPlayerRef.current?.speak(
      text,
      currentLanguage,
      () => setSpeakingMessageId(msgId),
      () => setSpeakingMessageId(null),
      (err) => {
        setSpeakingMessageId(null);
        console.warn('Speech playback error:', err);
      }
    );
  };

  const handleCopy = (id: string, text: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleManualTestConnection = async () => {
    setIsVerifying(true);
    setVerifyMessage(null);
    try {
      const res = await testNebiusConnection();
      if (res.verified) {
        setVerifyMessage(t.ai.connectionSuccess);
        await onVerifyAi();
      } else {
        setVerifyMessage(`${t.ai.connectionFailed} ${res.error || ''}`);
      }
    } catch (err: any) {
      setVerifyMessage(`${t.common.error}: ${err.message}`);
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <div className="space-y-4 max-w-4xl mx-auto">
      {/* 1. Header & Verification Status Badge */}
      <div className="glass-panel rounded-2xl p-4 sm:p-5 border border-cyan-500/20">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-600 to-indigo-600 flex items-center justify-center text-white flex-shrink-0 shadow-md">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white">
                  {t.ai.title}
                </h2>
                {isAiVerified ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    {t.ai.verifiedBadge}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-semibold rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                    <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                    {aiStatus?.configured ? t.ai.configuredBadge : t.ai.unverifiedBadge}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                {t.ai.subtitle}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleManualTestConnection}
              disabled={isVerifying}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-cyan-300 flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            >
              {isVerifying ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
              ) : (
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
              )}
              <span>{isVerifying ? t.ai.testingConnection : t.ai.testConnectionBtn}</span>
            </button>
            <button
              onClick={() => {
                clearSavedChatHistory();
                setMessages([getLocalizedWelcomeMessage(currentLanguage)]);
              }}
              title={t.ai.clearChat}
              className="p-1.5 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Verification notice */}
        {verifyMessage && (
          <div className="mt-3 p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-slate-300 flex items-center gap-2">
            <Info className="w-4 h-4 text-cyan-400 flex-shrink-0" />
            <span>{verifyMessage}</span>
          </div>
        )}

        {/* Unconfigured Alert / Setup Guide Helper */}
        {!aiStatus?.configured && (
          <div className="mt-3 p-3 rounded-xl bg-cyan-950/30 border border-cyan-500/20 text-xs text-cyan-200/90 space-y-1.5">
            <div className="font-semibold text-cyan-300 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>{t.ai.nebiusNotConfigured}</span>
            </div>
            <p className="text-[11px] leading-relaxed">
              {t.ai.nebiusSetupInstructions}
            </p>
          </div>
        )}
      </div>

      {/* 2. Chat Conversation Box */}
      <div className="glass-panel rounded-2xl border border-slate-800/90 p-3 sm:p-5 flex flex-col h-[500px] sm:h-[540px] max-h-[75vh] min-h-[380px]">
        {/* Messages Stream */}
        <div className="flex-1 overflow-y-auto space-y-3.5 pr-1 min-w-0">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            const isSpeaking = speakingMessageId === msg.id;

            return (
              <div
                key={msg.id}
                className={`flex gap-2 sm:gap-2.5 min-w-0 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded-lg bg-cyan-900/60 border border-cyan-500/30 flex items-center justify-center text-cyan-300 flex-shrink-0 mt-0.5">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  dir={currentLanguage === 'ur' ? 'rtl' : 'ltr'}
                  className={`max-w-[88%] sm:max-w-[78%] rounded-2xl p-3 sm:p-3.5 text-xs sm:text-sm leading-relaxed break-words overflow-hidden ${
                    currentLanguage === 'ur' ? 'font-urdu leading-[2.2]' : ''
                  } ${
                    isUser
                      ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white rounded-tr-none shadow-md'
                      : 'bg-slate-900/90 text-slate-100 border border-slate-800 rounded-tl-none shadow-inner'
                  }`}
                >
                  {/* Clean Message Content (model name badge intentionally removed to avoid leaking internal IDs) */}
                  <div className="whitespace-pre-wrap break-words">{msg.content}</div>

                  {/* Footer */}
                  <div
                    className={`mt-2 pt-1.5 flex items-center justify-between text-[10px] ${
                      isUser ? 'text-cyan-200/80 border-t border-cyan-500/20' : 'text-slate-400 border-t border-slate-800/60'
                    }`}
                  >
                    <span>{msg.timestamp}</span>

                    <div className="flex items-center gap-1.5">
                      {!isUser && (
                        <button
                          onClick={() => handleSpeak(msg.id, msg.content)}
                          title={isSpeaking ? t.ai.stopSpeech : t.ai.speak}
                          className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-300 cursor-pointer"
                        >
                          {isSpeaking ? (
                            <VolumeX className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                          ) : (
                            <Volume2 className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => handleCopy(msg.id, msg.content)}
                        title="Copy text"
                        className="p-1 rounded hover:bg-slate-800 text-slate-400 hover:text-white cursor-pointer"
                      >
                        {copiedId === msg.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {isUser && (
                  <div className="w-7 h-7 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 flex-shrink-0 mt-0.5">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            );
          })}

          {/* Loading Indicator */}
          {isLoading && (
            <div className="flex gap-2.5 items-center">
              <div className="w-7 h-7 rounded-lg bg-cyan-900/60 border border-cyan-500/30 flex items-center justify-center text-cyan-300 flex-shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="rounded-2xl rounded-tl-none bg-slate-900/90 border border-slate-800 px-4 py-2.5 text-xs text-cyan-300 flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
                <span>{t.ai.formulating}</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Suggested Quick Prompts (multi-line wrapping for mobile & RTL) */}
        <div className="pt-2.5 border-t border-slate-800/80">
          <div className="text-[11px] text-slate-400 mb-1.5 font-medium flex items-center justify-between">
            <span>{currentLanguage === 'ur' ? 'تجویز کردہ عام سوالات:' : 'Suggested Questions:'}</span>
          </div>
          <div className="flex flex-wrap gap-1.5 sm:gap-2 max-w-full">
            {t.ai.suggestedPrompts.map((prompt, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(prompt)}
                disabled={isLoading}
                dir={currentLanguage === 'ur' ? 'rtl' : 'ltr'}
                className={`text-[11px] sm:text-xs py-1.5 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/80 text-slate-200 hover:text-white transition-all cursor-pointer break-words leading-relaxed max-w-full disabled:opacity-50 active:scale-95 ${
                  currentLanguage === 'ur' ? 'font-urdu text-right' : 'text-left'
                }`}
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>

        {/* Input & Voice Controls */}
        <div className="mt-2.5 pt-2 border-t border-slate-800/80">
          {errorMessage && (
            <div className="mb-2 p-2.5 rounded-xl bg-rose-950/50 border border-rose-500/40 text-rose-200 text-xs flex items-center justify-between gap-2 shadow-md">
              <div className="flex items-center gap-2 min-w-0">
                <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                <span className="break-words leading-relaxed">{errorMessage}</span>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {lastFailedQuery && (
                  <button
                    onClick={() => handleSendMessage(lastFailedQuery, true)}
                    disabled={isLoading}
                    className="px-2.5 py-1 rounded-lg bg-rose-800 hover:bg-rose-700 text-white text-[11px] font-semibold cursor-pointer shadow transition-all active:scale-95"
                  >
                    {t.ai.retry || (currentLanguage === 'ur' ? 'دوبارہ کوشش' : 'Retry')}
                  </button>
                )}
                <button
                  onClick={() => setErrorMessage(null)}
                  className="text-xs text-rose-400 hover:text-white ml-1 cursor-pointer"
                >
                  {t.common.dismiss}
                </button>
              </div>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2 min-w-0 w-full"
          >
            <button
              type="button"
              onClick={handleToggleVoiceInput}
              title={isListening ? 'Stop listening' : t.ai.voiceInput}
              className={`p-2.5 min-w-[44px] min-h-[44px] rounded-xl border flex items-center justify-center transition-all cursor-pointer flex-shrink-0 ${
                isListening
                  ? 'bg-rose-600 text-white border-rose-400 animate-pulse shadow-lg shadow-rose-600/30'
                  : 'bg-slate-800 hover:bg-slate-700 text-cyan-300 border-slate-700'
              }`}
            >
              {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            <input
              type="text"
              dir={currentLanguage === 'ur' ? 'rtl' : 'ltr'}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={isListening ? t.ai.voiceListening : t.ai.placeholder}
              className={`flex-1 min-w-0 py-2.5 px-3.5 rounded-xl bg-slate-900 border border-slate-700 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/50 ${
                currentLanguage === 'ur' ? 'font-urdu' : ''
              }`}
            />

            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="px-3.5 py-2.5 min-h-[44px] rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer shadow-md flex-shrink-0"
            >
              <Send className="w-4 h-4" />
              <span className="hidden sm:inline">{t.ai.send}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
