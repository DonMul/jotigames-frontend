import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import EchoHuntTeamPanel from './EchoHuntTeamPanel'

const source = readFileSync(
  resolve(process.cwd(), 'src/components/EchoHuntTeamPanel.jsx'),
  'utf8',
)

describe('EchoHuntTeamPanel', () => {
  it('exports a default function component', () => {
    expect(typeof EchoHuntTeamPanel).toBe('function')
  })

  it('declares all expected props', () => {
    const expectedProps = [
      'state',
      'currentTeamId',
      't',
      'onClaimBeacon',
      'claiming',
    ]
    for (const prop of expectedProps) {
      expect(source).toContain(prop)
    }
  })

  it('processes beacons array from state', () => {
    expect(source).toContain('state?.beacons')
    expect(source).toContain("String(b.id || '')")
    expect(source).toContain("String(b.title || '')")
    expect(source).toContain('Number(b.latitude || 0)')
    expect(source).toContain('Number(b.longitude || 0)')
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
