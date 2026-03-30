import { API_BASE_URL } from './config'
import { getCurrentLocale } from './locale'

function toApiUrl(path) {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path
  }

  if (API_BASE_URL) {
    return `${API_BASE_URL}${path}`
  }

  return path
}

async function parseJsonSafe(response) {
  try {
    return await response.json()
  } catch {
    return null
  }
}

export async function apiRequest(path, { method = 'GET', token, body, headers } = {}) {
  const locale = getCurrentLocale()

  const requestHeaders = {
    'Content-Type': 'application/json',
    'X-Locale': locale,
    'Accept-Language': locale,
    ...(headers || {}),
  }

  if (token) {
    requestHeaders.Authorization = `Bearer ${token}`
  }

  const response = await fetch(toApiUrl(path), {
    method,
    headers: requestHeaders,
    body: body === undefined ? undefined : JSON.stringify(body),
  })

  const payload = await parseJsonSafe(response)

  if (!response.ok) {
    const message = payload?.message || payload?.detail || `Request failed (${response.status})`
    const error = new Error(message)
    error.status = response.status
    error.payload = payload
    throw error
  }

  return payload
}

export const authApi = {
  loginUser: (email, password) => apiRequest('/api/auth/user', { method: 'POST', body: { email, password } }),
  loginTeam: (game_code, team_code) => apiRequest('/api/auth/team', { method: 'POST', body: { game_code, team_code } }),
}

export const gameApi = {
  async listGameTypes(token) {
    const payload = await apiRequest('/api/game/game-types', { token })
    return Array.isArray(payload?.game_types) ? payload.game_types : []
  },
  async getGameTypeAvailability(token) {
    const payload = await apiRequest('/api/game/game-types/availability', { token })
    return Array.isArray(payload?.game_types) ? payload.game_types : []
  },
  async updateGameTypeAvailability(token, enabled_game_types) {
    const payload = await apiRequest('/api/game/game-types/availability', {
      method: 'PUT',
      token,
      body: { enabled_game_types },
    })
    return Array.isArray(payload?.game_types) ? payload.game_types : []
  },
  async listGames(token) {
    const payload = await apiRequest('/api/game', { token })
    return Array.isArray(payload?.games) ? payload.games : []
  },
  getTeamDashboard: (token) => apiRequest('/api/game/team/dashboard', { token }),
  async getGame(token, gameId) {
    const payload = await apiRequest(`/api/game/${gameId}`, { token })
    return payload?.game || null
  },
  async createGame(token, body) {
    const payload = await apiRequest('/api/game', { method: 'POST', token, body })
    return payload?.game || null
  },
  async updateGame(token, gameId, body) {
    const payload = await apiRequest(`/api/game/${gameId}`, { method: 'PUT', token, body })
    return payload?.game || null
  },
  deleteGame: (token, gameId) => apiRequest(`/api/game/${gameId}`, { method: 'DELETE', token }),
  async listTeams(token, gameId) {
    const payload = await apiRequest(`/api/game/${gameId}/teams`, { token })
    return Array.isArray(payload?.teams) ? payload.teams : []
  },
  async getTeam(token, gameId, teamId) {
    const payload = await apiRequest(`/api/game/${gameId}/teams/${teamId}`, { token })
    return payload?.team || null
  },
  async getTeamLogoOptions(token) {
    const payload = await apiRequest('/api/game/team-logos', { token })
    return {
      categories: Array.isArray(payload?.categories) ? payload.categories : [],
      options: Array.isArray(payload?.options) ? payload.options : [],
    }
  },
  async listMembers(token, gameId) {
    const payload = await apiRequest(`/api/game/${gameId}/members`, { token })
    return Array.isArray(payload?.members) ? payload.members : []
  },
  async getChat(token, gameId, limit = 50) {
    const payload = await apiRequest(`/api/game/${gameId}/chat?limit=${limit}`, { token })
    return Array.isArray(payload?.messages) ? payload.messages : []
  },
  async sendChat(token, gameId, message) {
    const payload = await apiRequest(`/api/game/${gameId}/chat`, { method: 'POST', token, body: { message } })
    return payload?.message || null
  },
  createTeam: (token, gameId, body) => apiRequest(`/api/game/${gameId}/teams`, { method: 'POST', token, body }),
  updateTeam: (token, gameId, teamId, body) => apiRequest(`/api/game/${gameId}/teams/${teamId}`, { method: 'PUT', token, body }),
  deleteTeam: (token, gameId, teamId) => apiRequest(`/api/game/${gameId}/teams/${teamId}`, { method: 'DELETE', token }),
  sendTeamMessage: (token, gameId, teamId, message, level = 'info') =>
    apiRequest(`/api/game/${gameId}/teams/${teamId}/message`, { method: 'POST', token, body: { message, level } }),
  resetGame: (token, gameId) => apiRequest(`/api/game/${gameId}/reset`, { method: 'POST', token }),
  addAdmin: (token, gameId, email) => apiRequest(`/api/game/${gameId}/admins`, { method: 'POST', token, body: { email } }),
  removeAdmin: (token, gameId, userId) => apiRequest(`/api/game/${gameId}/admins/${userId}`, { method: 'DELETE', token }),
  addGameMaster: (token, gameId, email) => apiRequest(`/api/game/${gameId}/game-masters`, { method: 'POST', token, body: { email } }),
  removeGameMaster: (token, gameId, userId) => apiRequest(`/api/game/${gameId}/game-masters/${userId}`, { method: 'DELETE', token }),

  // ── User profile (self-service) ───────────────────────────────────
  getMyProfile: (token) => apiRequest('/api/auth/me', { token }),
  updateMyProfile: (token, body) => apiRequest('/api/auth/me', { method: 'PUT', token, body }),
  changeMyPassword: (token, body) => apiRequest('/api/auth/me/password', { method: 'PUT', token, body }),

  // ── Subscription (user-facing) ──────────────────────────────────────
  getMonetisationStatus: () => apiRequest('/api/subscription/status'),
  getSubscriptionPlans: (token) => apiRequest('/api/subscription/plans', { token }),
  getMySubscription: (token) => apiRequest('/api/subscription/me', { token }),
  subscribeToPlan: (token, body) => apiRequest('/api/subscription/subscribe', { method: 'POST', token, body }),
  changePlan: (token, body) => apiRequest('/api/subscription/change-plan', { method: 'POST', token, body }),
  cancelSubscription: (token, body) => apiRequest('/api/subscription/cancel', { method: 'POST', token, body }),
  reactivateSubscription: (token) => apiRequest('/api/subscription/reactivate', { method: 'POST', token }),
  getTopupPackages: (token) => apiRequest('/api/subscription/topup-packages', { token }),
  purchaseTopup: (token, body) => apiRequest('/api/subscription/topup', { method: 'POST', token, body }),
  getMyPayments: (token, { limit = 20, offset = 0 } = {}) => {
    const params = new URLSearchParams()
    if (limit) params.set('limit', String(limit))
    if (offset) params.set('offset', String(offset))
    const qs = params.toString()
    return apiRequest(`/api/subscription/my-payments${qs ? `?${qs}` : ''}`, { token })
  },
}

const MODULE_PREFIX = {
  geohunter: 'geohunter',
  blindhike: 'blindhike',
  resource_run: 'resource-run',
  territory_control: 'territory-control',
  market_crash: 'market-crash',
  crazy_88: 'crazy88',
  courier_rush: 'courier-rush',
  echo_hunt: 'echo-hunt',
  checkpoint_heist: 'checkpoint-heist',
  pandemic_response: 'pandemic-response',
  birds_of_prey: 'birds-of-prey',
  code_conspiracy: 'code-conspiracy',
}

export const moduleApi = {
  async getOverview(token, gameType, gameId) {
    const prefix = MODULE_PREFIX[gameType]
    if (!prefix) {
      return null
    }

    const payload = await apiRequest(`/api/${prefix}/${gameId}/overview`, { token })
    return payload?.overview || null
  },
  async getBootstrap(token, gameType, gameId, teamId) {
    if (gameType === 'exploding_kittens') {
      return this.getExplodingState(token, gameId, teamId)
    }

    const prefix = MODULE_PREFIX[gameType]
    if (!prefix) {
      return null
    }

    const payload = await apiRequest(`/api/${prefix}/${gameId}/teams/${teamId}/bootstrap`, { token })
    return payload?.state || null
  },
  async submitAction(token, gameType, gameId, teamId, body, actionPathOverride) {
    if (gameType === 'exploding_kittens') {
      const action = String(body?.action || '').trim()
      return this.submitExplodingAction(token, gameId, teamId, action, body)
    }

    const prefix = MODULE_PREFIX[gameType]
    if (!prefix) {
      throw new Error(`Unsupported game type: ${gameType}`)
    }

    const actionPathByType = {
      geohunter: 'question/answer',
      blindhike: 'marker/add',
      resource_run: 'resource/claim',
      territory_control: 'zone/claim',
      market_crash: 'trade/execute',
      crazy_88: 'task/submit',
      courier_rush: 'pickup/confirm',
      echo_hunt: 'beacon/claim',
      checkpoint_heist: 'capture/confirm',
      pandemic_response: 'pickup/collect',
      birds_of_prey: 'egg/drop',
      code_conspiracy: 'code/submit',
    }

    const actionPath = actionPathOverride || actionPathByType[gameType]
    if (!actionPath) {
      throw new Error(`No action endpoint configured for game type: ${gameType}`)
    }

    return apiRequest(`/api/${prefix}/${gameId}/teams/${teamId}/${actionPath}`, {
      method: 'POST',
      token,
      body,
    })
  },
  async submitAdminAction(token, gameType, gameId, body) {
    if (gameType === 'crazy_88') {
      return apiRequest(`/api/crazy88/${gameId}/review/judge`, {
        method: 'POST',
        token,
        body,
      })
    }

    throw new Error(`No admin action endpoint configured for game type: ${gameType}`)
  },
  async getExplodingState(token, gameId, teamId) {
    const payload = await apiRequest(`/api/exploding-kittens/${gameId}/teams/${teamId}/state`, { token })
    return payload?.state || null
  },
  async submitExplodingAction(token, gameId, teamId, action, body = {}) {
    const cardId = String(body?.card_id || '').trim()
    const actionId = String(body?.action_id || '').trim()

    if (action === 'scan') {
      return apiRequest(`/api/exploding-kittens/${gameId}/teams/${teamId}/scan`, {
        method: 'POST',
        token,
        body,
      })
    }

    if (action === 'resolve-state') {
      return apiRequest(`/api/exploding-kittens/${gameId}/teams/${teamId}/state/resolve`, {
        method: 'POST',
        token,
        body,
      })
    }

    if (action === 'resolve-action') {
      if (!actionId) {
        throw new Error('action_id is required for resolve-action')
      }

      return apiRequest(`/api/exploding-kittens/${gameId}/teams/${teamId}/actions/${actionId}/resolve`, {
        method: 'POST',
        token,
        body,
      })
    }

    if (action === 'play-card') {
      if (!cardId) {
        throw new Error('card_id is required for play-card')
      }

      return apiRequest(`/api/exploding-kittens/${gameId}/teams/${teamId}/cards/${cardId}/play`, {
        method: 'POST',
        token,
        body,
      })
    }

    throw new Error('Unsupported exploding_kittens action. Use scan, resolve-state, resolve-action or play-card.')
  },
  useExplodingCombo: (token, gameId, teamId, body) =>
    apiRequest(`/api/exploding-kittens/${gameId}/teams/${teamId}/combos/use`, {
      method: 'POST',
      token,
      body,
    }),
  async listExplodingCards(token, gameId) {
    const payload = await apiRequest(`/api/exploding-kittens/${gameId}/cards`, { token })
    return Array.isArray(payload?.cards) ? payload.cards : []
  },
  async listExplodingPendingActions(token, gameId) {
    const payload = await apiRequest(`/api/exploding-kittens/${gameId}/actions/pending`, { token })
    return Array.isArray(payload?.actions) ? payload.actions : []
  },
  addExplodingCardsBulk: (token, gameId, card_type, quantity) =>
    apiRequest(`/api/exploding-kittens/${gameId}/cards/bulk-add`, { method: 'POST', token, body: { card_type, quantity } }),
  deleteExplodingCard: (token, gameId, cardId) =>
    apiRequest(`/api/exploding-kittens/${gameId}/cards/${cardId}`, { method: 'DELETE', token }),
  addRandomExplodingTeamHandCardByType: (token, gameId, teamId, card_type) =>
    apiRequest(`/api/exploding-kittens/${gameId}/teams/${teamId}/hand/add-random`, {
      method: 'POST',
      token,
      body: { card_type },
    }),
  removeRandomExplodingTeamHandCardByType: (token, gameId, teamId, card_type) =>
    apiRequest(`/api/exploding-kittens/${gameId}/teams/${teamId}/hand/remove-random`, {
      method: 'POST',
      token,
      body: { card_type },
    }),
  adjustExplodingTeamLives: (token, gameId, teamId, delta) =>
    apiRequest(`/api/exploding-kittens/${gameId}/teams/${teamId}/lives/adjust`, {
      method: 'POST',
      token,
      body: { delta },
    }),
  async exportExplodingCardsPdf(token, gameId, options = {}) {
    const locale = getCurrentLocale()
    const formData = new FormData()
    formData.append('per_row', String(Number(options.per_row || 3)))
    formData.append('rows_per_page', String(Number(options.rows_per_page || 8)))
    formData.append('include_final_url', options.include_final_url ? 'true' : 'false')
    if (options.center_logo instanceof File) {
      formData.append('center_logo', options.center_logo)
    }

    const response = await fetch(toApiUrl(`/api/exploding-kittens/${gameId}/cards/pdf`), {
      method: 'POST',
      headers: {
        'X-Locale': locale,
        'Accept-Language': locale,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    })

    if (!response.ok) {
      const payload = await parseJsonSafe(response)
      const message = payload?.message || payload?.detail || `Request failed (${response.status})`
      const error = new Error(message)
      error.status = response.status
      error.payload = payload
      throw error
    }

    const blob = await response.blob()
    const contentDisposition = response.headers.get('content-disposition') || ''
    const fileNameMatch = contentDisposition.match(/filename="?([^";]+)"?/i)
    const filename = fileNameMatch?.[1] || `game-${gameId}-qr-codes.pdf`
    return { blob, filename }
  },
  getCrazy88Config: (token, gameId) => apiRequest(`/api/crazy88/${gameId}/config`, { token }),
  updateCrazy88Config: (token, gameId, body) => apiRequest(`/api/crazy88/${gameId}/config`, { method: 'PUT', token, body }),
  getCrazy88Tasks: (token, gameId) => apiRequest(`/api/crazy88/${gameId}/tasks`, { token }),
  createCrazy88Task: (token, gameId, body) => apiRequest(`/api/crazy88/${gameId}/tasks`, { method: 'POST', token, body }),
  updateCrazy88Task: (token, gameId, taskId, body) => apiRequest(`/api/crazy88/${gameId}/tasks/${taskId}`, { method: 'PUT', token, body }),
  deleteCrazy88Task: (token, gameId, taskId) => apiRequest(`/api/crazy88/${gameId}/tasks/${taskId}`, { method: 'DELETE', token }),
  reorderCrazy88Tasks: (token, gameId, ordered_ids) =>
    apiRequest(`/api/crazy88/${gameId}/tasks/reorder`, { method: 'POST', token, body: { ordered_ids } }),
  getCrazy88Reviews: (token, gameId) => apiRequest(`/api/crazy88/${gameId}/reviews`, { token }),
  unlockCrazy88Review: (token, gameId) => apiRequest(`/api/crazy88/${gameId}/reviews/unlock`, { method: 'POST', token }),
  judgeCrazy88Submission: (token, gameId, body) => apiRequest(`/api/crazy88/${gameId}/review/judge`, { method: 'POST', token, body }),
  async exportCrazy88Files(token, gameId, grouping = 'team_task') {
    const locale = getCurrentLocale()
    const response = await fetch(toApiUrl(`/api/crazy88/${gameId}/exports/files`), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Locale': locale,
        'Accept-Language': locale,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ grouping }),
    })

    if (!response.ok) {
      const payload = await parseJsonSafe(response)
      const message = payload?.message || payload?.detail || `Request failed (${response.status})`
      const error = new Error(message)
      error.status = response.status
      error.payload = payload
      throw error
    }

    const blob = await response.blob()
    const contentDisposition = response.headers.get('content-disposition') || ''
    const fileNameMatch = contentDisposition.match(/filename="?([^";]+)"?/i)
    const filename = fileNameMatch?.[1] || `crazy88-${gameId}.zip`
    return { blob, filename }
  },
  getGeoHunterPois: (token, gameId) => apiRequest(`/api/geohunter/${gameId}/pois`, { token }),
  getGeoHunterPoi: (token, gameId, poiId) => apiRequest(`/api/geohunter/${gameId}/pois/${poiId}`, { token }),
  createGeoHunterPoi: (token, gameId, body) => apiRequest(`/api/geohunter/${gameId}/pois`, { method: 'POST', token, body }),
  updateGeoHunterPoi: (token, gameId, poiId, body) =>
    apiRequest(`/api/geohunter/${gameId}/pois/${poiId}`, { method: 'PUT', token, body }),
  deleteGeoHunterPoi: (token, gameId, poiId) => apiRequest(`/api/geohunter/${gameId}/pois/${poiId}`, { method: 'DELETE', token }),
  updateGeoHunterRetrySettings: (token, gameId, retry_enabled, retry_timeout_seconds) =>
    apiRequest(`/api/geohunter/${gameId}/retry-settings`, {
      method: 'PUT',
      token,
      body: { retry_enabled, retry_timeout_seconds },
    }),
  updateGeoHunterLocation: (token, gameId, teamId, body) =>
    apiRequest(`/api/geohunter/${gameId}/teams/${teamId}/location/update`, { method: 'POST', token, body }),
  getResourceRunNodes: (token, gameId) => apiRequest(`/api/resource-run/${gameId}/nodes`, { token }),
  getResourceRunNode: (token, gameId, nodeId) => apiRequest(`/api/resource-run/${gameId}/nodes/${nodeId}`, { token }),
  createResourceRunNode: (token, gameId, body) => apiRequest(`/api/resource-run/${gameId}/nodes`, { method: 'POST', token, body }),
  updateResourceRunNode: (token, gameId, nodeId, body) =>
    apiRequest(`/api/resource-run/${gameId}/nodes/${nodeId}`, { method: 'PUT', token, body }),
  deleteResourceRunNode: (token, gameId, nodeId) => apiRequest(`/api/resource-run/${gameId}/nodes/${nodeId}`, { method: 'DELETE', token }),
  getTerritoryZones: (token, gameId) => apiRequest(`/api/territory-control/${gameId}/zones`, { token }),
  getTerritoryZone: (token, gameId, zoneId) => apiRequest(`/api/territory-control/${gameId}/zones/${zoneId}`, { token }),
  createTerritoryZone: (token, gameId, body) => apiRequest(`/api/territory-control/${gameId}/zones`, { method: 'POST', token, body }),
  updateTerritoryZone: (token, gameId, zoneId, body) =>
    apiRequest(`/api/territory-control/${gameId}/zones/${zoneId}`, { method: 'PUT', token, body }),
  deleteTerritoryZone: (token, gameId, zoneId) => apiRequest(`/api/territory-control/${gameId}/zones/${zoneId}`, { method: 'DELETE', token }),
  updateTerritoryControlLocation: (token, gameId, teamId, body) =>
    apiRequest(`/api/territory-control/${gameId}/teams/${teamId}/location/update`, { method: 'POST', token, body }),
  getBlindHikeConfig: (token, gameId) => apiRequest(`/api/blindhike/${gameId}/config`, { token }),
  updateBlindHikeConfig: (token, gameId, body) => apiRequest(`/api/blindhike/${gameId}/config`, { method: 'PUT', token, body }),
  getCourierRushConfig: (token, gameId) => apiRequest(`/api/courier-rush/${gameId}/config`, { token }),
  updateCourierRushConfig: (token, gameId, body) => apiRequest(`/api/courier-rush/${gameId}/config`, { method: 'PUT', token, body }),
  getCourierRushPickups: (token, gameId) => apiRequest(`/api/courier-rush/${gameId}/pickups`, { token }),
  createCourierRushPickup: (token, gameId, body) => apiRequest(`/api/courier-rush/${gameId}/pickups`, { method: 'POST', token, body }),
  updateCourierRushPickup: (token, gameId, pickupId, body) =>
    apiRequest(`/api/courier-rush/${gameId}/pickups/${pickupId}`, { method: 'PUT', token, body }),
  deleteCourierRushPickup: (token, gameId, pickupId) => apiRequest(`/api/courier-rush/${gameId}/pickups/${pickupId}`, { method: 'DELETE', token }),
  getCourierRushDropoffs: (token, gameId) => apiRequest(`/api/courier-rush/${gameId}/dropoffs`, { token }),
  createCourierRushDropoff: (token, gameId, body) => apiRequest(`/api/courier-rush/${gameId}/dropoffs`, { method: 'POST', token, body }),
  updateCourierRushDropoff: (token, gameId, dropoffId, body) =>
    apiRequest(`/api/courier-rush/${gameId}/dropoffs/${dropoffId}`, { method: 'PUT', token, body }),
  deleteCourierRushDropoff: (token, gameId, dropoffId) => apiRequest(`/api/courier-rush/${gameId}/dropoffs/${dropoffId}`, { method: 'DELETE', token }),
  getEchoHuntBeacons: (token, gameId) => apiRequest(`/api/echo-hunt/${gameId}/beacons`, { token }),
  getEchoHuntBeacon: (token, gameId, beaconId) => apiRequest(`/api/echo-hunt/${gameId}/beacons/${beaconId}`, { token }),
  createEchoHuntBeacon: (token, gameId, body) => apiRequest(`/api/echo-hunt/${gameId}/beacons`, { method: 'POST', token, body }),
  updateEchoHuntBeacon: (token, gameId, beaconId, body) =>
    apiRequest(`/api/echo-hunt/${gameId}/beacons/${beaconId}`, { method: 'PUT', token, body }),
  deleteEchoHuntBeacon: (token, gameId, beaconId) => apiRequest(`/api/echo-hunt/${gameId}/beacons/${beaconId}`, { method: 'DELETE', token }),
  updateEchoHuntLocation: (token, gameId, teamId, body) =>
    apiRequest(`/api/echo-hunt/${gameId}/teams/${teamId}/location/update`, { method: 'POST', token, body }),
  getCheckpointHeistCheckpoints: (token, gameId) => apiRequest(`/api/checkpoint-heist/${gameId}/checkpoints`, { token }),
  createCheckpointHeistCheckpoint: (token, gameId, body) =>
    apiRequest(`/api/checkpoint-heist/${gameId}/checkpoints`, { method: 'POST', token, body }),
  updateCheckpointHeistCheckpoint: (token, gameId, checkpointId, body) =>
    apiRequest(`/api/checkpoint-heist/${gameId}/checkpoints/${checkpointId}`, { method: 'PUT', token, body }),
  deleteCheckpointHeistCheckpoint: (token, gameId, checkpointId) =>
    apiRequest(`/api/checkpoint-heist/${gameId}/checkpoints/${checkpointId}`, { method: 'DELETE', token }),
  reorderCheckpointHeistCheckpoints: (token, gameId, ordered_ids) =>
    apiRequest(`/api/checkpoint-heist/${gameId}/checkpoints/reorder`, { method: 'POST', token, body: { ordered_ids } }),
  getPandemicResponseConfig: (token, gameId) => apiRequest(`/api/pandemic-response/${gameId}/config`, { token }),
  updatePandemicResponseConfig: (token, gameId, body) =>
    apiRequest(`/api/pandemic-response/${gameId}/config`, { method: 'PUT', token, body }),
  getPandemicResponseAdminState: (token, gameId) => apiRequest(`/api/pandemic-response/${gameId}/admin/state`, { token }),
  getMarketCrashAdminData: (token, gameId) => apiRequest(`/api/market-crash/${gameId}/admin/data`, { token }),
  updateMarketCrashLocation: (token, gameId, teamId, body) =>
    apiRequest(`/api/market-crash/${gameId}/teams/${teamId}/location/update`, { method: 'POST', token, body }),
  executeMarketCrashTrade: (token, gameId, teamId, body) =>
    apiRequest(`/api/market-crash/${gameId}/teams/${teamId}/trade/execute`, { method: 'POST', token, body }),
  createMarketCrashResource: (token, gameId, body) => apiRequest(`/api/market-crash/${gameId}/resources`, { method: 'POST', token, body }),
  updateMarketCrashResource: (token, gameId, resourceId, body) =>
    apiRequest(`/api/market-crash/${gameId}/resources/${resourceId}`, { method: 'PUT', token, body }),
  deleteMarketCrashResource: (token, gameId, resourceId) =>
    apiRequest(`/api/market-crash/${gameId}/resources/${resourceId}`, { method: 'DELETE', token }),
  createMarketCrashPoint: (token, gameId, body) => apiRequest(`/api/market-crash/${gameId}/points`, { method: 'POST', token, body }),
  updateMarketCrashPoint: (token, gameId, pointId, body) =>
    apiRequest(`/api/market-crash/${gameId}/points/${pointId}`, { method: 'PUT', token, body }),
  deleteMarketCrashPoint: (token, gameId, pointId) =>
    apiRequest(`/api/market-crash/${gameId}/points/${pointId}`, { method: 'DELETE', token }),
  getBirdsOfPreyConfig: (token, gameId) => apiRequest(`/api/birds-of-prey/${gameId}/config`, { token }),
  updateBirdsOfPreyConfig: (token, gameId, body) => apiRequest(`/api/birds-of-prey/${gameId}/config`, { method: 'PUT', token, body }),
  dropBirdsOfPreyEgg: (token, gameId, teamId, body = {}) =>
    apiRequest(`/api/birds-of-prey/${gameId}/teams/${teamId}/egg/drop`, { method: 'POST', token, body }),
  destroyBirdsOfPreyEgg: (token, gameId, teamId, body) =>
    apiRequest(`/api/birds-of-prey/${gameId}/teams/${teamId}/egg/destroy`, { method: 'POST', token, body }),
  updateBirdsOfPreyLocation: (token, gameId, teamId, body) =>
    apiRequest(`/api/birds-of-prey/${gameId}/teams/${teamId}/location/update`, { method: 'POST', token, body }),
  getCodeConspiracyConfig: (token, gameId) => apiRequest(`/api/code-conspiracy/${gameId}/config`, { token }),
  updateCodeConspiracyConfig: (token, gameId, body) => apiRequest(`/api/code-conspiracy/${gameId}/config`, { method: 'PUT', token, body }),
  endCodeConspiracyGame: (token, gameId) => apiRequest(`/api/code-conspiracy/${gameId}/end`, { method: 'POST', token }),
  getSuperAdminTokenStatus: (token) => apiRequest('/api/super-admin/tokens', { token }),
  getSuperAdminTokenBundles: (token) => apiRequest('/api/super-admin/tokens/bundles', { token }),
  createSuperAdminTokenBundle: (token, body) => apiRequest('/api/super-admin/tokens/bundles', { method: 'POST', token, body }),
  updateSuperAdminTokenBundle: (token, bundleId, body) =>
    apiRequest(`/api/super-admin/tokens/bundles/${bundleId}`, { method: 'PUT', token, body }),
  getSuperAdminTokenCoupons: (token) => apiRequest('/api/super-admin/tokens/coupons', { token }),
  createSuperAdminTokenCoupons: (token, body) => apiRequest('/api/super-admin/tokens/coupons', { method: 'POST', token, body }),
  getSuperAdminTokenRules: (token) => apiRequest('/api/super-admin/tokens/rules', { token }),
  createSuperAdminTokenRule: (token, body) => apiRequest('/api/super-admin/tokens/rules', { method: 'POST', token, body }),
  updateSuperAdminTokenRule: (token, ruleId, body) =>
    apiRequest(`/api/super-admin/tokens/rules/${ruleId}`, { method: 'PUT', token, body }),
}
