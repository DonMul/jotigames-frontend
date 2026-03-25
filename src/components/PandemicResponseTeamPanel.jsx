import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { configureLeafletDefaultMarkerIcons } from './shared/leafletMapCommon'
import { toAssetUrl } from '../lib/assetUrl'

export default function PandemicResponseTeamPanel({
  state,
  currentTeamId,
  t,
  onCollectPickup,
  onResolveHotspot,
  collectingPickup = false,
  resolvingHotspot = false,
}) {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const markersLayerRef = useRef(null)
  const rangeCirclesLayerRef = useRef(null)
  const userMarkerRef = useRef(null)
  const [currentPosition, setCurrentPosition] = useState(null)

  const hotspots = useMemo(() => {
    const items = Array.isArray(state?.hotspots) ? state.hotspots : []
    return items.map((h) => ({
      id: String(h.id || ''), title: String(h.title || ''), latitude: Number(h.latitude || 0), longitude: Number(h.longitude || 0),
      radius_meters: Number(h.radius_meters || 25), points: Number(h.points || 0), severity: String(h.severity || 'medium'),
      marker_color: String(h.marker_color || '#dc2626'), is_active: Boolean(h.is_active),
    }))
  }, [state?.hotspots])

  const pickups = useMemo(() => {
    const items = Array.isArray(state?.pickups) ? state.pickups : []
    return items.map((p) => ({
      id: String(p.id || ''), title: String(p.title || ''), latitude: Number(p.latitude || 0), longitude: Number(p.longitude || 0),
      radius_meters: Number(p.radius_meters || 25), marker_color: String(p.marker_color || '#3b82f6'), is_active: Boolean(p.is_active),
    }))
  }, [state?.pickups])

  const collectedPickupIds = useMemo(() => {
    const actions = Array.isArray(state?.last_actions) ? state.last_actions : []
    const ids = new Set()
    for (const a of actions) {
      if (String(a?.action || '') === 'pandemic_response.pickup.collect' && String(a?.team_id || '') === String(currentTeamId || '')) ids.add(String(a?.object_id || ''))
    }
    return ids
  }, [state?.last_actions, currentTeamId])

  const resolvedHotspotIds = useMemo(() => {
    const actions = Array.isArray(state?.last_actions) ? state.last_actions : []
    const ids = new Set()
    for (const a of actions) {
      if (String(a?.action || '') === 'pandemic_response.hotspot.resolve' && String(a?.team_id || '') === String(currentTeamId || '')) ids.add(String(a?.object_id || ''))
    }
    return ids
  }, [state?.last_actions, currentTeamId])

  const nearbyPickups = useMemo(() => {
    if (!currentPosition) return []
    return pickups.filter((p) => {
      if (!p.is_active || collectedPickupIds.has(p.id)) return false
      return haversineDistance(currentPosition.latitude, currentPosition.longitude, p.latitude, p.longitude) <= p.radius_meters
    })
  }, [currentPosition, pickups, collectedPickupIds])

  const nearbyHotspots = useMemo(() => {
    if (!currentPosition) return []
    return hotspots.filter((h) => {
      if (!h.is_active || resolvedHotspotIds.has(h.id)) return false
      return haversineDistance(currentPosition.latitude, currentPosition.longitude, h.latitude, h.longitude) <= h.radius_meters
    })
  }, [currentPosition, hotspots, resolvedHotspotIds])

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
    const map = L.map(mapContainerRef.current, { center: [52.1326, 5.2913], zoom: 18, minZoom: 8, maxZoom: 19 })
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

    for (const h of hotspots) {
      if (!h.is_active) continue
      const latLng = [h.latitude, h.longitude]
      bounds.push(latLng)
      const isResolved = resolvedHotspotIds.has(h.id)
      L.circle(latLng, { radius: h.radius_meters, color: isResolved ? '#16a34a' : h.marker_color, fillColor: isResolved ? '#16a34a' : h.marker_color, fillOpacity: 0.15, weight: 2 }).addTo(rangeCirclesLayerRef.current)
      L.circleMarker(latLng, { radius: 8, color: isResolved ? '#16a34a' : h.marker_color, fillColor: isResolved ? '#16a34a' : h.marker_color, fillOpacity: 0.9, weight: 2 })
        .bindPopup(`<strong>🔴 ${h.title}</strong><br/>${h.points} pts · ${h.severity}${isResolved ? '<br/>✅ Resolved' : ''}`)
        .addTo(markersLayerRef.current)
    }

    for (const p of pickups) {
      if (!p.is_active) continue
      const latLng = [p.latitude, p.longitude]
      bounds.push(latLng)
      const isCollected = collectedPickupIds.has(p.id)
      L.circle(latLng, { radius: p.radius_meters, color: isCollected ? '#16a34a' : p.marker_color, fillColor: isCollected ? '#16a34a' : p.marker_color, fillOpacity: 0.15, weight: 2 }).addTo(rangeCirclesLayerRef.current)
      L.circleMarker(latLng, { radius: 6, color: isCollected ? '#16a34a' : p.marker_color, fillColor: isCollected ? '#16a34a' : p.marker_color, fillOpacity: 0.9, weight: 2 })
        .bindPopup(`<strong>📦 ${p.title}</strong>${isCollected ? '<br/>✅ Collected' : ''}`)
        .addTo(markersLayerRef.current)
    }

    if (bounds.length > 0 && !currentPosition) mapRef.current.fitBounds(bounds, { padding: [40, 40] })
  }, [hotspots, pickups, resolvedHotspotIds, collectedPickupIds, currentPosition])

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
        <h2>{t('pandemic_response.team.title', {}, 'Pandemic Response')}</h2>
        <p><strong>{t('pandemic_response.team.score', {}, 'Score')}:</strong> {score}</p>
        <p className="muted">{currentPosition ? t('pandemic_response.team.gps_active', {}, 'GPS active') : t('pandemic_response.team.location_required', {}, 'Waiting for location…')}</p>
        <div ref={mapContainerRef} className="game-map" style={{ height: '350px', marginTop: '0.5rem' }} />
      </div>

      <div className="team-panel">
        <h2>{t('pandemic_response.team.pickups_heading', {}, 'Supply pickups')}</h2>
        {nearbyPickups.length > 0 ? (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {nearbyPickups.map((p) => (
              <li key={p.id} style={{ marginBottom: '0.75rem' }}>
                <strong>📦 {p.title}</strong>
                <br />
                <button className="btn btn-primary btn-small" type="button" disabled={collectingPickup} onClick={() => onCollectPickup(p.id)}>
                  {collectingPickup ? t('pandemic_response.team.collecting', {}, 'Collecting…') : t('pandemic_response.team.collect_pickup', {}, 'Collect')}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">{currentPosition ? t('pandemic_response.team.no_nearby_pickups', {}, 'No supply pickups nearby.') : t('pandemic_response.team.location_required', {}, 'Waiting for location…')}</p>
        )}

        <h2 style={{ marginTop: '1.5rem' }}>{t('pandemic_response.team.hotspots_heading', {}, 'Hotspots')}</h2>
        {nearbyHotspots.length > 0 ? (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {nearbyHotspots.map((h) => (
              <li key={h.id} style={{ marginBottom: '0.75rem' }}>
                <strong>🔴 {h.title}</strong> — {h.points} pts ({h.severity})
                <br />
                <button className="btn btn-primary btn-small" type="button" disabled={resolvingHotspot} onClick={() => onResolveHotspot(h.id)}>
                  {resolvingHotspot ? t('pandemic_response.team.resolving', {}, 'Resolving…') : t('pandemic_response.team.resolve_hotspot', {}, 'Resolve')}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">{currentPosition ? t('pandemic_response.team.no_nearby_hotspots', {}, 'No hotspots nearby.') : t('pandemic_response.team.location_required', {}, 'Waiting for location…')}</p>
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
