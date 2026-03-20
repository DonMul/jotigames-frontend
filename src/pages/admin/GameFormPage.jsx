import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { gameApi } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { GAME_BY_TYPE } from '../../lib/gameCatalog'
import { useI18n } from '../../lib/i18n'

function toDateTimeLocalString(value) {
  if (!value) {
    return ''
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return ''
  }

  const offsetMs = parsed.getTimezoneOffset() * 60 * 1000
  const local = new Date(parsed.getTime() - offsetMs)
  return local.toISOString().slice(0, 16)
}

function toIsoStringOrNull(value) {
  if (!value) {
    return null
  }

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return null
  }

  return parsed.toISOString()
}

function getDefaultDateWindow() {
  const now = new Date()
  const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000)
  return {
    startAt: toDateTimeLocalString(now),
    endAt: toDateTimeLocalString(tomorrow),
  }
}

export default function GameFormPage() {
  const { gameId } = useParams()
  const { auth } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()

  const isEdit = Boolean(gameId)
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [gameTypes, setGameTypes] = useState([])

  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [startAt, setStartAt] = useState('')
  const [endAt, setEndAt] = useState('')
  const [gameType, setGameType] = useState('')

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError('')
      try {
        const [types, game] = await Promise.all([
          gameApi.listGameTypes(auth.token),
          isEdit ? gameApi.getGame(auth.token, gameId) : Promise.resolve(null),
        ])

        if (cancelled) {
          return
        }

        const availableTypes = Array.isArray(types) ? types : []
        setGameTypes(availableTypes)

        if (isEdit && game) {
          setName(String(game.name || ''))
          setCode(String(game.code || ''))
          setStartAt(toDateTimeLocalString(game.start_at))
          setEndAt(toDateTimeLocalString(game.end_at))
          setGameType(String(game.game_type || availableTypes[0] || ''))
        } else {
          const defaults = getDefaultDateWindow()
          setGameType((current) => current || availableTypes[0] || '')
          setStartAt((current) => current || defaults.startAt)
          setEndAt((current) => current || defaults.endAt)
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || t('gameForm.loadFailed'))
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [auth.token, gameId, isEdit, t])

  const backPath = useMemo(() => (isEdit ? `/admin/games/${gameId}` : '/admin/games'), [gameId, isEdit])

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSaving(true)

    try {
      const basePayload = {
        name: name.trim(),
        start_at: toIsoStringOrNull(startAt),
        end_at: toIsoStringOrNull(endAt),
        game_type: gameType,
      }

      if (!basePayload.start_at || !basePayload.end_at) {
        throw new Error(t('gameForm.dateRequired'))
      }

      if (isEdit) {
        const payload = {
          ...basePayload,
          code: code.trim(),
        }
        const updated = await gameApi.updateGame(auth.token, gameId, payload)
        navigate(`/admin/games/${updated?.id || gameId}`)
      } else {
        const created = await gameApi.createGame(auth.token, basePayload)
        navigate(`/admin/games/${created?.id || ''}`)
      }
    } catch (err) {
      setError(err.message || t('gameForm.saveFailed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="page-shell">
      <section className="overview-header">
        <div>
          <h1>{isEdit ? t('gameForm.editTitle') : t('gameForm.newTitle')}</h1>
        </div>
        <div className="overview-actions">
          <Link className="btn btn-ghost" to={backPath}>
            {t('gameForm.back')}
          </Link>
        </div>
      </section>

      {loading ? <p>{t('gamesPage.loading')}</p> : null}
      {error ? <div className="flash flash-error">{error}</div> : null}

      {!loading ? (
        <form onSubmit={handleSubmit} className="admin-panel">
          <div className="form-row">
            <label htmlFor="game-name">{t('gameForm.name')}</label>
            <input id="game-name" value={name} onChange={(event) => setName(event.target.value)} required />
          </div>

          <div className="form-row game-type-select-row">
            <label htmlFor="game-type">{t('gameForm.type')}</label>
            <select id="game-type" value={gameType} onChange={(event) => setGameType(event.target.value)} required disabled={isEdit}>
              <option value="">{t('gameForm.selectType')}</option>
              {gameTypes.map((type) => (
                <option key={type} value={type}>
                  {t(`gameCatalog.${type}.name`, {}, GAME_BY_TYPE[type]?.name || type)}
                </option>
              ))}
            </select>
            <div className={`game-type-picker${isEdit ? ' is-disabled' : ''}`} role="radiogroup" aria-label={t('gameForm.type')}>
              {gameTypes.map((type) => {
                const isSelected = type === gameType
                const gameInfo = GAME_BY_TYPE[type]

                return (
                  <button
                    key={type}
                    type="button"
                    className={`game-type-option${isSelected ? ' is-selected' : ''}`}
                    aria-pressed={isSelected}
                    role="radio"
                    aria-checked={isSelected}
                    disabled={isEdit}
                    onClick={() => {
                      if (!isEdit) {
                        setGameType(type)
                      }
                    }}
                  >
                    {gameInfo?.logo ? (
                      <img
                        src={gameInfo.logo}
                        alt={t(`gameCatalog.${type}.name`, {}, gameInfo.name || type)}
                        className="game-type-option-logo"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : null}
                    <span className="game-type-option-label">{t(`gameCatalog.${type}.name`, {}, gameInfo?.name || type)}</span>
                  </button>
                )
              })}
            </div>
          </div>

          {isEdit ? (
            <div className="form-row">
              <label htmlFor="game-code">{t('gameForm.code')}</label>
              <input id="game-code" value={code} onChange={(event) => setCode(event.target.value)} required maxLength={64} />
            </div>
          ) : null}

          <div className="game-datetime-row">
            <div className="form-row game-datetime-field">
              <label htmlFor="game-start">{t('gameForm.starts')}</label>
              <input id="game-start" className="game-datetime-input" type="datetime-local" value={startAt} onChange={(event) => setStartAt(event.target.value)} required />
            </div>
            <div className="form-row game-datetime-field">
              <label htmlFor="game-end">{t('gameForm.ends')}</label>
              <input id="game-end" className="game-datetime-input" type="datetime-local" value={endAt} onChange={(event) => setEndAt(event.target.value)} required />
            </div>
          </div>

          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? t('gameForm.saving') : t('gameForm.save')}
          </button>
        </form>
      ) : null}
    </main>
  )
}
