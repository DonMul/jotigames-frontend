import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import GeoHunterAdminPage from './GeoHunterAdminPage'

const source = readFileSync(
  resolve(process.cwd(), 'src/pages/admin/GeoHunterAdminPage.jsx'),
  'utf8',
)

describe('GeoHunterAdminPage', () => {
  it('exports a default function component', () => {
    expect(typeof GeoHunterAdminPage).toBe('function')
  })

  it('uses route params for gameId', () => {
    expect(source).toContain('useParams')
    expect(source).toContain('gameId')
  })

  it('integrates with GeoLocationPicker', () => {
    expect(source).toContain('GeoLocationPicker')
  })

  it('calls moduleApi CRUD methods for POIs', () => {
    expect(source).toContain('moduleApi.getGeoHunterPois')
    expect(source).toContain('moduleApi.createGeoHunterPoi')
    expect(source).toContain('moduleApi.updateGeoHunterPoi')
    expect(source).toContain('moduleApi.deleteGeoHunterPoi')
  })

  it('supports retry settings', () => {
    expect(source).toContain('moduleApi.updateGeoHunterRetrySettings')
  })

  it('uses auth context for API calls', () => {
    expect(source).toContain('useAuth')
    expect(source).toContain('auth.token')
  })
})
