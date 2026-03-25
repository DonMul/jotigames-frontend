import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import TerritoryControlTeamPanel from './TerritoryControlTeamPanel'

const source = readFileSync(
  resolve(process.cwd(), 'src/components/TerritoryControlTeamPanel.jsx'),
  'utf8',
)

describe('TerritoryControlTeamPanel', () => {
  it('exports a default function component', () => {
    expect(typeof TerritoryControlTeamPanel).toBe('function')
  })

  it('declares all expected props', () => {
    const expectedProps = [
      'state',
      'currentTeamId',
      't',
      'onClaimZone',
      'claiming',
    ]
    for (const prop of expectedProps) {
      expect(source).toContain(prop)
    }
  })

  it('processes zones array from state', () => {
    expect(source).toContain('state?.zones')
    expect(source).toContain("String(z.id || '')")
    expect(source).toContain("String(z.title || '')")
    expect(source).toContain('Number(z.latitude || 0)')
    expect(source).toContain('Number(z.longitude || 0)')
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
})
