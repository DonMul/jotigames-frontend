import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import EchoHuntAdminPage from './EchoHuntAdminPage'

const source = readFileSync(
  resolve(process.cwd(), 'src/pages/admin/EchoHuntAdminPage.jsx'),
  'utf8',
)

describe('EchoHuntAdminPage', () => {
  it('exports a default function component', () => {
    expect(typeof EchoHuntAdminPage).toBe('function')
  })

  it('uses route params for gameId', () => {
    expect(source).toContain('useParams')
    expect(source).toContain('gameId')
  })

  it('integrates with GeoLocationPicker', () => {
    expect(source).toContain('GeoLocationPicker')
  })

  it('calls moduleApi CRUD methods for beacons', () => {
    expect(source).toContain('moduleApi.getEchoHuntBeacons')
    expect(source).toContain('moduleApi.createEchoHuntBeacon')
    expect(source).toContain('moduleApi.updateEchoHuntBeacon')
    expect(source).toContain('moduleApi.deleteEchoHuntBeacon')
  })

  it('uses auth context for API calls', () => {
    expect(source).toContain('useAuth')
    expect(source).toContain('auth.token')
  })
})
