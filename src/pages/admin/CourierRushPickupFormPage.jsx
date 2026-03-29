import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import GeoLocationPicker from '../../components/GeoLocationPicker'
import { gameApi, moduleApi } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { useI18n } from '../../lib/i18n'

function defaultForm() {
  return { title: '', latitude: '', longitude: '', radius_meters: '25', points: '5', marker_color: '#2563eb', is_active: true }
}

export default function CourierRushPickupFormPage() {
  const { gameId, pickupId } = useParams()
  const navigate = useNavigate()
  const { auth } = useAuth()
  const { t } = useI18n()

  const [game, setGame] = useState(null)
  const [form, setForm] = useState(defaultForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const isEdit = Boolean(pickupId)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError('')
      try {
        const [gameRecord, pickupsPayload] = await Promise.all([
          gameApi.getGame(auth.token, gameId),
          moduleApi.getCourierRushPickups(auth.token, gameId),
        ])
        if (cancelled) return
        setGame(gameRecord)
        if (isEdit) {
          const pickups = Array.isArray(pickupsPayload?.pickups) ? pickupsPayload.pickups : []
          const pickup = pickups.find((p) => String(p.id) === String(pickupId))
          if (!pickup) throw new Error(t('courier_rush.admin.pickup_not_found', {}, 'Pickup not found'))
          setForm({
            title: String(pickup.title || ''),
            latitude: pickup.latitude == null ? '' : String(pickup.latitude),
            longitude: pickup.longitude == null ? '' : String(pickup.longitude),
            radius_meters: String(Number(pickup.radius_meters || 25)),
            points: String(Number(pickup.points || 5)),
            marker_color: String(pickup.marker_color || '#2563eb'),
            is_active: Boolean(pickup.is_active),
          })
        }
      } catch (err) { if (!cancelled) setError(err.message || 'Failed to load') }
      finally { if (!cancelled) setLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [auth.token, gameId, pickupId, isEdit])

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    const payload = {
      title: form.title.trim(),
      latitude: Number(form.latitude), longitude: Number(form.longitude),
      radius_meters: Number(form.radius_meters || 25), points: Number(form.points || 5),
      marker_color: String(form.marker_color || '#2563eb').trim().toLowerCase(),
      is_active: Boolean(form.is_active),
    }
    if (!Number.isFinite(payload.latitude) || !Number.isFinite(payload.longitude)) {
      setError(t('courier_rush.admin.lat_lon_required', {}, 'Latitude and longitude are required'))
      return
    }
    setSaving(true)
    try {
      if (isEdit) { await moduleApi.updateCourierRushPickup(auth.token, gameId, pickupId, payload) }
      else { await moduleApi.createCourierRushPickup(auth.token, gameId, payload) }
      navigate('/admin/courier-rush/' + gameId + '/pickups', { state: { flashSuccess: t('courier_rush.admin.pickup_saved', {}, 'Pickup saved') } })
    } catch (err) { setError(err.message || 'Failed to save pickup') }
    finally { setSaving(false) }
  }

  return (
    <main className="page-shell">
      <div className="geo-header">
        <div>
          <p className="overview-kicker">{t('courier_rush.admin.kicker', {}, 'Courier Rush')}</p>
          <h1>{isEdit ? t('courier_rush.admin.pickup_edit_heading', {}, 'Edit pickup') : t('courier_rush.admin.pickup_new_heading', {}, 'New pickup')}</h1>
        </div>
        <div className="overview-actions">
          <Link className="btn btn-ghost" to={'/admin/courier-rush/' + gameId + '/pickups'}>{t('courier_rush.admin.back', {}, 'Back')}</Link>
        </div>
      </div>
      {error ? <div className="flash flash-error">{error}</div> : null}
      {loading ? <p>{t('gamesPage.loading', {}, 'Loading...')}</p> : null}
      {!loading ? (
        <section className="admin-block">
          <form onSubmit={handleSubmit}>
            <div className="form-row"><label htmlFor="pickup-title">{t('courier_rush.admin.table_title', {}, 'Title')}</label><input id="pickup-title" value={form.title} onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))} required /></div>
            <GeoLocationPicker latitude={form.latitude} longitude={form.longitude} onChange={(lat, lon) => setForm((c) => ({ ...c, latitude: lat, longitude: lon }))} ariaLabel={t('courier_rush.admin.pickup_map_label', {}, 'Pickup location')} />
            <div className="form-row form-row-inline">
              <div><label htmlFor="pickup-lat">{t('courier_rush.admin.latitude', {}, 'Latitude')}</label><input id="pickup-lat" type="number" step="0.000001" value={form.latitude} onChange={(e) => setForm((c) => ({ ...c, latitude: e.target.value }))} required /></div>
              <div><label htmlFor="pickup-lon">{t('courier_rush.admin.longitude', {}, 'Longitude')}</label><input id="pickup-lon" type="number" step="0.000001" value={form.longitude} onChange={(e) => setForm((c) => ({ ...c, longitude: e.target.value }))} required /></div>
            </div>
            <div className="form-row"><label htmlFor="pickup-radius">{t('courier_rush.admin.table_radius', {}, 'Radius')}</label><input id="pickup-radius" type="number" min="5" value={form.radius_meters} onChange={(e) => setForm((c) => ({ ...c, radius_meters: e.target.value }))} required /></div>
            <div className="form-row"><label htmlFor="pickup-points">{t('courier_rush.admin.table_points', {}, 'Points')}</label><input id="pickup-points" type="number" min="1" value={form.points} onChange={(e) => setForm((c) => ({ ...c, points: e.target.value }))} required /></div>
            <div className="form-row"><label htmlFor="pickup-color">{t('common.color', {}, 'Color')}</label><input id="pickup-color" type="color" value={form.marker_color} onChange={(e) => setForm((c) => ({ ...c, marker_color: e.target.value }))} required /></div>
            <div className="form-row"><label><input type="checkbox" checked={form.is_active} onChange={(e) => setForm((c) => ({ ...c, is_active: e.target.checked }))} /> {t('courier_rush.admin.active', {}, 'Active')}</label></div>
            <div className="overview-actions" style={{ marginTop: '1rem' }}>
              <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? t('button.saving', {}, 'Saving\u2026') : t('button.save', {}, 'Save')}</button>
              <Link className="btn btn-ghost" to={'/admin/courier-rush/' + gameId + '/pickups'}>{t('button.cancel', {}, 'Cancel')}</Link>
            </div>
          </form>
        </section>
      ) : null}
    </main>
  )
}
