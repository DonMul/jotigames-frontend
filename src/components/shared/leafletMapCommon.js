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
