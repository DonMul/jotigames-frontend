import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import CheckpointHeistAdminPage from './CheckpointHeistAdminPage'

const source = readFileSync(
  resolve(process.cwd(), 'src/pages/admin/CheckpointHeistAdminPage.jsx'),
  'utf8',
)

describe('CheckpointHeistAdminPage', () => {
  it('exports a default function component', () => {
    expect(typeof CheckpointHeistAdminPage).toBe('function')
  })

  it('uses route params for gameId', () => {
    expect(source).toContain('useParams')
    expect(source).toContain('gameId')
  })

  it('integrates with GeoLocationPicker', () => {
    expect(source).toContain('GeoLocationPicker')
  })

  it('calls moduleApi CRUD methods for checkpoints', () => {
    expect(source).toContain('moduleApi.getCheckpointHeistCheckpoints')
    expect(source).toContain('moduleApi.createCheckpointHeistCheckpoint')
    expect(source).toContain('moduleApi.updateCheckpointHeistCheckpoint')
    expect(source).toContain('moduleApi.deleteCheckpointHeistCheckpoint')
  })

  it('supports checkpoint reordering', () => {
    expect(source).toContain('moduleApi.reorderCheckpointHeistCheckpoints')
  })

  it('uses auth context for API calls', () => {
    expect(source).toContain('useAuth')
    expect(source).toContain('auth.token')
  })
})
