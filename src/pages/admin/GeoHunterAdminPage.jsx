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
      setError(err.message || t('error.loadFailed', {}))
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
    if (!window.confirm(t('geohunter.admin.poi_delete_confirm', { title: poi?.title || '' }))) {
      return
    }
    setError('')
    setSuccess('')
    try {
      await moduleApi.deleteGeoHunterPoi(auth.token, gameId, poi.id)
      await loadAll()
      setSuccess(t('status.deleted', {}))
    } catch (err) {
      setError(err.message || 'Failed to delete POI')
    }
  }

  return (
    <main className="page-shell">
      <div className="geo-header">
        <div>
          <p className="overview-kicker">{t('gameCatalog.geohunter.name', {})} - {game?.name}</p>
          <h1>{t('geohunter.admin.poi_heading')}</h1>
        </div>
        <div className="overview-actions">
          <Link className="btn btn-ghost" to={'/admin/games/' + gameId}>
            {t('common.back', {})}
          </Link>
          <Link className="btn btn-primary" to={'/admin/geohunter/' + gameId + '/pois/new'}>
            {t('geohunter.admin.poi_add', {})}
          </Link>
        </div>
      </div>

      {error ? <div className="flash flash-error">{error}</div> : null}
      {success ? <div className="flash flash-success">{success}</div> : null}
      {loading ? <p>{t('gamesPage.loading', {})}</p> : null}

      <div className="geo-layout">
        <section className="overview-panel">
          <h2>{t('common.map', {})}</h2>
          <AdminOverviewMap
            entities={pois}
            getLabel={(poi) => poi.title || '-'}
            getRadius={(poi) => Number(poi.radius_meters || 20)}
            ariaLabel={t('geohunter.admin.map_label', {})}
          />
        </section>

        <section className="overview-panel">
          <h2>{t('geohunter.admin.poi_list', {})}</h2>
          {pois.length === 0 ? <p className="muted">{t('geohunter.admin.poi_empty', {})}</p> : null}
          {pois.length > 0 ? (
            <table className="admin-table">
              <thead>
                <tr>
                  <th>{t('object.poi.title', {})}</th>
                  <th>{t('object.poi.type', {})}</th>
                  <th>{t('object.poi.radius', {})}</th>
                  <th className="text-right">{t('table.actions', {})}</th>
                </tr>
              </thead>
              <tbody>
                {pois.map((poi) => (
                  <tr key={poi.id}>
                    <td>{poi.title}</td>
                    <td>{t(poi.type_label_key || '', {})}</td>
                    <td>{poi.radius_meters} m</td>
                    <td className="text-right table-actions-inline">
                      <Link className="btn btn-edit btn-small" to={'/admin/geohunter/' + gameId + '/pois/' + poi.id + '/edit'}>
                        {t('button.label.edit', {})}
                      </Link>
                      <button className="btn btn-remove btn-small" type="button" onClick={() => handleDeletePoi(poi)}>
                        {t('button.label.delete', {})}
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
