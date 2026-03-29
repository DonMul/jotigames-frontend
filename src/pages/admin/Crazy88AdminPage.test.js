import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import Crazy88AdminPage from './Crazy88AdminPage'
import Crazy88SettingsPage from './Crazy88SettingsPage'
import Crazy88TaskFormPage from './Crazy88TaskFormPage'

const listSource = readFileSync(
  resolve(process.cwd(), 'src/pages/admin/Crazy88AdminPage.jsx'),
  'utf8',
)
const settingsSource = readFileSync(
  resolve(process.cwd(), 'src/pages/admin/Crazy88SettingsPage.jsx'),
  'utf8',
)
const formSource = readFileSync(
  resolve(process.cwd(), 'src/pages/admin/Crazy88TaskFormPage.jsx'),
  'utf8',
)

describe('Crazy88AdminPage', () => {
  it('exports a default function component', () => {
    expect(typeof Crazy88AdminPage).toBe('function')
  })

  it('uses route params for gameId', () => {
    expect(listSource).toContain('useParams')
    expect(listSource).toContain('gameId')
  })

  it('lists and deletes tasks', () => {
    expect(listSource).toContain('moduleApi.getCrazy88Tasks')
    expect(listSource).toContain('moduleApi.deleteCrazy88Task')
  })

  it('supports task judging', () => {
    expect(listSource).toContain('moduleApi.judgeCrazy88Submission')
  })

  it('supports file export', () => {
    expect(listSource).toContain('moduleApi.exportCrazy88Files')
  })

  it('supports review loading', () => {
    expect(listSource).toContain('moduleApi.getCrazy88Reviews')
  })

  it('uses auth context for API calls', () => {
    expect(listSource).toContain('useAuth')
    expect(listSource).toContain('auth.token')
  })
})

describe('Crazy88SettingsPage', () => {
  it('exports a default function component', () => {
    expect(typeof Crazy88SettingsPage).toBe('function')
  })

  it('calls moduleApi methods for config', () => {
    expect(settingsSource).toContain('moduleApi.getCrazy88Config')
    expect(settingsSource).toContain('moduleApi.updateCrazy88Config')
  })
})

describe('Crazy88TaskFormPage', () => {
  it('exports a default function component', () => {
    expect(typeof Crazy88TaskFormPage).toBe('function')
  })

  it('integrates with GeoLocationPicker', () => {
    expect(formSource).toContain('GeoLocationPicker')
  })

  it('calls moduleApi CRUD methods for tasks', () => {
    expect(formSource).toContain('moduleApi.createCrazy88Task')
    expect(formSource).toContain('moduleApi.updateCrazy88Task')
  })
})
