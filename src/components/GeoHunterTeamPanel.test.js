import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import GeoHunterTeamPanel from './GeoHunterTeamPanel'

const source = readFileSync(
  resolve(process.cwd(), 'src/components/GeoHunterTeamPanel.jsx'),
  'utf8',
)

describe('GeoHunterTeamPanel', () => {
  it('exports a default function component', () => {
    expect(typeof GeoHunterTeamPanel).toBe('function')
  })

  it('declares all expected props', () => {
    const expectedProps = [
      'state',
      'currentTeamId',
      't',
      'onAnswerQuestion',
      'answering',
    ]
    for (const prop of expectedProps) {
      expect(source).toContain(prop)
    }
  })

  it('processes pois array from state', () => {
    expect(source).toContain('state?.pois')
    expect(source).toContain("String(p.id || '')")
    expect(source).toContain("String(p.title || '')")
    expect(source).toContain('Number(p.latitude || 0)')
    expect(source).toContain('Number(p.longitude || 0)')
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

  it('supports question types with choices', () => {
    expect(source).toContain('question_type')
    expect(source).toContain('question_text')
    expect(source).toContain('choices')
    expect(source).toContain('selectedChoice')
  })

  it('supports open answer input', () => {
    expect(source).toContain('openAnswer')
    expect(source).toContain('setOpenAnswer')
  })
})
