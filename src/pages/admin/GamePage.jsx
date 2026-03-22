import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { gameApi } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { useI18n } from '../../lib/i18n'
import { GAME_BY_TYPE } from '../../lib/gameCatalog'

export default function GamePage() {
  const { gameId } = useParams()
  const { auth } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()

  const [game, setGame] = useState(null)
  const [teams, setTeams] = useState([])
  const [members, setMembers] = useState([])
  const [error, setError] = useState('')

  function formatDate(value) {
    if (!value) {
      return '-'
    }
    const parsed = new Date(value)
    if (Number.isNaN(parsed.getTime())) {
      return String(value)
    }
    const year = parsed.getFullYear()
    const month = String(parsed.getMonth() + 1).padStart(2, '0')
    const day = String(parsed.getDate()).padStart(2, '0')
    const hours = String(parsed.getHours()).padStart(2, '0')
    const minutes = String(parsed.getMinutes()).padStart(2, '0')
    return `${year}-${month}-${day} ${hours}:${minutes}`
  }

  useEffect(() => {
    let cancelled = false

    async function load() {
      setError('')
      try {
        const [gameResponse, teamsResponse, membersResponse] = await Promise.all([
          gameApi.getGame(auth.token, gameId),
          gameApi.listTeams(auth.token, gameId),
          gameApi.listMembers(auth.token, gameId),
        ])

        if (cancelled) {
          return
        }

        setGame(gameResponse)
        setTeams(Array.isArray(teamsResponse) ? teamsResponse : [])
        setMembers(Array.isArray(membersResponse) ? membersResponse : [])
      } catch (err) {
        if (!cancelled) {
          setError(err.message || t('gamePage.loadFailed'))
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [auth.token, gameId, t])

  const gameMeta = GAME_BY_TYPE[game?.game_type]
  const localizedGameTypeName = useMemo(() => {
    if (!game?.game_type) {
      return '-'
    }
    return t(`gameCatalog.${game.game_type}.name`, {}, gameMeta?.name || game.game_type)
  }, [game?.game_type, gameMeta?.name, t])
  const gameTypeActionLabel = useMemo(() => {
    const map = {
      exploding_kittens: t('gamePage.manageCards'),
      geohunter: t('gamePage.managePois'),
      blindhike: t('gamePage.configure'),
      resource_run: t('gamePage.manageNodes'),
      territory_control: t('gamePage.manageZones'),
      market_crash: t('gamePage.managePoints'),
      crazy_88: t('gamePage.manageTasks'),
      courier_rush: t('gamePage.configure'),
      echo_hunt: t('gamePage.manageBeacons'),
      checkpoint_heist: t('gamePage.manageCheckpoints'),
      pandemic_response: t('gamePage.manageHotspots'),
      birds_of_prey: t('gamePage.configure'),
      code_conspiracy: t('gamePage.configure'),
    }
    return map[game?.game_type] || null
  }, [game?.game_type, t])
  const gameTypeActionPath = useMemo(() => {
    if (!game?.game_type) {
      return null
    }

    const pathMap = {
      exploding_kittens: `/admin/games/${gameId}/cards`,
      geohunter: `/admin/geohunter/${gameId}/pois`,
      blindhike: `/admin/blindhike/${gameId}/configure`,
      resource_run: `/admin/resource-run/${gameId}/nodes`,
      territory_control: `/admin/territory-control/${gameId}/zones`,
      courier_rush: `/admin/courier-rush/${gameId}/configure`,
      echo_hunt: `/admin/echo-hunt/${gameId}/beacons`,
      checkpoint_heist: `/admin/checkpoint-heist/${gameId}/checkpoints`,
      pandemic_response: `/admin/pandemic-response/${gameId}/hotspots`,
      market_crash: `/admin/market-crash/${gameId}/points`,
      birds_of_prey: `/admin/birds-of-prey/${gameId}/configure`,
      code_conspiracy: `/admin/code-conspiracy/${gameId}/configure`,
      crazy_88: `/admin/crazy88/${gameId}/tasks`,
    }

    return pathMap[game.game_type] || `/admin/games/${gameId}/live-overview`
  }, [game?.game_type, gameId])

  function roleBadge(role) {
    if (role === 'owner') {
      return 'tag tag-alert'
    }
    return 'tag tag-cool'
  }

  async function handleDeleteGame() {
    if (!window.confirm(t('gamePage.confirmDeleteGame', {}, 'Delete this game?'))) {
      return
    }

    try {
      await gameApi.deleteGame(auth.token, gameId)
      navigate('/admin/games')
    } catch (err) {
      setError(err.message || t('gamePage.deleteFailed', {}, 'Could not delete game'))
    }
  }

  async function handleResetGame() {
    if (!window.confirm(t('gamePage.confirmResetGame'))) {
      return
    }

    try {
      await gameApi.resetGame(auth.token, gameId)
    } catch (err) {
      setError(err.message || t('gamePage.resetFailed'))
    }
  }

  async function handleDeleteTeam(teamId, teamName) {
    if (!window.confirm(t('gamePage.confirmDeleteTeam', { team: teamName }, `Delete team ${teamName}?`))) {
      return
    }

    try {
      await gameApi.deleteTeam(auth.token, gameId, teamId)
      const updatedTeams = await gameApi.listTeams(auth.token, gameId)
      setTeams(Array.isArray(updatedTeams) ? updatedTeams : [])
    } catch (err) {
      setError(err.message || t('gamePage.deleteTeamFailed', {}, 'Could not delete team'))
    }
  }

  async function handleRemoveMember(member) {
    const memberEmail = String(member?.email || member?.user_id || '').trim()
    const memberRoles = Array.isArray(member?.roles) ? member.roles : []

    if (memberRoles.includes('owner')) {
      setError(t('gamePage.ownerCannotBeRemoved'))
      return
    }

    if (!window.confirm(t('gamePage.confirmRemoveMember', { email: memberEmail }, `Remove ${memberEmail} from this game?`))) {
      return
    }

    try {
      if (memberRoles.includes('admin')) {
        await gameApi.removeAdmin(auth.token, gameId, member.user_id)
      }
      if (memberRoles.includes('game_master')) {
        await gameApi.removeGameMaster(auth.token, gameId, member.user_id)
      }

      const updatedMembers = await gameApi.listMembers(auth.token, gameId)
      setMembers(Array.isArray(updatedMembers) ? updatedMembers : [])
    } catch (err) {
      setError(err.message || t('gamePage.removeMemberFailed'))
    }
  }

  return (
    <main className="page-shell">
      <div className="admin-game-header">
        <div className="admin-game-header__logo-col">
          {gameMeta?.logo ? <img className="admin-game-header__logo" src={gameMeta.logo} alt={localizedGameTypeName} /> : null}
        </div>
        <div className="admin-game-header__content">
          <h1>{game?.name || t('gamePage.fallbackTitle')}</h1>
          <p className="overview-subtitle">{localizedGameTypeName}</p>
        </div>
        <div className="admin-game-header__actions">
          <Link className="btn btn-ghost" to="/admin/games">
            {t('gamePage.backToGames')}
          </Link>
        </div>
      </div>

      <section className="overview-stats game-show-summary-stats">
        <article className="stat-card">
          <span className="stat-label">{t('gamePage.type')}</span>
          <span className="stat-value">{localizedGameTypeName}</span>
        </article>
        <article className="stat-card">
          <span className="stat-label">{t('gamePage.code')}</span>
          <span className="stat-value">{game?.code || '-'}</span>
        </article>
        <article className="stat-card">
          <span className="stat-label">{t('gamePage.starts')}</span>
          <span className="stat-value">{formatDate(game?.start_at)}</span>
        </article>
        <article className="stat-card">
          <span className="stat-label">{t('gamePage.ends')}</span>
          <span className="stat-value">{formatDate(game?.end_at)}</span>
        </article>
      </section>

      {error ? <div className="flash flash-error">{error}</div> : null}

      <section className="game-show-action-stack">
        <div className="game-show-action-board">
          <div className="game-show-action-group">
            {gameTypeActionLabel && gameTypeActionPath ? (
              <Link className="btn btn-primary btn-small" to={gameTypeActionPath}>
                {gameTypeActionLabel}
              </Link>
            ) : null}
          </div>

          <div className="game-show-action-group">
            {gameMeta?.slug ? (
              <Link className="btn btn-ghost btn-small" to={`/info/games/${gameMeta.slug}`}>
                {t('gamePage.howToPlay')}
              </Link>
            ) : null}
            <Link className="btn btn-primary btn-small" to={`/admin/games/${gameId}/live-overview`}>
              {t('gamePage.liveOverview')}
            </Link>
          </div>
        </div>

        <div className="game-show-action-board">
          <div className="game-show-action-group">
            <Link className="btn btn-ghost btn-small" to={`/admin/games/${gameId}/bulk-tools`}>
              {t('gamePage.bulkTools')}
            </Link>
            <Link className="btn btn-edit btn-small" to={`/admin/games/${gameId}/edit`}>
              {t('gamePage.editGame')}
            </Link>
          </div>

          <div className="game-show-action-group game-show-action-group--danger">
            <button className="btn btn-remove btn-small" type="button" onClick={handleResetGame}>
              {t('gamePage.resetGame')}
            </button>
            <button className="btn btn-remove btn-small" type="button" onClick={handleDeleteGame}>
              {t('gamePage.deleteGame')}
            </button>
          </div>
        </div>
      </section>

      <section className="game-show-layout" style={{ marginTop: '1rem' }}>
        <section className="overview-panel">
          <div className="game-panel-header-row">
            <h2>{t('gamePage.managersTitle')}</h2>
            <Link className="btn btn-add btn-small game-panel-header-row__action" to={`/admin/games/${gameId}/members/new`}>
              {t('gamePage.addMember')}
            </Link>
          </div>
          {members.length === 0 ? <p>{t('gamePage.noMembers')}</p> : null}
          {members.length > 0 ? (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('gamePage.memberEmail')}</th>
                  <th>{t('gamePage.memberRoles')}</th>
                  <th className="text-right">{t('gamesPage.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => {
                  const roles = Array.isArray(member.roles) ? member.roles : []
                  const canModify = !roles.includes('owner')
                  return (
                    <tr key={member.user_id}>
                      <td>{member.email || member.user_id}</td>
                      <td>
                        {roles.length > 0
                          ? roles.map((role) => (
                              <span key={`${member.user_id}-${role}`} className={roleBadge(role)} style={{ marginRight: '0.4rem' }}>
                                {t(`gamePage.role.${role}`, {}, role)}
                              </span>
                            ))
                          : '—'}
                      </td>
                      <td className="text-right table-actions-inline">
                        {canModify ? (
                          <>
                            <Link className="btn btn-edit btn-small" to={`/admin/games/${gameId}/members/${member.user_id}/edit`}>
                              {t('gamePage.editMember')}
                            </Link>
                            <button className="btn btn-remove btn-small" type="button" onClick={() => handleRemoveMember(member)}>
                              {t('gamePage.removeMember')}
                            </button>
                          </>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : null}
        </section>

        <section className="overview-panel">
          <div className="game-panel-header-row">
            <h2>{t('gamePage.teams')}</h2>
            <Link className="btn btn-add btn-small game-panel-header-row__action" to={`/admin/games/${gameId}/teams/new`}>
              {t('gamePage.addTeam')}
            </Link>
          </div>
          {teams.length === 0 ? <p>{t('gamePage.noTeams')}</p> : null}
          {teams.length > 0 ? (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('gamePage.teamName')}</th>
                  <th>{t('gamePage.teamCode')}</th>
                  <th className="text-right">{t('gamesPage.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {teams.map((team) => (
                  <tr key={team.id}>
                    <td>
                      <strong>{team.name}</strong>
                    </td>
                    <td>{team.code}</td>
                    <td className="text-right table-actions-inline">
                      <Link className="btn btn-edit btn-small" to={`/admin/games/${gameId}/teams/${team.id}/edit`}>
                        {t('gamePage.editTeam')}
                      </Link>
                      <button className="btn btn-remove btn-small" type="button" onClick={() => handleDeleteTeam(team.id, team.name)}>
                        {t('gamePage.deleteTeam')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </section>
      </section>

    </main>
  )
}
