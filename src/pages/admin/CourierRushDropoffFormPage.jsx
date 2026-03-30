import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import GeoLocationPicker from '../../components/GeoLocationPicker'
import { gameApi, moduleApi } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { useI18n } from '../../lib/i18n'

function defaultForm() {
  return { title: '', latitude: '', longitude: '', radius_meters: '25', marker_color: '#16a34a', is_active: true }
}

export default function CourierRushDropoffFormPage() {
  const { gameId, dropoffId } = useParams()
  const navigate = useNavigate()
  const { auth } = useAuth()
  const { t } = useI18n()

  const [game, setGame] = useState(null)
  const [form, setForm] = useState(defaultForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const isEdit = Boolean(dropoffId)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError('')
      try {
        const [gameRecord, dropoffsPayload] = await Promise.all([
          gameApi.getGame(auth.token, gameId),
          moduleApi.getCourierRushDropoffs(auth.token, gameId),
        ])
        if (cancelled) return
        setGame(gameRecord)
        if (isEdit) {
          const dropoffs = Array.isArray(dropoffsPayload?.dropoffs) ? dropoffsPayload.dropoffs : []
          const dropoff = dropoffs.find((d) => String(d.id) === String(dropoffId))
          if (!dropoff) throw new Error(t('courier_rush.admin.dropoff_not_found', {}, 'Dropoff not found'))
          setForm({
            title: String(dropoff.title || ''),
            latitude: dropoff.latitude == null ? '' : String(dropoff.latitude),
            longitude: dropoff.longitude == null ? '' : String(dropoff.longitude),
            radius_meters: String(Number(dropoff.radius_meters || 25)),
            marker_color: String(dropoff.marker_color || '#16a34a'),
            is_active: Boolean(dropoff.is_active),
          })
        }
      } catch (err) { if (!cancelled) setError(err.message || 'Failed to load') }
      finally { if (!cancelled) setLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [auth.token, gameId, dropoffId, isEdit])

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    const payload = {
      title: form.title.trim(),
      latitude: Number(form.latitude), longitude: Number(form.longitude),
      radius_meters: Number(form.radius_meters || 25),
      marker_color: String(form.marker_color || '#16a34a').trim().toLowerCase(),
      is_active: Boolean(form.is_active),
    }
    if (!Number.isFinite(payload.latitude) || !Number.isFinite(payload.longitude)) {
      setError(t('courier_rush.admin.lat_lon_required', {}, 'Latitude and longitude are required'))
      return
    }
    setSaving(true)
    try {
      if (isEdit) { await moduleApi.updateCourierRushDropoff(auth.token, gameId, dropoffId, payload) }
      else { await moduleApi.createCourierRushDropoff(auth.token, gameId, payload) }
      navigate('/admin/courier-rush/' + gameId + '/dropoffs', { state: { flashSuccess: t('courier_rush.admin.dropoff_saved', {}, 'Dropoff saved') } })
    } catch (err) { setError(err.message || t('courier_rush.dropoff.createFailed', {}, 'Failed to create dropoff')) }
    finally { setSaving(false) }
  }

  return (
    <main className="page-shell">
      <div className="geo-header">
        <div>
          <p className="overview-kicker">{t('courier_rush.admin.kicker', {}, 'Courier Rush')}</p>
          <h1>{isEdit ? t('courier_rush.admin.dropoff_edit_heading', {}, 'Edit dropoff') : t('courier_rush.admin.dropoff_new_heading', {}, 'New dropoff')}</h1>
        </div>
        <div className="overview-actions">
          <Link className="btn btn-ghost" to={'/admin/courier-rush/' + gameId + '/dropoffs'}>{t('courier_rush.admin.back', {}, 'Back')}</Link>
        </div>
      </div>
      {error ? <div className="flash flash-error">{error}</div> : null}
      {loading ? <p>{t('gamesPage.loading', {}, 'Loading...')}</p> : null}
      {!loading ? (
        <section className="admin-block">
          <form onSubmit={handleSubmit}>
            <div className="form-row"><label htmlFor="dropoff-title">{t('courier_rush.admin.table_title', {}, 'Title')}</label><input id="dropoff-title" value={form.title} onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))} required /></div>
            <div className="form-row">
              <label>{t('courier_rush.admin.dropoff_map_label', {}, 'Dropoff location')}</label>
              <p className="muted">{t('courier_rush.admin.location_map_help', {}, 'Klik op de kaart om de locatie te selecteren.')}</p>
              <GeoLocationPicker latitude={form.latitude} longitude={form.longitude} onChange={(lat, lon) => setForm((c) => ({ ...c, latitude: lat, longitude: lon }))} ariaLabel={t('courier_rush.admin.dropoff_map_label', {}, 'Dropoff location')} />
            </div>
            <div className="form-row"><label htmlFor="dropoff-radius">{t('courier_rush.admin.table_radius', {}, 'Radius')}</label><input id="dropoff-radius" type="number" min="5" value={form.radius_meters} onChange={(e) => setForm((c) => ({ ...c, radius_meters: e.target.value }))} required /></div>
            <div className="form-row"><label htmlFor="dropoff-color">{t('common.color', {}, 'Color')}</label><input id="dropoff-color" type="color" value={form.marker_color} onChange={(e) => setForm((c) => ({ ...c, marker_color: e.target.value }))} required /></div>
            <div className="form-row">
              <label className="blindhike-toggle-row" htmlFor="courier-dropoff-active">
                <span className="blindhike-toggle-label">{t('courier_rush.admin.active', {}, 'Active')}</span>
                <span className="game-type-switch">
                  <input id="courier-dropoff-active" type="checkbox" checked={form.is_active} onChange={(e) => setForm((c) => ({ ...c, is_active: e.target.checked }))} />
                  <span className="game-type-switch-track" aria-hidden="true" />
                </span>
              </label>
            </div>
            <div className="overview-actions" style={{ marginTop: '1rem' }}>
              <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? t('button.saving', {}, 'Saving\u2026') : t('button.save', {}, 'Save')}</button>
              <Link className="btn btn-ghost" to={'/admin/courier-rush/' + gameId + '/dropoffs'}>{t('button.cancel', {}, 'Cancel')}</Link>
            </div>
          </form>
        </section>
      ) : null}
    </main>
  )
}
