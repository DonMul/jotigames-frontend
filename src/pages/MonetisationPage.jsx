import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'

import { gameApi } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useI18n } from '../lib/i18n'

function formatCents(cents, currency = 'EUR') {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: String(currency || 'EUR').toUpperCase(),
    maximumFractionDigits: 2,
  }).format((Number(cents) || 0) / 100)
}

function planOrderValue(plan) {
  const sortOrder = Number(plan?.sort_order)
  if (!Number.isNaN(sortOrder)) return sortOrder
  return 999
}

function minutesText(minutes, t) {
  if (minutes === null || minutes === undefined) return t('monetisation.unlimitedMinutes')
  return t('monetisation.minutesPerMonth', { minutes: Number(minutes).toLocaleString('nl-NL') })
}

function monthlyMinutesForPlan(plan) {
  if (!plan) return 0
  if (plan.monthly_minutes === null || plan.monthly_minutes === undefined) return Number.POSITIVE_INFINITY
  return Number(plan.monthly_minutes) || 0
}

function recommendationOrder(plans) {
  return [...plans].sort((a, b) => {
    const aPrice = Number(a?.price_cents) || 0
    const bPrice = Number(b?.price_cents) || 0
    if (aPrice !== bPrice) return aPrice - bPrice
    return planOrderValue(a) - planOrderValue(b)
  })
}

export default function MonetisationPage() {
  const { isAuthenticated } = useAuth()
  const { t } = useI18n()
  const [plans, setPlans] = useState([])
  const [isMonetisationEnabled, setIsMonetisationEnabled] = useState(true)
  const [loadingPlans, setLoadingPlans] = useState(true)
  const [calculatorTeams, setCalculatorTeams] = useState(5)
  const [calculatorHours, setCalculatorHours] = useState(2)

  const calculatorMinutes = useMemo(() => {
    const teams = Math.max(0, Number(calculatorTeams) || 0)
    const hours = Math.max(0, Number(calculatorHours) || 0)
    return Math.ceil(teams * hours * 60)
  }, [calculatorHours, calculatorTeams])

  const recommendedPlan = useMemo(() => {
    if (!plans.length) return null

    const sortedPlans = recommendationOrder(plans)
    const bufferedMinutes = Math.ceil(calculatorMinutes * 1.2)

    const baseline = sortedPlans.find((plan) => monthlyMinutesForPlan(plan) >= bufferedMinutes) || sortedPlans[sortedPlans.length - 1]
    const baselineMinutes = monthlyMinutesForPlan(baseline)
    if (!Number.isFinite(baselineMinutes) || baselineMinutes <= 0) {
      return baseline
    }

    const usageRatio = bufferedMinutes / baselineMinutes
    const baselineIndex = sortedPlans.findIndex((plan) => plan.id === baseline.id)
    const nextTier = sortedPlans
      .slice(baselineIndex + 1)
      .find((plan) => (Number(plan?.price_cents) || 0) > (Number(baseline?.price_cents) || 0))

    // Upsell only when the baseline would already be quite tight.
    if (usageRatio >= 0.85 && nextTier) {
      return nextTier
    }

    return baseline
  }, [calculatorMinutes, plans])

  useEffect(() => {
    let cancelled = false

    async function loadPlans() {
      setLoadingPlans(true)
      try {
        const [statusResponse, plansResponse] = await Promise.all([
          gameApi.getMonetisationStatus(),
          gameApi.getSubscriptionPlans(undefined),
        ])
        const monetisationEnabled = Boolean(statusResponse?.enabled)
        const offeredPlans = Array.isArray(plansResponse?.plans) ? plansResponse.plans : []
        if (!cancelled) {
          setIsMonetisationEnabled(monetisationEnabled)
          setPlans(offeredPlans.filter((p) => p?.is_active).sort((a, b) => planOrderValue(a) - planOrderValue(b)))
        }
      } catch {
        if (!cancelled) {
          setIsMonetisationEnabled(false)
          setPlans([])
        }
      } finally {
        if (!cancelled) setLoadingPlans(false)
      }
    }

    loadPlans()
    return () => { cancelled = true }
  }, [])

  const usageExamples = useMemo(() => [
    {
      key: 'exampleOne',
      minutes: 600,
      durationHours: 2,
      teams: 5,
      gamesAtOnce: 1,
      extra: t('monetisation.exampleOneExtra'),
    },
    {
      key: 'exampleTwo',
      minutes: 3000,
      durationHours: 3,
      teams: 8,
      gamesAtOnce: 2,
      extra: t('monetisation.exampleTwoExtra'),
    },
    {
      key: 'exampleThree',
      minutes: 10000,
      durationHours: 4,
      teams: 12,
      gamesAtOnce: 2,
      extra: t('monetisation.exampleThreeExtra'),
    },
  ], [t])

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(249,115,22,.2),transparent_50%)]" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="max-w-3xl">
            <span className="inline-flex items-center rounded-full bg-white/10 backdrop-blur-sm px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-300 mb-6">
              {t('monetisation.badge')}
            </span>
            <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight leading-tight">
              {t('monetisation.title')}
            </h1>
            <p className="mt-6 text-lg sm:text-xl text-navy-200 leading-relaxed">
              {t('monetisation.subtitle')}
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link to={isAuthenticated ? '/admin/subscription' : '/register'} className="inline-flex items-center rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 hover:bg-brand-600 transition-all">
                {isAuthenticated ? t('monetisation.ctaManageSubscription') : t('monetisation.ctaStart')}
              </Link>
              <Link to="/faq" className="inline-flex items-center rounded-full border border-white/30 px-6 py-3 text-sm font-semibold text-white hover:border-white hover:bg-white/10 transition-all">
                {t('monetisation.ctaFaq')}
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20 bg-warm-50/70">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-3xl mb-8">
            <h2 className="font-display text-3xl font-bold text-navy-900">{t('monetisation.plansTitle')}</h2>
            <p className="mt-3 text-navy-600">{t('monetisation.plansSubtitle')}</p>
          </div>

          <div className="mb-8 rounded-2xl border border-brand-200 bg-white p-6 sm:p-8 shadow-sm">
            <h3 className="font-display text-2xl font-bold text-navy-900">{t('monetisation.calculatorTitle')}</h3>
            <p className="mt-2 text-sm text-navy-600">{t('monetisation.calculatorSubtitle')}</p>
            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-navy-500">{t('monetisation.calculatorTeams')}</span>
                <input
                  type="number"
                  min="1"
                  step="1"
                  value={calculatorTeams}
                  onChange={(event) => setCalculatorTeams(event.target.value)}
                  className="w-full rounded-lg border border-warm-300 px-3 py-2 text-navy-900 outline-none focus:border-brand-400"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-navy-500">{t('monetisation.calculatorHours')}</span>
                <input
                  type="number"
                  min="1"
                  step="0.5"
                  value={calculatorHours}
                  onChange={(event) => setCalculatorHours(event.target.value)}
                  className="w-full rounded-lg border border-warm-300 px-3 py-2 text-navy-900 outline-none focus:border-brand-400"
                />
              </label>
            </div>
            <div className="mt-5 rounded-xl bg-brand-50 border border-brand-100 p-4">
              <p className="text-sm text-navy-700">
                {t('monetisation.calculatorMinutesResult', { minutes: calculatorMinutes.toLocaleString('nl-NL') })}
              </p>
              {recommendedPlan ? (
                <p className="mt-2 text-base font-semibold text-brand-700">
                  {t('monetisation.calculatorRecommendation', { plan: recommendedPlan.name })}
                </p>
              ) : null}
              <p className="mt-2 text-xs text-navy-500">{t('monetisation.calculatorUpsellHint')}</p>
            </div>
          </div>

          {loadingPlans ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              {[1, 2, 3, 4].map((item) => (
                <div key={item} className="h-60 rounded-2xl border border-warm-200 bg-white animate-pulse" />
              ))}
            </div>
          ) : plans.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
              {plans.map((plan) => (
                <article key={plan.id} className={`rounded-2xl border bg-white p-6 shadow-sm hover:shadow-lg transition-all ${recommendedPlan?.id === plan.id ? 'border-brand-400 ring-2 ring-brand-100' : 'border-warm-200 hover:border-brand-200'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="font-display text-2xl font-bold text-navy-900">{plan.name}</h3>
                    <div className="flex flex-col gap-1 items-end">
                      {plan.is_default ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-1 text-xs font-semibold text-emerald-700">{t('monetisation.defaultPackage')}</span>
                      ) : null}
                      {recommendedPlan?.id === plan.id ? (
                        <span className="inline-flex items-center rounded-full bg-brand-100 px-2.5 py-1 text-xs font-semibold text-brand-700">{t('monetisation.recommended')}</span>
                      ) : null}
                    </div>
                  </div>
                  <p className="mt-4 text-3xl font-bold text-navy-900">
                    {plan.price_cents > 0 ? formatCents(plan.price_cents, plan.currency) : t('monetisation.free')}
                    <span className="ml-1 text-sm font-medium text-navy-500">{t('monetisation.perMonth')}</span>
                  </p>
                  <p className="mt-3 text-sm font-medium text-brand-700 bg-brand-50 rounded-lg px-3 py-2 inline-flex">
                    {minutesText(plan.monthly_minutes, t)}
                  </p>
                  <p className="mt-4 text-sm text-navy-600 leading-relaxed">
                    {t('monetisation.planPitch', { name: plan.name })}
                  </p>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-warm-200 bg-white p-8 text-center text-navy-600">
              {isMonetisationEnabled ? t('monetisation.noPlansFallback') : t('monetisation.disabledFallback')}
            </div>
          )}
        </div>
      </section>

      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-12 items-start">
            <div className="rounded-2xl border border-warm-200 bg-white p-8 shadow-sm">
              <h2 className="font-display text-3xl font-bold text-navy-900">{t('monetisation.howItWorksTitle')}</h2>
              <p className="mt-4 text-navy-600 leading-relaxed">{t('monetisation.howItWorksBody')}</p>
              <div className="mt-6 rounded-xl bg-navy-900 p-5 text-white">
                <p className="text-xs uppercase tracking-wide text-brand-300 font-semibold">{t('monetisation.formulaLabel')}</p>
                <p className="mt-2 text-lg font-semibold">{t('monetisation.formula')}</p>
              </div>
              <ul className="mt-6 space-y-3 text-sm text-navy-600">
                <li className="flex gap-2"><span className="mt-1 h-2 w-2 rounded-full bg-brand-500" />{t('monetisation.factOne')}</li>
                <li className="flex gap-2"><span className="mt-1 h-2 w-2 rounded-full bg-brand-500" />{t('monetisation.factTwo')}</li>
                <li className="flex gap-2"><span className="mt-1 h-2 w-2 rounded-full bg-brand-500" />{t('monetisation.factThree')}</li>
              </ul>
            </div>

            <div className="space-y-4">
              <h3 className="font-display text-2xl font-bold text-navy-900">{t('monetisation.examplesTitle')}</h3>
              {usageExamples.map((example) => (
                <div key={example.key} className="rounded-2xl border border-warm-200 bg-white p-6 shadow-sm">
                  <p className="text-sm font-semibold text-brand-700">{t(`monetisation.${example.key}Title`)}</p>
                  <p className="mt-2 text-lg font-bold text-navy-900">{t(`monetisation.${example.key}Headline`, { minutes: example.minutes.toLocaleString('nl-NL') })}</p>
                  <p className="mt-2 text-sm text-navy-600">{t(`monetisation.${example.key}Math`, {
                    hours: example.durationHours,
                    teams: example.teams,
                    games: example.gamesAtOnce,
                    total: Number(example.durationHours * 60 * example.teams * example.gamesAtOnce).toLocaleString('nl-NL'),
                  })}</p>
                  <p className="mt-2 text-sm text-navy-500">{example.extra}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="py-16 sm:py-20 bg-gradient-to-b from-warm-50 to-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-navy-900">{t('monetisation.bottomTitle')}</h2>
          <p className="mt-4 text-lg text-navy-600">{t('monetisation.bottomText')}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link to={isAuthenticated ? '/admin/games' : '/register'} className="inline-flex items-center rounded-full bg-brand-500 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 hover:bg-brand-600 transition-all">
              {isAuthenticated ? t('monetisation.bottomCtaAuthenticated') : t('monetisation.bottomCtaRegister')}
            </Link>
            <Link to="/team-login" className="inline-flex items-center rounded-full border border-navy-200 px-8 py-3 text-sm font-semibold text-navy-700 hover:border-brand-300 hover:text-brand-600 transition-all">
              {t('monetisation.bottomCtaTeam')}
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
