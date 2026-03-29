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
  const [reviews, setReviews] = useState({ pending_count: 0, has_assigned_submission: false, threads: [] })
  const [exportGrouping, setExportGrouping] = useState('team_task')
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
      const [gameRecord, tasksPayload, reviewsPayload] = await Promise.all([
        gameApi.getGame(auth.token, gameId),
        moduleApi.getCrazy88Tasks(auth.token, gameId),
        moduleApi.getCrazy88Reviews(auth.token, gameId).catch(() => ({ pending_count: 0, has_assigned_submission: false, threads: [] })),
      ])
      setGame(gameRecord)
      setTasks(Array.isArray(tasksPayload?.tasks) ? tasksPayload.tasks : [])
      setReviews({
        pending_count: Number(reviewsPayload?.pending_count || 0),
        has_assigned_submission: Boolean(reviewsPayload?.has_assigned_submission),
        threads: Array.isArray(reviewsPayload?.threads) ? reviewsPayload.threads : [],
      })
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
      setError(err.message || t('crazy88.admin.judge_failed', {}, 'Failed to judge submission'))
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
      setError(err.message || t('crazy88.admin.export_failed', {}, 'Failed to export files'))
    }
  }

  return (
    <main className="page-shell">
      <div className="geo-header">
        <div>
          <p className="overview-kicker">{t('crazy88.admin.kicker', {}, 'Crazy 88')}</p>
          <h1>{t('crazy88.admin.tasks_heading', { game: game?.name || '' }, `Tasks \u00b7 ${game?.name || '-'}`)}</h1>
          <p className="overview-subtitle">{t('crazy88.admin.tasks_subtitle', {}, 'Manage tasks, review submissions')}</p>
        </div>
        <div className="overview-actions">
          <Link className="btn btn-ghost" to={'/admin/games/' + gameId}>{t('crazy88.admin.back', {}, 'Back')}</Link>
          <Link className="btn btn-primary" to={'/admin/crazy88/' + gameId + '/tasks/new'}>{t('crazy88.admin.task_add', {}, 'Add task')}</Link>
        </div>
      </div>

      {error ? <div className="flash flash-error">{error}</div> : null}
      {success ? <div className="flash flash-success">{success}</div> : null}
      {loading ? <p>{t('gamesPage.loading', {}, 'Loading\u2026')}</p> : null}

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
                    ? `${task.latitude}, ${task.longitude} \u00b7 ${task.radius_meters}m`
                    : <span className="muted">{t('crazy88.admin.location_not_set', {}, 'Not set')}</span>}
                </td>
                <td className="table-actions-inline">
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

      <section className="admin-block">
        <div style={{ marginBottom: '1rem' }}>
          <h2>{t('crazy88.admin.review_heading', { game: game?.name || '' }, 'Review submissions')}</h2>
          <p className="overview-subtitle">{t('crazy88.admin.review_subtitle', { count: reviews.pending_count }, `${reviews.pending_count} pending`)}</p>
        </div>

        <form onSubmit={downloadExport} className="form-row form-row-inline" style={{ alignItems: 'flex-end', marginBottom: '1rem' }}>
          <div>
            <label htmlFor="crazy88-export-grouping">{t('crazy88.admin.download_group_label', {}, 'Download grouping')}</label>
            <select id="crazy88-export-grouping" value={exportGrouping} onChange={(event) => setExportGrouping(event.target.value)}>
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
              <h3>{thread.task_title} \u00b7 {thread.team_name}</h3>
              <p className="muted">{t('crazy88.admin.task_points', { points: thread.task_points || 0 }, `Points: ${thread.task_points || 0}`)}</p>

              <div className="crazy88-chat">
                {(thread.submissions || []).map((submission) => (
                  <article key={submission.id} className="geo-card">
                    <p className="muted">{submission.submitted_at || '-'}</p>
                    <p><strong>{submission.status || 'pending'}</strong></p>
                    {submission.team_message ? <p>{submission.team_message}</p> : null}
                    {submission.proof_text ? <p>{submission.proof_text}</p> : null}
                    {submission.proof_path ? (
                      <p><a href={submission.proof_path} target="_blank" rel="noreferrer">{submission.proof_original_name || t('crazy88.team.proof_file_default', {}, 'Proof file')}</a></p>
                    ) : null}
                    {submission.reviewed_at ? (
                      <p className="muted">{submission.reviewed_at}{submission.judge_message ? ` \u00b7 ${submission.judge_message}` : ''}</p>
                    ) : null}
                    {submission.status === 'pending' ? (
                      <div className="table-actions-inline">
                        <button className="btn btn-primary btn-small" type="button" onClick={() => judgeSubmission(thread.team_id, submission.id, true)}>
                          {t('crazy88.admin.accept', {}, 'Accept')}
                        </button>
                        <button className="btn btn-remove btn-small" type="button" onClick={() => judgeSubmission(thread.team_id, submission.id, false)}>
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
