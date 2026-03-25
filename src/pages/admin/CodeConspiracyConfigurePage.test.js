import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import CodeConspiracyConfigurePage from './CodeConspiracyConfigurePage'

const source = readFileSync(
  resolve(process.cwd(), 'src/pages/admin/CodeConspiracyConfigurePage.jsx'),
  'utf8',
)

describe('CodeConspiracyConfigurePage', () => {
  it('exports a default function component', () => {
    expect(typeof CodeConspiracyConfigurePage).toBe('function')
  })

  it('uses route params for gameId', () => {
    expect(source).toContain('useParams')
    expect(source).toContain('gameId')
  })

  it('calls moduleApi methods for config management', () => {
    expect(source).toContain('moduleApi.getCodeConspiracyConfig')
    expect(source).toContain('moduleApi.updateCodeConspiracyConfig')
  })

  it('supports ending the game', () => {
    expect(source).toContain('moduleApi.endCodeConspiracyGame')
  })

  it('uses auth context for API calls', () => {
    expect(source).toContain('useAuth')
    expect(source).toContain('auth.token')
  })
})
