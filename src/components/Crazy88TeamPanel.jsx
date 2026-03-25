import { useMemo, useState } from 'react'
import { toAssetUrl } from '../lib/assetUrl'

export default function Crazy88TeamPanel({
  state,
  currentTeamId,
  t,
  onSubmitTask,
  submitting = false,
}) {
  const [selectedTaskId, setSelectedTaskId] = useState('')
  const [message, setMessage] = useState('')

  const tasks = useMemo(() => {
    const items = Array.isArray(state?.tasks) ? state.tasks : []
    return items
      .filter((task) => Boolean(task.is_active))
      .map((task) => ({
        id: String(task.id || ''),
        title: String(task.title || ''),
        description: String(task.description || ''),
        points: Number(task.points || 0),
        category: String(task.category || ''),
      }))
  }, [state?.tasks])

  const submittedTaskIds = useMemo(() => {
    const actions = Array.isArray(state?.last_actions) ? state.last_actions : []
    const ids = new Set()
    for (const a of actions) {
      if (String(a?.action || '') === 'crazy88.task.submit' && String(a?.team_id || '') === String(currentTeamId || '')) {
        ids.add(String(a?.object_id || ''))
      }
    }
    return ids
  }, [state?.last_actions, currentTeamId])

  const judgedTaskIds = useMemo(() => {
    const actions = Array.isArray(state?.last_actions) ? state.last_actions : []
    const accepted = new Set()
    const rejected = new Set()
    for (const a of actions) {
      if (String(a?.action || '') === 'crazy88.review.judge' && String(a?.team_id || '') === String(currentTeamId || '')) {
        const meta = a?.metadata || {}
        if (Boolean(meta.accepted)) {
          accepted.add(String(a?.object_id || ''))
        } else {
          rejected.add(String(a?.object_id || ''))
        }
      }
    }
    return { accepted, rejected }
  }, [state?.last_actions, currentTeamId])

  const score = Number(state?.score || state?.score_delta || 0)

  const highscore = useMemo(() => {
    const teams = Array.isArray(state?.highscore) ? state.highscore : []
    return teams
      .map((row) => ({ teamId: String(row?.team_id || ''), name: String(row?.name || '-'), logoPath: String(row?.logo_path || ''), score: Number(row?.score || 0) }))
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
      .map((row, i) => ({ ...row, rank: i + 1 }))
  }, [state?.highscore])

  const categories = useMemo(() => {
    const cats = new Set(tasks.map((t) => t.category).filter(Boolean))
    return [...cats].sort()
  }, [tasks])

  function handleSubmit(event) {
    event.preventDefault()
    if (!selectedTaskId) return
    onSubmitTask(selectedTaskId, message)
    setMessage('')
  }

  return (
    <section className="team-dashboard-geo-layout">
      <div className="team-panel">
        <h2>{t('crazy88.team.title', {}, 'Crazy 88')}</h2>
        <p><strong>{t('crazy88.team.score', {}, 'Score')}:</strong> {score}</p>
        <p className="muted">{t('crazy88.team.description', {}, 'Complete tasks and submit them for review.')}</p>
      </div>

      <div className="team-panel">
        <h2>{t('crazy88.team.submit_heading', {}, 'Submit a task')}</h2>
        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>
            {t('crazy88.team.select_task', {}, 'Task')}
            <select className="input" value={selectedTaskId} onChange={(e) => setSelectedTaskId(e.target.value)} required style={{ marginTop: '0.25rem', display: 'block', width: '100%' }}>
              <option value="">{t('crazy88.team.choose_task', {}, '-- Select a task --')}</option>
              {tasks.map((task) => (
                <option key={task.id} value={task.id}>
                  {task.title}{task.category ? ` (${task.category})` : ''} — {task.points} pts
                </option>
              ))}
            </select>
          </label>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>
            {t('crazy88.team.message', {}, 'Message (optional)')}
            <textarea className="input" value={message} onChange={(e) => setMessage(e.target.value)} rows={3} style={{ marginTop: '0.25rem', display: 'block', width: '100%' }} placeholder={t('crazy88.team.message_placeholder', {}, 'Add proof or notes…')} />
          </label>
          <button className="btn btn-primary" type="submit" disabled={submitting || !selectedTaskId}>
            {submitting ? t('crazy88.team.submitting', {}, 'Submitting…') : t('crazy88.team.submit_task', {}, 'Submit')}
          </button>
        </form>
      </div>

      <div className="team-panel">
        <h2>{t('crazy88.team.tasks_heading', {}, 'Tasks')}</h2>
        {tasks.length === 0 ? <p className="muted">{t('crazy88.team.no_tasks', {}, 'No tasks available.')}</p> : null}
        {categories.length > 0 ? categories.map((cat) => (
          <div key={cat}>
            <h3 style={{ marginTop: '1rem' }}>{cat}</h3>
            <table className="admin-table">
              <thead><tr><th>{t('crazy88.admin.table_title', {}, 'Task')}</th><th>{t('crazy88.admin.table_points', {}, 'Points')}</th><th>{t('crazy88.admin.table_status', {}, 'Status')}</th></tr></thead>
              <tbody>
                {tasks.filter((task) => task.category === cat).map((task) => {
                  const status = judgedTaskIds.accepted.has(task.id) ? '✅' : judgedTaskIds.rejected.has(task.id) ? '❌' : submittedTaskIds.has(task.id) ? '⏳' : '—'
                  return <tr key={task.id}><td>{task.title}</td><td>{task.points}</td><td>{status}</td></tr>
                })}
              </tbody>
            </table>
          </div>
        )) : (
          <table className="admin-table">
            <thead><tr><th>{t('crazy88.admin.table_title', {}, 'Task')}</th><th>{t('crazy88.admin.table_points', {}, 'Points')}</th><th>{t('crazy88.admin.table_status', {}, 'Status')}</th></tr></thead>
            <tbody>
              {tasks.map((task) => {
                const status = judgedTaskIds.accepted.has(task.id) ? '✅' : judgedTaskIds.rejected.has(task.id) ? '❌' : submittedTaskIds.has(task.id) ? '⏳' : '—'
                return <tr key={task.id}><td>{task.title}</td><td>{task.points}</td><td>{status}</td></tr>
              })}
            </tbody>
          </table>
        )}
      </div>

      {highscore.length > 0 ? (
        <div className="team-panel">
          <h2>{t('teamDashboard.highscore', {}, 'Highscore')}</h2>
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
        </div>
      ) : null}
    </section>
  )
}
