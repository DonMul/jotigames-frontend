import { useEffect, useMemo, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import {
  configureLeafletDefaultMarkerIcons,
  createTeamLogoIcon,
  toNumberOrNull,
} from './shared/leafletMapCommon'

export default function MarketCrashAdminOverviewMap({ points, teams, t }) {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const pointLayerRef = useRef(null)
  const teamLayerRef = useRef(null)
  const hasInitializedViewportRef = useRef(false)

  const teamRows = useMemo(() => (Array.isArray(teams) ? teams : []), [teams])
  const pointRows = useMemo(() => (Array.isArray(points) ? points : []), [points])

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return
    }

    configureLeafletDefaultMarkerIcons()

    const map = L.map(mapContainerRef.current, {
      center: [52.1326, 5.2913],
      zoom: 8,
      minZoom: 3,
      maxZoom: 19,
    })
    mapRef.current = map

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map)

    pointLayerRef.current = L.layerGroup().addTo(map)
    teamLayerRef.current = L.layerGroup().addTo(map)

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
      pointLayerRef.current = null
      teamLayerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!mapRef.current || !pointLayerRef.current || !teamLayerRef.current) {
      return
    }

    const map = mapRef.current
    pointLayerRef.current.clearLayers()
    teamLayerRef.current.clearLayers()

    const bounds = []

    for (const point of pointRows) {
      const lat = toNumberOrNull(point?.latitude)
      const lon = toNumberOrNull(point?.longitude)
      if (lat === null || lon === null) {
        continue
      }

      const color = String(point?.marker_color || '#2563eb')
      const radius = Number(point?.radius_meters || 25)
      const resourceSettings = Array.isArray(point?.resource_settings) ? point.resource_settings : []
      const popupLines = resourceSettings.map((setting) => (
        `${String(setting?.resource_name || setting?.resource_id || '')}: B ${Number(setting?.buy_price || 0)} · S ${Number(setting?.sell_price || 0)}`
      ))

      L.circle([lat, lon], {
        radius,
        color,
        fillColor: color,
        fillOpacity: 0.14,
        weight: 1,
      }).addTo(pointLayerRef.current)

      L.circleMarker([lat, lon], {
        radius: 6,
        color,
        fillColor: color,
        fillOpacity: 1,
      })
        .bindPopup(`<strong>${String(point?.title || '-')}</strong><br>${popupLines.join('<br>') || '-'}`)
        .addTo(pointLayerRef.current)

      bounds.push([lat, lon])
    }

    for (const team of teamRows) {
      const teamId = String(team?.team_id || team?.id || '')
      const lat = toNumberOrNull(team?.lat)
      const lon = toNumberOrNull(team?.lon)
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

      marker
        .bindPopup(`${teamName}<br>${t('market_crash.team.cash', {}, 'Cash')}: ${Number(team?.cash || 0)}<br>${t('moduleOverview.score', {}, 'Score')}: ${Number(team?.score || 0)}`)
        .addTo(teamLayerRef.current)

      bounds.push([lat, lon])
    }

    if (!hasInitializedViewportRef.current) {
      if (bounds.length > 1) {
        map.fitBounds(bounds, { padding: [24, 24], maxZoom: 16 })
      } else if (bounds.length === 1) {
        map.setView(bounds[0], 14)
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
  }, [pointRows, t, teamRows])

  return <div ref={mapContainerRef} className="game-map blindhike-admin-overview-map" aria-label={t('market_crash.admin.overview_map', {}, 'Market Crash live map')} />
}
