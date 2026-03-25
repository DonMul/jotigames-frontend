import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import BlindHikeAdminOverviewMap from '../../components/BlindHikeAdminOverviewMap'
import BirdsOfPreyAdminOverviewMap from '../../components/BirdsOfPreyAdminOverviewMap'
import MarketCrashAdminOverviewMap from '../../components/MarketCrashAdminOverviewMap'
import { gameApi, moduleApi } from '../../lib/api'
import { toAssetUrl } from '../../lib/assetUrl'
import { useAuth } from '../../lib/auth'
import { useI18n } from '../../lib/i18n'

const EK_HAND_CARD_TYPES = [
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

export default function ModuleOverviewPage() {
  const { gameId } = useParams()
  const { auth } = useAuth()
  const { t } = useI18n()

  const [game, setGame] = useState(null)
  const [teams, setTeams] = useState([])
  const [members, setMembers] = useState([])
  const [overview, setOverview] = useState(null)
  const [moduleDetails, setModuleDetails] = useState(null)
  const [explodingHandByTeam, setExplodingHandByTeam] = useState({})
  const [explodingPendingActionsByTeam, setExplodingPendingActionsByTeam] = useState({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [newTeamName, setNewTeamName] = useState('')
  const [newTeamCode, setNewTeamCode] = useState('')
  const [memberEmail, setMemberEmail] = useState('')
  const [memberRoleType, setMemberRoleType] = useState('admin')
  const [teamMessageTeamId, setTeamMessageTeamId] = useState('')
  const [teamMessageText, setTeamMessageText] = useState('')
  const [judgeTeamId, setJudgeTeamId] = useState('')
  const [judgeSubmissionId, setJudgeSubmissionId] = useState('')
  const [judgeAccepted, setJudgeAccepted] = useState(true)
  const isBlindHike = game?.game_type === 'blindhike'
  const isExplodingKittens = game?.game_type === 'exploding_kittens'
  const isBirdsOfPrey = game?.game_type === 'birds_of_prey'
  const isMarketCrash = game?.game_type === 'market_crash'

  function formatDate(value) {
    if (!value) {
      return '-'
    }
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) {
      return String(value)
    }
    return parsed.toLocaleString()
  }

  const sortedTeams = [...teams].sort((a, b) => {
    const left = isBlindHike
      ? Number(a?.blindhike_markers ?? a?.markers ?? 0)
      : Number(a?.geo_score || 0)
    const right = isBlindHike
      ? Number(b?.blindhike_markers ?? b?.markers ?? 0)
      : Number(b?.geo_score || 0)
    if (right !== left) {
      return right - left
    }
    return String(a?.name || '').localeCompare(String(b?.name || ''))
  })

  const blindHikeMarkers = isBlindHike && Array.isArray(overview?.markers) ? overview.markers : []
  const blindHikeTarget = isBlindHike && overview?.target ? overview.target : null
  const marketCrashOverviewPoints = isMarketCrash && Array.isArray(overview?.points) ? overview.points : []
  const marketCrashOverviewTeams = isMarketCrash && Array.isArray(overview?.teams) ? overview.teams : []

  function getTeamNameById(teamId) {
    const normalizedTeamId = String(teamId || '').trim()
    if (!normalizedTeamId) {
      return '-'
    }
    const match = teams.find((team) => String(team?.id || '') === normalizedTeamId)
    return String(match?.name || normalizedTeamId)
  }

  function mapActionsByTargetTeam(actions) {
    const mapped = {}
    for (const action of Array.isArray(actions) ? actions : []) {
      const targetTeamId = String(action?.target_team_id || action?.targetTeamId || '').trim()
      const actionId = String(action?.id || '').trim()
      if (!targetTeamId || !actionId) {
        continue
      }
      if (!Array.isArray(mapped[targetTeamId])) {
        mapped[targetTeamId] = []
      }
      mapped[targetTeamId].push(action)
    }
    return mapped
  }

  function applyBlindHikeMarkerCounts(teamsRows, overviewData, gameType) {
    const sourceTeams = Array.isArray(teamsRows) ? teamsRows : []
    if (gameType !== 'blindhike') {
      return sourceTeams
    }

    const counts = new Map()
    const finished = new Map()
    for (const row of Array.isArray(overviewData?.teams) ? overviewData.teams : []) {
      const teamId = String(row?.team_id || row?.id || '').trim()
      if (!teamId) {
        continue
      }
      counts.set(teamId, Number(row?.markers || 0))
      finished.set(teamId, Boolean(row?.finished))
    }

    return sourceTeams.map((team) => {
      const teamId = String(team?.id || '').trim()
      if (!teamId || !counts.has(teamId)) {
        return {
          ...team,
          blindhike_markers: Number(team?.blindhike_markers || 0),
          blindhike_finished: Boolean(team?.blindhike_finished),
        }
      }
      return {
        ...team,
        blindhike_markers: Number(counts.get(teamId) || 0),
        blindhike_finished: Boolean(finished.get(teamId)),
      }
    })
  }

  async function loadModuleDetails(gameType, id) {
    if (!gameType || !id) {
      return null
    }

    if (gameType === 'courier_rush') {
      const [configPayload, pickupsPayload, dropoffsPayload] = await Promise.all([
        moduleApi.getCourierRushConfig(auth.token, id),
        moduleApi.getCourierRushPickups(auth.token, id),
        moduleApi.getCourierRushDropoffs(auth.token, id),
      ])

      return {
        kind: 'courier_rush',
        config: configPayload?.config || null,
        pickups: Array.isArray(pickupsPayload?.pickups) ? pickupsPayload.pickups : [],
        dropoffs: Array.isArray(dropoffsPayload?.dropoffs) ? dropoffsPayload.dropoffs : [],
      }
    }

    if (gameType === 'geohunter') {
      const poisPayload = await moduleApi.getGeoHunterPois(auth.token, id)
      return {
        kind: 'geohunter',
        pois: Array.isArray(poisPayload?.pois) ? poisPayload.pois : [],
      }
    }

    if (gameType === 'resource_run') {
      const nodesPayload = await moduleApi.getResourceRunNodes(auth.token, id)
      return {
        kind: 'resource_run',
        nodes: Array.isArray(nodesPayload?.nodes) ? nodesPayload.nodes : [],
      }
    }

    if (gameType === 'territory_control') {
      const zonesPayload = await moduleApi.getTerritoryZones(auth.token, id)
      return {
        kind: 'territory_control',
        zones: Array.isArray(zonesPayload?.zones) ? zonesPayload.zones : [],
      }
    }

    if (gameType === 'blindhike') {
      const configPayload = await moduleApi.getBlindHikeConfig(auth.token, id)
      return {
        kind: 'blindhike',
        config: configPayload?.config || null,
      }
    }

    if (gameType === 'echo_hunt') {
      const beaconsPayload = await moduleApi.getEchoHuntBeacons(auth.token, id)
      return {
        kind: 'echo_hunt',
        beacons: Array.isArray(beaconsPayload?.beacons) ? beaconsPayload.beacons : [],
      }
    }

    if (gameType === 'checkpoint_heist') {
      const checkpointsPayload = await moduleApi.getCheckpointHeistCheckpoints(auth.token, id)
      return {
        kind: 'checkpoint_heist',
        checkpoints: Array.isArray(checkpointsPayload?.checkpoints) ? checkpointsPayload.checkpoints : [],
      }
    }

    if (gameType === 'pandemic_response') {
      const [configPayload, statePayload] = await Promise.all([
        moduleApi.getPandemicResponseConfig(auth.token, id),
        moduleApi.getPandemicResponseAdminState(auth.token, id),
      ])

      return {
        kind: 'pandemic_response',
        config: configPayload?.config || null,
        hotspots: Array.isArray(statePayload?.hotspots) ? statePayload.hotspots : [],
        pickups: Array.isArray(statePayload?.pickups) ? statePayload.pickups : [],
      }
    }

    if (gameType === 'market_crash') {
      const adminPayload = await moduleApi.getMarketCrashAdminData(auth.token, id)
      return {
        kind: 'market_crash',
        resources: Array.isArray(adminPayload?.resources) ? adminPayload.resources : [],
        points: Array.isArray(adminPayload?.points) ? adminPayload.points : [],
      }
    }

    if (gameType === 'crazy_88') {
      const [configPayload, tasksPayload] = await Promise.all([
        moduleApi.getCrazy88Config(auth.token, id),
        moduleApi.getCrazy88Tasks(auth.token, id),
      ])
      return {
        kind: 'crazy_88',
        config: configPayload?.config || null,
        tasks: Array.isArray(tasksPayload?.tasks) ? tasksPayload.tasks : [],
      }
    }

    if (gameType === 'birds_of_prey') {
      const configPayload = await moduleApi.getBirdsOfPreyConfig(auth.token, id)
      return {
        kind: 'birds_of_prey',
        config: configPayload?.config || null,
      }
    }

    if (gameType === 'code_conspiracy') {
      const configPayload = await moduleApi.getCodeConspiracyConfig(auth.token, id)
      return {
        kind: 'code_conspiracy',
        config: configPayload?.config || null,
      }
    }

    return null
  }

  async function loadAll() {
    setLoading(true)
    setError('')
    try {
      const gameRecord = await gameApi.getGame(auth.token, gameId)
      if (!gameRecord) {
        throw new Error(t('moduleOverview.gameNotFound'))
      }

      const [overviewData, teamsData, membersData, explodingCards, pendingActions] = await Promise.all([
        moduleApi.getOverview(auth.token, gameRecord.game_type, gameId),
        gameApi.listTeams(auth.token, gameId),
        gameApi.listMembers(auth.token, gameId),
        gameRecord.game_type === 'exploding_kittens' ? moduleApi.listExplodingCards(auth.token, gameId) : Promise.resolve([]),
        gameRecord.game_type === 'exploding_kittens' ? moduleApi.listExplodingPendingActions(auth.token, gameId) : Promise.resolve([]),
      ])

      const details = await loadModuleDetails(gameRecord.game_type, gameId)

      setGame(gameRecord)
      setOverview(overviewData)
      setModuleDetails(details)
      setTeams(applyBlindHikeMarkerCounts(teamsData, overviewData, gameRecord.game_type))
      setMembers(Array.isArray(membersData) ? membersData : [])
      if (gameRecord.game_type === 'exploding_kittens') {
        const counts = {}
        for (const card of Array.isArray(explodingCards) ? explodingCards : []) {
          const holderTeamId = String(card?.holder_team_id || '').trim()
          const cardType = String(card?.type || '').trim()
          if (!holderTeamId || !cardType || !EK_HAND_CARD_TYPES.includes(cardType)) {
            continue
          }
          if (!counts[holderTeamId]) {
            counts[holderTeamId] = {}
          }
          counts[holderTeamId][cardType] = Number(counts[holderTeamId][cardType] || 0) + 1
        }
        setExplodingHandByTeam(counts)
        setExplodingPendingActionsByTeam(mapActionsByTargetTeam(pendingActions))
      } else {
        setExplodingHandByTeam({})
        setExplodingPendingActionsByTeam({})
      }
      if (!teamMessageTeamId && Array.isArray(teamsData) && teamsData[0]?.id) {
        setTeamMessageTeamId(String(teamsData[0].id))
      }
    } catch (err) {
      setError(err.message || t('moduleOverview.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError('')
      try {
        const gameRecord = await gameApi.getGame(auth.token, gameId)
        if (!gameRecord) {
          throw new Error(t('moduleOverview.gameNotFound'))
        }

        const [data, teamsData, membersData, details, explodingCards, pendingActions] = await Promise.all([
          moduleApi.getOverview(auth.token, gameRecord.game_type, gameId),
          gameApi.listTeams(auth.token, gameId),
          gameApi.listMembers(auth.token, gameId),
          loadModuleDetails(gameRecord.game_type, gameId),
          gameRecord.game_type === 'exploding_kittens' ? moduleApi.listExplodingCards(auth.token, gameId) : Promise.resolve([]),
          gameRecord.game_type === 'exploding_kittens' ? moduleApi.listExplodingPendingActions(auth.token, gameId) : Promise.resolve([]),
        ])
        if (cancelled) {
          return
        }

        setGame(gameRecord)
        setOverview(data)
        setModuleDetails(details)
        setTeams(applyBlindHikeMarkerCounts(teamsData, data, gameRecord.game_type))
        setMembers(Array.isArray(membersData) ? membersData : [])
        if (gameRecord.game_type === 'exploding_kittens') {
          const counts = {}
          for (const card of Array.isArray(explodingCards) ? explodingCards : []) {
            const holderTeamId = String(card?.holder_team_id || '').trim()
            const cardType = String(card?.type || '').trim()
            if (!holderTeamId || !cardType || !EK_HAND_CARD_TYPES.includes(cardType)) {
              continue
            }
            if (!counts[holderTeamId]) {
              counts[holderTeamId] = {}
            }
            counts[holderTeamId][cardType] = Number(counts[holderTeamId][cardType] || 0) + 1
          }
          setExplodingHandByTeam(counts)
          setExplodingPendingActionsByTeam(mapActionsByTargetTeam(pendingActions))
        } else {
          setExplodingHandByTeam({})
          setExplodingPendingActionsByTeam({})
        }
        if (Array.isArray(teamsData) && teamsData[0]?.id) {
          setTeamMessageTeamId((current) => current || String(teamsData[0].id))
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || t('moduleOverview.loadFailed'))
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [auth.token, gameId, t])

  useEffect(() => {
    if (!auth?.token || !gameId) {
      return
    }
    if (typeof window === 'undefined' || !window.JotiWs || typeof window.JotiWs.connect !== 'function') {
      return
    }

    const ws = window.JotiWs.connect({ reconnectMs: 3000 })
    const channel = `channel:${gameId}:admin`

    const subscribe = () => {
      ws.send('core.subscribe', {
        gameId,
        authToken: auth.token,
        channel,
      })
    }

    ws.onOpen(() => {
      subscribe()
    })

    ws.onEvent((incoming) => {
      const eventName = String(incoming?.event || '').trim()
      const payload = incoming?.payload && typeof incoming.payload === 'object' ? incoming.payload : {}

      if (eventName === 'admin.general.team.add' || eventName === 'admin.general.team.update') {
        const teamId = String(payload.team_id || payload.teamId || '').trim()
        if (!teamId) {
          return
        }

        const nextName = String(payload.team_name || payload.teamName || '').trim()
        const nextLogo = String(payload.team_logo || payload.teamLogo || '').trim()
        const nextLives = Number(payload.lives)

        setTeams((previous) => {
          const previousRows = Array.isArray(previous) ? previous : []
          const existingIndex = previousRows.findIndex((team) => String(team?.id || '') === teamId)
          const mapped = {
            id: teamId,
            name: nextName || '-',
            logo_path: nextLogo || null,
            ...(Number.isNaN(nextLives) ? {} : { lives: Math.max(0, nextLives) }),
          }

          if (existingIndex < 0) {
            return [...previousRows, mapped]
          }

          return previousRows.map((team) => {
            if (String(team?.id || '') !== teamId) {
              return team
            }
            return {
              ...team,
              ...(nextName ? { name: nextName } : {}),
              logo_path: nextLogo || null,
              ...(Number.isNaN(nextLives) ? {} : { lives: Math.max(0, nextLives) }),
            }
          })
        })

        setTeamMessageTeamId((current) => {
          const normalized = String(current || '').trim()
          if (normalized) {
            return normalized
          }
          return teamId
        })

        setOverview((previous) => {
          const previousOverview = previous && typeof previous === 'object' ? previous : {}
          const previousTeams = Array.isArray(previousOverview.teams) ? previousOverview.teams : []
          if (previousTeams.length === 0) {
            return previousOverview
          }

          const hasTeam = previousTeams.some((row) => String(row?.team_id || row?.id || '') === teamId)
          if (!hasTeam) {
            return previousOverview
          }

          const nextTeams = previousTeams.map((row) => (
            String(row?.team_id || row?.id || '') === teamId
              ? {
                ...row,
                ...(nextName ? { name: nextName } : {}),
                logo_path: nextLogo || null,
                logoPath: nextLogo || null,
              }
              : row
          ))

          return {
            ...previousOverview,
            teams: nextTeams,
          }
        })
        return
      }

      if (eventName === 'admin.blind_hike.marker.added') {
        if (!isBlindHike) {
          return
        }

        const changedTeamId = String(payload?.team_id || payload?.teamId || '').trim()
        const markerCount = Number(payload?.marker_count)
        const teamFinished = Boolean(payload?.team_finished)
        const marker = payload?.marker && typeof payload.marker === 'object' ? payload.marker : null
        const markerId = String(marker?.id || '').trim()
        const markerLat = Number(marker?.lat)
        const markerLon = Number(marker?.lon)

        if (!changedTeamId || Number.isNaN(markerCount)) {
          return
        }

        setTeams((previous) => (Array.isArray(previous) ? previous : []).map((team) => (
          String(team?.id || '') === changedTeamId
            ? { ...team, blindhike_markers: markerCount, blindhike_finished: teamFinished }
            : team
        )))

        setOverview((previous) => {
          const previousOverview = previous && typeof previous === 'object' ? previous : {}
          const previousTeams = Array.isArray(previousOverview.teams) ? previousOverview.teams : []
          const hasTeam = previousTeams.some((row) => String(row?.team_id || '') === changedTeamId)
          const nextTeams = hasTeam
            ? previousTeams.map((row) => (
              String(row?.team_id || '') === changedTeamId
                ? { ...row, markers: markerCount, finished: teamFinished }
                : row
            ))
            : [...previousTeams, { team_id: changedTeamId, name: changedTeamId, markers: markerCount, finished: teamFinished }]

          let nextMarkers = Array.isArray(previousOverview.markers) ? previousOverview.markers : []
          if (markerId && !Number.isNaN(markerLat) && !Number.isNaN(markerLon)) {
            const exists = nextMarkers.some((entry) => String(entry?.id || '') === markerId)
            if (!exists) {
              nextMarkers = [
                ...nextMarkers,
                {
                  id: markerId,
                  team_id: changedTeamId,
                  lat: markerLat,
                  lon: markerLon,
                  placed_at: String(marker?.placed_at || ''),
                },
              ]
            }
          }

          return {
            ...previousOverview,
            teams: nextTeams,
            markers: nextMarkers,
          }
        })
        return
      }

      if (eventName === 'admin.birds_of_prey.team.location.updated') {
        if (!isBirdsOfPrey) {
          return
        }

        const changedTeamId = String(payload?.team_id || payload?.teamId || '').trim()
        const lat = Number(payload?.lat)
        const lon = Number(payload?.lon)
        const updatedAt = String(payload?.updated_at || payload?.updatedAt || '').trim()
        if (!changedTeamId || Number.isNaN(lat) || Number.isNaN(lon)) {
          return
        }

        setOverview((previous) => {
          const previousOverview = previous && typeof previous === 'object' ? previous : {}
          const previousTeams = Array.isArray(previousOverview.teams) ? previousOverview.teams : []
          const hasTeam = previousTeams.some((row) => String(row?.team_id || '') === changedTeamId)
          const nextTeams = hasTeam
            ? previousTeams.map((row) => (
              String(row?.team_id || '') === changedTeamId
                ? { ...row, lat, lon, location_updated_at: updatedAt || row?.location_updated_at }
                : row
            ))
            : [...previousTeams, { team_id: changedTeamId, name: changedTeamId, score: 0, lat, lon, egg_count: 0, location_updated_at: updatedAt }]
          return {
            ...previousOverview,
            teams: nextTeams,
          }
        })
        return
      }

      if (eventName === 'admin.birds_of_prey.egg.added') {
        if (!isBirdsOfPrey) {
          return
        }

        const eggId = String(payload?.id || '').trim()
        const ownerTeamId = String(payload?.owner_team_id || payload?.ownerTeamId || '').trim()
        const ownerTeamName = String(payload?.owner_team_name || payload?.ownerTeamName || '').trim()
        const lat = Number(payload?.lat)
        const lon = Number(payload?.lon)
        if (!eggId || !ownerTeamId || Number.isNaN(lat) || Number.isNaN(lon)) {
          return
        }

        setOverview((previous) => {
          const previousOverview = previous && typeof previous === 'object' ? previous : {}
          const previousEggs = Array.isArray(previousOverview.eggs) ? previousOverview.eggs : []
          const previousTeams = Array.isArray(previousOverview.teams) ? previousOverview.teams : []
          const eggExists = previousEggs.some((row) => String(row?.id || '') === eggId)
          const nextEggs = eggExists
            ? previousEggs
            : [
              {
                id: eggId,
                owner_team_id: ownerTeamId,
                owner_team_name: ownerTeamName || ownerTeamId,
                lat,
                lon,
                dropped_at: String(payload?.dropped_at || ''),
                automatic: Boolean(payload?.automatic),
              },
              ...previousEggs,
            ]

          const nextTeams = previousTeams.map((row) => (
            String(row?.team_id || '') === ownerTeamId
              ? { ...row, egg_count: Number(row?.egg_count || 0) + (eggExists ? 0 : 1) }
              : row
          ))

          return {
            ...previousOverview,
            eggs: nextEggs,
            teams: nextTeams,
          }
        })
        return
      }

      if (eventName === 'admin.birds_of_prey.egg.removed') {
        if (!isBirdsOfPrey) {
          return
        }

        const eggId = String(payload?.egg_id || payload?.eggId || '').trim()
        const ownerTeamId = String(payload?.owner_team_id || payload?.ownerTeamId || '').trim()
        if (!eggId) {
          return
        }

        setOverview((previous) => {
          const previousOverview = previous && typeof previous === 'object' ? previous : {}
          const previousEggs = Array.isArray(previousOverview.eggs) ? previousOverview.eggs : []
          const existed = previousEggs.some((row) => String(row?.id || '') === eggId)
          const nextEggs = previousEggs.filter((row) => String(row?.id || '') !== eggId)
          const previousTeams = Array.isArray(previousOverview.teams) ? previousOverview.teams : []
          const nextTeams = previousTeams.map((row) => (
            String(row?.team_id || '') === ownerTeamId
              ? { ...row, egg_count: Math.max(0, Number(row?.egg_count || 0) - (existed ? 1 : 0)) }
              : row
          ))
          return {
            ...previousOverview,
            eggs: nextEggs,
            teams: nextTeams,
          }
        })
        return
      }

      if (eventName === 'admin.birds_of_prey.team.score') {
        if (!isBirdsOfPrey) {
          return
        }

        const changedTeamId = String(payload?.team_id || payload?.teamId || '').trim()
        const score = Number(payload?.score)
        if (!changedTeamId || Number.isNaN(score)) {
          return
        }

        setTeams((previous) => (Array.isArray(previous) ? previous : []).map((team) => (
          String(team?.id || '') === changedTeamId
            ? { ...team, geo_score: score }
            : team
        )))

        setOverview((previous) => {
          const previousOverview = previous && typeof previous === 'object' ? previous : {}
          const previousTeams = Array.isArray(previousOverview.teams) ? previousOverview.teams : []
          const hasTeam = previousTeams.some((row) => String(row?.team_id || '') === changedTeamId)
          const nextTeams = hasTeam
            ? previousTeams.map((row) => (
              String(row?.team_id || '') === changedTeamId
                ? { ...row, score }
                : row
            ))
            : [...previousTeams, { team_id: changedTeamId, name: changedTeamId, score, egg_count: 0 }]
          return {
            ...previousOverview,
            teams: nextTeams,
          }
        })
        return
      }

      if (eventName === 'admin.market_crash.team.location.updated') {
        if (!isMarketCrash) {
          return
        }

        const changedTeamId = String(payload?.team_id || payload?.teamId || '').trim()
        const lat = Number(payload?.lat)
        const lon = Number(payload?.lon)
        const updatedAt = String(payload?.updated_at || payload?.updatedAt || '').trim()
        if (!changedTeamId || Number.isNaN(lat) || Number.isNaN(lon)) {
          return
        }

        setOverview((previous) => {
          const previousOverview = previous && typeof previous === 'object' ? previous : {}
          const previousTeams = Array.isArray(previousOverview.teams) ? previousOverview.teams : []
          const hasTeam = previousTeams.some((row) => String(row?.team_id || row?.id || '') === changedTeamId)
          const nextTeams = hasTeam
            ? previousTeams.map((row) => (
              String(row?.team_id || row?.id || '') === changedTeamId
                ? { ...row, lat, lon, location_updated_at: updatedAt || row?.location_updated_at }
                : row
            ))
            : [...previousTeams, { team_id: changedTeamId, name: changedTeamId, score: 0, cash: 0, lat, lon, location_updated_at: updatedAt }]

          return {
            ...previousOverview,
            teams: nextTeams,
          }
        })
        return
      }

      if (eventName === 'admin.market_crash.team.score') {
        if (!isMarketCrash) {
          return
        }

        const changedTeamId = String(payload?.team_id || payload?.teamId || '').trim()
        const score = Number(payload?.score)
        const cash = Number(payload?.cash)
        if (!changedTeamId || Number.isNaN(score)) {
          return
        }

        setTeams((previous) => (Array.isArray(previous) ? previous : []).map((team) => (
          String(team?.id || '') === changedTeamId
            ? {
              ...team,
              geo_score: score,
            }
            : team
        )))

        setOverview((previous) => {
          const previousOverview = previous && typeof previous === 'object' ? previous : {}
          const previousTeams = Array.isArray(previousOverview.teams) ? previousOverview.teams : []
          const hasTeam = previousTeams.some((row) => String(row?.team_id || row?.id || '') === changedTeamId)
          const nextTeams = hasTeam
            ? previousTeams.map((row) => (
              String(row?.team_id || row?.id || '') === changedTeamId
                ? {
                  ...row,
                  score,
                  ...(Number.isNaN(cash) ? {} : { cash }),
                }
                : row
            ))
            : [...previousTeams, {
              team_id: changedTeamId,
              id: changedTeamId,
              name: changedTeamId,
              score,
              ...(Number.isNaN(cash) ? {} : { cash }),
            }]

          return {
            ...previousOverview,
            teams: nextTeams,
          }
        })
        return
      }

      if (eventName === 'admin.market_crash.trade.executed') {
        if (!isMarketCrash) {
          return
        }

        const changedTeamId = String(payload?.team_id || payload?.teamId || '').trim()
        const score = Number(payload?.score)
        const cash = Number(payload?.cash)
        if (!changedTeamId) {
          return
        }

        setOverview((previous) => {
          const previousOverview = previous && typeof previous === 'object' ? previous : {}
          const previousTeams = Array.isArray(previousOverview.teams) ? previousOverview.teams : []
          const hasTeam = previousTeams.some((row) => String(row?.team_id || row?.id || '') === changedTeamId)
          const nextTeams = hasTeam
            ? previousTeams.map((row) => (
              String(row?.team_id || row?.id || '') === changedTeamId
                ? {
                  ...row,
                  ...(Number.isNaN(score) ? {} : { score }),
                  ...(Number.isNaN(cash) ? {} : { cash }),
                }
                : row
            ))
            : [...previousTeams, {
              team_id: changedTeamId,
              id: changedTeamId,
              name: changedTeamId,
              ...(Number.isNaN(score) ? {} : { score }),
              ...(Number.isNaN(cash) ? {} : { cash }),
            }]

          const previousActions = Array.isArray(previousOverview.recent_actions) ? previousOverview.recent_actions : []
          const tradeId = String(payload?.trade_id || '').trim()
          const trade = payload?.trade && typeof payload.trade === 'object' ? payload.trade : null
          const nextActions = tradeId
            ? [
              {
                id: tradeId,
                team_id: changedTeamId,
                action: 'market_crash.trade.execute',
                at: String(trade?.at || new Date().toISOString()),
                metadata: trade || {},
              },
              ...previousActions,
            ].slice(0, 50)
            : previousActions

          return {
            ...previousOverview,
            teams: nextTeams,
            recent_actions: nextActions,
          }
        })
        return
      }

      if (eventName === 'admin.market_crash.prices.updated') {
        if (!isMarketCrash) {
          return
        }

        const pointsPatch = payload?.points && typeof payload.points === 'object' ? payload.points : {}

        setOverview((previous) => {
          const previousOverview = previous && typeof previous === 'object' ? previous : {}
          const previousPoints = Array.isArray(previousOverview.points) ? previousOverview.points : []

          const nextPoints = previousPoints.map((point) => {
            const pointId = String(point?.id || '')
            const resourcePatchById = pointsPatch[pointId]
            if (!pointId || !resourcePatchById || typeof resourcePatchById !== 'object') {
              return point
            }

            const resourceSettings = Array.isArray(point?.resource_settings) ? point.resource_settings : []
            const nextResourceSettings = resourceSettings.map((setting) => {
              const resourceId = String(setting?.resource_id || '')
              const patch = resourcePatchById[resourceId]
              if (!resourceId || !patch || typeof patch !== 'object') {
                return setting
              }
              return {
                ...setting,
                ...(patch?.buy_price === undefined ? {} : { buy_price: Number(patch.buy_price) }),
                ...(patch?.sell_price === undefined ? {} : { sell_price: Number(patch.sell_price) }),
                ...(patch?.tick_seconds === undefined ? {} : { tick_seconds: Number(patch.tick_seconds) }),
                ...(patch?.fluctuation_percent === undefined ? {} : { fluctuation_percent: Number(patch.fluctuation_percent) }),
              }
            })

            return {
              ...point,
              resource_settings: nextResourceSettings,
            }
          })

          return {
            ...previousOverview,
            points: nextPoints,
          }
        })
        return
      }

      if (eventName === 'admin.general.team.remove') {
        const teamId = String(payload.team_id || payload.teamId || '').trim()
        if (!teamId) {
          return
        }

        setTeams((previous) => previous.filter((team) => String(team?.id || '') !== teamId))
        setExplodingHandByTeam((previous) => {
          const next = { ...previous }
          delete next[teamId]
          return next
        })
        setExplodingPendingActionsByTeam((previous) => {
          const next = { ...previous }
          delete next[teamId]
          return next
        })
        setTeamMessageTeamId((current) => {
          if (String(current || '').trim() !== teamId) {
            return current
          }
          return ''
        })
        return
      }

      if (eventName === 'admin.exploding_kittens.card.adjust_amount') {
        if (!isExplodingKittens) {
          return
        }
        const teamId = String(payload.team_id || payload.teamId || '').trim()
        const cardType = String(payload.card_type || payload.cardType || '').trim()
        const amount = Number(payload.amount)

        if (!teamId || !cardType || Number.isNaN(amount)) {
          return
        }

        setExplodingHandByTeam((previous) => {
          const next = { ...previous }
          const currentTeam = { ...(next[teamId] || {}) }
          currentTeam[cardType] = Math.max(0, amount)
          next[teamId] = currentTeam
          return next
        })
        return
      }

      if (eventName === 'admin.exploding_kittens.action.add') {
        if (!isExplodingKittens) {
          return
        }

        const targetTeamId = String(payload.target_team_id || payload.targetTeamId || '').trim()
        const actionId = String(payload.id || '').trim()
        if (!targetTeamId || !actionId) {
          return
        }

        setExplodingPendingActionsByTeam((previous) => {
          const next = { ...previous }
          const existing = Array.isArray(next[targetTeamId]) ? next[targetTeamId] : []
          if (existing.some((action) => String(action?.id || '') === actionId)) {
            return previous
          }
          next[targetTeamId] = [payload, ...existing]
          return next
        })
        return
      }

      if (eventName === 'admin.exploding_kittens.action.remove') {
        if (!isExplodingKittens) {
          return
        }

        const targetTeamId = String(payload.target_team_id || payload.targetTeamId || '').trim()
        const actionId = String(payload.id || '').trim()
        if (!targetTeamId || !actionId) {
          return
        }

        setExplodingPendingActionsByTeam((previous) => {
          const next = { ...previous }
          const existing = Array.isArray(next[targetTeamId]) ? next[targetTeamId] : []
          next[targetTeamId] = existing.filter((action) => String(action?.id || '') !== actionId)
          return next
        })
        return
      }

      if (eventName === 'admin.exploding_kittens.lives.updated') {
        if (!isExplodingKittens) {
          return
        }
        const teamId = String(payload.team_id || payload.teamId || '').trim()
        const lives = Number(payload.lives)

        if (!teamId || Number.isNaN(lives)) {
          return
        }

        setTeams((previous) => previous.map((team) => {
          if (String(team?.id || '') !== teamId) {
            return team
          }
          return {
            ...team,
            lives: Math.max(0, lives),
          }
        }))
        return
      }

      if (eventName !== 'admin.exploding_kittens.state.activate' && eventName !== 'admin.exploding_kittens.state.deactivate') {
        return
      }

      if (!isExplodingKittens) {
        return
      }

      const teamId = String(payload.team_id || payload.teamId || '').trim()
      const state = String(payload.state || '').trim()
      const stateFlag = EK_STATE_TO_FLAG[state]

      if (!teamId || !stateFlag) {
        return
      }

      const isActive = eventName === 'admin.exploding_kittens.state.activate'
      setTeams((previous) => previous.map((team) => {
        if (String(team?.id || '') !== teamId) {
          return team
        }
        return {
          ...team,
          [stateFlag]: isActive,
        }
      }))
    })

    return () => {
      ws.close()
    }
  }, [auth?.token, gameId, isBirdsOfPrey, isBlindHike, isExplodingKittens, isMarketCrash])

  async function handleCreateTeam(event) {
    event.preventDefault()
    try {
      await gameApi.createTeam(auth.token, gameId, {
        name: newTeamName.trim(),
        code: newTeamCode.trim() || undefined,
      })
      setNewTeamName('')
      setNewTeamCode('')
      await loadAll()
    } catch (err) {
      setError(err.message || t('moduleOverview.createTeamFailed', {}, 'Failed to create team'))
    }
  }

  async function handleDeleteTeam(teamId) {
    try {
      await gameApi.deleteTeam(auth.token, gameId, teamId)
      await loadAll()
    } catch (err) {
      setError(err.message || t('moduleOverview.deleteTeamFailed', {}, 'Failed to delete team'))
    }
  }

  async function handleSendTeamMessage(event) {
    event.preventDefault()
    try {
      await gameApi.sendTeamMessage(auth.token, gameId, teamMessageTeamId, teamMessageText)
      setTeamMessageText('')
    } catch (err) {
      setError(err.message || t('moduleOverview.sendTeamMessageFailed', {}, 'Failed to send team message'))
    }
  }

  async function handleAddMember(event) {
    event.preventDefault()
    try {
      if (memberRoleType === 'admin') {
        await gameApi.addAdmin(auth.token, gameId, memberEmail.trim())
      } else {
        await gameApi.addGameMaster(auth.token, gameId, memberEmail.trim())
      }
      setMemberEmail('')
      await loadAll()
    } catch (err) {
      setError(err.message || t('moduleOverview.addMemberFailed', {}, 'Failed to add member'))
    }
  }

  async function handleRemoveMember(userId, role) {
    try {
      if (role === 'admin') {
        await gameApi.removeAdmin(auth.token, gameId, userId)
      } else if (role === 'game_master') {
        await gameApi.removeGameMaster(auth.token, gameId, userId)
      }
      await loadAll()
    } catch (err) {
      setError(err.message || t('moduleOverview.removeMemberFailed', {}, 'Failed to remove member'))
    }
  }

  async function handleJudgeSubmission(event) {
    event.preventDefault()
    try {
      await moduleApi.submitAdminAction(auth.token, game?.game_type, gameId, {
        team_id: judgeTeamId.trim(),
        submission_id: judgeSubmissionId.trim(),
        accepted: judgeAccepted,
      })
      setJudgeSubmissionId('')
      await loadAll()
    } catch (err) {
      setError(err.message || t('moduleOverview.judgeFailed', {}, 'Failed to judge submission'))
    }
  }

  function handCountForTeam(teamId, cardType) {
    const byType = explodingHandByTeam[String(teamId || '')] || {}
    return Number(byType[cardType] || 0)
  }

  async function handleAdjustExplodingHand(teamId, cardType, delta) {
    try {
      if (delta > 0) {
        await moduleApi.addRandomExplodingTeamHandCardByType(auth.token, gameId, teamId, cardType)
      } else {
        await moduleApi.removeRandomExplodingTeamHandCardByType(auth.token, gameId, teamId, cardType)
      }
    } catch (err) {
      setError(err.message || t('moduleOverview.handAdjustFailed'))
    }
  }

  async function handleAdjustExplodingLives(teamId, delta) {
    try {
      await moduleApi.adjustExplodingTeamLives(auth.token, gameId, teamId, delta)
    } catch (err) {
      setError(err.message || t('moduleOverview.livesAdjustFailed', {}, 'Failed to adjust lives'))
    }
  }

  return (
    <main className="page-shell">
      <div className="geo-header">
        <div>
            <p className="overview-kicker">{t('moduleOverview.liveOverviewTitle')}</p>
            <h1>{t('moduleOverview.liveOverviewTitle')}</h1>
            <p className="overview-subtitle">{t('moduleOverview.liveOverviewSubtitle', { game: game?.name || '-' })}</p>
        </div>
        <div className="overview-actions">
          <Link className="btn btn-ghost" to={`/admin/games/${gameId}`}>
            {t('moduleOverview.backToGame')}
          </Link>
        </div>
      </div>

      {error ? <div className="flash flash-error">{error}</div> : null}
      {loading ? <p>{t('gamesPage.loading', {}, 'Loading…')}</p> : null}

      <div className="overview-stack">
        {game?.game_type === 'blindhike' && moduleDetails?.kind === 'blindhike' ? (
          <section className="overview-panel">
            <h2>{t('blindhike.admin.configure_title', {}, 'Blind Hike live state')}</h2>
            <BlindHikeAdminOverviewMap
              target={blindHikeTarget}
              markers={blindHikeMarkers}
              teams={sortedTeams}
              t={t}
            />
            <table className="admin-table" style={{ marginTop: '1rem' }}>
              <tbody>
                <tr>
                  <th>{t('teamDashboard.markers', {}, 'Markers')}</th>
                  <td>{blindHikeMarkers.length}</td>
                </tr>
                <tr>
                  <th>{t('blindhike.max_markers', {}, 'Max markers')}</th>
                  <td>{moduleDetails.config?.max_markers ?? '-'}</td>
                </tr>
                <tr>
                  <th>{t('blindhike.marker_cooldown', {}, 'Marker cooldown')}</th>
                  <td>{moduleDetails.config?.marker_cooldown ?? 0}</td>
                </tr>
              </tbody>
            </table>
          </section>
        ) : null}

        {game?.game_type === 'birds_of_prey' && moduleDetails?.kind === 'birds_of_prey' ? (
          <section className="overview-panel">
            <h2>{t('birds_of_prey.admin.liveMap', {}, 'Live map')}</h2>
            <BirdsOfPreyAdminOverviewMap
              teams={(Array.isArray(overview?.teams) ? overview.teams : []).map((team) => ({
                id: String(team?.team_id || team?.id || ''),
                name: String(team?.name || ''),
                logo_path: String(team?.logo_path || team?.logoPath || ''),
                lat: Number(team?.lat),
                lon: Number(team?.lon),
                score: Number(team?.score || 0),
              }))}
              eggs={Array.isArray(overview?.eggs) ? overview.eggs : []}
              t={t}
            />
            <table className="admin-table">
              <tbody>
                <tr>
                  <th>{t('birds_of_prey.admin.visibility_radius', {}, 'Visibility radius')}</th>
                  <td>{moduleDetails.config?.visibility_radius_meters ?? '-'}m</td>
                </tr>
                <tr>
                  <th>{t('birds_of_prey.admin.protection_radius', {}, 'Protection radius')}</th>
                  <td>{moduleDetails.config?.protection_radius_meters ?? '-'}m</td>
                </tr>
                <tr>
                  <th>{t('birds_of_prey.admin.auto_drop_seconds', {}, 'Auto drop')}</th>
                  <td>{moduleDetails.config?.auto_drop_seconds ?? '-'}s</td>
                </tr>
                <tr>
                  <th>{t('birds_of_prey.admin.teamCount', {}, 'Teams')}</th>
                  <td>{Array.isArray(overview?.teams) ? overview.teams.length : 0}</td>
                </tr>
                <tr>
                  <th>{t('birds_of_prey.admin.eggCount', {}, 'Eggs')}</th>
                  <td>{Array.isArray(overview?.eggs) ? overview.eggs.length : 0}</td>
                </tr>
              </tbody>
            </table>
          </section>
        ) : null}

        <section className="overview-panel">
          <h2>{t('moduleOverview.overviewData')}</h2>
          {sortedTeams.length === 0 ? <p>{t('gamePage.noTeams', {}, 'No teams')}</p> : null}
          {sortedTeams.length > 0 ? (
            <section className="overview-grid overview-grid-ek" id="overview-grid">
              {sortedTeams.map((team) => {
                const markers = Number(team?.blindhike_markers ?? team?.markers ?? 0)
                const lives = Number(team?.lives || 0)
                const metricValue = isBlindHike ? markers : lives
                const metricLabel = isBlindHike
                  ? t('teamDashboard.markers', {}, 'Markers')
                  : t('teamDashboard.lives', {}, 'Lives')
                return (
                  <article key={team.id} className="team-card" data-team-id={team.id}>
                    <div className="team-card-header">
                      <div className="team-identity">
                        {team.logo_path ? <img className="team-logo" src={toAssetUrl(team.logo_path)} alt={team.name} /> : null}
                        <div className="team-identity-meta">
                          <h2>{team.name}</h2>
                          {isBlindHike && team?.blindhike_finished ? <p className="team-code">✅ {t('teamDashboard.blindhike.finished', {}, 'Finished')}</p> : null}
                          <p className="team-code">{team.code}</p>
                        </div>
                      </div>
                      <div className="team-lives">
                        <span className="team-lives-value">{metricValue}</span>
                        <span className="team-lives-label">{metricLabel}</span>
                        {isExplodingKittens ? (
                          <div className="team-hand-controls" data-team-lives-controls>
                            <button
                              className="btn btn-ghost btn-small"
                              type="button"
                              onClick={() => handleAdjustExplodingLives(team.id, -1)}
                            >
                              −
                            </button>
                            <button
                              className="btn btn-ghost btn-small"
                              type="button"
                              onClick={() => handleAdjustExplodingLives(team.id, 1)}
                            >
                              +
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {isExplodingKittens ? (
                      <div className="team-flags" data-team-flags>
                        <span className={`tag tag-cool ${team?.pending_skip ? '' : 'is-inactive'}`} title={t('teamDashboard.pendingSkip', {}, 'Pending skip')}>
                          ⏭
                        </span>
                        <span className={`tag tag-warm ${team?.pending_peek ? '' : 'is-inactive'}`} title={t('teamDashboard.pendingPeek', {}, 'Pending peek')}>
                          👁
                        </span>
                        <span className={`tag tag-alert ${team?.pending_attack ? '' : 'is-inactive'}`} title={t('teamDashboard.pendingAttack', {}, 'Pending attack')}>
                          ⚔
                        </span>
                      </div>
                    ) : null}

                    <div className="team-section">
                      {isExplodingKittens ? (
                        <>
                          <h3>{t('teamDashboard.pendingActions', {}, 'Pending actions')}</h3>
                          {(explodingPendingActionsByTeam[team.id] || []).length === 0 ? (
                            <p className="muted">{t('teamDashboard.noActions', {}, 'No actions')}</p>
                          ) : (
                            <ul className="team-hand-list">
                              {(explodingPendingActionsByTeam[team.id] || []).map((action) => (
                                <li key={`pending-action-${team.id}-${action.id}`} className="team-hand-row">
                                  <span className="team-hand-label">{getTeamNameById(action.source_team_id)}</span>
                                  <span className="chip-meta">{String(action.action_type || 'pending_action')}</span>
                                </li>
                              ))}
                            </ul>
                          )}
                          <h3>{t('moduleOverview.hand')}</h3>
                          {EK_HAND_CARD_TYPES.every((cardType) => handCountForTeam(team.id, cardType) === 0) ? (
                            <p className="muted">{t('moduleOverview.noCards')}</p>
                          ) : null}
                          <ul className="team-hand-list">
                            {EK_HAND_CARD_TYPES.map((cardType) => (
                              <li key={`${team.id}-${cardType}`} className="team-hand-row">
                                <span className="team-hand-label">{t(`explodingKittens.cardTypes.${cardType}`, {}, String(cardType || '').replaceAll('_', ' '))}</span>
                                <div className="team-hand-amount">
                                  <span>{handCountForTeam(team.id, cardType)}</span>
                                  <div className="team-hand-controls" data-team-hand-controls>
                                    <button
                                      className="btn btn-ghost btn-small"
                                      type="button"
                                      onClick={() => handleAdjustExplodingHand(team.id, cardType, -1)}
                                    >
                                      −
                                    </button>
                                    <button
                                      className="btn btn-ghost btn-small"
                                      type="button"
                                      onClick={() => handleAdjustExplodingHand(team.id, cardType, 1)}
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>
                              </li>
                            ))}
                          </ul>
                        </>
                      ) : null}
                    </div>
                  </article>
                )
              })}
            </section>
          ) : null}
        </section>

        {game?.game_type === 'geohunter' && moduleDetails?.kind === 'geohunter' ? (
          <section className="overview-panel">
            <h2>{t('geoHunter.admin.points', {}, 'GeoHunter live state')}</h2>
            <table className="admin-table">
              <tbody>
                <tr>
                  <th>{t('geoHunter.admin.points', {}, 'Points')}</th>
                  <td>{moduleDetails.pois.length}</td>
                </tr>
              </tbody>
            </table>
          </section>
        ) : null}

        {game?.game_type === 'resource_run' && moduleDetails?.kind === 'resource_run' ? (
          <section className="overview-panel">
            <h2>{t('resource_run.admin.nodes', {}, 'Resource Run live state')}</h2>
            <table className="admin-table">
              <tbody>
                <tr>
                  <th>{t('resource_run.admin.nodes', {}, 'Nodes')}</th>
                  <td>{moduleDetails.nodes.length}</td>
                </tr>
              </tbody>
            </table>
          </section>
        ) : null}

        {game?.game_type === 'territory_control' && moduleDetails?.kind === 'territory_control' ? (
          <section className="overview-panel">
            <h2>{t('territory_control.admin.zone_count', {}, 'Territory Control live state')}</h2>
            <table className="admin-table">
              <tbody>
                <tr>
                  <th>{t('territory_control.admin.zone_count', {}, 'Zones')}</th>
                  <td>{moduleDetails.zones.length}</td>
                </tr>
              </tbody>
            </table>
          </section>
        ) : null}

        {game?.game_type === 'echo_hunt' && moduleDetails?.kind === 'echo_hunt' ? (
          <section className="overview-panel">
            <h2>{t('echo_hunt.admin.beacons', {}, 'Echo Hunt live state')}</h2>
            <table className="admin-table">
              <tbody>
                <tr>
                  <th>{t('echo_hunt.admin.beacons', {}, 'Beacons')}</th>
                  <td>{moduleDetails.beacons.length}</td>
                </tr>
              </tbody>
            </table>
          </section>
        ) : null}

        {game?.game_type === 'checkpoint_heist' && moduleDetails?.kind === 'checkpoint_heist' ? (
          <section className="overview-panel">
            <h2>{t('checkpoint_heist.admin.checkpoints', {}, 'Checkpoint Heist live state')}</h2>
            <table className="admin-table">
              <tbody>
                <tr>
                  <th>{t('checkpoint_heist.admin.checkpoints', {}, 'Checkpoints')}</th>
                  <td>{moduleDetails.checkpoints.length}</td>
                </tr>
              </tbody>
            </table>
          </section>
        ) : null}

        {game?.game_type === 'courier_rush' && moduleDetails?.kind === 'courier_rush' ? (
          <section className="overview-panel">
            <h2>{t('courier_rush.admin.settings_title', {}, 'Courier Rush live state')}</h2>
            <table className="admin-table">
              <tbody>
                <tr>
                  <th>{t('courier_rush.admin.pickups', {}, 'Pickups')}</th>
                  <td>{moduleDetails.pickups.length}</td>
                </tr>
                <tr>
                  <th>{t('courier_rush.admin.dropoffs', {}, 'Dropoffs')}</th>
                  <td>{moduleDetails.dropoffs.length}</td>
                </tr>
                <tr>
                  <th>{t('courier_rush.admin.pickup_mode', {}, 'Pickup mode')}</th>
                  <td>{moduleDetails.config?.pickup_mode || '-'}</td>
                </tr>
                <tr>
                  <th>{t('courier_rush.admin.dropoff_mode', {}, 'Dropoff mode')}</th>
                  <td>{moduleDetails.config?.dropoff_mode || '-'}</td>
                </tr>
                <tr>
                  <th>{t('courier_rush.admin.max_active_pickups', {}, 'Max active pickups')}</th>
                  <td>{moduleDetails.config?.max_active_pickups ?? '-'}</td>
                </tr>
              </tbody>
            </table>

            <h3 style={{ marginTop: '1rem' }}>{t('courier_rush.admin.pickups', {}, 'Pickups')}</h3>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('courier_rush.admin.table_title', {}, 'Title')}</th>
                  <th>{t('common.lat', {}, 'Lat')}</th>
                  <th>{t('common.lon', {}, 'Lon')}</th>
                  <th>{t('courier_rush.admin.table_radius', {}, 'Radius')}</th>
                  <th>{t('courier_rush.admin.table_points', {}, 'Points')}</th>
                </tr>
              </thead>
              <tbody>
                {moduleDetails.pickups.slice(0, 10).map((pickup) => (
                  <tr key={pickup.id}>
                    <td>{pickup.title}</td>
                    <td>{pickup.latitude}</td>
                    <td>{pickup.longitude}</td>
                    <td>{pickup.radius_meters}</td>
                    <td>{pickup.points}</td>
                  </tr>
                ))}
                {moduleDetails.pickups.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="muted">{t('courier_rush.admin.empty_pickups', {}, 'No pickups')}</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </section>
        ) : null}

        {game?.game_type === 'pandemic_response' && moduleDetails?.kind === 'pandemic_response' ? (
          <section className="overview-panel">
            <h2>{t('pandemic_response.admin.hotspots_subtitle', {}, 'Pandemic live state')}</h2>
            <table className="admin-table">
              <tbody>
                <tr>
                  <th>{t('pandemic_response.admin.current_hotspots', {}, 'Current hotspots')}</th>
                  <td>{moduleDetails.hotspots.length}</td>
                </tr>
                <tr>
                  <th>{t('pandemic_response.admin.current_pickups', {}, 'Current pickup points')}</th>
                  <td>{moduleDetails.pickups.length}</td>
                </tr>
                <tr>
                  <th>{t('pandemic_response.admin.target_active_hotspots', {}, 'Target active hotspots')}</th>
                  <td>{moduleDetails.config?.target_active_hotspots ?? '-'}</td>
                </tr>
                <tr>
                  <th>{t('pandemic_response.admin.penalty_percent', {}, 'Penalty percent')}</th>
                  <td>{moduleDetails.config?.penalty_percent ?? '-'}</td>
                </tr>
              </tbody>
            </table>

            <h3 style={{ marginTop: '1rem' }}>{t('pandemic_response.admin.current_hotspots', {}, 'Current hotspots')}</h3>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('pandemic_response.admin.table_title', {}, 'Title')}</th>
                  <th>{t('common.lat', {}, 'Lat')}</th>
                  <th>{t('common.lon', {}, 'Lon')}</th>
                  <th>{t('pandemic_response.admin.table_radius', {}, 'Radius')}</th>
                  <th>{t('pandemic_response.admin.table_points', {}, 'Points')}</th>
                  <th>{t('pandemic_response.admin.table_severity', {}, 'Severity')}</th>
                </tr>
              </thead>
              <tbody>
                {moduleDetails.hotspots.slice(0, 12).map((hotspot) => (
                  <tr key={hotspot.id}>
                    <td>{hotspot.title}</td>
                    <td>{hotspot.latitude}</td>
                    <td>{hotspot.longitude}</td>
                    <td>{hotspot.radius_meters}</td>
                    <td>{hotspot.points}</td>
                    <td>{hotspot.severity_level}</td>
                  </tr>
                ))}
                {moduleDetails.hotspots.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="muted">{t('pandemic_response.admin.empty_hotspots', {}, 'No hotspots')}</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </section>
        ) : null}

        {game?.game_type === 'market_crash' && moduleDetails?.kind === 'market_crash' ? (
          <section className="overview-panel">
            <h2>{t('market_crash.admin.overview_subtitle', {}, 'Market Crash live state')}</h2>
            <MarketCrashAdminOverviewMap
              points={marketCrashOverviewPoints}
              teams={marketCrashOverviewTeams}
              t={t}
            />
            <table className="admin-table">
              <tbody>
                <tr>
                  <th>{t('market_crash.admin.resource_list', {}, 'Resources')}</th>
                  <td>{moduleDetails.resources.length}</td>
                </tr>
                <tr>
                  <th>{t('market_crash.admin.point_list', {}, 'Points')}</th>
                  <td>{moduleDetails.points.length}</td>
                </tr>
                <tr>
                  <th>{t('market_crash.admin.team_list', {}, 'Teams')}</th>
                  <td>{marketCrashOverviewTeams.length}</td>
                </tr>
              </tbody>
            </table>

            <h3 style={{ marginTop: '1rem' }}>{t('market_crash.admin.resource_list', {}, 'Resources')}</h3>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('market_crash.admin.resource_table_name', {}, 'Name')}</th>
                  <th>{t('market_crash.admin.resource_table_default_price', {}, 'Default price')}</th>
                </tr>
              </thead>
              <tbody>
                {moduleDetails.resources.map((resource) => (
                  <tr key={resource.id}>
                    <td>{resource.name}</td>
                    <td>{resource.default_price}</td>
                  </tr>
                ))}
                {moduleDetails.resources.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="muted">{t('market_crash.admin.resource_empty', {}, 'No resources')}</td>
                  </tr>
                ) : null}
              </tbody>
            </table>

            <h3 style={{ marginTop: '1rem' }}>{t('market_crash.admin.teams_live', {}, 'Teams live')}</h3>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('moduleOverview.teamName', {}, 'Team')}</th>
                  <th>{t('market_crash.team.cash', {}, 'Cash')}</th>
                  <th>{t('moduleOverview.score', {}, 'Score')}</th>
                  <th>{t('moduleOverview.updatedAt', {}, 'Updated')}</th>
                </tr>
              </thead>
              <tbody>
                {marketCrashOverviewTeams.map((team) => (
                  <tr key={team.team_id || team.id}>
                    <td>{team.name || '-'}</td>
                    <td>{Number(team.cash || 0)}</td>
                    <td>{Number(team.score || 0)}</td>
                    <td>{formatDate(team.location_updated_at)}</td>
                  </tr>
                ))}
                {marketCrashOverviewTeams.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="muted">{t('moduleOverview.noTeams', {}, 'No teams')}</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </section>
        ) : null}

        {game?.game_type === 'crazy_88' && moduleDetails?.kind === 'crazy_88' ? (
          <section className="overview-panel">
            <h2>{t('crazy88.admin.tasks_subtitle', {}, 'Crazy88 live state')}</h2>
            <table className="admin-table">
              <tbody>
                <tr>
                  <th>{t('crazy88.admin.visibility_mode', {}, 'Visibility mode')}</th>
                  <td>{moduleDetails.config?.visibility_mode || '-'}</td>
                </tr>
                <tr>
                  <th>{t('crazy88.admin.task_list', {}, 'Tasks')}</th>
                  <td>{moduleDetails.tasks.length}</td>
                </tr>
              </tbody>
            </table>

            <h3 style={{ marginTop: '1rem' }}>{t('crazy88.admin.task_list', {}, 'Tasks')}</h3>
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('crazy88.admin.table_title', {}, 'Title')}</th>
                  <th>{t('crazy88.admin.table_points', {}, 'Points')}</th>
                  <th>{t('crazy88.admin.table_location', {}, 'Location')}</th>
                </tr>
              </thead>
              <tbody>
                {moduleDetails.tasks.slice(0, 20).map((task) => (
                  <tr key={task.id}>
                    <td>{task.title}</td>
                    <td>{task.points}</td>
                    <td>
                      {task.latitude !== null && task.longitude !== null
                        ? `${task.latitude}, ${task.longitude} · ${task.radius_meters}m`
                        : t('moduleOverview.notAvailable', {}, '—')}
                    </td>
                  </tr>
                ))}
                {moduleDetails.tasks.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="muted">{t('crazy88.admin.task_empty', {}, 'No tasks')}</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </section>
        ) : null}

        {game?.game_type === 'code_conspiracy' && moduleDetails?.kind === 'code_conspiracy' ? (
          <section className="overview-panel">
            <h2>{t('code_conspiracy.admin.config', {}, 'Code Conspiracy live state')}</h2>
            <table className="admin-table">
              <tbody>
                <tr>
                  <th>{t('code_conspiracy.admin.code_length', {}, 'Code length')}</th>
                  <td>{moduleDetails.config?.code_length ?? '-'}</td>
                </tr>
                <tr>
                  <th>{t('code_conspiracy.admin.character_set', {}, 'Character set')}</th>
                  <td>{moduleDetails.config?.character_set || '-'}</td>
                </tr>
                <tr>
                  <th>{t('code_conspiracy.admin.cooldown_seconds', {}, 'Cooldown')}</th>
                  <td>{moduleDetails.config?.submission_cooldown_seconds ?? '-'}s</td>
                </tr>
                <tr>
                  <th>{t('code_conspiracy.admin.correct_points', {}, 'Correct points')}</th>
                  <td>{moduleDetails.config?.correct_points ?? '-'}</td>
                </tr>
                <tr>
                  <th>{t('code_conspiracy.admin.win_condition', {}, 'Win condition')}</th>
                  <td>{moduleDetails.config?.win_condition_mode || '-'}</td>
                </tr>
              </tbody>
            </table>
          </section>
        ) : null}

        {game?.game_type === 'crazy_88' ? (
          <section className="overview-panel">
            <h2>{t('moduleOverview.crazyReview', {}, 'Crazy 88 review')}</h2>
            <form onSubmit={handleJudgeSubmission} className="admin-inline-form">
              <input value={judgeTeamId} onChange={(event) => setJudgeTeamId(event.target.value)} placeholder={t('moduleOverview.teamId', {}, 'Team ID')} required />
              <input
                value={judgeSubmissionId}
                onChange={(event) => setJudgeSubmissionId(event.target.value)}
                placeholder={t('moduleOverview.submissionId', {}, 'Submission ID')}
                required
              />
              <label>
                <input type="checkbox" checked={judgeAccepted} onChange={(event) => setJudgeAccepted(event.target.checked)} /> {t('moduleOverview.accepted', {}, 'Accepted')}
              </label>
              <button className="btn btn-primary" type="submit">
                {t('moduleOverview.judge', {}, 'Judge')}
              </button>
            </form>
          </section>
        ) : null}
      </div>
    </main>
  )
}
