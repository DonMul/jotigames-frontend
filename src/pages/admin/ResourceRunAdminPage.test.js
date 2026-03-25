import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import ResourceRunAdminPage from './ResourceRunAdminPage'

const source = readFileSync(
  resolve(process.cwd(), 'src/pages/admin/ResourceRunAdminPage.jsx'),
  'utf8',
)

describe('ResourceRunAdminPage', () => {
  it('exports a default function component', () => {
    expect(typeof ResourceRunAdminPage).toBe('function')
  })

  it('uses route params for gameId', () => {
    expect(source).toContain('useParams')
    expect(source).toContain('gameId')
  })

  it('integrates with GeoLocationPicker', () => {
    expect(source).toContain('GeoLocationPicker')
  })

  it('calls moduleApi CRUD methods for nodes', () => {
    expect(source).toContain('moduleApi.getResourceRunNodes')
    expect(source).toContain('moduleApi.createResourceRunNode')
    expect(source).toContain('moduleApi.updateResourceRunNode')
    expect(source).toContain('moduleApi.deleteResourceRunNode')
  })

  it('uses auth context for API calls', () => {
    expect(source).toContain('useAuth')
    expect(source).toContain('auth.token')
  })
})
