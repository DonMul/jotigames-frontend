import { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'

import { authApi } from '../lib/api'

export default function ActivateAccountPage() {
  const [searchParams] = useSearchParams()
  const token = useMemo(() => String(searchParams.get('token') || '').trim(), [searchParams])

  const [status, setStatus] = useState(token ? 'loading' : 'error')
  const [message, setMessage] = useState(
    token ? '' : 'Activation token is missing. Please use the link from your email.'
  )

  useEffect(() => {
    let cancelled = false

    async function verifyEmailToken() {
      if (!token) {
        return
      }

      setStatus('loading')
      setMessage('')

      try {
        const response = await authApi.verifyEmail(token)
        if (cancelled) {
          return
        }

        setStatus('success')
        setMessage(response?.message || response?.message_key || 'Your account is now active. You can log in.')
      } catch (error) {
        if (cancelled) {
          return
        }

        setStatus('error')
        setMessage(error?.message || 'We could not activate this account. The link may be invalid or expired.')
      }
    }

    verifyEmailToken()

    return () => {
      cancelled = true
    }
  }, [token])

  const isLoading = status === 'loading'
  const isSuccess = status === 'success'

  return (
    <section className="min-h-[70vh] flex items-center justify-center py-16 px-4 dark:bg-slate-950">
      <div className="w-full max-w-lg rounded-2xl border border-warm-200 bg-white shadow-xl shadow-navy-900/5 p-6 sm:p-8 text-center dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/20">
        <h1 className="font-display text-3xl font-bold text-navy-900 dark:text-white">Activate your account</h1>

        {isLoading ? (
          <div className="mt-8 flex items-center justify-center gap-3 text-navy-600 dark:text-slate-300">
            <div className="h-6 w-6 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
            <p>Activating your account...</p>
          </div>
        ) : (
          <p
            className={`mt-6 rounded-lg px-4 py-3 text-sm ${
              isSuccess
                ? 'flash flash-success'
                : 'flash flash-error'
            }`}
          >
            {message}
          </p>
        )}

        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/login"
            className="inline-flex items-center rounded-lg bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 active:bg-brand-700 transition-all"
          >
            Go to login
          </Link>
          <Link
            to="/"
            className="inline-flex items-center rounded-lg border border-warm-300 px-5 py-2.5 text-sm font-semibold text-navy-700 hover:border-brand-300 hover:text-brand-600 transition-all dark:border-slate-600 dark:text-slate-200 dark:hover:border-brand-400 dark:hover:text-brand-300"
          >
            Back to home
          </Link>
        </div>
      </div>
    </section>
  )
}
