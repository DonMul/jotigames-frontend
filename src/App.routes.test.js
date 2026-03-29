import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const appSource = readFileSync(resolve(process.cwd(), 'src/App.jsx'), 'utf8')

const expectedRoutes = [
  '/',
  '/about',
  '/pricing',
  '/faq',
  '/register',
  '/login',
  '/team-login',
  '/info/games/:slug',
  '/team',
  '/team/edit',
  '/team/scan/:qrToken',
  '/admin/games',
  '/account',
  '/admin/games/new',
  '/admin/games/:gameId',
  '/admin/games/:gameId/edit',
  '/admin/games/:gameId/cards',
  '/admin/games/:gameId/cards/pdf',
  '/admin/games/:gameId/bulk-tools',
  '/admin/games/:gameId/teams/new',
  '/admin/games/:gameId/members/new',
  '/admin/games/:gameId/members/:userId/edit',
  '/admin/games/:gameId/teams/:teamId/edit',
  '/admin/games/:gameId/overview',
  '/admin/games/:gameId/live-overview',
  '/admin/geohunter/:gameId/pois',
  '/admin/resource-run/:gameId/nodes',
  '/admin/territory-control/:gameId/zones',
  '/admin/blindhike/:gameId/configure',
  '/admin/echo-hunt/:gameId/beacons',
  '/admin/checkpoint-heist/:gameId/checkpoints',
  '/admin/courier-rush/:gameId/configure',
  '/admin/pandemic-response/:gameId/hotspots',
  '/admin/market-crash/:gameId/points',
  '/admin/market-crash/:gameId/points/new',
  '/admin/market-crash/:gameId/points/:pointId/edit',
  '/admin/birds-of-prey/:gameId/configure',
  '/admin/code-conspiracy/:gameId/configure',
  '/admin/crazy88/:gameId/tasks',
  '/admin/games/:gameId/teams/:teamId/play',
]

describe('frontend route inventory', () => {
  it('contains all expected app routes', () => {
    for (const path of expectedRoutes) {
      expect(appSource).toContain(`path=\"${path}\"`)
    }
  })

  it('contains catch-all route', () => {
    expect(appSource).toContain('path="*"')
  })
})
