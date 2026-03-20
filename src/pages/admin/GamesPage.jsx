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
      return '-'
    }
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) {
      return String(value)
    }
    return parsed.toLocaleString()
  }

  return (
    <main className="page-shell">
      <section className="admin-panel" style={{ marginTop: '2rem' }}>
        <div className="geo-header">
          <div>
            <h1>{t('gamesPage.title')}</h1>
            <p>{t('gamesPage.signedInAs', { role: auth.principalType })}</p>
          </div>
          <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
            <Link className="btn btn-add" to="/admin/games/new">
              {t('gamesPage.create', {}, 'Create game')}
            </Link>
          </div>
        </div>

        {loading ? <p>{t('gamesPage.loading')}</p> : null}
        {error ? <div className="flash flash-error">{error}</div> : null}

        {!loading && !error && games.length === 0 ? <p>{t('gamesPage.empty', {}, 'No games found')}</p> : null}

        {!loading && games.length > 0 ? (
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('gamesPage.tableName', {}, 'Name')}</th>
                <th>{t('gamesPage.type', {}, 'Type')}</th>
                <th>{t('gamesPage.starts', {}, 'Starts')}</th>
                <th>{t('gamesPage.ends', {}, 'Ends')}</th>
                <th className="text-right">{t('gamesPage.actions', {}, 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {games.map((game) => {
                const gameType = game?.game_type || game?.type
                const gameMeta = GAME_BY_TYPE[gameType]

                return (
                  <tr key={game.id}>
                    <td>
                      <strong>{game.name}</strong>
                    </td>
                    <td>
                      <div className="games-table-type-wrap">
                        {gameMeta?.logo ? <img className="games-table-logo" src={gameMeta.logo} alt={gameMeta.name || gameType} /> : null}
                      </div>
                    </td>
                    <td>{formatDate(game.start_at)}</td>
                    <td>{formatDate(game.end_at)}</td>
                    <td className="text-right table-actions-inline">
                      <Link className="btn btn-primary btn-small" to={`/admin/games/${game.id}`}>
                        {t('gamesPage.openGame')}
                      </Link>
                      <Link className="btn btn-ghost btn-small" to={`/admin/games/${game.id}/live-overview`}>
                        {t('gamesPage.liveOverview', {}, 'Live overview')}
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        ) : null}
      </section>
    </main>
  )
}
