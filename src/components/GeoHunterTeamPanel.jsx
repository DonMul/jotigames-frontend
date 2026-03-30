import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { configureLeafletDefaultMarkerIcons } from './shared/leafletMapCommon'
import { toAssetUrl } from '../lib/assetUrl'

export default function GeoHunterTeamPanel({
  state,
  currentTeamId,
  t,
  onAnswerQuestion,
  onLocationUpdate,
  answering = false,
}) {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const markersLayerRef = useRef(null)
  const rangeCirclesLayerRef = useRef(null)
  const userMarkerRef = useRef(null)
  const [currentPosition, setCurrentPosition] = useState(null)
  const [activePoi, setActivePoi] = useState(null)
  const [selectedChoice, setSelectedChoice] = useState('')
  const [openAnswer, setOpenAnswer] = useState('')

  const pois = useMemo(() => {
    const items = Array.isArray(state?.pois) ? state.pois : []
    return items.map((p) => ({
      id: String(p.id || ''),
      title: String(p.title || ''),
      latitude: Number(p.latitude || 0),
      longitude: Number(p.longitude || 0),
      radius_meters: Number(p.radius_meters || 25),
      points: Number(p.points || 0),
      marker_color: String(p.marker_color || '#10b981'),
      is_active: Boolean(p.is_active),
      question_type: String(p.question_type || 'open'),
      question_text: String(p.question_text || ''),
      correct_answer: String(p.correct_answer || ''),
      choices: Array.isArray(p.choices) ? p.choices : [],
    }))
  }, [state?.pois])

  const answeredIds = useMemo(() => {
    const actions = Array.isArray(state?.last_actions) ? state.last_actions : []
    const ids = new Set()
    for (const a of actions) {
      if (String(a?.action || '') === 'geohunter.question.answer' && String(a?.team_id || '') === String(currentTeamId || '')) {
        ids.add(String(a?.object_id || ''))
      }
    }
    return ids
  }, [state?.last_actions, currentTeamId])

  const nearbyPois = useMemo(() => {
    const serverNearbyIds = Array.isArray(state?.nearby_poi_ids)
      ? new Set(state.nearby_poi_ids.map((value) => String(value || '')))
      : null
    if (serverNearbyIds) {
      return pois.filter((poi) => poi.is_active && !answeredIds.has(poi.id) && serverNearbyIds.has(poi.id))
    }
    if (!currentPosition) return []
    return pois.filter((p) => {
      if (!p.is_active || answeredIds.has(p.id)) return false
      return haversineDistance(currentPosition.latitude, currentPosition.longitude, p.latitude, p.longitude) <= p.radius_meters
    })
  }, [currentPosition, pois, answeredIds, state?.nearby_poi_ids])

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
    if (typeof onLocationUpdate !== 'function' || !currentPosition) {
      return
    }
    onLocationUpdate(currentPosition)
    const intervalId = window.setInterval(() => {
      onLocationUpdate(currentPosition)
    }, 10000)
    return () => {
      window.clearInterval(intervalId)
    }
  }, [currentPosition, onLocationUpdate])

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
    for (const p of pois) {
      if (!p.is_active) continue
      const latLng = [p.latitude, p.longitude]
      bounds.push(latLng)
      const isAnswered = answeredIds.has(p.id)
      L.circle(latLng, { radius: p.radius_meters, color: isAnswered ? '#16a34a' : p.marker_color, fillColor: isAnswered ? '#16a34a' : p.marker_color, fillOpacity: 0.15, weight: 2 }).addTo(rangeCirclesLayerRef.current)
      L.circleMarker(latLng, { radius: 8, color: isAnswered ? '#16a34a' : p.marker_color, fillColor: isAnswered ? '#16a34a' : p.marker_color, fillOpacity: 0.9, weight: 2 })
        .bindPopup(`<strong>${p.title}</strong><br/>${p.points} pts${isAnswered ? ' ✅' : ''}`)
        .addTo(markersLayerRef.current)
    }
    if (bounds.length > 0 && !currentPosition) mapRef.current.fitBounds(bounds, { padding: [40, 40] })
  }, [pois, answeredIds, currentPosition])

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

  function handleOpenQuestion(poi) {
    setActivePoi(poi)
    setSelectedChoice('')
    setOpenAnswer('')
  }

  function handleSubmitAnswer(event) {
    event.preventDefault()
    if (!activePoi) return

    let answerValue = ''

    if (activePoi.question_type === 'multiple_choice') {
      answerValue = selectedChoice
    } else {
      answerValue = openAnswer.trim()
    }

    onAnswerQuestion(activePoi.id, answerValue)
    setActivePoi(null)
  }

  return (
    <section className="team-dashboard-geo-layout">
      <div className="team-panel">
        <h2>{t('geohunter.team.title', {}, 'GeoHunter')}</h2>
        <p><strong>{t('geohunter.team.score', {}, 'Score')}:</strong> {score}</p>
        <p className="muted">{currentPosition ? t('geohunter.team.gps_active', {}, 'GPS active') : t('geohunter.team.location_required', {}, 'Waiting for location…')}</p>
        <div ref={mapContainerRef} className="game-map" style={{ height: '350px', marginTop: '0.5rem' }} />
      </div>

      <div className="team-panel">
        <h2>{t('geohunter.team.objective', {}, 'Points of interest')}</h2>
        {nearbyPois.length > 0 ? (
          <ul style={{ listStyle: 'none', padding: 0 }}>
            {nearbyPois.map((p) => (
              <li key={p.id} style={{ marginBottom: '0.75rem' }}>
                <strong>{p.title}</strong> — {p.points} pts
                <br />
                <button className="btn btn-primary btn-small" type="button" disabled={answering} onClick={() => handleOpenQuestion(p)}>
                  {t('geohunter.team.answer_question', {}, 'Answer question')}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">{currentPosition ? t('geohunter.team.move_into_range', {}, 'Move closer to a POI.') : t('geohunter.team.location_required', {}, 'Waiting for location…')}</p>
        )}

        <h3 style={{ marginTop: '1.5rem' }}>{t('geohunter.team.all_pois', {}, 'All locations')}</h3>
        {pois.length === 0 ? <p className="muted">-</p> : (
          <table className="admin-table">
            <thead><tr><th>{t('geohunter.admin.table_title', {}, 'Title')}</th><th>{t('geohunter.admin.table_points', {}, 'Points')}</th><th>{t('geohunter.admin.table_status', {}, 'Status')}</th></tr></thead>
            <tbody>
              {pois.filter((p) => p.is_active).map((p) => (
                <tr key={p.id}><td>{p.title}</td><td>{p.points}</td><td>{answeredIds.has(p.id) ? '✅' : '—'}</td></tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {activePoi ? (
        <div className="modal is-open" role="dialog" aria-modal="true" aria-label={activePoi.title}>
          <div className="modal-backdrop" onClick={() => setActivePoi(null)} />
          <div className="modal-card">
            <h2>{activePoi.title}</h2>
            <p>{activePoi.question_text}</p>
            <form onSubmit={handleSubmitAnswer}>
              {activePoi.question_type === 'multiple_choice' ? (
                <fieldset style={{ border: 'none', padding: 0 }}>
                  {activePoi.choices.map((c) => (
                    <label key={c.id} style={{ display: 'block', marginBottom: '0.5rem', cursor: 'pointer' }}>
                      <input type="radio" name="geo-choice" value={c.id} checked={selectedChoice === String(c.id)} onChange={() => setSelectedChoice(String(c.id))} />
                      {' '}{c.label}
                    </label>
                  ))}
                </fieldset>
              ) : (
                <input
                  type="text"
                  className="input"
                  value={openAnswer}
                  onChange={(e) => setOpenAnswer(e.target.value)}
                  placeholder={t('geohunter.team.answer_placeholder', {}, 'Your answer…')}
                  required
                  autoFocus
                />
              )}
              <div className="modal-actions" style={{ marginTop: '1rem' }}>
                <button className="btn btn-ghost" type="button" onClick={() => setActivePoi(null)}>{t('teamDashboard.popupClose', {}, 'Cancel')}</button>
                <button className="btn btn-primary" type="submit" disabled={answering || (activePoi.question_type === 'multiple_choice' ? !selectedChoice : !openAnswer.trim())}>
                  {answering ? t('geohunter.team.submitting', {}, 'Submitting…') : t('geohunter.team.submit_answer', {}, 'Submit')}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

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
