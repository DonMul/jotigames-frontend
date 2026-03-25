import { useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'

import { GAME_BY_TYPE, GAME_CATALOG } from '../lib/gameCatalog'
import { useI18n } from '../lib/i18n'

export default function GameTypesCarousel({ enabledTypes }) {
  const trackRef = useRef(null)
  const { t } = useI18n()

  const games = useMemo(() => {
    if (!Array.isArray(enabledTypes) || enabledTypes.length === 0) return GAME_CATALOG
    const mapped = enabledTypes.map((type) => GAME_BY_TYPE[type]).filter(Boolean)
    return mapped.length > 0 ? mapped : GAME_CATALOG
  }, [enabledTypes])

  function scrollByAmount(direction) {
    const track = trackRef.current
    if (!track) return
    const amount = Math.max(track.clientWidth * 0.8, 260)
    track.scrollBy({ left: direction * amount, behavior: 'smooth' })
  }

  return (
    <section className="py-20 sm:py-28 bg-warm-50/50">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-navy-900">{t('carousel.title')}</h2>
          <p className="mt-4 text-lg text-navy-500">{t('carousel.subtitle')}</p>
        </div>

        <div className="relative" data-carousel>
          {/* Previous */}
          <button type="button" onClick={() => scrollByAmount(-1)} aria-label={t('carousel.previous')} className="absolute -left-3 sm:-left-5 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white border border-warm-200 shadow-lg flex items-center justify-center text-navy-600 hover:text-brand-600 hover:border-brand-300 transition-all">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
          </button>

          {/* Track */}
          <div ref={trackRef} data-carousel-track className="flex gap-6 overflow-x-auto scroll-smooth snap-x snap-mandatory pb-4 -mx-4 px-4 scrollbar-hide" style={{ scrollbarWidth: 'none' }}>
            {games.map((game) => (
              <Link key={game.type} to={`/info/games/${game.slug}`} className="snap-start shrink-0 w-64 sm:w-72 group">
                <div className="rounded-2xl border border-warm-200 bg-white p-6 h-full flex flex-col hover:border-brand-300 hover:shadow-xl hover:shadow-brand-500/5 transition-all duration-300">
                  <img src={game.logo} alt={t(`gameCatalog.${game.type}.name`, {}, game.name)} className="w-full h-full mb-4 object-contain" loading="lazy" decoding="async" />
                  <h3 className="font-display font-bold text-navy-900 mb-2">{t(`gameCatalog.${game.type}.name`, {}, game.name)}</h3>
                  <p className="text-sm text-navy-500 leading-relaxed flex-1">{t(`gameCatalog.${game.type}.shortDescription`, {}, game.shortDescription)}</p>
                  <span className="inline-flex items-center gap-1 mt-4 text-sm font-semibold text-brand-600 group-hover:gap-2 transition-all">
                    {t('carousel.learnMore')}
                  </span>
                </div>
              </Link>
            ))}
          </div>

          {/* Next */}
          <button type="button" onClick={() => scrollByAmount(1)} aria-label={t('carousel.next')} className="absolute -right-3 sm:-right-5 top-1/2 -translate-y-1/2 z-10 w-10 h-10 rounded-full bg-white border border-warm-200 shadow-lg flex items-center justify-center text-navy-600 hover:text-brand-600 hover:border-brand-300 transition-all">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
          </button>
        </div>
      </div>
    </section>
  )
}
