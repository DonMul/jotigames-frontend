import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import ResourceRunAdminPage from './ResourceRunAdminPage'
import ResourceRunNodeFormPage from './ResourceRunNodeFormPage'

const listSource = readFileSync(
  resolve(process.cwd(), 'src/pages/admin/ResourceRunAdminPage.jsx'),
  'utf8',
)
const formSource = readFileSync(
  resolve(process.cwd(), 'src/pages/admin/ResourceRunNodeFormPage.jsx'),
  'utf8',
)

describe('ResourceRunAdminPage', () => {
  it('exports a default function component', () => {
    expect(typeof ResourceRunAdminPage).toBe('function')
  })

  it('uses route params for gameId', () => {
    expect(listSource).toContain('useParams')
    expect(listSource).toContain('gameId')
  })

  it('lists and deletes nodes', () => {
    expect(listSource).toContain('moduleApi.getResourceRunNodes')
    expect(listSource).toContain('moduleApi.deleteResourceRunNode')
  })

  it('uses auth context for API calls', () => {
    expect(listSource).toContain('useAuth')
    expect(listSource).toContain('auth.token')
  })
})

describe('ResourceRunNodeFormPage', () => {
  it('exports a default function component', () => {
    expect(typeof ResourceRunNodeFormPage).toBe('function')
  })

  it('integrates with GeoLocationPicker', () => {
    expect(formSource).toContain('GeoLocationPicker')
  })

  it('calls moduleApi CRUD methods for nodes', () => {
    expect(formSource).toContain('moduleApi.createResourceRunNode')
    expect(formSource).toContain('moduleApi.updateResourceRunNode')
  })
})
