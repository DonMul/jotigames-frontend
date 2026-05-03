import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'

import AdminOverviewMap from '../../components/AdminOverviewMap'
import { gameApi, moduleApi } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { useI18n } from '../../lib/i18n'

export default function EchoHuntAdminPage() {
  const { gameId } = useParams()
  const location = useLocation()
  const { auth } = useAuth()
  const { t } = useI18n()

  const [game, setGame] = useState(null)
  const [beacons, setBeacons] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

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

  useEffect(() => {
    const flashSuccess = String(location?.state?.flashSuccess || '').trim()
    if (flashSuccess) {
      setSuccess(flashSuccess)
    }
  }, [location?.state])

  async function handleDeleteBeacon(beacon) {
    if (!window.confirm(t('echo_hunt.admin.delete_confirm', {}))) {
      return
    }

    setError('')
    setSuccess('')
    try {
      await moduleApi.deleteEchoHuntBeacon(auth.token, gameId, beacon.id)
      await loadAll()
      setSuccess(t('status.deleted', {}))
    } catch (err) {
      setError(err.message || 'Failed to delete beacon')
    }
  }

  return (
    <main className="page-shell">
      <section className="overview-header">
        <div>
          <p className="overview-kicker">{t('echo_hunt.admin.kicker', {})}</p>
          <h1>{game?.name || '-'}</h1>
          <p className="overview-subtitle">{t('echo_hunt.admin.beacons_subtitle', {})}</p>
        </div>
        <div className="overview-actions">
          <Link className="btn btn-ghost" to={`/admin/games/${gameId}`}>
            {t('common.back', {})}
          </Link>
          <Link className="btn btn-primary" to={`/admin/echo-hunt/${gameId}/beacons/new`}>
            {t('echo_hunt.admin.create_beacon', {})}
          </Link>
        </div>
      </section>

      {error ? <div className="flash flash-error">{error}</div> : null}
      {success ? <div className="flash flash-success">{success}</div> : null}
      <section className="overview-panel">
        <h2>{t('common.map', {})}</h2>
        <AdminOverviewMap
          entities={beacons}
          getLabel={(beacon) => beacon.title || '-'}
          getRadius={(beacon) => Number(beacon.radius_meters || 25)}
          getColor={(beacon) => beacon.marker_color || '#7c3aed'}
          ariaLabel={t('echo_hunt.admin.map_label', {})}
        />
      </section>

      <section className="overview-panel">
        <h2>{t('echo_hunt.admin.beacons_list', {})}</h2>
        <table className="admin-table">
          <thead>
            <tr>
              <th>{t('table.title', {})}</th>
              <th>{t('echo_hunt.admin.table_hint', {})}</th>
              <th>{t('table.radius', {})}</th>
              <th>{t('echo_hunt.admin.signal_radius', {})}</th>
              <th>{t('table.points', {})}</th>
              <th>{t('table.actions', {})}</th>
            </tr>
          </thead>
          <tbody>
            {beacons.map((beacon) => (
              <tr key={beacon.id}>
                <td>{beacon.title}</td>
                <td>{beacon.hint || t('echo_hunt.admin.empty_hint', {})}</td>
                <td>{beacon.radius_meters}</td>
                <td>{beacon.signal_radius_meters <= 0 ? t('echo_hunt.admin.signal_radius_always', {}) : beacon.signal_radius_meters}</td>
                <td>{beacon.points}</td>
                <td className="table-actions-inline">
                  <Link className="btn btn-edit btn-small" to={`/admin/echo-hunt/${gameId}/beacons/${beacon.id}/edit`}>
                    {t('button.label.edit', {})}
                  </Link>
                  <button className="btn btn-remove btn-small" type="button" onClick={() => handleDeleteBeacon(beacon)}>
                    {t('button.label.delete', {})}
                  </button>
                </td>
              </tr>
            ))}
            {beacons.length === 0 ? (
              <tr>
                <td colSpan={6} className="muted">{t('echo_hunt.admin.empty_beacons', {})}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </main>
  )
}
