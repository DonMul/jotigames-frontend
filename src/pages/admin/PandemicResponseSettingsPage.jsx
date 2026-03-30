import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import GeoPolygonDrawMap from '../../components/GeoPolygonDrawMap'
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

function extractCenterFromPolygon(value) {
  if (!value) return null
  try {
    const parsed = JSON.parse(value)
    const ring = parsed?.type === 'Polygon' && Array.isArray(parsed?.coordinates?.[0]) ? parsed.coordinates[0] : null
    if (!ring || ring.length < 3) return null

    const points = ring
      .map((point) => [Number(point?.[1]), Number(point?.[0])])
      .filter(([lat, lon]) => Number.isFinite(lat) && Number.isFinite(lon))

    if (points.length === 0) return null

    let latSum = 0
    let lonSum = 0
    for (const [lat, lon] of points) {
      latSum += lat
      lonSum += lon
    }
    return {
      center_lat: latSum / points.length,
      center_lon: lonSum / points.length,
    }
  } catch {
    return null
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
      spawn_area_geojson: String(form.spawn_area_geojson || '').trim(),
      severity_upgrade_seconds: Number(form.severity_upgrade_seconds),
      penalty_percent: Number(form.penalty_percent),
      target_active_hotspots: Number(form.target_active_hotspots),
      pickup_point_count: Number(form.pickup_point_count),
    }
    if (!payload.spawn_area_geojson) {
      setError(t('pandemic_response.admin.spawn_area_required', {}, 'Spawn area polygon is required'))
      return
    }

    const center = extractCenterFromPolygon(payload.spawn_area_geojson)
    if (!center) {
      setError(t('pandemic_response.admin.spawn_area_required', {}, 'Spawn area polygon is required'))
      return
    }

    try {
      await moduleApi.updatePandemicResponseConfig(auth.token, gameId, {
        ...payload,
        center_lat: center.center_lat,
        center_lon: center.center_lon,
      })
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
          <div className="form-row">
            <label>{t('pandemic_response.admin.spawn_area', {}, 'Spawn area (GeoJSON Polygon)')}</label>
            <p className="muted">{t('pandemic_response.admin.spawn_area_help', {}, 'Klik op de kaart om hoekpunten te plaatsen voor het spawngebied.')}</p>
            <GeoPolygonDrawMap
              value={form.spawn_area_geojson}
              onChange={(value) => setForm((c) => ({ ...c, spawn_area_geojson: value }))}
              ariaLabel={t('pandemic_response.admin.spawn_area', {}, 'Spawn area (GeoJSON Polygon)')}
            />
          </div>
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
