import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { gameApi } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { useI18n } from '../../lib/i18n'

function buildCode(index) {
  return String(index).padStart(6, '0').slice(-6)
}

export default function BulkToolsPage() {
  const { gameId } = useParams()
  const { auth } = useAuth()
  const { t } = useI18n()
  const navigate = useNavigate()

  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [createdCount, setCreatedCount] = useState(0)

  const [amount, setAmount] = useState('5')
  const [prefix, setPrefix] = useState('Team')
  const [startIndex, setStartIndex] = useState('1')

  const backPath = useMemo(() => `/admin/games/${gameId}`, [gameId])

  async function handleBulkCreate(event) {
    event.preventDefault()
    setError('')
    setSaving(true)
    setCreatedCount(0)

    try {
      const amountValue = Math.max(1, Math.min(Number(amount || 1), 200))
      const startValue = Math.max(1, Number(startIndex || 1))

      let created = 0
      for (let i = 0; i < amountValue; i += 1) {
        const currentIndex = startValue + i
        await gameApi.createTeam(auth.token, gameId, {
          name: `${prefix.trim() || 'Team'} ${currentIndex}`,
          code: buildCode(currentIndex),
        })
        created += 1
      }

      setCreatedCount(created)
      navigate(backPath)
    } catch (err) {
      setError(err.message || t('bulkTools.createFailed', {}, 'Bulk create failed'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="page-shell">
      <section className="overview-header">
        <div>
          <h1>{t('bulkTools.title', {}, 'Bulk tools')}</h1>
          <p className="overview-subtitle">{t('bulkTools.subtitle', {}, 'Bulk create teams for this game')}</p>
        </div>
        <div className="overview-actions">
          <Link className="btn btn-ghost" to={backPath}>
            {t('bulkTools.back', {}, 'Back')}
          </Link>
        </div>
      </section>

      {error ? <div className="flash flash-error">{error}</div> : null}
      {createdCount > 0 ? <div className="flash flash-success">{t('bulkTools.created', { count: createdCount }, `Created ${createdCount} teams`)}</div> : null}

      <section className="geo-layout">
        <div className="overview-panel">
          <h2>{t('bulkTools.teamsTitle', {}, 'Teams')}</h2>
          <form className="admin-inline-form" onSubmit={handleBulkCreate}>
            <label htmlFor="bulk-team-amount">{t('bulkTools.amount', {}, 'Amount')}</label>
            <input id="bulk-team-amount" type="number" min="1" max="200" value={amount} onChange={(event) => setAmount(event.target.value)} />

            <label htmlFor="bulk-team-prefix">{t('bulkTools.prefix', {}, 'Prefix')}</label>
            <input id="bulk-team-prefix" type="text" value={prefix} onChange={(event) => setPrefix(event.target.value)} />

            <label htmlFor="bulk-team-start">{t('bulkTools.start', {}, 'Start')}</label>
            <input id="bulk-team-start" type="number" min="1" value={startIndex} onChange={(event) => setStartIndex(event.target.value)} />

            <button className="btn btn-primary btn-small" type="submit" disabled={saving}>
              {saving ? t('bulkTools.creating', {}, 'Creating…') : t('bulkTools.submit', {}, 'Create teams')}
            </button>
          </form>
        </div>
      </section>
    </main>
  )
}
