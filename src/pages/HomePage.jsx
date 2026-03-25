import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'

import GameTypesCarousel from '../components/GameTypesCarousel'
import { authApi, gameApi } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useI18n } from '../lib/i18n'

export default function HomePage() {
  const { isAuthenticated, login } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()

  const [gameCode, setGameCode] = useState('')
  const [teamCode, setTeamCode] = useState('')
  const [enabledTypes, setEnabledTypes] = useState([])
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    async function loadTypes() {
      try {
        const types = await gameApi.listGameTypes(undefined)
        if (!cancelled) setEnabledTypes(types)
      } catch {
        if (!cancelled) setEnabledTypes([])
      }
    }
    loadTypes()
    return () => { cancelled = true }
  }, [])

  async function submitTeamLogin(event) {
    event.preventDefault()
    setError('')
    try {
      const response = await authApi.loginTeam(gameCode.trim(), teamCode.trim())
      login({
        token: response.access_token,
        principalType: response.principal_type,
        principalId: response.principal_id,
        accessLevel: response.access_level,
        roles: response.roles || [],
        teamGameCode: gameCode.trim(),
      })
      navigate('/team')
    } catch (err) {
      setError(err.message || t('home.teamLoginFailed'))
    }
  }

  return (
    <>
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-warm-50 via-white to-brand-50">
        {/* Decorative blobs */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-brand-200/30 rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-80 h-80 bg-navy-200/20 rounded-full blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16 sm:py-24 lg:py-32">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: Copy */}
            <div className="animate-fade-up">
              <span className="inline-flex items-center rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-700 uppercase tracking-wider mb-6">
                {t('home.kicker')}
              </span>
              <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-navy-900 leading-[1.1]">
                {t('home.headline')}
              </h1>
              <p className="mt-6 text-lg sm:text-xl text-navy-600 leading-relaxed max-w-xl">
                {t('home.lede')}
              </p>

              <div className="mt-8 flex flex-wrap gap-3">
                {isAuthenticated ? (
                  <>
                    <Link to="/admin/games" className="inline-flex items-center rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 hover:bg-brand-600 active:bg-brand-700 transition-all">
                      {t('home.ctaManageGames')}
                    </Link>
                    <Link to="/team" className="inline-flex items-center rounded-full border-2 border-navy-200 px-6 py-3 text-sm font-semibold text-navy-700 hover:border-brand-300 hover:text-brand-600 transition-all">
                      {t('home.ctaTeamDashboard')}
                    </Link>
                  </>
                ) : (
                  <>
                    <Link to="/register" className="inline-flex items-center rounded-full bg-brand-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 hover:bg-brand-600 active:bg-brand-700 transition-all">
                      {t('home.ctaRegister')}
                    </Link>
                    <Link to="/login" className="inline-flex items-center rounded-full border-2 border-navy-200 px-6 py-3 text-sm font-semibold text-navy-700 hover:border-brand-300 hover:text-brand-600 transition-all">
                      {t('home.ctaLogin')}
                    </Link>
                  </>
                )}
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                {['tagAllAges', 'tagScoutFriendly', 'tagTeamPlay', 'tagShortLong'].map((tag) => (
                  <span key={tag} className="inline-flex items-center gap-1.5 rounded-full bg-white/80 border border-warm-200 px-3 py-1.5 text-xs font-medium text-navy-600">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-400" />
                    {t(`home.${tag}`)}
                  </span>
                ))}
              </div>
            </div>

            {/* Right: Quick team login panel */}
            <aside className="animate-slide-in-right">
              <div className="rounded-2xl border border-warm-200 bg-white/90 backdrop-blur-sm shadow-xl shadow-navy-900/5 p-6 sm:p-8">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-navy-400">{t('home.quickStart')}</p>
                    <h2 className="font-display text-xl font-bold text-navy-900 mt-1">{t('home.teamLogin')}</h2>
                  </div>
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-glow" />
                    {t('home.panelLive')}
                  </span>
                </div>
                <p className="text-sm text-navy-500 mb-6">{t('home.panelLede')}</p>

                <form onSubmit={submitTeamLogin} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label htmlFor="homeGameCode" className="block text-xs font-medium text-navy-600 mb-1.5">{t('home.gameCode')}</label>
                      <input id="homeGameCode" value={gameCode} onChange={(e) => setGameCode(e.target.value)} required className="w-full rounded-lg border border-warm-200 bg-warm-50 px-3 py-2.5 text-sm text-navy-900 placeholder:text-navy-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-400/20 outline-none transition" />
                    </div>
                    <div>
                      <label htmlFor="homeTeamCode" className="block text-xs font-medium text-navy-600 mb-1.5">{t('home.teamCode')}</label>
                      <input id="homeTeamCode" value={teamCode} onChange={(e) => setTeamCode(e.target.value)} required className="w-full rounded-lg border border-warm-200 bg-warm-50 px-3 py-2.5 text-sm text-navy-900 placeholder:text-navy-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-400/20 outline-none transition" />
                    </div>
                  </div>
                  {error ? <div className="flash flash-error">{error}</div> : null}
                  <button type="submit" className="w-full rounded-lg bg-brand-500 px-4 py-3 text-sm font-semibold text-white shadow-sm hover:bg-brand-600 active:bg-brand-700 transition-all">
                    {t('home.joinTeamGame')}
                  </button>
                </form>
                <p className="text-xs text-navy-400 mt-4 text-center">{t('home.panelFooter')}</p>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* Social proof bar */}
      <section className="border-y border-warm-200/60 bg-white/60 backdrop-blur-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex flex-wrap justify-center gap-8 sm:gap-12 text-center">
            <div>
              <p className="font-display text-2xl font-bold text-navy-900">13+</p>
              <p className="text-xs text-navy-500 mt-1">{t('home.proofGames')}</p>
            </div>
            <div>
              <p className="font-display text-2xl font-bold text-navy-900">21</p>
              <p className="text-xs text-navy-500 mt-1">{t('home.proofLanguages')}</p>
            </div>
            <div>
              <p className="font-display text-2xl font-bold text-navy-900">{t('home.proofRealtimeValue')}</p>
              <p className="text-xs text-navy-500 mt-1">{t('home.proofRealtime')}</p>
            </div>
            <div>
              <p className="font-display text-2xl font-bold text-brand-600">{t('home.proofFreeValue')}</p>
              <p className="text-xs text-navy-500 mt-1">{t('home.proofFree')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Game types carousel */}
      <GameTypesCarousel enabledTypes={enabledTypes} />

      {/* Features */}
      <section className="py-20 sm:py-28 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-navy-900">{t('home.featuresTitle')}</h2>
            <p className="mt-4 text-lg text-navy-500">{t('home.featuresSubtitle')}</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
            {[
              { icon: '🎛️', title: t('home.featureOneTitle'), text: t('home.featureOneText') },
              { icon: '⚡', title: t('home.featureTwoTitle'), text: t('home.featureTwoText') },
              { icon: '🏕️', title: t('home.featureThreeTitle'), text: t('home.featureThreeText') },
            ].map((f) => (
              <article key={f.title} className="group rounded-2xl border border-warm-200 bg-warm-50/50 p-8 hover:border-brand-200 hover:shadow-lg hover:shadow-brand-500/5 transition-all duration-300">
                <span className="text-3xl mb-4 block">{f.icon}</span>
                <h3 className="font-display text-lg font-bold text-navy-900 mb-2">{f.title}</h3>
                <p className="text-sm text-navy-600 leading-relaxed">{f.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 sm:py-28 bg-gradient-to-b from-warm-50 to-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h2 className="font-display text-3xl sm:text-4xl font-bold text-navy-900">{t('home.stepsTitle')}</h2>
            <p className="mt-4 text-lg text-navy-500">{t('home.stepsSubtitle')}</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-8 lg:gap-12">
            {[1, 2, 3].map((n) => (
              <div key={n} className="relative text-center group">
                <div className="mx-auto w-14 h-14 rounded-2xl bg-brand-500 text-white flex items-center justify-center font-display text-xl font-bold shadow-lg shadow-brand-500/25 mb-6 group-hover:scale-110 transition-transform">
                  {n}
                </div>
                <h4 className="font-display text-lg font-bold text-navy-900 mb-2">{t(`home.step${n}Title`)}</h4>
                <p className="text-sm text-navy-600 leading-relaxed max-w-xs mx-auto">{t(`home.step${n}Text`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-20 sm:py-28">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-display text-3xl sm:text-4xl font-bold text-navy-900">{t('home.ctaBottomTitle')}</h2>
          <p className="mt-4 text-lg text-navy-500 max-w-2xl mx-auto">{t('home.ctaBottomText')}</p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link to="/register" className="inline-flex items-center rounded-full bg-brand-500 px-8 py-3.5 text-sm font-semibold text-white shadow-lg shadow-brand-500/25 hover:bg-brand-600 transition-all">
              {t('home.ctaBottomRegister')}
            </Link>
            <Link to="/about" className="inline-flex items-center rounded-full border-2 border-navy-200 px-8 py-3.5 text-sm font-semibold text-navy-700 hover:border-brand-300 hover:text-brand-600 transition-all">
              {t('home.ctaBottomLearnMore')}
            </Link>
          </div>
        </div>
      </section>
    </>
  )
}
