import { useEffect, useMemo, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import {
  attachUserLocationCentering,
  configureLeafletDefaultMarkerIcons,
  toNumberOrNull,
} from './shared/leafletMapCommon'

export default function MarketCrashPointsMap({ points, t }) {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const layerRef = useRef(null)
  const hasInitializedViewportRef = useRef(false)
  const hasAppliedBrowserCenterRef = useRef(false)

  const pointRows = useMemo(() => (Array.isArray(points) ? points : []), [points])

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

    for (const point of pointRows) {
      const lat = toNumberOrNull(point?.latitude)
      const lon = toNumberOrNull(point?.longitude)
      if (lat === null || lon === null) {
        continue
      }

      const title = String(point?.title || '-')
      const color = String(point?.marker_color || '#2563eb')
      const radius = Number(point?.radius_meters || 25)
      const resources = Array.isArray(point?.resource_settings) ? point.resource_settings : []
      const resourcesText = resources.length > 0
        ? resources
          .map((setting) => `${String(setting?.resource_name || setting?.resource_id || '')}: B ${Number(setting?.buy_price || 0)} · S ${Number(setting?.sell_price || 0)}`)
          .join('<br>')
        : '-'

      L.circle([lat, lon], {
        radius,
        color,
        fillColor: color,
        fillOpacity: 0.16,
        weight: 1,
      }).addTo(layer)

      L.circleMarker([lat, lon], {
        radius: 6,
        color,
        fillColor: color,
        fillOpacity: 1,
      })
        .bindPopup(`<strong>${title}</strong><br>${resourcesText}`)
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
  }, [pointRows])

  return <div ref={mapContainerRef} className="game-map blindhike-admin-overview-map" aria-label={t('market_crash.admin.points_map', {}, 'Market Crash points map')} />
}
