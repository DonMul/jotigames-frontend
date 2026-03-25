import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { configureLeafletDefaultMarkerIcons } from './shared/leafletMapCommon'
import { toAssetUrl } from '../lib/assetUrl'

export default function CourierRushTeamPanel({
  state,
  currentTeamId,
  t,
  onConfirmPickup,
  onConfirmDropoff,
  confirmingPickup = false,
  confirmingDropoff = false,
}) {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const markersLayerRef = useRef(null)
  const rangeCirclesLayerRef = useRef(null)
  const userMarkerRef = useRef(null)
  const [currentPosition, setCurrentPosition] = useState(null)

  const pickups = useMemo(() => {
    const items = Array.isArray(state?.pickups) ? state.pickups : []
    return items.map((p) => ({
      id: String(p.id || ''), title: String(p.title || ''), latitude: Number(p.latitude || 0), longitude: Number(p.longitude || 0),
      radius_meters: Number(p.radius_meters || 25), points: Number(p.points || 0), marker_color: String(p.marker_color || '#3b82f6'), is_active: Boolean(p.is_active),
    }))
  }, [state?.pickups])

  const dropoffs = useMemo(() => {
    const items = Array.isArray(state?.dropoffs) ? state.dropoffs : []
    return items.map((d) => ({
      id: String(d.id || ''), title: String(d.title || ''), latitude: Number(d.latitude || 0), longitude: Number(d.longitude || 0),
      radius_meters: Number(d.radius_meters || 25), points: Number(d.points || 0), marker_color: String(d.marker_color || '#16a34a'), is_active: Boolean(d.is_active),
    }))
  }, [state?.dropoffs])

  const confirmedPickupIds = useMemo(() => {
    const actions = Array.isArray(state?.last_actions) ? state.last_actions : []
    const ids = new Set()
    for (const a of actions) {
      if (String(a?.action || '') === 'courier_rush.pickup.confirm' && String(a?.team_id || '') === String(currentTeamId || '')) ids.add(String(a?.object_id || ''))
    }
    return ids
  }, [state?.last_actions, currentTeamId])

  const nearbyPickups = useMemo(() => {
    if (!currentPosition) return []
    return pickups.filter((p) => {
      if (!p.is_active || confirmedPickupIds.has(p.id)) return false
      return haversineDistance(currentPosition.latitude, currentPosition.longitude, p.latitude, p.longitude) <= p.radius_meters
    })
  }, [currentPosition, pickups, confirmedPickupIds])

  const nearbyDropoffs = useMemo(() => {
    if (!currentPosition) return []
    return dropoffs.filter((d) => {
      if (!d.is_active) return false
      return haversineDistance(currentPosition.latitude, currentPosition.longitude, d.latitude, d.longitude) <= d.radius_meters
    })
  }, [currentPosition, dropoffs])

  const score = Number(state?.score || state?.score_delta || 0)

  const highscore = useMemo(() => {
    const teams = Array.isArray(state?.highscore) ? state.highscore : []
    return teams.map((row) => ({ teamId: String(row?.team_id || ''), name: String(row?.name || '-'), logoPath: String(row?.logo_path || ''), score: Number(row?.score || 0) }))
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

    for (const p of pickups) {
      if (!p.is_active) continue
      const latLng = [p.latitude, p.longitude]
      bounds.push(latLng)
      const done = confirmedPickupIds.has(p.id)
      L.circle(latLng, { radius: p.radius_meters, color: done ? '#16a34a' : p.marker_color, fillColor: done ? '#16a34a' : p.marker_color, fillOpacity: 0.15, weight: 2 }).addTo(rangeCirclesLayerRef.current)
      L.circleMarker(latLng, { radius: 8, color: done ? '#16a34a' : p.marker_color, fillColor: done ? '#16a34a' : p.marker_color, fillOpacity: 0.9, weight: 2 })
        .bindPopup(`<strong>📦 ${p.title}</strong>${done ? '<br/>✅ Picked up' : ''}`)
        .addTo(markersLayerRef.current)
    }

    for (const d of dropoffs) {
      if (!d.is_active) continue
      const latLng = [d.latitude, d.longitude]
      bounds.push(latLng)
      L.circle(latLng, { radius: d.radius_meters, color: d.marker_color, fillColor: d.marker_color, fillOpacity: 0.15, weight: 2 }).addTo(rangeCirclesLayerRef.current)
      L.circleMarker(latLng, { radius: 8, color: d.marker_color, fillColor: d.marker_color, fillOpacity: 0.9, weight: 2 })
        .bindPopup(`<strong>🏁 ${d.title}</strong><br/>${d.points} pts`)
        .addTo(markersLayerRef.current)
    }

    if (bounds.length > 0 && !currentPosition) mapRef.current.fitBounds(bounds, { padding: [40, 40] })
  }, [pickups, dropoffs, confirmedPickupIds, currentPosition])

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
        <h2>{t('courier_rush.team.title', {}, 'Courier Rush')}</h2>
        <p><strong>{t('courier_rush.team.score', {}, 'Score')}:</strong> {score}</p>
        <p className="muted">{currentPosition ? t('courier_rush.team.gps_active', {}, 'GPS active') : t('courier_rush.team.location_required', {}, 'Waiting for location…')}</p>
        <div ref={mapContainerRef} className="game-map" style={{ height: '350px', marginTop: '0.5rem' }} />
      </div>

      <div className="team-panel">
        <h2>{t('courier_rush.team.pickups_heading', {}, 'Pickups')}</h2>
        {nearbyPickups.length > 0 ? (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {nearbyPickups.map((p) => (
              <li key={p.id} style={{ marginBottom: '0.75rem' }}>
                <strong>📦 {p.title}</strong>
                <br />
                <button className="btn btn-primary btn-small" type="button" disabled={confirmingPickup} onClick={() => onConfirmPickup(p.id)}>
                  {confirmingPickup ? t('courier_rush.team.confirming', {}, 'Picking up…') : t('courier_rush.team.confirm_pickup', {}, 'Pick up')}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">{currentPosition ? t('courier_rush.team.move_to_pickup', {}, 'Move closer to a pickup point.') : t('courier_rush.team.location_required', {}, 'Waiting for location…')}</p>
        )}

        <h2 style={{ marginTop: '1.5rem' }}>{t('courier_rush.team.dropoffs_heading', {}, 'Drop-offs')}</h2>
        {nearbyDropoffs.length > 0 ? (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {nearbyDropoffs.map((d) => (
              <li key={d.id} style={{ marginBottom: '0.75rem' }}>
                <strong>🏁 {d.title}</strong> — {d.points} pts
                <br />
                <button className="btn btn-primary btn-small" type="button" disabled={confirmingDropoff} onClick={() => onConfirmDropoff(d.id)}>
                  {confirmingDropoff ? t('courier_rush.team.dropping', {}, 'Dropping off…') : t('courier_rush.team.confirm_dropoff', {}, 'Drop off')}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">{currentPosition ? t('courier_rush.team.move_to_dropoff', {}, 'Move closer to a drop-off point.') : t('courier_rush.team.location_required', {}, 'Waiting for location…')}</p>
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
