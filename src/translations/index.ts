import { LanguageCode } from '../types';
import { TranslationDictionary } from './types';
import { en } from './en';
import { ur } from './ur';
import { hi } from './hi';
import { te } from './te';
import { kn } from './kn';

export type { TranslationDictionary };

export const translations: Record<LanguageCode, TranslationDictionary> = {
  en,
  ur,
  hi,
  te,
  kn,
};
