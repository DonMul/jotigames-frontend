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
  const [answerFeedback, setAnswerFeedback] = useState(null)
  const [retryLockedPoiSeconds, setRetryLockedPoiSeconds] = useState({})
  const latestPositionRef = useRef(null)

  function normalizeQuestionType(value) {
    const raw = String(value || '').trim().toLowerCase()
    if (raw === 'multiple_choice') return 'multiple_choice'
    if (raw === 'open' || raw === 'open_answer') return 'open_answer'
    return 'text'
  }

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
      question_type: normalizeQuestionType(p.question_type || p.type),
      question_text: String(p.question_text || p.question || ''),
      content: String(p.content || ''),
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

  const correctlyAnsweredIds = useMemo(() => {
    const actions = Array.isArray(state?.last_actions) ? state.last_actions : []
    const ids = new Set()
    for (const action of actions) {
      if (String(action?.action || '') !== 'geohunter.question.answer') {
        continue
      }
      if (String(action?.team_id || '') !== String(currentTeamId || '')) {
        continue
      }

      const rawMetadata = action?.metadata
      const metadata = typeof rawMetadata === 'string'
        ? (() => {
          try {
            const parsed = JSON.parse(rawMetadata)
            return parsed && typeof parsed === 'object' ? parsed : {}
          } catch {
            return {}
          }
        })()
        : (rawMetadata && typeof rawMetadata === 'object' ? rawMetadata : {})

      const pointsAwarded = Number(action?.points_awarded || action?.pointsAwarded || 0)
      const isCorrect = metadata?.correct === true || pointsAwarded > 0
      if (isCorrect) {
        ids.add(String(action?.object_id || ''))
      }
    }
    return ids
  }, [state?.last_actions, currentTeamId])

  const nearbyPois = useMemo(() => {
    const serverNearbyIds = Array.isArray(state?.nearby_poi_ids)
      ? new Set(state.nearby_poi_ids.map((value) => String(value || '')))
      : null
    if (serverNearbyIds) {
      return pois.filter((poi) => poi.is_active && serverNearbyIds.has(poi.id))
    }
    if (!currentPosition) return []
    return pois.filter((p) => {
      if (!p.is_active) return false
      return haversineDistance(currentPosition.latitude, currentPosition.longitude, p.latitude, p.longitude) <= p.radius_meters
    })
  }, [currentPosition, pois, state?.nearby_poi_ids])

  const visibleMapPois = useMemo(() => {
    const visibilityMode = String(state?.poi_visibility_mode || 'all_visible').trim().toLowerCase()
    if (visibilityMode !== 'in_range_only') {
      return pois.filter((poi) => poi.is_active)
    }

    const serverNearbyIds = Array.isArray(state?.nearby_poi_ids)
      ? new Set(state.nearby_poi_ids.map((value) => String(value || '')))
      : null
    if (serverNearbyIds) {
      return pois.filter((poi) => poi.is_active && serverNearbyIds.has(poi.id))
    }
    if (!currentPosition) {
      return []
    }
    return pois.filter((poi) => (
      poi.is_active
      && haversineDistance(currentPosition.latitude, currentPosition.longitude, poi.latitude, poi.longitude) <= poi.radius_meters
    ))
  }, [currentPosition, pois, state?.nearby_poi_ids, state?.poi_visibility_mode])

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
    latestPositionRef.current = currentPosition
  }, [currentPosition])

  useEffect(() => {
    if (typeof onLocationUpdate !== 'function') {
      return
    }

    const intervalId = window.setInterval(() => {
      if (latestPositionRef.current) {
        onLocationUpdate(latestPositionRef.current)
      }
    }, 10000)

    if (latestPositionRef.current) {
      onLocationUpdate(latestPositionRef.current)
    }

    return () => {
      window.clearInterval(intervalId)
    }
  }, [onLocationUpdate])

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return
    configureLeafletDefaultMarkerIcons()
    const map = L.map(mapContainerRef.current, { center: [52.1326, 5.2913], zoom: 16, minZoom: 8, maxZoom: 18 })
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
    for (const p of visibleMapPois) {
      const latLng = [p.latitude, p.longitude]
      bounds.push(latLng)
      const isAnswered = answeredIds.has(p.id)
      const pointsLabel = t('geohunter.team.points_short', {}, 'pts')
      const answeredLabel = isAnswered ? t('geohunter.team.map_answered_suffix', {}, '✅') : ''
      L.circle(latLng, { radius: p.radius_meters, color: isAnswered ? '#16a34a' : p.marker_color, fillColor: isAnswered ? '#16a34a' : p.marker_color, fillOpacity: 0.15, weight: 2 }).addTo(rangeCirclesLayerRef.current)
      L.circleMarker(latLng, { radius: 8, color: isAnswered ? '#16a34a' : p.marker_color, fillColor: isAnswered ? '#16a34a' : p.marker_color, fillOpacity: 0.9, weight: 2 })
        .bindPopup(`<strong>${p.title}</strong><br/>${p.points} ${pointsLabel}${answeredLabel ? ` ${answeredLabel}` : ''}`)
        .addTo(markersLayerRef.current)
    }
    if (bounds.length > 0 && !currentPosition) mapRef.current.fitBounds(bounds, { padding: [40, 40] })
  }, [visibleMapPois, answeredIds, currentPosition, t])

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
    const poiId = String(poi?.id || '')
    if (Number(retryLockedPoiSeconds[poiId] || 0) > 0 || correctlyAnsweredIds.has(poiId)) {
      return
    }
    setActivePoi(poi)
    setSelectedChoice('')
    setOpenAnswer('')
    setAnswerFeedback(null)
  }

  async function handleSubmitAnswer(event) {
    event.preventDefault()
    if (!activePoi) return

    let answerValue = ''

    if (activePoi.question_type === 'multiple_choice') {
      answerValue = selectedChoice
    } else if (activePoi.question_type === 'open_answer') {
      answerValue = openAnswer.trim()
    } else {
      setActivePoi(null)
      return
    }

    const feedback = await onAnswerQuestion(activePoi.id, answerValue)
    const defaultMessage = feedback?.correct
      ? t('geohunter.answer.correct', {}, 'Correct answer!')
      : t('geohunter.answer.incorrect', {}, 'Incorrect answer')
    const message = String(feedback?.message || defaultMessage)
    const isCorrect = Boolean(feedback?.correct)

    setAnswerFeedback({
      type: isCorrect ? 'success' : 'error',
      message,
    })

    const retryAvailableInSeconds = Math.max(0, Number(feedback?.retryAvailableInSeconds || 0))
    const activePoiId = String(activePoi?.id || '')
    if (!isCorrect && retryAvailableInSeconds > 0 && activePoiId) {
      setRetryLockedPoiSeconds((previous) => ({
        ...previous,
        [activePoiId]: retryAvailableInSeconds,
      }))
    }

    if (isCorrect) {
      setActivePoi(null)
    }
  }

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setRetryLockedPoiSeconds((previous) => {
        const entries = Object.entries(previous)
        if (entries.length === 0) {
          return previous
        }

        const next = {}
        for (const [poiId, seconds] of entries) {
          const remaining = Math.max(0, Number(seconds || 0) - 1)
          if (remaining > 0) {
            next[poiId] = remaining
          }
        }

        const sameSize = Object.keys(next).length === entries.length
        if (sameSize) {
          let unchanged = true
          for (const [poiId, seconds] of entries) {
            if (Number(next[poiId] || 0) !== Number(seconds || 0)) {
              unchanged = false
              break
            }
          }
          if (unchanged) {
            return previous
          }
        }

        return next
      })
    }, 1000)

    return () => {
      window.clearInterval(intervalId)
    }
  }, [])

  useEffect(() => {
    const rawLocked = state?.retry_locked_poi_seconds
    if (!rawLocked || typeof rawLocked !== 'object') {
      setRetryLockedPoiSeconds({})
      return
    }

    const normalized = {}
    for (const [poiId, seconds] of Object.entries(rawLocked)) {
      const remaining = Math.max(0, Number(seconds || 0))
      if (remaining > 0) {
        normalized[String(poiId || '')] = remaining
      }
    }
    setRetryLockedPoiSeconds(normalized)
  }, [state?.retry_locked_poi_seconds])

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
        {answerFeedback ? (
          <p className={answerFeedback.type === 'success' ? 'text-emerald-700' : 'text-red-700'} style={{ marginBottom: '0.75rem' }}>
            {answerFeedback.message}
          </p>
        ) : null}
        {nearbyPois.length > 0 ? (
          <ul className="grid gap-3" style={{ listStyle: 'none', padding: 0 }}>
            {nearbyPois.map((p) => (
              <li key={p.id} className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <div className="flex items-start justify-between gap-3">
                  <strong>{p.title}</strong>
                  <span className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                    {t('geohunter.team.points_label', { points: p.points }, `${p.points} punten`)}
                  </span>
                </div>
                {correctlyAnsweredIds.has(p.id) ? (
                  <p className="text-emerald-700" style={{ margin: '0.25rem 0' }}>
                    {t('geohunter.answer.correct', {}, 'Correct answer!')}
                  </p>
                ) : null}
                {Number(retryLockedPoiSeconds[p.id] || 0) > 0 ? (
                  <p className="text-red-700" style={{ margin: '0.25rem 0' }}>
                    {t('geohunter.answer.retry_in_seconds', { seconds: retryLockedPoiSeconds[p.id] }, `You can answer this question again in ${retryLockedPoiSeconds[p.id]} seconds.`)}
                  </p>
                ) : null}
                <button
                  className="btn btn-primary btn-small"
                  type="button"
                  disabled={answering || Number(retryLockedPoiSeconds[p.id] || 0) > 0 || correctlyAnsweredIds.has(p.id)}
                  onClick={() => handleOpenQuestion(p)}
                >
                  {t('geohunter.team.answer_question', {}, 'Answer question')}
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="muted">{currentPosition ? t('geohunter.team.move_into_range', {}, 'Move closer to a POI.') : t('geohunter.team.location_required', {}, 'Waiting for location…')}</p>
        )}
      </div>

      {activePoi ? (
        <div className="modal is-open" role="dialog" aria-modal="true" aria-label={activePoi.title}>
          <div className="modal-backdrop" onClick={() => setActivePoi(null)} />
          <div className="modal-card">
            <h2>{activePoi.title}</h2>
            <p>{activePoi.question_text}</p>
            {answerFeedback ? (
              <p className={answerFeedback.type === 'success' ? 'text-emerald-700' : 'text-red-700'} style={{ marginBottom: '0.75rem' }}>
                {answerFeedback.message}
              </p>
            ) : null}
            <form onSubmit={handleSubmitAnswer}>
              {activePoi.question_type === 'multiple_choice' ? (
                <fieldset style={{ border: 'none', padding: 0, margin: 0 }}>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: '0.5rem' }}>
                    {activePoi.choices.map((c) => {
                      const choiceId = String(c.id)
                      const isSelected = selectedChoice === choiceId
                      return (
                        <li key={choiceId}>
                          <button
                            type="button"
                            onClick={() => setSelectedChoice(choiceId)}
                            aria-pressed={isSelected}
                            className="w-full rounded-md border px-3 py-2 text-left transition-colors"
                            style={{
                              borderColor: isSelected ? '#2563eb' : '#d1d5db',
                              backgroundColor: isSelected ? '#dbeafe' : '#ffffff',
                              color: '#0f172a',
                            }}
                          >
                            {c.label}
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                </fieldset>
              ) : activePoi.question_type === 'open_answer' ? (
                <input
                  type="text"
                  className="input"
                  value={openAnswer}
                  onChange={(e) => setOpenAnswer(e.target.value)}
                  placeholder={t('geohunter.team.answer_placeholder', {}, 'Your answer…')}
                  required
                  autoFocus
                />
              ) : (
                <p>{activePoi.content || activePoi.question_text}</p>
              )}
              <div className="modal-actions" style={{ marginTop: '1rem' }}>
                <button className="btn btn-ghost" type="button" onClick={() => setActivePoi(null)}>{t('teamDashboard.popupClose', {}, 'Cancel')}</button>
                {activePoi.question_type !== 'text' ? (
                  <button className="btn btn-primary" type="submit" disabled={answering || Number(retryLockedPoiSeconds[String(activePoi.id || '')] || 0) > 0 || (activePoi.question_type === 'multiple_choice' ? !selectedChoice : !openAnswer.trim())}>
                    {answering ? t('geohunter.team.submitting', {}, 'Submitting…') : t('geohunter.team.submit_answer', {}, 'Submit')}
                  </button>
                ) : null}
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
