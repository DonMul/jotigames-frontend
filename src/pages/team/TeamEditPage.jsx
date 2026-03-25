import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'

import TeamLogoPicker from '../../components/shared/TeamLogoPicker'
import { gameApi } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { useI18n } from '../../lib/i18n'

export default function TeamEditPage() {
  const { auth } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [gameId, setGameId] = useState('')
  const [teamId, setTeamId] = useState('')
  const [teamName, setTeamName] = useState('')
  const [logoPath, setLogoPath] = useState('')

  useEffect(() => {
    if (auth.principalType !== 'team') {
      return
    }

    let cancelled = false

    async function load() {
      setLoading(true)
      setError('')
      try {
        const dashboard = await gameApi.getTeamDashboard(auth.token)
        const resolvedGameId = String(dashboard?.game_id || '')
        const resolvedTeamId = String(dashboard?.team_id || '')
        if (!resolvedGameId || !resolvedTeamId) {
          throw new Error(t('teamDashboard.noGame', {}, 'Could not resolve active team game'))
        }

        const team = await gameApi.getTeam(auth.token, resolvedGameId, resolvedTeamId)
        if (cancelled) {
          return
        }

        setGameId(resolvedGameId)
        setTeamId(resolvedTeamId)
        setTeamName(String(team?.name || dashboard?.team_name || ''))
        setLogoPath(String(team?.logo_path || dashboard?.team_logo_path || ''))
      } catch (err) {
        if (!cancelled) {
          setError(err.message || t('teamForm.loadFailed', {}, 'Could not load team'))
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
  }, [auth.principalType, auth.token, t])

  if (auth.principalType !== 'team') {
    return <Navigate to="/admin/games" replace />
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    const trimmedName = teamName.trim()
    if (!trimmedName) {
      setError(t('teamForm.nameRequired', {}, 'Name is required'))
      return
    }
    if (!gameId || !teamId) {
      setError(t('teamDashboard.noGame', {}, 'Could not resolve active team game'))
      return
    }

    setSaving(true)
    try {
      await gameApi.updateTeam(auth.token, gameId, teamId, {
        name: trimmedName,
        logo_path: logoPath.trim() || undefined,
      })
      navigate('/team')
    } catch (err) {
      setError(err.message || t('teamForm.saveFailed', {}, 'Could not save team'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="page-shell">
      <section className="overview-header">
        <div>
          <h1>{t('teamForm.editTitle', {}, 'Edit team')}</h1>
        </div>
        <div className="overview-actions">
          <Link className="btn btn-ghost" to="/team">
            {t('teamForm.back', {}, 'Back')}
          </Link>
        </div>
      </section>

      {loading ? <p>{t('gamesPage.loading', {}, 'Loading…')}</p> : null}
      {error ? <div className="flash flash-error">{error}</div> : null}

      {!loading ? (
        <form onSubmit={handleSubmit} className="admin-panel">
          <div className="form-row">
            <label htmlFor="team-name">{t('teamForm.name', {}, 'Name')}</label>
            <input id="team-name" value={teamName} onChange={(event) => setTeamName(event.target.value)} required />
          </div>

          <TeamLogoPicker value={logoPath} onChange={setLogoPath} disabled={saving} />

          <div className="modal-actions">
            <button className="btn btn-primary" type="submit" disabled={saving}>
              {saving ? t('teamForm.saving', {}, 'Saving…') : t('teamForm.save', {}, 'Save')}
            </button>
          </div>
        </form>
      ) : null}
    </main>
  )
}
