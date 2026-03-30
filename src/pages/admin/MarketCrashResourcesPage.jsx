import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'

import { gameApi, moduleApi } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { useI18n } from '../../lib/i18n'

export default function MarketCrashResourcesPage() {
  const { gameId } = useParams()
  const location = useLocation()
  const { auth } = useAuth()
  const { t } = useI18n()

  const [game, setGame] = useState(null)
  const [resources, setResources] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  function applyAdminData(data, gameRecord = null) {
    const nextResources = Array.isArray(data?.resources) ? data.resources : []
    setResources(nextResources)
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

  async function deleteResource(resource) {
    if (!window.confirm(t('market_crash.admin.resource_delete_confirm', { name: resource?.name || '' }, 'Delete resource?'))) {
      return
    }

    setError('')
    setSuccess('')
    try {
      const adminData = await moduleApi.deleteMarketCrashResource(auth.token, gameId, resource.id)
      applyAdminData(adminData)
      setSuccess(t('moduleOverview.delete', {}, 'Deleted'))
    } catch (err) {
      setError(err.message || 'Failed to delete resource')
    }
  }

  return (
    <main className="page-shell">
      <div className="geo-header">
        <div>
          <p className="overview-kicker">{t('market_crash.admin.kicker', {}, 'Market Crash')}</p>
          <h1>{t('market_crash.admin.resources_heading', { game: game?.name || '' }, `Resource management · ${game?.name || '-'}`)}</h1>
          <p className="overview-subtitle">{t('market_crash.admin.resources_subtitle', {}, 'Manage resources and default prices')}</p>
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

      {!loading ? (
        <section className="overview-panel">
          <div className="overview-actions" style={{ marginBottom: '0.75rem' }}>
            <h2>{t('market_crash.admin.resource_list', {}, 'Resources')}</h2>
            <Link className="btn btn-primary btn-small" to={`/admin/market-crash/${gameId}/resources/new`}>
              {t('market_crash.admin.resource_add', {}, 'Add resource')}
            </Link>
          </div>

          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('market_crash.admin.resource_table_name', {}, 'Name')}</th>
                <th>{t('market_crash.admin.resource_table_default_price', {}, 'Default price')}</th>
                <th>{t('market_crash.admin.resource_table_actions', {}, 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {resources.map((resource) => (
                <tr key={resource.id}>
                  <td>{resource.name}</td>
                  <td>{resource.default_price}</td>
                  <td className="table-actions-inline">
                    <Link className="btn btn-edit btn-small" to={`/admin/market-crash/${gameId}/resources/${resource.id}/edit`}>
                      {t('button.edit', {}, 'Edit')}
                    </Link>
                    <button className="btn btn-remove btn-small" type="button" onClick={() => deleteResource(resource)}>
                      {t('button.delete', {}, 'Delete')}
                    </button>
                  </td>
                </tr>
              ))}
              {resources.length === 0 ? (
                <tr>
                  <td colSpan={3} className="muted">{t('market_crash.admin.resource_empty', {}, 'No resources yet')}</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </section>
      ) : null}
    </main>
  )
}
