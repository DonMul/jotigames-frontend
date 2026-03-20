import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { gameApi, moduleApi } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { useI18n } from '../../lib/i18n'

const CARD_TYPES = [
  'attack',
  'defuse',
  'exploding_kitten',
  'favor',
  'felix',
  'nope',
  'see_the_future',
  'shuffle',
  'skip',
  'random1',
  'random2',
  'random3',
  'random4',
  'random5',
]

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

export default function GameCardsPage() {
  const { gameId } = useParams()
  const { auth } = useAuth()
  const { t } = useI18n()

  const [game, setGame] = useState(null)
  const [teams, setTeams] = useState([])
  const [cards, setCards] = useState([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [bulkCardType, setBulkCardType] = useState('attack')
  const [bulkCardQuantity, setBulkCardQuantity] = useState('1')

  const teamNameById = useMemo(() => {
    const mapping = {}
    for (const team of teams) {
      mapping[String(team?.id || '')] = String(team?.name || '')
    }
    return mapping
  }, [teams])

  async function loadAll() {
    setLoading(true)
    setError('')
    try {
      const [gameRecord, teamRows, cardRows] = await Promise.all([
        gameApi.getGame(auth.token, gameId),
        gameApi.listTeams(auth.token, gameId),
        moduleApi.listExplodingCards(auth.token, gameId),
      ])

      if (!gameRecord) {
        throw new Error(t('gameCardsPage.gameNotFound'))
      }

      setGame(gameRecord)
      setTeams(Array.isArray(teamRows) ? teamRows : [])
      setCards(Array.isArray(cardRows) ? cardRows : [])
    } catch (err) {
      setError(err.message || t('gameCardsPage.loadFailed'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [auth.token, gameId])

  function cardTypeLabel(cardType) {
    const normalized = String(cardType || '').trim()
    if (!normalized) {
      return '-'
    }
    return t(`explodingKittens.cardTypes.${normalized}`, {}, normalized.replaceAll('_', ' '))
  }

  function cardTitle(card) {
    const title = String(card?.title || '').trim()
    if (!title) {
      return cardTypeLabel(card?.type)
    }
    if (title.startsWith('card.type.')) {
      return cardTypeLabel(title.replace('card.type.', ''))
    }
    return title
  }

  async function handleBulkAdd(event) {
    event.preventDefault()

    setSaving(true)
    setError('')
    setSuccess('')

    try {
      await moduleApi.addExplodingCardsBulk(auth.token, gameId, bulkCardType.trim(), Number(bulkCardQuantity || 1))
      setSuccess(t('gameCardsPage.addSuccess'))
      await loadAll()
    } catch (err) {
      setError(err.message || t('gameCardsPage.addFailed'))
    } finally {
      setSaving(false)
    }
  }

  async function handleDeleteCard(card) {
    const resolvedTitle = cardTitle(card)
    if (!window.confirm(t('gameCardsPage.confirmRemove', { card: resolvedTitle }))) {
      return
    }

    setError('')
    setSuccess('')

    try {
      await moduleApi.deleteExplodingCard(auth.token, gameId, String(card?.id || ''))
      setSuccess(t('gameCardsPage.removeSuccess'))
      await loadAll()
    } catch (err) {
      setError(err.message || t('gameCardsPage.removeFailed'))
    }
  }

  return (
    <main className="page-shell">
      <section className="overview-header">
        <div>
          <h1>{t('gameCardsPage.title')}</h1>
          <p className="overview-subtitle">{t('gameCardsPage.subtitle', { game: game?.name || '-' })}</p>
        </div>
        <div className="overview-actions">
          <Link className="btn btn-primary" to={`/admin/games/${gameId}/cards/pdf`}>
            {t('gameCardsPage.exportPdf')}
          </Link>
          <Link className="btn btn-ghost" to={`/admin/games/${gameId}`}>
            {t('gameCardsPage.back')}
          </Link>
        </div>
      </section>

      {loading ? <p>{t('gamesPage.loading')}</p> : null}
      {error ? <div className="flash flash-error">{error}</div> : null}
      {success ? <div className="flash flash-success">{success}</div> : null}

      <form className="admin-inline-form" onSubmit={handleBulkAdd}>
        <label htmlFor="bulk-card-type">{t('gameCardsPage.addType')}</label>
        <select id="bulk-card-type" value={bulkCardType} onChange={(event) => setBulkCardType(event.target.value)}>
          {CARD_TYPES.map((cardType) => (
            <option key={cardType} value={cardType}>
              {cardTypeLabel(cardType)}
            </option>
          ))}
        </select>
        <label htmlFor="bulk-card-quantity">{t('gameCardsPage.addQuantity')}</label>
        <input
          id="bulk-card-quantity"
          type="number"
          min="1"
          max="50"
          value={bulkCardQuantity}
          onChange={(event) => setBulkCardQuantity(event.target.value)}
        />
        <button className="btn btn-add btn-small" type="submit" disabled={saving}>
          {t('gameCardsPage.addSubmit')}
        </button>
      </form>

      <table className="admin-table">
        <thead>
          <tr>
            <th>{t('gameCardsPage.tableImage')}</th>
            <th>{t('gameCardsPage.tableType')}</th>
            <th>{t('gameCardsPage.tableTitle')}</th>
            <th>{t('gameCardsPage.tableToken')}</th>
            <th>{t('gameCardsPage.tableHolder')}</th>
            <th className="text-right">{t('gamesPage.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {cards.length === 0 ? (
            <tr>
              <td colSpan={6}>{t('gameCardsPage.noCards')}</td>
            </tr>
          ) : (
            cards.map((card) => {
              const holderId = String(card?.holder_team_id || '')
              const holderName = holderId ? teamNameById[holderId] || holderId : t('gameCardsPage.inDeck')
              const imageUrl = toAssetUrl(card?.image_path)

              return (
                <tr key={card.id}>
                  <td>
                    {imageUrl ? (
                      <img className="card-thumb" src={imageUrl} alt={cardTitle(card)} />
                    ) : (
                      <span className="muted">{t('gameCardsPage.imageMissing')}</span>
                    )}
                  </td>
                  <td>{cardTypeLabel(card?.type)}</td>
                  <td>{cardTitle(card)}</td>
                  <td>
                    <code>{String(card?.qr_token || '')}</code>
                  </td>
                  <td>{holderName}</td>
                  <td className="text-right table-actions-inline">
                    <button className="btn btn-remove btn-small" type="button" onClick={() => handleDeleteCard(card)}>
                      {t('gameCardsPage.remove')}
                    </button>
                  </td>
                </tr>
              )
            })
          )}
        </tbody>
      </table>
    </main>
  )
}
