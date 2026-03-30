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
    if (!window.confirm(t('echo_hunt.admin.delete_confirm', {}, 'Delete beacon?'))) {
      return
    }

    setError('')
    setSuccess('')
    try {
      await moduleApi.deleteEchoHuntBeacon(auth.token, gameId, beacon.id)
      await loadAll()
      setSuccess(t('moduleOverview.delete', {}, 'Deleted'))
    } catch (err) {
      setError(err.message || 'Failed to delete beacon')
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
          <Link className="btn btn-primary" to={`/admin/echo-hunt/${gameId}/beacons/new`}>
            {t('echo_hunt.admin.create_beacon', {}, 'Create beacon')}
          </Link>
        </div>
      </section>

      {error ? <div className="flash flash-error">{error}</div> : null}
      {success ? <div className="flash flash-success">{success}</div> : null}
      <section className="overview-panel">
        <h2>{t('common.map', {}, 'Map')}</h2>
        <AdminOverviewMap
          entities={beacons}
          getLabel={(beacon) => beacon.title || '-'}
          getRadius={(beacon) => Number(beacon.radius_meters || 25)}
          getColor={(beacon) => beacon.marker_color || '#7c3aed'}
          ariaLabel={t('echo_hunt.admin.map_label', {}, 'Beacons map')}
        />
      </section>

      <section className="overview-panel">
        <h2>{t('echo_hunt.admin.beacons_list', {}, 'Beacons')}</h2>
        <table className="admin-table">
          <thead>
            <tr>
              <th>{t('echo_hunt.admin.table_title', {}, 'Title')}</th>
              <th>{t('echo_hunt.admin.table_hint', {}, 'Hint')}</th>
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
                <td>{beacon.radius_meters}</td>
                <td>{beacon.signal_radius_meters <= 0 ? t('echo_hunt.admin.signal_radius_always', {}, 'Always') : beacon.signal_radius_meters}</td>
                <td>{beacon.points}</td>
                <td className="table-actions-inline">
                  <Link className="btn btn-edit btn-small" to={`/admin/echo-hunt/${gameId}/beacons/${beacon.id}/edit`}>
                    {t('button.edit', {}, 'Edit')}
                  </Link>
                  <button className="btn btn-remove btn-small" type="button" onClick={() => handleDeleteBeacon(beacon)}>
                    {t('button.delete', {}, 'Delete')}
                  </button>
                </td>
              </tr>
            ))}
            {beacons.length === 0 ? (
              <tr>
                <td colSpan={6} className="muted">{t('echo_hunt.admin.empty_beacons', {}, 'No beacons yet')}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </main>
  )
}
