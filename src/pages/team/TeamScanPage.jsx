import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'

import GameCardDisplay from '../../components/shared/GameCardDisplay'
import { gameApi, moduleApi } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { useI18n } from '../../lib/i18n'

function toAssetUrl(path) {
  const raw = String(path || '').trim()
  if (!raw) {
    return ''
  }
  if (raw.startsWith('http://') || raw.startsWith('https://') || raw.startsWith('/')) {
    return raw
  }
  return `/${raw}`
}

function getCardTypeLabel(type, t) {
  const raw = String(type || '').trim()
  if (!raw) {
    return t('teamScan.card', {}, 'Card')
  }
  const normalized = raw.startsWith('card.type.') ? raw.replace('card.type.', '') : raw
  return t(`explodingKittens.cardTypes.${normalized}`, {}, normalized.replaceAll('_', ' '))
}

function getCardTitle(card, t) {
  const title = String(card?.title || '').trim()
  if (!title) {
    return getCardTypeLabel(card?.type, t)
  }
  if (title.startsWith('card.type.')) {
    return getCardTypeLabel(title, t)
  }
  return title
}

export default function TeamScanPage() {
  const { qrToken } = useParams()
  const { auth } = useAuth()
  const { t } = useI18n()

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [dashboard, setDashboard] = useState(null)
  const [scanResult, setScanResult] = useState(null)
  const [scanCard, setScanCard] = useState(null)
  const [targetTeamId, setTargetTeamId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const isTeam = auth?.principalType === 'team'
  const teams = useMemo(() => {
    return Array.isArray(dashboard?.teams) ? dashboard.teams : []
  }, [dashboard?.teams])

  async function runScan(options = {}) {
    if (!dashboard?.game_id || !dashboard?.team_id) {
      return
    }

    const targetTeam = String(options.targetTeamId || '').trim()

    setSubmitting(true)
    setError('')
    try {
      const result = await moduleApi.submitExplodingAction(auth.token, dashboard.game_id, dashboard.team_id, 'scan', {
        qr_token: String(qrToken || '').trim(),
        target_team_id: targetTeam || undefined,
      })
      if (result?.card && typeof result.card === 'object') {
        setScanCard(result.card)
      }
      setScanResult(result)
    } catch (err) {
      setError(err.message || t('teamScan.scanFailed', {}, 'Could not process scan'))
    } finally {
      setSubmitting(false)
    }
  }

  async function runResolveState(options = {}) {
    if (!dashboard?.game_id || !dashboard?.team_id) {
      return
    }

    const confirmPeek = Boolean(options.confirmPeek)
    const rejectPeek = Boolean(options.rejectPeek)
    const targetTeam = String(options.targetTeamId || '').trim()

    setSubmitting(true)
    setError('')
    try {
      const result = await moduleApi.submitExplodingAction(auth.token, dashboard.game_id, dashboard.team_id, 'resolve-state', {
        qr_token: String(qrToken || '').trim(),
        confirm_peek: confirmPeek,
        reject_peek: rejectPeek,
        target_team_id: targetTeam || undefined,
      })
      if (result?.card && typeof result.card === 'object') {
        setScanCard(result.card)
      }
      setScanResult(result)
    } catch (err) {
      setError(err.message || t('teamScan.scanFailed', {}, 'Could not process scan'))
    } finally {
      setSubmitting(false)
    }
  }

  useEffect(() => {
    let cancelled = false

    async function bootstrapAndScan() {
      setLoading(true)
      setError('')
      setScanResult(null)
      setScanCard(null)
      try {
        if (!isTeam || !auth?.token) {
          return
        }

        const payload = await gameApi.getTeamDashboard(auth.token)
        if (!payload?.game_id || !payload?.team_id) {
          throw new Error(t('teamScan.noGame', {}, 'Could not resolve active team game'))
        }
        if (String(payload?.game_type || '') !== 'exploding_kittens') {
          throw new Error(t('teamScan.invalidGameType', {}, 'Scan is only available for Exploding Kittens'))
        }

        if (cancelled) {
          return
        }

        setDashboard(payload)

        const result = await moduleApi.submitExplodingAction(auth.token, payload.game_id, payload.team_id, 'scan', {
          qr_token: String(qrToken || '').trim(),
          confirm_peek: false,
        })

        if (cancelled) {
          return
        }

        if (result?.card && typeof result.card === 'object') {
          setScanCard(result.card)
        }
        setScanResult(result)
      } catch (err) {
        if (!cancelled) {
          setError(err.message || t('teamScan.scanFailed', {}, 'Could not process scan'))
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    bootstrapAndScan()

    return () => {
      cancelled = true
    }
  }, [auth?.token, isTeam, qrToken, t])

  if (!isTeam) {
    return <Navigate to="/team-login" replace />
  }

  const status = String(scanResult?.status || '').trim()
  const pendingState = String(scanResult?.pending_state || '').trim()
  const currentCard = scanResult?.card && typeof scanResult.card === 'object' ? scanResult.card : scanCard
  const messageRaw = String(scanResult?.message_key || '').trim()
  const message = messageRaw ? t(messageRaw, {}, messageRaw) : ''

  const showPreview = status === 'pending_state' && pendingState === 'see_the_future'
  const showTarget = status === 'pending_state' && pendingState === 'attack'

  return (
    <main className="page-shell">
      <section className="overview-header">
        <div>
          <h1>{t('teamScan.title', {}, 'Card scan')}</h1>
          <p className="overview-subtitle">{dashboard?.game_name || '-'}</p>
        </div>
        <div className="overview-actions">
          <Link className="btn btn-ghost" to="/team/dashboard">
            {t('teamScan.backToDashboard', {}, 'Back to dashboard')}
          </Link>
        </div>
      </section>

      {loading ? <p>{t('gamesPage.loading', {}, 'Loading…')}</p> : null}
      {error ? <div className="flash flash-error">{error}</div> : null}

      {!loading && !error && scanResult ? (
        <section className="team-panel">
          {showPreview ? (
            <>
              <h2>{t('teamScan.previewTitle', {}, 'Card preview')}</h2>
              <p>{t('teamScan.previewText', {}, 'This scan is in preview mode. Confirm to apply.')}</p>
            </>
          ) : null}

          {showTarget ? (
            <>
              <h2>{t('teamScan.targetTitle', {}, 'Choose target')}</h2>
              <p>{t('teamScan.targetText', {}, 'Select the target team for this attack scan.')}</p>
            </>
          ) : null}

          {!showPreview && !showTarget ? (
            <>
              <h2>{t('teamScan.resultTitle', {}, 'Scan result')}</h2>
              <p>{message || t('teamScan.completed', {}, 'Scan processed')}</p>
            </>
          ) : null}

          {currentCard ? (
            <article className="scan-card-preview hand-card">
              <GameCardDisplay
                imageSrc={toAssetUrl(currentCard.image_path)}
                imageAlt={getCardTypeLabel(currentCard.type, t)}
                title={getCardTitle(currentCard, t)}
                subtitle={getCardTypeLabel(currentCard.type, t)}
              />
            </article>
          ) : null}

          <div className="overview-actions">
            {showPreview ? (
              <>
                <button className="btn btn-primary" type="button" onClick={() => runResolveState({ confirmPeek: true })} disabled={submitting}>
                  {t('teamScan.confirm', {}, 'Confirm')}
                </button>
                <button className="btn btn-ghost" type="button" onClick={() => runResolveState({ rejectPeek: true })} disabled={submitting}>
                  {t('teamScan.reject', {}, 'Reject')}
                </button>
              </>
            ) : null}

            {showTarget ? (
              <>
                <div className="scan-target-field">
                  <label className="scan-target-label" htmlFor="scan-target-team-select">
                    {t('teamScan.targetChoose', {}, 'Choose target team')}
                  </label>
                  <select
                    id="scan-target-team-select"
                    className="scan-target-select"
                    value={targetTeamId}
                    onChange={(event) => setTargetTeamId(event.target.value)}
                  >
                    <option value="">{t('teamScan.targetChoose', {}, 'Choose target team')}</option>
                    {teams.map((team) => (
                      <option key={team.id} value={team.id}>{team.name}</option>
                    ))}
                  </select>
                </div>
                <button
                  className="btn btn-primary"
                  type="button"
                  disabled={submitting || !String(targetTeamId || '').trim()}
                  onClick={() => runResolveState({ targetTeamId })}
                >
                  {t('teamScan.targetSubmit', {}, 'Confirm target')}
                </button>
              </>
            ) : null}

            {!showPreview && !showTarget ? (
              <Link className="btn btn-primary" to="/team/dashboard">
                {t('teamScan.resultBack', {}, 'Back to dashboard')}
              </Link>
            ) : null}
          </div>
        </section>
      ) : null}
    </main>
  )
}
