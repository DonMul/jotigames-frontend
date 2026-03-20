import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { gameApi, moduleApi } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { useI18n } from '../../lib/i18n'

function defaultConfigForm() {
  return {
    center_lat: '51.0500000',
    center_lon: '3.7200000',
    spawn_area_geojson: '',
    severity_upgrade_seconds: '180',
    penalty_percent: '10',
    target_active_hotspots: '15',
    pickup_point_count: '4',
  }
}

export default function PandemicResponseAdminPage() {
  const { gameId } = useParams()
  const { auth } = useAuth()
  const { t } = useI18n()

  const [game, setGame] = useState(null)
  const [hotspots, setHotspots] = useState([])
  const [pickups, setPickups] = useState([])
  const [form, setForm] = useState(defaultConfigForm)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function loadAll() {
    setLoading(true)
    setError('')
    try {
      const [gameRecord, configPayload, statePayload] = await Promise.all([
        gameApi.getGame(auth.token, gameId),
        moduleApi.getPandemicResponseConfig(auth.token, gameId),
        moduleApi.getPandemicResponseAdminState(auth.token, gameId),
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
      setHotspots(Array.isArray(statePayload?.hotspots) ? statePayload.hotspots : [])
      setPickups(Array.isArray(statePayload?.pickups) ? statePayload.pickups : [])
    } catch (err) {
      setError(err.message || 'Failed to load Pandemic Response admin data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [auth.token, gameId])

  async function submitConfig(event) {
    event.preventDefault()
    setError('')
    setSuccess('')

    const payload = {
      center_lat: Number(form.center_lat),
      center_lon: Number(form.center_lon),
      spawn_area_geojson: String(form.spawn_area_geojson || '').trim(),
      severity_upgrade_seconds: Number(form.severity_upgrade_seconds),
      penalty_percent: Number(form.penalty_percent),
      target_active_hotspots: Number(form.target_active_hotspots),
      pickup_point_count: Number(form.pickup_point_count),
    }

    if (!Number.isFinite(payload.center_lat) || !Number.isFinite(payload.center_lon)) {
      setError('Center latitude and longitude are required')
      return
    }
    if (!payload.spawn_area_geojson) {
      setError('Spawn area polygon is required')
      return
    }

    try {
      await moduleApi.updatePandemicResponseConfig(auth.token, gameId, payload)
      await loadAll()
      setSuccess(t('button.save', {}, 'Saved'))
    } catch (err) {
      setError(err.message || 'Failed to save config')
    }
  }

  return (
    <main className="page-shell">
      <section className="overview-header">
        <div>
          <p className="overview-kicker">{t('pandemic_response.admin.kicker', {}, 'Pandemic Response')}</p>
          <h1>{game?.name || '-'}</h1>
          <p className="overview-subtitle">{t('pandemic_response.admin.hotspots_subtitle', {}, 'Manage outbreak configuration')}</p>
        </div>
        <div className="overview-actions">
          <Link className="btn btn-ghost" to={`/admin/games/${gameId}`}>
            {t('pandemic_response.admin.back', {}, 'Back')}
          </Link>
        </div>
      </section>

      {error ? <div className="flash flash-error">{error}</div> : null}
      {success ? <div className="flash flash-success">{success}</div> : null}
      {loading ? <p>{t('gamesPage.loading', {}, 'Loading…')}</p> : null}

      <div className="geo-layout">
        <section className="geo-panel">
          <h2>{t('pandemic_response.admin.config', {}, 'Auto outbreak configuration')}</h2>
          <form onSubmit={submitConfig} className="form-grid">
            <div className="form-row form-row-inline">
              <div>
                <label htmlFor="pandemic-center-lat">{t('common.lat', {}, 'Lat')}</label>
                <input
                  id="pandemic-center-lat"
                  type="number"
                  step="0.000001"
                  value={form.center_lat}
                  onChange={(event) => setForm((current) => ({ ...current, center_lat: event.target.value }))}
                  required
                />
              </div>
              <div>
                <label htmlFor="pandemic-center-lon">{t('common.lon', {}, 'Lon')}</label>
                <input
                  id="pandemic-center-lon"
                  type="number"
                  step="0.000001"
                  value={form.center_lon}
                  onChange={(event) => setForm((current) => ({ ...current, center_lon: event.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <label htmlFor="pandemic-area-geojson">{t('pandemic_response.admin.spawn_area', {}, 'Spawn area (GeoJSON Polygon)')}</label>
              <textarea
                id="pandemic-area-geojson"
                rows={6}
                value={form.spawn_area_geojson}
                onChange={(event) => setForm((current) => ({ ...current, spawn_area_geojson: event.target.value }))}
                required
              />
            </div>

            <div className="form-row">
              <label htmlFor="pandemic-upgrade-seconds">{t('pandemic_response.admin.severity_upgrade', {}, 'Severity upgrade interval (seconds)')}</label>
              <input
                id="pandemic-upgrade-seconds"
                type="number"
                min="30"
                value={form.severity_upgrade_seconds}
                onChange={(event) => setForm((current) => ({ ...current, severity_upgrade_seconds: event.target.value }))}
                required
              />
            </div>

            <div className="form-row">
              <label htmlFor="pandemic-penalty">{t('pandemic_response.admin.penalty_percent', {}, 'Penalty percent')}</label>
              <input
                id="pandemic-penalty"
                type="number"
                min="1"
                max="90"
                value={form.penalty_percent}
                onChange={(event) => setForm((current) => ({ ...current, penalty_percent: event.target.value }))}
                required
              />
            </div>

            <div className="form-row">
              <label htmlFor="pandemic-target">{t('pandemic_response.admin.target_active_hotspots', {}, 'Target active hotspots')}</label>
              <input
                id="pandemic-target"
                type="number"
                min="1"
                max="200"
                value={form.target_active_hotspots}
                onChange={(event) => setForm((current) => ({ ...current, target_active_hotspots: event.target.value }))}
                required
              />
            </div>

            <div className="form-row">
              <label htmlFor="pandemic-pickup-count">{t('pandemic_response.admin.pickup_point_count', {}, 'Pickup points')}</label>
              <input
                id="pandemic-pickup-count"
                type="number"
                min="1"
                max="30"
                value={form.pickup_point_count}
                onChange={(event) => setForm((current) => ({ ...current, pickup_point_count: event.target.value }))}
                required
              />
            </div>

            <div className="overview-actions">
              <button className="btn btn-primary" type="submit">{t('button.save', {}, 'Save')}</button>
            </div>
          </form>
        </section>

        <section className="geo-panel">
          <h2>{t('pandemic_response.admin.current_hotspots', {}, 'Current hotspots')}</h2>
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('pandemic_response.admin.table_title', {}, 'Title')}</th>
                <th>{t('common.lat', {}, 'Lat')}</th>
                <th>{t('common.lon', {}, 'Lon')}</th>
                <th>{t('pandemic_response.admin.table_radius', {}, 'Radius')}</th>
                <th>{t('pandemic_response.admin.table_points', {}, 'Points')}</th>
                <th>{t('pandemic_response.admin.table_severity', {}, 'Severity')}</th>
              </tr>
            </thead>
            <tbody>
              {hotspots.map((hotspot) => (
                <tr key={hotspot.id}>
                  <td>{hotspot.title}</td>
                  <td>{hotspot.latitude}</td>
                  <td>{hotspot.longitude}</td>
                  <td>{hotspot.radius_meters}</td>
                  <td>{hotspot.points}</td>
                  <td>{hotspot.severity_level}</td>
                </tr>
              ))}
              {hotspots.length === 0 ? (
                <tr>
                  <td colSpan={6} className="muted">{t('pandemic_response.admin.empty_hotspots', {}, 'No hotspots yet')}</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </section>
      </div>

      <section className="admin-block">
        <h2>{t('pandemic_response.admin.current_pickups', {}, 'Current pickup points')}</h2>
        <table className="admin-table">
          <thead>
            <tr>
              <th>{t('pandemic_response.admin.table_title', {}, 'Title')}</th>
              <th>{t('pandemic_response.admin.table_resource', {}, 'Resource')}</th>
              <th>{t('common.lat', {}, 'Lat')}</th>
              <th>{t('common.lon', {}, 'Lon')}</th>
              <th>{t('pandemic_response.admin.table_radius', {}, 'Radius')}</th>
            </tr>
          </thead>
          <tbody>
            {pickups.map((pickup) => (
              <tr key={pickup.id}>
                <td>{pickup.title}</td>
                <td>{pickup.resource_type}</td>
                <td>{pickup.latitude}</td>
                <td>{pickup.longitude}</td>
                <td>{pickup.radius_meters}</td>
              </tr>
            ))}
            {pickups.length === 0 ? (
              <tr>
                <td colSpan={5} className="muted">{t('pandemic_response.admin.empty_pickups', {}, 'No pickup points yet')}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </main>
  )
}
