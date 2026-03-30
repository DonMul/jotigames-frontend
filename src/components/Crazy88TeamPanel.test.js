import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import Crazy88TeamPanel from './Crazy88TeamPanel'

const source = readFileSync(
  resolve(process.cwd(), 'src/components/Crazy88TeamPanel.jsx'),
  'utf8',
)

describe('Crazy88TeamPanel', () => {
  it('exports a default function component', () => {
    expect(typeof Crazy88TeamPanel).toBe('function')
  })

  it('declares all expected props', () => {
    const expectedProps = [
      'state',
      'currentTeamId',
      't',
      'onSubmitTask',
      'submitting',
      'selectedTaskId',
      'detailBasePath',
    ]
    for (const prop of expectedProps) {
      expect(source).toContain(prop)
    }
  })

  it('processes tasks array from state', () => {
    expect(source).toContain('state?.tasks')
    expect(source).toContain("String(task.id || '')")
    expect(source).toContain("String(task.title || '')")
    expect(source).toContain("String(task.description || '')")
    expect(source).toContain('Number(task.points || 0)')
    expect(source).toContain("String(task.category || '')")
    expect(source).toContain('task.submissions')
    expect(source).toContain('task.latest_status')
    expect(source).toContain('task.can_submit')
  })

  it('does not use Leaflet (form-based game)', () => {
    expect(source).not.toContain("import L from 'leaflet'")
  })

  it('computes highscore from state', () => {
    expect(source).toContain('state?.highscore')
  })

  it('tracks status from submissions/actions', () => {
    expect(source).toContain('statusByTaskId')
    expect(source).toContain('state?.last_actions')
  })

  it('supports task detail view and submission', () => {
    expect(source).toContain('selectedTask')
    expect(source).toContain('Link')
    expect(source).toContain('team_message')
    expect(source).toContain('proof_file')
    expect(source).toContain('type="file"')
    expect(source).toContain('onSubmitTask')
  })
})
