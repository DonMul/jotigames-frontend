import { useEffect, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import {
  attachUserLocationCentering,
  createLeafletTileLayer,
  configureLeafletDefaultMarkerIcons,
  toNumberOrNull,
} from './shared/leafletMapCommon'

const FALLBACK_CENTER = [52.1326, 5.2913]

function parseCoordinate(value) {
  return toNumberOrNull(value)
}

export default function GeoLocationPicker({
  latitude,
  longitude,
  onChange,
  ariaLabel,
  className = 'game-map game-map-compact',
  markerZoom = 15,
  browserZoom = 15,
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

    configureLeafletDefaultMarkerIcons()

    const map = L.map(mapContainerRef.current)
    mapRef.current = map
    map.setView(FALLBACK_CENTER, 15)

    createLeafletTileLayer().addTo(map)

    const detachUserCentering = attachUserLocationCentering(map, {
      zoom: 15,
      follow: true,
      maximumAge: 60000,
    })

    map.on('click', (event) => {
      if (typeof onChangeRef.current === 'function') {
        onChangeRef.current(event.latlng.lat.toFixed(7), event.latlng.lng.toFixed(7))
      }
    })

    return () => {
      detachUserCentering()
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
      map.setView(FALLBACK_CENTER, 15)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!mapRef.current || markerRef.current) {
          return
        }
        mapRef.current.setView([position.coords.latitude, position.coords.longitude], getSafeZoom(browserZoom, 15))
      },
      () => {
        if (!mapRef.current || markerRef.current) {
          return
        }
        mapRef.current.setView(FALLBACK_CENTER, 15)
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
