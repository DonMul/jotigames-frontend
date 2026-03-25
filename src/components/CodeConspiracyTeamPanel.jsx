import { useMemo, useState } from 'react'
import { toAssetUrl } from '../lib/assetUrl'

export default function CodeConspiracyTeamPanel({
  state,
  currentTeamId,
  t,
  onSubmitCode,
  submitting = false,
}) {
  const [targetTeamId, setTargetTeamId] = useState('')
  const [codeValue, setCodeValue] = useState('')

  const targetTeams = useMemo(() => {
    const items = Array.isArray(state?.teams_list) ? state.teams_list : []
    return items.map((team) => ({
      teamId: String(team.team_id || ''),
      name: String(team.name || '-'),
      logoPath: String(team.logo_path || ''),
    }))
  }, [state?.teams_list])

  const config = useMemo(() => {
    const cfg = state?.config && typeof state.config === 'object' ? state.config : {}
    return {
      rounds: Number(cfg.rounds || 3),
      code_length: Number(cfg.code_length || 4),
      max_attempts: Number(cfg.max_attempts || 10),
    }
  }, [state?.config])

  const submissionHistory = useMemo(() => {
    const actions = Array.isArray(state?.last_actions) ? state.last_actions : []
    return actions
      .filter((a) => String(a?.action || '') === 'code_conspiracy.code.submit' && String(a?.team_id || '') === String(currentTeamId || ''))
      .map((a) => ({
        objectId: String(a?.object_id || ''),
        points: Number(a?.points_awarded || 0),
        at: String(a?.at || ''),
      }))
      .reverse()
  }, [state?.last_actions, currentTeamId])

  const score = Number(state?.score || state?.score_delta || 0)

  const highscore = useMemo(() => {
    const teams = Array.isArray(state?.highscore) ? state.highscore : []
    return teams
      .map((row) => ({ teamId: String(row?.team_id || ''), name: String(row?.name || '-'), logoPath: String(row?.logo_path || ''), score: Number(row?.score || 0) }))
      .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
      .map((row, i) => ({ ...row, rank: i + 1 }))
  }, [state?.highscore])

  function handleSubmit(event) {
    event.preventDefault()
    if (!targetTeamId || !codeValue.trim()) return
    onSubmitCode(targetTeamId, codeValue.trim())
    setCodeValue('')
  }

  return (
    <section className="team-dashboard-geo-layout">
      <div className="team-panel">
        <h2>{t('code_conspiracy.team.title', {}, 'Code Conspiracy')}</h2>
        <p><strong>{t('code_conspiracy.team.score', {}, 'Score')}:</strong> {score}</p>
        <p className="muted">
          {t('code_conspiracy.team.description', {}, 'Crack the codes of other teams by submitting guesses.')}
        </p>
        <div className="team-flags" style={{ marginTop: '0.5rem' }}>
          <span className="tag tag-cool">{t('code_conspiracy.team.rounds', {}, 'Rounds')}: {config.rounds}</span>
          <span className="tag tag-cool">{t('code_conspiracy.team.code_length', {}, 'Code length')}: {config.code_length}</span>
          <span className="tag tag-cool">{t('code_conspiracy.team.max_attempts', {}, 'Max attempts')}: {config.max_attempts}</span>
        </div>
      </div>

      <div className="team-panel">
        <h2>{t('code_conspiracy.team.submit_heading', {}, 'Submit a code')}</h2>
        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>
            {t('code_conspiracy.team.target_team', {}, 'Target team')}
            <select className="input" value={targetTeamId} onChange={(e) => setTargetTeamId(e.target.value)} required style={{ marginTop: '0.25rem', display: 'block', width: '100%' }}>
              <option value="">{t('code_conspiracy.team.choose_team', {}, '-- Select a team --')}</option>
              {targetTeams.map((team) => (
                <option key={team.teamId} value={team.teamId}>{team.name}</option>
              ))}
            </select>
          </label>
          <label style={{ display: 'block', marginBottom: '0.5rem' }}>
            {t('code_conspiracy.team.code_input', {}, 'Code')}
            <input
              type="text"
              className="input"
              value={codeValue}
              onChange={(e) => setCodeValue(e.target.value)}
              placeholder={t('code_conspiracy.team.code_placeholder', {}, 'Enter code…')}
              maxLength={20}
              required
              autoFocus
              style={{ marginTop: '0.25rem', display: 'block', width: '100%' }}
            />
          </label>
          <button className="btn btn-primary" type="submit" disabled={submitting || !targetTeamId || !codeValue.trim()}>
            {submitting ? t('code_conspiracy.team.submitting', {}, 'Submitting…') : t('code_conspiracy.team.submit_code', {}, 'Submit code')}
          </button>
        </form>
      </div>

      {submissionHistory.length > 0 ? (
        <div className="team-panel">
          <h2>{t('code_conspiracy.team.history_heading', {}, 'Submission history')}</h2>
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('code_conspiracy.team.history_target', {}, 'Target')}</th>
                <th>{t('code_conspiracy.team.history_points', {}, 'Points')}</th>
                <th>{t('code_conspiracy.team.history_time', {}, 'Time')}</th>
              </tr>
            </thead>
            <tbody>
              {submissionHistory.map((entry, idx) => (
                <tr key={`${entry.objectId}-${idx}`}>
                  <td>{entry.objectId}</td>
                  <td>{entry.points}</td>
                  <td>{entry.at ? new Date(entry.at).toLocaleTimeString() : '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

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
