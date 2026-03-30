import { useEffect, useMemo, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import {
  attachUserLocationCentering,
  configureLeafletDefaultMarkerIcons,
  createLeafletTileLayer,
  createTeamLogoIcon,
  toNumberOrNull,
} from './shared/leafletMapCommon'

export default function GameLiveOverviewMap({
  teams,
  entities,
  entityColor = '#2563eb',
  getEntityLabel,
  getEntityColor,
  getEntityRadius,
  ariaLabel,
}) {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const entityLayerRef = useRef(null)
  const teamLayerRef = useRef(null)
  const hasInitializedViewportRef = useRef(false)

  const teamRows = useMemo(() => (Array.isArray(teams) ? teams : []), [teams])
  const entityRows = useMemo(() => (Array.isArray(entities) ? entities : []), [entities])

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return
    }

    configureLeafletDefaultMarkerIcons()

    const map = L.map(mapContainerRef.current, {
      center: [52.1326, 5.2913],
      zoom: 15,
      minZoom: 3,
      maxZoom: 19,
    })
    mapRef.current = map

    createLeafletTileLayer().addTo(map)

    const detachUserCentering = attachUserLocationCentering(map, {
      zoom: 15,
      follow: true,
      onFirstCenter: () => {
        hasInitializedViewportRef.current = true
      },
    })

    entityLayerRef.current = L.layerGroup().addTo(map)
    teamLayerRef.current = L.layerGroup().addTo(map)

    return () => {
      detachUserCentering()
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
      entityLayerRef.current = null
      teamLayerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!mapRef.current || !entityLayerRef.current || !teamLayerRef.current) {
      return
    }

    const map = mapRef.current
    const bounds = []
    entityLayerRef.current.clearLayers()
    teamLayerRef.current.clearLayers()

    for (const entity of entityRows) {
      const lat = toNumberOrNull(entity?.latitude)
      const lon = toNumberOrNull(entity?.longitude)
      if (lat === null || lon === null) {
        continue
      }

      const color = typeof getEntityColor === 'function' ? getEntityColor(entity) : String(entity?.marker_color || entityColor)
      const radius = typeof getEntityRadius === 'function' ? Number(getEntityRadius(entity) || 0) : Number(entity?.radius_meters || 0)
      const label = typeof getEntityLabel === 'function' ? getEntityLabel(entity) : String(entity?.title || '-')

      if (radius > 0) {
        L.circle([lat, lon], {
          radius,
          color,
          fillColor: color,
          fillOpacity: 0.14,
          weight: 1,
        }).addTo(entityLayerRef.current)
      }

      L.circleMarker([lat, lon], {
        radius: 6,
        color,
        fillColor: color,
        fillOpacity: 1,
      })
        .bindPopup(`<strong>${label}</strong>`)
        .addTo(entityLayerRef.current)

      bounds.push([lat, lon])
    }

    for (const team of teamRows) {
      const lat = toNumberOrNull(team?.lat)
      const lon = toNumberOrNull(team?.lon)
      const teamId = String(team?.team_id || team?.id || '')
      if (!teamId || lat === null || lon === null) {
        continue
      }

      const teamName = String(team?.name || '-')
      const teamLogoPath = String(team?.logo_path || team?.logoPath || '')
      const icon = createTeamLogoIcon(teamLogoPath)
      const marker = icon
        ? L.marker([lat, lon], { icon, zIndexOffset: 500 })
        : L.circleMarker([lat, lon], {
            radius: 8,
            color: '#111827',
            fillColor: '#ffffff',
            fillOpacity: 1,
            weight: 2,
          })

      marker.bindPopup(teamName).addTo(teamLayerRef.current)
      bounds.push([lat, lon])
    }

    if (!hasInitializedViewportRef.current) {
      if (bounds.length > 1) {
        map.fitBounds(bounds, { padding: [24, 24], maxZoom: 15 })
      } else if (bounds.length === 1) {
        map.setView(bounds[0], 15)
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
  }, [entityColor, entityRows, getEntityColor, getEntityLabel, getEntityRadius, teamRows])

  return <div ref={mapContainerRef} className="game-map blindhike-admin-overview-map" aria-label={ariaLabel || 'Live game map'} />
}
