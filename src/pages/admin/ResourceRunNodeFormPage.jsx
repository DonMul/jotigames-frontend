import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import GeoLocationPicker from '../../components/GeoLocationPicker'
import { gameApi, moduleApi } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { useI18n } from '../../lib/i18n'

function defaultForm() {
  return { title: '', resource_type: 'food', latitude: '', longitude: '', radius_meters: '25', points: '1', marker_color: '#ef4444' }
}

export default function ResourceRunNodeFormPage() {
  const { gameId, nodeId } = useParams()
  const navigate = useNavigate()
  const { auth } = useAuth()
  const { t } = useI18n()

  const [game, setGame] = useState(null)
  const [form, setForm] = useState(defaultForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const isEdit = Boolean(nodeId)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError('')
      try {
        const [gameRecord, nodesPayload] = await Promise.all([
          gameApi.getGame(auth.token, gameId),
          moduleApi.getResourceRunNodes(auth.token, gameId),
        ])
        if (cancelled) return
        setGame(gameRecord)
        if (isEdit) {
          const nodes = Array.isArray(nodesPayload?.nodes) ? nodesPayload.nodes : []
          const node = nodes.find((n) => String(n.id) === String(nodeId))
          if (!node) throw new Error(t('resource_run.admin.node_not_found', {}, 'Node not found'))
          setForm({
            title: String(node.title || ''),
            resource_type: String(node.resource_type || 'food'),
            latitude: node.latitude == null ? '' : String(node.latitude),
            longitude: node.longitude == null ? '' : String(node.longitude),
            radius_meters: String(Number(node.radius_meters || 25)),
            points: String(Number(node.points || 1)),
            marker_color: String(node.marker_color || '#ef4444'),
          })
        }
      } catch (err) { if (!cancelled) setError(err.message || 'Failed to load') }
      finally { if (!cancelled) setLoading(false) }
    }
    load()
    return () => { cancelled = true }
  }, [auth.token, gameId, nodeId, isEdit])

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    const payload = {
      title: form.title.trim(), resource_type: form.resource_type.trim(),
      latitude: Number(form.latitude), longitude: Number(form.longitude),
      radius_meters: Number(form.radius_meters || 25), points: Number(form.points || 1),
      marker_color: String(form.marker_color || '#ef4444').trim().toLowerCase(),
    }
    if (!Number.isFinite(payload.latitude) || !Number.isFinite(payload.longitude)) {
      setError(t('resource_run.admin.lat_lon_required', {}, 'Latitude and longitude are required'))
      return
    }
    setSaving(true)
    try {
      if (isEdit) { await moduleApi.updateResourceRunNode(auth.token, gameId, nodeId, payload) }
      else { await moduleApi.createResourceRunNode(auth.token, gameId, payload) }
      navigate('/admin/resource-run/' + gameId + '/nodes', { state: { flashSuccess: t('resource_run.admin.node_saved', {}, 'Node saved') } })
    } catch (err) { setError(err.message || 'Failed to save node') }
    finally { setSaving(false) }
  }

  return (
    <main className="page-shell">
      <div className="geo-header">
        <div>
          <p className="overview-kicker">{t('resource_run.admin.kicker', {}, 'Resource Run')}</p>
          <h1>{isEdit ? t('resource_run.admin.node_edit_heading', {}, 'Edit node') : t('resource_run.admin.node_new_heading', {}, 'New node')}</h1>
        </div>
        <div className="overview-actions">
          <Link className="btn btn-ghost" to={'/admin/resource-run/' + gameId + '/nodes'}>{t('resource_run.admin.back', {}, 'Back')}</Link>
        </div>
      </div>
      {error ? <div className="flash flash-error">{error}</div> : null}
      {loading ? <p>{t('gamesPage.loading', {}, 'Loading...')}</p> : null}
      {!loading ? (
        <section className="admin-block">
          <form onSubmit={handleSubmit}>
            <div className="form-row"><label htmlFor="node-title">{t('resource_run.admin.node_field_title', {}, 'Title')}</label><input id="node-title" value={form.title} onChange={(e) => setForm((c) => ({ ...c, title: e.target.value }))} required /></div>
            <div className="form-row"><label htmlFor="node-type">{t('resource_run.admin.node_field_type', {}, 'Type')}</label><input id="node-type" value={form.resource_type} onChange={(e) => setForm((c) => ({ ...c, resource_type: e.target.value }))} required /></div>
            <div className="form-row form-row-inline">
              <GeoLocationPicker latitude={form.latitude} longitude={form.longitude} onChange={(lat, lon) => setForm((c) => ({ ...c, latitude: lat, longitude: lon }))} ariaLabel={t('resource_run.admin.node_map_label', {}, 'Node location')} />
              <div><label htmlFor="node-lat">{t('resource_run.admin.node_field_lat', {}, 'Latitude')}</label><input id="node-lat" type="number" step="0.000001" value={form.latitude} onChange={(e) => setForm((c) => ({ ...c, latitude: e.target.value }))} required /></div>
              <div><label htmlFor="node-lon">{t('resource_run.admin.node_field_lon', {}, 'Longitude')}</label><input id="node-lon" type="number" step="0.000001" value={form.longitude} onChange={(e) => setForm((c) => ({ ...c, longitude: e.target.value }))} required /></div>
            </div>
            <div className="form-row"><label htmlFor="node-radius">{t('resource_run.admin.node_field_radius', {}, 'Radius')}</label><input id="node-radius" type="number" min="5" value={form.radius_meters} onChange={(e) => setForm((c) => ({ ...c, radius_meters: e.target.value }))} required /></div>
            <div className="form-row"><label htmlFor="node-points">{t('resource_run.admin.node_field_points', {}, 'Points')}</label><input id="node-points" type="number" min="1" value={form.points} onChange={(e) => setForm((c) => ({ ...c, points: e.target.value }))} required /></div>
            <div className="form-row"><label htmlFor="node-color">{t('common.color', {}, 'Color')}</label><input id="node-color" type="color" value={form.marker_color} onChange={(e) => setForm((c) => ({ ...c, marker_color: e.target.value }))} required /></div>
            <div className="overview-actions" style={{ marginTop: '1rem' }}>
              <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? t('button.saving', {}, 'Saving\u2026') : t('button.save', {}, 'Save')}</button>
              <Link className="btn btn-ghost" to={'/admin/resource-run/' + gameId + '/nodes'}>{t('button.cancel', {}, 'Cancel')}</Link>
            </div>
          </form>
        </section>
      ) : null}
    </main>
  )
}
