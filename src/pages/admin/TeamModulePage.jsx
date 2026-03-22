import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'

import { gameApi, moduleApi } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { useI18n } from '../../lib/i18n'

const TEAM_ACTION_SCHEMAS = {
  geohunter: [
    { name: 'poi_id', label: 'POI ID', type: 'text' },
    { name: 'correct', label: 'Correct answer', type: 'checkbox' },
  ],
  blindhike: [{ name: 'marker_id', label: 'Marker ID', type: 'text' }],
  resource_run: [
    { name: 'node_id', label: 'Node ID', type: 'text' },
    { name: 'points', label: 'Points', type: 'number' },
  ],
  territory_control: [
    { name: 'zone_id', label: 'Zone ID', type: 'text' },
    { name: 'points', label: 'Points', type: 'number' },
  ],
  market_crash: [
    { name: 'trade_id', label: 'Trade ID', type: 'text' },
    { name: 'points', label: 'Points delta', type: 'number' },
  ],
  crazy_88: [
    { name: 'task_id', label: 'Task ID', type: 'text' },
    { name: 'team_message', label: 'Team message', type: 'text' },
    { name: 'proof_text', label: 'Proof text', type: 'text' },
  ],
  courier_rush: [
    { name: 'pickup_id', label: 'Pickup ID', type: 'text' },
    { name: 'dropoff_id', label: 'Dropoff ID', type: 'text' },
    { name: 'points', label: 'Dropoff points', type: 'number' },
  ],
  echo_hunt: [
    { name: 'beacon_id', label: 'Beacon ID', type: 'text' },
    { name: 'points', label: 'Points', type: 'number' },
  ],
  checkpoint_heist: [
    { name: 'checkpoint_id', label: 'Checkpoint ID', type: 'text' },
    { name: 'points', label: 'Points', type: 'number' },
  ],
  pandemic_response: [
    { name: 'pickup_id', label: 'Pickup ID', type: 'text' },
    { name: 'hotspot_id', label: 'Hotspot ID', type: 'text' },
    { name: 'points', label: 'Hotspot points', type: 'number' },
  ],
  birds_of_prey: [
    { name: 'egg_id', label: 'Egg ID', type: 'text' },
    { name: 'points', label: 'Destroy points', type: 'number' },
  ],
  code_conspiracy: [
    { name: 'target_team_id', label: 'Target Team ID', type: 'text' },
    { name: 'code', label: 'Code', type: 'text' },
    { name: 'points_delta', label: 'Points delta', type: 'number' },
  ],
  exploding_kittens: [
    { name: 'action', label: 'Action', type: 'select', options: ['scan', 'resolve-state', 'resolve-action', 'play-card'] },
    { name: 'card_id', label: 'Card ID', type: 'text' },
    { name: 'action_id', label: 'Action ID', type: 'text' },
    { name: 'target_team_id', label: 'Target Team ID', type: 'text' },
  ],
}

function getInitialActionValues(gameType) {
  switch (gameType) {
    case 'geohunter':
      return { poi_id: '', correct: false }
    case 'blindhike':
      return { marker_id: '' }
    case 'resource_run':
      return { node_id: '', points: 1 }
    case 'territory_control':
      return { zone_id: '', points: 1 }
    case 'market_crash':
      return { trade_id: '', points: 0 }
    case 'crazy_88':
      return { task_id: '', team_message: '', proof_text: '' }
    case 'courier_rush':
      return { pickup_id: '', dropoff_id: '', points: 1 }
    case 'echo_hunt':
      return { beacon_id: '', points: 1 }
    case 'checkpoint_heist':
      return { checkpoint_id: '', points: 1 }
    case 'pandemic_response':
      return { pickup_id: '', hotspot_id: '', points: 1 }
    case 'birds_of_prey':
      return { egg_id: '', points: 1 }
    case 'code_conspiracy':
      return { target_team_id: '', code: '', points_delta: 0 }
    case 'exploding_kittens':
      return { action: 'scan', card_id: '', action_id: '', target_team_id: '' }
    default:
      return {}
  }
}

function buildPayload(gameType, values) {
  const value = (name) => String(values?.[name] ?? '').trim()
  const num = (name, fallback = 0) => {
    const parsed = Number(values?.[name])
    return Number.isFinite(parsed) ? parsed : fallback
  }

  switch (gameType) {
    case 'geohunter':
      return { poi_id: value('poi_id'), correct: Boolean(values?.correct) }
    case 'blindhike':
      return { marker_id: value('marker_id') }
    case 'resource_run':
      return { node_id: value('node_id'), points: num('points', 1) }
    case 'territory_control':
      return { zone_id: value('zone_id'), points: num('points', 1) }
    case 'market_crash':
      return { trade_id: value('trade_id'), points: num('points', 0) }
    case 'crazy_88':
      return {
        task_id: value('task_id'),
        team_message: value('team_message') || undefined,
        proof_text: value('proof_text') || undefined,
      }
    case 'courier_rush': {
      if (value('dropoff_id')) {
        return { dropoff_id: value('dropoff_id'), points: num('points', 1) }
      }
      return { pickup_id: value('pickup_id') }
    }
    case 'echo_hunt':
      return { beacon_id: value('beacon_id'), points: num('points', 1) }
    case 'checkpoint_heist':
      return { checkpoint_id: value('checkpoint_id'), points: num('points', 1) }
    case 'pandemic_response': {
      if (value('hotspot_id')) {
        return { hotspot_id: value('hotspot_id'), points: num('points', 1) }
      }
      return { pickup_id: value('pickup_id') }
    }
    case 'birds_of_prey':
      return { egg_id: value('egg_id'), points: num('points', 1) }
    case 'code_conspiracy':
      return { target_team_id: value('target_team_id'), code: value('code'), points_delta: num('points_delta', 0) }
    case 'exploding_kittens':
      return {
        action: value('action') || 'scan',
        card_id: value('card_id') || undefined,
        action_id: value('action_id') || undefined,
        target_team_id: value('target_team_id') || undefined,
      }
    default:
      return {}
  }
}

export default function TeamModulePage() {
  const { gameId, teamId } = useParams()
  const { auth } = useAuth()
  const { t } = useI18n()

  const [game, setGame] = useState(null)
  const [bootstrapState, setBootstrapState] = useState(null)
  const [actionValues, setActionValues] = useState({})
  const [actionResult, setActionResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const resolvedTeamId = auth.principalType === 'team' ? auth.principalId : teamId
  const isTeamPrincipal = auth.principalType === 'team'
  const bodyHint = useMemo(() => {
    if (game?.game_type === 'exploding_kittens') {
      return t('teamModule.hintExploding')
    }

    return t('teamModule.hintGeneric')
  }, [game?.game_type, t])

  async function reloadBootstrap(activeGame = game) {
    if (!activeGame?.game_type) {
      return
    }

    const state = await moduleApi.getBootstrap(auth.token, activeGame.game_type, gameId, resolvedTeamId)
    setBootstrapState(state)
  }

  function formatDate(value) {
    if (!value) {
      return '-'
    }
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) {
      return String(value)
    }
    return parsed.toLocaleString()
  }

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError('')
      try {
        const gameRecord = await gameApi.getGame(auth.token, gameId)
        if (!gameRecord) {
          throw new Error(t('teamModule.gameNotFound'))
        }

        setActionValues(getInitialActionValues(gameRecord.game_type))

        const state = await moduleApi.getBootstrap(auth.token, gameRecord.game_type, gameId, resolvedTeamId)

        if (cancelled) {
          return
        }

        setGame(gameRecord)
        setBootstrapState(state)
      } catch (err) {
        if (!cancelled) {
          setError(err.message || t('teamModule.loadFailed'))
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
  }, [auth.token, gameId, resolvedTeamId, t])

  async function submitAction(event) {
    event.preventDefault()
    setError('')

    try {
      const payload = buildPayload(game.game_type, actionValues)
      const result = await moduleApi.submitAction(auth.token, game.game_type, gameId, resolvedTeamId, payload)
      setActionResult(result)
      await reloadBootstrap(game)
    } catch (err) {
      setError(err.message || t('teamModule.actionFailed'))
    }
  }

  async function submitPayload(payload) {
    setError('')
    try {
      const result = await moduleApi.submitAction(auth.token, game.game_type, gameId, resolvedTeamId, payload)
      setActionResult(result)
      await reloadBootstrap(game)
    } catch (err) {
      setError(err.message || t('teamModule.actionFailed'))
    }
  }

  if (isTeamPrincipal) {
    return <Navigate to={`/team/games/${gameId}/play`} replace />
  }

  return (
    <main className="page-shell">
      <div className="geo-header">
        <div>
          <p className="overview-kicker">{t('teamModule.team')} {resolvedTeamId}</p>
          <h1>{game?.name || t('teamModule.fallbackTitle')}</h1>
          <p className="overview-subtitle">{game?.game_type || '-'}</p>
        </div>
      </div>

      <section className="overview-stats game-show-summary-stats">
        <article className="stat-card">
          <span className="stat-label">{t('teamModule.team', {}, 'Team')}</span>
          <span className="stat-value">{resolvedTeamId || '-'}</span>
        </article>
        <article className="stat-card">
          <span className="stat-label">{t('moduleOverview.gameType', {}, 'Game type')}</span>
          <span className="stat-value">{game?.game_type || '-'}</span>
        </article>
        <article className="stat-card">
          <span className="stat-label">{t('gamePage.starts', {}, 'Starts')}</span>
          <span className="stat-value">{formatDate(game?.start_at)}</span>
        </article>
        <article className="stat-card">
          <span className="stat-label">{t('gamePage.ends', {}, 'Ends')}</span>
          <span className="stat-value">{formatDate(game?.end_at)}</span>
        </article>
      </section>

      <section className="game-show-action-board">
        <div className="game-show-action-group">
          <Link className="btn btn-ghost" to={`/admin/games/${gameId}`}>
            {t('teamModule.backToGame')}
          </Link>
          <Link className="btn btn-ghost" to={`/admin/games/${gameId}/live-overview`}>
            {t('gamePage.moduleOverview', {}, 'Admin overview')}
          </Link>
        </div>
      </section>

      {error ? <div className="flash flash-error">{error}</div> : null}
      {loading ? <p>{t('gamesPage.loading', {}, 'Loading…')}</p> : null}

      <div className="geo-layout" style={{ marginTop: '1rem' }}>
        <section className="overview-panel">
          <h2>{t('teamModule.submitAction')}</h2>
          <p>{bodyHint}</p>

          {game?.game_type === 'courier_rush' ? (
            <div style={{ marginBottom: '1rem' }}>
              <h3>{t('courier_rush.admin.pickups', {}, 'Pickups')}</h3>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{t('courier_rush.admin.table_title', {}, 'Title')}</th>
                    <th>{t('courier_rush.admin.table_points', {}, 'Points')}</th>
                    <th>{t('gamesPage.actions', {}, 'Actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(Array.isArray(bootstrapState?.pickups) ? bootstrapState.pickups : []).slice(0, 12).map((pickup) => (
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
                  {(Array.isArray(bootstrapState?.pickups) ? bootstrapState.pickups : []).length === 0 ? (
                    <tr>
                      <td colSpan={3} className="muted">{t('courier_rush.admin.empty_pickups', {}, 'No pickups')}</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>

              <h3 style={{ marginTop: '1rem' }}>{t('courier_rush.admin.dropoffs', {}, 'Dropoffs')}</h3>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{t('courier_rush.admin.table_title', {}, 'Title')}</th>
                    <th>{t('gamesPage.actions', {}, 'Actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(Array.isArray(bootstrapState?.dropoffs) ? bootstrapState.dropoffs : []).slice(0, 12).map((dropoff) => (
                    <tr key={dropoff.id}>
                      <td>{dropoff.title}</td>
                      <td>
                        <button
                          className="btn btn-primary btn-small"
                          type="button"
                          onClick={() => submitPayload({ dropoff_id: dropoff.id, points: Number(actionValues.points || 1) })}
                        >
                          {t('courier_rush.team.confirm_dropoff', {}, 'Confirm dropoff')}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {(Array.isArray(bootstrapState?.dropoffs) ? bootstrapState.dropoffs : []).length === 0 ? (
                    <tr>
                      <td colSpan={2} className="muted">{t('courier_rush.admin.empty_dropoffs', {}, 'No dropoffs')}</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          ) : null}

          {game?.game_type === 'pandemic_response' ? (
            <div style={{ marginBottom: '1rem' }}>
              <h3>{t('pandemic_response.admin.current_pickups', {}, 'Pickup points')}</h3>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{t('pandemic_response.admin.table_title', {}, 'Title')}</th>
                    <th>{t('pandemic_response.admin.table_resource', {}, 'Resource')}</th>
                    <th>{t('gamesPage.actions', {}, 'Actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(Array.isArray(bootstrapState?.pickups) ? bootstrapState.pickups : []).slice(0, 12).map((pickup) => (
                    <tr key={pickup.id}>
                      <td>{pickup.title}</td>
                      <td>{pickup.resource_type}</td>
                      <td>
                        <button className="btn btn-primary btn-small" type="button" onClick={() => submitPayload({ pickup_id: pickup.id })}>
                          {t('pandemic_response.team.collect_pickup', {}, 'Collect')}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {(Array.isArray(bootstrapState?.pickups) ? bootstrapState.pickups : []).length === 0 ? (
                    <tr>
                      <td colSpan={3} className="muted">{t('pandemic_response.admin.empty_pickups', {}, 'No pickups')}</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>

              <h3 style={{ marginTop: '1rem' }}>{t('pandemic_response.admin.current_hotspots', {}, 'Hotspots')}</h3>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{t('pandemic_response.admin.table_title', {}, 'Title')}</th>
                    <th>{t('pandemic_response.admin.table_severity', {}, 'Severity')}</th>
                    <th>{t('gamesPage.actions', {}, 'Actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(Array.isArray(bootstrapState?.hotspots) ? bootstrapState.hotspots : []).slice(0, 12).map((hotspot) => (
                    <tr key={hotspot.id}>
                      <td>{hotspot.title}</td>
                      <td>{hotspot.severity_level}</td>
                      <td>
                        <button
                          className="btn btn-primary btn-small"
                          type="button"
                          onClick={() => submitPayload({ hotspot_id: hotspot.id, points: Number(actionValues.points || 1) })}
                        >
                          {t('pandemic_response.team.resolve_hotspot', {}, 'Resolve')}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {(Array.isArray(bootstrapState?.hotspots) ? bootstrapState.hotspots : []).length === 0 ? (
                    <tr>
                      <td colSpan={3} className="muted">{t('pandemic_response.admin.empty_hotspots', {}, 'No hotspots')}</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          ) : null}

          {game?.game_type === 'crazy_88' ? (
            <div style={{ marginBottom: '1rem' }}>
              <h3>{t('crazy88.admin.task_list', {}, 'Tasks')}</h3>
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>{t('crazy88.admin.table_title', {}, 'Title')}</th>
                    <th>{t('crazy88.admin.table_points', {}, 'Points')}</th>
                    <th>{t('crazy88.admin.table_actions', {}, 'Actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {(Array.isArray(bootstrapState?.tasks) ? bootstrapState.tasks : []).slice(0, 20).map((task) => (
                    <tr key={task.id}>
                      <td>
                        <strong>{task.title}</strong>
                        <br />
                        <small className="muted">{task.description || '-'}</small>
                      </td>
                      <td>{task.points}</td>
                      <td>
                        <button className="btn btn-primary btn-small" type="button" onClick={() => submitPayload({ task_id: task.id })}>
                          {t('crazy88.team.submit_task', {}, 'Submit task')}
                        </button>
                      </td>
                    </tr>
                  ))}
                  {(Array.isArray(bootstrapState?.tasks) ? bootstrapState.tasks : []).length === 0 ? (
                    <tr>
                      <td colSpan={3} className="muted">{t('crazy88.admin.task_empty', {}, 'No tasks')}</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          ) : null}

          {game?.game_type === 'code_conspiracy' ? (
            <div style={{ marginBottom: '1rem' }}>
              <h3>{t('code_conspiracy.team.quick_submit', {}, 'Quick submit')}</h3>
              <div className="form-row">
                <label htmlFor="code-conspiracy-target">{t('code_conspiracy.team.target_team', {}, 'Target team')}</label>
                <select
                  id="code-conspiracy-target"
                  value={String(actionValues.target_team_id ?? '')}
                  onChange={(event) => setActionValues((prev) => ({ ...prev, target_team_id: event.target.value }))}
                >
                  <option value="">{t('teamDashboard.chooseTarget', {}, 'Choose target')}</option>
                  {(Array.isArray(bootstrapState?.target_teams) ? bootstrapState.target_teams : []).map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name || team.id}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-row form-row-inline">
                <div>
                  <label htmlFor="code-conspiracy-code">{t('code_conspiracy.team.code', {}, 'Code')}</label>
                  <input
                    id="code-conspiracy-code"
                    value={String(actionValues.code ?? '')}
                    onChange={(event) => setActionValues((prev) => ({ ...prev, code: event.target.value }))}
                  />
                </div>
                <div>
                  <label htmlFor="code-conspiracy-points">{t('code_conspiracy.team.points_delta', {}, 'Points delta')}</label>
                  <input
                    id="code-conspiracy-points"
                    type="number"
                    value={String(actionValues.points_delta ?? 0)}
                    onChange={(event) => setActionValues((prev) => ({ ...prev, points_delta: event.target.value }))}
                  />
                </div>
              </div>
              <button
                className="btn btn-primary btn-small"
                type="button"
                onClick={() =>
                  submitPayload({
                    target_team_id: String(actionValues.target_team_id || '').trim(),
                    code: String(actionValues.code || '').trim(),
                    points_delta: Number(actionValues.points_delta || 0),
                  })
                }
              >
                {t('code_conspiracy.team.submit_code', {}, 'Submit code')}
              </button>
            </div>
          ) : null}

          <form onSubmit={submitAction}>
            {(TEAM_ACTION_SCHEMAS[game?.game_type] || []).map((field) => {
              if (field.type === 'checkbox') {
                return (
                  <label key={field.name} style={{ display: 'block', marginBottom: '0.5rem' }}>
                    <input
                      type="checkbox"
                      checked={Boolean(actionValues[field.name])}
                      onChange={(event) => setActionValues((prev) => ({ ...prev, [field.name]: event.target.checked }))}
                    />{' '}
                    {field.label}
                  </label>
                )
              }

              if (field.type === 'select') {
                return (
                  <div key={field.name} style={{ marginBottom: '0.75rem' }}>
                    <label htmlFor={`action-${field.name}`}>{field.label}</label>
                    <select
                      id={`action-${field.name}`}
                      value={String(actionValues[field.name] ?? '')}
                      onChange={(event) => setActionValues((prev) => ({ ...prev, [field.name]: event.target.value }))}
                    >
                      {(field.options || []).map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>
                )
              }

              return (
                <div key={field.name} style={{ marginBottom: '0.75rem' }}>
                  <label htmlFor={`action-${field.name}`}>{field.label}</label>
                  <input
                    id={`action-${field.name}`}
                    type={field.type === 'number' ? 'number' : 'text'}
                    value={String(actionValues[field.name] ?? '')}
                    onChange={(event) => setActionValues((prev) => ({ ...prev, [field.name]: event.target.value }))}
                  />
                </div>
              )
            })}
            <button className="btn btn-primary" type="submit">
              {t('teamModule.submitActionButton')}
            </button>
          </form>

          {actionResult ? (
            <>
              <h3>{t('teamModule.actionResult')}</h3>
              <pre style={{ whiteSpace: 'pre-wrap', overflowX: 'auto' }}>{JSON.stringify(actionResult, null, 2)}</pre>
            </>
          ) : null}
        </section>

        <section className="overview-panel">
          <h2>{t('teamModule.bootstrapState')}</h2>
          <pre style={{ whiteSpace: 'pre-wrap', overflowX: 'auto' }}>{JSON.stringify(bootstrapState, null, 2)}</pre>
        </section>
      </div>
    </main>
  )
}
