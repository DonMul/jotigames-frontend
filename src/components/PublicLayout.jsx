import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'

import { GAME_CATALOG } from '../lib/gameCatalog'
import { useAuth } from '../lib/auth'
import { useI18n } from '../lib/i18n'
import { LOCALE_LABELS, useLocale } from '../lib/locale'

function menuClass({ isActive }) {
  return isActive ? 'is-active' : undefined
}

export default function PublicLayout({ children }) {
  const location = useLocation()
  const { auth, isAuthenticated, logout } = useAuth()
  const { locale, supportedLocales, setLocale } = useLocale()
  const { t } = useI18n()
  const gameLinks = useMemo(() => GAME_CATALOG, [])
  const shellRef = useRef(null)
  const navRef = useRef(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [theme, setTheme] = useState(() => {
    if (typeof document === 'undefined') {
      return 'light'
    }
    return document.documentElement.getAttribute('data-theme') === 'dark' ? 'dark' : 'light'
  })

  useEffect(() => {
    const closeAllDropdowns = () => {
      if (!navRef.current) {
        return
      }

      navRef.current.querySelectorAll('details[open]').forEach((node) => {
        node.removeAttribute('open')
      })
    }

    const onClickOutside = (event) => {
      if (!shellRef.current) {
        return
      }
      if (!shellRef.current.contains(event.target)) {
        setMenuOpen(false)
        closeAllDropdowns()
      }
    }

    const onResize = () => {
      if (window.innerWidth > 900) {
        setMenuOpen(false)
      }
    }

    const onKeyDown = (event) => {
      if (event.key !== 'Escape') {
        return
      }

      setMenuOpen(false)
      closeAllDropdowns()
    }

    document.addEventListener('click', onClickOutside)
    document.addEventListener('keydown', onKeyDown)
    window.addEventListener('resize', onResize)

    return () => {
      document.removeEventListener('click', onClickOutside)
      document.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('resize', onResize)
    }
  }, [])

  function toggleTheme() {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
    document.documentElement.setAttribute('data-theme', nextTheme)
    try {
      localStorage.setItem('jotigames-theme', nextTheme)
    } catch {
      // ignore storage restrictions
    }
  }

  function closeMenu() {
    setMenuOpen(false)
    if (navRef.current) {
      navRef.current.querySelectorAll('details[open]').forEach((node) => {
        node.removeAttribute('open')
      })
    }
  }

  function handleDropdownToggle(currentDetails) {
    if (!currentDetails?.open || !navRef.current) {
      return
    }

    navRef.current.querySelectorAll('details[open]').forEach((node) => {
      if (node !== currentDetails) {
        node.removeAttribute('open')
      }
    })
  }

  useEffect(() => {
    closeMenu()
  }, [location.pathname])

  return (
    <>
      <header className="site-header">
        <div className={`nav-shell ${menuOpen ? 'is-menu-open' : ''}`} ref={shellRef}>
          <Link className="brand" to="/" onClick={closeMenu}>
            <img className="brand-mark" src="/image/logo-small.avif" alt="JotiGames" width="40" height="40" />
            <span className="brand-text">JotiGames</span>
          </Link>

          <button
            className="btn btn-ghost btn-small site-menu-toggle"
            type="button"
            data-menu-toggle
            aria-controls="site-nav"
            aria-expanded={menuOpen ? 'true' : 'false'}
            onClick={() => setMenuOpen((value) => !value)}
          >
            ☰
          </button>

          <nav className="site-nav" id="site-nav" ref={navRef}>
            <NavLink to="/" className={menuClass} end onClick={closeMenu}>
              {t('nav.home')}
            </NavLink>

            <details className="nav-dropdown" onToggle={(event) => handleDropdownToggle(event.currentTarget)}>
              <summary>{t('nav.information')}</summary>
              <div className="nav-dropdown-menu">
                <NavLink to="/about" className={menuClass} onClick={closeMenu}>
                  {t('nav.about')}
                </NavLink>
                <NavLink to="/faq" className={menuClass} onClick={closeMenu}>
                  {t('nav.faq')}
                </NavLink>
                <details className="nav-sub-dropdown" onToggle={(event) => handleDropdownToggle(event.currentTarget)}>
                  <summary>{t('nav.gameTypes')}</summary>
                  <div className="nav-sub-dropdown-menu">
                    {gameLinks.map((game) => (
                      <NavLink key={game.type} to={`/info/games/${game.slug}`} className={menuClass} onClick={closeMenu}>
                        {t(`gameCatalog.${game.type}.name`, {}, game.name)}
                      </NavLink>
                    ))}
                  </div>
                </details>
              </div>
            </details>

            <details className="nav-dropdown" onToggle={(event) => handleDropdownToggle(event.currentTarget)}>
              <summary>{t('nav.account')}</summary>
              <div className="nav-dropdown-menu">
                {isAuthenticated ? (
                  <>
                    <span className="nav-user">{t('nav.signedInAs', { role: auth.principalType })}</span>
                    {auth.principalType === 'user' ? (
                      <NavLink to="/admin/games" className={menuClass} onClick={closeMenu}>
                        {t('nav.games')}
                      </NavLink>
                    ) : (
                      <NavLink to="/team" className={menuClass} onClick={closeMenu}>
                        {t('nav.teamDashboard')}
                      </NavLink>
                    )}
                    <button
                      className="btn btn-ghost btn-small"
                      type="button"
                      onClick={() => {
                        logout()
                        closeMenu()
                      }}
                    >
                      {t('nav.logout')}
                    </button>
                  </>
                ) : (
                  <>
                    <NavLink to="/register" className={menuClass} onClick={closeMenu}>
                      {t('nav.register')}
                    </NavLink>
                    <NavLink to="/login" className={menuClass} onClick={closeMenu}>
                      {t('nav.login')}
                    </NavLink>
                  </>
                )}
              </div>
            </details>

            <details className="nav-dropdown" onToggle={(event) => handleDropdownToggle(event.currentTarget)}>
              <summary>{t('nav.team')}</summary>
              <div className="nav-dropdown-menu">
                <NavLink to="/team-login" className={menuClass} onClick={closeMenu}>
                  {t('nav.teamLogin')}
                </NavLink>
                {isAuthenticated && auth.principalType === 'team' ? (
                  <NavLink to="/team" className={menuClass} onClick={closeMenu}>
                    {t('nav.teamDashboard')}
                  </NavLink>
                ) : null}
              </div>
            </details>

            <details className="nav-dropdown nav-dropdown-locale" onToggle={(event) => handleDropdownToggle(event.currentTarget)}>
              <summary>{t('nav.language')}</summary>
              <div className="nav-dropdown-menu">
                {supportedLocales.map((localeCode) => (
                  <button
                    key={localeCode}
                    type="button"
                    className="btn btn-ghost btn-small"
                    onClick={() => {
                      setLocale(localeCode)
                      closeMenu()
                    }}
                    aria-pressed={locale === localeCode}
                    style={{ justifyContent: 'flex-start' }}
                  >
                    {LOCALE_LABELS[localeCode] || localeCode}
                    {locale === localeCode ? ' ✓' : ''}
                  </button>
                ))}
              </div>
            </details>

            <button
              className="btn btn-ghost btn-small site-theme-toggle"
              type="button"
              data-theme-toggle
              aria-label={t('nav.toggleDark')}
              title={t('nav.toggleDark')}
              onClick={toggleTheme}
            >
              {theme === 'dark' ? '☀️' : '🌙'}
            </button>
          </nav>
        </div>
      </header>
      <div className="page-shell">{children}</div>
    </>
  )
}
