import { useCallback, useEffect, useState } from 'react'

import { gameApi } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { useI18n } from '../../lib/i18n'

export default function ProfilePage() {
  const { auth, login } = useAuth()
  const { t } = useI18n()

  /* ── profile state ─────────────────────────────────────────────── */
  const [loading, setLoading] = useState(true)
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileFlash, setProfileFlash] = useState(null)

  /* ── password state ────────────────────────────────────────────── */
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordFlash, setPasswordFlash] = useState(null)

  /* ── load profile ──────────────────────────────────────────────── */
  const loadProfile = useCallback(async () => {
    try {
      setLoading(true)
      const data = await gameApi.getMyProfile(auth.token)
      setEmail(data.email || '')
      setUsername(data.username || '')
    } catch (err) {
      setProfileFlash({ type: 'error', text: err.message || t('account.loadFailed') })
    } finally {
      setLoading(false)
    }
  }, [auth.token, t])

  useEffect(() => {
    loadProfile()
  }, [loadProfile])

  /* ── save profile ──────────────────────────────────────────────── */
  async function handleProfileSubmit(e) {
    e.preventDefault()
    setProfileFlash(null)
    setProfileSaving(true)
    try {
      const data = await gameApi.updateMyProfile(auth.token, {
        email: email.trim(),
        username: username.trim(),
      })
      setEmail(data.email || '')
      setUsername(data.username || '')

      // Update auth state with new username
      login({ ...auth, username: data.username || auth.username })

      setProfileFlash({ type: 'success', text: t('account.profileSaved') })
    } catch (err) {
      setProfileFlash({ type: 'error', text: err.message || t('account.profileSaveFailed') })
    } finally {
      setProfileSaving(false)
    }
  }

  /* ── change password ───────────────────────────────────────────── */
  async function handlePasswordSubmit(e) {
    e.preventDefault()
    setPasswordFlash(null)

    if (newPassword !== confirmPassword) {
      setPasswordFlash({ type: 'error', text: t('account.passwordMismatch') })
      return
    }

    setPasswordSaving(true)
    try {
      await gameApi.changeMyPassword(auth.token, {
        current_password: currentPassword,
        new_password: newPassword,
      })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordFlash({ type: 'success', text: t('account.passwordChanged') })
    } catch (err) {
      setPasswordFlash({ type: 'error', text: err.message || t('account.passwordChangeFailed') })
    } finally {
      setPasswordSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {/* ── Profile form ──────────────────────────────────────────── */}
      <section className="rounded-xl border border-warm-200 bg-white dark:bg-slate-900 dark:border-slate-700 p-6">
        <h2 className="text-lg font-semibold text-navy-900 dark:text-white mb-1">
          {t('account.profileTitle')}
        </h2>
        <p className="text-sm text-navy-500 dark:text-slate-400 mb-6">
          {t('account.profileDesc')}
        </p>

        {profileFlash && (
          <div
            className={`flash mb-4 rounded-lg px-4 py-3 text-sm font-medium ${
              profileFlash.type === 'success'
                ? 'flash-success bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {profileFlash.text}
          </div>
        )}

        <form onSubmit={handleProfileSubmit} className="space-y-5">
          <div>
            <label htmlFor="profile-email" className="block text-sm font-medium text-navy-700 dark:text-slate-300 mb-1.5">
              {t('account.emailLabel')}
            </label>
            <input
              id="profile-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="block w-full rounded-lg border border-warm-300 bg-white px-3 py-2 text-sm text-navy-900 shadow-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white"
            />
          </div>

          <div>
            <label htmlFor="profile-username" className="block text-sm font-medium text-navy-700 dark:text-slate-300 mb-1.5">
              {t('account.displayNameLabel')}
            </label>
            <input
              id="profile-username"
              type="text"
              required
              minLength={3}
              maxLength={60}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="block w-full rounded-lg border border-warm-300 bg-white px-3 py-2 text-sm text-navy-900 shadow-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={profileSaving}
              className="inline-flex items-center rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 active:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {profileSaving ? t('account.saving') : t('account.saveProfile')}
            </button>
          </div>
        </form>
      </section>

      {/* ── Password form ─────────────────────────────────────────── */}
      <section className="rounded-xl border border-warm-200 bg-white dark:bg-slate-900 dark:border-slate-700 p-6">
        <h2 className="text-lg font-semibold text-navy-900 dark:text-white mb-1">
          {t('account.passwordTitle')}
        </h2>
        <p className="text-sm text-navy-500 dark:text-slate-400 mb-6">
          {t('account.passwordDesc')}
        </p>

        {passwordFlash && (
          <div
            className={`flash mb-4 rounded-lg px-4 py-3 text-sm font-medium ${
              passwordFlash.type === 'success'
                ? 'flash-success bg-emerald-50 text-emerald-700 border border-emerald-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            }`}
          >
            {passwordFlash.text}
          </div>
        )}

        <form onSubmit={handlePasswordSubmit} className="space-y-5">
          <div>
            <label htmlFor="current-password" className="block text-sm font-medium text-navy-700 dark:text-slate-300 mb-1.5">
              {t('account.currentPasswordLabel')}
            </label>
            <input
              id="current-password"
              type="password"
              required
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="block w-full rounded-lg border border-warm-300 bg-white px-3 py-2 text-sm text-navy-900 shadow-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white"
            />
          </div>

          <div>
            <label htmlFor="new-password" className="block text-sm font-medium text-navy-700 dark:text-slate-300 mb-1.5">
              {t('account.newPasswordLabel')}
            </label>
            <input
              id="new-password"
              type="password"
              required
              minLength={8}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="block w-full rounded-lg border border-warm-300 bg-white px-3 py-2 text-sm text-navy-900 shadow-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white"
            />
          </div>

          <div>
            <label htmlFor="confirm-password" className="block text-sm font-medium text-navy-700 dark:text-slate-300 mb-1.5">
              {t('account.confirmPasswordLabel')}
            </label>
            <input
              id="confirm-password"
              type="password"
              required
              minLength={8}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="block w-full rounded-lg border border-warm-300 bg-white px-3 py-2 text-sm text-navy-900 shadow-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 dark:bg-slate-800 dark:border-slate-600 dark:text-white"
            />
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={passwordSaving}
              className="inline-flex items-center rounded-lg bg-brand-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 active:bg-brand-700 disabled:opacity-50 transition-colors"
            >
              {passwordSaving ? t('account.saving') : t('account.changePassword')}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}
