import { createContext, useContext, useEffect, useMemo, useState } from 'react'

import { useLocale } from './locale'

const localeLoaders = import.meta.glob('../i18n/locales/*.json')

const localeCache = new Map()

const I18nContext = createContext(null)

function interpolate(value, params) {
  if (typeof value !== 'string') {
    return value
  }

  return value.replace(/\{(\w+)\}/g, (_, key) => {
    if (Object.prototype.hasOwnProperty.call(params, key)) {
      return String(params[key])
    }
    return `{${key}}`
  })
}

function getByPath(object, path) {
  return path.split('.').reduce((acc, key) => (acc && Object.prototype.hasOwnProperty.call(acc, key) ? acc[key] : undefined), object)
}

function resolveLocaleFile(locale) {
  const normalized = String(locale || 'nl').trim().replace('-', '_')
  const normalizedLower = normalized.toLowerCase()
  const languageOnly = normalizedLower.split('_')[0]

  const candidates = [
    normalized,
    normalizedLower,
    languageOnly,
    'nl',
    'en',
  ]

  for (const candidate of candidates) {
    const path = `../i18n/locales/${candidate}.json`
    if (localeLoaders[path]) {
      return candidate
    }
  }

  return 'en'
}

async function loadMessagesFor(language) {
  if (localeCache.has(language)) {
    return localeCache.get(language)
  }

  const loaderPath = `../i18n/locales/${language}.json`
  const fallbackPath = '../i18n/locales/en.json'
  const loader = localeLoaders[loaderPath] || localeLoaders[fallbackPath]
  if (!loader) {
    return {}
  }
  const module = await loader()
  const messages = module?.default || module || {}
  localeCache.set(language, messages)
  return messages
}

export function I18nProvider({ children }) {
  const { locale } = useLocale()
  const language = resolveLocaleFile(locale)
  const [messages, setMessages] = useState({})
  const [isReady, setIsReady] = useState(false)

  useEffect(() => {
    let active = true
    setIsReady(false)

    loadMessagesFor(language)
      .then((loaded) => {
        if (!active) {
          return
        }
        setMessages(loaded)
        setIsReady(true)
      })
      .catch(() => {
        if (!active) {
          return
        }
        setMessages({})
        setIsReady(true)
      })

    return () => {
      active = false
    }
  }, [language])

  const value = useMemo(() => {
    function t(key, params = {}, fallback = '') {
      const value = getByPath(messages, key)
      if (value === undefined || value === null) {
        return fallback || key
      }
      return interpolate(String(value), params)
    }

    return {
      locale,
      language,
      isReady,
      t,
    }
  }, [isReady, language, locale, messages])

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
}

export function useI18n() {
  const context = useContext(I18nContext)
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider')
  }
  return context
}
