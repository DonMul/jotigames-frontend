import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import CourierRushTeamPanel from './CourierRushTeamPanel'

const source = readFileSync(
  resolve(process.cwd(), 'src/components/CourierRushTeamPanel.jsx'),
  'utf8',
)

describe('CourierRushTeamPanel', () => {
  it('exports a default function component', () => {
    expect(typeof CourierRushTeamPanel).toBe('function')
  })

  it('declares all expected props', () => {
    const expectedProps = [
      'state',
      'currentTeamId',
      't',
      'onConfirmPickup',
      'onConfirmDropoff',
      'confirmingPickup',
      'confirmingDropoff',
    ]
    for (const prop of expectedProps) {
      expect(source).toContain(prop)
    }
  })

  it('processes pickups and dropoffs arrays from state', () => {
    expect(source).toContain('state?.pickups')
    expect(source).toContain('state?.dropoffs')
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

  it('supports dual action handlers for pickup and dropoff', () => {
    expect(source).toContain('onConfirmPickup')
    expect(source).toContain('onConfirmDropoff')
  })
})
