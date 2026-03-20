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
    <main className="page-shell">
      <section className="overview-header">
        <div>
          <h1>{isEdit ? t('memberForm.editTitle') : t('memberForm.newTitle')}</h1>
        </div>
        <div className="overview-actions">
          <Link className="btn btn-ghost" to={backPath}>
            {t('memberForm.back')}
          </Link>
        </div>
      </section>

      {loading ? <p>{t('gamesPage.loading')}</p> : null}
      {error ? <div className="flash flash-error">{error}</div> : null}

      {!loading ? (
        <form onSubmit={handleSubmit} className="admin-panel">
          <div className="form-row">
            <label htmlFor="member-email">{t('memberForm.email')}</label>
            <input
              id="member-email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              readOnly={isEdit}
            />
          </div>

          <div className="form-row">
            <label htmlFor="member-role">{t('memberForm.role')}</label>
            <select id="member-role" value={role} onChange={(event) => setRole(event.target.value)} required>
              <option value={ROLE_ADMIN}>{t('memberForm.roleAdmin')}</option>
              <option value={ROLE_GAME_MASTER}>{t('memberForm.roleGameMaster')}</option>
            </select>
          </div>

          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? t('memberForm.saving') : t('memberForm.save')}
          </button>
        </form>
      ) : null}
    </main>
  )
}
