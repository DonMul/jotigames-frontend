import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import GeoLocationPicker from '../../components/GeoLocationPicker'
import { gameApi, moduleApi } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { useI18n } from '../../lib/i18n'

function defaultForm() {
  return { title: '', latitude: '', longitude: '', radius_meters: '25', points: '5', marker_color: '#dc2626', is_active: true }
}

export default function CheckpointHeistCheckpointFormPage() {
  const { gameId, checkpointId } = useParams()
  const navigate = useNavigate()
  const { auth } = useAuth()
  const { t } = useI18n()

  const [game, setGame] = useState(null)
  const [form, setForm] = useState(defaultForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const isEdit = Boolean(checkpointId)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError('')
      try {
        const [gameRecord, checkpointsPayload] = await Promise.all([
          gameApi.getGame(auth.token, gameId),
          moduleApi.getCheckpointHeistCheckpoints(auth.token, gameId),
        ])
        if (cancelled) return
        setGame(gameRecord)
        if (isEdit) {
          const checkpoints = Array.isArray(checkpointsPayload?.checkpoints) ? checkpointsPayload.checkpoints : []
          const cp = checkpoints.find((c) => String(c.id) === String(checkpointId))
          if (!cp) throw new Error(t('checkpoint_heist.admin.checkpoint_not_found', {}, 'Checkpoint not found'))
          setForm({
            title: String(cp.title || ''),
            latitude: cp.latitude == null ? '' : String(cp.latitude),
            longitude: cp.longitude == null ? '' : String(cp.longitude),
            radius_meters: String(Number(cp.radius_meters || 25)),
            points: String(Number(cp.points || 5)),
            marker_color: String(cp.marker_color || '#dc2626'),
            is_active: Boolean(cp.is_active),
          })
        }
      } catch (err) { if (!cancelled) setError(err.message || 'Failed to load') }
      finally { if (!cancelled) setLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [auth.token, gameId, checkpointId, isEdit])

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    const payload = {
      title: form.title.trim(),
      latitude: Number(form.latitude), longitude: Number(form.longitude),
      radius_meters: Number(form.radius_meters || 25), points: Number(form.points || 5),
      marker_color: String(form.marker_color || '#dc2626').trim().toLowerCase(),
      is_active: Boolean(form.is_active),
    }
    if (!Number.isFinite(payload.latitude) || !Number.isFinite(payload.longitude)) {
      setError(t('checkpoint_heist.admin.lat_lon_required', {}, 'Latitude and longitude are required'))
      return
    }
    setSaving(true)
    try {
      if (isEdit) { await moduleApi.updateCheckpointHeistCheckpoint(auth.token, gameId, checkpointId, payload) }
      else { await moduleApi.createCheckpointHeistCheckpoint(auth.token, gameId, payload) }
      navigate('/admin/checkpoint-heist/' + gameId + '/checkpoints', { state: { flashSuccess: t('checkpoint_heist.admin.checkpoint_saved', {}, 'Checkpoint saved') } })
    } catch (err) { setError(err.message || 'Failed to save checkpoint') }
    finally { setSaving(false) }
  }

  return (
    <main className="page-shell">
      <div className="geo-header">
        <div>
          <p className="overview-kicker">{t('checkpoint_heist.admin.kicker', {}, 'Checkpoint Heist')}</p>
          <h1>{isEdit ? t('checkpoint_heist.admin.checkpoint_edit_heading', {}, 'Edit checkpoint') : t('checkpoint_heist.admin.create_checkpoint', {}, 'Create checkpoint')}</h1>
        </div>
        <div className="overview-actions">
          <Link className="btn btn-ghost" to={'/admin/checkpoint-heist/' + gameId + '/checkpoints'}>{t('checkpoint_heist.admin.back', {}, 'Back')}</Link>
        </div>
      </div>
      {error ? <div className="flash flash-error">{error}</div> : null}
      {loading ? <p>{t('gamesPage.loading', {}, 'Loading...')}</p> : null}
      {!loading ? (
        <section className="admin-block">
          <form onSubmit={handleSubmit}>
            <div className="form-row"><label htmlFor="checkpoint-title">{t('checkpoint_heist.admin.table_title', {}, 'Title')}</label><input id="checkpoint-title" value={form.title} onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))} required /></div>
            <div className="form-row"><label htmlFor="checkpoint-points">{t('checkpoint_heist.admin.table_points', {}, 'Points')}</label><input id="checkpoint-points" type="number" min="1" value={form.points} onChange={(e) => setForm((c) => ({ ...c, points: e.target.value }))} required /></div>
            <div className="form-row form-row-inline">
              <GeoLocationPicker latitude={form.latitude} longitude={form.longitude} onChange={(lat, lon) => setForm((c) => ({ ...c, latitude: lat, longitude: lon }))} ariaLabel={t('checkpoint_heist.admin.map_label', {}, 'Checkpoint location')} />
              <div><label htmlFor="checkpoint-lat">{t('checkpoint_heist.admin.latitude', {}, 'Latitude')}</label><input id="checkpoint-lat" type="number" step="0.000001" value={form.latitude} onChange={(e) => setForm((c) => ({ ...c, latitude: e.target.value }))} required /></div>
              <div><label htmlFor="checkpoint-lon">{t('checkpoint_heist.admin.longitude', {}, 'Longitude')}</label><input id="checkpoint-lon" type="number" step="0.000001" value={form.longitude} onChange={(e) => setForm((c) => ({ ...c, longitude: e.target.value }))} required /></div>
            </div>
            <div className="form-row form-row-inline">
              <div><label htmlFor="checkpoint-radius">{t('checkpoint_heist.admin.table_radius', {}, 'Radius')}</label><input id="checkpoint-radius" type="number" min="5" value={form.radius_meters} onChange={(e) => setForm((c) => ({ ...c, radius_meters: e.target.value }))} required /></div>
              <div><label htmlFor="checkpoint-color">{t('common.color', {}, 'Color')}</label><input id="checkpoint-color" type="color" value={form.marker_color} onChange={(e) => setForm((c) => ({ ...c, marker_color: e.target.value }))} required /></div>
            </div>
            <div className="form-row"><label><input type="checkbox" checked={form.is_active} onChange={(e) => setForm((c) => ({ ...c, is_active: e.target.checked }))} /> {t('checkpoint_heist.admin.active', {}, 'Active')}</label></div>
            <div className="overview-actions" style={{ marginTop: '1rem' }}>
              <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? t('button.saving', {}, 'Saving\u2026') : t('button.save', {}, 'Save')}</button>
              <Link className="btn btn-ghost" to={'/admin/checkpoint-heist/' + gameId + '/checkpoints'}>{t('button.cancel', {}, 'Cancel')}</Link>
            </div>
          </form>
        </section>
      ) : null}
    </main>
  )
}
