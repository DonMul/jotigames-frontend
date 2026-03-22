import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import GeoLocationPicker from '../../components/GeoLocationPicker'
import { gameApi, moduleApi } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { useI18n } from '../../lib/i18n'

function defaultForm() {
  return {
    id: '',
    title: '',
    hint: '',
    latitude: '',
    longitude: '',
    radius_meters: '25',
    signal_radius_meters: '0',
    points: '5',
    marker_color: '#7c3aed',
    is_active: true,
  }
}

export default function EchoHuntAdminPage() {
  const { gameId } = useParams()
  const { auth } = useAuth()
  const { t } = useI18n()

  const [game, setGame] = useState(null)
  const [beacons, setBeacons] = useState([])
  const [form, setForm] = useState(defaultForm)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const isEdit = Boolean(form.id)

  async function loadAll() {
    setLoading(true)
    setError('')
    try {
      const [gameRecord, beaconsPayload] = await Promise.all([
        gameApi.getGame(auth.token, gameId),
        moduleApi.getEchoHuntBeacons(auth.token, gameId),
      ])
      setGame(gameRecord)
      setBeacons(Array.isArray(beaconsPayload?.beacons) ? beaconsPayload.beacons : [])
    } catch (err) {
      setError(err.message || 'Failed to load beacons')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [auth.token, gameId])

  function resetForm() {
    setForm(defaultForm())
  }

  function fillForm(beacon) {
    setForm({
      id: String(beacon?.id || ''),
      title: String(beacon?.title || ''),
      hint: String(beacon?.hint || ''),
      latitude: beacon?.latitude === null || beacon?.latitude === undefined ? '' : String(beacon.latitude),
      longitude: beacon?.longitude === null || beacon?.longitude === undefined ? '' : String(beacon.longitude),
      radius_meters: String(Number(beacon?.radius_meters || 25)),
      signal_radius_meters: String(Number(beacon?.signal_radius_meters || 0)),
      points: String(Number(beacon?.points || 5)),
      marker_color: String(beacon?.marker_color || '#7c3aed'),
      is_active: Boolean(beacon?.is_active),
    })
  }

  async function handleDeleteBeacon(beacon) {
    if (!window.confirm(t('echo_hunt.admin.delete_confirm', {}, 'Delete beacon?'))) {
      return
    }

    setError('')
    setSuccess('')
    try {
      await moduleApi.deleteEchoHuntBeacon(auth.token, gameId, beacon.id)
      await loadAll()
      if (String(form.id) === String(beacon.id)) {
        resetForm()
      }
      setSuccess(t('moduleOverview.delete', {}, 'Deleted'))
    } catch (err) {
      setError(err.message || 'Failed to delete beacon')
    }
  }

  async function handleSubmitBeacon(event) {
    event.preventDefault()
    setError('')
    setSuccess('')

    const payload = {
      title: form.title.trim(),
      hint: form.hint.trim() || null,
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      radius_meters: Number(form.radius_meters || 25),
      signal_radius_meters: Number(form.signal_radius_meters || 0),
      points: Number(form.points || 5),
      marker_color: String(form.marker_color || '#7c3aed').trim().toLowerCase(),
      is_active: Boolean(form.is_active),
    }

    if (!Number.isFinite(payload.latitude) || !Number.isFinite(payload.longitude)) {
      setError('Latitude and longitude are required')
      return
    }

    try {
      if (isEdit) {
        await moduleApi.updateEchoHuntBeacon(auth.token, gameId, form.id, payload)
      } else {
        await moduleApi.createEchoHuntBeacon(auth.token, gameId, payload)
      }
      await loadAll()
      resetForm()
      setSuccess(t('button.save', {}, 'Saved'))
    } catch (err) {
      setError(err.message || 'Failed to save beacon')
    }
  }

  return (
    <main className="page-shell">
      <section className="overview-header">
        <div>
          <p className="overview-kicker">{t('echo_hunt.admin.kicker', {}, 'Echo Hunt')}</p>
          <h1>{game?.name || '-'}</h1>
          <p className="overview-subtitle">{t('echo_hunt.admin.beacons_subtitle', {}, 'Manage beacons')}</p>
        </div>
        <div className="overview-actions">
          <Link className="btn btn-ghost" to={`/admin/games/${gameId}`}>
            {t('echo_hunt.admin.back', {}, 'Back')}
          </Link>
          <button className="btn btn-primary" type="button" onClick={resetForm}>
            {t('echo_hunt.admin.create_beacon', {}, 'Create beacon')}
          </button>
        </div>
      </section>

      {error ? <div className="flash flash-error">{error}</div> : null}
      {success ? <div className="flash flash-success">{success}</div> : null}
      {loading ? <p>{t('gamesPage.loading', {}, 'Loading…')}</p> : null}

      <div className="geo-layout">
        <section className="overview-panel">
          <h2>{t('echo_hunt.admin.beacons_list', {}, 'Beacons')}</h2>
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('echo_hunt.admin.table_title', {}, 'Title')}</th>
                <th>{t('echo_hunt.admin.table_hint', {}, 'Hint')}</th>
                <th>{t('common.lat', {}, 'Lat')}</th>
                <th>{t('common.lon', {}, 'Lon')}</th>
                <th>{t('echo_hunt.admin.table_radius', {}, 'Radius')}</th>
                <th>{t('echo_hunt.admin.signal_radius', {}, 'Signal radius')}</th>
                <th>{t('echo_hunt.admin.table_points', {}, 'Points')}</th>
                <th>{t('echo_hunt.admin.table_actions', {}, 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {beacons.map((beacon) => (
                <tr key={beacon.id}>
                  <td>{beacon.title}</td>
                  <td>{beacon.hint || t('echo_hunt.admin.empty_hint', {}, '—')}</td>
                  <td>{beacon.latitude}</td>
                  <td>{beacon.longitude}</td>
                  <td>{beacon.radius_meters}</td>
                  <td>{beacon.signal_radius_meters <= 0 ? t('echo_hunt.admin.signal_radius_always', {}, 'Always') : beacon.signal_radius_meters}</td>
                  <td>{beacon.points}</td>
                  <td className="table-actions-inline">
                    <button className="btn btn-edit btn-small" type="button" onClick={() => fillForm(beacon)}>
                      {t('button.edit', {}, 'Edit')}
                    </button>
                    <button className="btn btn-remove btn-small" type="button" onClick={() => handleDeleteBeacon(beacon)}>
                      {t('button.delete', {}, 'Delete')}
                    </button>
                  </td>
                </tr>
              ))}
              {beacons.length === 0 ? (
                <tr>
                  <td colSpan={8} className="muted">{t('echo_hunt.admin.empty_beacons', {}, 'No beacons yet')}</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </section>

        <section className="overview-panel">
          <h2>{isEdit ? t('button.edit', {}, 'Edit') : t('echo_hunt.admin.create_beacon', {}, 'Create beacon')}</h2>
          <form onSubmit={handleSubmitBeacon} className="form-grid">
            <div className="form-row">
              <label htmlFor="beacon-title">{t('echo_hunt.admin.table_title', {}, 'Title')}</label>
              <input
                id="beacon-title"
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                required
              />
            </div>
            <div className="form-row">
              <label htmlFor="beacon-hint">{t('echo_hunt.admin.table_hint', {}, 'Hint')}</label>
              <input
                id="beacon-hint"
                value={form.hint}
                onChange={(event) => setForm((current) => ({ ...current, hint: event.target.value }))}
              />
            </div>
            <div className="form-row form-row-inline">
              <GeoLocationPicker
                latitude={form.latitude}
                longitude={form.longitude}
                onChange={(nextLat, nextLon) => setForm((current) => ({ ...current, latitude: nextLat, longitude: nextLon }))}
                ariaLabel={t('echo_hunt.admin.table_title', {}, 'Beacon location')}
              />
              <div>
                <label htmlFor="beacon-lat">{t('echo_hunt.admin.latitude', {}, 'Latitude')}</label>
                <input
                  id="beacon-lat"
                  type="number"
                  step="0.000001"
                  value={form.latitude}
                  onChange={(event) => setForm((current) => ({ ...current, latitude: event.target.value }))}
                  required
                />
              </div>
              <div>
                <label htmlFor="beacon-lon">{t('echo_hunt.admin.longitude', {}, 'Longitude')}</label>
                <input
                  id="beacon-lon"
                  type="number"
                  step="0.000001"
                  value={form.longitude}
                  onChange={(event) => setForm((current) => ({ ...current, longitude: event.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="form-row">
              <label htmlFor="beacon-radius">{t('echo_hunt.admin.table_radius', {}, 'Radius')}</label>
              <input
                id="beacon-radius"
                type="number"
                min="5"
                value={form.radius_meters}
                onChange={(event) => setForm((current) => ({ ...current, radius_meters: event.target.value }))}
                required
              />
            </div>
            <div className="form-row">
              <label htmlFor="beacon-signal-radius">{t('echo_hunt.admin.signal_radius', {}, 'Signal radius')}</label>
              <input
                id="beacon-signal-radius"
                type="number"
                min="0"
                value={form.signal_radius_meters}
                onChange={(event) => setForm((current) => ({ ...current, signal_radius_meters: event.target.value }))}
              />
            </div>
            <div className="form-row">
              <label htmlFor="beacon-points">{t('echo_hunt.admin.table_points', {}, 'Points')}</label>
              <input
                id="beacon-points"
                type="number"
                min="1"
                value={form.points}
                onChange={(event) => setForm((current) => ({ ...current, points: event.target.value }))}
                required
              />
            </div>
            <div className="form-row">
              <label htmlFor="beacon-color">{t('common.color', {}, 'Color')}</label>
              <input
                id="beacon-color"
                type="color"
                value={form.marker_color}
                onChange={(event) => setForm((current) => ({ ...current, marker_color: event.target.value }))}
                required
              />
            </div>
            <div className="form-row">
              <label>
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))}
                />{' '}
                {t('echo_hunt.admin.active', {}, 'Active')}
              </label>
            </div>
            <div className="overview-actions" style={{ marginTop: '1rem' }}>
              <button className="btn btn-primary" type="submit">{isEdit ? t('button.save', {}, 'Save') : t('button.create', {}, 'Create')}</button>
              {isEdit ? (
                <button className="btn btn-ghost" type="button" onClick={resetForm}>
                  {t('button.cancel', {}, 'Cancel')}
                </button>
              ) : null}
            </div>
          </form>
        </section>
      </div>
    </main>
  )
}
