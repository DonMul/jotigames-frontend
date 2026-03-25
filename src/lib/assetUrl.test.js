import { describe, expect, it } from 'vitest'

import { toAssetUrl } from './assetUrl'

describe('toAssetUrl', () => {
  it('returns empty string for empty input', () => {
    expect(toAssetUrl('')).toBe('')
    expect(toAssetUrl(null)).toBe('')
  })

  it('keeps absolute and root-relative paths unchanged', () => {
    expect(toAssetUrl('https://example.com/logo.png')).toBe('https://example.com/logo.png')
    expect(toAssetUrl('http://example.com/logo.png')).toBe('http://example.com/logo.png')
    expect(toAssetUrl('/image/logo.png')).toBe('/image/logo.png')
  })

  it('prefixes relative paths with slash', () => {
    expect(toAssetUrl('uploads/team.png')).toBe('/uploads/team.png')
    expect(toAssetUrl('  uploads/team.png  ')).toBe('/uploads/team.png')
  })
})
