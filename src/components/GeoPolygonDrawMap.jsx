import { useEffect, useMemo, useRef, useState } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import {
  attachUserLocationCentering,
  configureLeafletDefaultMarkerIcons,
  createLeafletTileLayer,
} from './shared/leafletMapCommon'

const FALLBACK_CENTER = [52.1326, 5.2913]

function parsePolygonValue(value) {
  if (!value) {
    return []
  }

  try {
    const data = typeof value === 'string' ? JSON.parse(value) : value
    let geometry = data

    if (geometry?.type === 'Feature') {
      geometry = geometry?.geometry
    }

    if (geometry?.type === 'FeatureCollection' && Array.isArray(geometry?.features)) {
      const polygonFeature = geometry.features.find((feature) => {
        const featureType = feature?.geometry?.type || feature?.type
        return featureType === 'Polygon'
      })
      geometry = polygonFeature?.geometry || polygonFeature
    }

    if (geometry?.type !== 'Polygon' || !Array.isArray(geometry?.coordinates?.[0])) {
      return []
    }

    const ring = geometry.coordinates[0]
    const points = []
    for (let index = 0; index < ring.length; index += 1) {
      const [lon, lat] = ring[index] || []
      const parsedLat = Number(lat)
      const parsedLon = Number(lon)
      if (!Number.isFinite(parsedLat) || !Number.isFinite(parsedLon)) {
        continue
      }
      points.push([parsedLat, parsedLon])
    }

    if (points.length >= 2) {
      const first = points[0]
      const last = points[points.length - 1]
      if (first[0] === last[0] && first[1] === last[1]) {
        points.pop()
      }
    }

    return points
  } catch {
    return []
  }
}

function buildPolygonValue(points) {
  if (!Array.isArray(points) || points.length < 3) {
    return ''
  }

  const ring = points.map(([lat, lon]) => [Number(lon), Number(lat)])
  const first = ring[0]
  ring.push([first[0], first[1]])

  return JSON.stringify({
    type: 'Polygon',
    coordinates: [ring],
  })
}

function pointToSegmentDistanceSquared(point, from, to) {
  const pointLat = Number(point?.[0] || 0)
  const pointLon = Number(point?.[1] || 0)
  const fromLat = Number(from?.[0] || 0)
  const fromLon = Number(from?.[1] || 0)
  const toLat = Number(to?.[0] || 0)
  const toLon = Number(to?.[1] || 0)

  const segmentLat = toLat - fromLat
  const segmentLon = toLon - fromLon
  const segmentLengthSquared = segmentLat * segmentLat + segmentLon * segmentLon
  if (segmentLengthSquared <= 0) {
    const deltaLat = pointLat - fromLat
    const deltaLon = pointLon - fromLon
    return deltaLat * deltaLat + deltaLon * deltaLon
  }

  let projection = ((pointLat - fromLat) * segmentLat + (pointLon - fromLon) * segmentLon) / segmentLengthSquared
  projection = Math.max(0, Math.min(1, projection))

  const projectedLat = fromLat + projection * segmentLat
  const projectedLon = fromLon + projection * segmentLon
  const deltaLat = pointLat - projectedLat
  const deltaLon = pointLon - projectedLon
  return deltaLat * deltaLat + deltaLon * deltaLon
}

function insertPointIntoPolygon(points, nextPoint) {
  if (!Array.isArray(points) || points.length === 0) {
    return [nextPoint]
  }
  if (points.length < 3) {
    return [...points, nextPoint]
  }

  let bestSegmentStartIndex = 0
  let bestDistance = Number.POSITIVE_INFINITY
  for (let index = 0; index < points.length; index += 1) {
    const nextIndex = (index + 1) % points.length
    const distance = pointToSegmentDistanceSquared(nextPoint, points[index], points[nextIndex])
    if (distance < bestDistance) {
      bestDistance = distance
      bestSegmentStartIndex = index
    }
  }

  const inserted = [...points]
  inserted.splice(bestSegmentStartIndex + 1, 0, nextPoint)
  return inserted
}

export default function GeoPolygonDrawMap({
  value,
  onChange,
  ariaLabel,
  className = 'game-map blindhike-admin-overview-map',
}) {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const layerRef = useRef(null)
  const pointsRef = useRef([])
  const isMarkerDragActiveRef = useRef(false)
  const onChangeRef = useRef(onChange)
  const [rawValue, setRawValue] = useState(String(value || ''))
  const parsedPoints = useMemo(() => parsePolygonValue(rawValue), [rawValue])
  const shouldUserCenterRef = useRef(parsedPoints.length === 0)

  function emitRawValue(nextRawValue) {
    setRawValue(nextRawValue)
    if (typeof onChangeRef.current === 'function') {
      onChangeRef.current(nextRawValue)
    }
  }

  function emitPoints(nextPoints) {
    pointsRef.current = nextPoints
    emitRawValue(buildPolygonValue(nextPoints))
  }

  function drawPoints(map, layer, points, { adjustViewport = true } = {}) {
    if (!isMarkerDragActiveRef.current && map.dragging && !map.dragging.enabled()) {
      map.dragging.enable()
    }

    layer.clearLayers()

    if (points.length >= 2) {
      L.polyline(points, {
        color: '#f97316',
        weight: 2,
      }).addTo(layer)
    }

    if (points.length >= 3) {
      L.polygon(points, {
        color: '#f97316',
        fillColor: '#f97316',
        fillOpacity: 0.15,
        weight: 2,
      }).addTo(layer)
    }

    points.forEach((point, index) => {
      const marker = L.marker(point, {
        draggable: true,
        icon: L.divIcon({
          className: 'geo-polygon-vertex-marker',
          html: '<span style="display:block;width:10px;height:10px;border-radius:9999px;background:#f97316;border:1px solid #ea580c;"></span>',
          iconSize: [10, 10],
          iconAnchor: [5, 5],
        }),
      }).addTo(layer)

      marker.on('drag', (event) => {
        const draggedPoint = [event.latlng.lat, event.latlng.lng]
        const nextPoints = [...pointsRef.current]
        nextPoints[index] = draggedPoint
        pointsRef.current = nextPoints
      })

      marker.on('dragstart', () => {
        isMarkerDragActiveRef.current = true
        if (map.dragging?.enabled()) {
          map.dragging.disable()
        }
      })

      marker.on('dragend', () => {
        isMarkerDragActiveRef.current = false
        if (map.dragging && !map.dragging.enabled()) {
          map.dragging.enable()
        }
        emitPoints([...pointsRef.current])
      })

      marker.on('dblclick', (event) => {
        if (event?.originalEvent) {
          L.DomEvent.stop(event.originalEvent)
        }
        const nextPoints = [...pointsRef.current]
        nextPoints.splice(index, 1)
        emitPoints(nextPoints)
        drawPoints(map, layer, nextPoints, { adjustViewport: false })
      })
    })

    if (!adjustViewport) {
      return
    }

    if (points.length > 1) {
      map.fitBounds(points, { padding: [24, 24], maxZoom: 15 })
    } else if (points.length === 1) {
      map.setView(points[0], Math.max(map.getZoom(), 15))
    }
  }

  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  useEffect(() => {
    setRawValue(String(value || ''))
  }, [value])

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) {
      return
    }

    configureLeafletDefaultMarkerIcons()

    const map = L.map(mapContainerRef.current, {
      center: FALLBACK_CENTER,
      zoom: 15,
      minZoom: 3,
      maxZoom: 19,
    })
    mapRef.current = map

    createLeafletTileLayer().addTo(map)

    layerRef.current = L.layerGroup().addTo(map)

    const detachUserCentering = shouldUserCenterRef.current
      ? attachUserLocationCentering(map, {
          zoom: 15,
          follow: true,
          maximumAge: 60000,
        })
      : () => {}

    map.on('click', (event) => {
      const nextPoint = [event.latlng.lat, event.latlng.lng]
      const nextPoints = insertPointIntoPolygon(pointsRef.current, nextPoint)
      emitPoints(nextPoints)
      if (layerRef.current) {
        drawPoints(map, layerRef.current, nextPoints, { adjustViewport: false })
      }
    })

    return () => {
      detachUserCentering()
      isMarkerDragActiveRef.current = false
      if (mapRef.current?.dragging && !mapRef.current.dragging.enabled()) {
        mapRef.current.dragging.enable()
      }
      if (mapRef.current) {
        mapRef.current.remove()
        mapRef.current = null
      }
      layerRef.current = null
    }
  }, [])

  useEffect(() => {
    pointsRef.current = parsedPoints

    if (!mapRef.current || !layerRef.current) {
      return
    }

    const map = mapRef.current
    const layer = layerRef.current

    drawPoints(map, layer, parsedPoints)

    const frameId = window.requestAnimationFrame(() => {
      map.invalidateSize(false)
    })
    const timeoutId = window.setTimeout(() => {
      map.invalidateSize(false)
    }, 120)

    return () => {
      window.cancelAnimationFrame(frameId)
      window.clearTimeout(timeoutId)
    }
  }, [parsedPoints])

  return <div ref={mapContainerRef} className={className} aria-label={ariaLabel} />
}
