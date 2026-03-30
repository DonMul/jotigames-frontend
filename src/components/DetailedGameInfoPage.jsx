import { Link } from 'react-router-dom'

const DEFAULT_THEME = {
  heroClass: 'from-navy-950 via-navy-900 to-navy-800',
  heroGlowOneClass: 'bg-brand-400/20',
  heroGlowTwoClass: 'bg-emerald-300/10',
  heroAccentClass: 'text-brand-200',
  panelDotClass: 'bg-brand-300',
  statCardClass: 'bg-white/6 border-white/10',
  battleBadgeClass: 'bg-brand-50 text-brand-700',
  howBadgeClass: 'bg-white text-brand-700 ring-warm-200',
  howStepClass: 'bg-brand-500 shadow-brand-500/20',
  organizerBadgeClass: 'text-brand-200',
  perfectBadgeClass: 'bg-brand-100 text-brand-700',
  perfectDotClass: 'bg-brand-400',
  ctaPrimaryClass: 'bg-brand-500 hover:bg-brand-600 shadow-brand-500/25',
  ctaSecondaryClass: 'border-navy-200 hover:border-brand-300 hover:text-brand-600',
}

export default function DetailedGameInfoPage({ game, gameName, gameSubtitle, isAuthenticated, showPricingCta = false, t, content }) {
  const theme = { ...DEFAULT_THEME, ...(content?.theme || {}) }
  const howToPlayId = content?.howToPlayId || `${game?.slug || 'game'}-how-to-play`
  const panelPoints = Array.isArray(content?.panelPoints) ? content.panelPoints.filter(Boolean) : []
  const highlights = Array.isArray(content?.highlights) ? content.highlights.filter((item) => item?.value || item?.label) : []
  const features = Array.isArray(content?.features) ? content.features.filter((item) => item?.title || item?.text) : []
  const flow = Array.isArray(content?.flow) ? content.flow.filter((item) => item?.title || item?.text) : []
  const playStyles = Array.isArray(content?.playStyles) ? content.playStyles.filter(Boolean) : []
  const organizerCards = Array.isArray(content?.organizerCards) ? content.organizerCards.filter((item) => item?.title || item?.text) : []
  const perfectFor = Array.isArray(content?.perfectFor) ? content.perfectFor.filter(Boolean) : []

  return (
    <>
      <section className={`relative overflow-hidden bg-gradient-to-br ${theme.heroClass} text-white`}>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(249,115,22,.18),transparent_36%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,.08),transparent_28%)]" />
        <div className={`absolute -left-8 top-24 h-28 w-28 rounded-full blur-3xl animate-float ${theme.heroGlowOneClass}`} />
        <div className={`absolute right-6 top-16 h-24 w-24 rounded-full blur-3xl animate-pulse-glow ${theme.heroGlowTwoClass}`} />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-6 sm:py-24 lg:grid-cols-[1.15fr_.85fr] lg:items-center lg:px-8 lg:py-28">
          <div className="animate-fade-up">
            <span className={`inline-flex items-center rounded-full border border-white/15 bg-white/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.22em] backdrop-blur-sm ${theme.heroAccentClass}`}>
              {content.kicker}
            </span>
            <div className="mt-6 flex items-center gap-4">
              <img src={game.logo} alt={gameName} className="h-20 w-20 object-contain drop-shadow-2xl sm:h-24 sm:w-24" />
              <div>
                <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">{gameName}</h1>
                <p className={`mt-2 text-sm font-medium uppercase tracking-[0.18em] ${theme.heroAccentClass}`}>{content.eyebrow}</p>
              </div>
            </div>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed text-navy-100 sm:text-xl">{gameSubtitle}</p>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-navy-200/90">{content.heroText}</p>

            <div className="mt-8 flex flex-wrap gap-3">
              {isAuthenticated ? (
                <Link to="/admin/games" className={`inline-flex items-center rounded-full px-7 py-3 text-sm font-semibold text-white shadow-lg transition-all ${theme.ctaPrimaryClass}`}>
                  {t('gameInfo.openGames')}
                </Link>
              ) : (
                <Link to="/register" className={`inline-flex items-center rounded-full px-7 py-3 text-sm font-semibold text-white shadow-lg transition-all ${theme.ctaPrimaryClass}`}>
                  {t('gameInfo.getStarted')}
                </Link>
              )}
              <a href={`#${howToPlayId}`} className="inline-flex items-center rounded-full border border-white/20 bg-white/5 px-7 py-3 text-sm font-semibold text-white transition-all hover:border-brand-300 hover:bg-white/10">
                {content.secondaryCta}
              </a>
            </div>
          </div>

          <aside className="animate-slide-in-right">
            <div className="rounded-[2rem] border border-white/10 bg-white/8 p-6 shadow-2xl shadow-navy-950/30 backdrop-blur-sm">
              <div className="rounded-[1.5rem] border border-white/10 bg-navy-950/45 p-5">
                <p className={`text-xs font-semibold uppercase tracking-[0.22em] ${theme.heroAccentClass}`}>{content.panelTitle}</p>
                <div className="mt-5 space-y-4">
                  {panelPoints.map((item) => (
                    <div key={item} className="flex gap-3 rounded-2xl border border-white/8 bg-white/5 p-4">
                      <span className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${theme.panelDotClass}`} />
                      <p className="text-sm leading-relaxed text-navy-100">{item}</p>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                {highlights.map((item, index) => (
                  <div key={item.label} className={`rounded-2xl border p-4 ${theme.statCardClass} ${index % 2 === 0 ? 'animate-fade-in' : 'animate-fade-up'}`}>
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
            <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${theme.battleBadgeClass}`}>
              {content.battleKicker}
            </span>
            <h2 className="mt-4 font-display text-3xl font-bold text-navy-900 sm:text-4xl dark:text-white">{content.battleTitle}</h2>
            <p className="mt-4 text-lg leading-relaxed text-navy-500 dark:text-slate-400">{content.battleText}</p>
          </div>

          <div className="mt-12 grid gap-6 lg:grid-cols-3">
            {features.map((card) => (
              <article key={card.title} className="group rounded-3xl border border-warm-200 bg-warm-50/70 p-7 transition-all duration-300 hover:-translate-y-1 hover:border-brand-200 hover:shadow-xl hover:shadow-brand-500/10 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-brand-500/50 dark:hover:shadow-black/20">
                <span className="text-3xl">{card.icon}</span>
                <h3 className="mt-4 font-display text-xl font-bold text-navy-900 dark:text-white">{card.title}</h3>
                <p className="mt-3 text-sm leading-relaxed text-navy-600 dark:text-slate-300">{card.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id={howToPlayId} className="bg-gradient-to-b from-warm-50 to-white py-16 sm:py-24 dark:from-slate-900 dark:to-slate-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[.95fr_1.05fr] lg:items-start">
            <div>
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] shadow-sm ring-1 ${theme.howBadgeClass}`}>
                {content.howKicker}
              </span>
              <h2 className="mt-4 font-display text-3xl font-bold text-navy-900 sm:text-4xl dark:text-white">{content.howTitle}</h2>
              <p className="mt-4 text-lg leading-relaxed text-navy-500 dark:text-slate-400">{content.howText}</p>

              <div className="mt-8 rounded-3xl border border-warm-200 bg-white p-6 shadow-sm dark:border-slate-700 dark:bg-slate-900">
                <h3 className="font-display text-lg font-bold text-navy-900 dark:text-white">{content.playStylesTitle}</h3>
                <ul className="mt-4 space-y-3">
                  {playStyles.map((item) => (
                    <li key={item} className="flex items-start gap-3 text-sm leading-relaxed text-navy-600 dark:text-slate-300">
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${theme.perfectDotClass}`} />
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
                    <div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl font-display text-lg font-bold text-white shadow-lg ${theme.howStepClass}`}>
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
              <span className={`inline-flex items-center rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${theme.organizerBadgeClass}`}>
                {content.organizerKicker}
              </span>
              <h2 className="mt-4 font-display text-3xl font-bold sm:text-4xl">{content.organizerTitle}</h2>
              <p className="mt-4 max-w-2xl text-lg leading-relaxed text-navy-200">{content.organizerText}</p>
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
                <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] ${theme.perfectBadgeClass}`}>
                  {content.perfectForKicker}
                </span>
                <h2 className="mt-4 font-display text-3xl font-bold text-navy-900 dark:text-white">{content.perfectForTitle}</h2>
                <p className="mt-4 text-base leading-relaxed text-navy-500 dark:text-slate-400">{content.perfectForText}</p>
              </div>

              <ul className="space-y-4">
                {perfectFor.map((item) => (
                  <li key={item} className="flex items-start gap-3 rounded-2xl border border-white/70 bg-white/80 p-4 text-sm leading-relaxed text-navy-700 shadow-sm dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200">
                    <span className={`mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full ${theme.perfectDotClass}`} />
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
          <h2 className="font-display text-3xl font-bold text-navy-900 sm:text-4xl dark:text-white">{content.ctaTitle}</h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg leading-relaxed text-navy-500 dark:text-slate-400">{content.ctaText}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            {isAuthenticated ? (
              <Link to="/admin/games" className={`inline-flex items-center rounded-full px-8 py-3.5 text-sm font-semibold text-white shadow-lg transition-all ${theme.ctaPrimaryClass}`}>
                {t('gameInfo.openGames')}
              </Link>
            ) : (
              <Link to="/register" className={`inline-flex items-center rounded-full px-8 py-3.5 text-sm font-semibold text-white shadow-lg transition-all ${theme.ctaPrimaryClass}`}>
                {t('gameInfo.getStarted')}
              </Link>
            )}
            {showPricingCta ? (
              <Link to="/pricing" className={`inline-flex items-center rounded-full border-2 px-8 py-3.5 text-sm font-semibold text-navy-700 transition-all dark:text-slate-200 dark:border-slate-600 ${theme.ctaSecondaryClass}`}>
                {content.ctaSecondary}
              </Link>
            ) : null}
          </div>
        </div>
      </section>
    </>
  )
}
