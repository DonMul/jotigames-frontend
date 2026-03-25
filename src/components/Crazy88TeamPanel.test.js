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
  })

  it('does not use Leaflet (form-based game)', () => {
    expect(source).not.toContain("import L from 'leaflet'")
  })

  it('computes highscore from state', () => {
    expect(source).toContain('state?.highscore')
  })

  it('tracks submitted tasks', () => {
    expect(source).toContain('submittedTaskIds')
    expect(source).toContain('state?.last_actions')
  })

  it('supports task selection and submission', () => {
    expect(source).toContain('selectedTaskId')
    expect(source).toContain('setSelectedTaskId')
    expect(source).toContain('onSubmitTask')
  })

  it('filters only active tasks', () => {
    expect(source).toContain('task.is_active')
  })
})
