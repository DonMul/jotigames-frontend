import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import CheckpointHeistTeamPanel from './CheckpointHeistTeamPanel'

const source = readFileSync(
  resolve(process.cwd(), 'src/components/CheckpointHeistTeamPanel.jsx'),
  'utf8',
)

describe('CheckpointHeistTeamPanel', () => {
  it('exports a default function component', () => {
    expect(typeof CheckpointHeistTeamPanel).toBe('function')
  })

  it('declares all expected props', () => {
    const expectedProps = [
      'state',
      'currentTeamId',
      't',
      'onCaptureCheckpoint',
      'capturing',
    ]
    for (const prop of expectedProps) {
      expect(source).toContain(prop)
    }
  })

  it('processes checkpoints array from state', () => {
    expect(source).toContain('state?.checkpoints')
    expect(source).toContain("String(cp.id || '')")
    expect(source).toContain("String(cp.title || '')")
    expect(source).toContain('Number(cp.latitude || 0)')
    expect(source).toContain('Number(cp.longitude || 0)')
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
