import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { gameApi, moduleApi } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { useI18n } from '../../lib/i18n'

export default function GeoHunterSettingsPage() {
  const { gameId } = useParams()
  const { auth } = useAuth()
  const { t } = useI18n()

  const [game, setGame] = useState(null)
  const [retryEnabled, setRetryEnabled] = useState(false)
  const [retryTimeoutSeconds, setRetryTimeoutSeconds] = useState('0')
  const [visibilityMode, setVisibilityMode] = useState('all_visible')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function loadAll() {
    setLoading(true)
    setError('')
    try {
      const [gameRecord, poisPayload] = await Promise.all([
        gameApi.getGame(auth.token, gameId),
        moduleApi.getGeoHunterPois(auth.token, gameId),
      ])
      setGame(gameRecord)
      setRetryEnabled(Boolean(poisPayload?.retry_enabled))
      setRetryTimeoutSeconds(String(Number(poisPayload?.retry_timeout_seconds || 0)))
      setVisibilityMode(String(poisPayload?.visibility_mode || 'all_visible'))
    } catch (err) {
      setError(err.message || t('error.loadFailed', {}))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [auth.token, gameId])

  async function handleSaveSettings(event) {
    event.preventDefault()
    setError('')
    setSuccess('')
    try {
      await moduleApi.updateGeoHunterRetrySettings(
        auth.token,
        gameId,
        retryEnabled,
        Number(retryTimeoutSeconds || 0),
        visibilityMode,
      )
      setSuccess(t('status.saved', {}))
    } catch (err) {
      setError(err.message || t('error.saveFailed', {}))
    }
  }

  return (
    <main className="page-shell">
      <div className="geo-header">
        <div>
          <p className="overview-kicker">{t('gameCatalog.geohunter.name', {})} - {game?.name}</p>
          <h1>{t('admin.header.game.settings', { game: game?.name || '' })}</h1>
        </div>
        <div className="overview-actions">
          <Link className="btn btn-ghost" to={`/admin/games/${gameId}`}>
            {t('common.back', {})}
          </Link>

        </div>
      </div>

      {error ? <div className="flash flash-error">{error}</div> : null}
      {success ? <div className="flash flash-success">{success}</div> : null}
      {loading ? <p>{t('gamesPage.loading', {})}</p> : null}

      <section className="admin-block">
        <form onSubmit={handleSaveSettings} className="form-grid">
          <div className="form-row">
            <label className="blindhike-toggle-row" htmlFor="geohunter-retry-enabled">
              <span className="blindhike-toggle-label">{t('geohunter.admin.retry_enabled', {})}</span>
              <span className="game-type-switch">
                <input
                  id="geohunter-retry-enabled"
                  type="checkbox"
                  checked={retryEnabled}
                  onChange={(event) => setRetryEnabled(event.target.checked)}
                />
                <span className="game-type-switch-track" aria-hidden="true" />
              </span>
            </label>
          </div>
          <div className="form-row">
            <label htmlFor="retry-timeout-seconds">{t('geohunter.admin.retry_timeout', {})}</label>
            <input
              id="retry-timeout-seconds"
              type="number"
              min="0"
              max="86400"
              value={retryTimeoutSeconds}
              onChange={(event) => setRetryTimeoutSeconds(event.target.value)}
            />
          </div>
          <div className="form-row">
            <label htmlFor="geohunter-visibility-mode">{t('geohunter.admin.visibility_mode', {})}</label>
            <select
              id="geohunter-visibility-mode"
              value={visibilityMode}
              onChange={(event) => setVisibilityMode(String(event.target.value || 'all_visible'))}
            >
              <option value="all_visible">{t('geohunter.admin.visibility_all_visible', {})}</option>
              <option value="in_range_only">{t('geohunter.admin.visibility_in_range_only', {})}</option>
            </select>
          </div>
          <div className="overview-actions">
            <button className="btn btn-primary" type="submit">
              {t('button.label.save', {})}
            </button>
          </div>
        </form>
      </section>
    </main>
  )
}
