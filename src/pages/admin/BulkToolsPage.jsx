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
      setError(err.message || t('error.createFailed', {}))
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="page-shell">
      {/* Header */}
      <div className="geo-header">
        <div>
          <h1>{t('bulkTools.title', {})}</h1>
        </div>
        <div className="overview-actions">
          <Link className="btn btn-ghost" to={backPath}>
            {t('common.back', {})}
          </Link>
        </div>
      </div>

      {error ? <div className="flash flash-error">{error}</div> : null}
      {createdCount > 0 ? <div className="flash flash-success">{t('bulkTools.created', { count: createdCount })}</div> : null}

      <section className="admin-block">
        <h2>{t('bulkTools.teamsTitle', {})}</h2>
        <p className="text-sm text-gray-500 mt-1 dark:text-slate-400">{t('bulkTools.subtitle', {})}</p>
        <br/>
        <form className="grid grid-cols-1 sm:grid-cols-3 gap-4" onSubmit={handleBulkCreate}>
          <div className="space-y-1.5">
            <label htmlFor="bulk-team-amount" className="block text-sm font-medium text-navy-700 dark:text-slate-300">{t('bulkTools.amount', {})}</label>
            <input
              id="bulk-team-amount"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-navy-900 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none transition-colors dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              type="number"
              min="1"
              max="200"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="bulk-team-prefix" className="block text-sm font-medium text-navy-700 dark:text-slate-300">{t('bulkTools.prefix', {})}</label>
            <input
              id="bulk-team-prefix"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-navy-900 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none transition-colors dark:border-slate-600 dark:bg-slate-800 dark:text-white"
              type="text"
              value={prefix}
              onChange={(event) => setPrefix(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="bulk-team-start" className="block text-sm font-medium text-navy-700 dark:text-slate-300">{t('bulkTools.start', {})}</label>
            <input
              id="bulk-team-start"
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2.5 text-sm text-navy-900 focus:border-brand-400 focus:ring-2 focus:ring-brand-100 outline-none transition-colors dark:border-slate-600 dark:bg-slate-800 dark:text-white"
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
              {saving ? t('button.state.creating', {}) : t('bulkTools.submit', {})}
            </button>
          </div>
        </form>
      </section>
    </main>
  )
}
