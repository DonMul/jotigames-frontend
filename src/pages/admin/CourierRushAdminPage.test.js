import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import CourierRushAdminPage from './CourierRushAdminPage'

const source = readFileSync(
  resolve(process.cwd(), 'src/pages/admin/CourierRushAdminPage.jsx'),
  'utf8',
)

describe('CourierRushAdminPage', () => {
  it('exports a default function component', () => {
    expect(typeof CourierRushAdminPage).toBe('function')
  })

  it('uses route params for gameId', () => {
    expect(source).toContain('useParams')
    expect(source).toContain('gameId')
  })

  it('integrates with GeoLocationPicker', () => {
    expect(source).toContain('GeoLocationPicker')
  })

  it('calls moduleApi methods for config', () => {
    expect(source).toContain('moduleApi.getCourierRushConfig')
    expect(source).toContain('moduleApi.updateCourierRushConfig')
  })

  it('calls moduleApi CRUD methods for pickups', () => {
    expect(source).toContain('moduleApi.getCourierRushPickups')
    expect(source).toContain('moduleApi.createCourierRushPickup')
    expect(source).toContain('moduleApi.updateCourierRushPickup')
    expect(source).toContain('moduleApi.deleteCourierRushPickup')
  })

  it('calls moduleApi CRUD methods for dropoffs', () => {
    expect(source).toContain('moduleApi.getCourierRushDropoffs')
    expect(source).toContain('moduleApi.createCourierRushDropoff')
    expect(source).toContain('moduleApi.updateCourierRushDropoff')
    expect(source).toContain('moduleApi.deleteCourierRushDropoff')
  })

  it('uses auth context for API calls', () => {
    expect(source).toContain('useAuth')
    expect(source).toContain('auth.token')
  })
})
