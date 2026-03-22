import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import GeoLocationPicker from '../../components/GeoLocationPicker'
import { gameApi, moduleApi } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { useI18n } from '../../lib/i18n'

function defaultPickupForm() {
  return {
    id: '',
    title: '',
    latitude: '',
    longitude: '',
    radius_meters: '25',
    points: '5',
    marker_color: '#2563eb',
    is_active: true,
  }
}

function defaultDropoffForm() {
  return {
    id: '',
    title: '',
    latitude: '',
    longitude: '',
    radius_meters: '25',
    marker_color: '#16a34a',
    is_active: true,
  }
}

function defaultConfigForm() {
  return {
    pickup_mode: 'predefined',
    dropoff_mode: 'random',
    max_active_pickups: '3',
    pickup_spawn_area_geojson: '',
  }
}

export default function CourierRushAdminPage() {
  const { gameId } = useParams()
  const { auth } = useAuth()
  const { t } = useI18n()

  const [game, setGame] = useState(null)
  const [pickups, setPickups] = useState([])
  const [dropoffs, setDropoffs] = useState([])
  const [configForm, setConfigForm] = useState(defaultConfigForm)
  const [pickupForm, setPickupForm] = useState(defaultPickupForm)
  const [dropoffForm, setDropoffForm] = useState(defaultDropoffForm)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const isEditingPickup = Boolean(pickupForm.id)
  const isEditingDropoff = Boolean(dropoffForm.id)

  const pickupCount = pickups.length
  const dropoffCount = dropoffs.length

  const summaryRows = useMemo(
    () => [
      { label: t('courier_rush.admin.pickups', {}, 'Pickups'), value: String(pickupCount) },
      { label: t('courier_rush.admin.dropoffs', {}, 'Dropoffs'), value: String(dropoffCount) },
      {
        label: t('courier_rush.admin.pickup_mode', {}, 'Pickup mode'),
        value:
          configForm.pickup_mode === 'random'
            ? t('courier_rush.admin.pickup_mode_random', {}, 'Random')
            : t('courier_rush.admin.pickup_mode_predefined', {}, 'Predefined'),
      },
      {
        label: t('courier_rush.admin.dropoff_mode', {}, 'Dropoff mode'),
        value:
          configForm.dropoff_mode === 'fixed'
            ? t('courier_rush.admin.dropoff_mode_fixed', {}, 'Fixed')
            : t('courier_rush.admin.dropoff_mode_random', {}, 'Random'),
      },
      {
        label: t('courier_rush.admin.max_active_pickups', {}, 'Max active pickups'),
        value: String(configForm.max_active_pickups || '3'),
      },
    ],
    [configForm.dropoff_mode, configForm.max_active_pickups, configForm.pickup_mode, dropoffCount, pickupCount, t],
  )

  async function loadAll() {
    setLoading(true)
    setError('')
    try {
      const [gameRecord, configPayload, pickupsPayload, dropoffsPayload] = await Promise.all([
        gameApi.getGame(auth.token, gameId),
        moduleApi.getCourierRushConfig(auth.token, gameId),
        moduleApi.getCourierRushPickups(auth.token, gameId),
        moduleApi.getCourierRushDropoffs(auth.token, gameId),
      ])

      const config = configPayload?.config || {}

      setGame(gameRecord)
      setConfigForm({
        pickup_mode: String(config?.pickup_mode || 'predefined'),
        dropoff_mode: String(config?.dropoff_mode || 'random'),
        max_active_pickups: String(Number(config?.max_active_pickups || 3)),
        pickup_spawn_area_geojson: String(config?.pickup_spawn_area_geojson || ''),
      })
      setPickups(Array.isArray(pickupsPayload?.pickups) ? pickupsPayload.pickups : [])
      setDropoffs(Array.isArray(dropoffsPayload?.dropoffs) ? dropoffsPayload.dropoffs : [])
    } catch (err) {
      setError(err.message || 'Failed to load Courier Rush admin data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [auth.token, gameId])

  function resetPickupForm() {
    setPickupForm(defaultPickupForm())
  }

  function resetDropoffForm() {
    setDropoffForm(defaultDropoffForm())
  }

  function editPickup(pickup) {
    setPickupForm({
      id: String(pickup?.id || ''),
      title: String(pickup?.title || ''),
      latitude: pickup?.latitude === null || pickup?.latitude === undefined ? '' : String(pickup.latitude),
      longitude: pickup?.longitude === null || pickup?.longitude === undefined ? '' : String(pickup.longitude),
      radius_meters: String(Number(pickup?.radius_meters || 25)),
      points: String(Number(pickup?.points || 5)),
      marker_color: String(pickup?.marker_color || '#2563eb'),
      is_active: Boolean(pickup?.is_active),
    })
  }

  function editDropoff(dropoff) {
    setDropoffForm({
      id: String(dropoff?.id || ''),
      title: String(dropoff?.title || ''),
      latitude: dropoff?.latitude === null || dropoff?.latitude === undefined ? '' : String(dropoff.latitude),
      longitude: dropoff?.longitude === null || dropoff?.longitude === undefined ? '' : String(dropoff.longitude),
      radius_meters: String(Number(dropoff?.radius_meters || 25)),
      marker_color: String(dropoff?.marker_color || '#16a34a'),
      is_active: Boolean(dropoff?.is_active),
    })
  }

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
      setError('Max active pickups must be between 1 and 25')
      return
    }

    try {
      await moduleApi.updateCourierRushConfig(auth.token, gameId, payload)
      await loadAll()
      setSuccess(t('courier_rush.admin.settings_saved', {}, 'Settings saved'))
    } catch (err) {
      setError(err.message || 'Failed to save settings')
    }
  }

  async function submitPickup(event) {
    event.preventDefault()
    setError('')
    setSuccess('')

    const payload = {
      title: pickupForm.title.trim(),
      latitude: Number(pickupForm.latitude),
      longitude: Number(pickupForm.longitude),
      radius_meters: Number(pickupForm.radius_meters || 25),
      points: Number(pickupForm.points || 5),
      marker_color: String(pickupForm.marker_color || '#2563eb').trim().toLowerCase(),
      is_active: Boolean(pickupForm.is_active),
    }

    if (!Number.isFinite(payload.latitude) || !Number.isFinite(payload.longitude)) {
      setError('Pickup latitude and longitude are required')
      return
    }

    try {
      if (isEditingPickup) {
        await moduleApi.updateCourierRushPickup(auth.token, gameId, pickupForm.id, payload)
      } else {
        await moduleApi.createCourierRushPickup(auth.token, gameId, payload)
      }
      await loadAll()
      resetPickupForm()
      setSuccess(t('button.save', {}, 'Saved'))
    } catch (err) {
      setError(err.message || 'Failed to save pickup')
    }
  }

  async function submitDropoff(event) {
    event.preventDefault()
    setError('')
    setSuccess('')

    const payload = {
      title: dropoffForm.title.trim(),
      latitude: Number(dropoffForm.latitude),
      longitude: Number(dropoffForm.longitude),
      radius_meters: Number(dropoffForm.radius_meters || 25),
      marker_color: String(dropoffForm.marker_color || '#16a34a').trim().toLowerCase(),
      is_active: Boolean(dropoffForm.is_active),
    }

    if (!Number.isFinite(payload.latitude) || !Number.isFinite(payload.longitude)) {
      setError('Dropoff latitude and longitude are required')
      return
    }

    try {
      if (isEditingDropoff) {
        await moduleApi.updateCourierRushDropoff(auth.token, gameId, dropoffForm.id, payload)
      } else {
        await moduleApi.createCourierRushDropoff(auth.token, gameId, payload)
      }
      await loadAll()
      resetDropoffForm()
      setSuccess(t('button.save', {}, 'Saved'))
    } catch (err) {
      setError(err.message || 'Failed to save dropoff')
    }
  }

  async function deletePickup(pickup) {
    if (!window.confirm(t('courier_rush.admin.delete_confirm_pickup', {}, 'Delete pickup?'))) {
      return
    }

    setError('')
    setSuccess('')
    try {
      await moduleApi.deleteCourierRushPickup(auth.token, gameId, pickup.id)
      await loadAll()
      if (String(pickupForm.id) === String(pickup.id)) {
        resetPickupForm()
      }
      setSuccess(t('moduleOverview.delete', {}, 'Deleted'))
    } catch (err) {
      setError(err.message || 'Failed to delete pickup')
    }
  }

  async function deleteDropoff(dropoff) {
    if (!window.confirm(t('courier_rush.admin.delete_confirm_dropoff', {}, 'Delete dropoff?'))) {
      return
    }

    setError('')
    setSuccess('')
    try {
      await moduleApi.deleteCourierRushDropoff(auth.token, gameId, dropoff.id)
      await loadAll()
      if (String(dropoffForm.id) === String(dropoff.id)) {
        resetDropoffForm()
      }
      setSuccess(t('moduleOverview.delete', {}, 'Deleted'))
    } catch (err) {
      setError(err.message || 'Failed to delete dropoff')
    }
  }

  return (
    <main className="page-shell">
      <section className="overview-header">
        <div>
          <p className="overview-kicker">{t('courier_rush.admin.kicker', {}, 'Courier Rush')}</p>
          <h1>{game?.name || '-'}</h1>
          <p className="overview-subtitle">{t('courier_rush.admin.config_subtitle', {}, 'Configure settings, pickups and dropoffs')}</p>
        </div>
        <div className="overview-actions">
          <Link className="btn btn-ghost" to={`/admin/games/${gameId}`}>
            {t('courier_rush.admin.back', {}, 'Back')}
          </Link>
        </div>
      </section>

      {error ? <div className="flash flash-error">{error}</div> : null}
      {success ? <div className="flash flash-success">{success}</div> : null}
      {loading ? <p>{t('gamesPage.loading', {}, 'Loading…')}</p> : null}

      <section className="admin-block">
        <h2>{t('common.summary', {}, 'Summary')}</h2>
        <table className="admin-table">
          <tbody>
            {summaryRows.map((row) => (
              <tr key={row.label}>
                <th>{row.label}</th>
                <td>{row.value}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <div className="geo-layout">
        <section className="overview-panel">
          <h2>{t('courier_rush.admin.settings_title', {}, 'Settings')}</h2>
          <form onSubmit={submitConfig} className="form-grid">
            <div className="form-row">
              <label htmlFor="courier-pickup-mode">{t('courier_rush.admin.pickup_mode', {}, 'Pickup mode')}</label>
              <select
                id="courier-pickup-mode"
                value={configForm.pickup_mode}
                onChange={(event) => setConfigForm((current) => ({ ...current, pickup_mode: event.target.value }))}
              >
                <option value="predefined">{t('courier_rush.admin.pickup_mode_predefined', {}, 'Predefined')}</option>
                <option value="random">{t('courier_rush.admin.pickup_mode_random', {}, 'Random')}</option>
              </select>
            </div>

            <div className="form-row">
              <label htmlFor="courier-dropoff-mode">{t('courier_rush.admin.dropoff_mode', {}, 'Dropoff mode')}</label>
              <select
                id="courier-dropoff-mode"
                value={configForm.dropoff_mode}
                onChange={(event) => setConfigForm((current) => ({ ...current, dropoff_mode: event.target.value }))}
              >
                <option value="random">{t('courier_rush.admin.dropoff_mode_random', {}, 'Random')}</option>
                <option value="fixed">{t('courier_rush.admin.dropoff_mode_fixed', {}, 'Fixed')}</option>
              </select>
            </div>

            <div className="form-row">
              <label htmlFor="courier-max-pickups">{t('courier_rush.admin.max_active_pickups', {}, 'Max active pickups')}</label>
              <input
                id="courier-max-pickups"
                type="number"
                min="1"
                max="25"
                value={configForm.max_active_pickups}
                onChange={(event) => setConfigForm((current) => ({ ...current, max_active_pickups: event.target.value }))}
                required
              />
            </div>

            <div className="form-row">
              <label htmlFor="courier-spawn-area">{t('courier_rush.admin.pickup_spawn_area', {}, 'Pickup spawn area (GeoJSON Polygon)')}</label>
              <textarea
                id="courier-spawn-area"
                rows={6}
                value={configForm.pickup_spawn_area_geojson}
                onChange={(event) =>
                  setConfigForm((current) => ({
                    ...current,
                    pickup_spawn_area_geojson: event.target.value,
                  }))
                }
                placeholder='{"type":"Polygon","coordinates":[[[3.72,51.05],[3.73,51.05],[3.73,51.06],[3.72,51.05]]]}'
              />
            </div>

            <div className="overview-actions">
              <button className="btn btn-primary" type="submit">{t('courier_rush.admin.save_settings', {}, 'Save settings')}</button>
            </div>
          </form>
        </section>

        <section className="overview-panel">
          <h2>{t('courier_rush.admin.pickups', {}, 'Pickups')}</h2>
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('courier_rush.admin.table_title', {}, 'Title')}</th>
                <th>{t('common.lat', {}, 'Lat')}</th>
                <th>{t('common.lon', {}, 'Lon')}</th>
                <th>{t('courier_rush.admin.table_radius', {}, 'Radius')}</th>
                <th>{t('courier_rush.admin.table_points', {}, 'Points')}</th>
                <th>{t('courier_rush.admin.table_actions', {}, 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {pickups.map((pickup) => (
                <tr key={pickup.id}>
                  <td>{pickup.title}</td>
                  <td>{pickup.latitude}</td>
                  <td>{pickup.longitude}</td>
                  <td>{pickup.radius_meters}</td>
                  <td>{pickup.points}</td>
                  <td className="table-actions-inline">
                    <button className="btn btn-edit btn-small" type="button" onClick={() => editPickup(pickup)}>
                      {t('button.edit', {}, 'Edit')}
                    </button>
                    <button className="btn btn-remove btn-small" type="button" onClick={() => deletePickup(pickup)}>
                      {t('button.delete', {}, 'Delete')}
                    </button>
                  </td>
                </tr>
              ))}
              {pickups.length === 0 ? (
                <tr>
                  <td colSpan={6} className="muted">{t('courier_rush.admin.empty_pickups', {}, 'No pickups yet')}</td>
                </tr>
              ) : null}
            </tbody>
          </table>

          <h3 style={{ marginTop: '1rem' }}>
            {isEditingPickup
              ? t('courier_rush.admin.pickup_edit_heading', { title: pickupForm.title || '' }, 'Edit pickup')
              : t('courier_rush.admin.pickup_new_heading', {}, 'New pickup')}
          </h3>
          <form onSubmit={submitPickup}>
            <div className="form-row">
              <label htmlFor="pickup-title">{t('courier_rush.admin.table_title', {}, 'Title')}</label>
              <input
                id="pickup-title"
                value={pickupForm.title}
                onChange={(event) => setPickupForm((current) => ({ ...current, title: event.target.value }))}
                required
              />
            </div>
            <GeoLocationPicker
              latitude={pickupForm.latitude}
              longitude={pickupForm.longitude}
              onChange={(nextLat, nextLon) => setPickupForm((current) => ({ ...current, latitude: nextLat, longitude: nextLon }))}
              ariaLabel={t('courier_rush.admin.pickup_new_heading', {}, 'Pickup location')}
            />
            <div className="form-row form-row-inline">
              <div>
                <label htmlFor="pickup-lat">{t('courier_rush.admin.latitude', {}, 'Latitude')}</label>
                <input
                  id="pickup-lat"
                  type="number"
                  step="0.000001"
                  value={pickupForm.latitude}
                  onChange={(event) => setPickupForm((current) => ({ ...current, latitude: event.target.value }))}
                  required
                />
              </div>
              <div>
                <label htmlFor="pickup-lon">{t('courier_rush.admin.longitude', {}, 'Longitude')}</label>
                <input
                  id="pickup-lon"
                  type="number"
                  step="0.000001"
                  value={pickupForm.longitude}
                  onChange={(event) => setPickupForm((current) => ({ ...current, longitude: event.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="form-row">
              <label htmlFor="pickup-radius">{t('courier_rush.admin.table_radius', {}, 'Radius')}</label>
              <input
                id="pickup-radius"
                type="number"
                min="5"
                value={pickupForm.radius_meters}
                onChange={(event) => setPickupForm((current) => ({ ...current, radius_meters: event.target.value }))}
                required
              />
            </div>
            <div className="form-row">
              <label htmlFor="pickup-points">{t('courier_rush.admin.table_points', {}, 'Points')}</label>
              <input
                id="pickup-points"
                type="number"
                min="1"
                value={pickupForm.points}
                onChange={(event) => setPickupForm((current) => ({ ...current, points: event.target.value }))}
                required
              />
            </div>
            <div className="form-row">
              <label htmlFor="pickup-color">{t('common.color', {}, 'Color')}</label>
              <input
                id="pickup-color"
                type="color"
                value={pickupForm.marker_color}
                onChange={(event) => setPickupForm((current) => ({ ...current, marker_color: event.target.value }))}
                required
              />
            </div>
            <div className="form-row">
              <label>
                <input
                  type="checkbox"
                  checked={pickupForm.is_active}
                  onChange={(event) => setPickupForm((current) => ({ ...current, is_active: event.target.checked }))}
                />{' '}
                {t('courier_rush.admin.active', {}, 'Active')}
              </label>
            </div>
            <div className="overview-actions" style={{ marginTop: '1rem' }}>
              <button className="btn btn-primary" type="submit">{t('button.save', {}, 'Save')}</button>
              {isEditingPickup ? (
                <button className="btn btn-ghost" type="button" onClick={resetPickupForm}>
                  {t('button.cancel', {}, 'Cancel')}
                </button>
              ) : null}
            </div>
          </form>
        </section>

        <section className="overview-panel">
          <h2>{t('courier_rush.admin.dropoffs', {}, 'Dropoffs')}</h2>
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('courier_rush.admin.table_title', {}, 'Title')}</th>
                <th>{t('common.lat', {}, 'Lat')}</th>
                <th>{t('common.lon', {}, 'Lon')}</th>
                <th>{t('courier_rush.admin.table_radius', {}, 'Radius')}</th>
                <th>{t('courier_rush.admin.table_actions', {}, 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {dropoffs.map((dropoff) => (
                <tr key={dropoff.id}>
                  <td>{dropoff.title}</td>
                  <td>{dropoff.latitude}</td>
                  <td>{dropoff.longitude}</td>
                  <td>{dropoff.radius_meters}</td>
                  <td className="table-actions-inline">
                    <button className="btn btn-edit btn-small" type="button" onClick={() => editDropoff(dropoff)}>
                      {t('button.edit', {}, 'Edit')}
                    </button>
                    <button className="btn btn-remove btn-small" type="button" onClick={() => deleteDropoff(dropoff)}>
                      {t('button.delete', {}, 'Delete')}
                    </button>
                  </td>
                </tr>
              ))}
              {dropoffs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="muted">{t('courier_rush.admin.empty_dropoffs', {}, 'No dropoffs yet')}</td>
                </tr>
              ) : null}
            </tbody>
          </table>

          <h3 style={{ marginTop: '1rem' }}>
            {isEditingDropoff
              ? t('courier_rush.admin.dropoff_edit_heading', { title: dropoffForm.title || '' }, 'Edit dropoff')
              : t('courier_rush.admin.dropoff_new_heading', {}, 'New dropoff')}
          </h3>
          <form onSubmit={submitDropoff}>
            <div className="form-row">
              <label htmlFor="dropoff-title">{t('courier_rush.admin.table_title', {}, 'Title')}</label>
              <input
                id="dropoff-title"
                value={dropoffForm.title}
                onChange={(event) => setDropoffForm((current) => ({ ...current, title: event.target.value }))}
                required
              />
            </div>
            <GeoLocationPicker
              latitude={dropoffForm.latitude}
              longitude={dropoffForm.longitude}
              onChange={(nextLat, nextLon) => setDropoffForm((current) => ({ ...current, latitude: nextLat, longitude: nextLon }))}
              ariaLabel={t('courier_rush.admin.dropoff_new_heading', {}, 'Dropoff location')}
            />
            <div className="form-row form-row-inline">
              <div>
                <label htmlFor="dropoff-lat">{t('courier_rush.admin.latitude', {}, 'Latitude')}</label>
                <input
                  id="dropoff-lat"
                  type="number"
                  step="0.000001"
                  value={dropoffForm.latitude}
                  onChange={(event) => setDropoffForm((current) => ({ ...current, latitude: event.target.value }))}
                  required
                />
              </div>
              <div>
                <label htmlFor="dropoff-lon">{t('courier_rush.admin.longitude', {}, 'Longitude')}</label>
                <input
                  id="dropoff-lon"
                  type="number"
                  step="0.000001"
                  value={dropoffForm.longitude}
                  onChange={(event) => setDropoffForm((current) => ({ ...current, longitude: event.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="form-row">
              <label htmlFor="dropoff-radius">{t('courier_rush.admin.table_radius', {}, 'Radius')}</label>
              <input
                id="dropoff-radius"
                type="number"
                min="5"
                value={dropoffForm.radius_meters}
                onChange={(event) => setDropoffForm((current) => ({ ...current, radius_meters: event.target.value }))}
                required
              />
            </div>
            <div className="form-row">
              <label htmlFor="dropoff-color">{t('common.color', {}, 'Color')}</label>
              <input
                id="dropoff-color"
                type="color"
                value={dropoffForm.marker_color}
                onChange={(event) => setDropoffForm((current) => ({ ...current, marker_color: event.target.value }))}
                required
              />
            </div>
            <div className="form-row">
              <label>
                <input
                  type="checkbox"
                  checked={dropoffForm.is_active}
                  onChange={(event) => setDropoffForm((current) => ({ ...current, is_active: event.target.checked }))}
                />{' '}
                {t('courier_rush.admin.active', {}, 'Active')}
              </label>
            </div>
            <div className="overview-actions" style={{ marginTop: '1rem' }}>
              <button className="btn btn-primary" type="submit">{t('button.save', {}, 'Save')}</button>
              {isEditingDropoff ? (
                <button className="btn btn-ghost" type="button" onClick={resetDropoffForm}>
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
