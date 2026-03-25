import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { configureLeafletDefaultMarkerIcons } from './shared/leafletMapCommon'
import { toAssetUrl } from '../lib/assetUrl'

export default function ResourceRunTeamPanel({
  state,
  currentTeamId,
  t,
  onClaimResource,
  claiming = false,
}) {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const markersLayerRef = useRef(null)
  const rangeCirclesLayerRef = useRef(null)
  const userMarkerRef = useRef(null)
  const [currentPosition, setCurrentPosition] = useState(null)

  const nodes = useMemo(() => {
    const items = Array.isArray(state?.nodes) ? state.nodes : []
    return items.map((n) => ({
      id: String(n.id || ''),
      title: String(n.title || ''),
      latitude: Number(n.latitude || 0),
      longitude: Number(n.longitude || 0),
      radius_meters: Number(n.radius_meters || 25),
      points: Number(n.points || 0),
      marker_color: String(n.marker_color || '#f59e0b'),
      is_active: Boolean(n.is_active),
    }))
  }, [state?.nodes])

  const claimedIds = useMemo(() => {
    const actions = Array.isArray(state?.last_actions) ? state.last_actions : []
    const ids = new Set()
    for (const a of actions) {
      if (String(a?.action || '') === 'resource_run.resource.claim' && String(a?.team_id || '') === String(currentTeamId || '')) {
        ids.add(String(a?.object_id || ''))
      }
    }
    return ids
  }, [state?.last_actions, currentTeamId])

  const nearbyNodes = useMemo(() => {
    if (!currentPosition) return []
    return nodes.filter((n) => {
      if (!n.is_active || claimedIds.has(n.id)) return false
      return haversineDistance(currentPosition.latitude, currentPosition.longitude, n.latitude, n.longitude) <= n.radius_meters
    })
  }, [currentPosition, nodes, claimedIds])

  const score = Number(state?.score || state?.score_delta || 0)

  const highscore = useMemo(() => {
    const teams = Array.isArray(state?.highscore) ? state.highscore : []
    return teams
      .map((row) => ({ teamId: String(row?.team_id || ''), name: String(row?.name || '-'), logoPath: String(row?.logo_path || ''), score: Number(row?.score || 0) }))
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
    for (const n of nodes) {
      if (!n.is_active) continue
      const latLng = [n.latitude, n.longitude]
      bounds.push(latLng)
      const isClaimed = claimedIds.has(n.id)
      L.circle(latLng, { radius: n.radius_meters, color: isClaimed ? '#16a34a' : n.marker_color, fillColor: isClaimed ? '#16a34a' : n.marker_color, fillOpacity: 0.15, weight: 2 }).addTo(rangeCirclesLayerRef.current)
      L.circleMarker(latLng, { radius: 8, color: isClaimed ? '#16a34a' : n.marker_color, fillColor: isClaimed ? '#16a34a' : n.marker_color, fillOpacity: 0.9, weight: 2 })
        .bindPopup(`<strong>${n.title}</strong><br/>${n.points} pts${isClaimed ? ' ✅' : ''}`)
        .addTo(markersLayerRef.current)
    }
    if (bounds.length > 0 && !currentPosition) mapRef.current.fitBounds(bounds, { padding: [40, 40] })
  }, [nodes, claimedIds, currentPosition])

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
        <h2>{t('resource_run.team.title', {}, 'Resource Run')}</h2>
        <p><strong>{t('resource_run.team.score', {}, 'Score')}:</strong> {score}</p>
        <p className="muted">{currentPosition ? t('resource_run.team.gps_active', {}, 'GPS active') : t('resource_run.team.location_required', {}, 'Waiting for location…')}</p>
        <div ref={mapContainerRef} className="game-map" style={{ height: '350px', marginTop: '0.5rem' }} />
      </div>

      <div className="team-panel">
        <h2>{t('resource_run.team.objective', {}, 'Resource nodes')}</h2>
        {nearbyNodes.length > 0 ? (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {nearbyNodes.map((n) => (
              <li key={n.id} style={{ marginBottom: '0.75rem' }}>
                <strong>{n.title}</strong> — {n.points} pts
                <br />
                <button className="btn btn-primary btn-small" type="button" disabled={claiming} onClick={() => onClaimResource(n.id)}>
                  {claiming ? t('resource_run.team.claiming', {}, 'Claiming…') : t('resource_run.team.claim_resource', {}, 'Claim resource')}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">{currentPosition ? t('resource_run.team.move_into_range', {}, 'Move closer to a resource node.') : t('resource_run.team.location_required', {}, 'Waiting for location…')}</p>
        )}

        <h3 style={{ marginTop: '1.5rem' }}>{t('resource_run.team.all_nodes', {}, 'All nodes')}</h3>
        {nodes.length === 0 ? <p className="muted">-</p> : (
          <table className="admin-table">
            <thead><tr><th>{t('resource_run.admin.table_title', {}, 'Title')}</th><th>{t('resource_run.admin.table_points', {}, 'Points')}</th><th>{t('resource_run.admin.table_status', {}, 'Status')}</th></tr></thead>
            <tbody>
              {nodes.filter((n) => n.is_active).map((n) => (
                <tr key={n.id}><td>{n.title}</td><td>{n.points}</td><td>{claimedIds.has(n.id) ? '✅' : '—'}</td></tr>
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
