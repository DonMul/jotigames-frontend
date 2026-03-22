import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  configureLeafletDefaultMarkerIcons,
  toNumberOrNull,
} from './shared/leafletMapCommon'
import { toAssetUrl } from '../lib/assetUrl'

export default function BlindHikeTeamPanel({
  state,
  currentTeamId,
  t,
  placingMarker,
  onPlaceMarker,
}) {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const targetMarkerRef = useRef(null)
  const teamMarkersLayerRef = useRef(null)

  const [currentPosition, setCurrentPosition] = useState(null)

  const isFinished = Boolean(state?.finished)
  const canPlaceMarker = Boolean(currentPosition) && !placingMarker && !isFinished

  const markerLimit = state?.marker_limit === null || state?.marker_limit === undefined
    ? null
    : Number(state?.marker_limit)

  const myMarkerCount = Number(state?.actions || 0)
  const finishRadiusMeters = Number(state?.finish_radius_meters || 25)

  const highscore = useMemo(() => {
    const rows = Array.isArray(state?.highscore) ? state.highscore : []
    return rows
      .map((row) => ({
        teamId: String(row?.team_id || ''),
        name: String(row?.name || '-'),
        logoPath: String(row?.logo_path || ''),
        markers: Number(row?.markers || 0),
        finished: Boolean(row?.finished),
      }))
      .sort((left, right) => {
        if (right.markers !== left.markers) {
          return right.markers - left.markers
        }
        return left.name.localeCompare(right.name)
      })
      .map((row, index) => ({ ...row, rank: index + 1 }))
  }, [state?.highscore])

  useEffect(() => {
    if (!navigator.geolocation) {
      return undefined
    }

    const watchId = navigator.geolocation.watchPosition(
      (position) => {
        setCurrentPosition({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        })
      },
      () => {
        setCurrentPosition(null)
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
    if (!mapContainerRef.current || mapRef.current) {
      return
    }

    configureLeafletDefaultMarkerIcons()

    const map = L.map(mapContainerRef.current, {
      center: [52.1326, 5.2913],
      zoom: 14,
      minZoom: 10,
      maxZoom: 19,
    })
    mapRef.current = map

    const blackLayer = L.gridLayer({
      tileSize: 256,
      attribution: '&copy; OpenStreetMap contributors',
    })
    blackLayer.createTile = function createTile() {
      const tile = document.createElement('canvas')
      const context = tile.getContext('2d')
      tile.width = 256
      tile.height = 256
      if (context) {
        context.fillStyle = '#000000'
        context.fillRect(0, 0, 256, 256)
      }
      return tile
    }
    blackLayer.addTo(map)

    teamMarkersLayerRef.current = L.layerGroup().addTo(map)

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
      targetMarkerRef.current = null
      teamMarkersLayerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!mapRef.current) {
      return
    }

    const map = mapRef.current
    const targetLat = toNumberOrNull(state?.target?.lat)
    const targetLon = toNumberOrNull(state?.target?.lon)

    if (targetLat !== null && targetLon !== null) {
      const targetLocation = [targetLat, targetLon]
      if (!targetMarkerRef.current) {
        targetMarkerRef.current = L.marker(targetLocation, {
          icon: L.divIcon({
            className: 'blindhike-target-icon',
            html: '🎯',
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          }),
          zIndexOffset: 1000,
        }).addTo(map)
      } else {
        targetMarkerRef.current.setLatLng(targetLocation)
      }

      map.setView(targetLocation, Math.max(Number(map.getZoom() || 14), 14))
    } else if (targetMarkerRef.current) {
      targetMarkerRef.current.remove()
      targetMarkerRef.current = null
    }
  }, [state?.target?.lat, state?.target?.lon])

  useEffect(() => {
    if (!mapRef.current || !teamMarkersLayerRef.current) {
      return
    }

    teamMarkersLayerRef.current.clearLayers()
    const markers = Array.isArray(state?.team_markers) ? state.team_markers : []
    markers.forEach((marker) => {
      const lat = toNumberOrNull(marker?.lat)
      const lon = toNumberOrNull(marker?.lon)
      if (lat === null || lon === null) {
        return
      }

      L.circleMarker([lat, lon], {
        radius: 6,
        color: '#f2c94c',
        fillColor: '#f2c94c',
        fillOpacity: 0.8,
        weight: 1,
      }).addTo(teamMarkersLayerRef.current)
    })
  }, [state?.team_markers])

  useEffect(() => {
    let secondFrameId = 0
    const timeoutId = window.setTimeout(() => {
      mapRef.current?.invalidateSize(false)
    }, 180)

    const firstFrameId = window.requestAnimationFrame(() => {
      secondFrameId = window.requestAnimationFrame(() => {
        mapRef.current?.invalidateSize(false)
      })
    })

    const handleResize = () => {
      mapRef.current?.invalidateSize(false)
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.cancelAnimationFrame(firstFrameId)
      window.cancelAnimationFrame(secondFrameId)
      window.clearTimeout(timeoutId)
      window.removeEventListener('resize', handleResize)
    }
  }, [state?.team_markers, state?.target?.lat, state?.target?.lon])

  return (
    <section className="team-dashboard-blindhike-layout">
      <div className="team-panel team-dashboard-blindhike-map-panel">
        <h2>{t('blindhike.target_location', {}, 'Target location')}</h2>
        <p className="muted">{t('teamDashboard.blindhike.mapHint', {}, 'The map is obscured. Only target and your markers are visible.')}</p>
        <div ref={mapContainerRef} className="game-map team-dashboard-blindhike-map" aria-label={t('blindhike.target_location', {}, 'Target location')} />
      </div>

      <div className="team-panel">
        <h2>{t('teamDashboard.blindhike.markerActions', {}, 'Marker placement')}</h2>
        <p>
          <strong>{t('teamDashboard.blindhike.markersPlaced', {}, 'Markers placed')}:</strong>{' '}
          {myMarkerCount}
        </p>
        {markerLimit !== null ? (
          <p>
            <strong>{t('blindhike.max_markers', {}, 'Max markers')}:</strong>{' '}
            {markerLimit}
          </p>
        ) : null}
        <p>
          <strong>{t('blindhike.finish_radius_meters', {}, 'Finish radius (meters)')}:</strong>{' '}
          {Number.isFinite(finishRadiusMeters) ? finishRadiusMeters : 25}
        </p>
        <p className="muted">
          {isFinished
            ? t('teamDashboard.blindhike.finishedLocked', {}, 'Your team is finished. You can no longer place markers.')
            : currentPosition
            ? t('teamDashboard.blindhike.locationReady', {}, 'Location found. You can place a marker.')
            : t('teamDashboard.blindhike.waitingLocation', {}, 'Waiting for location…')}
        </p>
        <button
          className="btn btn-primary"
          type="button"
          disabled={!canPlaceMarker}
          onClick={() => onPlaceMarker(currentPosition)}
        >
          {isFinished
            ? t('teamDashboard.blindhike.finished', {}, 'Finished')
            : placingMarker
            ? t('teamDashboard.blindhike.placingMarker', {}, 'Placing marker…')
            : t('teamDashboard.blindhike.placeMarker', {}, 'Place marker here')}
        </button>
      </div>

      <div className="team-panel">
        <h2>{t('teamDashboard.highscore', {}, 'Highscore')}</h2>
        {highscore.length === 0 ? <p>{t('teamDashboard.noTeams', {}, 'No teams')}</p> : null}
        {highscore.length > 0 ? (
          <ol className="team-leaderboard-list">
            {highscore.map((team) => (
              <li
                key={team.teamId}
                className={`team-leaderboard-item ${team.teamId === String(currentTeamId || '') ? 'is-current-team' : ''}`}
              >
                <span className="team-leaderboard-rank">#{team.rank}</span>
                <span className="team-leaderboard-logo" aria-hidden="true">
                  {team.logoPath ? <img src={toAssetUrl(team.logoPath)} alt="" /> : null}
                </span>
                <span className="team-leaderboard-name">{team.name}{team.finished ? ' ✅' : ''}</span>
                <span className="team-leaderboard-value">{team.markers}</span>
              </li>
            ))}
          </ol>
        ) : null}
      </div>
    </section>
  )
}
