import { useState } from 'react'
import { Link } from 'react-router-dom'

import { apiRequest } from '../lib/api'
import { useI18n } from '../lib/i18n'

export default function RegisterPage() {
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSuccess('')

    if (password !== confirmPassword) {
      setError(t('auth.passwordMismatch'))
      return
    }

    setLoading(true)
    try {
      const response = await apiRequest('/api/auth/register', {
        method: 'POST',
        body: {
          email: email.trim(),
          username: username.trim(),
          password,
        },
      })
      setSuccess(response?.message || response?.message_key || t('auth.registerSuccess'))
      setEmail('')
      setUsername('')
      setPassword('')
      setConfirmPassword('')
    } catch (err) {
      setError(err.message || t('auth.registerFailed'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="min-h-[70vh] flex items-center justify-center py-16 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="font-display text-3xl font-bold text-navy-900">{t('auth.createAccount')}</h1>
          <p className="mt-2 text-navy-500">{t('auth.registerIntro')}</p>
        </div>

        <div className="rounded-2xl border border-warm-200 bg-white shadow-xl shadow-navy-900/5 p-6 sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="registerEmail" className="block text-xs font-medium text-navy-600 mb-1.5">{t('auth.email')}</label>
              <input id="registerEmail" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required className="w-full rounded-lg border border-warm-200 bg-warm-50 px-3 py-2.5 text-sm text-navy-900 placeholder:text-navy-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-400/20 outline-none transition" />
            </div>
            <div>
              <label htmlFor="registerUsername" className="block text-xs font-medium text-navy-600 mb-1.5">{t('auth.username')}</label>
              <input id="registerUsername" value={username} onChange={(e) => setUsername(e.target.value)} required minLength={3} className="w-full rounded-lg border border-warm-200 bg-warm-50 px-3 py-2.5 text-sm text-navy-900 placeholder:text-navy-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-400/20 outline-none transition" />
            </div>
            <div>
              <label htmlFor="registerPassword" className="block text-xs font-medium text-navy-600 mb-1.5">{t('auth.password')}</label>
              <input id="registerPassword" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} className="w-full rounded-lg border border-warm-200 bg-warm-50 px-3 py-2.5 text-sm text-navy-900 placeholder:text-navy-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-400/20 outline-none transition" />
            </div>
            <div>
              <label htmlFor="registerPasswordConfirm" className="block text-xs font-medium text-navy-600 mb-1.5">{t('auth.confirmPassword')}</label>
              <input id="registerPasswordConfirm" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={8} className="w-full rounded-lg border border-warm-200 bg-warm-50 px-3 py-2.5 text-sm text-navy-900 placeholder:text-navy-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-400/20 outline-none transition" />
            </div>

            {error ? <div className="flash flash-error">{error}</div> : null}
            {success ? <div className="flash flash-success">{success}</div> : null}

            <button type="submit" disabled={loading} className="w-full rounded-lg bg-brand-500 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 active:bg-brand-700 disabled:opacity-50 transition-all">
              {loading ? t('auth.creating') : t('auth.register')}
            </button>
          </form>

          <p className="text-center text-sm text-navy-500 mt-6">
            {t('auth.hasAccount')} <Link to="/login" className="font-medium text-brand-600 hover:text-brand-700">{t('auth.login')}</Link>
          </p>
        </div>
      </div>
    </section>
  )
}
