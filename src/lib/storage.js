const AUTH_STORAGE_KEY = 'jotigames.auth'

export function loadAuthState() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY)
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') {
      return null
    }

    if (!parsed.token || !parsed.principalType) {
      return null
    }

    return parsed
  } catch {
    return null
  }
}

export function saveAuthState(state) {
  if (!state) {
    clearAuthState()
    return
  }

  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state))
}

export function clearAuthState() {
  localStorage.removeItem(AUTH_STORAGE_KEY)
}
