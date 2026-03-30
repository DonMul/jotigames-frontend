import { Link } from 'react-router-dom'

import GameTypesCarousel from '../components/GameTypesCarousel'
import { useAuth } from '../lib/auth'
import { useI18n } from '../lib/i18n'

export default function AboutPage() {
  const { isAuthenticated } = useAuth()
  const { t } = useI18n()

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-warm-50 via-white to-brand-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
        <div className="absolute -top-24 -left-24 w-80 h-80 bg-brand-200/20 rounded-full blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="max-w-3xl">
            <span className="inline-flex items-center rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700 uppercase tracking-wider mb-6">{t('about.badge')}</span>
            <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-navy-900 dark:text-white">{t('about.title')}</h1>
            <p className="mt-6 text-xl text-navy-500 leading-relaxed dark:text-slate-300">{t('about.subtitle')}</p>
          </div>
        </div>
      </section>

      {/* Content */}
      <section className="py-20 sm:py-28 dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-8">
            {[
              { icon: '🎯', title: t('about.missionTitle'), text: t('about.missionText') },
              { icon: '🎮', title: t('about.offerTitle'), text: t('about.offerText') },
              { icon: '🌍', title: t('about.everyoneTitle'), text: t('about.everyoneText') },
            ].map((section) => (
              <div key={section.title} className="rounded-2xl border border-warm-200 bg-white p-8 hover:shadow-lg hover:border-brand-200 transition-all dark:border-slate-700 dark:bg-slate-900 dark:hover:border-brand-500/50">
                <span className="text-3xl mb-4 block">{section.icon}</span>
                <h2 className="font-display text-xl font-bold text-navy-900 mb-4 dark:text-white">{section.title}</h2>
                <p className="text-navy-600 leading-relaxed dark:text-slate-300">{section.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <GameTypesCarousel />

      {/* CTA */}
      <section className="py-20 sm:py-28 bg-gradient-to-b from-warm-50 to-white dark:from-slate-900 dark:to-slate-950">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-navy-900 mb-4 dark:text-white">{t('about.ctaTitle')}</h2>
          <p className="text-lg text-navy-500 mb-8 max-w-2xl mx-auto dark:text-slate-400">{t('about.ctaText')}</p>
          <div className="flex flex-wrap justify-center gap-4">
            {isAuthenticated ? (
              <Link to="/admin/games" className="inline-flex items-center rounded-full bg-brand-500 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 hover:bg-brand-600 transition-all">
                {t('about.openGames')}
              </Link>
            ) : (
              <Link to="/register" className="inline-flex items-center rounded-full bg-brand-500 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 hover:bg-brand-600 transition-all">
                {t('about.getStarted')}
              </Link>
            )}
            <Link to="/faq" className="inline-flex items-center rounded-full border-2 border-navy-200 px-8 py-3 text-sm font-semibold text-navy-700 hover:border-brand-300 hover:text-brand-600 transition-all dark:border-slate-600 dark:text-slate-200 dark:hover:border-brand-400 dark:hover:text-brand-300">
              {t('about.readFaq')}
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
