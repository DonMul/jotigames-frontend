import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

import { toAssetUrl } from '../../lib/assetUrl'

let markerDefaultsConfigured = false

export function configureLeafletDefaultMarkerIcons() {
  if (markerDefaultsConfigured) {
    return
  }

  delete L.Icon.Default.prototype._getIconUrl
  L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
  })

  markerDefaultsConfigured = true
}

export function toNumberOrNull(value) {
  if (value === null || value === undefined) {
    return null
  }
  if (typeof value === 'string' && value.trim() === '') {
    return null
  }
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

export function createTeamLogoIcon(logoPath) {
  const logoUrl = toAssetUrl(logoPath)
  if (!logoUrl) {
    return null
  }
  return L.icon({
    iconUrl: logoUrl,
    iconSize: [36, 36],
    iconAnchor: [18, 18],
    className: 'geo-team-icon',
  })
}

export function attachUserLocationCentering(map, options = {}) {
  if (!map || !navigator.geolocation) {
    return () => {}
  }

  const {
    zoom = 19,
    follow = true,
    enableHighAccuracy = true,
    maximumAge = 5000,
    timeout = 10000,
    onFirstCenter,
  } = options

  let hasCentered = false

  const centerFromPosition = (position) => {
    if (!map || !position?.coords) {
      return
    }

    const latitude = Number(position.coords.latitude)
    const longitude = Number(position.coords.longitude)
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return
    }

    const targetZoom = Math.min(19, Math.max(0, Number(zoom) || 19))
    map.setView([latitude, longitude], targetZoom)

    if (!hasCentered) {
      hasCentered = true
      if (typeof onFirstCenter === 'function') {
        onFirstCenter([latitude, longitude])
      }
    }
  }

  navigator.geolocation.getCurrentPosition(
    centerFromPosition,
    () => {},
    { enableHighAccuracy, maximumAge, timeout },
  )

  let watchId = null
  if (follow) {
    watchId = navigator.geolocation.watchPosition(
      centerFromPosition,
      () => {},
      { enableHighAccuracy, maximumAge, timeout },
    )
  }

  return () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId)
    }
  }
}
