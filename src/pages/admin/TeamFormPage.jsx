import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { gameApi } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { useI18n } from '../../lib/i18n'
import TeamLogoPicker from '../../components/shared/TeamLogoPicker'

export default function TeamFormPage() {
  const { gameId, teamId } = useParams()
  const { auth } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()

  const isEdit = Boolean(teamId)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [teamName, setTeamName] = useState('')
  const [logoPath, setLogoPath] = useState('')

  useEffect(() => {
    if (!isEdit) {
      return undefined
    }

    let cancelled = false

    async function load() {
      setLoading(true)
      setError('')
      try {
        const team = await gameApi.getTeam(auth.token, gameId, teamId)
        if (cancelled || !team) {
          return
        }
        setTeamName(String(team.name || ''))
        setLogoPath(String(team.logo_path || ''))
      } catch (err) {
        if (!cancelled) {
          setError(err.message || t('teamForm.loadFailed'))
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
  }, [auth.token, gameId, isEdit, teamId, t])

  const backPath = useMemo(() => `/admin/games/${gameId}`, [gameId])

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    const trimmedName = teamName.trim()
    if (!trimmedName) {
      setError(t('teamForm.nameRequired'))
      return
    }

    setSaving(true)

    try {
      const payload = {
        name: trimmedName,
        logo_path: logoPath.trim() || undefined,
      }

      if (isEdit) {
        await gameApi.updateTeam(auth.token, gameId, teamId, payload)
      } else {
        await gameApi.createTeam(auth.token, gameId, payload)
      }

      navigate(backPath)
    } catch (err) {
      setError(err.message || t('teamForm.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="page-shell">
      <section className="overview-header">
        <div>
          <h1>{isEdit ? t('teamForm.editTitle') : t('teamForm.newTitle')}</h1>
        </div>
        <div className="overview-actions">
          <Link className="btn btn-ghost" to={backPath}>
            {t('teamForm.back')}
          </Link>
        </div>
      </section>

      {loading ? <p>{t('gamesPage.loading')}</p> : null}
      {error ? <div className="flash flash-error">{error}</div> : null}

      {!loading ? (
        <form onSubmit={handleSubmit} className="admin-panel">
          <div className="form-row">
            <label htmlFor="team-name">{t('teamForm.name')}</label>
            <input id="team-name" value={teamName} onChange={(event) => setTeamName(event.target.value)} required />
          </div>

          <div className="form-row">
            <p className="muted">{t('teamForm.codeGeneratedHint')}</p>
          </div>

          <TeamLogoPicker value={logoPath} onChange={setLogoPath} disabled={saving} />

          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? t('teamForm.saving') : t('teamForm.save')}
          </button>
        </form>
      ) : null}
    </main>
  )
}
