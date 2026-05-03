import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'

import AdminOverviewMap from '../../components/AdminOverviewMap'
import { gameApi, moduleApi } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { useI18n } from '../../lib/i18n'

export default function TerritoryControlAdminPage() {
  const { gameId } = useParams()
  const { auth } = useAuth()
  const { t } = useI18n()
  const location = useLocation()

  const [game, setGame] = useState(null)
  const [zones, setZones] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(location.state?.flashSuccess || '')

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
      setError(err.message || t('error.loadFailed', {}))
    } finally { setLoading(false) }
  }

  useEffect(() => { loadAll() }, [auth.token, gameId])

  async function handleDeleteZone(zone) {
    if (!window.confirm(t('territory_control.admin.zone_delete_confirm', { name: zone?.title || '' }))) return
    setError(''); setSuccess('')
    try {
      await moduleApi.deleteTerritoryZone(auth.token, gameId, zone.id)
      await loadAll()
      setSuccess(t('status.deleted', {}))
    } catch (err) { setError(err.message || 'Failed to delete zone') }
  }

  return (
    <main className="page-shell">
      <div className="geo-header">
        <div>
          <p className="overview-kicker">{t('territory_control.admin.kicker', {})}</p>
          <h1>{t('territory_control.admin.zones_heading', { game: game?.name || '' })}</h1>
          <p className="overview-subtitle">{t('territory_control.admin.zones_subtitle', {})}</p>
        </div>
        <div className="overview-actions">
          <Link className="btn btn-ghost" to={'/admin/games/' + gameId}>{t('common.back', {})}</Link>
          <Link className="btn btn-primary" to={'/admin/territory-control/' + gameId + '/zones/new'}>{t('territory_control.admin.zone_add', {})}</Link>
        </div>
      </div>

      {error ? <div className="flash flash-error">{error}</div> : null}
      {success ? <div className="flash flash-success">{success}</div> : null}
      {loading ? <p>{t('gamesPage.loading', {})}</p> : null}

      <section className="overview-panel">
        <h2>{t('common.map', {})}</h2>
        <AdminOverviewMap
          entities={zones}
          getLabel={(zone) => zone.title || '-'}
          getRadius={(zone) => Number(zone.radius_meters || 35)}
          ariaLabel={t('territory_control.admin.map_label', {})}
        />
      </section>

      <section className="overview-panel">
          <h2>{t('territory_control.admin.zone_list', {})}</h2>
          {zones.length === 0 ? <p className="muted">{t('territory_control.admin.zone_empty', {})}</p> : null}
          {zones.length > 0 ? (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('table.name', {})}</th>
                  <th>{t('table.radius', {})}</th>
                  <th>{t('table.points', {})}</th>
                  <th className="text-right">{t('table.actions', {})}</th>
                </tr>
              </thead>
              <tbody>
                {zones.map((zone) => (
                  <tr key={zone.id}>
                    <td>{zone.title}</td>
                    <td>{zone.radius_meters} m</td>
                    <td>{zone.capture_points}</td>
                    <td className="text-right table-actions-inline">
                      <Link className="btn btn-edit btn-small" to={'/admin/territory-control/' + gameId + '/zones/' + zone.id + '/edit'}>{t('button.label.edit', {})}</Link>
                      <button className="btn btn-remove btn-small" type="button" onClick={() => handleDeleteZone(zone)}>{t('button.label.delete', {})}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
      </section>
    </main>
  )
}
