import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'

import MarketCrashPointsMap from '../../components/MarketCrashPointsMap'
import { gameApi, moduleApi } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { useI18n } from '../../lib/i18n'

export default function MarketCrashAdminPage() {
  const { gameId } = useParams()
  const location = useLocation()
  const { auth } = useAuth()
  const { t } = useI18n()

  const [game, setGame] = useState(null)
  const [resources, setResources] = useState([])
  const [points, setPoints] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const resourcesById = useMemo(() => {
    const map = {}
    for (const resource of resources) {
      map[String(resource.id)] = resource
    }
    return map
  }, [resources])

  function applyAdminData(data, gameRecord = null) {
    const nextResources = Array.isArray(data?.resources) ? data.resources : []
    const nextPoints = Array.isArray(data?.points) ? data.points : []
    setResources(nextResources)
    setPoints(nextPoints)
    if (gameRecord) {
      setGame(gameRecord)
    }
  }

  async function loadAll() {
    setLoading(true)
    setError('')
    try {
      const [gameRecord, adminData] = await Promise.all([
        gameApi.getGame(auth.token, gameId),
        moduleApi.getMarketCrashAdminData(auth.token, gameId),
      ])
      applyAdminData(adminData, gameRecord)
    } catch (err) {
      setError(err.message || 'Failed to load Market Crash admin data')
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

  async function deletePoint(point) {
    if (!window.confirm(t('market_crash.admin.point_delete_confirm', { title: point?.title || '' }, 'Delete point?'))) {
      return
    }

    setError('')
    setSuccess('')
    try {
      const adminData = await moduleApi.deleteMarketCrashPoint(auth.token, gameId, point.id)
      applyAdminData(adminData)
      setSuccess(t('moduleOverview.delete', {}, 'Deleted'))
    } catch (err) {
      setError(err.message || 'Failed to delete point')
    }
  }

  return (
    <main className="page-shell">
      <div className="geo-header">
        <div>
          <p className="overview-kicker">{t('market_crash.admin.kicker', {}, 'Market Crash')}</p>
          <h1>{t('market_crash.admin.points_heading', { game: game?.name || '' }, `Points management · ${game?.name || '-'}`)}</h1>
          <p className="overview-subtitle">{t('market_crash.admin.points_subtitle', {}, 'Manage trade points')}</p>
        </div>
        <div className="overview-actions">
          <Link className="btn btn-ghost" to={`/admin/games/${gameId}`}>
            {t('market_crash.admin.back', {}, 'Back')}
          </Link>
        </div>
      </div>

      {error ? <div className="flash flash-error">{error}</div> : null}
      {success ? <div className="flash flash-success">{success}</div> : null}
      {loading ? <p>{t('gamesPage.loading', {}, 'Loading…')}</p> : null}

      <section className="overview-panel">
        <h2>{t('common.map', {}, 'Map')}</h2>
        <div className="overview-actions" style={{ marginBottom: '0.75rem' }}>
          <Link className="btn btn-primary btn-small" to={`/admin/market-crash/${gameId}/points/new`}>
            {t('market_crash.admin.add_marker', {}, 'Add marker')}
          </Link>
        </div>
        <MarketCrashPointsMap points={points} t={t} />
      </section>

      <section className="overview-panel">
        <h2>{t('market_crash.admin.point_list', {}, 'Points')}</h2>
        <table className="admin-table">
          <thead>
            <tr>
              <th>{t('market_crash.admin.point_table_title', {}, 'Title')}</th>
              <th>{t('market_crash.admin.point_table_resource_config', {}, 'Resource config')}</th>
              <th>{t('market_crash.admin.point_table_actions', {}, 'Actions')}</th>
            </tr>
          </thead>
          <tbody>
            {points.map((point) => (
              <tr key={point.id}>
                <td>{point.title}</td>
                <td>
                  {Array.isArray(point.resource_settings) && point.resource_settings.length > 0
                    ? point.resource_settings.map((setting) => (
                        <span key={`${point.id}-${setting.resource_id}`} className="tag tag-cool" style={{ marginRight: '0.25rem' }}>
                          {setting.resource_name || resourcesById[setting.resource_id]?.name || setting.resource_id} · B {setting.buy_price} · S {setting.sell_price} · {setting.tick_seconds}s ±{setting.fluctuation_percent}%
                        </span>
                      ))
                    : <span className="muted">-</span>}
                </td>
                <td className="table-actions-inline">
                  <Link className="btn btn-edit btn-small" to={`/admin/market-crash/${gameId}/points/${point.id}/edit`}>
                    {t('button.edit', {}, 'Edit')}
                  </Link>
                  <button className="btn btn-remove btn-small" type="button" onClick={() => deletePoint(point)}>
                    {t('button.delete', {}, 'Delete')}
                  </button>
                </td>
              </tr>
            ))}
            {points.length === 0 ? (
              <tr>
                <td colSpan={3} className="muted">{t('market_crash.admin.point_empty', {}, 'No points yet')}</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </main>
  )
}
