import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  configureLeafletDefaultMarkerIcons,
  toNumberOrNull,
} from './shared/leafletMapCommon'
import { toAssetUrl } from '../lib/assetUrl'

export default function CheckpointHeistTeamPanel({
  state,
  currentTeamId,
  t,
  onCaptureCheckpoint,
  capturing = false,
}) {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const markersLayerRef = useRef(null)
  const rangeCirclesLayerRef = useRef(null)
  const userMarkerRef = useRef(null)

  const [currentPosition, setCurrentPosition] = useState(null)

  const checkpoints = useMemo(() => {
    const items = Array.isArray(state?.checkpoints) ? state.checkpoints : []
    return items.map((cp) => ({
      id: String(cp.id || ''),
      title: String(cp.title || ''),
      latitude: Number(cp.latitude || 0),
      longitude: Number(cp.longitude || 0),
      radius_meters: Number(cp.radius_meters || 25),
      points: Number(cp.points || 0),
      marker_color: String(cp.marker_color || '#dc2626'),
      is_active: Boolean(cp.is_active),
    }))
  }, [state?.checkpoints])

  const capturedIds = useMemo(() => {
    const actions = Array.isArray(state?.last_actions) ? state.last_actions : []
    const ids = new Set()
    for (const action of actions) {
      if (String(action?.action || '') === 'checkpoint_heist.capture.confirm' && String(action?.team_id || '') === String(currentTeamId || '')) {
        ids.add(String(action?.object_id || ''))
      }
    }
    return ids
  }, [state?.last_actions, currentTeamId])

  const nearbyCheckpoints = useMemo(() => {
    if (!currentPosition) return []
    return checkpoints.filter((cp) => {
      if (!cp.is_active || capturedIds.has(cp.id)) return false
      const dist = haversineDistance(
        currentPosition.latitude,
        currentPosition.longitude,
        cp.latitude,
        cp.longitude,
      )
      return dist <= cp.radius_meters
    })
  }, [currentPosition, checkpoints, capturedIds])

  const score = Number(state?.score || state?.score_delta || 0)

  const highscore = useMemo(() => {
    const teams = Array.isArray(state?.highscore) ? state.highscore : []
    return teams
      .map((row) => ({
        teamId: String(row?.team_id || ''),
        name: String(row?.name || '-'),
        logoPath: String(row?.logo_path || ''),
        score: Number(row?.score || row?.geo_score || 0),
      }))
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
      .map((row, i) => ({ ...row, rank: i + 1 }))
  }, [state?.highscore])

  useEffect(() => {
    if (!navigator.geolocation) return
    const watchId = navigator.geolocation.watchPosition(
      (pos) => setCurrentPosition({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
      () => setCurrentPosition(null),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 },
    )
    return () => navigator.geolocation.clearWatch(watchId)
  }, [])

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return
    configureLeafletDefaultMarkerIcons()

    const map = L.map(mapContainerRef.current, {
      center: [52.1326, 5.2913],
      zoom: 18,
      minZoom: 8,
      maxZoom: 19,
    })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
    }).addTo(map)

    markersLayerRef.current = L.layerGroup().addTo(map)
    rangeCirclesLayerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
    }
  }, [])

  useEffect(() => {
    if (!mapRef.current || !markersLayerRef.current || !rangeCirclesLayerRef.current) return
    markersLayerRef.current.clearLayers()
    rangeCirclesLayerRef.current.clearLayers()

    const bounds = []
    for (const cp of checkpoints) {
      if (!cp.is_active) continue
      const latLng = [cp.latitude, cp.longitude]
      bounds.push(latLng)
      const isCaptured = capturedIds.has(cp.id)

      L.circle(latLng, {
        radius: cp.radius_meters,
        color: isCaptured ? '#16a34a' : cp.marker_color,
        fillColor: isCaptured ? '#16a34a' : cp.marker_color,
        fillOpacity: 0.15,
        weight: 2,
      }).addTo(rangeCirclesLayerRef.current)

      L.circleMarker(latLng, {
        radius: 8,
        color: isCaptured ? '#16a34a' : cp.marker_color,
        fillColor: isCaptured ? '#16a34a' : cp.marker_color,
        fillOpacity: 0.9,
        weight: 2,
      })
        .bindPopup(`<strong>${cp.title}</strong><br/>${cp.points} pts${isCaptured ? ' ✅' : ''}`)
        .addTo(markersLayerRef.current)
    }

    if (bounds.length > 0 && !currentPosition) {
      mapRef.current.fitBounds(bounds, { padding: [40, 40] })
    }
  }, [checkpoints, capturedIds, currentPosition])

  useEffect(() => {
    if (!mapRef.current || !currentPosition) return
    const latLng = [currentPosition.latitude, currentPosition.longitude]
    if (!userMarkerRef.current) {
      userMarkerRef.current = L.circleMarker(latLng, {
        radius: 8,
        color: '#3b82f6',
        fillColor: '#3b82f6',
        fillOpacity: 0.9,
        weight: 2,
      }).addTo(mapRef.current)
      mapRef.current.setView(latLng, Math.max(mapRef.current.getZoom(), 15))
    } else {
      userMarkerRef.current.setLatLng(latLng)
    }
  }, [currentPosition])

  useEffect(() => {
    const timeoutId = window.setTimeout(() => mapRef.current?.invalidateSize(false), 180)
    const handleResize = () => mapRef.current?.invalidateSize(false)
    window.addEventListener('resize', handleResize)
    return () => {
      window.clearTimeout(timeoutId)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return (
    <section className="team-dashboard-geo-layout">
      <div className="team-panel">
        <h2>{t('checkpoint_heist.team.title', {}, 'Checkpoint Heist')}</h2>
        <p><strong>{t('checkpoint_heist.team.score', {}, 'Score')}:</strong> {score}</p>
        <p className="muted">
          {currentPosition
            ? t('checkpoint_heist.team.gps_active', {}, 'GPS active')
            : t('checkpoint_heist.team.location_required', {}, 'Waiting for location…')}
        </p>
        <div ref={mapContainerRef} className="game-map" style={{ height: '350px', marginTop: '0.5rem' }} />
      </div>

      <div className="team-panel">
        <h2>{t('checkpoint_heist.team.objective', {}, 'Checkpoints')}</h2>
        {nearbyCheckpoints.length > 0 ? (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {nearbyCheckpoints.map((cp) => (
              <li key={cp.id} style={{ marginBottom: '0.75rem' }}>
                <strong>{cp.title}</strong> — {cp.points} pts
                <br />
                <button
                  className="btn btn-primary btn-small"
                  type="button"
                  disabled={capturing}
                  onClick={() => onCaptureCheckpoint(cp.id)}
                >
                  {capturing
                    ? t('checkpoint_heist.team.capturing', {}, 'Capturing…')
                    : t('checkpoint_heist.team.capture_checkpoint', {}, 'Capture')}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">
            {currentPosition
              ? t('checkpoint_heist.team.move_into_range', {}, 'Move closer to a checkpoint to capture it.')
              : t('checkpoint_heist.team.location_required', {}, 'Waiting for location…')}
          </p>
        )}

        <h3 style={{ marginTop: '1.5rem' }}>{t('checkpoint_heist.team.all_checkpoints', {}, 'All checkpoints')}</h3>
        {checkpoints.length === 0 ? <p className="muted">-</p> : (
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('checkpoint_heist.admin.table_title', {}, 'Title')}</th>
                <th>{t('checkpoint_heist.admin.table_points', {}, 'Points')}</th>
                <th>{t('checkpoint_heist.admin.table_status', {}, 'Status')}</th>
              </tr>
            </thead>
            <tbody>
              {checkpoints.filter((cp) => cp.is_active).map((cp) => (
                <tr key={cp.id}>
                  <td>{cp.title}</td>
                  <td>{cp.points}</td>
                  <td>{capturedIds.has(cp.id) ? '✅' : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {highscore.length > 0 ? (
        <div className="team-panel">
          <h2>{t('teamDashboard.highscore', {}, 'Highscore')}</h2>
          <ol className="team-leaderboard-list">
            {highscore.map((team) => (
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
        </div>
      ) : null}
    </section>
  )
}

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000
  const toRad = (deg) => (deg * Math.PI) / 180
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))
}
