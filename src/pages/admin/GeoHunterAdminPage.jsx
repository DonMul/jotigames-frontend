import { useEffect, useState } from 'react'
import { Link, useLocation, useParams } from 'react-router-dom'

import AdminOverviewMap from '../../components/AdminOverviewMap'
import { gameApi, moduleApi } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { useI18n } from '../../lib/i18n'

export default function GeoHunterAdminPage() {
  const { gameId } = useParams()
  const location = useLocation()
  const { auth } = useAuth()
  const { t } = useI18n()

  const [game, setGame] = useState(null)
  const [pois, setPois] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  async function loadAll() {
    setLoading(true)
    setError('')
    try {
      const [gameRecord, poisPayload] = await Promise.all([
        gameApi.getGame(auth.token, gameId),
        moduleApi.getGeoHunterPois(auth.token, gameId),
      ])
      setGame(gameRecord)
      setPois(Array.isArray(poisPayload?.pois) ? poisPayload.pois : [])
    } catch (err) {
      setError(err.message || t('moduleOverview.loadFailed', {}, 'Failed to load GeoHunter POIs'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [auth.token, gameId])

  useEffect(() => {
    const flashSuccess = String(location?.state?.flashSuccess || '').trim()
    if (flashSuccess) {
      setSuccess(flashSuccess)
    }
  }, [location?.state])

  async function handleDeletePoi(poi) {
    if (!window.confirm(t('geohunter.admin.poi_delete_confirm', { title: poi?.title || '' }, 'Delete this POI?'))) {
      return
    }
    setError('')
    setSuccess('')
    try {
      await moduleApi.deleteGeoHunterPoi(auth.token, gameId, poi.id)
      await loadAll()
      setSuccess(t('moduleOverview.delete', {}, 'Deleted'))
    } catch (err) {
      setError(err.message || 'Failed to delete POI')
    }
  }

  return (
    <main className="page-shell">
      <div className="geo-header">
        <div>
          <p className="overview-kicker">{t('geohunter.admin.kicker', {}, 'GeoHunter')}</p>
          <h1>{t('geohunter.admin.poi_heading', { game: game?.name || '' }, 'POIs')}</h1>
          <p className="overview-subtitle">{t('geohunter.admin.poi_subtitle_list', {}, 'Manage points of interest')}</p>
        </div>
        <div className="overview-actions">
          <Link className="btn btn-ghost" to={'/admin/games/' + gameId}>
            {t('geohunter.admin.back', {}, 'Back')}
          </Link>
          <Link className="btn btn-primary" to={'/admin/geohunter/' + gameId + '/pois/new'}>
            {t('geohunter.admin.poi_add', {}, 'Add POI')}
          </Link>
        </div>
      </div>

      {error ? <div className="flash flash-error">{error}</div> : null}
      {success ? <div className="flash flash-success">{success}</div> : null}
      {loading ? <p>{t('gamesPage.loading', {}, 'Loading...')}</p> : null}

      <div className="geo-layout">
        <section className="overview-panel">
          <h2>{t('common.map', {}, 'Map')}</h2>
          <AdminOverviewMap
            entities={pois}
            getLabel={(poi) => poi.title || '-'}
            getRadius={(poi) => Number(poi.radius_meters || 20)}
            ariaLabel={t('geohunter.admin.map_label', {}, 'GeoHunter POIs map')}
          />
        </section>

        <section className="overview-panel">
          <h2>{t('geohunter.admin.poi_list', {}, 'POI list')}</h2>
          {pois.length === 0 ? <p className="muted">{t('geohunter.admin.poi_empty', {}, 'No POIs yet')}</p> : null}
          {pois.length > 0 ? (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('geohunter.admin.poi_table_title', {}, 'Title')}</th>
                  <th>{t('geohunter.admin.poi_table_type', {}, 'Type')}</th>
                  <th>{t('geohunter.admin.poi_table_radius', {}, 'Radius')}</th>
                  <th className="text-right">{t('geohunter.admin.poi_table_actions', {}, 'Actions')}</th>
                </tr>
              </thead>
              <tbody>
                {pois.map((poi) => (
                  <tr key={poi.id}>
                    <td>{poi.title}</td>
                    <td>{t(poi.type_label_key || '', {}, poi.type)}</td>
                    <td>{poi.radius_meters} m</td>
                    <td className="text-right table-actions-inline">
                      <Link className="btn btn-edit btn-small" to={'/admin/geohunter/' + gameId + '/pois/' + poi.id + '/edit'}>
                        {t('button.edit', {}, 'Edit')}
                      </Link>
                      <button className="btn btn-remove btn-small" type="button" onClick={() => handleDeletePoi(poi)}>
                        {t('button.delete', {}, 'Delete')}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : null}
        </section>
      </div>
    </main>
  )
}
