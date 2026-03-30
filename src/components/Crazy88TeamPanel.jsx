import { Link } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { toAssetUrl } from '../lib/assetUrl'

export default function Crazy88TeamPanel({
  state,
  currentTeamId,
  t,
  onSubmitTask,
  submitting = false,
  selectedTaskId = '',
  detailBasePath = '/team/crazy88/tasks',
}) {
  const [teamMessage, setTeamMessage] = useState('')
  const [proofFile, setProofFile] = useState(null)

  const tasks = useMemo(() => {
    const items = Array.isArray(state?.tasks) ? state.tasks : []
    return items
      .filter((task) => task && task.is_active !== false)
      .map((task) => ({
        id: String(task.id || ''),
        title: String(task.title || ''),
        description: String(task.description || ''),
        points: Number(task.points || 0),
        category: String(task.category || ''),
        submissions: Array.isArray(task.submissions) ? task.submissions : [],
        latestStatus: String(task.latest_status || '').toLowerCase() || null,
        canSubmit: Boolean(task.can_submit),
      }))
      .sort((a, b) => a.title.localeCompare(b.title))
  }, [state?.tasks])

  const statusByTaskId = useMemo(() => {
    const statuses = new Map(tasks.map((task) => [task.id, task.latestStatus]))

    const actions = Array.isArray(state?.last_actions) ? state.last_actions : []
    const submitted = new Set()
    const accepted = new Set()
    const rejected = new Set()

    for (const a of actions) {
      if (String(a?.team_id || '') !== String(currentTeamId || '')) {
        continue
      }
      if (String(a?.action || '') === 'crazy88.task.submit') {
        submitted.add(String(a?.object_id || ''))
      }
      if (String(a?.action || '') === 'crazy88.review.judge') {
        const actionObjectId = String(a?.object_id || '')
        const task = tasks.find((item) => item.submissions.some((submission) => String(submission?.id || '') === actionObjectId))
        if (!task) {
          continue
        }
        const acceptedMeta = Boolean(a?.metadata?.accepted)
        if (acceptedMeta) {
          accepted.add(task.id)
        } else {
          rejected.add(task.id)
        }
      }
    }

    for (const task of tasks) {
      if (statuses.has(task.id) && statuses.get(task.id)) {
        continue
      }
      if (accepted.has(task.id)) {
        statuses.set(task.id, 'accepted')
      } else if (rejected.has(task.id)) {
        statuses.set(task.id, 'rejected')
      } else if (submitted.has(task.id)) {
        statuses.set(task.id, 'pending')
      }
    }

    return statuses
  }, [tasks, state?.last_actions, currentTeamId])

  const highscore = useMemo(() => {
    if (!Boolean(state?.show_highscore ?? true)) {
      return []
    }
    const teams = Array.isArray(state?.highscore) ? state.highscore : []
    return teams
      .map((row) => ({ teamId: String(row?.team_id || ''), name: String(row?.name || '-'), logoPath: String(row?.logo_path || ''), score: Number(row?.score || 0) }))
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
      .map((row, i) => ({ ...row, rank: i + 1 }))
  }, [state?.highscore])

  const selectedTask = useMemo(
    () => tasks.find((task) => task.id === String(selectedTaskId || '')) || null,
    [tasks, selectedTaskId],
  )

  const selectedTaskStatus = selectedTask ? (statusByTaskId.get(selectedTask.id) || null) : null
  const selectedTaskCanSubmit = selectedTask
    ? (selectedTask.canSubmit || selectedTaskStatus === 'rejected')
    : false

  function statusNode(status) {
    if (status === 'accepted') {
      return <span aria-label={t('crazy88.team.status_accepted', {}, 'Approved')}>☑</span>
    }
    if (status === 'rejected') {
      return <span className="text-red-600" aria-label={t('crazy88.team.status_rejected', {}, 'Denied')}>✕</span>
    }
    if (status === 'pending') {
      return (
        <span
          className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-gray-700 dark:border-slate-600 dark:border-t-slate-200"
          aria-label={t('crazy88.team.status_pending', {}, 'Pending')}
        />
      )
    }
    return (
      <span className="text-orange-500" aria-label={t('crazy88.team.status_needs_submission', {}, 'Needs submission')}>❕</span>
    )
  }

  function handleSubmit(event) {
    event.preventDefault()
    if (!selectedTask) {
      return
    }
    onSubmitTask(selectedTask.id, {
      team_message: teamMessage,
      proof_file: proofFile,
    })
    setTeamMessage('')
    setProofFile(null)
  }

  if (selectedTaskId) {
    return (
      <section className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="mb-4 flex items-center justify-between">
          <Link className="btn btn-primary" to="/team">
            ← {t('crazy88.team.back_to_tasks', {}, 'Back to tasks')}
          </Link>
        </div>

        {!selectedTask ? (
          <p className="text-sm text-gray-500 dark:text-slate-400">{t('crazy88.team.task_not_found', {}, 'Task not found')}</p>
        ) : (
          <div className="space-y-5">
            <div className="space-y-2">
              <h2 className="text-2xl font-semibold text-navy-900 dark:text-slate-100">{selectedTask.title}</h2>
              <p className="text-sm text-gray-600 dark:text-slate-300">{selectedTask.description || t('crazy88.team.no_description', {}, 'No description')}</p>
            </div>

            <div className="crazy88-chat mt-2 max-h-[26rem] rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-slate-700 dark:bg-slate-800">
              {selectedTask.submissions.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-slate-400">{t('crazy88.team.no_conversation', {}, 'No submissions yet')}</p>
              ) : selectedTask.submissions.map((submission) => {
                const status = String(submission?.status || 'pending').toLowerCase()
                return (
                  <div key={String(submission?.id || '')} className="space-y-2">
                    <article className="ml-auto max-w-[92%] rounded-xl border border-brand-200 bg-brand-50 px-3 py-2 text-sm shadow-sm dark:border-brand-700 dark:bg-brand-900/30 dark:text-slate-100">
                      <p className="text-xs text-gray-500 dark:text-slate-400">{submission?.submitted_at || '-'}</p>
                      {submission?.team_message ? <p>{submission.team_message}</p> : null}
                      {submission?.proof_text ? <p>{submission.proof_text}</p> : null}
                      {submission?.proof_path ? (
                        <p>
                          <a className="font-medium text-brand-600 hover:text-brand-700 dark:text-brand-300" href={submission.proof_path} target="_blank" rel="noreferrer">
                            {submission.proof_original_name || t('crazy88.team.proof_file_default', {}, 'Proof file')}
                          </a>
                        </p>
                      ) : null}
                    </article>

                    {(submission?.reviewed_at || submission?.judge_message || status !== 'pending') ? (
                      <article className="max-w-[92%] rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100">
                        <p className="text-xs text-gray-500 dark:text-slate-400">{submission?.reviewed_at || '-'}</p>
                        <p><strong>{t(`crazy88.team.status_${status}`, {}, status)}</strong></p>
                        {submission?.judge_message ? <p>{submission.judge_message}</p> : null}
                      </article>
                    ) : null}
                  </div>
                )
              })}
            </div>

            {!selectedTaskCanSubmit ? (
              <p className="rounded-lg bg-gray-50 px-3 py-2 text-sm text-gray-600 dark:bg-slate-800 dark:text-slate-300">
                {selectedTaskStatus === 'accepted'
                  ? t('crazy88.team.already_approved', {}, 'This task is approved.')
                  : t('crazy88.team.pending_exists', {}, 'A submission is pending review.')}
              </p>
            ) : (
              <form className="space-y-4 rounded-2xl border border-gray-200 bg-white p-4 dark:border-slate-700 dark:bg-slate-900" onSubmit={handleSubmit}>
                <label className="block text-sm font-medium text-navy-900 dark:text-slate-100">
                  <span>{t('crazy88.team.message', {}, 'Message (optional)')}</span>
                  <textarea
                    className="input mt-2 w-full"
                    value={teamMessage}
                    onChange={(event) => setTeamMessage(event.target.value)}
                    rows={3}
                    placeholder={t('crazy88.team.message_placeholder', {}, 'Add notes for the judges…')}
                  />
                </label>

                <label className="block text-sm font-medium text-navy-900 dark:text-slate-100">
                  <span>{t('crazy88.team.proof_upload', {}, 'Upload proof file (optional)')}</span>
                  <input
                    className="input mt-2 w-full file:mr-3 file:rounded-md file:border-0 file:bg-brand-500 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-brand-600"
                    type="file"
                    onChange={(event) => {
                      const nextFile = event.target.files?.[0] || null
                      setProofFile(nextFile)
                    }}
                    accept="image/*,video/*,.pdf,.txt,.doc,.docx,.odt,.rtf,.csv,.xls,.xlsx,.ppt,.pptx"
                  />
                  {proofFile ? (
                    <p className="mt-1 text-xs text-gray-500 dark:text-slate-400">
                      {t('crazy88.team.selected_file', { name: proofFile.name }, 'Selected: {{name}}')}
                    </p>
                  ) : null}
                </label>

                <button className="btn btn-primary" type="submit" disabled={submitting}>
                  {submitting ? t('crazy88.team.submitting', {}, 'Submitting…') : t('crazy88.team.submit_task', {}, 'Submit')}
                </button>
              </form>
            )}
          </div>
        )}
      </section>
    )
  }

  return (
    <section className="grid gap-6 xl:grid-cols-[1.25fr_0.75fr]">
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <h2 className="mb-4 text-2xl font-semibold text-navy-900 dark:text-slate-100">{t('crazy88.team.tasks_heading', {}, 'Tasks')}</h2>
        {tasks.length === 0 ? <p className="text-sm text-gray-500 dark:text-slate-400">{t('crazy88.team.no_tasks', {}, 'No tasks available.')}</p> : null}
        {tasks.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border border-gray-200 dark:border-slate-700">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-semibold uppercase tracking-wide text-gray-500 dark:bg-slate-800 dark:text-slate-300">
                <th className="w-12 px-4 py-3 text-center">{t('crazy88.team.table_state', {}, 'State')}</th>
                <th className="px-4 py-3">{t('crazy88.team.table_task', {}, 'Task')}</th>
                <th className="px-4 py-3 text-right">{t('crazy88.team.table_view', {}, 'View')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-slate-700">
              {tasks.map((task) => {
                const status = statusByTaskId.get(task.id) || null
                return (
                  <tr key={task.id} className="bg-white dark:bg-slate-900">
                    <td className="w-12 px-4 py-3 text-center">{statusNode(status)}</td>
                    <td className="px-4 py-3 font-medium text-navy-900 dark:text-slate-100">{task.title}</td>
                    <td className="px-4 py-3 text-right">
                      <Link className="btn btn-primary btn-small" to={`${detailBasePath}/${encodeURIComponent(task.id)}`}>
                        {t('crazy88.team.view_task', {}, 'View')}
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          </div>
        ) : null}
      </div>

      {Boolean(state?.show_highscore ?? true) ? (
        <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <h2 className="mb-4 text-2xl font-semibold text-navy-900 dark:text-slate-100">{t('teamDashboard.highscore', {}, 'Highscore')}</h2>
          {highscore.length === 0 ? <p className="text-sm text-gray-500 dark:text-slate-400">{t('teamDashboard.noTeams', {}, 'No teams')}</p> : null}
          {highscore.length > 0 ? (
            <ol className="team-leaderboard-list">
              {highscore.map((team) => (
                <li key={team.teamId} className={`team-leaderboard-item ${team.teamId === String(currentTeamId || '') ? 'is-current-team' : ''}`}>
                  <span className="team-leaderboard-rank">#{team.rank}</span>
                  <span className="team-leaderboard-logo" aria-hidden="true">{team.logoPath ? <img src={toAssetUrl(team.logoPath)} alt="" /> : null}</span>
                  <span className="team-leaderboard-name">{team.name}</span>
                  <span className="team-leaderboard-value">{team.score}</span>
                </li>
              ))}
            </ol>
          ) : null}
        </div>
      ) : null}
    </section>
  )
}
