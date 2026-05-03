import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { gameApi, moduleApi } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { useI18n } from '../../lib/i18n'

function defaultForm() {
  return {
    visibility_radius_meters: '100',
    protection_radius_meters: '50',
    auto_drop_seconds: '300',
  }
}

export default function BirdsOfPreyConfigurePage() {
  const { gameId } = useParams()
  const { auth } = useAuth()
  const { t } = useI18n()

  const [game, setGame] = useState(null)
  const [form, setForm] = useState(defaultForm)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function loadAll() {
    setLoading(true)
    setError('')
    try {
      const [gameRecord, configPayload] = await Promise.all([
        gameApi.getGame(auth.token, gameId),
        moduleApi.getBirdsOfPreyConfig(auth.token, gameId),
      ])

      const config = configPayload?.config || {}
      setGame(gameRecord)
      setForm({
        visibility_radius_meters: String(Number(config?.visibility_radius_meters || 100)),
        protection_radius_meters: String(Number(config?.protection_radius_meters || 50)),
        auto_drop_seconds: String(Number(config?.auto_drop_seconds || 300)),
      })
    } catch (err) {
      setError(err.message || t('error.loadFailed', {}))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [auth.token, gameId])

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSuccess('')

    const payload = {
      visibility_radius_meters: Number(form.visibility_radius_meters || 100),
      protection_radius_meters: Number(form.protection_radius_meters || 50),
      auto_drop_seconds: Number(form.auto_drop_seconds || 300),
    }

    try {
      await moduleApi.updateBirdsOfPreyConfig(auth.token, gameId, payload)
      await loadAll()
      setSuccess(t('status.saved', {}))
    } catch (err) {
      setError(err.message || t('error.saveFailed', {}))
    }
  }

  return (
    <main className="page-shell">
      <section className="overview-header">
        <div>
          <p className="overview-kicker">{t('gameCatalog.birds_of_prey.name', {})}</p>
          <h1>{game?.name || '-'}</h1>
          <p className="overview-subtitle">{t('birds_of_prey.configure', {})}</p>
        </div>
        <div className="overview-actions">
            <Link className="btn btn-ghost" to={`/admin/games/${gameId}`}>
            {t('common.back', {})}
          </Link>
        </div>
      </section>

      {error ? <div className="flash flash-error">{error}</div> : null}
      {success ? <div className="flash flash-success">{success}</div> : null}
      {loading ? <p>{t('gamesPage.loading', {})}</p> : null}

      <section className="admin-block">
        <form onSubmit={handleSubmit} className="stack">
          <div className="form-row">
            <label htmlFor="bop-visibility-radius">{t('birds_of_prey.admin.visibility_radius', {})}</label>
            <input
              id="bop-visibility-radius"
              type="number"
              min="10"
              max="500"
              value={form.visibility_radius_meters}
              onChange={(event) => setForm((current) => ({ ...current, visibility_radius_meters: event.target.value }))}
              required
            />
          </div>

          <div className="form-row">
            <label htmlFor="bop-protection-radius">{t('birds_of_prey.admin.protection_radius', {})}</label>
            <input
              id="bop-protection-radius"
              type="number"
              min="5"
              max="500"
              value={form.protection_radius_meters}
              onChange={(event) => setForm((current) => ({ ...current, protection_radius_meters: event.target.value }))}
              required
            />
          </div>

          <div className="form-row">
            <label htmlFor="bop-auto-drop">{t('birds_of_prey.admin.auto_drop_seconds', {})}</label>
            <input
              id="bop-auto-drop"
              type="number"
              min="30"
              max="7200"
              value={form.auto_drop_seconds}
              onChange={(event) => setForm((current) => ({ ...current, auto_drop_seconds: event.target.value }))}
              required
            />
          </div>

          <button className="btn btn-primary" type="submit">{t('button.label.save', {})}</button>
        </form>
      </section>
    </main>
  )
}
