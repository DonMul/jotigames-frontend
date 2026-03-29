import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import CourierRushAdminPage from './CourierRushAdminPage'
import CourierRushSettingsPage from './CourierRushSettingsPage'
import CourierRushPickupFormPage from './CourierRushPickupFormPage'
import CourierRushDropoffFormPage from './CourierRushDropoffFormPage'

const listSource = readFileSync(
  resolve(process.cwd(), 'src/pages/admin/CourierRushAdminPage.jsx'),
  'utf8',
)
const settingsSource = readFileSync(
  resolve(process.cwd(), 'src/pages/admin/CourierRushSettingsPage.jsx'),
  'utf8',
)
const pickupFormSource = readFileSync(
  resolve(process.cwd(), 'src/pages/admin/CourierRushPickupFormPage.jsx'),
  'utf8',
)
const dropoffFormSource = readFileSync(
  resolve(process.cwd(), 'src/pages/admin/CourierRushDropoffFormPage.jsx'),
  'utf8',
)

describe('CourierRushAdminPage', () => {
  it('exports a default function component', () => {
    expect(typeof CourierRushAdminPage).toBe('function')
  })

  it('uses route params for gameId', () => {
    expect(listSource).toContain('useParams')
    expect(listSource).toContain('gameId')
  })

  it('lists and deletes pickups', () => {
    expect(listSource).toContain('moduleApi.getCourierRushPickups')
    expect(listSource).toContain('moduleApi.deleteCourierRushPickup')
  })

  it('lists and deletes dropoffs', () => {
    expect(listSource).toContain('moduleApi.getCourierRushDropoffs')
    expect(listSource).toContain('moduleApi.deleteCourierRushDropoff')
  })

  it('uses auth context for API calls', () => {
    expect(listSource).toContain('useAuth')
    expect(listSource).toContain('auth.token')
  })
})

describe('CourierRushSettingsPage', () => {
  it('exports a default function component', () => {
    expect(typeof CourierRushSettingsPage).toBe('function')
  })

  it('calls moduleApi methods for config', () => {
    expect(settingsSource).toContain('moduleApi.getCourierRushConfig')
    expect(settingsSource).toContain('moduleApi.updateCourierRushConfig')
  })
})

describe('CourierRushPickupFormPage', () => {
  it('exports a default function component', () => {
    expect(typeof CourierRushPickupFormPage).toBe('function')
  })

  it('integrates with GeoLocationPicker', () => {
    expect(pickupFormSource).toContain('GeoLocationPicker')
  })

  it('calls moduleApi CRUD methods for pickups', () => {
    expect(pickupFormSource).toContain('moduleApi.createCourierRushPickup')
    expect(pickupFormSource).toContain('moduleApi.updateCourierRushPickup')
  })
})

describe('CourierRushDropoffFormPage', () => {
  it('exports a default function component', () => {
    expect(typeof CourierRushDropoffFormPage).toBe('function')
  })

  it('integrates with GeoLocationPicker', () => {
    expect(dropoffFormSource).toContain('GeoLocationPicker')
  })

  it('calls moduleApi CRUD methods for dropoffs', () => {
    expect(dropoffFormSource).toContain('moduleApi.createCourierRushDropoff')
    expect(dropoffFormSource).toContain('moduleApi.updateCourierRushDropoff')
  })
})
