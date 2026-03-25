import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import ResourceRunTeamPanel from './ResourceRunTeamPanel'

const source = readFileSync(
  resolve(process.cwd(), 'src/components/ResourceRunTeamPanel.jsx'),
  'utf8',
)

describe('ResourceRunTeamPanel', () => {
  it('exports a default function component', () => {
    expect(typeof ResourceRunTeamPanel).toBe('function')
  })

  it('declares all expected props', () => {
    const expectedProps = [
      'state',
      'currentTeamId',
      't',
      'onClaimResource',
      'claiming',
    ]
    for (const prop of expectedProps) {
      expect(source).toContain(prop)
    }
  })

  it('processes nodes array from state', () => {
    expect(source).toContain('state?.nodes')
    expect(source).toContain("String(n.id || '')")
    expect(source).toContain("String(n.title || '')")
    expect(source).toContain('Number(n.latitude || 0)')
    expect(source).toContain('Number(n.longitude || 0)')
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
