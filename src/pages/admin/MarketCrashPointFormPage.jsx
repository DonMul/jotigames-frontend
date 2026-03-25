import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import GeoLocationPicker from '../../components/GeoLocationPicker'
import { gameApi, moduleApi } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { useI18n } from '../../lib/i18n'

function defaultPointForm() {
  return {
    id: '',
    title: '',
    latitude: '',
    longitude: '',
    radius_meters: '25',
    marker_color: '#2563eb',
    resource_settings: {},
  }
}

export default function MarketCrashPointFormPage() {
  const { gameId, pointId } = useParams()
  const navigate = useNavigate()
  const { auth } = useAuth()
  const { t } = useI18n()

  const [game, setGame] = useState(null)
  const [resources, setResources] = useState([])
  const [pointForm, setPointForm] = useState(defaultPointForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const isEditingPoint = Boolean(pointId)

  function resetPointForm(resourceList = resources) {
    const resourceSettings = {}
    for (const resource of resourceList) {
      resourceSettings[String(resource.id)] = {
        enabled: false,
        buy_price: String(Number(resource.default_price || 25)),
        sell_price: String(Number(resource.default_price || 25)),
        tick_seconds: '5',
        fluctuation_percent: '10',
      }
    }

    setPointForm({
      ...defaultPointForm(),
      resource_settings: resourceSettings,
    })
  }

  function buildPointFormFromPoint(point, resourceList = resources) {
    const resourceSettings = {}
    const settingByResourceId = {}
    for (const setting of Array.isArray(point?.resource_settings) ? point.resource_settings : []) {
      settingByResourceId[String(setting.resource_id)] = setting
    }

    for (const resource of resourceList) {
      const resourceId = String(resource.id)
      const setting = settingByResourceId[resourceId]
      resourceSettings[resourceId] = {
        enabled: Boolean(setting),
        buy_price: String(Number(setting?.buy_price || resource.default_price || 25)),
        sell_price: String(Number(setting?.sell_price || resource.default_price || 25)),
        tick_seconds: String(Number(setting?.tick_seconds || 5)),
        fluctuation_percent: String(Number(setting?.fluctuation_percent || 10)),
      }
    }

    setPointForm({
      id: String(point?.id || ''),
      title: String(point?.title || ''),
      latitude: point?.latitude === null || point?.latitude === undefined ? '51.05' : String(point.latitude),
      longitude: point?.longitude === null || point?.longitude === undefined ? '3.72' : String(point.longitude),
      radius_meters: String(Number(point?.radius_meters || 25)),
      marker_color: String(point?.marker_color || '#2563eb'),
      resource_settings: resourceSettings,
    })
  }

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

        const nextResources = Array.isArray(adminData?.resources) ? adminData.resources : []
        const nextPoints = Array.isArray(adminData?.points) ? adminData.points : []

        setGame(gameRecord)
        setResources(nextResources)

        if (isEditingPoint) {
          const point = nextPoints.find((row) => String(row?.id || '') === String(pointId || ''))
          if (!point) {
            throw new Error(t('market_crash.admin.point_not_found', {}, 'Point not found'))
          }
          buildPointFormFromPoint(point, nextResources)
        } else {
          resetPointForm(nextResources)
        }
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
  }, [auth.token, gameId, isEditingPoint, pointId, t])

  async function submitPoint(event) {
    event.preventDefault()
    setError('')

    const payload = {
      title: pointForm.title.trim(),
      latitude: Number(pointForm.latitude),
      longitude: Number(pointForm.longitude),
      radius_meters: Number(pointForm.radius_meters || 25),
      marker_color: String(pointForm.marker_color || '#2563eb').trim().toLowerCase(),
      resources: Object.entries(pointForm.resource_settings)
        .filter(([, setting]) => Boolean(setting?.enabled))
        .map(([resourceId, setting]) => ({
          resource_id: resourceId,
          buy_price: Number(setting.buy_price || 1),
          sell_price: Number(setting.sell_price || 1),
          tick_seconds: Number(setting.tick_seconds || 1),
          fluctuation_percent: Number(setting.fluctuation_percent || 10),
        })),
    }

    if (!Number.isFinite(payload.latitude) || !Number.isFinite(payload.longitude)) {
      setError(t('market_crash.admin.latitude_longitude_required', {}, 'Latitude and longitude are required'))
      return
    }
    if (!payload.resources.length) {
      setError(t('market_crash.admin.point_resource_required', {}, 'Enable at least one resource for this point'))
      return
    }

    setSaving(true)
    try {
      if (isEditingPoint) {
        await moduleApi.updateMarketCrashPoint(auth.token, gameId, pointId, payload)
      } else {
        await moduleApi.createMarketCrashPoint(auth.token, gameId, payload)
      }

      navigate(`/admin/market-crash/${gameId}/points`, {
        replace: true,
        state: {
          flashSuccess: t('market_crash.admin.point_saved', {}, 'Point saved'),
        },
      })
    } catch (err) {
      setError(err.message || t('market_crash.admin.point_save_failed', {}, 'Failed to save point'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="page-shell">
      <div className="geo-header">
        <div>
          <p className="overview-kicker">{t('market_crash.admin.kicker', {}, 'Market Crash')}</p>
          <h1>{isEditingPoint ? t('market_crash.admin.point_edit_heading', {}, 'Edit point') : t('market_crash.admin.point_new_heading', {}, 'New point')}</h1>
          <p className="overview-subtitle">{game?.name || '-'}</p>
        </div>
        <div className="overview-actions">
          <Link className="btn btn-ghost" to={`/admin/market-crash/${gameId}/points`}>
            {t('market_crash.admin.back', {}, 'Back')}
          </Link>
        </div>
      </div>

      {error ? <div className="flash flash-error">{error}</div> : null}
      {loading ? <p>{t('gamesPage.loading', {}, 'Loading…')}</p> : null}

      {!loading ? (
        <section className="admin-block">
          <form onSubmit={submitPoint} className="market-crash-point-form">
            <section className="market-crash-form-section">
              <h3>{t('market_crash.admin.form_title', {}, 'Title')}</h3>
              <input
                value={pointForm.title}
                onChange={(event) => setPointForm((current) => ({ ...current, title: event.target.value }))}
                required
              />
            </section>

            <section className="market-crash-form-section">
              <h3>{t('market_crash.admin.form_resource_settings', {}, 'Resource settings')}</h3>
              <p className="muted">{t('market_crash.admin.form_resource_settings_help', {}, 'Enable resources and configure buy/sell/fluctuation')}</p>
              <div className="market-crash-resource-list">
                {resources.map((resource) => {
                  const key = String(resource.id)
                  const setting = pointForm.resource_settings[key] || {
                    enabled: false,
                    buy_price: String(Number(resource.default_price || 25)),
                    sell_price: String(Number(resource.default_price || 25)),
                    tick_seconds: '5',
                    fluctuation_percent: '10',
                  }

                  return (
                    <article className="market-crash-resource-row" key={resource.id}>
                      <label className="market-crash-resource-toggle">
                        <input
                          type="checkbox"
                          checked={Boolean(setting.enabled)}
                          onChange={(event) =>
                            setPointForm((current) => ({
                              ...current,
                              resource_settings: {
                                ...current.resource_settings,
                                [key]: {
                                  ...setting,
                                  enabled: event.target.checked,
                                },
                              },
                            }))
                          }
                        />
                        <span>{resource.name}</span>
                        <span className="market-crash-default-price">{t('market_crash.admin.resource_table_default_price', {}, 'Default')}: {resource.default_price}</span>
                      </label>

                      <div className="market-crash-resource-fields">
                        <div className="market-crash-resource-pair">
                          <label>
                            <span>{t('market_crash.admin.form_buy_resources', {}, 'Buy')}</span>
                            <input
                              type="number"
                              min="1"
                              value={setting.buy_price}
                              onChange={(event) =>
                                setPointForm((current) => ({
                                  ...current,
                                  resource_settings: {
                                    ...current.resource_settings,
                                    [key]: {
                                      ...setting,
                                      buy_price: event.target.value,
                                    },
                                  },
                                }))
                              }
                            />
                          </label>
                          <label>
                            <span>{t('market_crash.admin.form_sell_resources', {}, 'Sell')}</span>
                            <input
                              type="number"
                              min="1"
                              value={setting.sell_price}
                              onChange={(event) =>
                                setPointForm((current) => ({
                                  ...current,
                                  resource_settings: {
                                    ...current.resource_settings,
                                    [key]: {
                                      ...setting,
                                      sell_price: event.target.value,
                                    },
                                  },
                                }))
                              }
                            />
                          </label>
                        </div>
                        <div className="market-crash-resource-pair">
                          <label>
                            <span>{t('market_crash.admin.form_tick_seconds', {}, 'Tick seconds')}</span>
                            <input
                              type="number"
                              min="1"
                              value={setting.tick_seconds}
                              onChange={(event) =>
                                setPointForm((current) => ({
                                  ...current,
                                  resource_settings: {
                                    ...current.resource_settings,
                                    [key]: {
                                      ...setting,
                                      tick_seconds: event.target.value,
                                    },
                                  },
                                }))
                              }
                            />
                          </label>
                          <label>
                            <span>{t('market_crash.admin.form_fluctuation_percent', {}, 'Fluctuation %')}</span>
                            <input
                              type="number"
                              min="0.1"
                              max="100"
                              step="0.1"
                              value={setting.fluctuation_percent}
                              onChange={(event) =>
                                setPointForm((current) => ({
                                  ...current,
                                  resource_settings: {
                                    ...current.resource_settings,
                                    [key]: {
                                      ...setting,
                                      fluctuation_percent: event.target.value,
                                    },
                                  },
                                }))
                              }
                            />
                          </label>
                        </div>
                      </div>
                    </article>
                  )
                })}
              </div>
            </section>

            <section className="market-crash-form-section">
              <h3>{t('market_crash.admin.form_map', {}, 'Map')}</h3>
              <GeoLocationPicker
                latitude={pointForm.latitude}
                longitude={pointForm.longitude}
                onChange={(nextLat, nextLon) => setPointForm((current) => ({ ...current, latitude: nextLat, longitude: nextLon }))}
                ariaLabel={t('market_crash.admin.form_map', {}, 'Point location map')}
              />
              <div className="market-crash-inline-grid">
                <label>
                  <span>{t('market_crash.admin.form_radius', {}, 'Radius')}</span>
                  <input
                    type="number"
                    min="5"
                    value={pointForm.radius_meters}
                    onChange={(event) => setPointForm((current) => ({ ...current, radius_meters: event.target.value }))}
                  />
                </label>

                <label>
                  <span>{t('common.color', {}, 'Color')}</span>
                  <input
                    type="color"
                    value={pointForm.marker_color}
                    onChange={(event) => setPointForm((current) => ({ ...current, marker_color: event.target.value }))}
                  />
                </label>
              </div>

              <div className="market-crash-inline-grid">
                <label>
                  <span>{t('market_crash.admin.form_latitude', {}, 'Latitude')}</span>
                  <input
                    type="number"
                    step="0.0000001"
                    value={pointForm.latitude}
                    onChange={(event) => setPointForm((current) => ({ ...current, latitude: event.target.value }))}
                    required
                  />
                </label>
                <label>
                  <span>{t('market_crash.admin.form_longitude', {}, 'Longitude')}</span>
                  <input
                    type="number"
                    step="0.0000001"
                    value={pointForm.longitude}
                    onChange={(event) => setPointForm((current) => ({ ...current, longitude: event.target.value }))}
                    required
                  />
                </label>
              </div>
            </section>

            <div className="overview-actions" style={{ marginTop: '1rem' }}>
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? t('button.saving', {}, 'Saving…') : t('button.save', {}, 'Save')}
              </button>
              <Link className="btn btn-ghost" to={`/admin/market-crash/${gameId}/points`}>
                {t('button.cancel', {}, 'Cancel')}
              </Link>
            </div>
          </form>
        </section>
      ) : null}
    </main>
  )
}
