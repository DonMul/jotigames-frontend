import { useEffect, useMemo, useState } from 'react'
import { Link, Navigate } from 'react-router-dom'

import { gameApi } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { useI18n } from '../../lib/i18n'
import { GAME_BY_TYPE } from '../../lib/gameCatalog'

function toLabel(gameType) {
  const meta = GAME_BY_TYPE[gameType]
  if (meta?.name) {
    return meta.name
  }
  return String(gameType || '').replaceAll('_', ' ')
}

export default function SuperAdminGameTypesPage() {
  const { auth } = useAuth()
  const { t } = useI18n()

  const [records, setRecords] = useState([])
  const [selected, setSelected] = useState({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const isSuperAdmin = Array.isArray(auth?.roles) && auth.roles.includes('ROLE_SUPER_ADMIN')

  const orderedRecords = useMemo(() => {
    const list = [...records]
    list.sort((left, right) => toLabel(left.game_type).localeCompare(toLabel(right.game_type)))
    return list
  }, [records])

  async function load() {
    setLoading(true)
    setError('')
    try {
      const availability = await gameApi.getGameTypeAvailability(auth.token)
      setRecords(availability)

      const nextSelected = {}
      availability.forEach((record) => {
        const gameType = String(record?.game_type || '')
        nextSelected[gameType] = Boolean(record?.enabled)
      })
      setSelected(nextSelected)
    } catch (err) {
      setError(err.message || 'Failed to load game type availability')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!isSuperAdmin) {
      setLoading(false)
      return
    }
    load()
  }, [auth.token, isSuperAdmin])

  if (!isSuperAdmin) {
    return <Navigate to="/admin/games" replace />
  }

  async function handleSave(event) {
    event.preventDefault()
    setSaving(true)
    setError('')
    setSuccess('')

    try {
      const enabledTypes = Object.entries(selected)
        .filter(([, enabled]) => Boolean(enabled))
        .map(([gameType]) => gameType)

      const updated = await gameApi.updateGameTypeAvailability(auth.token, enabledTypes)
      setRecords(updated)

      const nextSelected = {}
      updated.forEach((record) => {
        const gameType = String(record?.game_type || '')
        nextSelected[gameType] = Boolean(record?.enabled)
      })
      setSelected(nextSelected)
      setSuccess(t('button.save', {}, 'Saved'))
    } catch (err) {
      setError(err.message || 'Failed to save game type availability')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="page-shell">
      <section className="overview-header">
        <div>
          <h1>{t('superAdmin.gameTypesTitle', {}, 'Game types')}</h1>
          <p className="overview-subtitle">{t('superAdmin.gameTypesHelp', {}, 'Select which game types can be used when creating games')}</p>
        </div>
        <div className="overview-actions">
          <Link className="btn btn-ghost" to="/admin/games">{t('gamePage.backToGames', {}, 'Back')}</Link>
        </div>
      </section>

      {error ? <div className="flash flash-error">{error}</div> : null}
      {success ? <div className="flash flash-success">{success}</div> : null}
      {loading ? <p>{t('gamesPage.loading', {}, 'Loading…')}</p> : null}

      {!loading ? (
        <section className="admin-block">
          <form onSubmit={handleSave}>
            <div className="game-type-availability-grid">
              {orderedRecords.map((record) => {
                const gameType = String(record?.game_type || '')
                const enabled = Boolean(selected[gameType])
                const meta = GAME_BY_TYPE[gameType]

                return (
                  <label key={gameType} className="game-type-availability-card">
                    <div className="game-type-availability-main">
                      {meta?.logo ? <img className="game-type-availability-logo" src={meta.logo} alt={toLabel(gameType)} /> : null}
                      <span className="game-type-availability-name">{toLabel(gameType)}</span>
                    </div>
                    <span className="game-type-switch">
                      <input
                        type="checkbox"
                        checked={enabled}
                        onChange={(event) => {
                          const checked = event.target.checked
                          setSelected((current) => ({
                            ...current,
                            [gameType]: checked,
                          }))
                        }}
                      />
                      <span className="game-type-switch-track" aria-hidden="true"></span>
                    </span>
                  </label>
                )
              })}
            </div>

            <div className="overview-actions" style={{ marginTop: '1rem' }}>
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? t('gamesPage.loading', {}, 'Loading…') : t('button.save', {}, 'Save')}
              </button>
            </div>
          </form>
        </section>
      ) : null}
    </main>
  )
}
