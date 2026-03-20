import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { gameApi, moduleApi } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { useI18n } from '../../lib/i18n'

function defaultForm() {
  return {
    id: '',
    title: '',
    resource_type: 'food',
    latitude: '',
    longitude: '',
    radius_meters: '25',
    points: '1',
    marker_color: '#ef4444',
  }
}

export default function ResourceRunAdminPage() {
  const { gameId } = useParams()
  const { auth } = useAuth()
  const { t } = useI18n()

  const [game, setGame] = useState(null)
  const [nodes, setNodes] = useState([])
  const [form, setForm] = useState(defaultForm)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const isEdit = Boolean(form.id)

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
      setError(err.message || 'Failed to load Resource Run nodes')
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

  function fillForm(node) {
    setForm({
      id: String(node?.id || ''),
      title: String(node?.title || ''),
      resource_type: String(node?.resource_type || 'food'),
      latitude: node?.latitude === null || node?.latitude === undefined ? '' : String(node.latitude),
      longitude: node?.longitude === null || node?.longitude === undefined ? '' : String(node.longitude),
      radius_meters: String(Number(node?.radius_meters || 25)),
      points: String(Number(node?.points || 1)),
      marker_color: String(node?.marker_color || '#ef4444'),
    })
  }

  async function handleDeleteNode(node) {
    if (!window.confirm(t('resource_run.admin.node_delete_confirm', { title: node?.title || '' }, `Delete ${node?.title || 'node'}?`))) {
      return
    }

    setError('')
    setSuccess('')
    try {
      await moduleApi.deleteResourceRunNode(auth.token, gameId, node.id)
      await loadAll()
      if (String(form.id) === String(node.id)) {
        resetForm()
      }
      setSuccess(t('moduleOverview.delete', {}, 'Deleted'))
    } catch (err) {
      setError(err.message || 'Failed to delete node')
    }
  }

  async function handleSubmitNode(event) {
    event.preventDefault()
    setError('')
    setSuccess('')

    const payload = {
      title: form.title.trim(),
      resource_type: form.resource_type.trim(),
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      radius_meters: Number(form.radius_meters || 25),
      points: Number(form.points || 1),
      marker_color: String(form.marker_color || '#ef4444').trim().toLowerCase(),
    }

    if (!Number.isFinite(payload.latitude) || !Number.isFinite(payload.longitude)) {
      setError('Latitude and longitude are required')
      return
    }

    try {
      if (isEdit) {
        await moduleApi.updateResourceRunNode(auth.token, gameId, form.id, payload)
      } else {
        await moduleApi.createResourceRunNode(auth.token, gameId, payload)
      }
      await loadAll()
      resetForm()
      setSuccess(t('button.save', {}, 'Saved'))
    } catch (err) {
      setError(err.message || 'Failed to save node')
    }
  }

  return (
    <main className="page-shell">
      <div className="geo-header">
        <div>
          <p className="overview-kicker">{t('resource_run.admin.kicker', {}, 'Resource Run')}</p>
          <h1>{t('resource_run.admin.nodes_heading', { game: game?.name || '' }, `Nodes · ${game?.name || '-'}`)}</h1>
          <p className="overview-subtitle">{t('resource_run.admin.nodes_subtitle', {}, 'Configure resource nodes')}</p>
        </div>
        <div className="overview-actions">
            <Link className="btn btn-ghost" to={`/admin/games/${gameId}`}>
            {t('resource_run.admin.back', {}, 'Back')}
          </Link>
          <button className="btn btn-primary" type="button" onClick={resetForm}>
            {t('resource_run.admin.node_add', {}, 'Add node')}
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
              {t('resource_run.admin.map_help', {}, 'Map preview uses node coordinates.')}
            </p>
          </div>
        </section>

        <section className="geo-panel">
          <h2>{t('resource_run.admin.node_list', {}, 'Node list')}</h2>
          {nodes.length === 0 ? <p className="muted">{t('resource_run.admin.node_empty', {}, 'No nodes yet')}</p> : null}
          {nodes.length > 0 ? (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('resource_run.admin.node_table_title', {}, 'Title')}</th>
                  <th>{t('resource_run.admin.node_table_type', {}, 'Type')}</th>
                  <th>{t('resource_run.admin.node_table_points', {}, 'Points')}</th>
                  <th>{t('resource_run.admin.node_table_color', {}, 'Color')}</th>
                  <th className="text-right">{t('resource_run.admin.node_table_actions', {}, 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {nodes.map((node) => (
                  <tr key={node.id}>
                    <td>{node.title}</td>
                    <td>{node.resource_type}</td>
                    <td>{node.points}</td>
                    <td>
                      <span
                        style={{
                          display: 'inline-flex',
                          width: 18,
                          height: 18,
                          borderRadius: '50%',
                          border: '1px solid var(--stroke)',
                          background: node.marker_color,
                          marginRight: '0.5rem',
                        }}
                      />
                      <span className="muted">{node.marker_color}</span>
                    </td>
                    <td className="text-right table-actions-inline">
                      <button className="btn btn-edit btn-small" type="button" onClick={() => fillForm(node)}>
                        {t('button.edit', {}, 'Edit')}
                      </button>
                      <button className="btn btn-remove btn-small" type="button" onClick={() => handleDeleteNode(node)}>
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
          <h2>{isEdit ? t('resource_run.admin.node_edit_heading', { title: form.title }, 'Edit node') : t('resource_run.admin.node_new_heading', { game: game?.name || '' }, 'New node')}</h2>

          <form onSubmit={handleSubmitNode}>
            <div className="form-row">
              <label htmlFor="node-title">{t('resource_run.admin.node_field_title', {}, 'Title')}</label>
              <input
                id="node-title"
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                required
              />
            </div>

            <div className="form-row">
              <label htmlFor="node-type">{t('resource_run.admin.node_field_type', {}, 'Type')}</label>
              <input
                id="node-type"
                value={form.resource_type}
                onChange={(event) => setForm((current) => ({ ...current, resource_type: event.target.value }))}
                required
              />
            </div>

            <div className="form-row form-row-inline">
              <div>
                <label htmlFor="node-lat">{t('resource_run.admin.node_field_lat', {}, 'Latitude')}</label>
                <input
                  id="node-lat"
                  type="number"
                  step="0.000001"
                  value={form.latitude}
                  onChange={(event) => setForm((current) => ({ ...current, latitude: event.target.value }))}
                  required
                />
              </div>
              <div>
                <label htmlFor="node-lon">{t('resource_run.admin.node_field_lon', {}, 'Longitude')}</label>
                <input
                  id="node-lon"
                  type="number"
                  step="0.000001"
                  value={form.longitude}
                  onChange={(event) => setForm((current) => ({ ...current, longitude: event.target.value }))}
                  required
                />
              </div>
            </div>

            <div className="form-row">
              <label htmlFor="node-radius">{t('resource_run.admin.node_field_radius', {}, 'Radius')}</label>
              <input
                id="node-radius"
                type="number"
                min="5"
                value={form.radius_meters}
                onChange={(event) => setForm((current) => ({ ...current, radius_meters: event.target.value }))}
                required
              />
            </div>

            <div className="form-row">
              <label htmlFor="node-points">{t('resource_run.admin.node_field_points', {}, 'Points')}</label>
              <input
                id="node-points"
                type="number"
                min="1"
                value={form.points}
                onChange={(event) => setForm((current) => ({ ...current, points: event.target.value }))}
                required
              />
            </div>

            <div className="form-row">
              <label htmlFor="node-color">{t('common.color', {}, 'Color')}</label>
              <input
                id="node-color"
                type="color"
                value={form.marker_color}
                onChange={(event) => setForm((current) => ({ ...current, marker_color: event.target.value }))}
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
