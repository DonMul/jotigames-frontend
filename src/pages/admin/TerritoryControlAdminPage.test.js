import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import TerritoryControlAdminPage from './TerritoryControlAdminPage'
import TerritoryControlZoneFormPage from './TerritoryControlZoneFormPage'

const listSource = readFileSync(
  resolve(process.cwd(), 'src/pages/admin/TerritoryControlAdminPage.jsx'),
  'utf8',
)
const formSource = readFileSync(
  resolve(process.cwd(), 'src/pages/admin/TerritoryControlZoneFormPage.jsx'),
  'utf8',
)

describe('TerritoryControlAdminPage', () => {
  it('exports a default function component', () => {
    expect(typeof TerritoryControlAdminPage).toBe('function')
  })

  it('uses route params for gameId', () => {
    expect(listSource).toContain('useParams')
    expect(listSource).toContain('gameId')
  })

  it('lists and deletes zones', () => {
    expect(listSource).toContain('moduleApi.getTerritoryZones')
    expect(listSource).toContain('moduleApi.deleteTerritoryZone')
  })

  it('uses auth context for API calls', () => {
    expect(listSource).toContain('useAuth')
    expect(listSource).toContain('auth.token')
  })
})

describe('TerritoryControlZoneFormPage', () => {
  it('exports a default function component', () => {
    expect(typeof TerritoryControlZoneFormPage).toBe('function')
  })

  it('integrates with GeoLocationPicker', () => {
    expect(formSource).toContain('GeoLocationPicker')
  })

  it('calls moduleApi CRUD methods for zones', () => {
    expect(formSource).toContain('moduleApi.createTerritoryZone')
    expect(formSource).toContain('moduleApi.updateTerritoryZone')
  })
})
