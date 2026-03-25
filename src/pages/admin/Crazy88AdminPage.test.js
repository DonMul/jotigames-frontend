import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import Crazy88AdminPage from './Crazy88AdminPage'

const source = readFileSync(
  resolve(process.cwd(), 'src/pages/admin/Crazy88AdminPage.jsx'),
  'utf8',
)

describe('Crazy88AdminPage', () => {
  it('exports a default function component', () => {
    expect(typeof Crazy88AdminPage).toBe('function')
  })

  it('uses route params for gameId', () => {
    expect(source).toContain('useParams')
    expect(source).toContain('gameId')
  })

  it('integrates with GeoLocationPicker', () => {
    expect(source).toContain('GeoLocationPicker')
  })

  it('calls moduleApi methods for config and tasks', () => {
    expect(source).toContain('moduleApi.getCrazy88Config')
    expect(source).toContain('moduleApi.getCrazy88Tasks')
    expect(source).toContain('moduleApi.createCrazy88Task')
    expect(source).toContain('moduleApi.updateCrazy88Task')
    expect(source).toContain('moduleApi.deleteCrazy88Task')
  })

  it('supports task judging', () => {
    expect(source).toContain('moduleApi.judgeCrazy88Submission')
  })

  it('supports file export', () => {
    expect(source).toContain('moduleApi.exportCrazy88Files')
  })

  it('supports review loading', () => {
    expect(source).toContain('moduleApi.getCrazy88Reviews')
  })

  it('uses auth context for API calls', () => {
    expect(source).toContain('useAuth')
    expect(source).toContain('auth.token')
  })
})
