import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import GeoLocationPicker from '../../components/GeoLocationPicker'
import { gameApi, moduleApi } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { useI18n } from '../../lib/i18n'

function defaultForm() {
  return { title: '', latitude: '', longitude: '', radius_meters: '35', capture_points: '2' }
}

export default function TerritoryControlZoneFormPage() {
  const { gameId, zoneId } = useParams()
  const navigate = useNavigate()
  const { auth } = useAuth()
  const { t } = useI18n()

  const [game, setGame] = useState(null)
  const [form, setForm] = useState(defaultForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const isEdit = Boolean(zoneId)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError('')
      try {
        const [gameRecord, zonesPayload] = await Promise.all([
          gameApi.getGame(auth.token, gameId),
          moduleApi.getTerritoryZones(auth.token, gameId),
        ])
        if (cancelled) return
        setGame(gameRecord)
        if (isEdit) {
          const zones = Array.isArray(zonesPayload?.zones) ? zonesPayload.zones : []
          const zone = zones.find((z) => String(z.id) === String(zoneId))
          if (!zone) throw new Error(t('territory_control.admin.zone_not_found', {}, 'Zone not found'))
          setForm({
            title: String(zone.title || ''),
            latitude: zone.latitude == null ? '' : String(zone.latitude),
            longitude: zone.longitude == null ? '' : String(zone.longitude),
            radius_meters: String(Number(zone.radius_meters || 35)),
            capture_points: String(Number(zone.capture_points || 2)),
          })
        }
      } catch (err) { if (!cancelled) setError(err.message || 'Failed to load') }
      finally { if (!cancelled) setLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [auth.token, gameId, zoneId, isEdit])

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    const payload = {
      title: form.title.trim(),
      latitude: Number(form.latitude), longitude: Number(form.longitude),
      radius_meters: Number(form.radius_meters || 35), capture_points: Number(form.capture_points || 2),
    }
    if (!Number.isFinite(payload.latitude) || !Number.isFinite(payload.longitude)) {
      setError(t('territory_control.admin.lat_lon_required', {}, 'Latitude and longitude are required'))
      return
    }
    setSaving(true)
    try {
      if (isEdit) { await moduleApi.updateTerritoryZone(auth.token, gameId, zoneId, payload) }
      else { await moduleApi.createTerritoryZone(auth.token, gameId, payload) }
      navigate('/admin/territory-control/' + gameId + '/zones', { state: { flashSuccess: t('territory_control.admin.zone_saved', {}, 'Zone saved') } })
    } catch (err) { setError(err.message || 'Failed to save zone') }
    finally { setSaving(false) }
  }

  return (
    <main className="page-shell">
      <div className="geo-header">
        <div>
          <p className="overview-kicker">{t('territory_control.admin.kicker', {}, 'Territory Control')}</p>
          <h1>{isEdit ? t('territory_control.admin.zone_edit_heading', {}, 'Edit zone') : t('territory_control.admin.zone_new_heading', {}, 'New zone')}</h1>
        </div>
        <div className="overview-actions">
          <Link className="btn btn-ghost" to={'/admin/territory-control/' + gameId + '/zones'}>{t('territory_control.admin.back', {}, 'Back')}</Link>
        </div>
      </div>
      {error ? <div className="flash flash-error">{error}</div> : null}
      {loading ? <p>{t('gamesPage.loading', {}, 'Loading...')}</p> : null}
      {!loading ? (
        <section className="admin-block">
          <form onSubmit={handleSubmit}>
            <div className="form-row"><label htmlFor="zone-title">{t('territory_control.admin.zone_field_name', {}, 'Name')}</label><input id="zone-title" value={form.title} onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))} required /></div>
            <div className="form-row">
              <label>{t('territory_control.admin.zone_map_label', {}, 'Zone location')}</label>
              <p className="muted">{t('territory_control.admin.location_map_help', {}, 'Klik op de kaart om de zonelocatie te selecteren.')}</p>
              <GeoLocationPicker latitude={form.latitude} longitude={form.longitude} onChange={(lat, lon) => setForm((c) => ({ ...c, latitude: lat, longitude: lon }))} ariaLabel={t('territory_control.admin.zone_map_label', {}, 'Zone location')} />
            </div>
            <div className="form-row"><label htmlFor="zone-radius">{t('territory_control.admin.zone_field_radius', {}, 'Radius')}</label><input id="zone-radius" type="number" min="10" value={form.radius_meters} onChange={(e) => setForm((c) => ({ ...c, radius_meters: e.target.value }))} required /></div>
            <div className="form-row"><label htmlFor="zone-points">{t('territory_control.admin.zone_field_points', {}, 'Capture points')}</label><input id="zone-points" type="number" min="1" value={form.capture_points} onChange={(e) => setForm((c) => ({ ...c, capture_points: e.target.value }))} required /></div>
            <div className="overview-actions" style={{ marginTop: '1rem' }}>
              <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? t('button.saving', {}, 'Saving\u2026') : t('button.save', {}, 'Save')}</button>
              <Link className="btn btn-ghost" to={'/admin/territory-control/' + gameId + '/zones'}>{t('button.cancel', {}, 'Cancel')}</Link>
            </div>
          </form>
        </section>
      ) : null}
    </main>
  )
}
