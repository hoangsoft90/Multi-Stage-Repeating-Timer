/**
 * i18n bootstrap (multi-language, 12 languages). Defaults to the device
 * locale ("system"); the persisted Settings language overrides it (see the
 * settings screen).
 *
 * In jest, the language is pinned to Vietnamese (JEST_WORKER_ID is set) so
 * the existing UI-string assertions stay stable.
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import type { AppLanguageCode, LanguageSetting } from '@/core/storage/repos';
import { vi } from './vi';
import { en } from './en';
import { ja } from './ja';
import { zhHans } from './zh-Hans';
import { ko } from './ko';
import { es } from './es';
import { fr } from './fr';
import { de } from './de';
import { pt } from './pt';
import { id } from './id';
import { th } from './th';
import { ru } from './ru';

export const resources = {
  vi: { translation: vi },
  en: { translation: en },
  ja: { translation: ja },
  'zh-Hans': { translation: zhHans },
  ko: { translation: ko },
  es: { translation: es },
  fr: { translation: fr },
  de: { translation: de },
  pt: { translation: pt },
  id: { translation: id },
  th: { translation: th },
  ru: { translation: ru },
} as const;

export type AppLanguage = AppLanguageCode;

export const SUPPORTED_LANGUAGES: AppLanguage[] = [
  'vi',
  'en',
  'ja',
  'zh-Hans',
  'ko',
  'es',
  'fr',
  'de',
  'pt',
  'id',
  'th',
  'ru',
];

/** Effective language from the device locale, mapped to a supported one. */
export function systemLanguage(): AppLanguage {
  const raw = (Localization.getLocales()[0]?.languageCode ?? 'en').toLowerCase();
  // Chinese variants (Simplified/Traditional/hk) all fall back to zh-Hans.
  const code = raw.startsWith('zh') ? 'zh-Hans' : raw === 'in' ? 'id' : raw;
  return (SUPPORTED_LANGUAGES as string[]).includes(code) ? (code as AppLanguage) : 'en';
}

/** Resolve the persisted setting to an actual language. */
export function resolveLanguage(setting: LanguageSetting): AppLanguage {
  return setting === 'system' ? systemLanguage() : setting;
}

const isTestEnv = typeof process !== 'undefined' && !!process.env.JEST_WORKER_ID;

i18n.use(initReactI18next).init({
  resources,
  lng: isTestEnv ? 'vi' : resolveLanguage('system'),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
  returnEmptyString: false,
});

/** Untyped `t` for non-React modules (validation, store, coordinator…). */
export const t = i18n.t.bind(i18n);

const LANGUAGE_LABEL_KEYS: Record<AppLanguage, string> = {
  vi: 'settings.languageVietnamese',
  en: 'settings.languageEnglish',
  ja: 'settings.languageJapanese',
  'zh-Hans': 'settings.languageChinese',
  ko: 'settings.languageKorean',
  es: 'settings.languageSpanish',
  fr: 'settings.languageFrench',
  de: 'settings.languageGerman',
  pt: 'settings.languagePortuguese',
  id: 'settings.languageIndonesian',
  th: 'settings.languageThai',
  ru: 'settings.languageRussian',
};

export const LANGUAGE_OPTIONS: Array<{ value: LanguageSetting; labelKey: string }> = [
  { value: 'system', labelKey: 'settings.languageSystem' },
  ...SUPPORTED_LANGUAGES.map((code) => ({ value: code as LanguageSetting, labelKey: LANGUAGE_LABEL_KEYS[code] })),
];

export default i18n;
