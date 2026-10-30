import { LanguageCode } from '../types';

// Browser SpeechRecognition types declaration
declare global {
  interface Window {
    SpeechRecognition?: any;
    webkitSpeechRecognition?: any;
  }
}

// Map app languages to BCP-47 speech tags
export const SPEECH_LANG_CODES: Record<LanguageCode, string[]> = {
  ur: ['ur-IN', 'ur-PK', 'ur'],
  hi: ['hi-IN', 'hi'],
  te: ['te-IN', 'te'],
  kn: ['kn-IN', 'kn'],
  en: ['en-IN', 'en-US', 'en-GB', 'en'],
};

export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
}

export function isSpeechSynthesisSupported(): boolean {
  if (typeof window === 'undefined') return false;
  return Boolean('speechSynthesis' in window && window.speechSynthesis);
}

export interface VoiceRecognizerCallbacks {
  onStart?: () => void;
  onResult?: (transcript: string, isFinal: boolean) => void;
  onError?: (errorMessage: string) => void;
  onEnd?: () => void;
}

export class VoiceRecognizer {
  private recognition: any = null;
  private isListening = false;

  constructor() {
    const SpeechRecognitionClass =
      typeof window !== 'undefined'
        ? window.SpeechRecognition || window.webkitSpeechRecognition
        : null;

    if (SpeechRecognitionClass) {
      this.recognition = new SpeechRecognitionClass();
      this.recognition.continuous = false;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 1;
    }
  }

  public start(lang: LanguageCode, callbacks: VoiceRecognizerCallbacks) {
    if (!this.recognition) {
      callbacks.onError?.('Speech recognition is not supported in this browser.');
      return;
    }

    if (this.isListening) {
      try {
        this.recognition.abort();
      } catch {}
    }

    const preferredCodes = SPEECH_LANG_CODES[lang] || ['en-IN'];
    this.recognition.lang = preferredCodes[0];

    this.recognition.onstart = () => {
      this.isListening = true;
      callbacks.onStart?.();
    };

    this.recognition.onresult = (event: any) => {
      let interim = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interim += event.results[i][0].transcript;
        }
      }

      callbacks.onResult?.(finalTranscript || interim, Boolean(finalTranscript));
    };

    this.recognition.onerror = (event: any) => {
      this.isListening = false;
      let msg = 'Microphone error occurred.';
      if (event.error === 'not-allowed') {
        msg = 'Microphone permission was denied. Please allow microphone access in browser settings.';
      } else if (event.error === 'no-speech') {
        msg = 'No speech was detected. Please tap and try again.';
      } else if (event.error === 'network') {
        msg = 'Speech recognition network error. Ensure your device is online.';
      }
      callbacks.onError?.(msg);
    };

    this.recognition.onend = () => {
      this.isListening = false;
      callbacks.onEnd?.();
    };

    try {
      this.recognition.start();
    } catch (err: any) {
      this.isListening = false;
      callbacks.onError?.(err.message || 'Could not start voice listener.');
    }
  }

  public stop() {
    if (this.recognition && this.isListening) {
      try {
        this.recognition.stop();
      } catch {}
      this.isListening = false;
    }
  }

  public getStatus() {
    return this.isListening;
  }
}

// Text to speech player
export class SpeechPlayer {
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  public speak(
    text: string,
    lang: LanguageCode,
    onStart?: () => void,
    onEnd?: () => void,
    onError?: (err: any) => void
  ) {
    if (!isSpeechSynthesisSupported()) {
      onError?.('Speech synthesis is not supported on this device.');
      return;
    }

    this.stop();

    // Clean text of markdown asterisks and URLs for spoken audio
    const cleanText = text
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/https?:\/\/\S+/g, '')
      .replace(/[#_~`]/g, '')
      .trim();

    if (!cleanText) return;

    const utterance = new SpeechSynthesisUtterance(cleanText);
    const candidateLangs = SPEECH_LANG_CODES[lang] || ['en-IN'];

    // Retrieve system voices
    let voices = window.speechSynthesis.getVoices();

    // Find best native voice matching target language codes
    const targetPrefix = lang.toLowerCase();
    const matchedVoice = voices.find((v) => {
      const vLang = v.lang.toLowerCase();
      return (
        candidateLangs.some((code) => vLang.startsWith(code.toLowerCase())) ||
        vLang.startsWith(`${targetPrefix}-`) ||
        vLang === targetPrefix
      );
    });

    if (matchedVoice) {
      utterance.voice = matchedVoice;
      utterance.lang = matchedVoice.lang;
    } else if (lang === 'en') {
      // English can use default voice
      utterance.lang = candidateLangs[0] || 'en-IN';
    } else {
      // STRICT REQUIREMENT: Never use English voice for Indic languages (ur, hi, te, kn)
      // If no native voice engine is available on this browser/OS, do not speak English phonemes over Indic text
      console.warn(`[SpeechPlayer] No native voice found for ${lang}. Prevented English fallback.`);
      onError?.(`No native speech voice found for ${lang}.`);
      return;
    }

    // Calm, articulate news-presenter cadence
    utterance.rate = 0.92;
    utterance.pitch = 1.0;

    utterance.onstart = () => onStart?.();
    utterance.onend = () => {
      this.currentUtterance = null;
      onEnd?.();
    };
    utterance.onerror = (e) => {
      this.currentUtterance = null;
      onError?.(e);
    };

    this.currentUtterance = utterance;
    window.speechSynthesis.speak(utterance);
  }

  public stop() {
    if (isSpeechSynthesisSupported()) {
      window.speechSynthesis.cancel();
      this.currentUtterance = null;
    }
  }

  public isSpeaking(): boolean {
    if (!isSpeechSynthesisSupported()) return false;
    return window.speechSynthesis.speaking;
  }
}
