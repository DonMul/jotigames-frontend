import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'

import AdminOverviewMap from '../../components/AdminOverviewMap'
import { gameApi, moduleApi } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { useI18n } from '../../lib/i18n'

export default function CourierRushAdminPage() {
  const { gameId } = useParams()
  const { auth } = useAuth()
  const { t } = useI18n()
  const location = useLocation()

  const [game, setGame] = useState(null)
  const [pickups, setPickups] = useState([])
  const [dropoffs, setDropoffs] = useState([])
  const [configForm, setConfigForm] = useState({ pickup_mode: 'predefined', dropoff_mode: 'random', max_active_pickups: '3' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(location.state?.flashSuccess || '')

  const summaryRows = useMemo(
    () => [
      { label: t('courier_rush.admin.pickups', {}, 'Pickups'), value: String(pickups.length) },
      { label: t('courier_rush.admin.dropoffs', {}, 'Dropoffs'), value: String(dropoffs.length) },
      { label: t('courier_rush.admin.pickup_mode', {}, 'Pickup mode'), value: configForm.pickup_mode === 'random' ? t('courier_rush.admin.pickup_mode_random', {}, 'Random') : t('courier_rush.admin.pickup_mode_predefined', {}, 'Predefined') },
      { label: t('courier_rush.admin.dropoff_mode', {}, 'Dropoff mode'), value: configForm.dropoff_mode === 'fixed' ? t('courier_rush.admin.dropoff_mode_fixed', {}, 'Fixed') : t('courier_rush.admin.dropoff_mode_random', {}, 'Random') },
      { label: t('courier_rush.admin.max_active_pickups', {}, 'Max active pickups'), value: String(configForm.max_active_pickups || '3') },
    ],
    [configForm.dropoff_mode, configForm.max_active_pickups, configForm.pickup_mode, dropoffs.length, pickups.length, t],
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
      setConfigForm({ pickup_mode: String(config?.pickup_mode || 'predefined'), dropoff_mode: String(config?.dropoff_mode || 'random'), max_active_pickups: String(Number(config?.max_active_pickups || 3)) })
      setPickups(Array.isArray(pickupsPayload?.pickups) ? pickupsPayload.pickups : [])
      setDropoffs(Array.isArray(dropoffsPayload?.dropoffs) ? dropoffsPayload.dropoffs : [])
    } catch (err) {
      setError(err.message || t('courier_rush.admin.load_failed', {}, 'Failed to load data'))
    } finally { setLoading(false) }
  }

  useEffect(() => { loadAll() }, [auth.token, gameId])

  async function deletePickup(pickup) {
    if (!window.confirm(t('courier_rush.admin.delete_confirm_pickup', {}, 'Delete pickup?'))) return
    setError(''); setSuccess('')
    try {
      await moduleApi.deleteCourierRushPickup(auth.token, gameId, pickup.id)
      await loadAll()
      setSuccess(t('moduleOverview.delete', {}, 'Deleted'))
    } catch (err) { setError(err.message || 'Failed to delete pickup') }
  }

  async function deleteDropoff(dropoff) {
    if (!window.confirm(t('courier_rush.admin.delete_confirm_dropoff', {}, 'Delete dropoff?'))) return
    setError(''); setSuccess('')
    try {
      await moduleApi.deleteCourierRushDropoff(auth.token, gameId, dropoff.id)
      await loadAll()
      setSuccess(t('moduleOverview.delete', {}, 'Deleted'))
    } catch (err) { setError(err.message || 'Failed to delete dropoff') }
  }

  return (
    <main className="page-shell">
      <div className="geo-header">
        <div>
          <p className="overview-kicker">{t('courier_rush.admin.kicker', {}, 'Courier Rush')}</p>
          <h1>{game?.name || '-'}</h1>
          <p className="overview-subtitle">{t('courier_rush.admin.objects_subtitle', {}, 'Manage pickups and dropoffs')}</p>
        </div>
        <div className="overview-actions">
          <Link className="btn btn-ghost" to={'/admin/games/' + gameId}>{t('courier_rush.admin.back', {}, 'Back')}</Link>
        </div>
      </div>

      {error ? <div className="flash flash-error">{error}</div> : null}
      {success ? <div className="flash flash-success">{success}</div> : null}
      {loading ? <p>{t('gamesPage.loading', {}, 'Loading\u2026')}</p> : null}

      <section className="admin-block">
        <h2>{t('common.summary', {}, 'Summary')}</h2>
        <table className="admin-table">
          <tbody>
            {summaryRows.map((row) => (<tr key={row.label}><th>{row.label}</th><td>{row.value}</td></tr>))}
          </tbody>
        </table>
      </section>

      <section className="admin-block">
        <h2>{t('common.map', {}, 'Map')}</h2>
        <AdminOverviewMap
          entities={[...pickups.map((p) => ({ ...p, _type: 'pickup' })), ...dropoffs.map((d) => ({ ...d, _type: 'dropoff' }))]}
          getLabel={(e) => `${e.title || '-'} (${e._type === 'pickup' ? t('courier_rush.admin.pickups', {}, 'Pickup') : t('courier_rush.admin.dropoffs', {}, 'Dropoff')})`}
          getColor={(e) => e.marker_color || (e._type === 'pickup' ? '#2563eb' : '#16a34a')}
          getRadius={(e) => Number(e.radius_meters || 25)}
          ariaLabel={t('courier_rush.admin.map_label', {}, 'Pickups and dropoffs map')}
        />
      </section>

      <div className="geo-layout">
        <section className="overview-panel">
          <div className="overview-header" style={{ marginBottom: '0.5rem' }}>
            <h2>{t('courier_rush.admin.pickups', {}, 'Pickups')}</h2>
            <Link className="btn btn-primary btn-small" to={'/admin/courier-rush/' + gameId + '/pickups/new'}>{t('courier_rush.admin.pickup_new_heading', {}, 'New pickup')}</Link>
          </div>
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
                    <Link className="btn btn-edit btn-small" to={'/admin/courier-rush/' + gameId + '/pickups/' + pickup.id + '/edit'}>{t('button.edit', {}, 'Edit')}</Link>
                    <button className="btn btn-remove btn-small" type="button" onClick={() => deletePickup(pickup)}>{t('button.delete', {}, 'Delete')}</button>
                  </td>
                </tr>
              ))}
              {pickups.length === 0 ? (<tr><td colSpan={6} className="muted">{t('courier_rush.admin.empty_pickups', {}, 'No pickups yet')}</td></tr>) : null}
            </tbody>
          </table>
        </section>

        <section className="overview-panel">
          <div className="overview-header" style={{ marginBottom: '0.5rem' }}>
            <h2>{t('courier_rush.admin.dropoffs', {}, 'Dropoffs')}</h2>
            <Link className="btn btn-primary btn-small" to={'/admin/courier-rush/' + gameId + '/dropoffs/new'}>{t('courier_rush.admin.dropoff_new_heading', {}, 'New dropoff')}</Link>
          </div>
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
                    <Link className="btn btn-edit btn-small" to={'/admin/courier-rush/' + gameId + '/dropoffs/' + dropoff.id + '/edit'}>{t('button.edit', {}, 'Edit')}</Link>
                    <button className="btn btn-remove btn-small" type="button" onClick={() => deleteDropoff(dropoff)}>{t('button.delete', {}, 'Delete')}</button>
                  </td>
                </tr>
              ))}
              {dropoffs.length === 0 ? (<tr><td colSpan={5} className="muted">{t('courier_rush.admin.empty_dropoffs', {}, 'No dropoffs yet')}</td></tr>) : null}
            </tbody>
          </table>
        </section>
      </div>
    </main>
  )
}
