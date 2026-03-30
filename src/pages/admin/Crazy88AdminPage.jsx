import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'

import { gameApi, moduleApi } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { useI18n } from '../../lib/i18n'

export default function Crazy88AdminPage() {
  const { gameId } = useParams()
  const { auth } = useAuth()
  const { t } = useI18n()
  const location = useLocation()

  const [game, setGame] = useState(null)
  const [tasks, setTasks] = useState([])
  const [config, setConfig] = useState({ visibility_mode: 'all_visible' })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(location.state?.flashSuccess || '')

  const sortedTasks = useMemo(() => {
    const list = [...tasks]
    list.sort((left, right) => {
      const leftSort = Number(left?.sort_order || 0)
      const rightSort = Number(right?.sort_order || 0)
      if (leftSort !== rightSort) return leftSort - rightSort
      return String(left?.title || '').localeCompare(String(right?.title || ''))
    })
    return list
  }, [tasks])

  async function loadAll() {
    setLoading(true)
    setError('')
    try {
      const [gameRecord, tasksPayload, configPayload] = await Promise.all([
        gameApi.getGame(auth.token, gameId),
        moduleApi.getCrazy88Tasks(auth.token, gameId),
        moduleApi.getCrazy88Config(auth.token, gameId).catch(() => ({ config: { visibility_mode: 'all_visible' } })),
      ])
      setGame(gameRecord)
      setTasks(Array.isArray(tasksPayload?.tasks) ? tasksPayload.tasks : [])
      setConfig(configPayload?.config || { visibility_mode: 'all_visible' })
    } catch (err) {
      setError(err.message || t('crazy88.admin.load_failed', {}, 'Failed to load Crazy88 admin data'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAll() }, [auth.token, gameId])

  async function deleteTask(task) {
    if (!window.confirm(t('crazy88.admin.task_delete_confirm', { title: task?.title || '' }, 'Delete task?'))) return
    setError('')
    setSuccess('')
    try {
      await moduleApi.deleteCrazy88Task(auth.token, gameId, task.id)
      await loadAll()
      setSuccess(t('moduleOverview.delete', {}, 'Deleted'))
    } catch (err) {
      setError(err.message || t('crazy88.admin.task_delete_failed', {}, 'Failed to delete task'))
    }
  }

  async function moveTask(taskId, direction) {
    const currentIndex = sortedTasks.findIndex((task) => String(task.id) === String(taskId))
    if (currentIndex < 0) {
      return
    }

    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (targetIndex < 0 || targetIndex >= sortedTasks.length) {
      return
    }

    const ordered = [...sortedTasks]
    const [item] = ordered.splice(currentIndex, 1)
    ordered.splice(targetIndex, 0, item)

    setError('')
    setSuccess('')
    try {
      const payload = await moduleApi.reorderCrazy88Tasks(auth.token, gameId, ordered.map((task) => task.id))
      const orderedIds = Array.isArray(payload?.ordered_ids) ? payload.ordered_ids.map((value) => String(value || '')) : ordered.map((task) => String(task.id || ''))
      const byId = new Map(tasks.map((task) => [String(task.id || ''), task]))
      const reordered = orderedIds.map((id) => byId.get(id)).filter(Boolean)
      const used = new Set(reordered.map((task) => String(task.id || '')))
      const tail = tasks.filter((task) => !used.has(String(task.id || '')))
      setTasks([...reordered, ...tail])
      setSuccess(t('button.save', {}, 'Saved'))
    } catch (err) {
      setError(err.message || t('crazy88.admin.reorder_failed', {}, 'Failed to reorder tasks'))
    }
  }

  return (
    <main className="page-shell">
      <div className="geo-header">
        <div>
          <p className="overview-kicker">{t('crazy88.admin.kicker', {}, 'Crazy 88')}</p>
          <h1>{t('crazy88.admin.tasks_heading', { game: game?.name || '' }, `Tasks · ${game?.name || '-'}`)}</h1>
          <p className="overview-subtitle">{t('gamePage.manageTasks', {}, 'Manage tasks')}</p>
        </div>
        <div className="overview-actions">
          <Link className="btn btn-ghost" to={'/admin/games/' + gameId}>{t('crazy88.admin.back', {}, 'Back')}</Link>
          <Link className="btn btn-primary" to={'/admin/crazy88/' + gameId + '/tasks/new'}>{t('crazy88.admin.task_add', {}, 'Add task')}</Link>
        </div>
      </div>

      {error ? <div className="flash flash-error">{error}</div> : null}
      {success ? <div className="flash flash-success">{success}</div> : null}
      {loading ? <p>{t('gamesPage.loading', {}, 'Loading…')}</p> : null}

      <section className="admin-block">
        <h2>{t('crazy88.admin.task_list', {}, 'Task list')}</h2>
        <table className="admin-table">
          <thead>
            <tr>
              <th>{t('crazy88.admin.table_title', {}, 'Title')}</th>
              <th>{t('crazy88.admin.table_points', {}, 'Points')}</th>
              <th>{t('crazy88.admin.table_location', {}, 'Location')}</th>
              <th>{t('crazy88.admin.table_actions', {}, 'Actions')}</th>
            </tr>
          </thead>
          <tbody>
            {sortedTasks.map((task, index) => (
              <tr key={task.id}>
                <td>
                  <strong>{task.title}</strong>
                  <br />
                  <small className="muted">{task.description || '-'}</small>
                </td>
                <td>{task.points}</td>
                <td>
                  {config.visibility_mode === 'all_visible'
                    ? t('crazy88.visibility.all_visible', {}, 'All visible')
                    : task.latitude !== null && task.longitude !== null
                      ? `${task.latitude}, ${task.longitude} · ${task.radius_meters}m`
                      : <span className="muted">{t('crazy88.admin.location_not_set', {}, 'Not set')}</span>}
                </td>
                <td className="table-actions-inline">
                  <button
                    className="btn btn-ghost btn-small"
                    type="button"
                    onClick={() => moveTask(task.id, 'up')}
                    disabled={index === 0}
                  >
                    ↑
                  </button>
                  <button
                    className="btn btn-ghost btn-small"
                    type="button"
                    onClick={() => moveTask(task.id, 'down')}
                    disabled={index === sortedTasks.length - 1}
                  >
                    ↓
                  </button>
                  <Link className="btn btn-edit btn-small" to={'/admin/crazy88/' + gameId + '/tasks/' + task.id + '/edit'}>
                    {t('button.edit', {}, 'Edit')}
                  </Link>
                  <button className="btn btn-remove btn-small" type="button" onClick={() => deleteTask(task)}>
                    {t('button.delete', {}, 'Delete')}
                  </button>
                </td>
              </tr>
            ))}
            {sortedTasks.length === 0 ? (
              <tr><td colSpan={4} className="muted">{t('crazy88.admin.task_empty', {}, 'No tasks yet')}</td></tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </main>
  )
}
