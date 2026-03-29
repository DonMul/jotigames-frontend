import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'

import { gameApi } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { useI18n } from '../../lib/i18n'

/* ── helpers ────────────────────────────────────────────────────────── */

function formatCents(cents, currency = 'EUR') {
  try {
    return new Intl.NumberFormat(undefined, {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(cents / 100)
  } catch {
    return `${(cents / 100).toFixed(2)} ${currency}`
  }
}

function formatPlanSlug(slug) {
  if (!slug) return ''
  return String(slug)
    .replace(/[_-]+/g, ' ')
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

function formatPaymentDescription(description, t) {
  if (!description) return ''

  const text = String(description).trim()

  if (text.startsWith('subscription.pending:')) {
    const payload = text.slice('subscription.pending:'.length)
    const parts = payload.split(';').map((part) => part.trim()).filter(Boolean)
    const parsed = {}

    for (const part of parts) {
      const [key, ...valueParts] = part.split('=')
      if (!key || valueParts.length === 0) continue
      parsed[key.trim()] = valueParts.join('=').trim()
    }

    const action = parsed.action
    const previousPlan = formatPlanSlug(parsed.previous_plan_slug)
    const newPlan = formatPlanSlug(parsed.new_plan_slug)
    const unknownPlan = t('subscription.paymentDescUnknownPlan')

    if (action === 'change_plan') {
      if (previousPlan && newPlan) {
        return t('subscription.paymentDescChangePlan', {
          from: previousPlan,
          to: newPlan,
        })
      }
      if (newPlan) {
        return t('subscription.paymentDescChangePlanTo', { to: newPlan })
      }
      return t('subscription.paymentDescActionChangePlan')
    }

    if (action === 'subscribe') {
      return t('subscription.paymentDescSubscribe', {
        plan: newPlan || previousPlan || unknownPlan,
      })
    }

    return t('subscription.paymentDescActionGeneric', {
      action: action || t('subscription.paymentDescUnknownAction'),
    })
  }

  if (text.includes(';')) {
    return text
      .split(';')
      .map((part) => part.trim())
      .filter(Boolean)
      .join(' • ')
  }

  return text
}

function PaymentStatusBadge({ status, t }) {
  const map = {
    succeeded: {
      label: t('subscription.paymentSucceeded'),
      cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
    },
    failed: {
      label: t('subscription.paymentFailed'),
      cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    },
  }
  const info = map[status] || {
    label: t('subscription.paymentPending'),
    cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
  }

  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${info.cls}`}
    >
      {info.label}
    </span>
  )
}

/* ── PaymentsPage ───────────────────────────────────────────────────── */

export default function PaymentsPage() {
  const { auth } = useAuth()
  const { t } = useI18n()

  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [offset, setOffset] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const PAGE_SIZE = 20

  const fetchPayments = useCallback(
    async (newOffset = 0) => {
      setLoading(true)
      try {
        const res = await gameApi.getMyPayments(auth.token, {
          limit: PAGE_SIZE,
          offset: newOffset,
        })
        const list = res?.payments || []
        setPayments(list)
        setOffset(newOffset)
        setHasMore(list.length === PAGE_SIZE)
      } catch {
        /* ignore */
      }
      setLoading(false)
    },
    [auth.token],
  )

  useEffect(() => {
    fetchPayments(0)
  }, [fetchPayments])

  if (loading && payments.length === 0) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold text-navy-900 dark:text-white">
          {t('account.paymentsTitle')}
        </h2>
        <p className="text-sm text-navy-500 dark:text-slate-400 mt-0.5">
          {t('account.paymentsDesc')}
        </p>
      </div>

      {payments.length === 0 ? (
        <div className="rounded-xl border border-warm-200 bg-white dark:bg-slate-900 dark:border-slate-700 p-8 text-center">
          <p className="text-sm text-navy-500 dark:text-slate-400">
            {t('subscription.noPayments')}
          </p>
          <Link
            to="/account/subscription"
            className="mt-3 inline-block text-sm font-medium text-brand-600 hover:underline"
          >
            {t('subscription.viewSubscription')} &rarr;
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-warm-200 bg-white dark:bg-slate-900 dark:border-slate-700 shadow-sm overflow-hidden">
          <div className="divide-y divide-warm-100 dark:divide-slate-700">
            {payments.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between px-5 py-4"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                      p.status === 'succeeded'
                        ? 'bg-emerald-100 dark:bg-emerald-900/30'
                        : p.status === 'failed'
                          ? 'bg-red-100 dark:bg-red-900/30'
                          : 'bg-amber-100 dark:bg-amber-900/30'
                    }`}
                  >
                    {p.status === 'succeeded' ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-600 dark:text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    ) : p.status === 'failed' ? (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-600 dark:text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                      </svg>
                    ) : (
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-amber-600 dark:text-amber-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-navy-700 dark:text-slate-300 break-words leading-relaxed">
                      {formatPaymentDescription(p.description, t) ||
                        (p.type === 'subscription'
                          ? t('subscription.paymentSubscription')
                          : t('subscription.paymentTopup'))}
                    </p>
                    <p className="text-xs text-navy-400 dark:text-slate-500">
                      {p.created_at
                        ? new Date(p.created_at).toLocaleDateString(undefined, {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })
                        : '\u2014'}
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0 ml-3">
                  <p
                    className={`text-sm font-semibold ${
                      p.status === 'failed'
                        ? 'text-red-600 dark:text-red-400'
                        : 'text-navy-900 dark:text-white'
                    }`}
                  >
                    {formatCents(p.amount_cents, p.currency)}
                  </p>
                  <PaymentStatusBadge status={p.status} t={t} />
                </div>
              </div>
            ))}
          </div>

          {/* Pagination */}
          {(offset > 0 || hasMore) && (
            <div className="flex items-center justify-between border-t border-warm-200 dark:border-slate-700 px-5 py-3">
              <button
                type="button"
                onClick={() => fetchPayments(Math.max(0, offset - PAGE_SIZE))}
                disabled={offset === 0 || loading}
                className="text-sm text-brand-600 hover:underline disabled:opacity-40 disabled:no-underline"
              >
                &larr; {t('account.previousPage')}
              </button>
              <button
                type="button"
                onClick={() => fetchPayments(offset + PAGE_SIZE)}
                disabled={!hasMore || loading}
                className="text-sm text-brand-600 hover:underline disabled:opacity-40 disabled:no-underline"
              >
                {t('account.nextPage')} &rarr;
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
