import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'

import { GAME_CATALOG } from '../lib/gameCatalog'
import { gameApi } from '../lib/api'
import { useAuth } from '../lib/auth'
import { useI18n } from '../lib/i18n'
import { LOCALE_LABELS, useLocale } from '../lib/locale'
import { getTheme, toggleTheme } from '../lib/theme'

function navLinkClass({ isActive }) {
  return `transition-colors duration-200 font-medium text-sm ${
    isActive ? 'text-brand-600 dark:text-brand-400' : 'text-navy-700 hover:text-brand-600 dark:text-slate-200 dark:hover:text-brand-400'
  }`
}

export default function PublicLayout({ children }) {
  const location = useLocation()
  const { auth, isAuthenticated, logout } = useAuth()
  const { locale, supportedLocales, setLocale } = useLocale()
  const { t } = useI18n()
  const [monetisationEnabled, setMonetisationEnabled] = useState(false)
  const [enabledTypes, setEnabledTypes] = useState([])
  const gameLinks = useMemo(() => {
    const allowedTypes = new Set(enabledTypes)
    return GAME_CATALOG.filter((game) => allowedTypes.has(game.type))
  }, [enabledTypes])
  const allGames = useMemo(() => {
    const source = gameLinks.length > 0 ? gameLinks : GAME_CATALOG
    return [...source].sort((left, right) => {
      const leftName = t(`gameCatalog.${left.type}.name`, {}, left.name)
      const rightName = t(`gameCatalog.${right.type}.name`, {}, right.name)
      return leftName.localeCompare(rightName, locale, { sensitivity: 'base' })
    })
  }, [gameLinks, t, locale])
  const headerRef = useRef(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [gamesOpen, setGamesOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [langOpen, setLangOpen] = useState(false)
  const [theme, setTheme] = useState(() => (typeof document !== 'undefined' && document.documentElement.classList.contains('dark') ? 'dark' : 'light'))

  useEffect(() => {
    setTheme(getTheme())
  }, [])

  function handleThemeToggle() {
    setTheme(toggleTheme())
  }

  useEffect(() => {
    let cancelled = false
    async function loadEnabledTypes() {
      try {
        const types = await gameApi.listGameTypes(undefined)
        if (!cancelled) setEnabledTypes(Array.isArray(types) ? types : [])
      } catch {
        if (!cancelled) setEnabledTypes([])
      }
    }
    loadEnabledTypes()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    let cancelled = false
    async function loadMonetisationStatus() {
      try {
        const status = await gameApi.getMonetisationStatus()
        if (!cancelled) {
          setMonetisationEnabled(Boolean(status?.enabled))
        }
      } catch {
        if (!cancelled) {
          setMonetisationEnabled(false)
        }
      }
    }
    loadMonetisationStatus()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    setMenuOpen(false)
    setGamesOpen(false)
    setAccountOpen(false)
    setLangOpen(false)
  }, [location.pathname])

  useEffect(() => {
    function onClickOutside(event) {
      if (headerRef.current && !headerRef.current.contains(event.target)) {
        setMenuOpen(false)
        setGamesOpen(false)
        setAccountOpen(false)
        setLangOpen(false)
      }
    }
    function onKeyDown(event) {
      if (event.key === 'Escape') {
        setMenuOpen(false)
        setGamesOpen(false)
        setAccountOpen(false)
        setLangOpen(false)
      }
    }
    function onResize() { if (window.innerWidth > 768) setMenuOpen(false) }
    document.addEventListener('click', onClickOutside)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', onResize)
    return () => {
      document.removeEventListener('click', onClickOutside)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  function closeAll() {
    setMenuOpen(false)
    setGamesOpen(false)
    setAccountOpen(false)
    setLangOpen(false)
  }

  return (
    <>
      {/* Sticky Header */}
      <header ref={headerRef} className="sticky top-0 z-50 border-b border-warm-200/60 bg-white/80 backdrop-blur-lg dark:border-slate-700/80 dark:bg-slate-950/90">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          {/* Brand */}
          <Link to="/" className="flex items-center gap-2.5 group" onClick={closeAll}>
            <img src="/image/logo-small.avif" alt="JotiGames" width="36" height="36" className="rounded-lg transition-transform group-hover:scale-105" />
            <span className="font-display text-xl font-bold tracking-tight"><span className="text-brand-500">Joti</span><span className="text-sky-500">Games</span></span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1">
            <NavLink to="/" className={navLinkClass} end onClick={closeAll}><span className="px-3 py-2">{t('nav.home')}</span></NavLink>

            {/* Games dropdown */}
            <div className="relative">
              <button type="button" className="flex items-center gap-1 px-3 py-2 text-sm font-medium text-navy-700 hover:text-brand-600 transition-colors dark:text-slate-200 dark:hover:text-brand-400" onClick={() => { setGamesOpen((v) => !v); setAccountOpen(false); setLangOpen(false) }}>
                {t('nav.gameTypes')}
                <svg className={`w-3.5 h-3.5 transition-transform ${gamesOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
              </button>
              {gamesOpen && (
                <div className="absolute left-0 top-full mt-1 w-64 rounded-xl border border-warm-200 bg-white shadow-xl shadow-navy-900/5 p-2 animate-fade-in z-50 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/30">
                  {allGames.map((game) => (
                    <NavLink key={game.type} to={`/info/games/${game.slug}`} className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-navy-700 hover:bg-brand-50 hover:text-brand-700 transition-colors dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-brand-300" onClick={closeAll}>
                      <img src={game.logo} alt="" className="w-16 h-full rounded-md object-contain" loading="lazy" />
                      <span className="font-medium">{t(`gameCatalog.${game.type}.name`, {}, game.name)}</span>
                    </NavLink>
                  ))}
                </div>
              )}
            </div>

            <NavLink to="/about" className={navLinkClass} onClick={closeAll}><span className="px-3 py-2">{t('nav.about')}</span></NavLink>
            {monetisationEnabled ? (
              <NavLink to="/pricing" className={navLinkClass} onClick={closeAll}><span className="px-3 py-2">{t('nav.pricing')}</span></NavLink>
            ) : null}
            <NavLink to="/faq" className={navLinkClass} onClick={closeAll}><span className="px-3 py-2">{t('nav.faq')}</span></NavLink>

            {/* Language selector */}
            <div className="relative ml-2">
              <button type="button" className="flex items-center gap-1 px-2 py-1.5 text-xs font-medium text-navy-500 hover:text-navy-700 rounded-md hover:bg-warm-100 transition-colors dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white" onClick={() => { setLangOpen((v) => !v); setGamesOpen(false); setAccountOpen(false) }}>
                {(LOCALE_LABELS[locale] || locale).split(' ')[0]}
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
              </button>
              {langOpen && (
                <div className="absolute right-0 top-full mt-1 w-44 rounded-xl border border-warm-200 bg-white shadow-xl shadow-navy-900/5 p-1.5 animate-fade-in z-50 max-h-80 overflow-y-auto dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/30">
                  {supportedLocales.map((localeCode) => (
                    <button key={localeCode} type="button" className={`w-full text-left rounded-lg px-3 py-2 text-sm transition-colors ${locale === localeCode ? 'bg-brand-50 text-brand-700 font-semibold dark:bg-slate-800 dark:text-brand-300' : 'text-navy-600 hover:bg-warm-100 dark:text-slate-300 dark:hover:bg-slate-800'}`} onClick={() => { setLocale(localeCode); closeAll() }}>
                      {LOCALE_LABELS[localeCode] || localeCode}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              type="button"
              className="ml-1 inline-flex h-8 w-8 items-center justify-center rounded-md text-navy-500 transition-colors hover:bg-warm-100 hover:text-navy-700 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
              onClick={handleThemeToggle}
              aria-label={t('nav.toggleDark')}
              title={t('nav.toggleDark')}
            >
              {theme === 'dark' ? (
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
              ) : (
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="5" />
                  <path d="M12 1v2" />
                  <path d="M12 21v2" />
                  <path d="M4.22 4.22l1.42 1.42" />
                  <path d="M18.36 18.36l1.42 1.42" />
                  <path d="M1 12h2" />
                  <path d="M21 12h2" />
                  <path d="M4.22 19.78l1.42-1.42" />
                  <path d="M18.36 5.64l1.42-1.42" />
                </svg>
              )}
            </button>
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <>
                {auth.principalType === 'user' ? (
                  <div className="relative">
                    <button
                      type="button"
                      className="flex items-center gap-1.5 px-3 py-2 text-sm font-medium text-navy-700 hover:text-brand-600 transition-colors dark:text-slate-200 dark:hover:text-brand-400"
                      onClick={() => { setAccountOpen((v) => !v); setGamesOpen(false); setLangOpen(false) }}
                    >
                      {auth?.username || t('nav.account')}
                      <svg className={`w-3.5 h-3.5 transition-transform ${accountOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" /></svg>
                    </button>
                    {accountOpen && (
                      <div className="absolute right-0 top-full mt-1 w-48 rounded-xl border border-warm-200 bg-white shadow-xl shadow-navy-900/5 p-1.5 animate-fade-in z-50 dark:border-slate-700 dark:bg-slate-900 dark:shadow-black/30">
                        <Link to="/admin/games" className="block rounded-lg px-3 py-2 text-sm font-medium text-navy-700 hover:bg-brand-50 hover:text-brand-700 transition-colors dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-brand-300" onClick={closeAll}>{t('nav.games')}</Link>
                        <Link to="/account/profile" className="block rounded-lg px-3 py-2 text-sm font-medium text-navy-700 hover:bg-brand-50 hover:text-brand-700 transition-colors dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:text-brand-300" onClick={closeAll}>{t('nav.account')}</Link>
                        <button type="button" className="mt-1 block w-full text-left rounded-lg px-3 py-2 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors dark:text-red-400 dark:hover:bg-red-900/20" onClick={() => { logout(); closeAll() }}>{t('nav.logout')}</button>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <Link to="/team" className="text-sm font-medium text-navy-700 hover:text-brand-600 transition-colors dark:text-slate-200 dark:hover:text-brand-400" onClick={closeAll}>{t('nav.teamDashboard')}</Link>
                    <button type="button" className="text-sm font-medium text-navy-500 hover:text-red-600 transition-colors dark:text-slate-300 dark:hover:text-red-400" onClick={() => { logout(); closeAll() }}>{t('nav.logout')}</button>
                  </>
                )}
              </>
            ) : (
              <>
                <Link to="/team-login" className="text-sm font-medium text-navy-600 hover:text-brand-600 transition-colors dark:text-slate-300 dark:hover:text-brand-400" onClick={closeAll}>{t('nav.teamLogin')}</Link>
                <Link to="/login" className="text-sm font-medium text-navy-600 hover:text-brand-600 transition-colors dark:text-slate-300 dark:hover:text-brand-400" onClick={closeAll}>{t('nav.login')}</Link>
                <Link to="/register" className="inline-flex items-center rounded-full bg-brand-500 px-5 py-2 text-sm font-semibold text-white shadow-sm shadow-brand-500/25 hover:bg-brand-600 active:bg-brand-700 transition-all" onClick={closeAll}>{t('nav.register')}</Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button type="button" className="md:hidden flex items-center justify-center w-10 h-10 rounded-lg text-navy-600 hover:bg-warm-100 transition-colors dark:text-slate-200 dark:hover:bg-slate-800" onClick={() => setMenuOpen((v) => !v)} aria-label="Toggle menu">
            {menuOpen ? (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
            ) : (
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" /></svg>
            )}
          </button>
        </div>

        {/* Mobile menu */}
        {menuOpen && (
          <div className="md:hidden border-t border-warm-200/60 bg-white animate-fade-in dark:border-slate-700 dark:bg-slate-950">
            <div className="px-4 py-4 space-y-1">
              <NavLink to="/" end className="block rounded-lg px-3 py-2.5 text-sm font-medium text-navy-700 hover:bg-brand-50 dark:text-slate-200 dark:hover:bg-slate-800" onClick={closeAll}>{t('nav.home')}</NavLink>
              <NavLink to="/about" className="block rounded-lg px-3 py-2.5 text-sm font-medium text-navy-700 hover:bg-brand-50 dark:text-slate-200 dark:hover:bg-slate-800" onClick={closeAll}>{t('nav.about')}</NavLink>
              {monetisationEnabled ? (
                <NavLink to="/pricing" className="block rounded-lg px-3 py-2.5 text-sm font-medium text-navy-700 hover:bg-brand-50 dark:text-slate-200 dark:hover:bg-slate-800" onClick={closeAll}>{t('nav.pricing')}</NavLink>
              ) : null}
              <NavLink to="/faq" className="block rounded-lg px-3 py-2.5 text-sm font-medium text-navy-700 hover:bg-brand-50 dark:text-slate-200 dark:hover:bg-slate-800" onClick={closeAll}>{t('nav.faq')}</NavLink>

              <button
                type="button"
                className="mt-1 block w-full rounded-lg px-3 py-2.5 text-left text-sm font-medium text-navy-700 hover:bg-brand-50 dark:text-slate-200 dark:hover:bg-slate-800"
                onClick={handleThemeToggle}
              >
                {t('nav.toggleDark')}
              </button>

              <div className="pt-2 pb-1 px-3 text-xs font-semibold text-navy-400 uppercase tracking-wider dark:text-slate-500">{t('nav.gameTypes')}</div>
              {allGames.map((game) => (
                <NavLink key={game.type} to={`/info/games/${game.slug}`} className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm text-navy-600 hover:bg-brand-50 dark:text-slate-300 dark:hover:bg-slate-800" onClick={closeAll}>
                  <img src={game.logo} alt="" className="w-7 h-7 rounded object-cover" loading="lazy" />
                  {t(`gameCatalog.${game.type}.name`, {}, game.name)}
                </NavLink>
              ))}

              <div className="border-t border-warm-200 my-3 dark:border-slate-700" />

              {isAuthenticated ? (
                <>
                  {auth.principalType === 'user' ? (
                    <>
                      <NavLink to="/admin/games" className="block rounded-lg px-3 py-2.5 text-sm font-medium text-navy-700 hover:bg-brand-50 dark:text-slate-200 dark:hover:bg-slate-800" onClick={closeAll}>{t('nav.games')}</NavLink>
                      <NavLink to="/account/profile" className="block rounded-lg px-3 py-2.5 text-sm font-medium text-navy-700 hover:bg-brand-50 dark:text-slate-200 dark:hover:bg-slate-800" onClick={closeAll}>{t('nav.account')}</NavLink>
                    </>
                  ) : (
                    <NavLink to="/team" className="block rounded-lg px-3 py-2.5 text-sm font-medium text-navy-700 hover:bg-brand-50 dark:text-slate-200 dark:hover:bg-slate-800" onClick={closeAll}>{t('nav.teamDashboard')}</NavLink>
                  )}
                  <button type="button" className="block w-full text-left rounded-lg px-3 py-2.5 text-sm font-medium text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20" onClick={() => { logout(); closeAll() }}>{t('nav.logout')}</button>
                </>
              ) : (
                <>
                  <NavLink to="/team-login" className="block rounded-lg px-3 py-2.5 text-sm font-medium text-navy-700 hover:bg-brand-50 dark:text-slate-200 dark:hover:bg-slate-800" onClick={closeAll}>{t('nav.teamLogin')}</NavLink>
                  <NavLink to="/login" className="block rounded-lg px-3 py-2.5 text-sm font-medium text-navy-700 hover:bg-brand-50 dark:text-slate-200 dark:hover:bg-slate-800" onClick={closeAll}>{t('nav.login')}</NavLink>
                  <Link to="/register" className="block mt-2 text-center rounded-full bg-brand-500 px-5 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-brand-600" onClick={closeAll}>{t('nav.register')}</Link>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">{children}</main>

      {/* Footer */}
      <footer className="bg-navy-900 text-white dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-16">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-10">
            <div className="sm:col-span-2 lg:col-span-1">
              <Link to="/" className="flex items-center gap-2.5 mb-4">
                <img src="/image/logo-small.avif" alt="JotiGames" width="32" height="32" className="rounded-lg" />
                <span className="font-display text-lg font-bold">Joti<span className="text-brand-400">Games</span></span>
              </Link>
              <p className="text-sm text-navy-300 leading-relaxed max-w-xs">{t('footer.tagline')}</p>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-navy-400 mb-4 dark:text-slate-500">{t('footer.platform')}</h4>
              <ul className="space-y-2.5">
                <li><Link to="/about" className="text-sm text-navy-300 hover:text-white transition-colors">{t('nav.about')}</Link></li>
                {monetisationEnabled ? (
                  <li><Link to="/pricing" className="text-sm text-navy-300 hover:text-white transition-colors">{t('nav.pricing')}</Link></li>
                ) : null}
                <li><Link to="/faq" className="text-sm text-navy-300 hover:text-white transition-colors">{t('nav.faq')}</Link></li>
                <li><Link to="/register" className="text-sm text-navy-300 hover:text-white transition-colors">{t('nav.register')}</Link></li>
                <li><Link to="/login" className="text-sm text-navy-300 hover:text-white transition-colors">{t('nav.login')}</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-navy-400 mb-4 dark:text-slate-500">{t('footer.forTeams')}</h4>
              <ul className="space-y-2.5">
                <li><Link to="/team-login" className="text-sm text-navy-300 hover:text-white transition-colors">{t('nav.teamLogin')}</Link></li>
                <li><Link to="/team" className="text-sm text-navy-300 hover:text-white transition-colors">{t('nav.teamDashboard')}</Link></li>
              </ul>
            </div>
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-navy-400 mb-4 dark:text-slate-500">{t('footer.gameTypes')}</h4>
              <ul className="space-y-2.5">
                {GAME_CATALOG.slice(0, 6).map((game) => (
                  <li key={game.type}><Link to={`/info/games/${game.slug}`} className="text-sm text-navy-300 hover:text-white transition-colors">{t(`gameCatalog.${game.type}.name`, {}, game.name)}</Link></li>
                ))}
              </ul>
            </div>
          </div>
          <div className="border-t border-navy-800 mt-12 pt-8 flex flex-col sm:flex-row items-center justify-between gap-4">
            <p className="text-xs text-navy-500 dark:text-slate-500">&copy; {new Date().getFullYear()} JotiGames. {t('footer.rights')}</p>
            <div className="flex items-center gap-4">
              {supportedLocales.slice(0, 8).map((lc) => (
                <button key={lc} type="button" className={`text-xs transition-colors ${locale === lc ? 'text-brand-400 font-semibold' : 'text-navy-500 hover:text-navy-300 dark:text-slate-500 dark:hover:text-slate-300'}`} onClick={() => setLocale(lc)}>
                  {(LOCALE_LABELS[lc] || lc).split(' ')[0]}
                </button>
              ))}
            </div>
          </div>
        </div>
      </footer>
    </>
  )
}
