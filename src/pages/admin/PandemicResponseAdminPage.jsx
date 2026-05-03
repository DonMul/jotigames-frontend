import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import { gameApi, moduleApi } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { useI18n } from '../../lib/i18n'

export default function PandemicResponseAdminPage() {
  const { gameId } = useParams()
  const { auth } = useAuth()
  const { t } = useI18n()

  const [game, setGame] = useState(null)
  const [hotspots, setHotspots] = useState([])
  const [pickups, setPickups] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadAll() {
    setLoading(true)
    setError('')
    try {
      const [gameRecord, statePayload] = await Promise.all([
        gameApi.getGame(auth.token, gameId),
        moduleApi.getPandemicResponseAdminState(auth.token, gameId),
      ])
      setGame(gameRecord)
      setHotspots(Array.isArray(statePayload?.hotspots) ? statePayload.hotspots : [])
      setPickups(Array.isArray(statePayload?.pickups) ? statePayload.pickups : [])
    } catch (err) {
      setError(err.message || t('error.loadFailed', {}))
    } finally { setLoading(false) }
  }

  useEffect(() => { loadAll() }, [auth.token, gameId])

  return (
    <main className="page-shell">
      <div className="geo-header">
        <div>
          <p className="overview-kicker">{t('pandemic_response.admin.kicker', {})}</p>
          <h1>{game?.name || '-'}</h1>
          <p className="overview-subtitle">{t('pandemic_response.admin.hotspots_subtitle', {})}</p>
        </div>
        <div className="overview-actions">
          <Link className="btn btn-ghost" to={'/admin/games/' + gameId}>{t('common.back', {})}</Link>
        </div>
      </div>

      {error ? <div className="flash flash-error">{error}</div> : null}
      {loading ? <p>{t('gamesPage.loading', {})}</p> : null}

      <div className="geo-layout">
        <section className="overview-panel">
          <h2>{t('pandemic_response.admin.current_hotspots', {})}</h2>
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('table.title', {})}</th>
                <th>{t('common.lat', {})}</th>
                <th>{t('common.lon', {})}</th>
                <th>{t('table.radius', {})}</th>
                <th>{t('table.points', {})}</th>
                <th>{t('pandemic_response.admin.table_severity', {})}</th>
              </tr>
            </thead>
            <tbody>
              {hotspots.map((hotspot) => (
                <tr key={hotspot.id}>
                  <td>{hotspot.title}</td>
                  <td>{hotspot.latitude}</td>
                  <td>{hotspot.longitude}</td>
                  <td>{hotspot.radius_meters}</td>
                  <td>{hotspot.points}</td>
                  <td>{hotspot.severity_level}</td>
                </tr>
              ))}
              {hotspots.length === 0 ? (<tr><td colSpan={6} className="muted">{t('pandemic_response.admin.empty_hotspots', {})}</td></tr>) : null}
            </tbody>
          </table>
        </section>
      </div>

      <section className="admin-block">
        <h2>{t('pandemic_response.admin.current_pickups', {})}</h2>
        <table className="admin-table">
          <thead>
            <tr>
              <th>{t('table.title', {})}</th>
              <th>{t('pandemic_response.admin.table_resource', {})}</th>
              <th>{t('common.lat', {})}</th>
              <th>{t('common.lon', {})}</th>
              <th>{t('table.radius', {})}</th>
            </tr>
          </thead>
          <tbody>
            {pickups.map((pickup) => (
              <tr key={pickup.id}>
                <td>{pickup.title}</td>
                <td>{pickup.resource_type}</td>
                <td>{pickup.latitude}</td>
                <td>{pickup.longitude}</td>
                <td>{pickup.radius_meters}</td>
              </tr>
            ))}
            {pickups.length === 0 ? (<tr><td colSpan={5} className="muted">{t('pandemic_response.admin.empty_pickups', {})}</td></tr>) : null}
          </tbody>
        </table>
      </section>
    </main>
  )
}
