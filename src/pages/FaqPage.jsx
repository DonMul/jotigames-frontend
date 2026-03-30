import { useState } from 'react'
import { Link } from 'react-router-dom'

import { useAuth } from '../lib/auth'
import { useI18n } from '../lib/i18n'

function FaqItem({ question, answer }) {
  const [open, setOpen] = useState(false)

  return (
    <div className="border-b border-warm-200 last:border-0 dark:border-slate-700">
      <button type="button" onClick={() => setOpen((v) => !v)} className="flex w-full items-start justify-between py-5 text-left">
        <span className="font-medium text-navy-900 pr-4 dark:text-white">{question}</span>
        <svg className={`w-5 h-5 text-navy-400 shrink-0 mt-0.5 transition-transform dark:text-slate-400 ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
      </button>
      {open && <p className="pb-5 text-sm text-navy-600 leading-relaxed -mt-1 dark:text-slate-300">{answer}</p>}
    </div>
  )
}

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
      {/* Hero */}
      <section className="relative overflow-hidden bg-gradient-to-br from-warm-50 via-white to-brand-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-900">
        <div className="absolute -top-24 -right-24 w-80 h-80 bg-brand-200/20 rounded-full blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
          <div className="max-w-3xl">
            <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight text-navy-900 dark:text-white">{t('faq.title')}</h1>
            <p className="mt-6 text-xl text-navy-500 leading-relaxed dark:text-slate-300">{t('faq.subtitle')}</p>
          </div>
        </div>
      </section>

      {/* FAQ Sections */}
      <section className="py-20 sm:py-28 dark:bg-slate-950">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 space-y-12">
          {faqSections.map((section) => (
            <div key={section.title}>
              <h2 className="font-display text-xl font-bold text-navy-900 mb-6 dark:text-white">{section.title}</h2>
              <div className="rounded-2xl border border-warm-200 bg-white divide-y divide-warm-200 px-6 dark:border-slate-700 dark:bg-slate-900 dark:divide-slate-700">
                {section.items.map((item) => (
                  <FaqItem key={item.q} question={item.q} answer={item.a} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 sm:py-20 bg-gradient-to-b from-warm-50 to-white dark:from-slate-900 dark:to-slate-950">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-navy-900 mb-4 dark:text-white">{t('faq.ctaTitle')}</h2>
          <p className="text-navy-500 mb-8 dark:text-slate-400">{t('faq.ctaText')}</p>
          <div className="flex flex-wrap justify-center gap-4">
            {!isAuthenticated && (
              <Link to="/register" className="inline-flex items-center rounded-full bg-brand-500 px-8 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 hover:bg-brand-600 transition-all">
                {t('faq.getStarted')}
              </Link>
            )}
            <Link to="/team-login" className="inline-flex items-center rounded-full border-2 border-navy-200 px-8 py-3 text-sm font-semibold text-navy-700 hover:border-brand-300 hover:text-brand-600 transition-all dark:border-slate-600 dark:text-slate-200 dark:hover:border-brand-400 dark:hover:text-brand-300">
              {t('faq.teamLogin')}
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
