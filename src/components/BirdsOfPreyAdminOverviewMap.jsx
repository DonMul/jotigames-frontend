import { useEffect, useMemo, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { buildEggIcon } from './shared/birdsMapIcons'
import {
  attachUserLocationCentering,
  configureLeafletDefaultMarkerIcons,
  createTeamLogoIcon,
  toNumberOrNull,
} from './shared/leafletMapCommon'

function buildTeamColor(teamId, alpha = 1) {
  const raw = String(teamId || '')
  let hash = 0
  for (let index = 0; index < raw.length; index += 1) {
    hash = ((hash << 5) - hash) + raw.charCodeAt(index)
    hash |= 0
  }
  const hue = Math.abs(hash) % 360
  if (alpha < 1) {
    return `hsl(${hue} 72% 48% / ${alpha})`
  }
  return `hsl(${hue} 72% 48%)`
}

export default function BirdsOfPreyAdminOverviewMap({ teams, eggs, t }) {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const teamLayerRef = useRef(null)
  const eggLayerRef = useRef(null)
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

    const detachUserCentering = attachUserLocationCentering(map, {
      zoom: 15,
      follow: true,
      onFirstCenter: () => {
        hasInitializedViewportRef.current = true
      },
    })

    teamLayerRef.current = L.layerGroup().addTo(map)
    eggLayerRef.current = L.layerGroup().addTo(map)

    return () => {
      detachUserCentering()
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
      teamLayerRef.current = null
      eggLayerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!mapRef.current || !teamLayerRef.current || !eggLayerRef.current) {
      return
    }

    const map = mapRef.current
    teamLayerRef.current.clearLayers()
    eggLayerRef.current.clearLayers()

    const bounds = []

    for (const team of Array.isArray(teams) ? teams : []) {
      const teamId = String(team?.id || team?.team_id || '')
      const teamName = String(team?.name || '-')
      const teamLogoPath = String(team?.logo_path || team?.logoPath || '')
      const lat = toNumberOrNull(team?.lat)
      const lon = toNumberOrNull(team?.lon)
      if (!teamId || lat === null || lon === null) {
        continue
      }

      const teamColor = teamColorById.get(teamId) || buildTeamColor(teamId)
      const teamLogoIcon = createTeamLogoIcon(teamLogoPath)
      if (teamLogoIcon) {
        L.marker([lat, lon], { icon: teamLogoIcon, zIndexOffset: 500 })
          .bindPopup(`${teamName}`)
          .addTo(teamLayerRef.current)
      } else {
        L.circleMarker([lat, lon], {
          radius: 8,
          color: teamColor,
          fillColor: teamColor,
          fillOpacity: 0.9,
          weight: 2,
        })
          .bindPopup(`${teamName}`)
          .addTo(teamLayerRef.current)
      }

      bounds.push([lat, lon])
    }

    for (const egg of Array.isArray(eggs) ? eggs : []) {
      const lat = toNumberOrNull(egg?.lat)
      const lon = toNumberOrNull(egg?.lon)
      const ownerTeamId = String(egg?.owner_team_id || '')
      if (lat === null || lon === null || !ownerTeamId) {
        continue
      }

      const ownerTeamName = String(egg?.owner_team_name || ownerTeamId)
      const eggColor = buildTeamColor(ownerTeamId)
      const eggKey = String(egg?.id || `${lat}:${lon}:${ownerTeamId}`)
      L.marker([lat, lon], {
        icon: buildEggIcon(eggColor, eggKey),
        zIndexOffset: 2000,
      })
        .bindPopup(`${ownerTeamName}`)
        .addTo(eggLayerRef.current)

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
  }, [eggs, teams, teamColorById])

  return (
    <div className="blindhike-admin-overview">
      <div ref={mapContainerRef} className="game-map blindhike-admin-overview-map" aria-label={t('birds_of_prey.admin.liveMap', {}, 'Live map')} />
      <aside className="blindhike-admin-legend">
        <h3>{t('moduleOverview.legend', {}, 'Legend')}</h3>
        <ul>
          {(Array.isArray(teams) ? teams : []).map((team) => {
            const teamId = String(team?.id || team?.team_id || '')
            const teamColor = teamColorById.get(teamId) || buildTeamColor(teamId)
            return (
              <li key={teamId || String(team?.name || '')}>
                <span className="blindhike-admin-legend-dot" style={{ backgroundColor: teamColor }} aria-hidden="true" />
                <span>{String(team?.name || '-')}</span>
              </li>
            )
          })}
        </ul>
      </aside>
    </div>
  )
}
