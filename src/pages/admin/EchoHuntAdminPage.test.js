import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import EchoHuntAdminPage from './EchoHuntAdminPage'

const source = readFileSync(
  resolve(process.cwd(), 'src/pages/admin/EchoHuntAdminPage.jsx'),
  'utf8',
)
const formSource = readFileSync(
  resolve(process.cwd(), 'src/pages/admin/EchoHuntBeaconFormPage.jsx'),
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

  it('integrates with AdminOverviewMap on overview and GeoLocationPicker on form', () => {
    expect(source).toContain('AdminOverviewMap')
    expect(formSource).toContain('GeoLocationPicker')
  })

  it('calls moduleApi methods for list/delete on overview', () => {
    expect(source).toContain('moduleApi.getEchoHuntBeacons')
    expect(source).toContain('moduleApi.deleteEchoHuntBeacon')
  })

  it('calls moduleApi create/update methods on beacon form page', () => {
    expect(formSource).toContain('moduleApi.createEchoHuntBeacon')
    expect(formSource).toContain('moduleApi.updateEchoHuntBeacon')
    expect(formSource).toContain('moduleApi.getEchoHuntBeacon')
  })

  it('uses auth context for API calls', () => {
    expect(source).toContain('useAuth')
    expect(source).toContain('auth.token')
  })
})
