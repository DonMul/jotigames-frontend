import { describe, expect, it } from 'vitest'

import { GAME_BY_SLUG, GAME_BY_TYPE, GAME_CATALOG } from './gameCatalog'

describe('gameCatalog', () => {
  it('exposes all games in lookup maps', () => {
    for (const game of GAME_CATALOG) {
      expect(GAME_BY_SLUG[game.slug]).toEqual(game)
      expect(GAME_BY_TYPE[game.type]).toEqual(game)
    }
  })

  it('contains unique slugs and types', () => {
    const slugs = new Set(GAME_CATALOG.map((game) => game.slug))
    const types = new Set(GAME_CATALOG.map((game) => game.type))

    expect(slugs.size).toBe(GAME_CATALOG.length)
    expect(types.size).toBe(GAME_CATALOG.length)
  })
})
