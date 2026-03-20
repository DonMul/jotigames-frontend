import { useEffect, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'

import { gameApi, moduleApi } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { useI18n } from '../../lib/i18n'

export default function TeamPlayPage() {
  const { gameId } = useParams()
  const { auth } = useAuth()
  const { t } = useI18n()

  const [dashboard, setDashboard] = useState(null)
  const [bootstrapState, setBootstrapState] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [actionResult, setActionResult] = useState(null)
  const [pointsValue, setPointsValue] = useState('1')
  const [taskMessage, setTaskMessage] = useState('')
  const [taskProofText, setTaskProofText] = useState('')
  const [targetTeamId, setTargetTeamId] = useState('')
  const [codeValue, setCodeValue] = useState('')
  const [pointsDelta, setPointsDelta] = useState('0')

  const isTeam = auth.principalType === 'team'

  async function reloadState(activeDashboard = dashboard) {
    if (!activeDashboard?.game_type || !activeDashboard?.game_id || !activeDashboard?.team_id) {
      return
    }

    const state = await moduleApi.getBootstrap(
      auth.token,
      activeDashboard.game_type,
      activeDashboard.game_id,
      activeDashboard.team_id,
    )
    setBootstrapState(state)
  }

  useEffect(() => {
    if (!isTeam) {
      return
    }

    let cancelled = false

    async function load() {
      setLoading(true)
      setError('')
      try {
        const payload = await gameApi.getTeamDashboard(auth.token)
        if (!payload?.game_id || !payload?.team_id || !payload?.game_type) {
          throw new Error(t('teamDashboard.noGame', {}, 'No active team game found'))
        }

        if (gameId && String(payload.game_id) !== String(gameId)) {
          throw new Error(t('teamDashboard.invalidGame', {}, 'This page is only available for your active game'))
        }

        const state = await moduleApi.getBootstrap(auth.token, payload.game_type, payload.game_id, payload.team_id)
        if (cancelled) {
          return
        }

        setDashboard(payload)
        setBootstrapState(state)
      } catch (err) {
        if (!cancelled) {
          setError(err.message || t('teamModule.loadFailed', {}, 'Could not load team gameplay'))
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [auth.token, gameId, isTeam, t])

  if (!isTeam) {
    return <Navigate to="/admin/games" replace />
  }

  async function submitPayload(payload) {
    if (!dashboard?.game_type || !dashboard?.game_id || !dashboard?.team_id) {
      return
    }

    setError('')
    try {
      const result = await moduleApi.submitAction(auth.token, dashboard.game_type, dashboard.game_id, dashboard.team_id, payload)
      setActionResult(result)
      await reloadState(dashboard)
    } catch (err) {
      setError(err.message || t('teamModule.actionFailed', {}, 'Action failed'))
    }
  }

  return (
    <main className="page-shell">
      <section className="overview-header">
        <div>
          <h1>{t('teamDashboard.openGameplay', {}, 'Gameplay')}</h1>
          <p className="overview-subtitle">{dashboard?.game_name || '-'}</p>
        </div>
        <div className="overview-actions">
          <Link className="btn btn-ghost" to="/team/dashboard">
            {t('teamModule.backToGame', {}, 'Back')}
          </Link>
        </div>
      </section>

      {loading ? <p>{t('gamesPage.loading', {}, 'Loading…')}</p> : null}
      {error ? <div className="flash flash-error">{error}</div> : null}

      {!loading && dashboard ? (
        <div className="geo-layout" style={{ marginTop: '1rem' }}>
          <section className="geo-panel">
            {dashboard?.game_type === 'courier_rush' ? (
              <>
                <h2>{t('courier_rush.admin.pickups', {}, 'Pickups')}</h2>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>{t('courier_rush.admin.table_title', {}, 'Title')}</th>
                      <th>{t('courier_rush.admin.table_points', {}, 'Points')}</th>
                      <th>{t('gamesPage.actions', {}, 'Actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(Array.isArray(bootstrapState?.pickups) ? bootstrapState.pickups : []).slice(0, 20).map((pickup) => (
                      <tr key={pickup.id}>
                        <td>{pickup.title}</td>
                        <td>{pickup.points}</td>
                        <td>
                          <button className="btn btn-primary btn-small" type="button" onClick={() => submitPayload({ pickup_id: pickup.id })}>
                            {t('courier_rush.team.confirm_pickup', {}, 'Confirm pickup')}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <h2 style={{ marginTop: '1rem' }}>{t('courier_rush.admin.dropoffs', {}, 'Dropoffs')}</h2>
                <div className="form-row" style={{ maxWidth: '14rem' }}>
                  <label htmlFor="courier-dropoff-points">{t('courier_rush.admin.table_points', {}, 'Points')}</label>
                  <input id="courier-dropoff-points" type="number" value={pointsValue} onChange={(event) => setPointsValue(event.target.value)} />
                </div>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>{t('courier_rush.admin.table_title', {}, 'Title')}</th>
                      <th>{t('gamesPage.actions', {}, 'Actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(Array.isArray(bootstrapState?.dropoffs) ? bootstrapState.dropoffs : []).slice(0, 20).map((dropoff) => (
                      <tr key={dropoff.id}>
                        <td>{dropoff.title}</td>
                        <td>
                          <button
                            className="btn btn-primary btn-small"
                            type="button"
                            onClick={() => submitPayload({ dropoff_id: dropoff.id, points: Number(pointsValue || 1) })}
                          >
                            {t('courier_rush.team.confirm_dropoff', {}, 'Confirm dropoff')}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : null}

            {dashboard?.game_type === 'pandemic_response' ? (
              <>
                <h2>{t('pandemic_response.admin.current_pickups', {}, 'Pickup points')}</h2>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>{t('pandemic_response.admin.table_title', {}, 'Title')}</th>
                      <th>{t('gamesPage.actions', {}, 'Actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(Array.isArray(bootstrapState?.pickups) ? bootstrapState.pickups : []).slice(0, 20).map((pickup) => (
                      <tr key={pickup.id}>
                        <td>{pickup.title}</td>
                        <td>
                          <button className="btn btn-primary btn-small" type="button" onClick={() => submitPayload({ pickup_id: pickup.id })}>
                            {t('pandemic_response.team.collect_pickup', {}, 'Collect')}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <h2 style={{ marginTop: '1rem' }}>{t('pandemic_response.admin.current_hotspots', {}, 'Hotspots')}</h2>
                <div className="form-row" style={{ maxWidth: '14rem' }}>
                  <label htmlFor="pandemic-hotspot-points">{t('pandemic_response.admin.table_points', {}, 'Points')}</label>
                  <input id="pandemic-hotspot-points" type="number" value={pointsValue} onChange={(event) => setPointsValue(event.target.value)} />
                </div>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>{t('pandemic_response.admin.table_title', {}, 'Title')}</th>
                      <th>{t('gamesPage.actions', {}, 'Actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(Array.isArray(bootstrapState?.hotspots) ? bootstrapState.hotspots : []).slice(0, 20).map((hotspot) => (
                      <tr key={hotspot.id}>
                        <td>{hotspot.title}</td>
                        <td>
                          <button
                            className="btn btn-primary btn-small"
                            type="button"
                            onClick={() => submitPayload({ hotspot_id: hotspot.id, points: Number(pointsValue || 1) })}
                          >
                            {t('pandemic_response.team.resolve_hotspot', {}, 'Resolve')}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : null}

            {dashboard?.game_type === 'crazy_88' ? (
              <>
                <h2>{t('crazy88.admin.task_list', {}, 'Tasks')}</h2>
                <div className="form-row">
                  <label htmlFor="crazy88-team-message">{t('crazy88.team.message_label', {}, 'Message')}</label>
                  <textarea id="crazy88-team-message" rows={2} value={taskMessage} onChange={(event) => setTaskMessage(event.target.value)} />
                </div>
                <div className="form-row">
                  <label htmlFor="crazy88-proof-text">{t('crazy88.team.text_proof_label', {}, 'Proof text')}</label>
                  <textarea id="crazy88-proof-text" rows={2} value={taskProofText} onChange={(event) => setTaskProofText(event.target.value)} />
                </div>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>{t('crazy88.admin.table_title', {}, 'Title')}</th>
                      <th>{t('crazy88.admin.table_points', {}, 'Points')}</th>
                      <th>{t('gamesPage.actions', {}, 'Actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(Array.isArray(bootstrapState?.tasks) ? bootstrapState.tasks : []).slice(0, 30).map((task) => (
                      <tr key={task.id}>
                        <td>{task.title}</td>
                        <td>{task.points}</td>
                        <td>
                          <button
                            className="btn btn-primary btn-small"
                            type="button"
                            onClick={() => submitPayload({
                              task_id: task.id,
                              team_message: taskMessage.trim() || undefined,
                              proof_text: taskProofText.trim() || undefined,
                            })}
                          >
                            {t('crazy88.team.submit_task', {}, 'Submit task')}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </>
            ) : null}

            {dashboard?.game_type === 'code_conspiracy' ? (
              <>
                <h2>{t('code_conspiracy.team.quick_submit', {}, 'Quick submit')}</h2>
                <div className="form-row">
                  <label htmlFor="code-target-team">{t('code_conspiracy.team.target_team', {}, 'Target team')}</label>
                  <select id="code-target-team" value={targetTeamId} onChange={(event) => setTargetTeamId(event.target.value)}>
                    <option value="">{t('teamDashboard.chooseTarget', {}, 'Choose target')}</option>
                    {(Array.isArray(bootstrapState?.target_teams) ? bootstrapState.target_teams : []).map((team) => (
                      <option key={team.id} value={team.id}>{team.name || team.id}</option>
                    ))}
                  </select>
                </div>
                <div className="form-row form-row-inline">
                  <div>
                    <label htmlFor="code-input">{t('code_conspiracy.team.code', {}, 'Code')}</label>
                    <input id="code-input" value={codeValue} onChange={(event) => setCodeValue(event.target.value)} />
                  </div>
                  <div>
                    <label htmlFor="points-delta-input">{t('code_conspiracy.team.points_delta', {}, 'Points delta')}</label>
                    <input id="points-delta-input" type="number" value={pointsDelta} onChange={(event) => setPointsDelta(event.target.value)} />
                  </div>
                </div>
                <button
                  className="btn btn-primary"
                  type="button"
                  onClick={() => submitPayload({
                    target_team_id: targetTeamId.trim(),
                    code: codeValue.trim(),
                    points_delta: Number(pointsDelta || 0),
                  })}
                >
                  {t('code_conspiracy.team.submit_code', {}, 'Submit code')}
                </button>
              </>
            ) : null}

            {!['courier_rush', 'pandemic_response', 'crazy_88', 'code_conspiracy'].includes(String(dashboard?.game_type || '')) ? (
              <p className="muted">{t('teamDashboard.moduleStateHint', {}, 'Use the gameplay page for your current team actions.')}</p>
            ) : null}
          </section>

          <section className="geo-panel">
            <h2>{t('moduleOverview.score', {}, 'Score')}</h2>
            <p>{Number(bootstrapState?.score || bootstrapState?.geo_score || 0)}</p>
            {actionResult ? (
              <>
                <h3>{t('teamModule.actionResult', {}, 'Last action')}</h3>
                <pre style={{ whiteSpace: 'pre-wrap', overflowX: 'auto' }}>{JSON.stringify(actionResult, null, 2)}</pre>
              </>
            ) : null}
          </section>
        </div>
      ) : null}
    </main>
  )
}
