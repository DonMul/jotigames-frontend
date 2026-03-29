import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import CheckpointHeistAdminPage from './CheckpointHeistAdminPage'
import CheckpointHeistCheckpointFormPage from './CheckpointHeistCheckpointFormPage'

const listSource = readFileSync(
  resolve(process.cwd(), 'src/pages/admin/CheckpointHeistAdminPage.jsx'),
  'utf8',
)
const formSource = readFileSync(
  resolve(process.cwd(), 'src/pages/admin/CheckpointHeistCheckpointFormPage.jsx'),
  'utf8',
)

describe('CheckpointHeistAdminPage', () => {
  it('exports a default function component', () => {
    expect(typeof CheckpointHeistAdminPage).toBe('function')
  })

  it('uses route params for gameId', () => {
    expect(listSource).toContain('useParams')
    expect(listSource).toContain('gameId')
  })

  it('lists and deletes checkpoints', () => {
    expect(listSource).toContain('moduleApi.getCheckpointHeistCheckpoints')
    expect(listSource).toContain('moduleApi.deleteCheckpointHeistCheckpoint')
  })

  it('supports checkpoint reordering', () => {
    expect(listSource).toContain('moduleApi.reorderCheckpointHeistCheckpoints')
  })

  it('uses auth context for API calls', () => {
    expect(listSource).toContain('useAuth')
    expect(listSource).toContain('auth.token')
  })
})

describe('CheckpointHeistCheckpointFormPage', () => {
  it('exports a default function component', () => {
    expect(typeof CheckpointHeistCheckpointFormPage).toBe('function')
  })

  it('integrates with GeoLocationPicker', () => {
    expect(formSource).toContain('GeoLocationPicker')
  })

  it('calls moduleApi CRUD methods for checkpoints', () => {
    expect(formSource).toContain('moduleApi.createCheckpointHeistCheckpoint')
    expect(formSource).toContain('moduleApi.updateCheckpointHeistCheckpoint')
  })
})
