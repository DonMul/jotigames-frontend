import { useEffect, useMemo, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import {
  attachUserLocationCentering,
  configureLeafletDefaultMarkerIcons,
  toNumberOrNull,
} from './shared/leafletMapCommon'

/**
 * Reusable admin overview map that displays entity markers with optional circles.
 *
 * @param {Object[]} entities - Array of entity objects with latitude, longitude, and optional metadata.
 * @param {function} [getLabel] - (entity) => string for popup label. Defaults to entity.title.
 * @param {function} [getColor] - (entity) => string for marker/circle color. Defaults to '#2563eb'.
 * @param {function} [getRadius] - (entity) => number for circle radius in meters. Return 0/null to skip.
 * @param {string} [ariaLabel] - Accessible label for the map container.
 */
export default function AdminOverviewMap({
  entities,
  getLabel,
  getColor,
  getRadius,
  ariaLabel = 'Overview map',
}) {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const layerRef = useRef(null)
  const hasInitializedViewportRef = useRef(false)
  const hasAppliedBrowserCenterRef = useRef(false)

  const rows = useMemo(() => (Array.isArray(entities) ? entities : []), [entities])

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

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map)

    layerRef.current = L.layerGroup().addTo(map)

    const detachUserCentering = attachUserLocationCentering(map, {
      zoom: 15,
      follow: true,
      maximumAge: 60000,
      onFirstCenter: () => {
        hasAppliedBrowserCenterRef.current = true
        hasInitializedViewportRef.current = true
      },
    })

    return () => {
      detachUserCentering()
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
      layerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!mapRef.current || !layerRef.current) {
      return
    }

    const map = mapRef.current
    const layer = layerRef.current
    layer.clearLayers()

    const bounds = []

    for (const entity of rows) {
      const lat = toNumberOrNull(entity?.latitude)
      const lon = toNumberOrNull(entity?.longitude)
      if (lat === null || lon === null) {
        continue
      }

      const label = typeof getLabel === 'function' ? getLabel(entity) : String(entity?.title || '-')
      const color = typeof getColor === 'function' ? getColor(entity) : String(entity?.marker_color || '#2563eb')
      const radius = typeof getRadius === 'function' ? getRadius(entity) : Number(entity?.radius_meters || 0)

      if (radius > 0) {
        L.circle([lat, lon], {
          radius,
          color,
          fillColor: color,
          fillOpacity: 0.16,
          weight: 1,
        }).addTo(layer)
      }

      L.circleMarker([lat, lon], {
        radius: 6,
        color,
        fillColor: color,
        fillOpacity: 1,
      })
        .bindPopup(`<strong>${label}</strong>`)
        .addTo(layer)

      bounds.push([lat, lon])
    }

    if (!hasInitializedViewportRef.current && !hasAppliedBrowserCenterRef.current) {
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
  }, [rows, getLabel, getColor, getRadius])

  return <div ref={mapContainerRef} className="game-map blindhike-admin-overview-map" aria-label={ariaLabel} />
}
