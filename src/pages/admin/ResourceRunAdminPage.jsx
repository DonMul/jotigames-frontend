import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'

import AdminOverviewMap from '../../components/AdminOverviewMap'
import { gameApi, moduleApi } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { useI18n } from '../../lib/i18n'

export default function ResourceRunAdminPage() {
  const { gameId } = useParams()
  const { auth } = useAuth()
  const { t } = useI18n()
  const location = useLocation()

  const [game, setGame] = useState(null)
  const [nodes, setNodes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(location.state?.flashSuccess || '')

  async function loadAll() {
    setLoading(true)
    setError('')
    try {
      const [gameRecord, nodesPayload] = await Promise.all([
        gameApi.getGame(auth.token, gameId),
        moduleApi.getResourceRunNodes(auth.token, gameId),
      ])
      setGame(gameRecord)
      setNodes(Array.isArray(nodesPayload?.nodes) ? nodesPayload.nodes : [])
    } catch (err) {
      setError(err.message || t('error.loadFailed', {}))
    } finally { setLoading(false) }
  }

  useEffect(() => { loadAll() }, [auth.token, gameId])

  async function handleDeleteNode(node) {
    if (!window.confirm(t('resource_run.admin.node_delete_confirm', { title: node?.title || '' }))) return
    setError(''); setSuccess('')
    try {
      await moduleApi.deleteResourceRunNode(auth.token, gameId, node.id)
      await loadAll()
      setSuccess(t('status.deleted', {}))
    } catch (err) { setError(err.message || 'Failed to delete node') }
  }

  return (
    <main className="page-shell">
      <div className="geo-header">
        <div>
          <p className="overview-kicker">{t('resource_run.admin.kicker', {})}</p>
          <h1>{t('resource_run.admin.nodes_heading', { game: game?.name || '' })}</h1>
          <p className="overview-subtitle">{t('resource_run.admin.nodes_subtitle', {})}</p>
        </div>
        <div className="overview-actions">
          <Link className="btn btn-ghost" to={'/admin/games/' + gameId}>{t('common.back', {})}</Link>
          <Link className="btn btn-primary" to={'/admin/resource-run/' + gameId + '/nodes/new'}>{t('resource_run.admin.node_add', {})}</Link>
        </div>
      </div>

      {error ? <div className="flash flash-error">{error}</div> : null}
      {success ? <div className="flash flash-success">{success}</div> : null}
      {loading ? <p>{t('gamesPage.loading', {})}</p> : null}

      <div className="geo-layout">
        <section className="overview-panel">
          <h2>{t('common.map', {})}</h2>
          <AdminOverviewMap
            entities={nodes}
            getLabel={(node) => `${node.title || '-'} (${node.resource_type || ''})`}
            getColor={(node) => node.marker_color || '#ef4444'}
            getRadius={(node) => Number(node.radius_meters || 25)}
            ariaLabel={t('resource_run.admin.map_label', {})}
          />
        </section>

        <section className="overview-panel">
          <h2>{t('resource_run.admin.node_list', {})}</h2>
          {nodes.length === 0 ? <p className="muted">{t('resource_run.admin.node_empty', {})}</p> : null}
          {nodes.length > 0 ? (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('table.title', {})}</th>
                  <th>{t('table.type', {})}</th>
                  <th>{t('table.points', {})}</th>
                  <th>{t('table.color', {})}</th>
                  <th className="text-right">{t('table.actions', {})}</th>
                </tr>
              </thead>
              <tbody>
                {nodes.map((node) => (
                  <tr key={node.id}>
                    <td>{node.title}</td>
                    <td>{node.resource_type}</td>
                    <td>{node.points}</td>
                    <td>
                      <span style={{ display: 'inline-flex', width: 18, height: 18, borderRadius: '50%', border: '1px solid var(--stroke)', background: node.marker_color }} />
                    </td>
                    <td className="text-right table-actions-inline">
                      <Link className="btn btn-edit btn-small" to={'/admin/resource-run/' + gameId + '/nodes/' + node.id + '/edit'}>{t('button.label.edit', {})}</Link>
                      <button className="btn btn-remove btn-small" type="button" onClick={() => handleDeleteNode(node)}>{t('button.label.delete', {})}</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </section>
      </div>
    </main>
  )
}
