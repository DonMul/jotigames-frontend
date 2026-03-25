import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { gameApi } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { useI18n } from '../../lib/i18n'

const ROLE_ADMIN = 'admin'
const ROLE_GAME_MASTER = 'game_master'

export default function GameMemberFormPage() {
  const { gameId, userId } = useParams()
  const { auth } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()

  const isEdit = Boolean(userId)

  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [email, setEmail] = useState('')
  const [role, setRole] = useState(ROLE_ADMIN)
  const [currentRoles, setCurrentRoles] = useState([])

  const backPath = useMemo(() => `/admin/games/${gameId}`, [gameId])

  useEffect(() => {
    if (!isEdit) {
      return undefined
    }

    let cancelled = false

    async function load() {
      setLoading(true)
      setError('')

      try {
        const members = await gameApi.listMembers(auth.token, gameId)
        if (cancelled) {
          return
        }

        const targetMember = (Array.isArray(members) ? members : []).find((member) => String(member.user_id) === String(userId))
        if (!targetMember) {
          setError(t('memberForm.notFound'))
          return
        }

        const roles = Array.isArray(targetMember.roles) ? targetMember.roles : []
        setCurrentRoles(roles)
        setEmail(String(targetMember.email || targetMember.user_id || ''))

        if (roles.includes(ROLE_ADMIN)) {
          setRole(ROLE_ADMIN)
        } else if (roles.includes(ROLE_GAME_MASTER)) {
          setRole(ROLE_GAME_MASTER)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || t('memberForm.loadFailed'))
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
  }, [auth.token, gameId, isEdit, t, userId])

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSaving(true)

    try {
      const trimmedEmail = email.trim()
      if (!trimmedEmail) {
        throw new Error(t('memberForm.emailRequired'))
      }

      if (!isEdit) {
        if (role === ROLE_GAME_MASTER) {
          await gameApi.addGameMaster(auth.token, gameId, trimmedEmail)
        } else {
          await gameApi.addAdmin(auth.token, gameId, trimmedEmail)
        }

        navigate(backPath)
        return
      }

      if (currentRoles.includes('owner') && !currentRoles.includes(ROLE_ADMIN) && !currentRoles.includes(ROLE_GAME_MASTER)) {
        throw new Error(t('memberForm.ownerEditForbidden'))
      }

      if (role === ROLE_ADMIN) {
        if (!currentRoles.includes(ROLE_ADMIN)) {
          await gameApi.addAdmin(auth.token, gameId, trimmedEmail)
        }
        if (currentRoles.includes(ROLE_GAME_MASTER)) {
          await gameApi.removeGameMaster(auth.token, gameId, userId)
        }
      } else {
        if (!currentRoles.includes(ROLE_GAME_MASTER)) {
          await gameApi.addGameMaster(auth.token, gameId, trimmedEmail)
        }
        if (currentRoles.includes(ROLE_ADMIN)) {
          await gameApi.removeAdmin(auth.token, gameId, userId)
        }
      }

      navigate(backPath)
    } catch (err) {
      setError(err.message || t('memberForm.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-navy-900">{isEdit ? t('memberForm.editTitle') : t('memberForm.newTitle')}</h1>
        <Link className="btn btn-ghost" to={backPath}>
          {t('memberForm.back')}
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
            <label htmlFor="member-email" className="block text-sm font-medium text-navy-700">{t('memberForm.email')}</label>
            <input
              id="member-email"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-navy-900 placeholder-gray-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none transition-colors read-only:bg-gray-50 read-only:text-gray-500"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              readOnly={isEdit}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="member-role" className="block text-sm font-medium text-navy-700">{t('memberForm.role')}</label>
            <select
              id="member-role"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-navy-900 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none transition-colors"
              value={role}
              onChange={(event) => setRole(event.target.value)}
              required
            >
              <option value={ROLE_ADMIN}>{t('memberForm.roleAdmin')}</option>
              <option value={ROLE_GAME_MASTER}>{t('memberForm.roleGameMaster')}</option>
            </select>
          </div>

          <div className="pt-2">
            <button
              className="w-full sm:w-auto rounded-lg bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 active:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              type="submit"
              disabled={saving}
            >
              {saving ? t('memberForm.saving') : t('memberForm.save')}
            </button>
          </div>
        </form>
      ) : null}
    </main>
  )
}
