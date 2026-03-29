import { useEffect, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'

import { gameApi } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { useI18n } from '../../lib/i18n'
import { GAME_BY_TYPE } from '../../lib/gameCatalog'

export default function GamesPage() {
  const { auth } = useAuth()
  const { t } = useI18n()
  const [games, setGames] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    if (auth.principalType === 'team') {
      setLoading(false)
      return undefined
    }

    let cancelled = false

    async function load() {
      setLoading(true)
      setError('')
      try {
        const response = await gameApi.listGames(auth.token)
        if (!cancelled) {
          setGames(Array.isArray(response) ? response : [])
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || t('gamesPage.loadFailed'))
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [auth.principalType, auth.token, t])

  if (auth.principalType === 'team') {
    return <Navigate to="/team" replace />
  }

  function formatDate(value) {
    if (!value) {
      return { date: '-', time: '' }
    }
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) {
      return { date: String(value), time: '' }
    }
    return {
      date: parsed.toLocaleDateString(),
      time: parsed.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
  }

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">{t('gamesPage.title')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('gamesPage.signedInAs', { role: auth.principalType })}</p>
        </div>
        <div className="flex items-center gap-3">
          <Link
            className="inline-flex items-center gap-2 rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 transition-colors"
            to="/admin/games/new"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
            {t('gamesPage.create', {}, 'Create game')}
          </Link>
        </div>
      </div>

      {/* Feedback */}
      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
        </div>
      ) : null}
      {error ? <div className="flash flash-error">{error}</div> : null}
      {!loading && !error && games.length === 0 ? (
        <div className="text-center py-16">
          <p className="text-gray-400 text-lg">{t('gamesPage.empty', {}, 'No games found')}</p>
          <p className="text-sm text-gray-400 mt-1">{t('gamesPage.emptyHint', {}, 'Create your first game to get started.')}</p>
        </div>
      ) : null}

      {/* Game cards grid */}
      {!loading && games.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {games.map((game) => {
            const gameType = game?.game_type || game?.type
            const gameMeta = GAME_BY_TYPE[gameType]
            const typeName = t(`gameCatalog.${gameType}.name`, {}, gameMeta?.name || gameType)

            return (
              <article
                key={game.id}
                className="group bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md hover:border-brand-200 transition-all duration-200 overflow-hidden"
              >
                {/* Card header with logo */}
                <div className="flex items-center gap-3 px-5 pt-5 pb-3">
                  {gameMeta?.logo ? (
                    <img className="w-10 h-10 object-contain rounded-lg border border-gray-100" src={gameMeta.logo} alt={typeName} />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-brand-50 flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5 text-brand-400" viewBox="0 0 20 20" fill="currentColor"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-base font-semibold text-navy-900 truncate group-hover:text-brand-600 transition-colors">
                      {game.name}
                    </h3>
                    <p className="text-xs text-gray-400 truncate">{typeName}</p>
                  </div>
                </div>

                {/* Date row */}
                <div className="px-5 pb-3 flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>
                    <span className="flex flex-col leading-tight">
                      <span>{formatDate(game.start_at).date}</span>
                      <span className="text-gray-400">{formatDate(game.start_at).time}</span>
                    </span>
                  </span>
                  <span className="text-gray-300">→</span>
                  <span className="flex flex-col leading-tight">
                    <span>{formatDate(game.end_at).date}</span>
                    <span className="text-gray-400">{formatDate(game.end_at).time}</span>
                  </span>
                </div>

                {/* Card actions */}
                <div className="border-t border-gray-100 px-5 py-3 flex items-center gap-2">
                  <Link
                    className="flex-1 text-center rounded-lg bg-brand-500 px-3 py-2 text-xs font-semibold text-white hover:bg-brand-600 transition-colors"
                    to={`/admin/games/${game.id}`}
                  >
                    {t('gamesPage.openGame')}
                  </Link>
                  <Link
                    className="rounded-lg border border-gray-200 px-3 py-2 text-xs font-medium text-navy-700 hover:bg-gray-50 transition-colors"
                    to={`/admin/games/${game.id}/live-overview`}
                  >
                    {t('gamesPage.liveOverview', {}, 'Live overview')}
                  </Link>
                </div>
              </article>
            )
          })}
        </div>
      ) : null}
    </main>
  )
}
