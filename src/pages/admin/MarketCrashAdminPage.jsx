import { useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import GeoLocationPicker from '../../components/GeoLocationPicker'
import { gameApi, moduleApi } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { useI18n } from '../../lib/i18n'

function defaultPointForm() {
  return {
    id: '',
    title: '',
    latitude: '51.05',
    longitude: '3.72',
    radius_meters: '25',
    marker_color: '#2563eb',
    resource_settings: {},
  }
}

export default function MarketCrashAdminPage() {
  const { gameId } = useParams()
  const { auth } = useAuth()
  const { t } = useI18n()

  const [game, setGame] = useState(null)
  const [resources, setResources] = useState([])
  const [points, setPoints] = useState([])
  const [pointForm, setPointForm] = useState(defaultPointForm)
  const [newResourceName, setNewResourceName] = useState('')
  const [newResourceDefaultPrice, setNewResourceDefaultPrice] = useState('25')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const isEditingPoint = Boolean(pointForm.id)

  const resourcesById = useMemo(() => {
    const map = {}
    for (const resource of resources) {
      map[String(resource.id)] = resource
    }
    return map
  }, [resources])

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

  function applyAdminData(data, gameRecord = null) {
    const nextResources = Array.isArray(data?.resources) ? data.resources : []
    const nextPoints = Array.isArray(data?.points) ? data.points : []
    setResources(nextResources)
    setPoints(nextPoints)
    if (gameRecord) {
      setGame(gameRecord)
    }

    if (pointForm.id) {
      const currentPoint = nextPoints.find((point) => String(point.id) === String(pointForm.id))
      if (currentPoint) {
        buildPointFormFromPoint(currentPoint, nextResources)
      } else {
        resetPointForm(nextResources)
      }
    } else {
      resetPointForm(nextResources)
    }
  }

  async function loadAll() {
    setLoading(true)
    setError('')
    try {
      const [gameRecord, adminData] = await Promise.all([
        gameApi.getGame(auth.token, gameId),
        moduleApi.getMarketCrashAdminData(auth.token, gameId),
      ])
      applyAdminData(adminData, gameRecord)
    } catch (err) {
      setError(err.message || 'Failed to load Market Crash admin data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [auth.token, gameId])

  async function submitNewResource(event) {
    event.preventDefault()
    setError('')
    setSuccess('')

    const name = newResourceName.trim().toLowerCase()
    const defaultPrice = Number(newResourceDefaultPrice || 25)
    if (!name) {
      setError('Resource name is required')
      return
    }

    try {
      const adminData = await moduleApi.createMarketCrashResource(auth.token, gameId, {
        name,
        default_price: defaultPrice,
      })
      applyAdminData(adminData)
      setNewResourceName('')
      setNewResourceDefaultPrice('25')
      setSuccess(t('button.save', {}, 'Saved'))
    } catch (err) {
      setError(err.message || 'Failed to add resource')
    }
  }

  async function updateResourcePrice(resourceId, defaultPrice) {
    setError('')
    setSuccess('')
    try {
      const adminData = await moduleApi.updateMarketCrashResource(auth.token, gameId, resourceId, {
        default_price: Number(defaultPrice || 1),
      })
      applyAdminData(adminData)
      setSuccess(t('button.save', {}, 'Saved'))
    } catch (err) {
      setError(err.message || 'Failed to update resource')
    }
  }

  async function deleteResource(resource) {
    if (!window.confirm(t('market_crash.admin.resource_delete_confirm', { name: resource?.name || '' }, 'Delete resource?'))) {
      return
    }

    setError('')
    setSuccess('')
    try {
      const adminData = await moduleApi.deleteMarketCrashResource(auth.token, gameId, resource.id)
      applyAdminData(adminData)
      setSuccess(t('moduleOverview.delete', {}, 'Deleted'))
    } catch (err) {
      setError(err.message || 'Failed to delete resource')
    }
  }

  async function submitPoint(event) {
    event.preventDefault()
    setError('')
    setSuccess('')

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
      setError('Latitude and longitude are required')
      return
    }
    if (!payload.resources.length) {
      setError('Enable at least one resource for this point')
      return
    }

    try {
      const adminData = isEditingPoint
        ? await moduleApi.updateMarketCrashPoint(auth.token, gameId, pointForm.id, payload)
        : await moduleApi.createMarketCrashPoint(auth.token, gameId, payload)
      applyAdminData(adminData)
      resetPointForm(Array.isArray(adminData?.resources) ? adminData.resources : resources)
      setSuccess(t('button.save', {}, 'Saved'))
    } catch (err) {
      setError(err.message || 'Failed to save point')
    }
  }

  async function deletePoint(point) {
    if (!window.confirm(t('market_crash.admin.point_delete_confirm', { title: point?.title || '' }, 'Delete point?'))) {
      return
    }

    setError('')
    setSuccess('')
    try {
      const adminData = await moduleApi.deleteMarketCrashPoint(auth.token, gameId, point.id)
      applyAdminData(adminData)
      setSuccess(t('moduleOverview.delete', {}, 'Deleted'))
    } catch (err) {
      setError(err.message || 'Failed to delete point')
    }
  }

  return (
    <main className="page-shell">
      <div className="geo-header">
        <div>
          <p className="overview-kicker">{t('market_crash.admin.kicker', {}, 'Market Crash')}</p>
          <h1>{t('market_crash.admin.points_heading', { game: game?.name || '' }, `Market points · ${game?.name || '-'}`)}</h1>
          <p className="overview-subtitle">{t('market_crash.admin.points_subtitle', {}, 'Manage resources and trade points')}</p>
        </div>
        <div className="overview-actions">
          <Link className="btn btn-ghost" to={`/admin/games/${gameId}`}>
            {t('market_crash.admin.back', {}, 'Back')}
          </Link>
        </div>
      </div>

      {error ? <div className="flash flash-error">{error}</div> : null}
      {success ? <div className="flash flash-success">{success}</div> : null}
      {loading ? <p>{t('gamesPage.loading', {}, 'Loading…')}</p> : null}

      <div className="geo-layout">
        <section className="overview-panel">
          <h2>{t('market_crash.admin.resource_list', {}, 'Resources')}</h2>

          <form onSubmit={submitNewResource} className="admin-inline-form" style={{ marginBottom: '0.75rem' }}>
            <input
              type="text"
              value={newResourceName}
              onChange={(event) => setNewResourceName(event.target.value)}
              placeholder="wood"
              required
            />
            <input
              type="number"
              min="1"
              value={newResourceDefaultPrice}
              onChange={(event) => setNewResourceDefaultPrice(event.target.value)}
              required
            />
            <button className="btn btn-small btn-primary" type="submit">
              {t('market_crash.admin.resource_add', {}, 'Add resource')}
            </button>
          </form>

          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('market_crash.admin.resource_table_name', {}, 'Name')}</th>
                <th>{t('market_crash.admin.resource_table_default_price', {}, 'Default price')}</th>
                <th>{t('market_crash.admin.resource_table_actions', {}, 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {resources.map((resource) => (
                <tr key={resource.id}>
                  <td>{resource.name}</td>
                  <td>
                    <input
                      type="number"
                      min="1"
                      defaultValue={resource.default_price}
                      onBlur={(event) => {
                        const nextValue = Number(event.target.value || resource.default_price)
                        if (nextValue !== Number(resource.default_price)) {
                          updateResourcePrice(resource.id, nextValue)
                        }
                      }}
                    />
                  </td>
                  <td>
                    <button className="btn btn-remove btn-small" type="button" onClick={() => deleteResource(resource)}>
                      {t('button.delete', {}, 'Delete')}
                    </button>
                  </td>
                </tr>
              ))}
              {resources.length === 0 ? (
                <tr>
                  <td colSpan={3} className="muted">{t('market_crash.admin.resource_empty', {}, 'No resources yet')}</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </section>

        <section className="overview-panel">
          <h2>{t('market_crash.admin.point_list', {}, 'Points')}</h2>
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('market_crash.admin.point_table_title', {}, 'Title')}</th>
                <th>{t('market_crash.admin.point_table_resource_config', {}, 'Resource config')}</th>
                <th>{t('market_crash.admin.point_table_actions', {}, 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {points.map((point) => (
                <tr key={point.id}>
                  <td>{point.title}</td>
                  <td>
                    {Array.isArray(point.resource_settings) && point.resource_settings.length > 0
                      ? point.resource_settings.map((setting) => (
                          <span key={`${point.id}-${setting.resource_id}`} className="tag tag-cool" style={{ marginRight: '0.25rem' }}>
                            {setting.resource_name || resourcesById[setting.resource_id]?.name || setting.resource_id} · B {setting.buy_price} · S {setting.sell_price} · {setting.tick_seconds}s ±{setting.fluctuation_percent}%
                          </span>
                        ))
                      : <span className="muted">-</span>}
                  </td>
                  <td className="table-actions-inline">
                    <button className="btn btn-edit btn-small" type="button" onClick={() => buildPointFormFromPoint(point)}>
                      {t('button.edit', {}, 'Edit')}
                    </button>
                    <button className="btn btn-remove btn-small" type="button" onClick={() => deletePoint(point)}>
                      {t('button.delete', {}, 'Delete')}
                    </button>
                  </td>
                </tr>
              ))}
              {points.length === 0 ? (
                <tr>
                  <td colSpan={3} className="muted">{t('market_crash.admin.point_empty', {}, 'No points yet')}</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </section>
      </div>

      <section className="admin-block">
        <h2>{isEditingPoint ? t('market_crash.admin.point_edit_heading', {}, 'Edit point') : t('market_crash.admin.point_new_heading', {}, 'New point')}</h2>
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
                      <small className="muted">{t('market_crash.admin.resource_table_default_price', {}, 'Default')}: {resource.default_price}</small>
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
            <button className="btn btn-primary" type="submit">{t('button.save', {}, 'Save')}</button>
            {isEditingPoint ? (
              <button className="btn btn-ghost" type="button" onClick={() => resetPointForm(resources)}>
                {t('button.cancel', {}, 'Cancel')}
              </button>
            ) : null}
          </div>
        </form>
      </section>
    </main>
  )
}
