import { createContext, useContext, useEffect, useMemo, useState } from 'react'

import { DEFAULT_LOCALE } from './config'

const LOCALE_STORAGE_KEY = 'jotigames-locale'

export const SUPPORTED_LOCALES = [
  'nl',
  'en',
  'de',
  'fr',
  'it',
  'es',
  'pl',
  'ru',
  'zh_CN',
  'da',
  'sv',
  'nb',
  'fi',
  'is',
  'ja',
  'ar',
  'ko',
  'id',
  'hi',
  'el',
  'tr',
  'ro',
  'hu',
]

export const LOCALE_LABELS = {
  nl: 'Nederlands',
  en: 'English',
  de: 'Deutsch',
  fr: 'Français',
  it: 'Italiano',
  es: 'Español',
  pl: 'Polski',
  ru: 'Русский',
  zh_CN: '中文',
  da: 'Dansk',
  sv: 'Svenska',
  nb: 'Norsk',
  fi: 'Suomi',
  is: 'Íslenska',
  ja: '日本語',
  ar: 'العربية',
  ko: '한국어',
  id: 'Bahasa Indonesia',
  hi: 'हिन्दी',
  el: 'Ελληνικά',
  tr: 'Türkçe',
  ro: 'Română',
  hu: 'Magyar',
}

function normalizeLocale(locale) {
  const raw = String(locale || '').trim()
  if (!raw) {
    return DEFAULT_LOCALE
  }

  if (SUPPORTED_LOCALES.includes(raw)) {
    return raw
  }

  const dashed = raw.replace('-', '_')
  if (SUPPORTED_LOCALES.includes(dashed)) {
    return dashed
  }

  const languageOnly = dashed.split('_')[0].toLowerCase()
  if (SUPPORTED_LOCALES.includes(languageOnly)) {
    return languageOnly
  }

  return DEFAULT_LOCALE
}

export function loadSelectedLocale() {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY)
    if (stored) {
      return normalizeLocale(stored)
    }
  } catch {
    // ignore storage errors
  }

  if (typeof navigator !== 'undefined' && navigator.language) {
    return normalizeLocale(navigator.language)
  }

  return DEFAULT_LOCALE
}

export function saveSelectedLocale(locale) {
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, normalizeLocale(locale))
  } catch {
    // ignore storage errors
  }
}

export function getCurrentLocale() {
  return loadSelectedLocale()
}

const LocaleContext = createContext(null)

export function LocaleProvider({ children }) {
  const [locale, setLocaleState] = useState(() => loadSelectedLocale())

  useEffect(() => {
    const normalized = normalizeLocale(locale)
    saveSelectedLocale(normalized)
    document.documentElement.setAttribute('lang', normalized)
  }, [locale])

  const value = useMemo(
    () => ({
      locale,
      supportedLocales: SUPPORTED_LOCALES,
      setLocale(nextLocale) {
        setLocaleState(normalizeLocale(nextLocale))
      },
    }),
    [locale],
  )

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
}

export function useLocale() {
  const context = useContext(LocaleContext)
  if (!context) {
    throw new Error('useLocale must be used within LocaleProvider')
  }
  return context
}
