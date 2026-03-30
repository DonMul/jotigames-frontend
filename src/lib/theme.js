const THEME_STORAGE_KEY = 'jotigames-theme'

function normalizeTheme(value) {
  if (value === 'dark' || value === 'light') return value
  return 'light'
}

export function getTheme() {
  try {
    return normalizeTheme(localStorage.getItem(THEME_STORAGE_KEY))
  } catch {
    return 'light'
  }
}

export function setTheme(theme) {
  const normalized = normalizeTheme(theme)
  const root = document.documentElement
  if (normalized === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
  try {
    localStorage.setItem(THEME_STORAGE_KEY, normalized)
  } catch {
  }
  return normalized
}

export function toggleTheme() {
  const next = getTheme() === 'dark' ? 'light' : 'dark'
  return setTheme(next)
}
