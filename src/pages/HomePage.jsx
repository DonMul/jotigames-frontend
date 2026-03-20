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
        if (!cancelled) {
          setEnabledTypes(types)
        }
      } catch {
        if (!cancelled) {
          setEnabledTypes([])
        }
      }
    }

    loadTypes()
    return () => {
      cancelled = true
    }
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
      <section className="hero">
        <div className="hero-copy">
          <p className="hero-kicker">{t('home.kicker')}</p>
          <h1>{t('home.headline')}</h1>
          <p className="hero-lede">{t('home.lede')}</p>
          <div className="hero-actions">
            {isAuthenticated ? (
              <>
                  <Link className="btn btn-primary" to="/admin/games">
                  {t('home.ctaManageGames')}
                </Link>
                <Link className="btn btn-ghost" to="/team">
                  {t('home.ctaTeamDashboard')}
                </Link>
              </>
            ) : (
              <>
                <Link className="btn btn-primary" to="/register">
                  {t('home.ctaRegister')}
                </Link>
                <Link className="btn btn-ghost" to="/login">
                  {t('home.ctaLogin')}
                </Link>
              </>
            )}
          </div>
          <div className="hero-tags">
            <span>{t('home.tagAllAges')}</span>
            <span>{t('home.tagScoutFriendly')}</span>
            <span>{t('home.tagTeamPlay')}</span>
            <span>{t('home.tagShortLong')}</span>
          </div>
        </div>

        <aside className="hero-panel">
          <div className="panel-header">
            <div>
              <p className="panel-kicker">{t('home.quickStart')}</p>
              <h2>{t('home.teamLogin')}</h2>
            </div>
            <span className="panel-badge">{t('home.panelLive')}</span>
          </div>
          <p className="panel-lede">{t('home.panelLede')}</p>
          <form onSubmit={submitTeamLogin}>
            <div className="form-grid">
              <div>
                <label htmlFor="homeGameCode">{t('home.gameCode')}</label>
                <input id="homeGameCode" value={gameCode} onChange={(event) => setGameCode(event.target.value)} required />
              </div>
              <div>
                <label htmlFor="homeTeamCode">{t('home.teamCode')}</label>
                <input id="homeTeamCode" value={teamCode} onChange={(event) => setTeamCode(event.target.value)} required />
              </div>
            </div>
            {error ? <div className="flash flash-error">{error}</div> : null}
            <button className="btn btn-primary" type="submit">
              {t('home.joinTeamGame')}
            </button>
          </form>
          <p className="panel-footer">{t('home.panelFooter')}</p>
        </aside>
      </section>

      <GameTypesCarousel enabledTypes={enabledTypes} />

      <section className="features">
        <article>
          <h3>{t('home.featureOneTitle')}</h3>
          <p>{t('home.featureOneText')}</p>
        </article>
        <article>
          <h3>{t('home.featureTwoTitle')}</h3>
          <p>{t('home.featureTwoText')}</p>
        </article>
        <article>
          <h3>{t('home.featureThreeTitle')}</h3>
          <p>{t('home.featureThreeText')}</p>
        </article>
      </section>

      <section className="steps">
        <div className="steps-header">
          <h2>{t('home.stepsTitle')}</h2>
          <p>{t('home.stepsSubtitle')}</p>
        </div>
        <div className="steps-grid">
          <div className="step-card">
            <span>1</span>
            <h4>{t('home.step1Title')}</h4>
            <p>{t('home.step1Text')}</p>
          </div>
          <div className="step-card">
            <span>2</span>
            <h4>{t('home.step2Title')}</h4>
            <p>{t('home.step2Text')}</p>
          </div>
          <div className="step-card">
            <span>3</span>
            <h4>{t('home.step3Title')}</h4>
            <p>{t('home.step3Text')}</p>
          </div>
        </div>
      </section>
    </>
  )
}
