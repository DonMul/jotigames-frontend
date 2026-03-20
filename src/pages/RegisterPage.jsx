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
    <main className="page-shell">
      <section className="admin-panel" style={{ maxWidth: 560, margin: '3rem auto' }}>
        <h1>{t('auth.createAccount')}</h1>
        <p>{t('auth.registerIntro')}</p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="registerEmail">{t('auth.email')}</label>
          <input id="registerEmail" type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />

          <label htmlFor="registerUsername">{t('auth.username')}</label>
          <input id="registerUsername" value={username} onChange={(event) => setUsername(event.target.value)} required minLength={3} />

          <label htmlFor="registerPassword">{t('auth.password')}</label>
          <input id="registerPassword" type="password" value={password} onChange={(event) => setPassword(event.target.value)} required minLength={8} />

          <label htmlFor="registerPasswordConfirm">{t('auth.confirmPassword')}</label>
          <input
            id="registerPasswordConfirm"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            minLength={8}
          />

          {error ? <div className="flash flash-error">{error}</div> : null}
          {success ? <div className="flash flash-success">{success}</div> : null}

          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? t('auth.creating') : t('auth.register')}
          </button>
        </form>

        <p style={{ marginTop: '1rem' }}>
          {t('auth.hasAccount')} <Link to="/login">{t('auth.login')}</Link>
        </p>
      </section>
    </main>
  )
}
