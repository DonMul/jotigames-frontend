import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import GeoLocationPicker from '../../components/GeoLocationPicker'
import { gameApi, moduleApi } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { useI18n } from '../../lib/i18n'

function defaultTaskForm() {
  return {
    id: '',
    title: '',
    description: '',
    points: '1',
    latitude: '',
    longitude: '',
    radius_meters: '25',
    sort_order: '0',
  }
}

export default function Crazy88AdminPage() {
  const { gameId } = useParams()
  const { auth } = useAuth()
  const { t } = useI18n()

  const [game, setGame] = useState(null)
  const [config, setConfig] = useState({ visibility_mode: 'all_visible' })
  const [tasks, setTasks] = useState([])
  const [reviews, setReviews] = useState({ pending_count: 0, has_assigned_submission: false, threads: [] })
  const [exportGrouping, setExportGrouping] = useState('team_task')
  const [taskForm, setTaskForm] = useState(defaultTaskForm)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const isEdit = Boolean(taskForm.id)
  const isGeoLocked = config.visibility_mode === 'geo_locked'

  const sortedTasks = useMemo(() => {
    const list = [...tasks]
    list.sort((left, right) => {
      const leftSort = Number(left?.sort_order || 0)
      const rightSort = Number(right?.sort_order || 0)
      if (leftSort !== rightSort) {
        return leftSort - rightSort
      }
      return String(left?.title || '').localeCompare(String(right?.title || ''))
    })
    return list
  }, [tasks])

  async function loadAll() {
    setLoading(true)
    setError('')
    try {
      const [gameRecord, configPayload, tasksPayload, reviewsPayload] = await Promise.all([
        gameApi.getGame(auth.token, gameId),
        moduleApi.getCrazy88Config(auth.token, gameId),
        moduleApi.getCrazy88Tasks(auth.token, gameId),
        moduleApi.getCrazy88Reviews(auth.token, gameId).catch(() => ({ pending_count: 0, has_assigned_submission: false, threads: [] })),
      ])

      setGame(gameRecord)
      setConfig(configPayload?.config || { visibility_mode: 'all_visible' })
      setTasks(Array.isArray(tasksPayload?.tasks) ? tasksPayload.tasks : [])
      setReviews({
        pending_count: Number(reviewsPayload?.pending_count || 0),
        has_assigned_submission: Boolean(reviewsPayload?.has_assigned_submission),
        threads: Array.isArray(reviewsPayload?.threads) ? reviewsPayload.threads : [],
      })
    } catch (err) {
      setError(err.message || 'Failed to load Crazy88 admin data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [auth.token, gameId])

  function resetForm() {
    setTaskForm(defaultTaskForm())
  }

  function editTask(task) {
    setTaskForm({
      id: String(task?.id || ''),
      title: String(task?.title || ''),
      description: String(task?.description || ''),
      points: String(Number(task?.points || 1)),
      latitude: task?.latitude === null || task?.latitude === undefined ? '' : String(task.latitude),
      longitude: task?.longitude === null || task?.longitude === undefined ? '' : String(task.longitude),
      radius_meters: String(Number(task?.radius_meters || 25)),
      sort_order: String(Number(task?.sort_order || 0)),
    })
  }

  async function saveConfig(event) {
    event.preventDefault()
    setError('')
    setSuccess('')
    try {
      const payload = {
        visibility_mode: config.visibility_mode === 'geo_locked' ? 'geo_locked' : 'all_visible',
      }
      await moduleApi.updateCrazy88Config(auth.token, gameId, payload)
      await loadAll()
      setSuccess(t('button.save', {}, 'Saved'))
    } catch (err) {
      setError(err.message || 'Failed to save settings')
    }
  }

  async function saveTask(event) {
    event.preventDefault()
    setError('')
    setSuccess('')

    const payload = {
      title: taskForm.title.trim(),
      description: taskForm.description.trim() || null,
      points: Number(taskForm.points || 1),
      latitude: taskForm.latitude === '' ? null : Number(taskForm.latitude),
      longitude: taskForm.longitude === '' ? null : Number(taskForm.longitude),
      radius_meters: Number(taskForm.radius_meters || 25),
      sort_order: Number(taskForm.sort_order || 0),
    }

    if (isGeoLocked) {
      if ((payload.latitude === null) !== (payload.longitude === null)) {
        setError('Latitude and longitude must both be set for geo-locked mode')
        return
      }
      if (payload.latitude !== null && (!Number.isFinite(payload.latitude) || !Number.isFinite(payload.longitude))) {
        setError('Latitude/longitude must be valid numbers')
        return
      }
    }

    try {
      if (isEdit) {
        await moduleApi.updateCrazy88Task(auth.token, gameId, taskForm.id, payload)
      } else {
        await moduleApi.createCrazy88Task(auth.token, gameId, payload)
      }
      await loadAll()
      resetForm()
      setSuccess(t('button.save', {}, 'Saved'))
    } catch (err) {
      setError(err.message || 'Failed to save task')
    }
  }

  async function deleteTask(task) {
    if (!window.confirm(t('crazy88.admin.task_delete_confirm', { title: task?.title || '' }, 'Delete task?'))) {
      return
    }

    setError('')
    setSuccess('')
    try {
      await moduleApi.deleteCrazy88Task(auth.token, gameId, task.id)
      await loadAll()
      if (String(taskForm.id) === String(task.id)) {
        resetForm()
      }
      setSuccess(t('moduleOverview.delete', {}, 'Deleted'))
    } catch (err) {
      setError(err.message || 'Failed to delete task')
    }
  }

  async function judgeSubmission(teamId, submissionId, accepted) {
    setError('')
    setSuccess('')
    try {
      await moduleApi.judgeCrazy88Submission(auth.token, gameId, {
        team_id: String(teamId || ''),
        submission_id: String(submissionId || ''),
        accepted: Boolean(accepted),
      })
      await loadAll()
      setSuccess(accepted ? t('crazy88.admin.accept', {}, 'Accepted') : t('crazy88.admin.reject', {}, 'Rejected'))
    } catch (err) {
      setError(err.message || 'Failed to judge submission')
    }
  }

  async function downloadExport(event) {
    event.preventDefault()
    setError('')
    setSuccess('')
    try {
      const { blob, filename } = await moduleApi.exportCrazy88Files(auth.token, gameId, exportGrouping)
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = filename || 'crazy88-export.zip'
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      setSuccess(t('crazy88.admin.download_files', {}, 'Downloaded'))
    } catch (err) {
      setError(err.message || 'Failed to export files')
    }
  }

  return (
    <main className="page-shell">
      <section className="overview-header">
        <div>
          <p className="overview-kicker">{t('crazy88.admin.kicker', {}, 'Crazy 88')}</p>
          <h1>{t('crazy88.admin.tasks_heading', { game: game?.name || '' }, `Tasks · ${game?.name || '-'}`)}</h1>
          <p className="overview-subtitle">{t('crazy88.admin.tasks_subtitle', {}, 'Manage tasks and visibility mode')}</p>
        </div>
        <div className="overview-actions">
          <Link className="btn btn-ghost" to={`/admin/games/${gameId}`}>
            {t('crazy88.admin.back', {}, 'Back')}
          </Link>
        </div>
      </section>

      {error ? <div className="flash flash-error">{error}</div> : null}
      {success ? <div className="flash flash-success">{success}</div> : null}
      {loading ? <p>{t('gamesPage.loading', {}, 'Loading…')}</p> : null}

      <div className="geo-layout">
        <section className="overview-panel">
          <h2>{t('crazy88.admin.settings', {}, 'Settings')}</h2>
          <form onSubmit={saveConfig}>
            <div className="form-row">
              <label htmlFor="crazy88-visibility-mode">{t('crazy88.admin.visibility_mode', {}, 'Visibility mode')}</label>
              <select
                id="crazy88-visibility-mode"
                value={config.visibility_mode}
                onChange={(event) => setConfig((current) => ({ ...current, visibility_mode: event.target.value }))}
              >
                <option value="all_visible">{t('crazy88.visibility.all_visible', {}, 'All visible')}</option>
                <option value="geo_locked">{t('crazy88.visibility.geo_locked', {}, 'Geo locked')}</option>
              </select>
            </div>
            <button className="btn btn-primary" type="submit">{t('button.save', {}, 'Save')}</button>
          </form>
        </section>

        <section className="overview-panel">
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
              {sortedTasks.map((task) => (
                <tr key={task.id}>
                  <td>
                    <strong>{task.title}</strong>
                    <br />
                    <small className="muted">{task.description || '-'}</small>
                  </td>
                  <td>{task.points}</td>
                  <td>
                    {task.latitude !== null && task.longitude !== null
                      ? `${task.latitude}, ${task.longitude} · ${task.radius_meters}m`
                      : <span className="muted">{t('crazy88.admin.location_not_set', {}, 'Not set')}</span>}
                  </td>
                  <td className="table-actions-inline">
                    <button className="btn btn-edit btn-small" type="button" onClick={() => editTask(task)}>
                      {t('button.edit', {}, 'Edit')}
                    </button>
                    <button className="btn btn-remove btn-small" type="button" onClick={() => deleteTask(task)}>
                      {t('button.delete', {}, 'Delete')}
                    </button>
                  </td>
                </tr>
              ))}
              {sortedTasks.length === 0 ? (
                <tr>
                  <td colSpan={4} className="muted">{t('crazy88.admin.task_empty', {}, 'No tasks yet')}</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </section>
      </div>

      <section className="admin-block">
        <h2>{isEdit ? t('crazy88.admin.task_edit', {}, 'Edit task') : t('crazy88.admin.task_add', {}, 'Add task')}</h2>
        <form onSubmit={saveTask}>
          <div className="form-row">
            <label htmlFor="crazy88-title">{t('crazy88.admin.table_title', {}, 'Title')}</label>
            <input
              id="crazy88-title"
              value={taskForm.title}
              onChange={(event) => setTaskForm((current) => ({ ...current, title: event.target.value }))}
              required
            />
          </div>
          <div className="form-row">
            <label htmlFor="crazy88-description">{t('crazy88.admin.description', {}, 'Description')}</label>
            <textarea
              id="crazy88-description"
              rows={3}
              value={taskForm.description}
              onChange={(event) => setTaskForm((current) => ({ ...current, description: event.target.value }))}
            />
          </div>
          <div className="form-row form-row-inline">
            <div>
              <label htmlFor="crazy88-points">{t('crazy88.admin.table_points', {}, 'Points')}</label>
              <input
                id="crazy88-points"
                type="number"
                min="1"
                value={taskForm.points}
                onChange={(event) => setTaskForm((current) => ({ ...current, points: event.target.value }))}
                required
              />
            </div>
            <div>
              <label htmlFor="crazy88-sort-order">{t('crazy88.admin.sort_order', {}, 'Sort order')}</label>
              <input
                id="crazy88-sort-order"
                type="number"
                min="0"
                value={taskForm.sort_order}
                onChange={(event) => setTaskForm((current) => ({ ...current, sort_order: event.target.value }))}
              />
            </div>
          </div>

          <GeoLocationPicker
            latitude={taskForm.latitude}
            longitude={taskForm.longitude}
            onChange={(nextLat, nextLon) => setTaskForm((current) => ({ ...current, latitude: nextLat, longitude: nextLon }))}
            ariaLabel={t('crazy88.admin.task_add', {}, 'Task location map')}
          />

          <div className="form-row form-row-inline">
            <div>
              <label htmlFor="crazy88-latitude">{t('crazy88.admin.form_latitude', {}, 'Latitude')}</label>
              <input
                id="crazy88-latitude"
                type="number"
                step="0.000001"
                value={taskForm.latitude}
                onChange={(event) => setTaskForm((current) => ({ ...current, latitude: event.target.value }))}
              />
            </div>
            <div>
              <label htmlFor="crazy88-longitude">{t('crazy88.admin.form_longitude', {}, 'Longitude')}</label>
              <input
                id="crazy88-longitude"
                type="number"
                step="0.000001"
                value={taskForm.longitude}
                onChange={(event) => setTaskForm((current) => ({ ...current, longitude: event.target.value }))}
              />
            </div>
          </div>

          <div className="form-row">
            <label htmlFor="crazy88-radius">{t('crazy88.admin.form_radius', {}, 'Radius')}</label>
            <input
              id="crazy88-radius"
              type="number"
              min="5"
              value={taskForm.radius_meters}
              onChange={(event) => setTaskForm((current) => ({ ...current, radius_meters: event.target.value }))}
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

      <section className="admin-block">
        <div className="overview-header" style={{ marginBottom: '1rem' }}>
          <div>
            <h2>{t('crazy88.admin.review_heading', { game: game?.name || '' }, 'Review submissions')}</h2>
            <p className="overview-subtitle">{t('crazy88.admin.review_subtitle', { count: reviews.pending_count }, `${reviews.pending_count} pending`)}</p>
          </div>
        </div>

        <form onSubmit={downloadExport} className="form-row form-row-inline" style={{ alignItems: 'flex-end', marginBottom: '1rem' }}>
          <div>
            <label htmlFor="crazy88-export-grouping">{t('crazy88.admin.download_group_label', {}, 'Download grouping')}</label>
            <select
              id="crazy88-export-grouping"
              value={exportGrouping}
              onChange={(event) => setExportGrouping(event.target.value)}
            >
              <option value="team_task">{t('crazy88.admin.download_group_team_first', {}, 'By team, then task')}</option>
              <option value="task_team">{t('crazy88.admin.download_group_task_first', {}, 'By task, then team')}</option>
            </select>
          </div>
          <button className="btn btn-primary" type="submit">{t('crazy88.admin.download_files', {}, 'Download files')}</button>
        </form>

        {!reviews.has_assigned_submission ? (
          <p className="muted">{t('crazy88.admin.review_empty', {}, 'No submission assigned right now')}</p>
        ) : null}

        <div className="geo-layout">
          {reviews.threads.map((thread) => (
            <section key={`${thread.task_id}:${thread.team_id}`} className="overview-panel">
              <h3>{thread.task_title} · {thread.team_name}</h3>
              <p className="muted">{t('crazy88.admin.task_points', { points: thread.task_points || 0 }, `Points: ${thread.task_points || 0}`)}</p>

              <div className="crazy88-chat">
                {(thread.submissions || []).map((submission) => (
                  <article key={submission.id} className="geo-card">
                    <p className="muted">{submission.submitted_at || '-'}</p>
                    <p><strong>{submission.status || 'pending'}</strong></p>
                    {submission.team_message ? <p>{submission.team_message}</p> : null}
                    {submission.proof_text ? <p>{submission.proof_text}</p> : null}
                    {submission.proof_path ? (
                      <p>
                        <a href={submission.proof_path} target="_blank" rel="noreferrer">
                          {submission.proof_original_name || t('crazy88.team.proof_file_default', {}, 'Proof file')}
                        </a>
                      </p>
                    ) : null}
                    {submission.reviewed_at ? (
                      <p className="muted">{submission.reviewed_at}{submission.judge_message ? ` · ${submission.judge_message}` : ''}</p>
                    ) : null}

                    {submission.status === 'pending' ? (
                      <div className="table-actions-inline">
                        <button
                          className="btn btn-primary btn-small"
                          type="button"
                          onClick={() => judgeSubmission(thread.team_id, submission.id, true)}
                        >
                          {t('crazy88.admin.accept', {}, 'Accept')}
                        </button>
                        <button
                          className="btn btn-remove btn-small"
                          type="button"
                          onClick={() => judgeSubmission(thread.team_id, submission.id, false)}
                        >
                          {t('crazy88.admin.reject', {}, 'Reject')}
                        </button>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>
      </section>
    </main>
  )
}
