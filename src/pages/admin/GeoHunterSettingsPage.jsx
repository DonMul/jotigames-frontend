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
      setError(err.message || t('geohunter.admin.load_failed', {}, 'Failed to load settings'))
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
      setSuccess(t('button.save', {}, 'Saved'))
    } catch (err) {
      setError(err.message || t('geohunter.admin.save_failed', {}, 'Failed to save settings'))
    }
  }

  return (
    <main className="page-shell">
      <div className="geo-header">
        <div>
          <p className="overview-kicker">{t('geohunter.admin.kicker', {}, 'GeoHunter')}</p>
          <h1>{t('geohunter.admin.settings_heading', { game: game?.name || '' }, `Settings · ${game?.name || '-'}`)}</h1>
          <p className="overview-subtitle">{t('geohunter.admin.settings_subtitle', {}, 'Configure game-level settings')}</p>
        </div>
        <div className="overview-actions">
          <Link className="btn btn-ghost" to={`/admin/games/${gameId}`}>
            {t('geohunter.admin.back', {}, 'Back')}
          </Link>

        </div>
      </div>

      {error ? <div className="flash flash-error">{error}</div> : null}
      {success ? <div className="flash flash-success">{success}</div> : null}
      {loading ? <p>{t('gamesPage.loading', {}, 'Loading…')}</p> : null}

      <section className="admin-block">
        <h2>{t('geohunter.admin.retry_settings', {}, 'Answer retry settings')}</h2>
        <form onSubmit={handleSaveSettings} className="form-grid">
          <div className="form-row">
            <label className="blindhike-toggle-row" htmlFor="geohunter-retry-enabled">
              <span className="blindhike-toggle-label">{t('geohunter.admin.retry_enabled', {}, 'Allow teams to retry incorrect answers')}</span>
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
            <label htmlFor="retry-timeout-seconds">{t('geohunter.admin.retry_timeout', {}, 'Retry timeout (seconds)')}</label>
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
            <label htmlFor="geohunter-visibility-mode">{t('geohunter.admin.visibility_mode', {}, 'Question visibility')}</label>
            <select
              id="geohunter-visibility-mode"
              value={visibilityMode}
              onChange={(event) => setVisibilityMode(String(event.target.value || 'all_visible'))}
            >
              <option value="all_visible">{t('geohunter.admin.visibility_all_visible', {}, 'All questions visible')}</option>
              <option value="in_range_only">{t('geohunter.admin.visibility_in_range_only', {}, 'Only visible when in range')}</option>
            </select>
          </div>
          <div className="overview-actions">
            <button className="btn btn-primary" type="submit">
              {t('button.save', {}, 'Save')}
            </button>
          </div>
        </form>
      </section>
    </main>
  )
}
