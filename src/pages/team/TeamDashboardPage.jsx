import { Suspense, lazy, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'

const BlindHikeTeamPanel = lazy(() => import('../../components/BlindHikeTeamPanel'))
const BirdsOfPreyTeamPanel = lazy(() => import('../../components/BirdsOfPreyTeamPanel'))
const CheckpointHeistTeamPanel = lazy(() => import('../../components/CheckpointHeistTeamPanel'))
const CodeConspiracyTeamPanel = lazy(() => import('../../components/CodeConspiracyTeamPanel'))
const CourierRushTeamPanel = lazy(() => import('../../components/CourierRushTeamPanel'))
const Crazy88TeamPanel = lazy(() => import('../../components/Crazy88TeamPanel'))
const EchoHuntTeamPanel = lazy(() => import('../../components/EchoHuntTeamPanel'))
const GeoHunterTeamPanel = lazy(() => import('../../components/GeoHunterTeamPanel'))
const MarketCrashTeamPanel = lazy(() => import('../../components/MarketCrashTeamPanel'))
const PandemicResponseTeamPanel = lazy(() => import('../../components/PandemicResponseTeamPanel'))
const ResourceRunTeamPanel = lazy(() => import('../../components/ResourceRunTeamPanel'))
const TerritoryControlTeamPanel = lazy(() => import('../../components/TerritoryControlTeamPanel'))
import GameCardDisplay from '../../components/shared/GameCardDisplay'
import { gameApi, moduleApi } from '../../lib/api'
import { toAssetUrl } from '../../lib/assetUrl'
import { useAuth } from '../../lib/auth'
import { useI18n } from '../../lib/i18n'

function getCardLabel(card, t) {
  const raw = String(card?.title || card?.type || '').trim()
  if (!raw) {
    return t('teamDashboard.card', {}, 'Card')
  }
  if (raw.startsWith('card.type.')) {
    return getCardTypeLabel(raw, t)
  }
  if (raw === String(card?.type || '').trim()) {
    return getCardTypeLabel(raw, t)
  }
  return raw
}

function getCardTypeLabel(type, t) {
  const raw = String(type || '').trim()
  if (!raw) {
    return t('teamDashboard.card', {}, 'Card')
  }

  const normalized = raw.startsWith('card.type.') ? raw.replace('card.type.', '') : raw
  return t(`explodingKittens.cardTypes.${normalized}`, {}, normalized.replaceAll('_', ' '))
}

const EK_PLAYABLE_CARD_TYPES = new Set(['attack', 'favor', 'see_the_future', 'shuffle', 'skip'])
const EK_TARGETED_CARD_TYPES = new Set(['favor'])
const EK_ACTION_RESPONSE_WINDOW_SECONDS = 30
const EK_HOLDABLE_CARD_TYPES = [
  'attack',
  'defuse',
  'favor',
  'nope',
  'see_the_future',
  'shuffle',
  'skip',
  'random1',
  'random2',
  'random3',
  'random4',
  'random5',
]

const EK_STATE_TO_FLAG = {
  skip: 'pending_skip',
  see_the_future: 'pending_peek',
  attack: 'pending_attack',
}

function getCardPendingMessage(cardType, state, t) {
  const type = String(cardType || '').trim()
  if (type === 'attack' && Boolean(state?.pending_attack)) {
    return t('teamDashboard.attackAlreadyPending', {}, 'Attack is already pending')
  }
  if (type === 'see_the_future' && Boolean(state?.pending_peek)) {
    return t('teamDashboard.peekAlreadyPending', {}, 'See the Future is already pending')
  }
  if (type === 'skip' && Boolean(state?.pending_skip)) {
    return t('teamDashboard.skipAlreadyPending', {}, 'Skip is already pending')
  }
  return ''
}

function normalizeRealtimeTeam(payload) {
  const teamId = String(payload?.team_id || payload?.teamId || '').trim()
  if (!teamId) {
    return null
  }
  const name = String(payload?.team_name || payload?.teamName || '').trim()
  const logoPath = String(payload?.team_logo || payload?.teamLogo || '').trim()
  const rawLives = Number(payload?.lives)

  return {
    id: teamId,
    name,
    logo_path: logoPath || null,
    logoPath: logoPath || null,
    ...(Number.isNaN(rawLives) ? {} : { lives: Math.max(0, rawLives) }),
  }
}

function parseActionContext(action) {
  const raw = action?.context
  if (!raw) {
    return {}
  }
  if (typeof raw === 'object') {
    return raw
  }
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw)
      return parsed && typeof parsed === 'object' ? parsed : {}
    } catch {
      return {}
    }
  }
  return {}
}

function getActionTypeLabel(actionType, t) {
  const normalized = String(actionType || '').trim()
  if (normalized === 'favor') {
    return t('teamDashboard.actionTypeFavor', {}, 'Favor')
  }
  if (normalized === 'attack') {
    return t('teamDashboard.actionTypeAttack', {}, 'Attack')
  }
  if (normalized === 'combo_two_same') {
    return t('teamDashboard.actionTypeComboTwo', {}, 'Combo 2')
  }
  if (normalized === 'combo_three_same') {
    return t('teamDashboard.actionTypeComboThree', {}, 'Combo 3')
  }
  return normalized || t('teamDashboard.pendingActions', {}, 'Pending actions')
}

function getActionDescription(action, teams, t) {
  const sourceTeamId = String(action?.source_team_id || action?.sourceTeamId || '').trim()
  const sourceTeamName = teams.find((team) => String(team?.id || '') === sourceTeamId)?.name || sourceTeamId || t('teamDashboard.unknownTeam', {}, 'Unknown team')
  const actionType = String(action?.action_type || action?.actionType || '').trim()
  const actionTypeLabel = getActionTypeLabel(actionType, t)

  let description = t(
    'teamDashboard.actionTargeted',
    { team: sourceTeamName, event: actionTypeLabel },
    `${sourceTeamName} targeted you with ${actionTypeLabel}`,
  )

  const context = parseActionContext(action)
  const requestedCardType = String(
    context.requestedCardType
    || context.requested_card_type
    || action?.requested_card_type
    || action?.requestedCardType
    || '',
  ).trim()
  if (requestedCardType) {
    const requestedLabel = getCardTypeLabel(requestedCardType, t)
    description += ` · ${t('teamDashboard.actionRequestedType', { cardType: requestedLabel }, 'requested: {{cardType}}')}`
  }

  return description
}

function normalizePopupParams(rawParams) {
  return rawParams && typeof rawParams === 'object' ? rawParams : {}
}

function formatCardTypeList(cardTypes, t) {
  const values = Array.isArray(cardTypes)
    ? cardTypes
    : typeof cardTypes === 'string'
      ? cardTypes.split(',').map((item) => item.trim()).filter(Boolean)
      : []
  return values.map((value) => getCardTypeLabel(value, t)).join(', ')
}

function formatPopupBody(payload, t) {
  const fallback = String(payload?.message || '').trim()
  const messageKey = String(payload?.message_key || payload?.messageKey || '').trim()
  if (!messageKey) {
    return fallback
  }

  const params = normalizePopupParams(payload?.message_params || payload?.messageParams)
  const eventRaw = String(params.event || '').trim()
  const eventLabel = eventRaw ? getActionTypeLabel(eventRaw, t) : ''
  const requestedCardRaw = String(params.requestedCardType || params.requested_card_type || '').trim()
  const requestedCardLabel = requestedCardRaw ? getCardTypeLabel(requestedCardRaw, t) : ''

  const base = t(messageKey, {
    ...params,
    event: eventLabel || params.event,
  }, '')
  const resolvedBase = String(base || '').trim() || fallback || messageKey

  const cardsLost = formatCardTypeList(params.cardsLost, t)
  const cardsGained = formatCardTypeList(params.cardsGained, t)
  const livesDelta = Number(params.livesDelta)
  const targetLivesDelta = Number(params.targetLivesDelta)

  if (messageKey === 'teamDashboard.popup.actionTargeted') {
    if (requestedCardLabel) {
      const requestedTypeText = t('teamDashboard.actionRequestedType', { cardType: requestedCardLabel }, '')
      return requestedTypeText ? `${resolvedBase} · ${requestedTypeText}` : resolvedBase
    }
    return resolvedBase
  }

  if (messageKey === 'teamDashboard.popup.actionResolvedTarget' || messageKey === 'teamDashboard.popup.actionResolvedSource') {
    const details = []
    if (!Number.isNaN(livesDelta) && livesDelta !== 0) {
      const value = t('teamDashboard.popup.effectLives', { delta: livesDelta > 0 ? `+${livesDelta}` : `${livesDelta}` }, '')
      if (value) {
        details.push(value)
      }
    }
    if (!Number.isNaN(targetLivesDelta) && targetLivesDelta !== 0) {
      const value = t('teamDashboard.popup.effectTargetLives', { delta: targetLivesDelta > 0 ? `+${targetLivesDelta}` : `${targetLivesDelta}` }, '')
      if (value) {
        details.push(value)
      }
    }
    if (cardsLost) {
      const value = t('teamDashboard.popup.effectCardsLost', { cards: cardsLost }, '')
      if (value) {
        details.push(value)
      }
    }
    if (cardsGained) {
      const value = t('teamDashboard.popup.effectCardsGained', { cards: cardsGained }, '')
      if (value) {
        details.push(value)
      }
    }
    if (details.length === 0) {
      const value = t('teamDashboard.popup.effectNoDirect', {}, '')
      if (value) {
        details.push(value)
      }
    }
    return `${resolvedBase} ${details.join(' ')}`.trim()
  }

  return resolvedBase
}

function parseActionCreatedAt(action) {
  const raw = String(action?.created_at || action?.createdAt || '').trim()
  if (!raw) {
    return null
  }

  if (/^\d+$/.test(raw)) {
    const numeric = Number(raw)
    if (Number.isFinite(numeric)) {
      const millis = numeric < 1000000000000 ? numeric * 1000 : numeric
      const epochDate = new Date(millis)
      if (!Number.isNaN(epochDate.getTime())) {
        return epochDate
      }
    }
  }

  let normalized = raw.replace(' ', 'T')
  if (/^[0-9]{4}-[0-9]{2}-[0-9]{2}T/.test(normalized) && !/(Z|[+-][0-9]{2}:?[0-9]{2})$/i.test(normalized)) {
    normalized = `${normalized}Z`
  }
  if (/[+-][0-9]{4}$/.test(normalized)) {
    normalized = normalized.replace(/([+-][0-9]{2})([0-9]{2})$/, '$1:$2')
  }

  const date = new Date(normalized)
  if (Number.isNaN(date.getTime())) {
    return null
  }
  return date
}

function getActionCountdownSeconds(action, nowMs) {
  const createdAt = parseActionCreatedAt(action)
  if (!createdAt) {
    return null
  }
  const elapsedMs = Math.max(0, nowMs - createdAt.getTime())
  const remainingMs = (EK_ACTION_RESPONSE_WINDOW_SECONDS * 1000) - elapsedMs
  return Math.max(0, Math.ceil(remainingMs / 1000))
}

function formatActionCountdownLabel(remainingSeconds, t) {
  const safeSeconds = Math.max(0, Number(remainingSeconds || 0))
  return t('teamDashboard.actionCountdown', { seconds: safeSeconds }, `${safeSeconds}s`)
}

export default function TeamDashboardPage() {
  const { auth } = useAuth()
  const { t } = useI18n()

  const [bootstrap, setBootstrap] = useState(null)
  const [state, setState] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionError, setActionError] = useState('')
  const [actionSuccess, setActionSuccess] = useState('')
  const [placingBlindHikeMarker, setPlacingBlindHikeMarker] = useState(false)
  const [targetTeamByCard, setTargetTeamByCard] = useState({})
  const [popupQueue, setPopupQueue] = useState([])
  const [selectedComboCards, setSelectedComboCards] = useState([])
  const [comboTargetTeam, setComboTargetTeam] = useState('')
  const [comboRequestedType, setComboRequestedType] = useState('')
  const [comboModeEnabled, setComboModeEnabled] = useState(false)
  const [countdownNowMs, setCountdownNowMs] = useState(() => Date.now())
  const [showBlindHikeConfetti, setShowBlindHikeConfetti] = useState(false)
  const leaderboardItemRefs = useRef(new Map())
  const leaderboardPreviousTopById = useRef(new Map())
  const blindHikeFinishedRef = useRef(false)
  const confettiTimeoutRef = useRef(0)

  const gameId = bootstrap?.game_id || ''
  const teamId = bootstrap?.team_id || auth.principalId
  const isExplodingKittens = bootstrap?.game_type === 'exploding_kittens'
  const isBlindHike = bootstrap?.game_type === 'blindhike'
  const isBirdsOfPrey = bootstrap?.game_type === 'birds_of_prey'
  const isMarketCrash = bootstrap?.game_type === 'market_crash'
  const isCheckpointHeist = bootstrap?.game_type === 'checkpoint_heist'
  const isCodeConspiracy = bootstrap?.game_type === 'code_conspiracy'
  const isCourierRush = bootstrap?.game_type === 'courier_rush'
  const isCrazy88 = bootstrap?.game_type === 'crazy_88'
  const isEchoHunt = bootstrap?.game_type === 'echo_hunt'
  const isGeoHunter = bootstrap?.game_type === 'geohunter'
  const isPandemicResponse = bootstrap?.game_type === 'pandemic_response'
  const isResourceRun = bootstrap?.game_type === 'resource_run'
  const isTerritoryControl = bootstrap?.game_type === 'territory_control'
  const teams = Array.isArray(bootstrap?.teams) ? bootstrap.teams : []
  const [droppingBirdEgg, setDroppingBirdEgg] = useState(false)
  const [destroyingBirdEggId, setDestroyingBirdEggId] = useState('')
  const [executingMarketCrashTradeKey, setExecutingMarketCrashTradeKey] = useState('')

  const [capturingCheckpoint, setCapturingCheckpoint] = useState(false)
  const [submittingCode, setSubmittingCode] = useState(false)
  const [confirmingPickup, setConfirmingPickup] = useState(false)
  const [confirmingDropoff, setConfirmingDropoff] = useState(false)
  const [submittingTask, setSubmittingTask] = useState(false)
  const [claimingBeacon, setClaimingBeacon] = useState(false)
  const [answeringQuestion, setAnsweringQuestion] = useState(false)
  const [collectingPickup, setCollectingPickup] = useState(false)
  const [resolvingHotspot, setResolvingHotspot] = useState(false)
  const [claimingResource, setClaimingResource] = useState(false)
  const [claimingZone, setClaimingZone] = useState(false)

  const otherTeams = useMemo(() => {
    const teams = Array.isArray(bootstrap?.teams) ? bootstrap.teams : []
    return teams.filter((team) => String(team.id) !== String(teamId))
  }, [bootstrap?.teams, teamId])

  const currentTeamLogoPath = useMemo(() => {
    const rows = Array.isArray(bootstrap?.teams) ? bootstrap.teams : []
    const current = rows.find((team) => String(team?.id || '') === String(teamId || ''))
    return String(current?.logo_path || current?.logoPath || '')
  }, [bootstrap?.teams, teamId])

  const hand = useMemo(() => (Array.isArray(state?.hand) ? state.hand : []), [state?.hand])
  const pendingActions = Array.isArray(state?.pending_actions) ? state.pending_actions : []
  const hasNopeCard = hand.some((card) => String(card?.type || '').trim() === 'nope')
  const activePopup = popupQueue.length > 0 ? popupQueue[0] : null

  function triggerBlindHikeConfetti() {
    if (confettiTimeoutRef.current) {
      window.clearTimeout(confettiTimeoutRef.current)
    }
    setShowBlindHikeConfetti(true)
    confettiTimeoutRef.current = window.setTimeout(() => {
      setShowBlindHikeConfetti(false)
    }, 4300)
  }

  function dismissPopup() {
    setPopupQueue((previous) => previous.slice(1))
  }

  const comboSelection = useMemo(() => {
    const selectedCards = hand.filter((card) => selectedComboCards.includes(card.id))
    const selectedTypes = selectedCards.map((card) => String(card?.type || ''))
    const countByType = selectedTypes.reduce((accumulator, type) => {
      const current = Number(accumulator[type] || 0)
      return {
        ...accumulator,
        [type]: current + 1,
      }
    }, {})

    const selectedCount = selectedTypes.length
    const uniqueTypeCount = Object.keys(countByType).length
    const isTwoSame = selectedCount === 2 && uniqueTypeCount === 1
    const isThreeSame = selectedCount === 3 && uniqueTypeCount === 1
    const isFiveDifferent = selectedCount === 5 && uniqueTypeCount === 5
    const mode = isTwoSame ? 'two' : isThreeSame ? 'three' : isFiveDifferent ? 'five' : 'invalid'

    return {
      selectedCount,
      selectedCards,
      mode,
      isValid: mode !== 'invalid',
      needsTarget: mode === 'two' || mode === 'three',
      needsRequestedType: mode === 'three' || mode === 'five',
    }
  }, [hand, selectedComboCards])

  const comboCanSubmit = comboModeEnabled
    && comboSelection.isValid
    && (!comboSelection.needsTarget || String(comboTargetTeam || '').trim() !== '')
    && (!comboSelection.needsRequestedType || String(comboRequestedType || '').trim() !== '')

  useEffect(() => {
    if (pendingActions.length === 0) {
      return
    }

    const timer = window.setInterval(() => {
      setCountdownNowMs(Date.now())
    }, 1000)

    return () => {
      window.clearInterval(timer)
    }
  }, [pendingActions.length])

  async function loadDashboard() {
    setLoading(true)
    setError('')
    try {
      const payload = await gameApi.getTeamDashboard(auth.token)
      setBootstrap(payload)

      const resolvedGameId = String(payload?.game_id || '')
      const resolvedTeamId = String(payload?.team_id || '')
      const gameType = String(payload?.game_type || '')

      if (!resolvedGameId || !resolvedTeamId) {
        throw new Error(t('teamDashboard.noGame', {}, 'Could not resolve active team game'))
      }

      const ekState = await moduleApi.getBootstrap(auth.token, gameType, resolvedGameId, resolvedTeamId)
      setState(ekState)
    } catch (err) {
      setError(err.message || t('teamDashboard.loadFailed', {}, 'Could not load team dashboard'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (auth.principalType !== 'team') {
      return
    }
    loadDashboard()
  }, [auth.principalType, auth.token])

  useEffect(() => {
    if (!auth?.token || !gameId || !teamId) {
      return
    }
    if (typeof window === 'undefined' || !window.JotiWs || typeof window.JotiWs.connect !== 'function') {
      return
    }

    const ws = window.JotiWs.connect({ reconnectMs: 3000 })
    const teamChannel = `channel:${gameId}:${teamId}`
    const gameChannel = `channel:${gameId}`

    const currentGameType = String(bootstrap?.game_type || '').trim()
    const reloadTeamState = async () => {
      if (!currentGameType) {
        return
      }
      try {
        const nextState = await moduleApi.getBootstrap(auth.token, currentGameType, gameId, teamId)
        setState(nextState)
      } catch {
      }
    }
    const enqueuePopup = (payload) => {
      const hasBody = String(payload?.message || '').trim() !== '' || String(payload?.message_key || payload?.messageKey || '').trim() !== ''
      if (!hasBody) {
        return
      }

      const level = String(payload?.level || '').trim() || 'info'
      const id = String(payload?.id || '').trim() || `${Date.now()}-${Math.random()}`
      setPopupQueue((previous) => [...previous, { id, level, payload }])
    }

    const subscribe = () => {
      ws.send('core.subscribe', {
        gameId,
        authToken: auth.token,
        channel: teamChannel,
      })
      ws.send('core.subscribe', {
        gameId,
        authToken: auth.token,
        channel: gameChannel,
      })
    }

    ws.onOpen(() => {
      subscribe()
    })

    ws.onEvent((incoming) => {
      const eventName = String(incoming?.event || '').trim()
      const payload = incoming?.payload && typeof incoming.payload === 'object' ? incoming.payload : {}

      if (eventName === 'team.general.message' || eventName === 'admin.message.team') {
        const messageKey = String(payload?.message_key || payload?.messageKey || '').trim()
        enqueuePopup(payload)
        if (isExplodingKittens && messageKey === 'teamDashboard.popup.actionTargeted') {
          reloadTeamState()
        }
        return
      }

      if (eventName === 'team.general.team.update') {
        const teamUpdate = normalizeRealtimeTeam(payload)
        if (!teamUpdate) {
          return
        }

        if (String(teamUpdate.id) === String(teamId)) {
          setBootstrap((previous) => {
            if (!previous || typeof previous !== 'object') {
              return previous
            }
            return {
              ...previous,
              team_name: teamUpdate.name || previous.team_name,
              team_logo_path: teamUpdate.logo_path,
              ...(typeof teamUpdate.lives === 'number' ? { lives: teamUpdate.lives } : {}),
              teams: Array.isArray(previous.teams)
                ? previous.teams.map((team) => (
                  String(team?.id || '') === String(teamUpdate.id)
                    ? { ...team, ...teamUpdate }
                    : team
                ))
                : previous.teams,
            }
          })
          if (typeof teamUpdate.lives === 'number') {
            setState((previous) => ({
              ...(previous && typeof previous === 'object' ? previous : {}),
              lives: teamUpdate.lives,
            }))
          }
        }
        return
      }

      if (eventName === 'team.blind_hike.marker.added') {
        if (!isBlindHike) {
          return
        }

        const payloadTeamId = String(payload?.team_id || payload?.teamId || '').trim()
        if (!payloadTeamId || payloadTeamId !== String(teamId)) {
          return
        }

        const marker = payload?.marker && typeof payload.marker === 'object' ? payload.marker : null
        const markerId = String(marker?.id || '').trim()
        const markerLat = Number(marker?.lat)
        const markerLon = Number(marker?.lon)
        const markerCount = Number(payload?.marker_count)
        const teamFinished = Boolean(payload?.team_finished)

        if (!markerId || Number.isNaN(markerLat) || Number.isNaN(markerLon)) {
          return
        }

        if (teamFinished && !blindHikeFinishedRef.current) {
          triggerBlindHikeConfetti()
        }
        blindHikeFinishedRef.current = teamFinished

        setState((previous) => {
          const previousState = previous && typeof previous === 'object' ? previous : {}
          const previousMarkers = Array.isArray(previousState.team_markers) ? previousState.team_markers : []
          const exists = previousMarkers.some((entry) => String(entry?.id || '') === markerId)
          const nextMarkers = exists
            ? previousMarkers
            : [
              ...previousMarkers,
              {
                id: markerId,
                lat: markerLat,
                lon: markerLon,
                placed_at: String(marker?.placed_at || ''),
              },
            ]

          return {
            ...previousState,
            team_markers: nextMarkers,
            actions: Number.isNaN(markerCount) ? nextMarkers.length : markerCount,
            finished: teamFinished,
          }
        })
        return
      }

      if (eventName === 'team.birds_of_prey.enemy_eggs.visible') {
        if (!isBirdsOfPrey) {
          return
        }

        const payloadTeamId = String(payload?.team_id || payload?.teamId || '').trim()
        if (!payloadTeamId || payloadTeamId !== String(teamId)) {
          return
        }

        const eggs = Array.isArray(payload?.eggs) ? payload.eggs : []
        setState((previous) => ({
          ...(previous && typeof previous === 'object' ? previous : {}),
          visible_enemy_eggs: eggs,
        }))
        return
      }

      if (eventName === 'team.birds_of_prey.self.updated') {
        if (!isBirdsOfPrey) {
          return
        }

        const payloadTeamId = String(payload?.team_id || payload?.teamId || '').trim()
        if (!payloadTeamId || payloadTeamId !== String(teamId)) {
          return
        }

        const score = Number(payload?.score)
        const location = payload?.location && typeof payload.location === 'object' ? payload.location : null
        setState((previous) => {
          const previousState = previous && typeof previous === 'object' ? previous : {}
          return {
            ...previousState,
            ...(Number.isNaN(score) ? {} : { score }),
            ...(location ? { team_location: location } : {}),
          }
        })
        return
      }

      if (eventName === 'team.birds_of_prey.egg.added') {
        if (!isBirdsOfPrey) {
          return
        }

        const ownerTeamId = String(payload?.owner_team_id || payload?.ownerTeamId || '').trim()
        if (!ownerTeamId || ownerTeamId !== String(teamId)) {
          return
        }

        const eggId = String(payload?.id || '').trim()
        const eggLat = Number(payload?.lat)
        const eggLon = Number(payload?.lon)
        if (!eggId || Number.isNaN(eggLat) || Number.isNaN(eggLon)) {
          return
        }

        setState((previous) => {
          const previousState = previous && typeof previous === 'object' ? previous : {}
          const previousEggs = Array.isArray(previousState.own_eggs) ? previousState.own_eggs : []
          const alreadyExists = previousEggs.some((egg) => String(egg?.id || '') === eggId)
          if (alreadyExists) {
            return previousState
          }

          return {
            ...previousState,
            own_eggs: [
              {
                id: eggId,
                owner_team_id: ownerTeamId,
                owner_team_name: String(payload?.owner_team_name || payload?.ownerTeamName || ''),
                lat: eggLat,
                lon: eggLon,
                dropped_at: String(payload?.dropped_at || ''),
                automatic: Boolean(payload?.automatic),
              },
              ...previousEggs,
            ],
          }
        })
        return
      }

      if (eventName === 'team.birds_of_prey.egg.removed') {
        if (!isBirdsOfPrey) {
          return
        }

        const eggId = String(payload?.egg_id || payload?.eggId || '').trim()
        if (!eggId) {
          return
        }

        setState((previous) => {
          const previousState = previous && typeof previous === 'object' ? previous : {}
          const previousOwnEggs = Array.isArray(previousState.own_eggs) ? previousState.own_eggs : []
          const previousVisibleEnemyEggs = Array.isArray(previousState.visible_enemy_eggs) ? previousState.visible_enemy_eggs : []
          return {
            ...previousState,
            own_eggs: previousOwnEggs.filter((egg) => String(egg?.id || '') !== eggId),
            visible_enemy_eggs: previousVisibleEnemyEggs.filter((egg) => String(egg?.id || '') !== eggId),
          }
        })
        return
      }

      if (eventName === 'team.market_crash.self.updated') {
        if (!isMarketCrash) {
          return
        }

        const payloadTeamId = String(payload?.team_id || payload?.teamId || '').trim()
        if (!payloadTeamId || payloadTeamId !== String(teamId)) {
          return
        }

        const cash = Number(payload?.cash)
        const score = Number(payload?.score)
        const inventory = payload?.inventory && typeof payload.inventory === 'object' ? payload.inventory : null

        setState((previous) => {
          const previousState = previous && typeof previous === 'object' ? previous : {}
          const leaderboardRows = Array.isArray(previousState.leaderboard) ? previousState.leaderboard : []
          const hasSelf = leaderboardRows.some((row) => String(row?.team_id || '') === String(teamId))
          const nextLeaderboard = hasSelf
            ? leaderboardRows.map((row) => (
              String(row?.team_id || '') === String(teamId)
                ? {
                  ...row,
                  ...(Number.isNaN(score) ? {} : { score }),
                  ...(Number.isNaN(cash) ? {} : { cash }),
                }
                : row
            ))
            : leaderboardRows

          return {
            ...previousState,
            ...(Number.isNaN(cash) ? {} : { cash }),
            ...(Number.isNaN(score) ? {} : { score }),
            ...(inventory ? { inventory } : {}),
            leaderboard: nextLeaderboard,
          }
        })
        return
      }

      if (eventName === 'team.market_crash.nearby_points.updated') {
        if (!isMarketCrash) {
          return
        }

        const payloadTeamId = String(payload?.team_id || payload?.teamId || '').trim()
        if (!payloadTeamId || payloadTeamId !== String(teamId)) {
          return
        }

        const nearbyPoints = Array.isArray(payload?.nearby_points) ? payload.nearby_points : []
        const nearbyPointIdsRaw = Array.isArray(payload?.nearby_point_ids) ? payload.nearby_point_ids : nearbyPoints.map((point) => point?.id)
        const nearbyPointIds = nearbyPointIdsRaw.map((value) => String(value || '')).filter(Boolean)
        const nearbySet = new Set(nearbyPointIds)

        setState((previous) => {
          const previousState = previous && typeof previous === 'object' ? previous : {}
          const previousPoints = Array.isArray(previousState.points) ? previousState.points : []
          const nearbyById = new Map(nearbyPoints.map((point) => [String(point?.id || ''), point]))

          const nextPoints = previousPoints.map((point) => {
            const pointId = String(point?.id || '')
            if (!pointId) {
              return point
            }
            const nearbyPatch = nearbyById.get(pointId)
            return {
              ...point,
              ...(nearbyPatch && typeof nearbyPatch === 'object' ? nearbyPatch : {}),
              in_range: nearbySet.has(pointId),
            }
          })

          return {
            ...previousState,
            points: nextPoints,
            nearby_points: nearbyPoints,
            nearby_point_ids: nearbyPointIds,
          }
        })
        return
      }

      if (eventName === 'team.geohunter.nearby.updated') {
        if (!isGeoHunter) {
          return
        }
        const payloadTeamId = String(payload?.team_id || payload?.teamId || '').trim()
        if (!payloadTeamId || payloadTeamId !== String(teamId)) {
          return
        }
        const nearbyPoiIds = Array.isArray(payload?.nearby_poi_ids) ? payload.nearby_poi_ids.map((value) => String(value || '')).filter(Boolean) : []
        setState((previous) => ({
          ...(previous && typeof previous === 'object' ? previous : {}),
          nearby_poi_ids: nearbyPoiIds,
        }))
        return
      }

      if (eventName === 'team.echo_hunt.nearby.updated') {
        if (!isEchoHunt) {
          return
        }
        const payloadTeamId = String(payload?.team_id || payload?.teamId || '').trim()
        if (!payloadTeamId || payloadTeamId !== String(teamId)) {
          return
        }
        const nearbyBeaconIds = Array.isArray(payload?.nearby_beacon_ids) ? payload.nearby_beacon_ids.map((value) => String(value || '')).filter(Boolean) : []
        setState((previous) => ({
          ...(previous && typeof previous === 'object' ? previous : {}),
          nearby_beacon_ids: nearbyBeaconIds,
        }))
        return
      }

      if (eventName === 'team.territory_control.nearby.updated') {
        if (!isTerritoryControl) {
          return
        }
        const payloadTeamId = String(payload?.team_id || payload?.teamId || '').trim()
        if (!payloadTeamId || payloadTeamId !== String(teamId)) {
          return
        }
        const nearbyZoneIds = Array.isArray(payload?.nearby_zone_ids) ? payload.nearby_zone_ids.map((value) => String(value || '')).filter(Boolean) : []
        setState((previous) => ({
          ...(previous && typeof previous === 'object' ? previous : {}),
          nearby_zone_ids: nearbyZoneIds,
        }))
        return
      }

      if (eventName === 'team.market_crash.prices.updated') {
        if (!isMarketCrash) {
          return
        }

        const payloadTeamId = String(payload?.team_id || payload?.teamId || '').trim()
        if (!payloadTeamId || payloadTeamId !== String(teamId)) {
          return
        }

        const pointsPatch = payload?.points && typeof payload.points === 'object' ? payload.points : {}

        setState((previous) => {
          const previousState = previous && typeof previous === 'object' ? previous : {}
          const previousPoints = Array.isArray(previousState.points) ? previousState.points : []
          const previousNearbyPoints = Array.isArray(previousState.nearby_points) ? previousState.nearby_points : []

          const applyPatchToPoint = (point) => {
            const pointId = String(point?.id || '')
            const pointResourcePatch = pointsPatch[pointId]
            if (!pointId || !pointResourcePatch || typeof pointResourcePatch !== 'object') {
              return point
            }

            const resourceSettings = Array.isArray(point?.resource_settings) ? point.resource_settings : []
            const nextResourceSettings = resourceSettings.map((setting) => {
              const resourceId = String(setting?.resource_id || '')
              const update = pointResourcePatch[resourceId]
              if (!resourceId || !update || typeof update !== 'object') {
                return setting
              }
              return {
                ...setting,
                ...(update?.buy_price === undefined ? {} : { buy_price: Number(update.buy_price) }),
                ...(update?.sell_price === undefined ? {} : { sell_price: Number(update.sell_price) }),
                ...(update?.tick_seconds === undefined ? {} : { tick_seconds: Number(update.tick_seconds) }),
                ...(update?.fluctuation_percent === undefined ? {} : { fluctuation_percent: Number(update.fluctuation_percent) }),
              }
            })

            return {
              ...point,
              resource_settings: nextResourceSettings,
            }
          }

          return {
            ...previousState,
            points: previousPoints.map((point) => applyPatchToPoint(point)),
            nearby_points: previousNearbyPoints.map((point) => applyPatchToPoint(point)),
          }
        })
        return
      }

      if (eventName === 'game.blind_hike.marker.added') {
        if (!isBlindHike) {
          return
        }

        const changedTeamId = String(payload?.team_id || payload?.teamId || '').trim()
        const markerCount = Number(payload?.marker_count)
        const teamFinished = Boolean(payload?.team_finished)
        if (!changedTeamId || Number.isNaN(markerCount)) {
          return
        }

        setState((previous) => {
          const previousState = previous && typeof previous === 'object' ? previous : {}
          const previousRows = Array.isArray(previousState.highscore) ? previousState.highscore : []
          const hasExisting = previousRows.some((row) => String(row?.team_id || '') === changedTeamId)

          const nextRows = hasExisting
            ? previousRows.map((row) => (
              String(row?.team_id || '') === changedTeamId
                ? { ...row, markers: markerCount, finished: teamFinished }
                : row
            ))
            : [...previousRows, { team_id: changedTeamId, name: changedTeamId, markers: markerCount, finished: teamFinished }]

          return {
            ...previousState,
            highscore: nextRows,
            ...(changedTeamId === String(teamId) ? { finished: teamFinished } : {}),
          }
        })
        return
      }

      if (eventName === 'game.general.team.update' || eventName === 'game.general.team.add') {
        const teamUpdate = normalizeRealtimeTeam(payload)
        if (!teamUpdate) {
          return
        }

        setBootstrap((previous) => {
          if (!previous || typeof previous !== 'object') {
            return previous
          }

          const previousTeams = Array.isArray(previous.teams) ? previous.teams : []
          const existing = previousTeams.some((team) => String(team?.id || '') === String(teamUpdate.id))
          const nextTeams = existing
            ? previousTeams.map((team) => (
              String(team?.id || '') === String(teamUpdate.id)
                ? { ...team, ...teamUpdate }
                : team
            ))
            : [...previousTeams, teamUpdate]

          const isSelf = String(teamUpdate.id) === String(teamId)
          return {
            ...previous,
            ...(isSelf ? {
              team_name: teamUpdate.name || previous.team_name,
              team_logo_path: teamUpdate.logo_path,
              ...(typeof teamUpdate.lives === 'number' ? { lives: teamUpdate.lives } : {}),
            } : {}),
            teams: nextTeams,
          }
        })

        if (isMarketCrash) {
          setState((previous) => {
            const previousState = previous && typeof previous === 'object' ? previous : {}
            const previousLeaderboard = Array.isArray(previousState.leaderboard) ? previousState.leaderboard : []
            if (previousLeaderboard.length === 0) {
              return previousState
            }
            return {
              ...previousState,
              leaderboard: previousLeaderboard.map((row) => (
                String(row?.team_id || '') === String(teamUpdate.id)
                  ? {
                    ...row,
                    ...(teamUpdate.name ? { name: teamUpdate.name } : {}),
                    logo_path: teamUpdate.logo_path,
                    logoPath: teamUpdate.logo_path,
                  }
                  : row
              )),
            }
          })
        }
        return
      }

      if (eventName === 'game.general.team.remove') {
        const removedTeamId = String(payload.team_id || payload.teamId || '').trim()
        if (!removedTeamId) {
          return
        }

        setBootstrap((previous) => {
          if (!previous || typeof previous !== 'object') {
            return previous
          }

          return {
            ...previous,
            teams: Array.isArray(previous.teams)
              ? previous.teams.filter((team) => String(team?.id || '') !== removedTeamId)
              : previous.teams,
          }
        })

        if (isMarketCrash) {
          setState((previous) => {
            const previousState = previous && typeof previous === 'object' ? previous : {}
            const previousLeaderboard = Array.isArray(previousState.leaderboard) ? previousState.leaderboard : []
            if (previousLeaderboard.length === 0) {
              return previousState
            }
            return {
              ...previousState,
              leaderboard: previousLeaderboard.filter((row) => String(row?.team_id || '') !== removedTeamId),
            }
          })
        }
        return
      }

      if (eventName === 'game.market_crash.team.score') {
        if (!isMarketCrash) {
          return
        }

        const changedTeamId = String(payload?.team_id || payload?.teamId || '').trim()
        const score = Number(payload?.score)
        const cash = Number(payload?.cash)
        if (!changedTeamId || Number.isNaN(score)) {
          return
        }

        if (changedTeamId === String(teamId)) {
          setState((previous) => ({
            ...(previous && typeof previous === 'object' ? previous : {}),
            score,
            ...(Number.isNaN(cash) ? {} : { cash }),
          }))
        }

        setState((previous) => {
          const previousState = previous && typeof previous === 'object' ? previous : {}
          const previousLeaderboard = Array.isArray(previousState.leaderboard) ? previousState.leaderboard : []
          const hasTeam = previousLeaderboard.some((row) => String(row?.team_id || '') === changedTeamId)
          const nextLeaderboard = hasTeam
            ? previousLeaderboard.map((row) => (
              String(row?.team_id || '') === changedTeamId
                ? {
                  ...row,
                  score,
                  ...(Number.isNaN(cash) ? {} : { cash }),
                }
                : row
            ))
            : previousLeaderboard

          return {
            ...previousState,
            leaderboard: nextLeaderboard,
          }
        })
        return
      }

      if (eventName === 'team.exploding_kittens.card.add') {
        if (!isExplodingKittens) {
          return
        }
        reloadTeamState()
        return
      }

      if (eventName === 'team.exploding_kittens.card.remove') {
        if (!isExplodingKittens) {
          return
        }
        const removedCardId = String(payload.id || '').trim()
        if (!removedCardId) {
          reloadTeamState()
          return
        }

        setSelectedComboCards((previous) => previous.filter((id) => id !== removedCardId))
        setState((previous) => {
          const previousState = previous && typeof previous === 'object' ? previous : {}
          const previousHand = Array.isArray(previousState.hand) ? previousState.hand : []
          return {
            ...previousState,
            hand: previousHand.filter((card) => String(card?.id || '') !== removedCardId),
          }
        })
        return
      }

      if (eventName === 'team.exploding_kittens.action.add') {
        if (!isExplodingKittens) {
          return
        }
        const actionId = String(payload.id || '').trim()
        if (!actionId) {
          reloadTeamState()
          return
        }

        setState((previous) => {
          const previousState = previous && typeof previous === 'object' ? previous : {}
          const previousActions = Array.isArray(previousState.pending_actions) ? previousState.pending_actions : []
          const alreadyExists = previousActions.some((action) => String(action?.id || '') === actionId)
          if (alreadyExists) {
            return previousState
          }
          return {
            ...previousState,
            pending_actions: [payload, ...previousActions],
          }
        })
        return
      }

      if (eventName === 'team.exploding_kittens.action.remove') {
        if (!isExplodingKittens) {
          return
        }
        const actionId = String(payload.id || '').trim()
        if (!actionId) {
          reloadTeamState()
          return
        }

        setState((previous) => {
          const previousState = previous && typeof previous === 'object' ? previous : {}
          const previousActions = Array.isArray(previousState.pending_actions) ? previousState.pending_actions : []
          return {
            ...previousState,
            pending_actions: previousActions.filter((action) => String(action?.id || '') !== actionId),
          }
        })
        return
      }

      if (eventName === 'team.exploding_kittens.lives.updated') {
        if (!isExplodingKittens) {
          return
        }
        const lives = Number(payload.lives)
        if (Number.isNaN(lives)) {
          return
        }

        const safeLives = Math.max(0, lives)
        setState((previous) => ({
          ...(previous && typeof previous === 'object' ? previous : {}),
          lives: safeLives,
        }))
        setBootstrap((previous) => {
          if (!previous || typeof previous !== 'object') {
            return previous
          }
          return {
            ...previous,
            lives: safeLives,
            teams: Array.isArray(previous.teams)
              ? previous.teams.map((team) => (
                String(team?.id || '') === String(teamId)
                  ? { ...team, lives: safeLives }
                  : team
              ))
              : previous.teams,
          }
        })
        return
      }

      if (eventName === 'game.exploding_kittens.highscore.adjust') {
        if (!isExplodingKittens) {
          return
        }
        const changedTeamId = String(payload.team_id || '').trim()
        const lives = Number(payload.lives)
        if (!changedTeamId || Number.isNaN(lives)) {
          return
        }

        const safeLives = Math.max(0, lives)
        if (changedTeamId === String(teamId)) {
          setState((previous) => ({
            ...(previous && typeof previous === 'object' ? previous : {}),
            lives: safeLives,
          }))
        }
        setBootstrap((previous) => {
          if (!previous || typeof previous !== 'object') {
            return previous
          }
          return {
            ...previous,
            teams: Array.isArray(previous.teams)
              ? previous.teams.map((team) => (
                String(team?.id || '') === changedTeamId
                  ? { ...team, lives: safeLives }
                  : team
              ))
              : previous.teams,
          }
        })
        return
      }

      if (eventName === 'game.birds_of_prey.team.score') {
        if (!isBirdsOfPrey) {
          return
        }

        const changedTeamId = String(payload?.team_id || payload?.teamId || '').trim()
        const score = Number(payload?.score)
        if (!changedTeamId || Number.isNaN(score)) {
          return
        }

        if (changedTeamId === String(teamId)) {
          setState((previous) => ({
            ...(previous && typeof previous === 'object' ? previous : {}),
            score,
          }))
        }

        setState((previous) => {
          const previousState = previous && typeof previous === 'object' ? previous : {}
          const previousLeaderboard = Array.isArray(previousState.leaderboard) ? previousState.leaderboard : []
          const hasTeam = previousLeaderboard.some((row) => String(row?.team_id || '') === changedTeamId)
          const nextLeaderboard = hasTeam
            ? previousLeaderboard.map((row) => (
              String(row?.team_id || '') === changedTeamId
                ? { ...row, score }
                : row
            ))
            : [...previousLeaderboard, { team_id: changedTeamId, name: changedTeamId, score, egg_count: 0 }]
          return {
            ...previousState,
            leaderboard: nextLeaderboard,
          }
        })
        return
      }

      // Generic reload handlers for new game types
      const newGameReloadPrefixes = [
        { prefix: 'team.checkpoint_heist.', flag: isCheckpointHeist },
        { prefix: 'game.checkpoint_heist.', flag: isCheckpointHeist },
        { prefix: 'team.code_conspiracy.', flag: isCodeConspiracy },
        { prefix: 'game.code_conspiracy.', flag: isCodeConspiracy },
        { prefix: 'team.courier_rush.', flag: isCourierRush },
        { prefix: 'game.courier_rush.', flag: isCourierRush },
        { prefix: 'team.crazy_88.', flag: isCrazy88 },
        { prefix: 'game.crazy_88.', flag: isCrazy88 },
        { prefix: 'team.echo_hunt.', flag: isEchoHunt },
        { prefix: 'game.echo_hunt.', flag: isEchoHunt },
        { prefix: 'team.geohunter.', flag: isGeoHunter },
        { prefix: 'game.geohunter.', flag: isGeoHunter },
        { prefix: 'team.pandemic_response.', flag: isPandemicResponse },
        { prefix: 'game.pandemic_response.', flag: isPandemicResponse },
        { prefix: 'team.resource_run.', flag: isResourceRun },
        { prefix: 'game.resource_run.', flag: isResourceRun },
        { prefix: 'team.territory_control.', flag: isTerritoryControl },
        { prefix: 'game.territory_control.', flag: isTerritoryControl },
      ]
      for (const { prefix, flag } of newGameReloadPrefixes) {
        if (flag && eventName.startsWith(prefix)) {
          reloadTeamState()
          return
        }
      }

      if (eventName !== 'team.exploding_kittens.state.activate' && eventName !== 'team.exploding_kittens.state.deactivate') {
        return
      }

      if (!isExplodingKittens) {
        return
      }

      const stateKey = String(payload.state || '').trim()
      const flag = EK_STATE_TO_FLAG[stateKey]
      if (!flag) {
        return
      }

      const isActive = eventName === 'team.exploding_kittens.state.activate'
      setState((previous) => ({
        ...(previous && typeof previous === 'object' ? previous : {}),
        [flag]: isActive,
      }))
    })

    return () => {
      ws.close()
    }
  }, [auth?.token, bootstrap?.game_type, gameId, isBirdsOfPrey, isBlindHike, isCheckpointHeist, isCodeConspiracy, isCourierRush, isCrazy88, isEchoHunt, isExplodingKittens, isGeoHunter, isMarketCrash, isPandemicResponse, isResourceRun, isTerritoryControl, teamId])

  useEffect(() => {
    blindHikeFinishedRef.current = Boolean(state?.finished)
  }, [state?.finished])

  useEffect(() => () => {
    if (confettiTimeoutRef.current) {
      window.clearTimeout(confettiTimeoutRef.current)
    }
  }, [])

  useEffect(() => {
    setSelectedComboCards((previous) => {
      const handIds = new Set(hand.map((card) => String(card?.id || '')))
      const next = previous.filter((id) => handIds.has(String(id || '')))
      if (next.length === previous.length && next.every((value, index) => value === previous[index])) {
        return previous
      }
      return next
    })
  }, [hand])

  if (auth.principalType !== 'team') {
    return <Navigate to="/admin/games" replace />
  }

  async function refreshState() {
    if (!bootstrap) {
      return
    }
    const nextState = await moduleApi.getBootstrap(auth.token, bootstrap.game_type, bootstrap.game_id, bootstrap.team_id)
    setState(nextState)
  }

  async function handlePlaceBlindHikeMarker(position) {
    if (!bootstrap || !isBlindHike || !position) {
      return
    }

    const latitude = Number(position.latitude)
    const longitude = Number(position.longitude)
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      setActionError(t('teamDashboard.blindhike.waitingLocation', {}, 'Waiting for location…'))
      return
    }

    setActionError('')
    setActionSuccess('')
    setPlacingBlindHikeMarker(true)

    try {
      const markerId = `${latitude.toFixed(7)},${longitude.toFixed(7)},${Date.now()}`
      const result = await moduleApi.submitAction(auth.token, 'blindhike', gameId, teamId, {
        marker_id: markerId,
      })
      const successKey = String(result?.message_key || '').trim()
      setActionSuccess(
        successKey
          ? t(successKey, {}, t('teamDashboard.blindhike.markerAdded', {}, 'Marker added'))
          : t('teamDashboard.blindhike.markerAdded', {}, 'Marker added'),
      )
    } catch (err) {
      setActionError(err.message || t('teamDashboard.blindhike.placeFailed', {}, 'Could not place marker'))
    } finally {
      setPlacingBlindHikeMarker(false)
    }
  }

  async function handlePlayCard(cardId) {
    setActionError('')
    try {
      const target_team_id = String(targetTeamByCard[cardId] || '').trim() || undefined
      await moduleApi.submitExplodingAction(auth.token, gameId, teamId, 'play-card', {
        card_id: cardId,
        target_team_id,
      })
      await refreshState()
    } catch (err) {
      setActionError(err.message || t('teamDashboard.cardPlayFailed', {}, 'Could not play card'))
    }
  }

  async function handleBirdsDropEgg() {
    if (!isBirdsOfPrey || !gameId || !teamId) {
      return
    }
    setActionError('')
    setActionSuccess('')
    setDroppingBirdEgg(true)
    try {
      const result = await moduleApi.dropBirdsOfPreyEgg(auth.token, gameId, teamId, {})
      const successKey = String(result?.message_key || '').trim()
      setActionSuccess(successKey || t('teamDashboard.birdsOfPrey.dropped', {}, 'Egg dropped'))
    } catch (err) {
      setActionError(err.message || t('teamDashboard.birdsOfPrey.dropFailed', {}, 'Could not drop egg'))
    } finally {
      setDroppingBirdEgg(false)
    }
  }

  async function handleBirdsDestroyEgg(eggId) {
    const normalizedEggId = String(eggId || '').trim()
    if (!isBirdsOfPrey || !gameId || !teamId || !normalizedEggId) {
      return
    }
    setActionError('')
    setActionSuccess('')
    setDestroyingBirdEggId(normalizedEggId)
    try {
      const result = await moduleApi.destroyBirdsOfPreyEgg(auth.token, gameId, teamId, { egg_id: normalizedEggId })
      const successKey = String(result?.message_key || '').trim()
      setActionSuccess(successKey || t('teamDashboard.birdsOfPrey.destroyed', {}, 'Egg destroyed'))
    } catch (err) {
      setActionError(err.message || t('teamDashboard.birdsOfPrey.destroyFailed', {}, 'Could not destroy egg'))
    } finally {
      setDestroyingBirdEggId('')
    }
  }

  async function handleBirdsLocationUpdate(position) {
    if (!isBirdsOfPrey || !gameId || !teamId || !position) {
      return
    }
    const latitude = Number(position?.latitude)
    const longitude = Number(position?.longitude)
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return
    }

    try {
      const response = await moduleApi.updateBirdsOfPreyLocation(auth.token, gameId, teamId, { latitude, longitude })
      const location = response?.location && typeof response.location === 'object' ? response.location : null
      const visibleEnemyEggs = Array.isArray(response?.visible_enemy_eggs) ? response.visible_enemy_eggs : null

      setState((previous) => {
        const previousState = previous && typeof previous === 'object' ? previous : {}
        return {
          ...previousState,
          ...(location ? { team_location: location } : {}),
          ...(visibleEnemyEggs ? { visible_enemy_eggs: visibleEnemyEggs } : {}),
        }
      })
    } catch {
    }
  }

  async function handleMarketCrashLocationUpdate(position) {
    if (!isMarketCrash || !gameId || !teamId || !position) {
      return
    }

    const latitude = Number(position?.latitude)
    const longitude = Number(position?.longitude)
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return
    }

    try {
      const response = await moduleApi.updateMarketCrashLocation(auth.token, gameId, teamId, { latitude, longitude })
      const location = response?.location && typeof response.location === 'object' ? response.location : null
      const nearbyPoints = Array.isArray(response?.nearby_points) ? response.nearby_points : []
      const nearbyPointIdsRaw = Array.isArray(response?.nearby_point_ids) ? response.nearby_point_ids : nearbyPoints.map((point) => point?.id)
      const nearbyPointIds = nearbyPointIdsRaw.map((value) => String(value || '')).filter(Boolean)
      const nearbySet = new Set(nearbyPointIds)

      setState((previous) => {
        const previousState = previous && typeof previous === 'object' ? previous : {}
        const previousPoints = Array.isArray(previousState.points) ? previousState.points : []
        const nearbyById = new Map(nearbyPoints.map((point) => [String(point?.id || ''), point]))

        return {
          ...previousState,
          ...(location ? { team_location: location } : {}),
          points: previousPoints.map((point) => {
            const pointId = String(point?.id || '')
            const nearbyPatch = nearbyById.get(pointId)
            return {
              ...point,
              ...(nearbyPatch && typeof nearbyPatch === 'object' ? nearbyPatch : {}),
              in_range: nearbySet.has(pointId),
            }
          }),
          nearby_points: nearbyPoints,
          nearby_point_ids: nearbyPointIds,
        }
      })
    } catch {
    }
  }

  async function handleGeoHunterLocationUpdate(position) {
    if (!isGeoHunter || !gameId || !teamId || !position) {
      return
    }
    const latitude = Number(position?.latitude)
    const longitude = Number(position?.longitude)
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return
    }

    try {
      const response = await moduleApi.updateGeoHunterLocation(auth.token, gameId, teamId, { latitude, longitude })
      const location = response?.location && typeof response.location === 'object' ? response.location : null
      const nearbyPoiIds = Array.isArray(response?.nearby_poi_ids) ? response.nearby_poi_ids.map((value) => String(value || '')).filter(Boolean) : []
      setState((previous) => ({
        ...(previous && typeof previous === 'object' ? previous : {}),
        ...(location ? { team_location: location } : {}),
        nearby_poi_ids: nearbyPoiIds,
      }))
    } catch {
    }
  }

  async function handleEchoHuntLocationUpdate(position) {
    if (!isEchoHunt || !gameId || !teamId || !position) {
      return
    }
    const latitude = Number(position?.latitude)
    const longitude = Number(position?.longitude)
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return
    }

    try {
      const response = await moduleApi.updateEchoHuntLocation(auth.token, gameId, teamId, { latitude, longitude })
      const location = response?.location && typeof response.location === 'object' ? response.location : null
      const nearbyBeaconIds = Array.isArray(response?.nearby_beacon_ids) ? response.nearby_beacon_ids.map((value) => String(value || '')).filter(Boolean) : []
      setState((previous) => ({
        ...(previous && typeof previous === 'object' ? previous : {}),
        ...(location ? { team_location: location } : {}),
        nearby_beacon_ids: nearbyBeaconIds,
      }))
    } catch {
    }
  }

  async function handleTerritoryControlLocationUpdate(position) {
    if (!isTerritoryControl || !gameId || !teamId || !position) {
      return
    }
    const latitude = Number(position?.latitude)
    const longitude = Number(position?.longitude)
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return
    }

    try {
      const response = await moduleApi.updateTerritoryControlLocation(auth.token, gameId, teamId, { latitude, longitude })
      const location = response?.location && typeof response.location === 'object' ? response.location : null
      const nearbyZoneIds = Array.isArray(response?.nearby_zone_ids) ? response.nearby_zone_ids.map((value) => String(value || '')).filter(Boolean) : []
      setState((previous) => ({
        ...(previous && typeof previous === 'object' ? previous : {}),
        ...(location ? { team_location: location } : {}),
        nearby_zone_ids: nearbyZoneIds,
      }))
    } catch {
    }
  }

  async function handleMarketCrashExecuteTrade({ pointId, resourceId, side, quantity }) {
    const normalizedPointId = String(pointId || '').trim()
    const normalizedResourceId = String(resourceId || '').trim()
    const normalizedSide = String(side || '').trim().toLowerCase()
    const normalizedQty = Number(quantity)
    if (!isMarketCrash || !gameId || !teamId || !normalizedPointId || !normalizedResourceId || !['buy', 'sell'].includes(normalizedSide)) {
      return
    }

    setActionError('')
    setActionSuccess('')

    const actionKey = `${normalizedSide}:${normalizedPointId}:${normalizedResourceId}`
    setExecutingMarketCrashTradeKey(actionKey)

    try {
      const result = await moduleApi.executeMarketCrashTrade(auth.token, gameId, teamId, {
        point_id: normalizedPointId,
        resource_id: normalizedResourceId,
        side: normalizedSide,
        quantity: Number.isFinite(normalizedQty) && normalizedQty >= 1 ? Math.floor(normalizedQty) : 1,
      })

      const successKey = String(result?.message_key || '').trim()
      setActionSuccess(
        successKey
          ? t(successKey, {}, t('market_crash.team.trade_success', {}, 'Trade executed'))
          : t('market_crash.team.trade_success', {}, 'Trade executed'),
      )

      const nearbyPoints = Array.isArray(result?.nearby_points) ? result.nearby_points : []
      const nearbyPointIdsRaw = Array.isArray(result?.nearby_point_ids) ? result.nearby_point_ids : nearbyPoints.map((point) => point?.id)
      const nearbyPointIds = nearbyPointIdsRaw.map((value) => String(value || '')).filter(Boolean)
      const nearbySet = new Set(nearbyPointIds)

      setState((previous) => {
        const previousState = previous && typeof previous === 'object' ? previous : {}
        const previousPoints = Array.isArray(previousState.points) ? previousState.points : []
        const nearbyById = new Map(nearbyPoints.map((point) => [String(point?.id || ''), point]))
        const score = Number(result?.score)
        const cash = Number(result?.cash)

        const previousLeaderboard = Array.isArray(previousState.leaderboard) ? previousState.leaderboard : []
        const nextLeaderboard = previousLeaderboard.map((row) => (
          String(row?.team_id || '') === String(teamId)
            ? {
              ...row,
              ...(Number.isNaN(score) ? {} : { score }),
              ...(Number.isNaN(cash) ? {} : { cash }),
            }
            : row
        ))

        return {
          ...previousState,
          ...(Number.isNaN(score) ? {} : { score }),
          ...(Number.isNaN(cash) ? {} : { cash }),
          ...(result?.inventory && typeof result.inventory === 'object' ? { inventory: result.inventory } : {}),
          points: previousPoints.map((point) => {
            const pointIdKey = String(point?.id || '')
            const nearbyPatch = nearbyById.get(pointIdKey)
            return {
              ...point,
              ...(nearbyPatch && typeof nearbyPatch === 'object' ? nearbyPatch : {}),
              in_range: nearbySet.has(pointIdKey),
            }
          }),
          nearby_points: nearbyPoints,
          nearby_point_ids: nearbyPointIds,
          leaderboard: nextLeaderboard,
        }
      })
    } catch (err) {
      setActionError(err.message || t('market_crash.team.trade_failed', {}, 'Could not execute trade'))
    } finally {
      setExecutingMarketCrashTradeKey('')
    }
  }

  async function handleCaptureCheckpoint(checkpointId) {
    if (!isCheckpointHeist || !gameId || !teamId) return
    setActionError('')
    setActionSuccess('')
    setCapturingCheckpoint(true)
    try {
      const result = await moduleApi.submitAction(auth.token, 'checkpoint_heist', gameId, teamId, { checkpoint_id: checkpointId })
      setActionSuccess(String(result?.message_key || t('checkpoint_heist.capture.recorded', {}, 'Checkpoint captured')))
      await refreshState()
    } catch (err) {
      setActionError(err.message || t('checkpoint_heist.capture.failed', {}, 'Could not capture checkpoint'))
    } finally {
      setCapturingCheckpoint(false)
    }
  }

  async function handleSubmitConspiracyCode(targetTeamId, codeValue) {
    if (!isCodeConspiracy || !gameId || !teamId) return
    setActionError('')
    setActionSuccess('')
    setSubmittingCode(true)
    try {
      const result = await moduleApi.submitAction(auth.token, 'code_conspiracy', gameId, teamId, { target_team_id: targetTeamId, code_value: codeValue })
      setActionSuccess(String(result?.message_key || t('code_conspiracy.code.submitted', {}, 'Code submitted')))
      await refreshState()
    } catch (err) {
      setActionError(err.message || t('code_conspiracy.code.failed', {}, 'Could not submit code'))
    } finally {
      setSubmittingCode(false)
    }
  }

  async function handleConfirmPickup(pickupId) {
    if (!isCourierRush || !gameId || !teamId) return
    setActionError('')
    setActionSuccess('')
    setConfirmingPickup(true)
    try {
      const result = await moduleApi.submitAction(auth.token, 'courier_rush', gameId, teamId, { pickup_id: pickupId })
      setActionSuccess(String(result?.message_key || t('courier_rush.pickup.confirmed', {}, 'Pickup confirmed')))
      await refreshState()
    } catch (err) {
      setActionError(err.message || t('courier_rush.pickup.failed', {}, 'Could not confirm pickup'))
    } finally {
      setConfirmingPickup(false)
    }
  }

  async function handleConfirmDropoff(dropoffId) {
    if (!isCourierRush || !gameId || !teamId) return
    setActionError('')
    setActionSuccess('')
    setConfirmingDropoff(true)
    try {
      const result = await moduleApi.submitAction(auth.token, 'courier_rush', gameId, teamId, { dropoff_id: dropoffId }, 'dropoff/confirm')
      setActionSuccess(String(result?.message_key || t('courier_rush.dropoff.confirmed', {}, 'Drop-off confirmed')))
      await refreshState()
    } catch (err) {
      setActionError(err.message || t('courier_rush.dropoff.failed', {}, 'Could not confirm drop-off'))
    } finally {
      setConfirmingDropoff(false)
    }
  }

  async function handleSubmitCrazy88Task(taskId, message) {
    if (!isCrazy88 || !gameId || !teamId) return
    setActionError('')
    setActionSuccess('')
    setSubmittingTask(true)
    try {
      const result = await moduleApi.submitAction(auth.token, 'crazy_88', gameId, teamId, { task_id: taskId, message })
      setActionSuccess(String(result?.message_key || t('crazy88.task.submitted', {}, 'Task submitted')))
      await refreshState()
    } catch (err) {
      setActionError(err.message || t('crazy88.task.failed', {}, 'Could not submit task'))
    } finally {
      setSubmittingTask(false)
    }
  }

  async function handleClaimBeacon(beaconId) {
    if (!isEchoHunt || !gameId || !teamId) return
    setActionError('')
    setActionSuccess('')
    setClaimingBeacon(true)
    try {
      const result = await moduleApi.submitAction(auth.token, 'echo_hunt', gameId, teamId, { beacon_id: beaconId })
      setActionSuccess(String(result?.message_key || t('echo_hunt.beacon.claimed', {}, 'Beacon claimed')))
      await refreshState()
    } catch (err) {
      setActionError(err.message || t('echo_hunt.beacon.failed', {}, 'Could not claim beacon'))
    } finally {
      setClaimingBeacon(false)
    }
  }

  async function handleAnswerGeoQuestion(poiId, answerValue) {
    if (!isGeoHunter || !gameId || !teamId) return
    setActionError('')
    setActionSuccess('')
    setAnsweringQuestion(true)
    try {
      const result = await moduleApi.submitAction(auth.token, 'geohunter', gameId, teamId, { poi_id: poiId, answer: answerValue })
      if (result?.points_awarded > 0) {
        setActionSuccess(t('geohunter.answer.correct', {}, 'Correct answer!'))
      } else {
        setActionError(t('geohunter.answer.incorrect', {}, 'Incorrect answer'))
      }
      await refreshState()
    } catch (err) {
      setActionError(err.message || t('geohunter.answer.failed', {}, 'Could not submit answer'))
    } finally {
      setAnsweringQuestion(false)
    }
  }

  async function handleCollectPandemicPickup(pickupId) {
    if (!isPandemicResponse || !gameId || !teamId) return
    setActionError('')
    setActionSuccess('')
    setCollectingPickup(true)
    try {
      const result = await moduleApi.submitAction(auth.token, 'pandemic_response', gameId, teamId, { pickup_id: pickupId })
      setActionSuccess(String(result?.message_key || t('pandemic_response.pickup.collected', {}, 'Supply collected')))
      await refreshState()
    } catch (err) {
      setActionError(err.message || t('pandemic_response.pickup.failed', {}, 'Could not collect supply'))
    } finally {
      setCollectingPickup(false)
    }
  }

  async function handleResolveHotspot(hotspotId) {
    if (!isPandemicResponse || !gameId || !teamId) return
    setActionError('')
    setActionSuccess('')
    setResolvingHotspot(true)
    try {
      const result = await moduleApi.submitAction(auth.token, 'pandemic_response', gameId, teamId, { hotspot_id: hotspotId }, 'hotspot/resolve')
      setActionSuccess(String(result?.message_key || t('pandemic_response.hotspot.resolved', {}, 'Hotspot resolved')))
      await refreshState()
    } catch (err) {
      setActionError(err.message || t('pandemic_response.hotspot.failed', {}, 'Could not resolve hotspot'))
    } finally {
      setResolvingHotspot(false)
    }
  }

  async function handleClaimResource(nodeId) {
    if (!isResourceRun || !gameId || !teamId) return
    setActionError('')
    setActionSuccess('')
    setClaimingResource(true)
    try {
      const result = await moduleApi.submitAction(auth.token, 'resource_run', gameId, teamId, { node_id: nodeId })
      setActionSuccess(String(result?.message_key || t('resource_run.claim.recorded', {}, 'Resource claimed')))
      await refreshState()
    } catch (err) {
      setActionError(err.message || t('resource_run.claim.failed', {}, 'Could not claim resource'))
    } finally {
      setClaimingResource(false)
    }
  }

  async function handleClaimZone(zoneId) {
    if (!isTerritoryControl || !gameId || !teamId) return
    setActionError('')
    setActionSuccess('')
    setClaimingZone(true)
    try {
      const result = await moduleApi.submitAction(auth.token, 'territory_control', gameId, teamId, { zone_id: zoneId })
      setActionSuccess(String(result?.message_key || t('territory_control.claim.recorded', {}, 'Zone claimed')))
      await refreshState()
    } catch (err) {
      setActionError(err.message || t('territory_control.claim.failed', {}, 'Could not claim zone'))
    } finally {
      setClaimingZone(false)
    }
  }

  async function handleResolveAction(actionId, useNope = false) {
    setActionError('')
    try {
      await moduleApi.submitExplodingAction(auth.token, gameId, teamId, 'resolve-action', {
        action_id: actionId,
        use_nope: Boolean(useNope),
      })
      await refreshState()
    } catch (err) {
      setActionError(err.message || t('teamDashboard.resolveActionFailed', {}, 'Could not resolve action'))
    }
  }

  async function handleUseCombo(event) {
    event.preventDefault()
    setActionError('')
    try {
      if (!comboModeEnabled || !comboSelection.isValid) {
        throw new Error(t('teamDashboard.comboNeedValid', {}, 'Select exactly 2, 3, or 5 cards'))
      }

      const targetTeam = String(comboTargetTeam || '').trim()
      const requestedType = String(comboRequestedType || '').trim()
      if (comboSelection.needsTarget && !targetTeam) {
        throw new Error(t('teamDashboard.comboNeedTarget', {}, 'Choose a target team'))
      }
      if (comboSelection.needsRequestedType && !requestedType) {
        throw new Error(t('teamDashboard.comboNeedType', {}, 'Choose a requested card type'))
      }

      await moduleApi.useExplodingCombo(auth.token, gameId, teamId, {
        card_ids: selectedComboCards,
        target_team_id: targetTeam || undefined,
        requested_card_type: requestedType || undefined,
      })

      setSelectedComboCards([])
      setComboTargetTeam('')
      setComboRequestedType('')
      setComboModeEnabled(false)
      await refreshState()
    } catch (err) {
      setActionError(err.message || t('teamDashboard.comboFailed', {}, 'Could not play combo'))
    }
  }

  function handleToggleComboMode() {
    setComboModeEnabled((previous) => {
      if (previous) {
        setSelectedComboCards([])
        setComboTargetTeam('')
        setComboRequestedType('')
      }
      return !previous
    })
  }

  function handleToggleComboCard(cardId) {
    if (!comboModeEnabled) {
      return
    }

    const normalizedCardId = String(cardId || '').trim()
    if (!normalizedCardId) {
      return
    }

    setSelectedComboCards((previous) => {
      if (previous.includes(normalizedCardId)) {
        return previous.filter((id) => id !== normalizedCardId)
      }
      return [...previous, normalizedCardId]
    })
  }
  const leaderboard = useMemo(() => {
    const rows = Array.isArray(bootstrap?.teams) ? bootstrap.teams : []
    return [...rows]
      .map((team) => {
        const id = String(team?.id || '')
        const lives = id === String(teamId)
          ? Number(state?.lives ?? team?.lives ?? 0)
          : Number(team?.lives ?? 0)
        return {
          id,
          name: String(team?.name || '-'),
          logoPath: String(team?.logo_path || team?.logoPath || ''),
          lives,
        }
      })
      .sort((left, right) => {
        if (right.lives !== left.lives) {
          return right.lives - left.lives
        }
        return left.name.localeCompare(right.name)
      })
      .map((team, index) => ({
        ...team,
        rank: index + 1,
      }))
  }, [bootstrap?.teams, state?.lives, teamId])
  const targetMetric = useMemo(() => {
    const gameType = String(bootstrap?.game_type || '')
    if (gameType === 'exploding_kittens') {
      return {
        label: t('teamDashboard.lives', {}, 'Lives'),
        value: Number(state?.lives ?? bootstrap?.lives ?? 0),
      }
    }
    if (gameType === 'blindhike') {
      return {
        label: t('teamDashboard.markers', {}, 'Markers'),
        value: Number(state?.actions || 0),
      }
    }
    return {
      label: t('moduleOverview.score', {}, 'Score'),
      value: Number(state?.score || state?.geo_score || 0),
    }
  }, [bootstrap?.game_type, bootstrap?.lives, state?.actions, state?.geo_score, state?.lives, state?.score, t])

  useLayoutEffect(() => {
    const refs = leaderboardItemRefs.current
    if (!(refs instanceof Map)) {
      return
    }

    const previousTopById = leaderboardPreviousTopById.current
    const nextTopById = new Map()

    leaderboard.forEach((team) => {
      const id = String(team?.id || '')
      const element = refs.get(id)
      if (!element) {
        return
      }

      const currentTop = element.getBoundingClientRect().top
      nextTopById.set(id, currentTop)

      const previousTop = previousTopById.get(id)
      if (typeof previousTop !== 'number') {
        return
      }

      const delta = previousTop - currentTop
      if (Math.abs(delta) < 1) {
        return
      }

      element.style.transition = 'none'
      element.style.transform = `translateY(${delta}px)`
      element.style.willChange = 'transform'

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          element.style.transition = 'transform 420ms cubic-bezier(0.22, 1, 0.36, 1)'
          element.style.transform = 'translateY(0)'
        })
      })

      const cleanup = () => {
        element.style.transition = ''
        element.style.willChange = ''
        element.removeEventListener('transitionend', cleanup)
      }
      element.addEventListener('transitionend', cleanup)
    })

    leaderboardPreviousTopById.current = nextTopById
  }, [leaderboard])

  return (
    <main className="page-shell">
      <section className="overview-header">
        <div>
          <div className="team-identity">
            {bootstrap?.team_logo_path ? <img className="team-logo" src={toAssetUrl(bootstrap.team_logo_path)} alt={bootstrap?.team_name || 'Team'} /> : null}
            <div>
              <h1>{bootstrap?.team_name || t('teamDashboard.heading', {}, 'Team dashboard')}</h1>
              <p className="overview-subtitle">{bootstrap?.game_name || '-'}</p>
              <div className="overview-actions">
                <Link className="btn btn-ghost" to="/team/edit">
                  {t('teamDashboard.editTeam', {}, 'Edit team')}
                </Link>
              </div>
            </div>
          </div>
        </div>
        <div className="overview-actions">
          <div className="team-lives team-dashboard-target">
            <span className="team-lives-label">{targetMetric.label}</span>
            <span className="team-dashboard-target-value">{targetMetric.value}</span>
          </div>
        </div>
      </section>

      {loading ? <p>{t('gamesPage.loading', {}, 'Loading…')}</p> : null}
      {error ? <div className="flash flash-error">{error}</div> : null}
      {actionError ? <div className="flash flash-error">{actionError}</div> : null}
      {actionSuccess ? <div className="flash flash-success">{actionSuccess}</div> : null}

      {isBlindHike && showBlindHikeConfetti ? (
        <div className="blindhike-finish-confetti" aria-hidden="true">
          {Array.from({ length: 24 }).map((_, index) => (
            <span
              key={`blindhike-confetti-${index + 1}`}
              className="blindhike-finish-confetti-piece"
              style={{
                '--confetti-index': index,
                '--confetti-delay': `${(index % 6) * 70}ms`,
                '--confetti-duration': `${2800 + ((index * 43) % 1300)}ms`,
                '--confetti-drift': `${(index % 2 === 0 ? 1 : -1) * (20 + ((index % 5) * 10))}px`,
              }}
            />
          ))}
        </div>
      ) : null}

      {activePopup ? (
        <div
          className="modal is-open"
          role="dialog"
          aria-modal="true"
          aria-label={String(activePopup?.payload?.title || '').trim() || t('teamDashboard.popupTitle', {}, 'Message')}
        >
          <div className="modal-backdrop" onClick={dismissPopup} />
          <div className="modal-card">
            <h2>
              {String(activePopup?.payload?.title_key || activePopup?.payload?.titleKey || '').trim()
                ? t(
                  String(activePopup?.payload?.title_key || activePopup?.payload?.titleKey || '').trim(),
                  {},
                  String(activePopup?.payload?.title || '').trim() || t('teamDashboard.popupTitle', {}, 'Message'),
                )
                : String(activePopup?.payload?.title || '').trim() || t('teamDashboard.popupTitle', {}, 'Message')}
            </h2>
            <p>{formatPopupBody(activePopup?.payload || {}, t)}</p>
            <div className="modal-actions">
              <button className="btn btn-primary" type="button" onClick={dismissPopup}>
                {t('teamDashboard.popupClose', {}, 'Close')}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {!loading && bootstrap ? (
        <>
          {isExplodingKittens ? (
            <>
              <div id="team-actions" className={`team-panel ${pendingActions.length > 0 ? 'team-actions-has-pending' : ''}`}>
                <h2>{t('teamDashboard.pendingActions', {}, 'Pending actions')}</h2>
                {pendingActions.length === 0 ? <p>{t('teamDashboard.noActions', {}, 'No actions')}</p> : null}
                {pendingActions.length > 0 ? (
                  <ul>
                    {pendingActions.map((action) => (
                      <li key={action.id} className="team-action-item">
                        <p className="team-action-text">{getActionDescription(action, teams, t)}</p>
                        {getActionCountdownSeconds(action, countdownNowMs) !== null ? (
                          <p data-action-countdown>
                            <span aria-hidden="true">⏳ </span>
                            {formatActionCountdownLabel(getActionCountdownSeconds(action, countdownNowMs), t)}
                          </p>
                        ) : null}
                        <div className={`team-action-buttons ${hasNopeCard ? '' : 'is-single'}`}>
                          {hasNopeCard ? (
                            <button
                              className="btn btn-ghost btn-small team-action-btn team-action-form-nope"
                              type="button"
                              onClick={() => handleResolveAction(action.id, true)}
                            >
                              {t('teamDashboard.nope', {}, 'Nope')}
                            </button>
                          ) : null}
                          <button className="btn btn-primary btn-small team-action-btn team-action-form-accept" type="button" onClick={() => handleResolveAction(action.id, false)}>
                            {t('teamDashboard.accept', {}, 'Accept')}
                          </button>
                        </div>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>

              <div id="team-active-states" className="team-panel">
                <div className="team-flags" data-team-flags>
                  <span className={`tag tag-cool ${state?.pending_skip ? '' : 'is-inactive'}`}>⏭ {t('teamDashboard.pendingSkip', {}, 'Pending skip')}</span>
                  <span className={`tag tag-warm ${state?.pending_peek ? '' : 'is-inactive'}`}>👁 {t('teamDashboard.pendingPeek', {}, 'Pending peek')}</span>
                  <span className={`tag tag-alert ${state?.pending_attack ? '' : 'is-inactive'}`}>⚔ {t('teamDashboard.pendingAttack', {}, 'Pending attack')}</span>
                </div>
              </div>

              <div id="team-hand" className={`team-panel ${comboModeEnabled ? 'combo-mode-active' : ''} ${comboCanSubmit ? 'combo-submit-visible' : ''}`}>
                <h2>{t('teamDashboard.hand', {}, 'Hand')}</h2>
                <form className="team-combo-form admin-inline-form" onSubmit={handleUseCombo}>
                  <div className="overview-actions">
                    <button className={`btn btn-small ${comboModeEnabled ? 'btn-remove' : 'btn-add'}`} type="button" onClick={handleToggleComboMode}>
                      {comboModeEnabled
                        ? `${t('teamDashboard.cancel', {}, 'Cancel')} ${t('teamDashboard.playCombo', {}, 'Play combo')}`
                        : t('teamDashboard.playComboCard', {}, 'Play combo card')}
                    </button>
                  </div>
                  <div className="team-combo-rules">
                    <p>{t('teamDashboard.comboRuleTwo', {}, '2 same cards: choose target team')}</p>
                    <p>{t('teamDashboard.comboRuleThree', {}, '3 same cards: choose target team + card type')}</p>
                    <p>{t('teamDashboard.comboRuleFive', {}, '5 different cards: choose card type')}</p>
                    <p>
                      {comboSelection.mode === 'two'
                        ? t('teamDashboard.comboSelectedTwo', {}, '2 same selected')
                        : comboSelection.mode === 'three'
                          ? t('teamDashboard.comboSelectedThree', {}, '3 same selected')
                          : comboSelection.mode === 'five'
                            ? t('teamDashboard.comboSelectedFive', {}, '5 different selected')
                            : t('teamDashboard.comboSelectedNone', {}, 'Select 2 same, 3 same, or 5 different cards')}
                    </p>
                  </div>
                  {comboSelection.needsTarget ? (
                    <select value={comboTargetTeam} onChange={(event) => setComboTargetTeam(event.target.value)} required>
                      <option value="">{t('teamDashboard.chooseTarget', {}, 'Choose target')}</option>
                      {otherTeams.map((team) => (
                        <option key={team.id} value={team.id}>
                          {team.name}
                        </option>
                      ))}
                    </select>
                  ) : null}
                  {comboSelection.needsRequestedType ? (
                    <select
                      value={comboRequestedType}
                      onChange={(event) => setComboRequestedType(event.target.value)}
                      required
                    >
                      <option value="">{t('teamDashboard.chooseCardType', {}, 'Choose card type')}</option>
                      {EK_HOLDABLE_CARD_TYPES.map((cardType) => (
                        <option key={cardType} value={cardType}>
                          {getCardTypeLabel(cardType, t)}
                        </option>
                      ))}
                    </select>
                  ) : null}
                  <button id="combo-form-submit-button" className="btn btn-primary btn-small" type="submit" disabled={!comboCanSubmit}>
                    {t('teamDashboard.playComboSubmit', {}, 'Submit combo')}
                  </button>
                </form>

                {hand.length === 0 ? <p>{t('teamDashboard.noCards', {}, 'No cards')}</p> : null}
                {hand.length > 0 ? (
                  <ul className="hand-grid">
                    {hand.map((card) => (
                      (() => {
                        const cardType = String(card?.type || '')
                        const pendingMessage = getCardPendingMessage(cardType, state, t)
                        const isPlayableType = EK_PLAYABLE_CARD_TYPES.has(cardType)

                        return (
                      <li key={card.id}>
                        <article
                          className={`hand-card ${selectedComboCards.includes(card.id) ? 'is-combo-selected' : ''}`}
                          onClick={() => handleToggleComboCard(card.id)}
                          onKeyDown={(event) => {
                            if (!comboModeEnabled) {
                              return
                            }
                            if (event.key !== 'Enter' && event.key !== ' ') {
                              return
                            }
                            event.preventDefault()
                            handleToggleComboCard(card.id)
                          }}
                          role={comboModeEnabled ? 'button' : undefined}
                          tabIndex={comboModeEnabled ? 0 : undefined}
                        >
                          <GameCardDisplay
                            imageSrc={toAssetUrl(card.image_path)}
                            imageAlt={getCardLabel(card, t)}
                            title={getCardLabel(card, t)}
                            subtitle={getCardTypeLabel(card.type, t)}
                          />

                          {!comboModeEnabled ? (
                            <>
                              {EK_TARGETED_CARD_TYPES.has(String(card?.type || '')) ? (
                                <label className="hand-card-target-field">
                                  <span className="hand-card-target-label">{t('teamDashboard.favorTarget', {}, 'Favor target')}</span>
                                  <select
                                    className="hand-card-target-select"
                                    value={targetTeamByCard[card.id] || ''}
                                    onChange={(event) =>
                                      setTargetTeamByCard((prev) => ({
                                        ...prev,
                                        [card.id]: event.target.value,
                                      }))
                                    }
                                  >
                                    <option value="">{t('teamDashboard.chooseTarget', {}, 'Choose target')}</option>
                                    {otherTeams.map((team) => (
                                      <option key={team.id} value={team.id}>
                                        {team.name}
                                      </option>
                                    ))}
                                  </select>
                                </label>
                              ) : null}

                              {isPlayableType && pendingMessage === '' ? (
                                <button className="btn btn-primary btn-small" type="button" onClick={() => handlePlayCard(card.id)}>
                                  {t('teamDashboard.useCard', {}, 'Use card')}
                                </button>
                              ) : null}

                              {isPlayableType && pendingMessage !== '' ? (
                                <span className="muted">{pendingMessage}</span>
                              ) : (
                                !isPlayableType ? <span className="muted">{t('teamDashboard.cardPassive', {}, 'Passive')}</span> : null
                              )}
                            </>
                          ) : null}
                        </article>
                      </li>
                        )
                      })()
                    ))}
                  </ul>
                ) : null}
              </div>

              <div id="team-lives-leaderboard" className="team-panel">
                <h2>{t('teamDashboard.highscore', {}, 'Highscore')}</h2>
                {leaderboard.length === 0 ? <p>{t('teamDashboard.noTeams', {}, 'No teams')}</p> : null}
                {leaderboard.length > 0 ? (
                  <ol className="team-leaderboard-list">
                    {leaderboard.map((team) => (
                      <li
                        key={team.id}
                        className="team-leaderboard-item"
                        ref={(node) => {
                          const id = String(team.id || '')
                          if (!id) {
                            return
                          }
                          if (node) {
                            leaderboardItemRefs.current.set(id, node)
                          } else {
                            leaderboardItemRefs.current.delete(id)
                          }
                        }}
                      >
                        <span className="team-leaderboard-rank">#{team.rank}</span>
                        <span className="team-leaderboard-logo" aria-hidden="true">
                          {team.logoPath ? <img src={toAssetUrl(team.logoPath)} alt="" /> : null}
                        </span>
                        <span className="team-leaderboard-name">{team.name}</span>
                        <span className="team-leaderboard-value">{team.lives}</span>
                      </li>
                    ))}
                  </ol>
                ) : null}
              </div>
            </>
          ) : (
            null
          )}

          {isBlindHike ? (
            <Suspense fallback={null}>
              <BlindHikeTeamPanel
                state={state}
                currentTeamId={teamId}
                t={t}
                placingMarker={placingBlindHikeMarker}
                onPlaceMarker={handlePlaceBlindHikeMarker}
              />
            </Suspense>
          ) : null}

          {isBirdsOfPrey ? (
            <Suspense fallback={null}>
              <BirdsOfPreyTeamPanel
                state={state}
                currentTeamId={teamId}
                currentTeamLogoPath={currentTeamLogoPath}
                t={t}
                droppingEgg={droppingBirdEgg}
                destroyingEggId={destroyingBirdEggId}
                onDropEgg={handleBirdsDropEgg}
                onDestroyEgg={handleBirdsDestroyEgg}
                onLocationUpdate={handleBirdsLocationUpdate}
              />
            </Suspense>
          ) : null}

          {isMarketCrash ? (
            <Suspense fallback={null}>
              <MarketCrashTeamPanel
                state={state}
                currentTeamId={teamId}
                currentTeamLogoPath={currentTeamLogoPath}
                t={t}
                executingTradeKey={executingMarketCrashTradeKey}
                onExecuteTrade={handleMarketCrashExecuteTrade}
                onLocationUpdate={handleMarketCrashLocationUpdate}
              />
            </Suspense>
          ) : null}

          {isCheckpointHeist ? (
            <Suspense fallback={null}>
              <CheckpointHeistTeamPanel
                state={state}
                currentTeamId={teamId}
                t={t}
                onCaptureCheckpoint={handleCaptureCheckpoint}
                capturing={capturingCheckpoint}
              />
            </Suspense>
          ) : null}

          {isCodeConspiracy ? (
            <Suspense fallback={null}>
              <CodeConspiracyTeamPanel
                state={state}
                currentTeamId={teamId}
                t={t}
                onSubmitCode={handleSubmitConspiracyCode}
                submitting={submittingCode}
              />
            </Suspense>
          ) : null}

          {isCourierRush ? (
            <Suspense fallback={null}>
              <CourierRushTeamPanel
                state={state}
                currentTeamId={teamId}
                t={t}
                onConfirmPickup={handleConfirmPickup}
                onConfirmDropoff={handleConfirmDropoff}
                confirmingPickup={confirmingPickup}
                confirmingDropoff={confirmingDropoff}
              />
            </Suspense>
          ) : null}

          {isCrazy88 ? (
            <Suspense fallback={null}>
              <Crazy88TeamPanel
                state={state}
                currentTeamId={teamId}
                t={t}
                onSubmitTask={handleSubmitCrazy88Task}
                submitting={submittingTask}
              />
            </Suspense>
          ) : null}

          {isEchoHunt ? (
            <Suspense fallback={null}>
              <EchoHuntTeamPanel
                state={state}
                currentTeamId={teamId}
                t={t}
                onClaimBeacon={handleClaimBeacon}
                onLocationUpdate={handleEchoHuntLocationUpdate}
                claiming={claimingBeacon}
              />
            </Suspense>
          ) : null}

          {isGeoHunter ? (
            <Suspense fallback={null}>
              <GeoHunterTeamPanel
                state={state}
                currentTeamId={teamId}
                t={t}
                onAnswerQuestion={handleAnswerGeoQuestion}
                onLocationUpdate={handleGeoHunterLocationUpdate}
                answering={answeringQuestion}
              />
            </Suspense>
          ) : null}

          {isPandemicResponse ? (
            <Suspense fallback={null}>
              <PandemicResponseTeamPanel
                state={state}
                currentTeamId={teamId}
                t={t}
                onCollectPickup={handleCollectPandemicPickup}
                onResolveHotspot={handleResolveHotspot}
                collectingPickup={collectingPickup}
                resolvingHotspot={resolvingHotspot}
              />
            </Suspense>
          ) : null}

          {isResourceRun ? (
            <Suspense fallback={null}>
              <ResourceRunTeamPanel
                state={state}
                currentTeamId={teamId}
                t={t}
                onClaimResource={handleClaimResource}
                claiming={claimingResource}
              />
            </Suspense>
          ) : null}

          {isTerritoryControl ? (
            <Suspense fallback={null}>
              <TerritoryControlTeamPanel
                state={state}
                currentTeamId={teamId}
                t={t}
                onClaimZone={handleClaimZone}
                onLocationUpdate={handleTerritoryControlLocationUpdate}
                claiming={claimingZone}
              />
            </Suspense>
          ) : null}
        </>
      ) : null}
    </main>
  )
}
