import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'

import { gameApi } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { useI18n } from '../../lib/i18n'

export default function TeamEntryPage() {
  const { auth } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [gameId, setGameId] = useState('')

  if (auth.principalType !== 'team') {
    return <Navigate to="/admin/games" replace />
  }

  useEffect(() => {
    let cancelled = false

    async function loadTeamDashboard() {
      setLoading(true)
      setError('')
      try {
        const payload = await gameApi.getTeamDashboard(auth.token)
        if (cancelled) {
          return
        }

        const resolvedGameId = String(payload?.game_id || '').trim()
        if (resolvedGameId) {
          navigate(`/team/games/${resolvedGameId}/play`, { replace: true })
          return
        }

        setError(t('teamEntry.gameNotResolved', {}, 'Could not resolve active game for team'))
      } catch (err) {
        if (!cancelled) {
          setError(err.message || t('teamEntry.loadFailed', {}, 'Could not load team dashboard'))
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadTeamDashboard()
    return () => {
      cancelled = true
    }
  }, [auth.token, navigate, t])

  function handleSubmit(event) {
    event.preventDefault()
    const trimmed = gameId.trim()
    if (!trimmed) {
      return
    }
    navigate(`/team/games/${trimmed}/play`)
  }

  return (
    <main className="page-shell">
      <section className="admin-panel" style={{ maxWidth: 620, margin: '3rem auto' }}>
        <h1>{t('teamEntry.title')}</h1>
        <p>{t('teamEntry.intro')}</p>
        {loading ? <p>{t('gamesPage.loading', {}, 'Loading…')}</p> : null}
        {error ? <div className="flash flash-error">{error}</div> : null}
        <form onSubmit={handleSubmit}>
          <label htmlFor="teamGameId">{t('teamEntry.gameId')}</label>
          <input id="teamGameId" value={gameId} onChange={(event) => setGameId(event.target.value)} required />
          <button className="btn btn-primary" type="submit">
            {t('teamEntry.openGame')}
          </button>
        </form>
      </section>
    </main>
  )
}
