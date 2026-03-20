import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { gameApi, moduleApi } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { useI18n } from '../../lib/i18n'

function defaultForm() {
  return {
    id: '',
    title: '',
    latitude: '',
    longitude: '',
    radius_meters: '35',
    capture_points: '2',
  }
}

export default function TerritoryControlAdminPage() {
  const { gameId } = useParams()
  const { auth } = useAuth()
  const { t } = useI18n()

  const [game, setGame] = useState(null)
  const [zones, setZones] = useState([])
  const [form, setForm] = useState(defaultForm)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const isEdit = Boolean(form.id)

  async function loadAll() {
    setLoading(true)
    setError('')
    try {
      const [gameRecord, zonesPayload] = await Promise.all([
        gameApi.getGame(auth.token, gameId),
        moduleApi.getTerritoryZones(auth.token, gameId),
      ])
      setGame(gameRecord)
      setZones(Array.isArray(zonesPayload?.zones) ? zonesPayload.zones : [])
    } catch (err) {
      setError(err.message || 'Failed to load territory zones')
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

  function fillForm(zone) {
    setForm({
      id: String(zone?.id || ''),
      title: String(zone?.title || ''),
      latitude: zone?.latitude === null || zone?.latitude === undefined ? '' : String(zone.latitude),
      longitude: zone?.longitude === null || zone?.longitude === undefined ? '' : String(zone.longitude),
      radius_meters: String(Number(zone?.radius_meters || 35)),
      capture_points: String(Number(zone?.capture_points || 2)),
    })
  }

  async function handleDeleteZone(zone) {
    if (!window.confirm(t('territory_control.admin.zone_delete_confirm', { name: zone?.title || '' }, `Delete ${zone?.title || 'zone'}?`))) {
      return
    }

    setError('')
    setSuccess('')
    try {
      await moduleApi.deleteTerritoryZone(auth.token, gameId, zone.id)
      await loadAll()
      if (String(form.id) === String(zone.id)) {
        resetForm()
      }
      setSuccess(t('moduleOverview.delete', {}, 'Deleted'))
    } catch (err) {
      setError(err.message || 'Failed to delete zone')
    }
  }

  async function handleSubmitZone(event) {
    event.preventDefault()
    setError('')
    setSuccess('')

    const payload = {
      title: form.title.trim(),
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      radius_meters: Number(form.radius_meters || 35),
      capture_points: Number(form.capture_points || 2),
    }

    if (!Number.isFinite(payload.latitude) || !Number.isFinite(payload.longitude)) {
      setError('Latitude and longitude are required')
      return
    }

    try {
      if (isEdit) {
        await moduleApi.updateTerritoryZone(auth.token, gameId, form.id, payload)
      } else {
        await moduleApi.createTerritoryZone(auth.token, gameId, payload)
      }
      await loadAll()
      resetForm()
      setSuccess(t('button.save', {}, 'Saved'))
    } catch (err) {
      setError(err.message || 'Failed to save zone')
    }
  }

  return (
    <main className="page-shell">
      <div className="geo-header">
        <div>
          <p className="overview-kicker">{t('territory_control.admin.kicker', {}, 'Territory Control')}</p>
          <h1>{t('territory_control.admin.zones_heading', { game: game?.name || '' }, `Zones · ${game?.name || '-'}`)}</h1>
          <p className="overview-subtitle">{t('territory_control.admin.zones_subtitle', {}, 'Configure zones')}</p>
        </div>
        <div className="overview-actions">
          <Link className="btn btn-ghost" to={`/admin/games/${gameId}`}>
            {t('territory_control.admin.back', {}, 'Back')}
          </Link>
          <button className="btn btn-primary" type="button" onClick={resetForm}>
            {t('territory_control.admin.zone_add', {}, 'Add zone')}
          </button>
        </div>
      </div>

      {error ? <div className="flash flash-error">{error}</div> : null}
      {success ? <div className="flash flash-success">{success}</div> : null}
      {loading ? <p>{t('gamesPage.loading', {}, 'Loading…')}</p> : null}

      <div className="geo-layout">
        <section className="geo-panel">
          <h2>{t('common.map', {}, 'Map')}</h2>
          <div className="game-map" style={{ minHeight: 280 }}>
            <p className="muted" style={{ padding: '0.8rem' }}>
              {t('territory_control.admin.map_help', {}, 'Map preview uses zone coordinates.')}
            </p>
          </div>
        </section>

        <section className="geo-panel">
          <h2>{t('territory_control.admin.zone_list', {}, 'Zone list')}</h2>
          {zones.length === 0 ? <p className="muted">{t('territory_control.admin.zone_empty', {}, 'No zones yet')}</p> : null}
          {zones.length > 0 ? (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('territory_control.admin.zone_table_name', {}, 'Name')}</th>
                  <th>{t('territory_control.admin.zone_table_radius', {}, 'Radius')}</th>
                  <th>{t('territory_control.admin.zone_table_points', {}, 'Points')}</th>
                  <th className="text-right">{t('territory_control.admin.zone_table_actions', {}, 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {zones.map((zone) => (
                  <tr key={zone.id}>
                    <td>{zone.title}</td>
                    <td>{zone.radius_meters} m</td>
                    <td>{zone.capture_points}</td>
                    <td className="text-right table-actions-inline">
                      <button className="btn btn-edit btn-small" type="button" onClick={() => fillForm(zone)}>
                        {t('button.edit', {}, 'Edit')}
                      </button>
                      <button className="btn btn-remove btn-small" type="button" onClick={() => handleDeleteZone(zone)}>
                        {t('button.delete', {}, 'Delete')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </section>

        <section className="geo-panel">
          <h2>{isEdit ? t('territory_control.admin.zone_edit_heading', { name: form.title }, 'Edit zone') : t('territory_control.admin.zone_new_heading', { game: game?.name || '' }, 'New zone')}</h2>

          <form onSubmit={handleSubmitZone}>
            <div className="form-row">
              <label htmlFor="zone-title">{t('territory_control.admin.zone_field_name', {}, 'Name')}</label>
              <input
                id="zone-title"
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                required
              />
            </div>

            <div className="form-row form-row-inline">
              <div>
                <label htmlFor="zone-lat">{t('territory_control.admin.zone_field_lat', {}, 'Latitude')}</label>
                <input
                  id="zone-lat"
                  type="number"
                  step="0.000001"
                  value={form.latitude}
                  onChange={(event) => setForm((current) => ({ ...current, latitude: event.target.value }))}
                  required
                />
              </div>
              <div>
                <label htmlFor="zone-lon">{t('territory_control.admin.zone_field_lon', {}, 'Longitude')}</label>
                <input
                  id="zone-lon"
                  type="number"
                  step="0.000001"
                  value={form.longitude}
                  onChange={(event) => setForm((current) => ({ ...current, longitude: event.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <label htmlFor="zone-radius">{t('territory_control.admin.zone_field_radius', {}, 'Radius')}</label>
              <input
                id="zone-radius"
                type="number"
                min="10"
                value={form.radius_meters}
                onChange={(event) => setForm((current) => ({ ...current, radius_meters: event.target.value }))}
                required
              />
            </div>

            <div className="form-row">
              <label htmlFor="zone-points">{t('territory_control.admin.zone_field_points', {}, 'Capture points')}</label>
              <input
                id="zone-points"
                type="number"
                min="1"
                value={form.capture_points}
                onChange={(event) => setForm((current) => ({ ...current, capture_points: event.target.value }))}
                required
              />
            </div>

            <div className="overview-actions" style={{ marginTop: '1rem' }}>
              <button className="btn btn-primary" type="submit">{t('button.save', {}, 'Save')}</button>
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
