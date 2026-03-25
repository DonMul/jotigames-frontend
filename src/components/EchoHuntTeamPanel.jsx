import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { configureLeafletDefaultMarkerIcons } from './shared/leafletMapCommon'
import { toAssetUrl } from '../lib/assetUrl'

export default function EchoHuntTeamPanel({
  state,
  currentTeamId,
  t,
  onClaimBeacon,
  claiming = false,
}) {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const markersLayerRef = useRef(null)
  const rangeCirclesLayerRef = useRef(null)
  const userMarkerRef = useRef(null)

  const [currentPosition, setCurrentPosition] = useState(null)

  const beacons = useMemo(() => {
    const items = Array.isArray(state?.beacons) ? state.beacons : []
    return items.map((b) => ({
      id: String(b.id || ''),
      title: String(b.title || ''),
      latitude: Number(b.latitude || 0),
      longitude: Number(b.longitude || 0),
      radius_meters: Number(b.radius_meters || 25),
      points: Number(b.points || 0),
      marker_color: String(b.marker_color || '#6366f1'),
      is_active: Boolean(b.is_active),
    }))
  }, [state?.beacons])

  const claimedIds = useMemo(() => {
    const actions = Array.isArray(state?.last_actions) ? state.last_actions : []
    const ids = new Set()
    for (const a of actions) {
      if (String(a?.action || '') === 'echo_hunt.beacon.claim' && String(a?.team_id || '') === String(currentTeamId || '')) {
        ids.add(String(a?.object_id || ''))
      }
    }
    return ids
  }, [state?.last_actions, currentTeamId])

  const nearbyBeacons = useMemo(() => {
    if (!currentPosition) return []
    return beacons.filter((b) => {
      if (!b.is_active || claimedIds.has(b.id)) return false
      const dist = haversineDistance(currentPosition.latitude, currentPosition.longitude, b.latitude, b.longitude)
      return dist <= b.radius_meters
    })
  }, [currentPosition, beacons, claimedIds])

  const score = Number(state?.score || state?.score_delta || 0)

  const highscore = useMemo(() => {
    const teams = Array.isArray(state?.highscore) ? state.highscore : []
    return teams
      .map((row) => ({
        teamId: String(row?.team_id || ''),
        name: String(row?.name || '-'),
        logoPath: String(row?.logo_path || ''),
        score: Number(row?.score || 0),
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
    const map = L.map(mapContainerRef.current, { center: [52.1326, 5.2913], zoom: 14, minZoom: 8, maxZoom: 19 })
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors' }).addTo(map)
    markersLayerRef.current = L.layerGroup().addTo(map)
    rangeCirclesLayerRef.current = L.layerGroup().addTo(map)
    mapRef.current = map
    return () => { if (mapRef.current) { mapRef.current.remove(); mapRef.current = null } }
  }, [])

  useEffect(() => {
    if (!mapRef.current || !markersLayerRef.current || !rangeCirclesLayerRef.current) return
    markersLayerRef.current.clearLayers()
    rangeCirclesLayerRef.current.clearLayers()
    const bounds = []
    for (const b of beacons) {
      if (!b.is_active) continue
      const latLng = [b.latitude, b.longitude]
      bounds.push(latLng)
      const isClaimed = claimedIds.has(b.id)
      L.circle(latLng, { radius: b.radius_meters, color: isClaimed ? '#16a34a' : b.marker_color, fillColor: isClaimed ? '#16a34a' : b.marker_color, fillOpacity: 0.15, weight: 2 }).addTo(rangeCirclesLayerRef.current)
      L.circleMarker(latLng, { radius: 8, color: isClaimed ? '#16a34a' : b.marker_color, fillColor: isClaimed ? '#16a34a' : b.marker_color, fillOpacity: 0.9, weight: 2 })
        .bindPopup(`<strong>${b.title}</strong><br/>${b.points} pts${isClaimed ? ' ✅' : ''}`)
        .addTo(markersLayerRef.current)
    }
    if (bounds.length > 0 && !currentPosition) mapRef.current.fitBounds(bounds, { padding: [40, 40] })
  }, [beacons, claimedIds, currentPosition])

  useEffect(() => {
    if (!mapRef.current || !currentPosition) return
    const latLng = [currentPosition.latitude, currentPosition.longitude]
    if (!userMarkerRef.current) {
      userMarkerRef.current = L.circleMarker(latLng, { radius: 8, color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.9, weight: 2 }).addTo(mapRef.current)
      mapRef.current.setView(latLng, Math.max(mapRef.current.getZoom(), 15))
    } else {
      userMarkerRef.current.setLatLng(latLng)
    }
  }, [currentPosition])

  useEffect(() => {
    const tid = window.setTimeout(() => mapRef.current?.invalidateSize(false), 180)
    const h = () => mapRef.current?.invalidateSize(false)
    window.addEventListener('resize', h)
    return () => { window.clearTimeout(tid); window.removeEventListener('resize', h) }
  }, [])

  return (
    <section className="team-dashboard-geo-layout">
      <div className="team-panel">
        <h2>{t('echo_hunt.team.title', {}, 'Echo Hunt')}</h2>
        <p><strong>{t('echo_hunt.team.score', {}, 'Score')}:</strong> {score}</p>
        <p className="muted">
          {currentPosition
            ? t('echo_hunt.team.gps_active', {}, 'GPS active')
            : t('echo_hunt.team.location_required', {}, 'Waiting for location…')}
        </p>
        <div ref={mapContainerRef} className="game-map" style={{ height: '350px', marginTop: '0.5rem' }} />
      </div>

      <div className="team-panel">
        <h2>{t('echo_hunt.team.objective', {}, 'Beacons')}</h2>
        {nearbyBeacons.length > 0 ? (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {nearbyBeacons.map((b) => (
              <li key={b.id} style={{ marginBottom: '0.75rem' }}>
                <strong>{b.title}</strong> — {b.points} pts
                <br />
                <button className="btn btn-primary btn-small" type="button" disabled={claiming} onClick={() => onClaimBeacon(b.id, b.points)}>
                  {claiming ? t('echo_hunt.team.claiming', {}, 'Claiming…') : t('echo_hunt.team.claim_beacon', {}, 'Claim beacon')}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">
            {currentPosition
              ? t('echo_hunt.team.move_into_range', {}, 'Move closer to a beacon to claim it.')
              : t('echo_hunt.team.location_required', {}, 'Waiting for location…')}
          </p>
        )}

        <h3 style={{ marginTop: '1.5rem' }}>{t('echo_hunt.team.all_beacons', {}, 'All beacons')}</h3>
        {beacons.length === 0 ? <p className="muted">-</p> : (
          <table className="admin-table">
            <thead><tr><th>{t('echo_hunt.admin.table_title', {}, 'Title')}</th><th>{t('echo_hunt.admin.table_points', {}, 'Points')}</th><th>{t('echo_hunt.admin.table_status', {}, 'Status')}</th></tr></thead>
            <tbody>
              {beacons.filter((b) => b.is_active).map((b) => (
                <tr key={b.id}><td>{b.title}</td><td>{b.points}</td><td>{claimedIds.has(b.id) ? '✅' : '—'}</td></tr>
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
                <span className="team-leaderboard-logo" aria-hidden="true">{team.logoPath ? <img src={toAssetUrl(team.logoPath)} alt="" /> : null}</span>
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
