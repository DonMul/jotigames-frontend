import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import GeoHunterAdminPage from './GeoHunterAdminPage'
import GeoHunterPoiFormPage from './GeoHunterPoiFormPage'
import GeoHunterSettingsPage from './GeoHunterSettingsPage'

const listSource = readFileSync(
  resolve(process.cwd(), 'src/pages/admin/GeoHunterAdminPage.jsx'),
  'utf8',
)
const formSource = readFileSync(
  resolve(process.cwd(), 'src/pages/admin/GeoHunterPoiFormPage.jsx'),
  'utf8',
)
const settingsSource = readFileSync(
  resolve(process.cwd(), 'src/pages/admin/GeoHunterSettingsPage.jsx'),
  'utf8',
)

describe('GeoHunterAdminPage', () => {
  it('exports a default function component', () => {
    expect(typeof GeoHunterAdminPage).toBe('function')
  })

  it('uses route params for gameId', () => {
    expect(listSource).toContain('useParams')
    expect(listSource).toContain('gameId')
  })

  it('lists and deletes POIs', () => {
    expect(listSource).toContain('moduleApi.getGeoHunterPois')
    expect(listSource).toContain('moduleApi.deleteGeoHunterPoi')
  })

  it('uses auth context for API calls', () => {
    expect(listSource).toContain('useAuth')
    expect(listSource).toContain('auth.token')
  })
})

describe('GeoHunterPoiFormPage', () => {
  it('exports a default function component', () => {
    expect(typeof GeoHunterPoiFormPage).toBe('function')
  })

  it('integrates with GeoLocationPicker', () => {
    expect(formSource).toContain('GeoLocationPicker')
  })

  it('calls moduleApi CRUD methods for POIs', () => {
    expect(formSource).toContain('moduleApi.createGeoHunterPoi')
    expect(formSource).toContain('moduleApi.updateGeoHunterPoi')
  })
})

describe('GeoHunterSettingsPage', () => {
  it('exports a default function component', () => {
    expect(typeof GeoHunterSettingsPage).toBe('function')
  })

  it('supports retry settings', () => {
    expect(settingsSource).toContain('moduleApi.updateGeoHunterRetrySettings')
    expect(settingsSource).toContain('visibilityMode')
    expect(settingsSource).toContain('geohunter.admin.visibility_mode')
  })
})
