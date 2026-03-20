import { useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'

import { GAME_BY_TYPE, GAME_CATALOG } from '../lib/gameCatalog'
import { useI18n } from '../lib/i18n'

export default function GameTypesCarousel({ enabledTypes }) {
  const trackRef = useRef(null)
  const { t } = useI18n()

  const games = useMemo(() => {
    if (!Array.isArray(enabledTypes) || enabledTypes.length === 0) {
      return GAME_CATALOG
    }

    const mapped = enabledTypes.map((type) => GAME_BY_TYPE[type]).filter(Boolean)
    return mapped.length > 0 ? mapped : GAME_CATALOG
  }, [enabledTypes])

  function scrollByAmount(direction) {
    const track = trackRef.current
    if (!track) {
      return
    }

    const amount = Math.max(track.clientWidth * 0.8, 260)
    track.scrollBy({ left: direction * amount, behavior: 'smooth' })
  }

  return (
    <section className="game-types">
      <div className="section-header">
        <h2>{t('carousel.title')}</h2>
        <p>{t('carousel.subtitle')}</p>
      </div>
      <div className="game-types-carousel" data-carousel>
        <button className="carousel-btn carousel-prev" type="button" onClick={() => scrollByAmount(-1)} aria-label={t('carousel.previous')}>
          <span aria-hidden="true">‹</span>
        </button>
        <div className="game-types-grid" data-carousel-track ref={trackRef}>
          {games.map((game) => (
            <Link key={game.type} to={`/info/games/${game.slug}`} className="game-type-card">
              <div className="game-card-logo-wrap">
                <img className="game-card-logo" src={game.logo} alt={t(`gameCatalog.${game.type}.name`, {}, game.name)} loading="lazy" decoding="async" />
              </div>
              <p>{t(`gameCatalog.${game.type}.shortDescription`, {}, game.shortDescription)}</p>
              <span className="game-link">{t('carousel.learnMore')}</span>
            </Link>
          ))}
        </div>
        <button className="carousel-btn carousel-next" type="button" onClick={() => scrollByAmount(1)} aria-label={t('carousel.next')}>
          <span aria-hidden="true">›</span>
        </button>
      </div>
    </section>
  )
}
