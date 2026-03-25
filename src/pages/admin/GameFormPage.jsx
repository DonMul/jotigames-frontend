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
    <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-navy-900">{isEdit ? t('gameForm.editTitle') : t('gameForm.newTitle')}</h1>
        <Link className="btn btn-ghost" to={backPath}>
          {t('gameForm.back')}
        </Link>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-4 border-brand-200 border-t-brand-500 rounded-full animate-spin" />
        </div>
      ) : null}
      {error ? <div className="flash flash-error">{error}</div> : null}

      {!loading ? (
        <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 space-y-6">
          {/* Name */}
          <div className="space-y-1.5">
            <label htmlFor="game-name" className="block text-sm font-medium text-navy-700">{t('gameForm.name')}</label>
            <input
              id="game-name"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-navy-900 placeholder-gray-400 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none transition-colors"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              placeholder={t('gameForm.namePlaceholder', {}, 'e.g. Saturday Night Hunt')}
            />
          </div>

          {/* Game type picker */}
          <div className="space-y-2">
            <label className="block text-sm font-medium text-navy-700">{t('gameForm.type')}</label>
            {/* Hidden native select for accessibility */}
            <select
              id="game-type"
              className="sr-only"
              value={gameType}
              onChange={(event) => setGameType(event.target.value)}
              required
              disabled={isEdit}
            >
              <option value="">{t('gameForm.selectType')}</option>
              {gameTypes.map((type) => (
                <option key={type} value={type}>
                  {t(`gameCatalog.${type}.name`, {}, GAME_BY_TYPE[type]?.name || type)}
                </option>
              ))}
            </select>
            <div
              className={`grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 ${isEdit ? 'opacity-60 pointer-events-none' : ''}`}
              role="radiogroup"
              aria-label={t('gameForm.type')}
            >
              {gameTypes.map((type) => {
                const isSelected = type === gameType
                const gameInfo = GAME_BY_TYPE[type]

                return (
                  <button
                    key={type}
                    type="button"
                    className={`flex flex-col items-center gap-1.5 rounded-xl border-2 px-3 py-3 text-center transition-all duration-150 ${
                      isSelected
                        ? 'border-brand-500 bg-brand-50 ring-2 ring-brand-200'
                        : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                    }`}
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
                        className="w-8 h-8 object-contain"
                        loading="lazy"
                        decoding="async"
                      />
                    ) : (
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4 text-gray-400" viewBox="0 0 20 20" fill="currentColor"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                      </div>
                    )}
                    <span className={`text-xs font-medium ${isSelected ? 'text-brand-700' : 'text-navy-700'}`}>
                      {t(`gameCatalog.${type}.name`, {}, gameInfo?.name || type)}
                    </span>
                  </button>
                )
              })}
            </div>
          </div>

          {/* Code (edit only) */}
          {isEdit ? (
            <div className="space-y-1.5">
              <label htmlFor="game-code" className="block text-sm font-medium text-navy-700">{t('gameForm.code')}</label>
              <input
                id="game-code"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-navy-900 font-mono focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none transition-colors"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                required
                maxLength={64}
              />
            </div>
          ) : null}

          {/* Date/time row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="game-start" className="block text-sm font-medium text-navy-700">{t('gameForm.starts')}</label>
              <input
                id="game-start"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-navy-900 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none transition-colors"
                type="datetime-local"
                value={startAt}
                onChange={(event) => setStartAt(event.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="game-end" className="block text-sm font-medium text-navy-700">{t('gameForm.ends')}</label>
              <input
                id="game-end"
                className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-navy-900 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none transition-colors"
                type="datetime-local"
                value={endAt}
                onChange={(event) => setEndAt(event.target.value)}
                required
              />
            </div>
          </div>

          {/* Submit */}
          <div className="pt-2">
            <button
              className="w-full sm:w-auto rounded-lg bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 active:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              type="submit"
              disabled={saving}
            >
              {saving ? t('gameForm.saving') : t('gameForm.save')}
            </button>
          </div>
        </form>
      ) : null}
    </main>
  )
}
