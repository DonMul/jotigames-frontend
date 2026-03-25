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
    <main className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-navy-900">{t('bulkTools.title', {}, 'Bulk tools')}</h1>
          <p className="text-sm text-gray-500 mt-1">{t('bulkTools.subtitle', {}, 'Bulk create teams for this game')}</p>
        </div>
        <Link className="btn btn-ghost" to={backPath}>
          {t('bulkTools.back', {}, 'Back')}
        </Link>
      </div>

      {error ? <div className="flash flash-error">{error}</div> : null}
      {createdCount > 0 ? <div className="flash flash-success">{t('bulkTools.created', { count: createdCount }, `Created ${createdCount} teams`)}</div> : null}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-navy-900 mb-4">{t('bulkTools.teamsTitle', {}, 'Teams')}</h2>
        <form className="grid grid-cols-1 sm:grid-cols-3 gap-4" onSubmit={handleBulkCreate}>
          <div className="space-y-1.5">
            <label htmlFor="bulk-team-amount" className="block text-sm font-medium text-navy-700">{t('bulkTools.amount', {}, 'Amount')}</label>
            <input
              id="bulk-team-amount"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-navy-900 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none transition-colors"
              type="number"
              min="1"
              max="200"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="bulk-team-prefix" className="block text-sm font-medium text-navy-700">{t('bulkTools.prefix', {}, 'Prefix')}</label>
            <input
              id="bulk-team-prefix"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-navy-900 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none transition-colors"
              type="text"
              value={prefix}
              onChange={(event) => setPrefix(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="bulk-team-start" className="block text-sm font-medium text-navy-700">{t('bulkTools.start', {}, 'Start')}</label>
            <input
              id="bulk-team-start"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-navy-900 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none transition-colors"
              type="number"
              min="1"
              value={startIndex}
              onChange={(event) => setStartIndex(event.target.value)}
            />
          </div>
          <div className="sm:col-span-3 pt-2">
            <button
              className="w-full sm:w-auto rounded-lg bg-brand-500 px-6 py-2.5 text-sm font-semibold text-white hover:bg-brand-600 active:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              type="submit"
              disabled={saving}
            >
              {saving ? t('bulkTools.creating', {}, 'Creating…') : t('bulkTools.submit', {}, 'Create teams')}
            </button>
          </div>
        </form>
      </div>
    </main>
  )
}
