import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import {
  configureLeafletDefaultMarkerIcons,
  createTeamLogoIcon,
  toNumberOrNull,
} from './shared/leafletMapCommon'
import { toAssetUrl } from '../lib/assetUrl'

function formatPrice(value) {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? numeric : 0
}

export default function MarketCrashTeamPanel({
  state,
  currentTeamId,
  currentTeamLogoPath,
  t,
  executingTradeKey,
  onExecuteTrade,
  onLocationUpdate,
}) {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const pointLayerRef = useRef(null)
  const teamMarkerRef = useRef(null)
  const currentPositionRef = useRef(null)
  const onLocationUpdateRef = useRef(onLocationUpdate)
  const locationIntervalRef = useRef(0)
  const lastLocationSyncAtRef = useRef(0)
  const locationSyncInFlightRef = useRef(false)

  const [currentPosition, setCurrentPosition] = useState(null)
  const [quantitiesByKey, setQuantitiesByKey] = useState({})

  const points = Array.isArray(state?.points) ? state.points : []
  const nearbyPoints = Array.isArray(state?.nearby_points)
    ? state.nearby_points
    : points.filter((point) => Boolean(point?.in_range))

  const inventoryEntries = useMemo(() => {
    const inventory = state?.inventory && typeof state.inventory === 'object' ? state.inventory : {}
    return Object.entries(inventory)
      .map(([name, quantity]) => ({
        name: String(name || ''),
        quantity: Number(quantity || 0),
      }))
      .sort((left, right) => left.name.localeCompare(right.name))
  }, [state?.inventory])

  const leaderboard = useMemo(() => {
    const rows = Array.isArray(state?.leaderboard) ? state.leaderboard : []
    return [...rows]
      .map((row) => ({
        teamId: String(row?.team_id || ''),
        name: String(row?.name || '-'),
        logoPath: String(row?.logo_path || ''),
        score: Number(row?.score || 0),
        cash: Number(row?.cash || 0),
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
      zoom: 18,
      minZoom: 3,
      maxZoom: 19,
    })
    mapRef.current = map

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map)

    pointLayerRef.current = L.layerGroup().addTo(map)

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
      pointLayerRef.current = null
      teamMarkerRef.current = null
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
      if (!teamMarkerRef.current) {
        teamMarkerRef.current = L.marker(latLng, teamLogoIcon ? { icon: teamLogoIcon } : undefined).addTo(map)
      } else {
        teamMarkerRef.current.setLatLng(latLng)
        if (teamLogoIcon) {
          teamMarkerRef.current.setIcon(teamLogoIcon)
        }
      }
      if (gpsLat !== null && gpsLon !== null) {
        map.setView(latLng, Math.max(Number(map.getZoom() || 13), 13))
      }
    }
  }, [currentPosition, currentTeamLogoPath, state?.team_location])

  useEffect(() => {
    if (!pointLayerRef.current) {
      return
    }

    pointLayerRef.current.clearLayers()

    for (const point of points) {
      const lat = toNumberOrNull(point?.latitude)
      const lon = toNumberOrNull(point?.longitude)
      if (lat === null || lon === null) {
        continue
      }

      const color = String(point?.marker_color || '#2563eb')
      const radius = Number(point?.radius_meters || 25)
      const isNearby = Boolean(point?.in_range)

      L.circle([lat, lon], {
        radius,
        color,
        fillColor: color,
        fillOpacity: isNearby ? 0.28 : 0.14,
        weight: isNearby ? 2 : 1,
      }).addTo(pointLayerRef.current)

      L.circleMarker([lat, lon], {
        radius: isNearby ? 7 : 6,
        color,
        fillColor: color,
        fillOpacity: 1,
      })
        .bindPopup(`${String(point?.title || '-')}`)
        .addTo(pointLayerRef.current)
    }
  }, [points])

  function quantityFor(key) {
    const value = Number(quantitiesByKey[key])
    return Number.isFinite(value) && value >= 1 ? Math.floor(value) : 1
  }

  return (
    <section className="team-dashboard-blindhike-layout">
      <div className="team-dashboard-birds-top-row">
        <div className="team-panel team-dashboard-blindhike-map-panel">
          <h2>{t('market_crash.team.map_title', {}, 'Market map')}</h2>
          <p className="muted">{t('market_crash.team.map_hint', {}, 'All trade points are visible. In-range points are highlighted.')}</p>
          <div ref={mapContainerRef} className="game-map team-dashboard-blindhike-map" aria-label={t('market_crash.team.map_title', {}, 'Market map')} />
        </div>

        <div className="team-panel team-dashboard-birds-enemy-panel">
          <h2>{t('market_crash.team.nearby_points', {}, 'Nearby points')}</h2>
          {nearbyPoints.length === 0 ? <p className="muted">{t('market_crash.team.no_nearby_points', {}, 'No points in range')}</p> : null}
          <div className="market-crash-team-nearby-list">
            {nearbyPoints.map((point) => {
              const pointId = String(point?.id || '')
              const resourceSettings = Array.isArray(point?.resource_settings) ? point.resource_settings : []

              return (
                <article key={pointId} className="geo-card">
                  <strong>{String(point?.title || '-')}</strong>
                  {resourceSettings.length === 0 ? <p className="muted">{t('market_crash.team.no_resources_here', {}, 'No resources configured')}</p> : null}
                  {resourceSettings.map((setting) => {
                    const resourceId = String(setting?.resource_id || '')
                    const buyPrice = formatPrice(setting?.buy_price)
                    const sellPrice = formatPrice(setting?.sell_price)
                    const key = `${pointId}:${resourceId}`
                    const quantity = quantityFor(key)
                    const buyActionKey = `buy:${key}`
                    const sellActionKey = `sell:${key}`

                    return (
                      <div className="market-crash-trade-row" key={key}>
                        <div className="market-crash-trade-resource">
                          <strong>{String(setting?.resource_name || resourceId)}</strong>
                          <small className="muted">{`B: ${buyPrice} · S: ${sellPrice}`}</small>
                        </div>
                        <input
                          className="market-crash-trade-qty"
                          type="number"
                          min="1"
                          value={String(quantity)}
                          onChange={(event) => {
                            const next = Number(event.target.value || 1)
                            setQuantitiesByKey((previous) => ({
                              ...previous,
                              [key]: String(Number.isFinite(next) && next > 0 ? Math.floor(next) : 1),
                            }))
                          }}
                        />
                        <button
                          className="btn btn-add btn-small"
                          type="button"
                          disabled={buyPrice <= 0 || executingTradeKey === buyActionKey}
                          onClick={() => onExecuteTrade({ pointId, resourceId, side: 'buy', quantity })}
                        >
                          {executingTradeKey === buyActionKey
                            ? t('market_crash.team.trading', {}, 'Trading…')
                            : t('market_crash.team.buy', {}, 'Buy')}
                        </button>
                        <button
                          className="btn btn-remove btn-small"
                          type="button"
                          disabled={sellPrice <= 0 || executingTradeKey === sellActionKey}
                          onClick={() => onExecuteTrade({ pointId, resourceId, side: 'sell', quantity })}
                        >
                          {executingTradeKey === sellActionKey
                            ? t('market_crash.team.trading', {}, 'Trading…')
                            : t('market_crash.team.sell', {}, 'Sell')}
                        </button>
                      </div>
                    )
                  })}
                </article>
              )
            })}
          </div>
        </div>
      </div>

      <div className="team-panel">
        <h2>{t('market_crash.team.wallet', {}, 'Wallet & Inventory')}</h2>
        <p>
          <strong>{t('market_crash.team.cash', {}, 'Cash')}:</strong>{' '}
          {Number(state?.cash || 0)}
        </p>
        <ul className="team-hand-list">
          {inventoryEntries.map((entry) => (
            <li key={`inventory-${entry.name}`} className="team-hand-row">
              <span className="team-hand-label">{entry.name}</span>
              <span className="chip-meta">{entry.quantity}</span>
            </li>
          ))}
          {inventoryEntries.length === 0 ? <li className="muted">{t('market_crash.team.empty_inventory', {}, 'No inventory yet')}</li> : null}
        </ul>
      </div>

      <div className="team-panel">
        <h2>{t('teamDashboard.highscore', {}, 'Highscore')}</h2>
        {leaderboard.length === 0 ? <p>{t('teamDashboard.noTeams', {}, 'No teams')}</p> : null}
        {leaderboard.length > 0 ? (
          <ol className="team-leaderboard-list">
            {leaderboard.map((team) => (
              <li key={team.teamId} className={`team-leaderboard-item ${team.teamId === String(currentTeamId || '') ? 'is-current-team' : ''}`}>
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
