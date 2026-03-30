import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { gameApi, moduleApi } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { useI18n } from '../../lib/i18n'

export default function Crazy88SettingsPage() {
  const { gameId } = useParams()
  const { auth } = useAuth()
  const { t } = useI18n()

  const [game, setGame] = useState(null)
  const [config, setConfig] = useState({ visibility_mode: 'all_visible', show_highscore: true })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function loadAll() {
    setLoading(true)
    setError('')
    try {
      const [gameRecord, configPayload] = await Promise.all([
        gameApi.getGame(auth.token, gameId),
        moduleApi.getCrazy88Config(auth.token, gameId),
      ])
      setGame(gameRecord)
      setConfig(configPayload?.config || { visibility_mode: 'all_visible', show_highscore: true })
    } catch (err) {
      setError(err.message || t('crazy88.admin.load_failed', {}, 'Failed to load settings'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAll() }, [auth.token, gameId])

  async function saveConfig(event) {
    event.preventDefault()
    setError('')
    setSuccess('')
    try {
      await moduleApi.updateCrazy88Config(auth.token, gameId, {
        visibility_mode: config.visibility_mode === 'geo_locked' ? 'geo_locked' : 'all_visible',
        show_highscore: Boolean(config.show_highscore),
      })
      await loadAll()
      setSuccess(t('button.save', {}, 'Saved'))
    } catch (err) {
      setError(err.message || t('crazy88.admin.save_failed', {}, 'Failed to save settings'))
    }
  }

  return (
    <main className="page-shell">
      <div className="geo-header">
        <div>
          <p className="overview-kicker">{t('crazy88.admin.kicker', {}, 'Crazy 88')}</p>
          <h1>{t('crazy88.admin.settings_heading', { game: game?.name || '' }, 'Settings')}</h1>
          <p className="overview-subtitle">{t('crazy88.admin.settings_subtitle', {}, 'Configure game-level settings')}</p>
        </div>
        <div className="overview-actions">
          <Link className="btn btn-ghost" to={'/admin/games/' + gameId}>
            {t('crazy88.admin.back', {}, 'Back')}
          </Link>
        </div>
      </div>

      {error ? <div className="flash flash-error">{error}</div> : null}
      {success ? <div className="flash flash-success">{success}</div> : null}
      {loading ? <p>{t('gamesPage.loading', {}, 'Loading...')}</p> : null}

      <section className="admin-block">
        <h2>{t('crazy88.admin.settings', {}, 'Settings')}</h2>
        <form onSubmit={saveConfig}>
          <div className="form-row">
            <label htmlFor="crazy88-visibility-mode">{t('crazy88.admin.visibility_mode', {}, 'Visibility mode')}</label>
            <select
              id="crazy88-visibility-mode"
              value={config.visibility_mode}
              onChange={(event) => setConfig((current) => ({ ...current, visibility_mode: event.target.value }))}
            >
              <option value="all_visible">{t('crazy88.visibility.all_visible', {}, 'All visible')}</option>
              <option value="geo_locked">{t('crazy88.visibility.geo_locked', {}, 'Geo locked')}</option>
            </select>
          </div>
          <div className="form-row">
            <label className="blindhike-toggle-row" htmlFor="crazy88-show-highscore">
              <span className="blindhike-toggle-label">{t('crazy88.admin.show_highscore', {}, 'Show highscore')}</span>
              <span className="game-type-switch">
                <input
                  id="crazy88-show-highscore"
                  type="checkbox"
                  checked={Boolean(config.show_highscore)}
                  onChange={(event) => setConfig((current) => ({ ...current, show_highscore: event.target.checked }))}
                />
                <span className="game-type-switch-track" aria-hidden="true" />
              </span>
            </label>
          </div>
          <button className="btn btn-primary" type="submit">{t('button.save', {}, 'Save')}</button>
        </form>
      </section>
    </main>
  )
}
