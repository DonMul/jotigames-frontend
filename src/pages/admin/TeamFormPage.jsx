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
    <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-navy-900">{isEdit ? t('teamForm.editTitle') : t('teamForm.newTitle')}</h1>
        <Link className="btn btn-ghost" to={backPath}>
          {t('teamForm.back')}
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
        </div>
      ) : null}
      {error ? <div className="flash flash-error">{error}</div> : null}

      {!loading ? (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
          <div className="space-y-1.5">
            <label htmlFor="team-name" className="block text-sm font-medium text-navy-700">{t('teamForm.name')}</label>
            <input
              id="team-name"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-navy-900 placeholder-gray-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none transition-colors"
              value={teamName}
              onChange={(event) => setTeamName(event.target.value)}
              required
            />
          </div>

          <p className="text-xs text-gray-400">{t('teamForm.codeGeneratedHint')}</p>

          <TeamLogoPicker value={logoPath} onChange={setLogoPath} disabled={saving} />

          <div className="pt-2">
            <button
              className="w-full sm:w-auto rounded-lg bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 active:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              type="submit"
              disabled={saving}
            >
              {saving ? t('teamForm.saving') : t('teamForm.save')}
            </button>
          </div>
        </form>
      ) : null}
    </main>
  )
}
