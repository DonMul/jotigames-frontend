import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import CodeConspiracyTeamPanel from './CodeConspiracyTeamPanel'

const source = readFileSync(
  resolve(process.cwd(), 'src/components/CodeConspiracyTeamPanel.jsx'),
  'utf8',
)

describe('CodeConspiracyTeamPanel', () => {
  it('exports a default function component', () => {
    expect(typeof CodeConspiracyTeamPanel).toBe('function')
  })

  it('declares all expected props', () => {
    const expectedProps = [
      'state',
      'currentTeamId',
      't',
      'onSubmitCode',
      'submitting',
    ]
    for (const prop of expectedProps) {
      expect(source).toContain(prop)
    }
  })

  it('processes teams_list from state', () => {
    expect(source).toContain('state?.teams_list')
    expect(source).toContain("String(team.team_id || '')")
    expect(source).toContain("String(team.name || '-')")
    expect(source).toContain("String(team.logo_path || '')")
  })

  it('does not use Leaflet (form-based game)', () => {
    expect(source).not.toContain("import L from 'leaflet'")
  })

  it('computes highscore from state', () => {
    expect(source).toContain('state?.highscore')
  })

  it('derives config from state', () => {
    expect(source).toContain('state?.config')
    expect(source).toContain('cfg.rounds')
    expect(source).toContain('cfg.code_length')
    expect(source).toContain('cfg.max_attempts')
  })

  it('supports target team selection and code submission', () => {
    expect(source).toContain('targetTeamId')
    expect(source).toContain('setTargetTeamId')
    expect(source).toContain('codeValue')
    expect(source).toContain('setCodeValue')
    expect(source).toContain('onSubmitCode')
  })
})
