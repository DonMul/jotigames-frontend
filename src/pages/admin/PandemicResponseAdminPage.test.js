import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import PandemicResponseAdminPage from './PandemicResponseAdminPage'
import PandemicResponseSettingsPage from './PandemicResponseSettingsPage'

const listSource = readFileSync(
  resolve(process.cwd(), 'src/pages/admin/PandemicResponseAdminPage.jsx'),
  'utf8',
)
const settingsSource = readFileSync(
  resolve(process.cwd(), 'src/pages/admin/PandemicResponseSettingsPage.jsx'),
  'utf8',
)

describe('PandemicResponseAdminPage', () => {
  it('exports a default function component', () => {
    expect(typeof PandemicResponseAdminPage).toBe('function')
  })

  it('uses route params for gameId', () => {
    expect(listSource).toContain('useParams')
    expect(listSource).toContain('gameId')
  })

  it('loads admin state', () => {
    expect(listSource).toContain('moduleApi.getPandemicResponseAdminState')
  })

  it('uses auth context for API calls', () => {
    expect(listSource).toContain('useAuth')
    expect(listSource).toContain('auth.token')
  })
})

describe('PandemicResponseSettingsPage', () => {
  it('exports a default function component', () => {
    expect(typeof PandemicResponseSettingsPage).toBe('function')
  })

  it('integrates with GeoPolygonDrawMap', () => {
    expect(settingsSource).toContain('GeoPolygonDrawMap')
  })

  it('calls moduleApi methods for config', () => {
    expect(settingsSource).toContain('moduleApi.getPandemicResponseConfig')
    expect(settingsSource).toContain('moduleApi.updatePandemicResponseConfig')
  })
})
