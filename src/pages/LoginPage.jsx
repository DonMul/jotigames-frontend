import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

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
        username: response.username || null,
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
    <section className="min-h-[70vh] flex items-center justify-center py-16 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-navy-900">{t('auth.loginTitle')}</h1>
          <p className="mt-2 text-navy-500">{t('auth.loginSubtitle')}</p>
        </div>

        <div className="rounded-2xl border border-warm-200 bg-white shadow-xl shadow-navy-900/5 p-6 sm:p-8">
          {/* Mode tabs */}
          <div className="inline-flex w-full rounded-full border border-warm-200 bg-warm-50 p-1 mb-6">
            <button type="button" onClick={() => setMode('user')} className={`flex-1 rounded-full py-2 text-sm font-medium transition-all ${mode === 'user' ? 'bg-brand-500 text-white shadow-sm' : 'text-navy-600 hover:text-navy-900'}`}>
              {t('auth.user')}
            </button>
            <button type="button" onClick={() => setMode('team')} className={`flex-1 rounded-full py-2 text-sm font-medium transition-all ${mode === 'team' ? 'bg-brand-500 text-white shadow-sm' : 'text-navy-600 hover:text-navy-900'}`}>
              {t('auth.team')}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'user' ? (
              <>
                <div>
                  <label htmlFor="email" className="block text-xs font-medium text-navy-600 mb-1.5">{t('auth.email')}</label>
                  <input id="email" aria-label={`${t('auth.email')} Email`} type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full rounded-lg border border-warm-200 bg-warm-50 px-3 py-2.5 text-sm text-navy-900 placeholder:text-navy-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-400/20 outline-none transition" />
                </div>
                <div>
                  <label htmlFor="password" className="block text-xs font-medium text-navy-600 mb-1.5">{t('auth.password')}</label>
                  <input id="password" aria-label={`${t('auth.password')} Password`} type="password" value={password} onChange={(e) => setPassword(e.target.value)} required className="w-full rounded-lg border border-warm-200 bg-warm-50 px-3 py-2.5 text-sm text-navy-900 placeholder:text-navy-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-400/20 outline-none transition" />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label htmlFor="gameCode" className="block text-xs font-medium text-navy-600 mb-1.5">{t('auth.gameCode')}</label>
                  <input id="gameCode" value={gameCode} onChange={(e) => setGameCode(e.target.value)} required className="w-full rounded-lg border border-warm-200 bg-warm-50 px-3 py-2.5 text-sm text-navy-900 placeholder:text-navy-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-400/20 outline-none transition" />
                </div>
                <div>
                  <label htmlFor="teamCode" className="block text-xs font-medium text-navy-600 mb-1.5">{t('auth.teamCode')}</label>
                  <input id="teamCode" value={teamCode} onChange={(e) => setTeamCode(e.target.value)} required className="w-full rounded-lg border border-warm-200 bg-warm-50 px-3 py-2.5 text-sm text-navy-900 placeholder:text-navy-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-400/20 outline-none transition" />
                </div>
              </>
            )}

            {error ? <div className="flash flash-error">{error}</div> : null}

            <button type="submit" disabled={loading} className="w-full rounded-lg bg-brand-500 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 active:bg-brand-700 disabled:opacity-50 transition-all">
              {loading ? t('auth.signingIn') : t('auth.signIn')}
            </button>
          </form>

          <p className="text-center text-sm text-navy-500 mt-6">
            {t('auth.noAccount')} <Link to="/register" className="font-medium text-brand-600 hover:text-brand-700">{t('auth.register')}</Link>
          </p>
        </div>
      </div>
    </section>
  )
}
