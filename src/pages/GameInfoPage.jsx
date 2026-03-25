import { useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'

import { GAME_BY_SLUG } from '../lib/gameCatalog'
import { useAuth } from '../lib/auth'
import { useI18n } from '../lib/i18n'

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

export default function GameInfoPage() {
  const { slug } = useParams()
  const { isAuthenticated } = useAuth()
  const { t } = useI18n()
  const game = GAME_BY_SLUG[slug]
  const [activeTab, setActiveTab] = useState('flow')
  const gameName = game ? t(`gameCatalog.${game.type}.name`, {}, game.name) : ''
  const gameShortDescription = game ? t(`gameCatalog.${game.type}.shortDescription`, {}, game.shortDescription) : ''
  const gameSubtitle = game ? t(`gameCatalog.${game.type}.subtitle`, {}, game.subtitle) : ''

  const flowSteps = useMemo(() => (game ? buildDefaultFlow(gameName, t) : []), [game, gameName, t])
  const optionCards = useMemo(() => (game ? buildOptionCards(gameName, t) : []), [game, gameName, t])
  const exampleSections = useMemo(() => (game ? buildExampleSections(gameName, t) : []), [game, gameName, t])

  if (!game) return <Navigate to="/" replace />

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
            <div className="w-24 h-24 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center mb-6 shadow-2xl">
              <img src={game.logo} alt={gameName} className="w-16 h-16 rounded-xl object-cover" />
            </div>
            <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight">{gameName}</h1>
            <p className="mt-4 text-lg text-navy-200 max-w-2xl">{gameSubtitle}</p>
          </div>
        </div>
      </section>

      {/* What is it */}
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-warm-200 bg-white p-8 sm:p-10 shadow-sm">
            <h2 className="font-display text-2xl font-bold text-navy-900 mb-4">{t('gameInfo.whatIsIt')}</h2>
            <p className="text-navy-600 leading-relaxed mb-3">{gameShortDescription}</p>
            <p className="text-navy-500 leading-relaxed">{gameSubtitle}</p>
          </div>
        </div>
      </section>

      {/* Tabs */}
      <section className="pb-20 sm:pb-28" data-game-info-tabs>
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          {/* Tab bar */}
          <div className="flex justify-center mb-10" role="tablist" aria-label={gameName}>
            <div className="inline-flex rounded-full border border-warm-200 bg-warm-50 p-1">
              {tabs.map((tab) => (
                <button key={tab.id} type="button" role="tab" onClick={() => setActiveTab(tab.id)} className={`rounded-full px-5 py-2 text-sm font-medium transition-all ${activeTab === tab.id ? 'bg-brand-500 text-white shadow-sm' : 'text-navy-600 hover:text-navy-900'}`}>
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
                  <h4 className="font-display font-bold text-navy-900 mb-2">{step.title}</h4>
                  <p className="text-sm text-navy-600 leading-relaxed">{step.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Options tab */}
          <div role="tabpanel" hidden={activeTab !== 'options'}>
            <div className="grid sm:grid-cols-3 gap-6">
              {optionCards.map((option) => (
                <div key={option.title} className="rounded-2xl border border-warm-200 bg-white p-6 hover:border-brand-200 hover:shadow-lg transition-all">
                  <h4 className="font-display font-bold text-navy-900 mb-2">{option.title}</h4>
                  <p className="text-sm text-navy-600 leading-relaxed">{option.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Examples tab */}
          <div role="tabpanel" hidden={activeTab !== 'examples'}>
            <div className="space-y-6">
              {exampleSections.map((section) => (
                <div key={section.title} className="rounded-2xl border border-warm-200 bg-white p-6 sm:p-8">
                  <h4 className="font-display text-lg font-bold text-navy-900 mb-4">{section.title}</h4>
                  <ul className="space-y-3">
                    {section.items.map((item) => (
                      <li key={item} className="flex items-start gap-3 text-sm text-navy-600">
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
      <section className="py-16 sm:py-20 bg-gradient-to-b from-warm-50 to-white">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-navy-900 mb-4">{t('gameInfo.ctaTitle')}</h2>
          <p className="text-navy-500 mb-8 max-w-xl mx-auto">{t('gameInfo.ctaText')}</p>
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
