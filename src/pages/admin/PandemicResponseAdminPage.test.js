import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import PandemicResponseAdminPage from './PandemicResponseAdminPage'

const source = readFileSync(
  resolve(process.cwd(), 'src/pages/admin/PandemicResponseAdminPage.jsx'),
  'utf8',
)

describe('PandemicResponseAdminPage', () => {
  it('exports a default function component', () => {
    expect(typeof PandemicResponseAdminPage).toBe('function')
  })

  it('uses route params for gameId', () => {
    expect(source).toContain('useParams')
    expect(source).toContain('gameId')
  })

  it('integrates with GeoLocationPicker', () => {
    expect(source).toContain('GeoLocationPicker')
  })

  it('calls moduleApi methods for config and state', () => {
    expect(source).toContain('moduleApi.getPandemicResponseConfig')
    expect(source).toContain('moduleApi.updatePandemicResponseConfig')
    expect(source).toContain('moduleApi.getPandemicResponseAdminState')
  })

  it('uses auth context for API calls', () => {
    expect(source).toContain('useAuth')
    expect(source).toContain('auth.token')
  })
})
