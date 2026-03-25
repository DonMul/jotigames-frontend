import { useEffect, useMemo, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { attachUserLocationCentering, toNumberOrNull } from './shared/leafletMapCommon'

function buildTeamColor(teamId) {
  const raw = String(teamId || '')
  let hash = 0
  for (let index = 0; index < raw.length; index += 1) {
    hash = ((hash << 5) - hash) + raw.charCodeAt(index)
    hash |= 0
  }
  const hue = Math.abs(hash) % 360
  return `hsl(${hue} 75% 50%)`
}

export default function BlindHikeAdminOverviewMap({ target, markers, teams, t }) {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const targetMarkerRef = useRef(null)
  const markerLayerRef = useRef(null)
  const hasInitializedViewportRef = useRef(false)

  const teamColorById = useMemo(() => {
    const colorMap = new Map()
    for (const team of Array.isArray(teams) ? teams : []) {
      const teamId = String(team?.id || team?.team_id || '')
      if (!teamId) {
        continue
      }
      colorMap.set(teamId, buildTeamColor(teamId))
    }
    return colorMap
  }, [teams])

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return
    }

    const map = L.map(mapContainerRef.current, {
      center: [52.1326, 5.2913],
      zoom: 15,
      minZoom: 3,
      maxZoom: 19,
    })
    mapRef.current = map

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map)

    const detachUserCentering = attachUserLocationCentering(map, {
      zoom: 15,
      follow: true,
      onFirstCenter: () => {
        hasInitializedViewportRef.current = true
      },
    })

    markerLayerRef.current = L.layerGroup().addTo(map)

    return () => {
      detachUserCentering()
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
      markerLayerRef.current = null
      targetMarkerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!mapRef.current || !markerLayerRef.current) {
      return
    }

    const map = mapRef.current
    const targetLat = toNumberOrNull(target?.lat)
    const targetLon = toNumberOrNull(target?.lon)
    const latLngBounds = []

    if (targetLat !== null && targetLon !== null) {
      const targetLatLng = [targetLat, targetLon]
      if (!targetMarkerRef.current) {
        targetMarkerRef.current = L.marker(targetLatLng, {
          icon: L.divIcon({
            className: 'blindhike-target-icon',
            html: '🎯',
            iconSize: [28, 28],
            iconAnchor: [14, 14],
          }),
          zIndexOffset: 1000,
        }).addTo(map)
      } else {
        targetMarkerRef.current.setLatLng(targetLatLng)
      }
      latLngBounds.push(targetLatLng)
    } else if (targetMarkerRef.current) {
      targetMarkerRef.current.remove()
      targetMarkerRef.current = null
    }

    markerLayerRef.current.clearLayers()

    for (const marker of Array.isArray(markers) ? markers : []) {
      const lat = toNumberOrNull(marker?.lat)
      const lon = toNumberOrNull(marker?.lon)
      const teamId = String(marker?.team_id || '')
      if (lat === null || lon === null || !teamId) {
        continue
      }

      const color = teamColorById.get(teamId) || buildTeamColor(teamId)
      L.circleMarker([lat, lon], {
        radius: 6,
        color,
        fillColor: color,
        fillOpacity: 0.88,
        weight: 1,
      }).addTo(markerLayerRef.current)

      latLngBounds.push([lat, lon])
    }

    if (!hasInitializedViewportRef.current) {
      if (latLngBounds.length > 1) {
        map.fitBounds(latLngBounds, { padding: [20, 20] })
      } else if (latLngBounds.length === 1) {
        map.setView(latLngBounds[0], 15)
      }
      hasInitializedViewportRef.current = true
    }

    const frameId = window.requestAnimationFrame(() => {
      map.invalidateSize(false)
    })
    const timeoutId = window.setTimeout(() => {
      map.invalidateSize(false)
    }, 160)

    return () => {
      window.cancelAnimationFrame(frameId)
      window.clearTimeout(timeoutId)
    }
  }, [markers, target, teamColorById])

  return (
    <div className="blindhike-admin-overview">
      <div ref={mapContainerRef} className="game-map blindhike-admin-overview-map" aria-label={t('blindhike.target_location', {}, 'Target location')} />
      <aside className="blindhike-admin-legend">
        <h3>{t('moduleOverview.legend', {}, 'Legend')}</h3>
        <ul>
          {(Array.isArray(teams) ? teams : []).map((team) => {
            const teamId = String(team?.id || team?.team_id || '')
            const color = teamColorById.get(teamId) || buildTeamColor(teamId)
            return (
              <li key={teamId || String(team?.name || Math.random())}>
                <span className="blindhike-admin-legend-dot" style={{ backgroundColor: color }} aria-hidden="true" />
                <span>{String(team?.name || '-')}</span>
              </li>
            )
          })}
        </ul>
      </aside>
    </div>
  )
}
