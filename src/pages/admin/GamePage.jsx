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
      courier_rush: t('gamePage.manageCourierPoints', {}, 'Drop off and Pick Up points'),
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

  const gameTypeSettingsPath = useMemo(() => {
    if (!game?.game_type) return null
    const map = {
      geohunter: `/admin/geohunter/${gameId}/settings`,
      crazy_88: `/admin/crazy88/${gameId}/settings`,
      courier_rush: `/admin/courier-rush/${gameId}/settings`,
      pandemic_response: `/admin/pandemic-response/${gameId}/settings`,
    }
    return map[game.game_type] || null
  }, [game?.game_type, gameId])

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
    <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 dark:bg-slate-950">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center gap-4 mb-8">
        <div className="shrink-0">
          {gameMeta?.logo ? (
            <img className="w-14 h-14 object-contain rounded-xl border border-gray-100 shadow-sm" src={gameMeta.logo} alt={localizedGameTypeName} />
          ) : (
            <div className="w-14 h-14 rounded-xl bg-brand-50 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="w-7 h-7 text-brand-400" viewBox="0 0 20 20" fill="currentColor"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-navy-900 truncate dark:text-white">{game?.name || t('gamePage.fallbackTitle')}</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">{localizedGameTypeName}</p>
        </div>
        <Link className="btn btn-ghost" to="/admin/games">
          {t('gamePage.backToGames')}
        </Link>
      </div>

      {/* ── Stat cards ──────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
        <article className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col gap-1 dark:border-slate-700 dark:bg-slate-900">
          <span className="text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-slate-500">{t('gamePage.type')}</span>
          <span className="text-base font-semibold text-navy-900 dark:text-white">{localizedGameTypeName}</span>
        </article>
        <article className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col gap-1 dark:border-slate-700 dark:bg-slate-900">
          <span className="text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-slate-500">{t('gamePage.code')}</span>
          <span className="text-base font-semibold text-navy-900 font-mono tracking-wide dark:text-white">{game?.code || '-'}</span>
        </article>
        <article className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col gap-1 dark:border-slate-700 dark:bg-slate-900">
          <span className="text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-slate-500">{t('gamePage.starts')}</span>
          <span className="text-base font-semibold text-navy-900 dark:text-white">{formatDate(game?.start_at)}</span>
        </article>
        <article className="bg-white rounded-xl border border-gray-200 shadow-sm p-4 flex flex-col gap-1 dark:border-slate-700 dark:bg-slate-900">
          <span className="text-xs font-medium uppercase tracking-wider text-gray-400 dark:text-slate-500">{t('gamePage.ends')}</span>
          <span className="text-base font-semibold text-navy-900 dark:text-white">{formatDate(game?.end_at)}</span>
        </article>
      </div>

      {error ? <div className="flash flash-error">{error}</div> : null}

      {/* ── Quick actions ───────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 mb-8 dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          {gameTypeActionLabel && gameTypeActionPath ? (
            <Link className="btn btn-primary btn-small" to={gameTypeActionPath}>
              {gameTypeActionLabel}
            </Link>
          ) : null}
          {gameTypeSettingsPath ? (
            <Link className="btn btn-ghost btn-small" to={gameTypeSettingsPath}>
              {t('gamePage.settings', {}, 'Settings')}
            </Link>
          ) : null}
          {game?.game_type === 'market_crash' ? (
            <Link className="btn btn-ghost btn-small" to={`/admin/market-crash/${gameId}/resources`}>
              {t('gamePage.manageResources', {}, 'Manage resources')}
            </Link>
          ) : null}
          <Link className="inline-flex items-center gap-1.5 rounded-lg bg-navy-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-800 transition-colors" to={`/admin/games/${gameId}/live-overview`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>
            {t('gamePage.liveOverview')}
          </Link>
          {gameMeta?.slug ? (
            <Link className="btn btn-ghost btn-small" to={`/info/games/${gameMeta.slug}`}>
              {t('gamePage.howToPlay')}
            </Link>
          ) : null}
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-gray-100 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <Link className="btn btn-ghost btn-small" to={`/admin/games/${gameId}/bulk-tools`}>
              {t('gamePage.bulkTools')}
            </Link>
            <Link className="btn btn-edit btn-small" to={`/admin/games/${gameId}/edit`}>
              {t('gamePage.editGame')}
            </Link>
          </div>
          <div className="flex items-center gap-2 border-l border-red-200 pl-3">
            <button className="btn btn-remove btn-small" type="button" onClick={handleResetGame}>
              {t('gamePage.resetGame')}
            </button>
            <button className="btn btn-remove btn-small" type="button" onClick={handleDeleteGame}>
              {t('gamePage.deleteGame')}
            </button>
          </div>
        </div>
      </div>

      {/* ── Members + Teams two-column ──────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Managers */}
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-navy-900 dark:text-white">{t('gamePage.managersTitle')}</h2>
            <Link
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 transition-colors"
              to={`/admin/games/${gameId}/members/new`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
              {t('gamePage.addMember')}
            </Link>
          </div>
          {members.length === 0 ? <p className="text-sm text-gray-400 dark:text-slate-500">{t('gamePage.noMembers')}</p> : null}
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
                              <span
                                key={`${member.user_id}-${role}`}
                                className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium mr-1 ${role === 'owner' ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'}`}
                              >
                                {t(`gamePage.role.${role}`, {}, role)}
                              </span>
                            ))
                          : '—'}
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1.5">
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
                            <span className="text-gray-400 text-sm dark:text-slate-500">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          ) : null}
        </section>

        {/* Teams */}
        <section className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 dark:border-slate-700 dark:bg-slate-900">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-navy-900 dark:text-white">{t('gamePage.teams')}</h2>
            <Link
              className="inline-flex items-center gap-1 rounded-lg bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 transition-colors"
              to={`/admin/games/${gameId}/teams/new`}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="w-3.5 h-3.5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" /></svg>
              {t('gamePage.addTeam')}
            </Link>
          </div>
          {teams.length === 0 ? <p className="text-sm text-gray-400 dark:text-slate-500">{t('gamePage.noTeams')}</p> : null}
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
                    <td><span className="font-mono text-gray-500">{team.code}</span></td>
                    <td className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Link className="btn btn-edit btn-small" to={`/admin/games/${gameId}/teams/${team.id}/edit`}>
                          {t('gamePage.editTeam')}
                        </Link>
                        <button className="btn btn-remove btn-small" type="button" onClick={() => handleDeleteTeam(team.id, team.name)}>
                          {t('gamePage.deleteTeam')}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </section>
      </div>
    </main>
  )
}
