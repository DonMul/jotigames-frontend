import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { buildEggIcon } from './shared/birdsMapIcons'
import {
  configureLeafletDefaultMarkerIcons,
  createTeamLogoIcon,
  toNumberOrNull,
} from './shared/leafletMapCommon'
import { toAssetUrl } from '../lib/assetUrl'

export default function BirdsOfPreyTeamPanel({
  state,
  currentTeamId,
  currentTeamLogoPath,
  t,
  droppingEgg,
  destroyingEggId,
  onDropEgg,
  onDestroyEgg,
  onLocationUpdate,
}) {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const ownEggLayerRef = useRef(null)
  const enemyEggLayerRef = useRef(null)
  const locationMarkerRef = useRef(null)
  const locationIntervalRef = useRef(0)
  const currentPositionRef = useRef(null)
  const onLocationUpdateRef = useRef(onLocationUpdate)
  const lastLocationSyncAtRef = useRef(0)
  const locationSyncInFlightRef = useRef(false)

  const [currentPosition, setCurrentPosition] = useState(null)

  const ownEggs = Array.isArray(state?.own_eggs) ? state.own_eggs : []
  const visibleEnemyEggs = Array.isArray(state?.visible_enemy_eggs) ? state.visible_enemy_eggs : []

  useEffect(() => {
    onLocationUpdateRef.current = onLocationUpdate
  }, [onLocationUpdate])

  function trySyncLocation(position) {
    const nextPosition = position && typeof position === 'object' ? position : null
    if (!nextPosition) {
      return
    }

    const nowMs = Date.now()
    if ((nowMs - Number(lastLocationSyncAtRef.current || 0)) < 10000) {
      return
    }
    if (locationSyncInFlightRef.current) {
      return
    }

    locationSyncInFlightRef.current = true
    lastLocationSyncAtRef.current = nowMs

    Promise
      .resolve(onLocationUpdateRef.current(nextPosition))
      .catch(() => {
      })
      .finally(() => {
        locationSyncInFlightRef.current = false
      })
  }

  const leaderboard = useMemo(() => {
    const rows = Array.isArray(state?.leaderboard) ? state.leaderboard : []
    return [...rows]
      .map((row) => ({
        teamId: String(row?.team_id || ''),
        name: String(row?.name || '-'),
        logoPath: String(row?.logo_path || ''),
        score: Number(row?.score || 0),
        eggCount: Number(row?.egg_count || 0),
      }))
      .sort((left, right) => {
        if (right.score !== left.score) {
          return right.score - left.score
        }
        return left.name.localeCompare(right.name)
      })
      .map((row, index) => ({ ...row, rank: index + 1 }))
  }, [state?.leaderboard])

  useEffect(() => {
    if (!navigator.geolocation) {
      return undefined
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const nextPosition = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }
        setCurrentPosition(nextPosition)
        currentPositionRef.current = nextPosition
        trySyncLocation(nextPosition)
      },
      () => {
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000,
      },
    )

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        const nextPosition = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }
        setCurrentPosition(nextPosition)
        currentPositionRef.current = nextPosition
        trySyncLocation(nextPosition)
      },
      () => {
        setCurrentPosition(null)
        currentPositionRef.current = null
      },
      {
        enableHighAccuracy: true,
        maximumAge: 5000,
        timeout: 10000,
      },
    )

    return () => {
      navigator.geolocation.clearWatch(watchId)
    }
  }, [])

  useEffect(() => {
    if (locationIntervalRef.current) {
      window.clearInterval(locationIntervalRef.current)
    }

    locationIntervalRef.current = window.setInterval(() => {
      const latestPosition = currentPositionRef.current
      if (!latestPosition) {
        return
      }
      trySyncLocation(latestPosition)
    }, 10000)

    return () => {
      if (locationIntervalRef.current) {
        window.clearInterval(locationIntervalRef.current)
        locationIntervalRef.current = 0
      }
    }
  }, [])

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return
    }

    configureLeafletDefaultMarkerIcons()

    const map = L.map(mapContainerRef.current, {
      center: [52.1326, 5.2913],
      zoom: 13,
      minZoom: 3,
      maxZoom: 19,
    })
    mapRef.current = map

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map)

    ownEggLayerRef.current = L.layerGroup().addTo(map)
    enemyEggLayerRef.current = L.layerGroup().addTo(map)

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
      ownEggLayerRef.current = null
      enemyEggLayerRef.current = null
      locationMarkerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!mapRef.current) {
      return
    }

    const map = mapRef.current
    const stateLocation = state?.team_location && typeof state.team_location === 'object' ? state.team_location : null
    const gpsLat = toNumberOrNull(currentPosition?.latitude)
    const gpsLon = toNumberOrNull(currentPosition?.longitude)
    const fallbackLat = toNumberOrNull(stateLocation?.lat)
    const fallbackLon = toNumberOrNull(stateLocation?.lon)
    const lat = gpsLat ?? fallbackLat
    const lon = gpsLon ?? fallbackLon

    if (lat !== null && lon !== null) {
      const latLng = [lat, lon]
      const teamLogoIcon = createTeamLogoIcon(currentTeamLogoPath)
      if (!locationMarkerRef.current) {
        locationMarkerRef.current = L.marker(latLng, teamLogoIcon ? { icon: teamLogoIcon } : undefined).addTo(map)
      } else {
        locationMarkerRef.current.setLatLng(latLng)
        if (teamLogoIcon) {
          locationMarkerRef.current.setIcon(teamLogoIcon)
        }
      }
      if (gpsLat !== null && gpsLon !== null) {
        map.setView(latLng, Math.max(Number(map.getZoom() || 13), 13))
      }
    }
  }, [currentPosition, currentTeamLogoPath, state?.team_location])

  useEffect(() => {
    if (!ownEggLayerRef.current) {
      return
    }
    ownEggLayerRef.current.clearLayers()

    ownEggs.forEach((egg) => {
      const lat = toNumberOrNull(egg?.lat)
      const lon = toNumberOrNull(egg?.lon)
      if (lat === null || lon === null) {
        return
      }

      const eggKey = String(egg?.id || `${lat}:${lon}:own`)
      L.marker([lat, lon], { icon: buildEggIcon('#16a34a', eggKey), zIndexOffset: 2000 }).addTo(ownEggLayerRef.current)
    })
  }, [ownEggs])

  useEffect(() => {
    if (!enemyEggLayerRef.current) {
      return
    }
    enemyEggLayerRef.current.clearLayers()

    visibleEnemyEggs.forEach((egg) => {
      const lat = toNumberOrNull(egg?.lat)
      const lon = toNumberOrNull(egg?.lon)
      if (lat === null || lon === null) {
        return
      }

      const canDestroy = Boolean(egg?.can_destroy)
      const eggKey = String(egg?.id || `${lat}:${lon}:${String(egg?.owner_team_id || 'enemy')}`)
      L.marker([lat, lon], { icon: buildEggIcon(canDestroy ? '#dc2626' : '#f59e0b', eggKey), zIndexOffset: 2000 }).addTo(enemyEggLayerRef.current)
    })
  }, [visibleEnemyEggs])

  useEffect(() => {
    if (!mapRef.current) {
      return
    }
    const map = mapRef.current

    let secondFrameId = 0
    const timeoutId = window.setTimeout(() => {
      map.invalidateSize(false)
    }, 160)

    const firstFrameId = window.requestAnimationFrame(() => {
      secondFrameId = window.requestAnimationFrame(() => {
        map.invalidateSize(false)
      })
    })

    return () => {
      window.cancelAnimationFrame(firstFrameId)
      window.cancelAnimationFrame(secondFrameId)
      window.clearTimeout(timeoutId)
    }
  }, [ownEggs, visibleEnemyEggs])

  return (
    <section className="team-dashboard-blindhike-layout">
      <div className="team-dashboard-birds-top-row">
        <div className="team-panel team-dashboard-blindhike-map-panel">
          <h2>{t('teamDashboard.birdsOfPrey.mapTitle', {}, 'Map')}</h2>
          <p className="muted">{t('teamDashboard.birdsOfPrey.mapHint', {}, 'Your location, your eggs, and visible enemy eggs are shown on the map.')}</p>
          <button className="btn btn-primary" type="button" onClick={onDropEgg} disabled={droppingEgg}>
            {droppingEgg
              ? t('teamDashboard.birdsOfPrey.dropping', {}, 'Dropping egg…')
              : t('teamDashboard.birdsOfPrey.dropEgg', {}, 'Drop egg')}
          </button>
          <div ref={mapContainerRef} className="game-map team-dashboard-blindhike-map" aria-label={t('teamDashboard.birdsOfPrey.mapTitle', {}, 'Map')} />
        </div>

        <div className="team-panel team-dashboard-birds-enemy-panel">
          <h2>{t('teamDashboard.birdsOfPrey.visibleEnemyEggs', {}, 'Visible enemy eggs')}</h2>
          <ul className="team-hand-list">
            {visibleEnemyEggs.map((egg) => {
              const eggId = String(egg?.id || '')
              const canDestroy = Boolean(egg?.can_destroy)
              return (
                <li key={`enemy-egg-${eggId}`} className="team-hand-row">
                  <span className="team-hand-label">{String(egg?.owner_team_name || t('teamDashboard.unknownTeam', {}, 'Unknown team'))}</span>
                  {canDestroy ? (
                    <button
                      className="btn btn-remove btn-small"
                      type="button"
                      onClick={() => onDestroyEgg(eggId)}
                      disabled={destroyingEggId === eggId}
                    >
                      {destroyingEggId === eggId
                        ? t('teamDashboard.birdsOfPrey.destroying', {}, 'Destroying…')
                        : t('teamDashboard.birdsOfPrey.destroyEgg', {}, 'Destroy')}
                    </button>
                  ) : (
                    <span className="chip-meta">{t('teamDashboard.birdsOfPrey.protected', {}, 'Protected')}</span>
                  )}
                </li>
              )
            })}
            {visibleEnemyEggs.length === 0 ? <li className="muted">{t('teamDashboard.birdsOfPrey.noVisibleEnemyEggs', {}, 'No enemy eggs in range')}</li> : null}
          </ul>
        </div>
      </div>

      <div className="team-panel">
        <h2>{t('teamDashboard.highscore', {}, 'Highscore')}</h2>
        {leaderboard.length === 0 ? <p>{t('teamDashboard.noTeams', {}, 'No teams')}</p> : null}
        {leaderboard.length > 0 ? (
          <ol className="team-leaderboard-list">
            {leaderboard.map((team) => (
              <li
                key={team.teamId}
                className={`team-leaderboard-item ${team.teamId === String(currentTeamId || '') ? 'is-current-team' : ''}`}
              >
                <span className="team-leaderboard-rank">#{team.rank}</span>
                <span className="team-leaderboard-logo" aria-hidden="true">
                  {team.logoPath ? <img src={toAssetUrl(team.logoPath)} alt="" /> : null}
                </span>
                <span className="team-leaderboard-name">{team.name}</span>
                <span className="team-leaderboard-value">{team.score}</span>
              </li>
            ))}
          </ol>
        ) : null}
      </div>
    </section>
  )
}
