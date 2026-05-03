import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'

import AdminOverviewMap from '../../components/AdminOverviewMap'
import { gameApi, moduleApi } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { useI18n } from '../../lib/i18n'

export default function CheckpointHeistAdminPage() {
  const { gameId } = useParams()
  const { auth } = useAuth()
  const { t } = useI18n()
  const location = useLocation()

  const [game, setGame] = useState(null)
  const [checkpoints, setCheckpoints] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(location.state?.flashSuccess || '')

  async function loadAll() {
    setLoading(true)
    setError('')
    try {
      const [gameRecord, checkpointsPayload] = await Promise.all([
        gameApi.getGame(auth.token, gameId),
        moduleApi.getCheckpointHeistCheckpoints(auth.token, gameId),
      ])
      setGame(gameRecord)
      setCheckpoints(Array.isArray(checkpointsPayload?.checkpoints) ? checkpointsPayload.checkpoints : [])
    } catch (err) {
      setError(err.message || t('error.loadFailed', {}))
    } finally { setLoading(false) }
  }

  useEffect(() => { loadAll() }, [auth.token, gameId])

  async function handleDeleteCheckpoint(checkpoint) {
    if (!window.confirm(t('checkpoint_heist.admin.delete_confirm', {}))) return
    setError(''); setSuccess('')
    try {
      await moduleApi.deleteCheckpointHeistCheckpoint(auth.token, gameId, checkpoint.id)
      await loadAll()
      setSuccess(t('status.deleted', {}))
    } catch (err) { setError(err.message || 'Failed to delete checkpoint') }
  }

  async function handleMoveCheckpoint(index, direction) {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= checkpoints.length) return
    const ordered = [...checkpoints]
    const [item] = ordered.splice(index, 1)
    ordered.splice(targetIndex, 0, item)
    try {
      const response = await moduleApi.reorderCheckpointHeistCheckpoints(auth.token, gameId, ordered.map((entry) => entry.id))
      setCheckpoints(Array.isArray(response?.checkpoints) ? response.checkpoints : ordered)
    } catch (err) { setError(err.message || 'Failed to reorder checkpoints') }
  }

  return (
    <main className="page-shell">
      <div className="geo-header">
        <div>
          <p className="overview-kicker">{t('checkpoint_heist.admin.kicker', {})}</p>
          <h1>{game?.name || '-'}</h1>
          <p className="overview-subtitle">{t('checkpoint_heist.admin.checkpoints_subtitle', {})}</p>
        </div>
        <div className="overview-actions">
          <Link className="btn btn-ghost" to={'/admin/games/' + gameId}>{t('common.back', {})}</Link>
          <Link className="btn btn-primary" to={'/admin/checkpoint-heist/' + gameId + '/checkpoints/new'}>{t('checkpoint_heist.admin.create_checkpoint', {})}</Link>
        </div>
      </div>

      {error ? <div className="flash flash-error">{error}</div> : null}
      {success ? <div className="flash flash-success">{success}</div> : null}
      {loading ? <p>{t('gamesPage.loading', {})}</p> : null}

      <section className="overview-panel">
        <h2>{t('common.map', {})}</h2>
        <AdminOverviewMap
          entities={checkpoints}
          getLabel={(cp) => cp.title || '-'}
          getColor={(cp) => cp.marker_color || '#dc2626'}
          getRadius={(cp) => Number(cp.radius_meters || 25)}
          ariaLabel={t('checkpoint_heist.admin.map_label', {})}
        />
      </section>

      <section className="overview-panel">
        <h2>{t('checkpoint_heist.admin.checkpoints_list', {})}</h2>
        <table className="admin-table">
          <thead>
            <tr>
              <th>{t('table.sequence', {})}</th>
              <th>{t('table.title', {})}</th>
              <th>{t('common.lat', {})}</th>
              <th>{t('common.lon', {})}</th>
              <th>{t('table.radius', {})}</th>
              <th>{t('table.points', {})}</th>
              <th>{t('table.actions', {})}</th>
            </tr>
          </thead>
          <tbody>
            {checkpoints.map((checkpoint, index) => (
              <tr key={checkpoint.id}>
                <td>{checkpoint.order_index}</td>
                <td>{checkpoint.title}</td>
                <td>{checkpoint.latitude}</td>
                <td>{checkpoint.longitude}</td>
                <td>{checkpoint.radius_meters}</td>
                <td>{checkpoint.points}</td>
                <td className="table-actions-inline">
                  <button className="btn btn-ghost btn-small" type="button" onClick={() => handleMoveCheckpoint(index, 'up')} disabled={index === 0}>
                    ↑
                  </button>
                  <button className="btn btn-ghost btn-small" type="button" onClick={() => handleMoveCheckpoint(index, 'down')} disabled={index === checkpoints.length - 1}>
                    ↓
                  </button>
                  <Link className="btn btn-edit btn-small" to={'/admin/checkpoint-heist/' + gameId + '/checkpoints/' + checkpoint.id + '/edit'}>{t('button.label.edit', {})}</Link>
                  <button className="btn btn-remove btn-small" type="button" onClick={() => handleDeleteCheckpoint(checkpoint)}>{t('button.label.delete', {})}</button>
                </td>
              </tr>
            ))}
            {checkpoints.length === 0 ? (<tr><td colSpan={7} className="muted">{t('checkpoint_heist.admin.empty_checkpoints', {})}</td></tr>) : null}
          </tbody>
        </table>
      </section>
    </main>
  )
}
