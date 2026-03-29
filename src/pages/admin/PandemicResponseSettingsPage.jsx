import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import GeoLocationPicker from '../../components/GeoLocationPicker'
import { gameApi, moduleApi } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { useI18n } from '../../lib/i18n'

function defaultConfigForm() {
  return {
    center_lat: '51.0500000', center_lon: '3.7200000',
    spawn_area_geojson: '', severity_upgrade_seconds: '180',
    penalty_percent: '10', target_active_hotspots: '15', pickup_point_count: '4',
  }
}

export default function PandemicResponseSettingsPage() {
  const { gameId } = useParams()
  const { auth } = useAuth()
  const { t } = useI18n()

  const [game, setGame] = useState(null)
  const [form, setForm] = useState(defaultConfigForm)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function loadAll() {
    setLoading(true)
    setError('')
    try {
      const [gameRecord, configPayload] = await Promise.all([
        gameApi.getGame(auth.token, gameId),
        moduleApi.getPandemicResponseConfig(auth.token, gameId),
      ])
      const config = configPayload?.config || {}
      setGame(gameRecord)
      setForm({
        center_lat: String(config?.center_lat ?? '51.0500000'),
        center_lon: String(config?.center_lon ?? '3.7200000'),
        spawn_area_geojson: String(config?.spawn_area_geojson || ''),
        severity_upgrade_seconds: String(Number(config?.severity_upgrade_seconds || 180)),
        penalty_percent: String(Number(config?.penalty_percent || 10)),
        target_active_hotspots: String(Number(config?.target_active_hotspots || 15)),
        pickup_point_count: String(Number(config?.pickup_point_count || 4)),
      })
    } catch (err) {
      setError(err.message || t('pandemic_response.admin.load_failed', {}, 'Failed to load settings'))
    } finally { setLoading(false) }
  }

  useEffect(() => { loadAll() }, [auth.token, gameId])

  async function submitConfig(event) {
    event.preventDefault()
    setError('')
    setSuccess('')
    const payload = {
      center_lat: Number(form.center_lat), center_lon: Number(form.center_lon),
      spawn_area_geojson: String(form.spawn_area_geojson || '').trim(),
      severity_upgrade_seconds: Number(form.severity_upgrade_seconds),
      penalty_percent: Number(form.penalty_percent),
      target_active_hotspots: Number(form.target_active_hotspots),
      pickup_point_count: Number(form.pickup_point_count),
    }
    if (!Number.isFinite(payload.center_lat) || !Number.isFinite(payload.center_lon)) {
      setError(t('pandemic_response.admin.center_required', {}, 'Center latitude and longitude are required'))
      return
    }
    if (!payload.spawn_area_geojson) {
      setError(t('pandemic_response.admin.spawn_area_required', {}, 'Spawn area polygon is required'))
      return
    }
    try {
      await moduleApi.updatePandemicResponseConfig(auth.token, gameId, payload)
      await loadAll()
      setSuccess(t('button.save', {}, 'Saved'))
    } catch (err) {
      setError(err.message || t('pandemic_response.admin.save_failed', {}, 'Failed to save config'))
    }
  }

  return (
    <main className="page-shell">
      <div className="geo-header">
        <div>
          <p className="overview-kicker">{t('pandemic_response.admin.kicker', {}, 'Pandemic Response')}</p>
          <h1>{t('pandemic_response.admin.settings_heading', { game: game?.name || '' }, 'Settings')}</h1>
          <p className="overview-subtitle">{t('pandemic_response.admin.settings_subtitle', {}, 'Configure outbreak parameters')}</p>
        </div>
        <div className="overview-actions">
          <Link className="btn btn-ghost" to={'/admin/games/' + gameId}>{t('pandemic_response.admin.back', {}, 'Back')}</Link>
        </div>
      </div>

      {error ? <div className="flash flash-error">{error}</div> : null}
      {success ? <div className="flash flash-success">{success}</div> : null}
      {loading ? <p>{t('gamesPage.loading', {}, 'Loading...')}</p> : null}

      <section className="admin-block">
        <h2>{t('pandemic_response.admin.config', {}, 'Auto outbreak configuration')}</h2>
        <form onSubmit={submitConfig} className="form-grid">
          <GeoLocationPicker latitude={form.center_lat} longitude={form.center_lon} onChange={(lat, lon) => setForm((c) => ({ ...c, center_lat: lat, center_lon: lon }))} ariaLabel={t('pandemic_response.admin.center_map_label', {}, 'Outbreak center')} />
          <div className="form-row form-row-inline">
            <div><label htmlFor="pandemic-center-lat">{t('common.lat', {}, 'Lat')}</label><input id="pandemic-center-lat" type="number" step="0.000001" value={form.center_lat} onChange={(e) => setForm((c) => ({ ...c, center_lat: e.target.value }))} required /></div>
            <div><label htmlFor="pandemic-center-lon">{t('common.lon', {}, 'Lon')}</label><input id="pandemic-center-lon" type="number" step="0.000001" value={form.center_lon} onChange={(e) => setForm((c) => ({ ...c, center_lon: e.target.value }))} required /></div>
          </div>
          <div className="form-row"><label htmlFor="pandemic-area-geojson">{t('pandemic_response.admin.spawn_area', {}, 'Spawn area (GeoJSON Polygon)')}</label><textarea id="pandemic-area-geojson" rows={6} value={form.spawn_area_geojson} onChange={(e) => setForm((c) => ({ ...c, spawn_area_geojson: e.target.value }))} required /></div>
          <div className="form-row"><label htmlFor="pandemic-upgrade-seconds">{t('pandemic_response.admin.severity_upgrade', {}, 'Severity upgrade interval (seconds)')}</label><input id="pandemic-upgrade-seconds" type="number" min="30" value={form.severity_upgrade_seconds} onChange={(e) => setForm((c) => ({ ...c, severity_upgrade_seconds: e.target.value }))} required /></div>
          <div className="form-row"><label htmlFor="pandemic-penalty">{t('pandemic_response.admin.penalty_percent', {}, 'Penalty percent')}</label><input id="pandemic-penalty" type="number" min="1" max="90" value={form.penalty_percent} onChange={(e) => setForm((c) => ({ ...c, penalty_percent: e.target.value }))} required /></div>
          <div className="form-row"><label htmlFor="pandemic-target">{t('pandemic_response.admin.target_active_hotspots', {}, 'Target active hotspots')}</label><input id="pandemic-target" type="number" min="1" max="200" value={form.target_active_hotspots} onChange={(e) => setForm((c) => ({ ...c, target_active_hotspots: e.target.value }))} required /></div>
          <div className="form-row"><label htmlFor="pandemic-pickup-count">{t('pandemic_response.admin.pickup_point_count', {}, 'Pickup points')}</label><input id="pandemic-pickup-count" type="number" min="1" max="30" value={form.pickup_point_count} onChange={(e) => setForm((c) => ({ ...c, pickup_point_count: e.target.value }))} required /></div>
          <div className="overview-actions"><button className="btn btn-primary" type="submit">{t('button.save', {}, 'Save')}</button></div>
        </form>
      </section>
    </main>
  )
}
