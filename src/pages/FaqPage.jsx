import { Link } from 'react-router-dom'

import { useAuth } from '../lib/auth'
import { useI18n } from '../lib/i18n'

export default function FaqPage() {
  const { isAuthenticated } = useAuth()
  const { t } = useI18n()

  const faqSections = [
    {
      title: t('faq.sectionGeneral'),
      items: [
        { q: t('faq.q1'), a: t('faq.a1') },
        { q: t('faq.q2'), a: t('faq.a2') },
        { q: t('faq.q3'), a: t('faq.a3') },
      ],
    },
    {
      title: t('faq.sectionManagers'),
      items: [
        { q: t('faq.q4'), a: t('faq.a4') },
        { q: t('faq.q5'), a: t('faq.a5') },
        { q: t('faq.q6'), a: t('faq.a6') },
      ],
    },
    {
      title: t('faq.sectionTeams'),
      items: [
        { q: t('faq.q7'), a: t('faq.a7') },
        { q: t('faq.q8'), a: t('faq.a8') },
        { q: t('faq.q9'), a: t('faq.a9') },
      ],
    },
  ]

  return (
    <>
      <section className="overview-header">
        <div>
          <h1>{t('faq.title')}</h1>
          <p className="overview-subtitle">{t('faq.subtitle')}</p>
        </div>
        <div className="overview-actions">
          <Link className="btn btn-ghost" to="/">
            {t('faq.backHome')}
          </Link>
        </div>
      </section>

      <div className="info-content">
        {faqSections.map((section) => (
          <section key={section.title} className="faq-section">
            <h2>{section.title}</h2>
            {section.items.map((item) => (
              <div key={item.q} className="faq-item">
                <h4>{item.q}</h4>
                <p>{item.a}</p>
              </div>
            ))}
          </section>
        ))}

        <section className="info-cta">
          {!isAuthenticated ? (
            <Link className="btn btn-primary" to="/register">
              {t('faq.getStarted')}
            </Link>
          ) : null}
          <Link className="btn btn-ghost" to="/team-login">
            {t('faq.teamLogin')}
          </Link>
        </section>
      </div>
    </>
  )
}
