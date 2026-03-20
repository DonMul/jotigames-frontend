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

  if (!game) {
    return <Navigate to="/" replace />
  }

  return (
    <>
      <section className="overview-header game-info-hero">
        <div className="game-info-hero-visual">
          <p className="overview-kicker">{t('gameInfo.guide')}</p>
          <div className="info-game-logo-wrap">
            <img className="info-game-logo" src={game.logo} alt={gameName} />
          </div>
          <h1>{gameName}</h1>
          <p className="overview-subtitle">{gameSubtitle}</p>
        </div>
      </section>

      <section className="game-info-intro-card">
        <h2>{t('gameInfo.whatIsIt')}</h2>
        <p>{gameShortDescription}</p>
        <p>{gameSubtitle}</p>
      </section>

      <section className="game-info-tabs" data-game-info-tabs>
        <div className="game-info-tablist" role="tablist" aria-label={gameName}>
          <button className={`game-info-tab ${activeTab === 'flow' ? 'is-active' : ''}`} type="button" role="tab" onClick={() => setActiveTab('flow')}>
            {t('gameInfo.tabFlow')}
          </button>
          <button className={`game-info-tab ${activeTab === 'options' ? 'is-active' : ''}`} type="button" role="tab" onClick={() => setActiveTab('options')}>
            {t('gameInfo.tabModes')}
          </button>
          <button className={`game-info-tab ${activeTab === 'examples' ? 'is-active' : ''}`} type="button" role="tab" onClick={() => setActiveTab('examples')}>
            {t('gameInfo.tabPerfectFor')}
          </button>
        </div>

        <div className={`game-info-panel ${activeTab === 'flow' ? 'is-active' : ''}`} role="tabpanel" hidden={activeTab !== 'flow'}>
          <div className="steps-grid">
            {flowSteps.map((step) => (
              <article key={step.number} className="step-card">
                <span>{step.number}</span>
                <h4>{step.title}</h4>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
        </div>

        <div className={`game-info-panel ${activeTab === 'options' ? 'is-active' : ''}`} role="tabpanel" hidden={activeTab !== 'options'}>
          <div className="game-info-grid">
            {optionCards.map((option) => (
              <article key={option.title} className="game-info-card">
                <h4>{option.title}</h4>
                <p>{option.text}</p>
              </article>
            ))}
          </div>
        </div>

        <div className={`game-info-panel ${activeTab === 'examples' ? 'is-active' : ''}`} role="tabpanel" hidden={activeTab !== 'examples'}>
          <div className="game-info-grid game-info-grid-tight">
            {exampleSections.map((section) => (
              <article key={section.title} className="game-info-card">
                <h4>{section.title}</h4>
                <ul className="feature-list">
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="info-cta game-info-bottom-cta">
        {isAuthenticated ? (
          <Link className="btn btn-primary" to="/admin/games">
            {t('gameInfo.openGames')}
          </Link>
        ) : (
          <Link className="btn btn-primary" to="/register">
            {t('gameInfo.getStarted')}
          </Link>
        )}
      </section>
    </>
  )
}
