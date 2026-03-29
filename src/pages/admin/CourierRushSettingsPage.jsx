import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { gameApi, moduleApi } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { useI18n } from '../../lib/i18n'

function defaultConfigForm() {
  return {
    pickup_mode: 'predefined',
    dropoff_mode: 'random',
    max_active_pickups: '3',
    pickup_spawn_area_geojson: '',
  }
}

export default function CourierRushSettingsPage() {
  const { gameId } = useParams()
  const { auth } = useAuth()
  const { t } = useI18n()

  const [game, setGame] = useState(null)
  const [configForm, setConfigForm] = useState(defaultConfigForm)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function loadAll() {
    setLoading(true)
    setError('')
    try {
      const [gameRecord, configPayload] = await Promise.all([
        gameApi.getGame(auth.token, gameId),
        moduleApi.getCourierRushConfig(auth.token, gameId),
      ])
      const config = configPayload?.config || {}
      setGame(gameRecord)
      setConfigForm({
        pickup_mode: String(config?.pickup_mode || 'predefined'),
        dropoff_mode: String(config?.dropoff_mode || 'random'),
        max_active_pickups: String(Number(config?.max_active_pickups || 3)),
        pickup_spawn_area_geojson: String(config?.pickup_spawn_area_geojson || ''),
      })
    } catch (err) {
      setError(err.message || t('courier_rush.admin.load_failed', {}, 'Failed to load settings'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAll() }, [auth.token, gameId])

  async function submitConfig(event) {
    event.preventDefault()
    setError('')
    setSuccess('')
    const payload = {
      pickup_mode: configForm.pickup_mode === 'random' ? 'random' : 'predefined',
      dropoff_mode: configForm.dropoff_mode === 'fixed' ? 'fixed' : 'random',
      max_active_pickups: Number(configForm.max_active_pickups || 3),
      pickup_spawn_area_geojson: String(configForm.pickup_spawn_area_geojson || '').trim() || null,
    }
    if (!Number.isFinite(payload.max_active_pickups) || payload.max_active_pickups < 1 || payload.max_active_pickups > 25) {
      setError(t('courier_rush.admin.max_pickups_range', {}, 'Max active pickups must be between 1 and 25'))
      return
    }
    try {
      await moduleApi.updateCourierRushConfig(auth.token, gameId, payload)
      await loadAll()
      setSuccess(t('courier_rush.admin.settings_saved', {}, 'Settings saved'))
    } catch (err) {
      setError(err.message || t('courier_rush.admin.save_failed', {}, 'Failed to save settings'))
    }
  }

  return (
    <main className="page-shell">
      <div className="geo-header">
        <div>
          <p className="overview-kicker">{t('courier_rush.admin.kicker', {}, 'Courier Rush')}</p>
          <h1>{t('courier_rush.admin.settings_heading', { game: game?.name || '' }, 'Settings')}</h1>
          <p className="overview-subtitle">{t('courier_rush.admin.settings_subtitle', {}, 'Configure game-level settings')}</p>
        </div>
        <div className="overview-actions">
          <Link className="btn btn-ghost" to={'/admin/games/' + gameId}>{t('courier_rush.admin.back', {}, 'Back')}</Link>
        </div>
      </div>

      {error ? <div className="flash flash-error">{error}</div> : null}
      {success ? <div className="flash flash-success">{success}</div> : null}
      {loading ? <p>{t('gamesPage.loading', {}, 'Loading...')}</p> : null}

      <section className="admin-block">
        <h2>{t('courier_rush.admin.settings_title', {}, 'Settings')}</h2>
        <form onSubmit={submitConfig} className="form-grid">
          <div className="form-row">
            <label htmlFor="courier-pickup-mode">{t('courier_rush.admin.pickup_mode', {}, 'Pickup mode')}</label>
            <select id="courier-pickup-mode" value={configForm.pickup_mode} onChange={(e) => setConfigForm((c) => ({ ...c, pickup_mode: e.target.value }))}>
              <option value="predefined">{t('courier_rush.admin.pickup_mode_predefined', {}, 'Predefined')}</option>
              <option value="random">{t('courier_rush.admin.pickup_mode_random', {}, 'Random')}</option>
            </select>
          </div>
          <div className="form-row">
            <label htmlFor="courier-dropoff-mode">{t('courier_rush.admin.dropoff_mode', {}, 'Dropoff mode')}</label>
            <select id="courier-dropoff-mode" value={configForm.dropoff_mode} onChange={(e) => setConfigForm((c) => ({ ...c, dropoff_mode: e.target.value }))}>
              <option value="random">{t('courier_rush.admin.dropoff_mode_random', {}, 'Random')}</option>
              <option value="fixed">{t('courier_rush.admin.dropoff_mode_fixed', {}, 'Fixed')}</option>
            </select>
          </div>
          <div className="form-row">
            <label htmlFor="courier-max-pickups">{t('courier_rush.admin.max_active_pickups', {}, 'Max active pickups')}</label>
            <input id="courier-max-pickups" type="number" min="1" max="25" value={configForm.max_active_pickups} onChange={(e) => setConfigForm((c) => ({ ...c, max_active_pickups: e.target.value }))} required />
          </div>
          <div className="form-row">
            <label htmlFor="courier-spawn-area">{t('courier_rush.admin.pickup_spawn_area', {}, 'Pickup spawn area (GeoJSON Polygon)')}</label>
            <textarea id="courier-spawn-area" rows={6} value={configForm.pickup_spawn_area_geojson} onChange={(e) => setConfigForm((c) => ({ ...c, pickup_spawn_area_geojson: e.target.value }))} />
          </div>
          <div className="overview-actions">
            <button className="btn btn-primary" type="submit">{t('courier_rush.admin.save_settings', {}, 'Save settings')}</button>
          </div>
        </form>
      </section>
    </main>
  )
}
