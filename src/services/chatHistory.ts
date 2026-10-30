import { ChatMessage, LanguageCode } from '../types';

export const CHAT_HISTORY_STORAGE_KEY = 'skysense_chat_history_v1';
export const CHAT_UPDATED_EVENT = 'skysense_chat_updated';

/**
 * Returns default welcome message for the selected language
 */
export function getLocalizedWelcomeMessage(lang: LanguageCode): ChatMessage {
  const content = (() => {
    switch (lang) {
      case 'ur':
        return 'خوش آمدید! میں اسکائی سینس اے آئی ہوں، آپ کا موسمی اور زرعی مشیر۔ آپ موسم، کھیتی باڑی اور کیڑے مار دوا کے چھڑکاؤ کے متعلق کوئی بھی سوال پوچھ سکتے ہیں۔';
      case 'hi':
        return 'नमस्ते! मैं स्काईसेंस एआई हूँ, आपका मौसम और कृषि सलाहकार। आप मौसम, खेती, कीटनाशक छिड़काव या सुरक्षा से संबंधित कोई भी सवाल पूछ सकते हैं।';
      case 'te':
        return 'నమస్కారం! నేను స్కైసెన్స్ AI, మీ వాతావరణ మరియు వ్యవసాయ సలహాదారుని. వాతావరణం, పంటల సాగు మరియు రక్షణ గురించి మీ ప్రశ్నలను అడగవచ్చు.';
      case 'kn':
        return 'ನಮಸ್ಕಾರ! ನಾನು ಸ್ಕೈಸೈನ್ಸ್ AI, ನಿಮ್ಮ ಹವಾಮಾನ ಮತ್ತು ಕೃಷಿ ಸಲಹೆಗಾರ. ಹವಾಮಾನ, ಕೃಷಿ ಅಥವಾ ಬೆಳೆ ರಕ್ಷಣೆಯ ಬಗ್ಗೆ ಯಾವುದೇ ಪ್ರಶ್ನೆಯನ್ನು ಕೇಳಿ.';
      default:
        return 'Welcome to SkySense AI, your Hyderabad weather and farming assistant. Ask me anything about current weather, field-work planning, crop protection, or safety precautions.';
    }
  })();

  return {
    id: `welcome-${lang}`,
    role: 'assistant',
    content,
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  };
}

/**
 * Load saved chat history from localStorage
 */
export function loadSavedChatHistory(lang: LanguageCode): ChatMessage[] {
  try {
    const raw = localStorage.getItem(CHAT_HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed.filter(
        (m): m is ChatMessage =>
          Boolean(m) &&
          typeof m.id === 'string' &&
          typeof m.content === 'string' &&
          (m.role === 'user' || m.role === 'assistant') &&
          !m.content.includes('NEBIUS_API_KEY') &&
          !m.content.toLowerCase().includes('thinking process')
      );
    }
  } catch (err) {
    console.warn('Failed to parse chat history from localStorage:', err);
  }
  return [];
}

/**
 * Persist full chat history array to localStorage and notify listeners
 */
export function saveChatHistory(messages: ChatMessage[]): void {
  try {
    // Filter out corrupted items
    const cleanList = messages.filter(
      (m) => m && typeof m.content === 'string' && m.content.trim().length > 0
    );
    localStorage.setItem(CHAT_HISTORY_STORAGE_KEY, JSON.stringify(cleanList));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(CHAT_UPDATED_EVENT, { detail: cleanList }));
    }
  } catch (err) {
    console.warn('Failed to save chat history to localStorage:', err);
  }
}

/**
 * Append a single message to localStorage without overwriting previous history
 */
export function appendToChatHistory(message: ChatMessage, lang: LanguageCode = 'en'): ChatMessage[] {
  try {
    const existing = loadSavedChatHistory(lang);
    // Avoid exact duplicate IDs
    const filtered = existing.filter((m) => m.id !== message.id);
    const updated = [...filtered, message];
    saveChatHistory(updated);
    return updated;
  } catch (err) {
    console.warn('Failed to append to chat history:', err);
    return [];
  }
}

/**
 * Clear all saved history from localStorage
 */
export function clearSavedChatHistory(): void {
  try {
    localStorage.removeItem(CHAT_HISTORY_STORAGE_KEY);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(CHAT_UPDATED_EVENT, { detail: [] }));
    }
  } catch (err) {
    console.warn('Failed to clear chat history from localStorage:', err);
  }
}
