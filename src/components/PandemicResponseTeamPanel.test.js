import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import PandemicResponseTeamPanel from './PandemicResponseTeamPanel'

const source = readFileSync(
  resolve(process.cwd(), 'src/components/PandemicResponseTeamPanel.jsx'),
  'utf8',
)

describe('PandemicResponseTeamPanel', () => {
  it('exports a default function component', () => {
    expect(typeof PandemicResponseTeamPanel).toBe('function')
  })

  it('declares all expected props', () => {
    const expectedProps = [
      'state',
      'currentTeamId',
      't',
      'onCollectPickup',
      'onResolveHotspot',
      'collectingPickup',
      'resolvingHotspot',
    ]
    for (const prop of expectedProps) {
      expect(source).toContain(prop)
    }
  })

  it('processes hotspots and pickups arrays from state', () => {
    expect(source).toContain('state?.hotspots')
    expect(source).toContain('state?.pickups')
  })

  it('handles severity levels for hotspots', () => {
    expect(source).toContain('severity')
  })

  it('uses Leaflet for map rendering', () => {
    expect(source).toContain("import L from 'leaflet'")
    expect(source).toContain('mapContainerRef')
    expect(source).toContain('mapRef')
  })

  it('computes highscore from state', () => {
    expect(source).toContain('state?.highscore')
  })

  it('handles geolocation for proximity detection', () => {
    expect(source).toContain('navigator.geolocation')
    expect(source).toContain('setCurrentPosition')
  })

  it('supports dual action handlers for collect and resolve', () => {
    expect(source).toContain('onCollectPickup')
    expect(source).toContain('onResolveHotspot')
  })
})
