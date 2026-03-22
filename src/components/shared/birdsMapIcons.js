import L from 'leaflet'

function hashSeed(input) {
  const raw = String(input || '')
  let hash = 2166136261
  for (let index = 0; index < raw.length; index += 1) {
    hash ^= raw.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return hash >>> 0
}

function createSeededRandom(seedInput) {
  let state = hashSeed(seedInput) || 1
  return () => {
    state += 0x6D2B79F5
    let mixed = Math.imul(state ^ (state >>> 15), 1 | state)
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), 61 | mixed)
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296
  }
}

export function buildEggIcon(color, eggKey) {
  const random = createSeededRandom(eggKey)
  const speckleCount = 4 + Math.floor(random() * 4)
  let speckles = ''
  for (let index = 0; index < speckleCount; index += 1) {
    const cx = (8.8 + random() * 10.4).toFixed(2)
    const cy = (14.5 + random() * 10.8).toFixed(2)
    const radius = (0.5 + random() * 0.7).toFixed(2)
    const alpha = (0.28 + random() * 0.2).toFixed(2)
    speckles += `<circle cx="${cx}" cy="${cy}" r="${radius}" fill="rgba(63,63,70,${alpha})"/>`
  }
  const highlightCx = (10.6 + random() * 2.2).toFixed(2)
  const highlightCy = (9.8 + random() * 2.2).toFixed(2)
  const highlightRx = (1.6 + random() * 0.7).toFixed(2)
  const highlightRy = (2.3 + random() * 0.8).toFixed(2)
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="42" viewBox="0 0 28 34"><path d="M14 2.8c-3.9 0-7.4 4.2-8.3 10.1-.9 5.7 1.4 15 8.3 18.1 6.9-3.1 9.2-12.4 8.3-18.1C21.4 7 17.9 2.8 14 2.8z" fill="${color}" stroke="#111827" stroke-width="1.35"/><ellipse cx="${highlightCx}" cy="${highlightCy}" rx="${highlightRx}" ry="${highlightRy}" fill="rgba(255,255,255,0.34)"/>${speckles}</svg>`
  return L.icon({
    iconUrl: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    iconSize: [34, 42],
    iconAnchor: [17, 31],
    popupAnchor: [0, -18],
  })
}
