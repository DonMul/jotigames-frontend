import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import { gameApi, moduleApi } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { useI18n } from '../../lib/i18n'

function defaultForm() {
  return {
    name: '',
    default_price: '25',
  }
}

export default function MarketCrashResourceFormPage() {
  const { gameId, resourceId } = useParams()
  const navigate = useNavigate()
  const { auth } = useAuth()
  const { t } = useI18n()

  const [game, setGame] = useState(null)
  const [form, setForm] = useState(defaultForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const isEdit = Boolean(resourceId)

  useEffect(() => {
    let cancelled = false

    async function loadAll() {
      setLoading(true)
      setError('')
      try {
        const [gameRecord, adminData] = await Promise.all([
          gameApi.getGame(auth.token, gameId),
          moduleApi.getMarketCrashAdminData(auth.token, gameId),
        ])
        if (cancelled) {
          return
        }

        setGame(gameRecord)

        if (!isEdit) {
          setForm(defaultForm())
          return
        }

        const resources = Array.isArray(adminData?.resources) ? adminData.resources : []
        const resource = resources.find((row) => String(row?.id || '') === String(resourceId || ''))
        if (!resource) {
          throw new Error(t('market_crash.admin.resource_not_found', {}, 'Resource not found'))
        }

        setForm({
          name: String(resource.name || ''),
          default_price: String(Number(resource.default_price || 25)),
        })
      } catch (err) {
        if (!cancelled) {
          setError(err.message || t('market_crash.admin.load_failed', {}, 'Failed to load Market Crash admin data'))
        }
      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }

    loadAll()
    return () => {
      cancelled = true
    }
  }, [auth.token, gameId, isEdit, resourceId, t])

  async function submitResource(event) {
    event.preventDefault()
    setError('')

    const payload = {
      name: form.name.trim().toLowerCase(),
      default_price: Number(form.default_price || 1),
    }

    if (!payload.name) {
      setError(t('market_crash.admin.resource_required_name', {}, 'Resource name is required'))
      return
    }

    if (!Number.isFinite(payload.default_price) || payload.default_price < 1) {
      setError(t('market_crash.admin.resource_invalid_price', {}, 'Default price must be at least 1'))
      return
    }

    setSaving(true)
    try {
      if (isEdit) {
        await moduleApi.updateMarketCrashResource(auth.token, gameId, resourceId, payload)
      } else {
        await moduleApi.createMarketCrashResource(auth.token, gameId, payload)
      }

      navigate(`/admin/market-crash/${gameId}/resources`, {
        replace: true,
        state: {
          flashSuccess: t('button.save', {}, 'Saved'),
        },
      })
    } catch (err) {
      setError(err.message || t('market_crash.admin.resource_save_failed', {}, 'Failed to save resource'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="page-shell">
      <div className="geo-header">
        <div>
          <p className="overview-kicker">{t('market_crash.admin.kicker', {}, 'Market Crash')}</p>
          <h1>{isEdit ? t('market_crash.admin.resource_edit_heading', {}, 'Edit resource') : t('market_crash.admin.resource_new_heading', {}, 'New resource')}</h1>
          <p className="overview-subtitle">{game?.name || '-'}</p>
        </div>
        <div className="overview-actions">
          <Link className="btn btn-ghost" to={`/admin/market-crash/${gameId}/resources`}>
            {t('market_crash.admin.back', {}, 'Back')}
          </Link>
        </div>
      </div>

      {error ? <div className="flash flash-error">{error}</div> : null}
      {loading ? <p>{t('gamesPage.loading', {}, 'Loading…')}</p> : null}

      {!loading ? (
        <section className="admin-block">
          <form onSubmit={submitResource} className="form-grid">
            <div className="form-row">
              <label htmlFor="market-resource-name">{t('market_crash.admin.resource_table_name', {}, 'Name')}</label>
              <input
                id="market-resource-name"
                value={form.name}
                onChange={(event) => setForm((current) => ({ ...current, name: event.target.value }))}
                required
              />
            </div>
            <div className="form-row">
              <label htmlFor="market-resource-default-price">{t('market_crash.admin.resource_table_default_price', {}, 'Default price')}</label>
              <input
                id="market-resource-default-price"
                type="number"
                min="1"
                value={form.default_price}
                onChange={(event) => setForm((current) => ({ ...current, default_price: event.target.value }))}
                required
              />
            </div>
            <div className="overview-actions" style={{ marginTop: '1rem' }}>
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? t('button.saving', {}, 'Saving…') : t('button.save', {}, 'Save')}
              </button>
              <Link className="btn btn-ghost" to={`/admin/market-crash/${gameId}/resources`}>
                {t('button.cancel', {}, 'Cancel')}
              </Link>
            </div>
          </form>
        </section>
      ) : null}
    </main>
  )
}
