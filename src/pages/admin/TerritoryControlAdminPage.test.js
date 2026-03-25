import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import TerritoryControlAdminPage from './TerritoryControlAdminPage'

const source = readFileSync(
  resolve(process.cwd(), 'src/pages/admin/TerritoryControlAdminPage.jsx'),
  'utf8',
)

describe('TerritoryControlAdminPage', () => {
  it('exports a default function component', () => {
    expect(typeof TerritoryControlAdminPage).toBe('function')
  })

  it('uses route params for gameId', () => {
    expect(source).toContain('useParams')
    expect(source).toContain('gameId')
  })

  it('integrates with GeoLocationPicker', () => {
    expect(source).toContain('GeoLocationPicker')
  })

  it('calls moduleApi CRUD methods for zones', () => {
    expect(source).toContain('moduleApi.getTerritoryZones')
    expect(source).toContain('moduleApi.createTerritoryZone')
    expect(source).toContain('moduleApi.updateTerritoryZone')
    expect(source).toContain('moduleApi.deleteTerritoryZone')
  })

  it('uses auth context for API calls', () => {
    expect(source).toContain('useAuth')
    expect(source).toContain('auth.token')
  })
})
