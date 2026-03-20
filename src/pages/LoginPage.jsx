import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import { authApi } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useI18n } from '../lib/i18n'

export default function LoginPage({ defaultMode = 'user' }) {
  const { t } = useI18n()
  const [mode, setMode] = useState(defaultMode === 'team' ? 'team' : 'user')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const [gameCode, setGameCode] = useState('')
  const [teamCode, setTeamCode] = useState('')

  const navigate = useNavigate()
  const { login } = useAuth()

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response =
        mode === 'user'
          ? await authApi.loginUser(email.trim(), password)
          : await authApi.loginTeam(gameCode.trim(), teamCode.trim())

      login({
        token: response.access_token,
        principalType: response.principal_type,
        principalId: response.principal_id,
        accessLevel: response.access_level,
        roles: response.roles || [],
        teamGameCode: mode === 'team' ? gameCode.trim() : null,
      })

      if (response.principal_type === 'team') {
        navigate('/team')
      } else {
        navigate('/admin/games')
      }
    } catch (err) {
      setError(err.message || t('auth.loginFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="page-shell">
      <section className="admin-panel" style={{ maxWidth: 520, margin: '3rem auto' }}>
        <h1>{t('auth.loginTitle')}</h1>

        <div className="admin-tabs" style={{ marginBottom: '1rem' }}>
          <button type="button" className={`btn ${mode === 'user' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setMode('user')}>
            {t('auth.user')}
          </button>
          <button type="button" className={`btn ${mode === 'team' ? 'btn-primary' : 'btn-ghost'}`} onClick={() => setMode('team')}>
            {t('auth.team')}
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {mode === 'user' ? (
            <>
              <label htmlFor="email">{t('auth.email')}</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />

              <label htmlFor="password">{t('auth.password')}</label>
              <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </>
          ) : (
            <>
              <label htmlFor="gameCode">{t('auth.gameCode')}</label>
              <input id="gameCode" value={gameCode} onChange={(e) => setGameCode(e.target.value)} required />

              <label htmlFor="teamCode">{t('auth.teamCode')}</label>
              <input id="teamCode" value={teamCode} onChange={(e) => setTeamCode(e.target.value)} required />
            </>
          )}

          {error ? <div className="flash flash-error">{error}</div> : null}

          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? t('auth.signingIn') : t('auth.signIn')}
          </button>
        </form>
      </section>
    </main>
  )
}
