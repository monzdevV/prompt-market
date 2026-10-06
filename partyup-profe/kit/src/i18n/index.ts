/**
 * PARTYUP Internationalization
 * ============================
 * i18next configuration with expo-localization for device language detection.
 * Supports: English, Spanish, French, German, Italian.
 * Language preference is persisted in AsyncStorage.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import i18n from 'i18next';
import 'intl-pluralrules';
import { initReactI18next } from 'react-i18next';

import de from './locales/de.json';
import en from './locales/en.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import it from './locales/it.json';

// ============================================
// CONSTANTS
// ============================================

export const LANGUAGE_STORAGE_KEY = '@beparty/language';

/**
 * AsyncStorage keys that are device preferences (not session/user data) and
 * must survive a logout. Add new preference keys here.
 */
export const PRESERVED_STORAGE_KEYS: readonly string[] = [LANGUAGE_STORAGE_KEY];

export const SUPPORTED_LANGUAGES = {
  en: 'English',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  it: 'Italiano',
} as const;

export type SupportedLanguage = keyof typeof SUPPORTED_LANGUAGES;

const FALLBACK_LANGUAGE: SupportedLanguage = 'en';

// ============================================
// HELPERS
// ============================================

function getDeviceLanguage(): SupportedLanguage {
  try {
    // Dynamic require to avoid crash when native module is unavailable
    const { getLocales } = require('expo-localization');
    const locales = getLocales();
    const code = locales[0]?.languageCode ?? FALLBACK_LANGUAGE;
    return code in SUPPORTED_LANGUAGES
      ? (code as SupportedLanguage)
      : FALLBACK_LANGUAGE;
  } catch {
    return FALLBACK_LANGUAGE;
  }
}

/** Load persisted language preference, falling back to device language. */
export async function getStoredLanguage(): Promise<SupportedLanguage> {
  try {
    const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored && stored in SUPPORTED_LANGUAGES) {
      return stored as SupportedLanguage;
    }
  } catch {
    // Ignore storage errors; use device language
  }
  return getDeviceLanguage();
}

/** Persist language preference and update i18n instance. */
export async function setLanguage(lang: SupportedLanguage): Promise<void> {
  await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
  await i18n.changeLanguage(lang);
}

// ============================================
// INITIALIZATION
// ============================================

const initI18n = async () => {
  const language = await getStoredLanguage();

  await i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      es: { translation: es },
      fr: { translation: fr },
      de: { translation: de },
      it: { translation: it },
    },
    lng: language,
    fallbackLng: FALLBACK_LANGUAGE,
    interpolation: {
      escapeValue: false,
    },
    react: {
      useSuspense: false,
    },
  });
};

// Fire initialization immediately on import
initI18n();

export default i18n;
