import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'
import 'leaflet/dist/leaflet.css'

const FALLBACK_CENTER = [52.1326, 5.2913]

let markerDefaultsConfigured = false

function configureDefaultMarkerIcons() {
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

function parseCoordinate(value) {
  if (value === '' || value === null || value === undefined) {
    return null
  }

  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

export default function GeoLocationPicker({
  latitude,
  longitude,
  onChange,
  ariaLabel,
  className = 'game-map game-map-compact',
  markerZoom = 15,
  browserZoom = 14,
}) {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const onChangeRef = useRef(onChange)

  function getSafeZoom(value, fallbackZoom) {
    return Number.isFinite(value) ? value : fallbackZoom
  }

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return
    }

    configureDefaultMarkerIcons()

    const map = L.map(mapContainerRef.current)
    mapRef.current = map
    map.setView(FALLBACK_CENTER, 8)

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors',
      maxZoom: 19,
    }).addTo(map)

    map.on('click', (event) => {
      if (typeof onChangeRef.current === 'function') {
        onChangeRef.current(event.latlng.lat.toFixed(7), event.latlng.lng.toFixed(7))
      }
    })

    return () => {
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
      markerRef.current = null
    }
  }, [])

  useEffect(() => {
    if (!mapRef.current) {
      return
    }

    const map = mapRef.current
    const parsedLat = parseCoordinate(latitude)
    const parsedLon = parseCoordinate(longitude)

    if (parsedLat !== null && parsedLon !== null) {
      if (!markerRef.current) {
        markerRef.current = L.marker([parsedLat, parsedLon]).addTo(map)
      } else if (markerRef.current) {
        markerRef.current.setLatLng([parsedLat, parsedLon])
      }
      const nextZoom = Math.max(getSafeZoom(map.getZoom(), markerZoom), markerZoom)
      map.setView([parsedLat, parsedLon], nextZoom)
      return
    }

    if (markerRef.current) {
      markerRef.current.remove()
      markerRef.current = null
    }

    if (!navigator.geolocation) {
      map.setView(FALLBACK_CENTER, 8)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!mapRef.current || markerRef.current) {
          return
        }
        mapRef.current.setView([position.coords.latitude, position.coords.longitude], browserZoom)
      },
      () => {
        if (!mapRef.current || markerRef.current) {
          return
        }
        mapRef.current.setView(FALLBACK_CENTER, 8)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 },
    )
  }, [latitude, longitude, markerZoom, browserZoom])

  useEffect(() => {
    if (!mapRef.current) {
      return
    }

    const timer = setTimeout(() => {
      mapRef.current?.invalidateSize(false)
    }, 0)

    return () => clearTimeout(timer)
  }, [latitude, longitude])

  return <div ref={mapContainerRef} className={className} aria-label={ariaLabel} />
}
