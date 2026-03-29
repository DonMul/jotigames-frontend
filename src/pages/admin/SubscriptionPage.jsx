import { useEffect, useState, useCallback, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { loadStripe } from '@stripe/stripe-js'
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js'

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

/* ── small presentational components ────────────────────────────────── */

function MinuteBar({ used, total, t }) {
  const pct = total > 0 ? Math.min((used / total) * 100, 100) : 0
  const remaining = total - used
  const color =
    pct > 90 ? 'bg-red-500' : pct > 70 ? 'bg-amber-500' : 'bg-emerald-500'

  return (
    <div className="space-y-1">
      <p className="text-sm font-medium text-gray-700 dark:text-slate-300">
        {t('subscription.monthlyMinutes')}
      </p>
      <div className="w-full h-3 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full ${color} rounded-full transition-all duration-500`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-xs text-gray-500 dark:text-slate-400">
        {t('subscription.remaining', {
          remaining: remaining.toLocaleString(),
          total: total.toLocaleString(),
        })}
      </p>
    </div>
  )
}

function PaymentStatusBadge({ status, t }) {
  const variants = {
    succeeded: {
      cls: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
      label: t('subscription.paymentSucceeded'),
    },
    failed: {
      cls: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
      label: t('subscription.paymentFailed'),
    },
    pending: {
      cls: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
      label: t('subscription.paymentPending'),
    },
  }
  const v = variants[status] || {
    cls: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
    label: status,
  }
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${v.cls}`}
    >
      {v.label}
    </span>
  )
}

/* ── Stripe card form (rendered inside <Elements>) ──────────────────── */

const CARD_ELEMENT_OPTIONS = {
  style: {
    base: {
      fontSize: '16px',
      color: '#1e293b',
      fontFamily: 'Inter, system-ui, sans-serif',
      '::placeholder': { color: '#94a3b8' },
    },
    invalid: { color: '#dc2626' },
  },
}

function StripeCardForm({ onSubmit, loading, label, t }) {
  const stripe = useStripe()
  const elements = useElements()
  const [cardError, setCardError] = useState('')

  async function handleSubmit(e) {
    e.preventDefault()
    if (!stripe || !elements) return

    setCardError('')
    const cardElement = elements.getElement(CardElement)
    const { error, paymentMethod } = await stripe.createPaymentMethod({
      type: 'card',
      card: cardElement,
    })

    if (error) {
      setCardError(error.message)
      return
    }

    onSubmit(paymentMethod.id)
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="border border-gray-300 dark:border-slate-600 rounded-lg p-3 bg-white dark:bg-slate-900">
        <CardElement options={CARD_ELEMENT_OPTIONS} />
      </div>
      {cardError && (
        <p className="text-sm text-red-600 dark:text-red-400">{cardError}</p>
      )}
      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full px-4 py-2.5 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
      >
        {loading ? t('subscription.processing') : label}
      </button>
    </form>
  )
}

/* ── Payment modal overlay ──────────────────────────────────────────── */

function PaymentModal({
  open,
  onClose,
  stripePromise,
  title,
  description,
  submitLabel,
  onSubmit,
  loading,
  t,
}) {
  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      {/* dialog */}
      <div className="relative w-full max-w-md bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              {title}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-slate-300"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-5 w-5"
                viewBox="0 0 20 20"
                fill="currentColor"
              >
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          </div>
          {description && (
            <p className="text-sm text-gray-500 dark:text-slate-400">
              {description}
            </p>
          )}
          <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-slate-500">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-4 w-4"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                clipRule="evenodd"
              />
            </svg>
            {t('subscription.stripeSecure')}
          </div>
          {stripePromise ? (
            <Elements stripe={stripePromise}>
              <StripeCardForm
                onSubmit={onSubmit}
                loading={loading}
                label={submitLabel}
                t={t}
              />
            </Elements>
          ) : (
            <p className="text-sm text-red-600">
              {t('subscription.stripeNotConfigured')}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

/* ── Payment history section ────────────────────────────────────────── */

function PaymentHistorySection({ token, t }) {
  const [payments, setPayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState(false)

  const fetchPayments = useCallback(async () => {
    setLoading(true)
    try {
      const res = await gameApi.getMyPayments(token, { limit: 20 })
      setPayments(res?.payments || [])
    } catch {
      /* ignore */
    }
    setLoading(false)
  }, [token])

  useEffect(() => {
    fetchPayments()
  }, [fetchPayments])

  if (loading) {
    return (
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 shadow-sm">
        <div className="animate-pulse space-y-3">
          <div className="h-5 bg-gray-200 dark:bg-slate-700 rounded w-1/3" />
          <div className="h-16 bg-gray-200 dark:bg-slate-700 rounded" />
        </div>
      </div>
    )
  }

  if (payments.length === 0) return null

  return (
    <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 shadow-sm overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 dark:hover:bg-slate-750 transition-colors"
      >
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('subscription.paymentHistory')}
          </h2>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">
            {t('subscription.paymentHistoryDesc')}
          </p>
        </div>
        <svg
          xmlns="http://www.w3.org/2000/svg"
          className={`h-5 w-5 text-gray-400 transition-transform duration-200 ${expanded ? 'rotate-180' : ''}`}
          viewBox="0 0 20 20"
          fill="currentColor"
        >
          <path
            fillRule="evenodd"
            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
            clipRule="evenodd"
          />
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-gray-200 dark:border-slate-700 divide-y divide-gray-100 dark:divide-slate-700">
          {payments.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between px-6 py-4"
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
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 text-emerald-600 dark:text-emerald-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  ) : (
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      className="h-4 w-4 text-red-600 dark:text-red-400"
                      viewBox="0 0 20 20"
                      fill="currentColor"
                    >
                      <path
                        fillRule="evenodd"
                        d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-700 dark:text-slate-300 truncate">
                    {p.description ||
                      (p.type === 'subscription'
                        ? t('subscription.paymentSubscription')
                        : t('subscription.paymentTopup'))}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-slate-500">
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
                    p.status === 'succeeded'
                      ? 'text-gray-900 dark:text-white'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {formatCents(p.amount_cents, p.currency)}
                </p>
                <PaymentStatusBadge status={p.status} t={t} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ── Main page ──────────────────────────────────────────────────────── */

export default function SubscriptionPage() {
  const { auth } = useAuth()
  const { t } = useI18n()
  const [summary, setSummary] = useState(null)
  const [plans, setPlans] = useState([])
  const [topupPackages, setTopupPackages] = useState([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  // Stripe state
  const [stripePublishableKey, setStripePublishableKey] = useState(null)
  const [paymentModal, setPaymentModal] = useState(null) // { type, slug, packageId, title, description, label }

  // Memoize Stripe promise so it only loads once per key
  const stripePromise = useMemo(
    () => (stripePublishableKey ? loadStripe(stripePublishableKey) : null),
    [stripePublishableKey],
  )

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [statusRes, sub, planRes, pkgRes] = await Promise.all([
        gameApi.getMonetisationStatus(),
        gameApi.getMySubscription(auth.token),
        gameApi.getSubscriptionPlans(auth.token),
        gameApi.getTopupPackages(auth.token),
      ])
      if (statusRes?.stripe_publishable_key) {
        setStripePublishableKey(statusRes.stripe_publishable_key)
      }
      setSummary(sub)
      setPlans(planRes?.plans || [])
      setTopupPackages(pkgRes?.packages || [])
    } catch (err) {
      setErrorMsg(err.message || t('subscription.loadFailed'))
    }
    setLoading(false)
  }, [auth.token, t])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  function flash(msg) {
    setSuccessMsg(msg)
    setTimeout(() => setSuccessMsg(''), 4000)
  }

  // ── Action handlers ────────────────────────────────────────────────

  async function doSubscribe(planSlug, paymentMethodId) {
    setActionLoading(true)
    setErrorMsg('')
    try {
      const body = { plan_slug: planSlug }
      if (paymentMethodId) body.stripe_payment_method_id = paymentMethodId
      const response = await gameApi.subscribeToPlan(auth.token, body)
      const paymentUrl = response?.result?.payment_url
      if (paymentUrl) {
        window.location.assign(paymentUrl)
        return
      }
      setPaymentModal(null)
      flash(t('subscription.subscribedFlash', { plan: planSlug }))
      fetchData()
    } catch (err) {
      setErrorMsg(err.message)
    }
    setActionLoading(false)
  }

  async function doChangePlan(planSlug, paymentMethodId) {
    setActionLoading(true)
    setErrorMsg('')
    try {
      const body = { plan_slug: planSlug }
      if (paymentMethodId) body.stripe_payment_method_id = paymentMethodId
      const response = await gameApi.changePlan(auth.token, body)
      const paymentUrl = response?.result?.payment_url
      if (paymentUrl) {
        window.location.assign(paymentUrl)
        return
      }
      setPaymentModal(null)
      flash(t('subscription.changedFlash', { plan: planSlug }))
      fetchData()
    } catch (err) {
      setErrorMsg(err.message)
    }
    setActionLoading(false)
  }

  async function doTopup(packageId, paymentMethodId) {
    setActionLoading(true)
    setErrorMsg('')
    try {
      const body = { package_id: packageId }
      if (paymentMethodId) body.stripe_payment_method_id = paymentMethodId
      await gameApi.purchaseTopup(auth.token, body)
      setPaymentModal(null)
      flash(t('subscription.topupPurchasedFlash'))
      fetchData()
    } catch (err) {
      setErrorMsg(err.message)
    }
    setActionLoading(false)
  }

  // Called by plan cards — opens payment modal for paid, subscribes directly for free
  function handleSubscribe(plan) {
    doSubscribe(plan.slug, null)
  }

  function handleChangePlan(plan) {
    doChangePlan(plan.slug, null)
  }

  function handlePurchaseTopup(pkg) {
    if (stripePromise) {
      setPaymentModal({
        type: 'topup',
        packageId: pkg.id,
        title: t('subscription.paymentModalTitle'),
        description: t('subscription.paymentModalTopupDesc', {
          name: pkg.name,
          minutes: pkg.minutes.toLocaleString(),
          price: formatCents(pkg.price_cents, pkg.currency),
        }),
        label: t('subscription.payAndPurchase', {
          price: formatCents(pkg.price_cents, pkg.currency),
        }),
      })
    } else {
      doTopup(pkg.id, null)
    }
  }

  function handlePaymentSubmit(paymentMethodId) {
    if (!paymentModal) return
    if (paymentModal.type === 'subscribe') {
      doSubscribe(paymentModal.slug, paymentMethodId)
    } else if (paymentModal.type === 'change') {
      doChangePlan(paymentModal.slug, paymentMethodId)
    } else if (paymentModal.type === 'topup') {
      doTopup(paymentModal.packageId, paymentMethodId)
    }
  }

  async function handleCancel() {
    if (!window.confirm(t('subscription.cancelConfirm'))) return
    setActionLoading(true)
    setErrorMsg('')
    try {
      await gameApi.cancelSubscription(auth.token, { immediate: false })
      flash(t('subscription.cancelledFlash'))
      fetchData()
    } catch (err) {
      setErrorMsg(err.message)
    }
    setActionLoading(false)
  }

  async function handleReactivate() {
    setActionLoading(true)
    setErrorMsg('')
    try {
      await gameApi.reactivateSubscription(auth.token)
      flash(t('subscription.reactivatedFlash'))
      fetchData()
    } catch (err) {
      setErrorMsg(err.message)
    }
    setActionLoading(false)
  }

  // ── Render ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 dark:bg-slate-700 rounded w-1/3" />
          <div className="h-32 bg-gray-200 dark:bg-slate-700 rounded" />
          <div className="h-24 bg-gray-200 dark:bg-slate-700 rounded" />
        </div>
      </div>
    )
  }

  if (summary && !summary.monetisation_enabled) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
          {t('subscription.title')}
        </h1>
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <p className="text-blue-800 dark:text-blue-300">
            {t('subscription.freeForNow')}
          </p>
        </div>
        <Link
          to="/admin/games"
          className="mt-4 inline-block text-sm text-blue-600 hover:underline"
        >
          &larr; {t('subscription.backToGames')}
        </Link>
      </div>
    )
  }

  const currentPlan = summary?.plan
  const balance = summary?.balance || {}
  const topupMinutes = summary?.topup_minutes_remaining || 0
  const sub = summary?.subscription
  const isUnlimited = currentPlan && currentPlan.monthly_minutes === null
  const pendingCancel = sub?.cancel_at_period_end

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">
          {t('subscription.title')}
        </h1>
        <Link
          to="/admin/games"
          className="text-sm text-blue-600 hover:underline"
        >
          &larr; {t('subscription.backToGames')}
        </Link>
      </div>

      {/* Alerts */}
      {successMsg && (
        <div className="flash flash-success bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-300 dark:border-emerald-700 rounded-lg p-3 text-emerald-800 dark:text-emerald-300 text-sm">
          {successMsg}
        </div>
      )}
      {errorMsg && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-300 dark:border-red-700 rounded-lg p-3 text-red-800 dark:text-red-300 text-sm">
          {errorMsg}
          <button onClick={() => setErrorMsg('')} className="ml-2 underline">
            {t('subscription.dismiss')}
          </button>
        </div>
      )}

      {/* Current Subscription Card */}
      <div className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
          {t('subscription.currentPlan')}
        </h2>

        {currentPlan ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                {currentPlan.name}
              </span>
              {currentPlan.price_cents > 0 && (
                <span className="text-sm text-gray-500">
                  {formatCents(currentPlan.price_cents, currentPlan.currency)}/
                  {t('subscription.perMonth')}
                </span>
              )}
              {pendingCancel && (
                <span className="inline-flex items-center rounded-full bg-orange-100 dark:bg-orange-900/30 px-2 py-0.5 text-xs font-medium text-orange-700 dark:text-orange-400">
                  {t('subscription.cancellingAtPeriodEnd')}
                </span>
              )}
            </div>

            {/* Balance */}
            {!isUnlimited && (
              <MinuteBar
                used={balance.minutes_used || 0}
                total={balance.minutes_allocated || 0}
                t={t}
              />
            )}
            {isUnlimited && (
              <p className="text-sm text-emerald-600 dark:text-emerald-400 font-medium">
                {t('subscription.unlimitedMinutes')}
              </p>
            )}

            {topupMinutes > 0 && (
              <p className="text-sm text-gray-600 dark:text-slate-400">
                {t('subscription.topupRemaining', {
                  count: topupMinutes.toLocaleString(),
                })}
              </p>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2 flex-wrap">
              {pendingCancel ? (
                <button
                  onClick={handleReactivate}
                  disabled={actionLoading}
                  className="px-4 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
                >
                  {actionLoading
                    ? t('subscription.processing')
                    : t('subscription.reactivate')}
                </button>
              ) : sub?.status === 'active' && currentPlan.price_cents > 0 ? (
                <button
                  onClick={handleCancel}
                  disabled={actionLoading}
                  className="px-4 py-2 text-sm font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {actionLoading
                    ? t('subscription.processing')
                    : t('subscription.cancelSubscription')}
                </button>
              ) : null}
            </div>
          </div>
        ) : (
          <p className="text-gray-500 dark:text-slate-400">
            {t('subscription.noPlan')}
          </p>
        )}
      </div>

      {/* Plans Grid */}
      <div>
        <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
          {t('subscription.availablePlans')}
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {plans.map((plan) => {
            const isCurrent = currentPlan?.slug === plan.slug
            return (
              <div
                key={plan.id}
                className={`bg-white dark:bg-slate-800 rounded-xl border p-5 transition-shadow ${
                  isCurrent
                    ? 'border-blue-500 dark:border-blue-400 shadow-md ring-2 ring-blue-200 dark:ring-blue-900'
                    : 'border-gray-200 dark:border-slate-700 hover:shadow-md'
                }`}
              >
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                  {plan.name}
                </h3>
                <p className="text-2xl font-extrabold mt-2 text-gray-900 dark:text-white">
                  {plan.price_cents === 0
                    ? t('subscription.free')
                    : formatCents(plan.price_cents, plan.currency)}
                </p>
                {plan.price_cents > 0 && (
                  <p className="text-xs text-gray-500">
                    {t('subscription.perMonth')}
                  </p>
                )}
                <p className="text-sm text-gray-600 dark:text-slate-400 mt-2">
                  {plan.monthly_minutes === null
                    ? t('subscription.unlimitedMinutes')
                    : t('subscription.minutesPerMonth', {
                        count: plan.monthly_minutes.toLocaleString(),
                      })}
                </p>
                <div className="mt-4">
                  {isCurrent ? (
                    <span className="block text-center text-sm font-medium text-blue-600 dark:text-blue-400">
                      {t('subscription.currentPlanBadge')}
                    </span>
                  ) : currentPlan ? (
                    <button
                      onClick={() => handleChangePlan(plan)}
                      disabled={actionLoading}
                      className="w-full px-3 py-2 text-sm font-medium bg-gray-100 dark:bg-slate-700 text-gray-900 dark:text-white rounded-lg hover:bg-gray-200 dark:hover:bg-slate-600 disabled:opacity-50"
                    >
                      {actionLoading ? '\u2026' : t('subscription.switchPlan')}
                    </button>
                  ) : (
                    <button
                      onClick={() => handleSubscribe(plan)}
                      disabled={actionLoading}
                      className="w-full px-3 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {actionLoading
                        ? '\u2026'
                        : t('subscription.selectPlan')}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Top-up Packages */}
      {topupPackages.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
            {t('subscription.topupPackages')}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {topupPackages.map((pkg) => (
              <div
                key={pkg.id}
                className="bg-white dark:bg-slate-800 rounded-xl border border-gray-200 dark:border-slate-700 p-5"
              >
                <h3 className="font-semibold text-gray-900 dark:text-white">
                  {pkg.name}
                </h3>
                <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">
                  {t('subscription.topupMinutes', {
                    count: pkg.minutes.toLocaleString(),
                  })}
                </p>
                <p className="text-lg font-bold mt-2 text-gray-900 dark:text-white">
                  {formatCents(pkg.price_cents, pkg.currency)}
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {t('subscription.topupValidity')}
                </p>
                <button
                  onClick={() => handlePurchaseTopup(pkg)}
                  disabled={actionLoading}
                  className="mt-3 w-full px-3 py-2 text-sm font-medium bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50"
                >
                  {actionLoading ? '\u2026' : t('subscription.purchase')}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Payment History */}
      <PaymentHistorySection token={auth.token} t={t} />

      {/* Payment Modal */}
      <PaymentModal
        open={!!paymentModal}
        onClose={() => setPaymentModal(null)}
        stripePromise={stripePromise}
        title={paymentModal?.title || ''}
        description={paymentModal?.description || ''}
        submitLabel={paymentModal?.label || ''}
        onSubmit={handlePaymentSubmit}
        loading={actionLoading}
        t={t}
      />
    </div>
  )
}
