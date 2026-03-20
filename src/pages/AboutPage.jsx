import { Link } from 'react-router-dom'

import GameTypesCarousel from '../components/GameTypesCarousel'
import { useAuth } from '../lib/auth'
import { useI18n } from '../lib/i18n'

export default function AboutPage() {
  const { isAuthenticated } = useAuth()
  const { t } = useI18n()

  return (
    <>
      <section className="overview-header">
        <div>
          <h1>{t('about.title')}</h1>
          <p className="overview-subtitle">{t('about.subtitle')}</p>
        </div>
        <div className="overview-actions">
          <Link className="btn btn-ghost" to="/">
            {t('about.backHome')}
          </Link>
        </div>
      </section>

      <div className="info-content">
        <section className="info-section">
          <h2>{t('about.missionTitle')}</h2>
          <p>{t('about.missionText')}</p>
        </section>

        <section className="info-section">
          <h2>{t('about.offerTitle')}</h2>
          <p>{t('about.offerText')}</p>
        </section>

        <GameTypesCarousel />

        <section className="info-section">
          <h2>{t('about.everyoneTitle')}</h2>
          <p>{t('about.everyoneText')}</p>
        </section>

        <section className="info-cta">
          {isAuthenticated ? (
            <Link className="btn btn-primary" to="/admin/games">
                {t('about.openGames')}
            </Link>
          ) : (
            <Link className="btn btn-primary" to="/register">
              {t('about.getStarted')}
            </Link>
          )}
          <Link className="btn btn-ghost" to="/faq">
            {t('about.readFaq')}
          </Link>
        </section>
      </div>
    </>
  )
}
