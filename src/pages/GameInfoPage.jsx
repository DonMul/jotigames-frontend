import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'

import DetailedGameInfoPage from '../components/DetailedGameInfoPage'
import { gameApi } from '../lib/api'
import { GAME_BY_SLUG } from '../lib/gameCatalog'
import { useAuth } from '../lib/auth'
import { getDetailedGameInfoConfig } from '../lib/detailedGameInfoContent'
import { useI18n } from '../lib/i18n'

function buildDetailedGameInfoContent(config, t) {
  if (!config?.prefix) {
    return null
  }

  const info = (key) => t(`${config.prefix}.${key}`)

  return {
    theme: config.theme,
    kicker: info('kicker'),
    eyebrow: info('eyebrow'),
    heroText: info('heroText'),
    secondaryCta: info('secondaryCta'),
    panelTitle: t('gameInfoDetailed.panelTitle'),
    panelPoints: [info('panelPointOne'), info('panelPointTwo'), info('panelPointThree')],
    highlights: [
      { value: info('highlightOneValue'), label: info('highlightOneLabel') },
      { value: info('highlightTwoValue'), label: info('highlightTwoLabel') },
      { value: info('highlightThreeValue'), label: info('highlightThreeLabel') },
      { value: info('highlightFourValue'), label: info('highlightFourLabel') },
    ],
    battleKicker: t('gameInfoDetailed.battleKicker'),
    battleTitle: info('battleTitle'),
    battleText: info('battleText'),
    features: [
      { icon: info('featureOneIcon'), title: info('featureOneTitle'), text: info('featureOneText') },
      { icon: info('featureTwoIcon'), title: info('featureTwoTitle'), text: info('featureTwoText') },
      { icon: info('featureThreeIcon'), title: info('featureThreeTitle'), text: info('featureThreeText') },
    ],
    howKicker: t('gameInfoDetailed.howKicker'),
    howTitle: info('howTitle'),
    howText: info('howText'),
    playStylesTitle: t('gameInfoDetailed.playStylesTitle'),
    flow: [
      { number: 1, title: info('flowOneTitle'), text: info('flowOneText') },
      { number: 2, title: info('flowTwoTitle'), text: info('flowTwoText') },
      { number: 3, title: info('flowThreeTitle'), text: info('flowThreeText') },
      { number: 4, title: info('flowFourTitle'), text: info('flowFourText') },
    ],
    playStyles: [info('playStyleOne'), info('playStyleTwo'), info('playStyleThree'), info('playStyleFour')],
    organizerKicker: t('gameInfoDetailed.organizerKicker'),
    organizerTitle: info('organizerTitle'),
    organizerText: info('organizerText'),
    organizerCards: [
      { title: t('gameInfoDetailed.organizerCardOneTitle'), text: t('gameInfoDetailed.organizerCardOneText') },
      { title: t('gameInfoDetailed.organizerCardTwoTitle'), text: t('gameInfoDetailed.organizerCardTwoText') },
      { title: t('gameInfoDetailed.organizerCardThreeTitle'), text: t('gameInfoDetailed.organizerCardThreeText') },
    ],
    perfectForKicker: t('gameInfoDetailed.perfectForKicker'),
    perfectForTitle: info('perfectForTitle'),
    perfectForText: info('perfectForText'),
    perfectFor: [info('perfectForOne'), info('perfectForTwo'), info('perfectForThree'), info('perfectForFour')],
    ctaTitle: info('ctaTitle'),
    ctaText: info('ctaText'),
    ctaSecondary: t('gameInfoDetailed.ctaSecondary'),
  }
}

function buildDefaultFlow(name, t) {
  return [
    { number: 1, title: t('gameInfo.flow1Title'), text: t('gameInfo.flow1Text', { name }) },
    { number: 2, title: t('gameInfo.flow2Title'), text: t('gameInfo.flow2Text') },
    { number: 3, title: t('gameInfo.flow3Title'), text: t('gameInfo.flow3Text') },
  ]
}

function buildOptionCards(name, t) {
  return [
    { title: t('gameInfo.option1Title'), text: t('gameInfo.option1Text', { name }) },
    { title: t('gameInfo.option2Title'), text: t('gameInfo.option2Text') },
    { title: t('gameInfo.option3Title'), text: t('gameInfo.option3Text') },
  ]
}

function buildExampleSections(name, t) {
  return [
    {
      title: t('gameInfo.tabPerfectFor'),
      items: [
        t('gameInfo.perfectForItem1', { name }),
        t('gameInfo.perfectForItem2'),
        t('gameInfo.perfectForItem3'),
        t('gameInfo.perfectForItem4'),
      ],
    },
  ]
}

function buildBirdsOfPreyHighlights(t) {
  return [
    {
      value: t('birds_of_prey.info.highlightVisibilityValue'),
      label: t('birds_of_prey.info.highlightVisibilityLabel'),
    },
    {
      value: t('birds_of_prey.info.highlightProtectionValue'),
      label: t('birds_of_prey.info.highlightProtectionLabel'),
    },
    {
      value: t('birds_of_prey.info.highlightAutoDropValue'),
      label: t('birds_of_prey.info.highlightAutoDropLabel'),
    },
    {
      value: t('birds_of_prey.info.highlightScoreValue'),
      label: t('birds_of_prey.info.highlightScoreLabel'),
    },
  ]
}

function buildBirdsOfPreyFlow(t) {
  return [
    {
      number: 1,
      title: t('birds_of_prey.info.flowScoutTitle'),
      text: t('birds_of_prey.info.flowScoutText'),
    },
    {
      number: 2,
      title: t('birds_of_prey.info.flowDropTitle'),
      text: t('birds_of_prey.info.flowDropText'),
    },
    {
      number: 3,
      title: t('birds_of_prey.info.flowRaidTitle'),
      text: t('birds_of_prey.info.flowRaidText'),
    },
    {
      number: 4,
      title: t('birds_of_prey.info.flowLeadTitle'),
      text: t('birds_of_prey.info.flowLeadText'),
    },
  ]
}

function buildBirdsOfPreyFeatureCards(t) {
  return [
    {
      icon: '🥚',
      title: t('birds_of_prey.info.featureNestsTitle'),
      text: t('birds_of_prey.info.featureNestsText'),
    },
    {
      icon: '🧭',
      title: t('birds_of_prey.info.featureVisibilityTitle'),
      text: t('birds_of_prey.info.featureVisibilityText'),
    },
    {
      icon: '🛡️',
      title: t('birds_of_prey.info.featureProtectionTitle'),
      text: t('birds_of_prey.info.featureProtectionText'),
    },
  ]
}

function buildBirdsOfPreyPlayStyles(t) {
  return [
    t('birds_of_prey.info.playStylePatrol'),
    t('birds_of_prey.info.playStyleRaid'),
    t('birds_of_prey.info.playStyleDecoy'),
    t('birds_of_prey.info.playStyleRecover'),
  ]
}

function buildBirdsOfPreyOrganizerCards(t) {
  return [
    {
      title: t('birds_of_prey.info.organizerConfigTitle'),
      text: t('birds_of_prey.info.organizerConfigText'),
    },
    {
      title: t('birds_of_prey.info.organizerLiveTitle'),
      text: t('birds_of_prey.info.organizerLiveText'),
    },
    {
      title: t('birds_of_prey.info.organizerAccessibleTitle'),
      text: t('birds_of_prey.info.organizerAccessibleText'),
    },
  ]
}

function buildBirdsOfPreyPerfectFor(t) {
  return [
    t('birds_of_prey.info.perfectForWideFields'),
    t('birds_of_prey.info.perfectForMixedAges'),
    t('birds_of_prey.info.perfectForEvening'),
    t('birds_of_prey.info.perfectForCompetitive'),
  ]
}

function BirdsOfPreyInfoPage({ game, gameName, gameSubtitle, isAuthenticated, showPricingCta, t }) {
  const highlights = useMemo(() => buildBirdsOfPreyHighlights(t), [t])
  const flow = useMemo(() => buildBirdsOfPreyFlow(t), [t])
  const featureCards = useMemo(() => buildBirdsOfPreyFeatureCards(t), [t])
  const playStyles = useMemo(() => buildBirdsOfPreyPlayStyles(t), [t])
  const organizerCards = useMemo(() => buildBirdsOfPreyOrganizerCards(t), [t])
  const perfectFor = useMemo(() => buildBirdsOfPreyPerfectFor(t), [t])

  return (
    <>
      <section className="relative overflow-hidden bg-gradient-to-br from-navy-950 via-navy-900 to-navy-800 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,.18),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,.08),transparent_28%)]" />
        <div className="absolute -left-8 top-24 h-28 w-28 rounded-full bg-brand-400/20 blur-3xl animate-float" />
        <div className="absolute right-6 top-16 h-24 w-24 rounded-full bg-emerald-300/10 blur-3xl animate-pulse-glow" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.15fr_.85fr] lg:items-center lg:px-8 lg:py-28">
          <div className="animate-fade-up">
            <span className="inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] text-brand-200 backdrop-blur-sm">
              {t('birds_of_prey.info.kicker')}
            </span>
            <div className="mt-6 flex items-center gap-4">
              <img src={game.logo} alt={gameName} className="h-20 w-20 object-contain drop-shadow-2xl sm:h-24 sm:w-24" />
              <div>
                <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">{gameName}</h1>
                <p className="mt-2 text-sm font-medium uppercase tracking-[0.18em] text-brand-200/90">{t('birds_of_prey.info.eyebrow')}</p>
              </div>
            </div>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-navy-100 sm:text-xl">{gameSubtitle}</p>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-navy-200/90">
              {t('birds_of_prey.info.heroText')}
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              {isAuthenticated ? (
                <Link to="/admin/games" className="inline-flex items-center rounded-full bg-brand-500 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition-all hover:bg-brand-600">
                  {t('birds_of_prey.info.primaryCtaAuthenticated')}
                </Link>
              ) : (
                <Link to="/register" className="inline-flex items-center rounded-full bg-brand-500 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition-all hover:bg-brand-600">
                  {t('birds_of_prey.info.primaryCtaGuest')}
                </Link>
              )}
              <a href="#birds-how-to-play" className="inline-flex items-center rounded-full border border-white/20 bg-white/5 px-7 py-3 text-sm font-semibold text-white transition-all hover:border-brand-300 hover:bg-white/10">
                {t('birds_of_prey.info.secondaryCta')}
              </a>
            </div>
          </div>

          <aside className="animate-slide-in-right">
            <div className="rounded-[2rem] border border-white/10 bg-white/8 p-6 shadow-2xl shadow-navy-950/30 backdrop-blur-sm">
              <div className="rounded-[1.5rem] border border-white/10 bg-navy-950/45 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-brand-200">{t('birds_of_prey.info.panelTitle')}</p>
                <div className="mt-5 space-y-4">
                  {[
                    t('birds_of_prey.info.panelPointOne'),
                    t('birds_of_prey.info.panelPointTwo'),
                    t('birds_of_prey.info.panelPointThree'),
                  ].map((item) => (
                    <div key={item} className="flex gap-3 rounded-2xl border border-white/8 bg-white/5 p-4">
                      <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-brand-300" />
                      <p className="text-sm leading-relaxed text-navy-100">{item}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                {highlights.map((item, index) => (
                  <div key={item.label} className={`rounded-2xl border border-white/10 bg-white/6 p-4 ${index % 2 === 0 ? 'animate-fade-in' : 'animate-fade-up'}`}>
                    <p className="font-display text-2xl font-bold text-white">{item.value}</p>
                    <p className="mt-1 text-xs uppercase tracking-[0.16em] text-navy-200/80">{item.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </aside>
        </div>
      </section>

      <section className="bg-white py-16 sm:py-20 dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="mx-auto max-w-3xl text-center">
            <span className="inline-flex items-center rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-700 dark:bg-brand-900/20 dark:text-brand-300">
              {t('birds_of_prey.info.sectionBattleKicker')}
            </span>
            <h2 className="mt-4 font-display text-3xl font-bold text-navy-900 sm:text-4xl dark:text-white">
              {t('birds_of_prey.info.sectionBattleTitle')}
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-navy-500 dark:text-slate-400">
              {t('birds_of_prey.info.sectionBattleText')}
            </p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {featureCards.map((card) => (
              <article key={card.title} className="group rounded-3xl border border-warm-200 bg-warm-50/70 p-7 transition-all duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-xl hover:shadow-brand-500/10 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-brand-500/50 dark:hover:shadow-black/20">
                <span className="text-3xl">{card.icon}</span>
                <h3 className="mt-4 font-display text-xl font-bold text-navy-900 dark:text-white">{card.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-navy-600 dark:text-slate-300">{card.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="birds-how-to-play" className="bg-gradient-to-b from-warm-50 to-white py-16 sm:py-24 dark:from-slate-900 dark:to-slate-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[.95fr_1.05fr] lg:items-start">
            <div>
              <span className="inline-flex items-center rounded-full bg-white px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-700 shadow-sm ring-1 ring-warm-200 dark:bg-slate-800 dark:text-brand-300 dark:ring-slate-700">
                {t('birds_of_prey.info.sectionHowKicker')}
              </span>
              <h2 className="mt-4 font-display text-3xl font-bold text-navy-900 sm:text-4xl dark:text-white">
                {t('birds_of_prey.info.sectionHowTitle')}
              </h2>
              <p className="mt-4 text-lg leading-relaxed text-navy-500 dark:text-slate-400">
                {t('birds_of_prey.info.sectionHowText')}
              </p>

              <div className="mt-8 rounded-3xl border border-warm-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <h3 className="font-display text-lg font-bold text-navy-900 dark:text-white">{t('birds_of_prey.info.playStylesTitle')}</h3>
                <ul className="mt-4 space-y-3">
                  {playStyles.map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm leading-relaxed text-navy-600 dark:text-slate-300">
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-brand-400" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            <div className="grid gap-5">
              {flow.map((step) => (
                <div key={step.number} className="rounded-3xl border border-warm-200 bg-white p-6 shadow-sm transition-all hover:border-brand-200 hover:shadow-lg dark:border-slate-700 dark:bg-slate-900 dark:hover:border-brand-500/50 dark:hover:shadow-black/20">
                  <div className="flex items-start gap-4">
                    <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand-500 font-display text-lg font-bold text-white shadow-lg shadow-brand-500/20">
                      {step.number}
                    </div>
                    <div>
                      <h3 className="font-display text-lg font-bold text-navy-900 dark:text-white">{step.title}</h3>
                      <p className="mt-2 text-sm leading-relaxed text-navy-600 dark:text-slate-300">{step.text}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-navy-950 py-16 text-white sm:py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[1fr_.9fr] lg:items-start">
            <div>
              <span className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-200">
                {t('birds_of_prey.info.organizerKicker')}
              </span>
              <h2 className="mt-4 font-display text-3xl font-bold sm:text-4xl">
                {t('birds_of_prey.info.organizerTitle')}
              </h2>
              <p className="mt-4 max-w-2xl text-lg leading-relaxed text-navy-200">
                {t('birds_of_prey.info.organizerText')}
              </p>
            </div>

            <div className="grid gap-4">
              {organizerCards.map((card) => (
                <article key={card.title} className="rounded-3xl border border-white/10 bg-white/5 p-6 backdrop-blur-sm">
                  <h3 className="font-display text-xl font-bold text-white">{card.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-navy-200">{card.text}</p>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-16 sm:py-20 dark:bg-slate-950">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-[2rem] border border-warm-200 bg-gradient-to-br from-warm-50 via-white to-brand-50 p-8 shadow-sm sm:p-10 dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
            <div className="grid gap-10 lg:grid-cols-[1.05fr_.95fr] lg:items-center">
              <div>
                <span className="inline-flex items-center rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-brand-700 dark:bg-brand-900/20 dark:text-brand-300">
                  {t('birds_of_prey.info.perfectForKicker')}
                </span>
                <h2 className="mt-4 font-display text-3xl font-bold text-navy-900 dark:text-white">
                  {t('birds_of_prey.info.perfectForTitle')}
                </h2>
                <p className="mt-4 text-base leading-relaxed text-navy-500 dark:text-slate-400">
                  {t('birds_of_prey.info.perfectForText')}
                </p>
              </div>

              <ul className="space-y-4">
                {perfectFor.map((item) => (
                  <li key={item} className="flex items-start gap-3 rounded-2xl border border-white/70 bg-white/80 p-4 text-sm leading-relaxed text-navy-700 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-brand-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-gradient-to-b from-white to-warm-50 py-16 sm:py-20 dark:from-slate-950 dark:to-slate-900">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <h2 className="font-display text-3xl font-bold text-navy-900 sm:text-4xl dark:text-white">
            {t('birds_of_prey.info.ctaTitle')}
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-navy-500 dark:text-slate-400">
            {t('birds_of_prey.info.ctaText')}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            {isAuthenticated ? (
              <Link to="/admin/games" className="inline-flex items-center rounded-full bg-brand-500 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition-all hover:bg-brand-600">
                {t('birds_of_prey.info.ctaPrimaryAuthenticated')}
              </Link>
            ) : (
              <Link to="/register" className="inline-flex items-center rounded-full bg-brand-500 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 transition-all hover:bg-brand-600">
                {t('birds_of_prey.info.ctaPrimaryGuest')}
              </Link>
            )}
            {showPricingCta ? (
              <Link to="/pricing" className="inline-flex items-center rounded-full border-2 border-navy-200 px-8 py-3.5 text-sm font-semibold text-navy-700 transition-all hover:border-brand-300 hover:text-brand-600 dark:border-slate-600 dark:text-slate-200 dark:hover:border-brand-400 dark:hover:text-brand-300">
                {t('birds_of_prey.info.ctaSecondary')}
              </Link>
            ) : null}
          </div>
        </div>
      </section>
    </>
  )
}

export default function GameInfoPage() {
  const { slug } = useParams()
  const { isAuthenticated } = useAuth()
  const { t } = useI18n()
  const game = GAME_BY_SLUG[slug]
  const [activeTab, setActiveTab] = useState('flow')
  const [isMonetisationEnabled, setIsMonetisationEnabled] = useState(false)
  const gameName = game ? t(`gameCatalog.${game.type}.name`) : ''
  const gameShortDescription = game ? t(`gameCatalog.${game.type}.shortDescription`) : ''
  const gameSubtitle = game ? t(`gameCatalog.${game.type}.subtitle`) : ''
  const detailedConfig = useMemo(() => (game ? getDetailedGameInfoConfig(game.type) : null), [game])
  const detailedContent = useMemo(() => buildDetailedGameInfoContent(detailedConfig, t), [detailedConfig, t])

  const flowSteps = useMemo(() => (game ? buildDefaultFlow(gameName, t) : []), [game, gameName, t])
  const optionCards = useMemo(() => (game ? buildOptionCards(gameName, t) : []), [game, gameName, t])
  const exampleSections = useMemo(() => (game ? buildExampleSections(gameName, t) : []), [game, gameName, t])

  useEffect(() => {
    let cancelled = false

    async function loadMonetisationStatus() {
      try {
        const status = await gameApi.getMonetisationStatus()
        if (!cancelled) {
          setIsMonetisationEnabled(Boolean(status?.enabled))
        }
      } catch {
        if (!cancelled) {
          setIsMonetisationEnabled(false)
        }
      }
    }

    loadMonetisationStatus()
    return () => {
      cancelled = true
    }
  }, [])

  if (!game) return <Navigate to="/" replace />

  if (game.type === 'birds_of_prey') {
    return <BirdsOfPreyInfoPage game={game} gameName={gameName} gameSubtitle={gameSubtitle} isAuthenticated={isAuthenticated} showPricingCta={isMonetisationEnabled} t={t} />
  }

  if (detailedContent) {
    return <DetailedGameInfoPage game={game} gameName={gameName} gameSubtitle={gameSubtitle} isAuthenticated={isAuthenticated} showPricingCta={isMonetisationEnabled} t={t} content={detailedContent} />
  }

  const tabs = [
    { id: 'flow', label: t('gameInfo.tabFlow') },
    { id: 'options', label: t('gameInfo.tabModes') },
    { id: 'examples', label: t('gameInfo.tabPerfectFor') },
  ]

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-navy-900 via-navy-800 to-navy-900 text-white">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(249,115,22,.15),transparent_50%)]" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="flex flex-col items-center text-center">
            <span className="inline-flex items-center rounded-full bg-white/10 backdrop-blur-sm px-3 py-1 text-xs font-semibold uppercase tracking-wider text-brand-300 mb-6">
              {t('gameInfo.guide')}
            </span>
            <img src={game.logo} alt={gameName} className="mb-6 h-28 w-28 sm:h-36 sm:w-36 object-contain" />
            <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight">{gameName}</h1>
            <p className="mt-4 text-lg text-navy-200 max-w-2xl">{gameSubtitle}</p>
          </div>
        </div>
      </section>

      {/* What is it */}
      <section className="py-16 sm:py-20 dark:bg-slate-950">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-warm-200 bg-white p-8 sm:p-10 shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <h2 className="font-display text-2xl font-bold text-navy-900 mb-4 dark:text-white">{t('gameInfo.whatIsIt')}</h2>
            <p className="text-navy-600 leading-relaxed mb-3 dark:text-slate-300">{gameShortDescription}</p>
            <p className="text-navy-500 leading-relaxed dark:text-slate-400">{gameSubtitle}</p>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <section className="pb-20 sm:pb-28 dark:bg-slate-950" data-game-info-tabs>
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          {/* Tab bar */}
          <div className="flex justify-center mb-10" role="tablist" aria-label={gameName}>
            <div className="inline-flex rounded-full border border-warm-200 bg-warm-50 p-1 dark:border-slate-700 dark:bg-slate-900">
              {tabs.map((tab) => (
                <button key={tab.id} type="button" role="tab" onClick={() => setActiveTab(tab.id)} className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-brand-500 text-white shadow-sm' : 'text-navy-600 hover:text-navy-900 dark:text-slate-300 dark:hover:text-white'}`}>
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {/* Flow tab */}
          <div role="tabpanel" hidden={activeTab !== 'flow'}>
            <div className="grid sm:grid-cols-3 gap-6">
              {flowSteps.map((step) => (
                <div key={step.number} className="text-center">
                  <div className="mx-auto w-12 h-12 rounded-2xl bg-brand-500 text-white flex items-center justify-center font-display text-lg font-bold shadow-lg shadow-brand-500/25 mb-4">
                    {step.number}
                  </div>
                  <h4 className="font-display font-bold text-navy-900 mb-2 dark:text-white">{step.title}</h4>
                  <p className="text-sm text-navy-600 leading-relaxed dark:text-slate-300">{step.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Options tab */}
          <div role="tabpanel" hidden={activeTab !== 'options'}>
            <div className="grid sm:grid-cols-3 gap-6">
              {optionCards.map((option) => (
                <div key={option.title} className="rounded-2xl border border-warm-200 bg-white p-6 hover:border-brand-200 hover:shadow-lg transition-all dark:border-slate-700 dark:bg-slate-900 dark:hover:border-brand-500/50 dark:hover:shadow-black/20">
                  <h4 className="font-display font-bold text-navy-900 mb-2 dark:text-white">{option.title}</h4>
                  <p className="text-sm text-navy-600 leading-relaxed dark:text-slate-300">{option.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Examples tab */}
          <div role="tabpanel" hidden={activeTab !== 'examples'}>
            <div className="space-y-6">
              {exampleSections.map((section) => (
                <div key={section.title} className="rounded-2xl border border-warm-200 bg-white p-6 sm:p-8 dark:border-slate-700 dark:bg-slate-900">
                  <h4 className="font-display text-lg font-bold text-navy-900 mb-4 dark:text-white">{section.title}</h4>
                  <ul className="space-y-3">
                    {section.items.map((item) => (
                      <li key={item} className="flex items-start gap-3 text-sm text-navy-600 dark:text-slate-300">
                        <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-brand-400 shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-20 bg-gradient-to-b from-warm-50 to-white dark:from-slate-900 dark:to-slate-950">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-navy-900 mb-4 dark:text-white">{t('gameInfo.ctaTitle')}</h2>
          <p className="text-navy-500 mb-8 max-w-xl mx-auto dark:text-slate-400">{t('gameInfo.ctaText')}</p>
          {isAuthenticated ? (
            <Link to="/admin/games" className="inline-flex items-center rounded-full bg-brand-500 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 hover:bg-brand-600 transition-all">
              {t('gameInfo.openGames')}
            </Link>
          ) : (
            <Link to="/register" className="inline-flex items-center rounded-full bg-brand-500 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 hover:bg-brand-600 transition-all">
              {t('gameInfo.getStarted')}
            </Link>
          )}
        </div>
      </section>
    </>
  )
}
