import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import GeoLocationPicker from '../../components/GeoLocationPicker'
import { gameApi, moduleApi } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { useI18n } from '../../lib/i18n'

const initialConfig = {
  target_lat: '',
  target_lon: '',
  horizontal_flip: false,
  vertical_flip: false,
  scale_factor: '1.0',
  rotation: '0',
  max_markers: '',
  marker_cooldown: '0',
  finish_radius_meters: '25',
}

export default function BlindHikeConfigurePage() {
  const { gameId } = useParams()
  const { auth } = useAuth()
  const { t } = useI18n()

  const [game, setGame] = useState(null)
  const [config, setConfig] = useState(initialConfig)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  function handleMapPick(nextLat, nextLon) {
    setConfig((current) => ({
      ...current,
      target_lat: nextLat,
      target_lon: nextLon,
    }))
  }

  async function loadAll() {
    setLoading(true)
    setError('')
    try {
      const [gameRecord, configPayload] = await Promise.all([
        gameApi.getGame(auth.token, gameId),
        moduleApi.getBlindHikeConfig(auth.token, gameId),
      ])

      const data = configPayload?.config || {}
      setGame(gameRecord)
      setConfig({
        target_lat: data.target_lat === null || data.target_lat === undefined ? '' : String(data.target_lat),
        target_lon: data.target_lon === null || data.target_lon === undefined ? '' : String(data.target_lon),
        horizontal_flip: Boolean(data.horizontal_flip),
        vertical_flip: Boolean(data.vertical_flip),
        scale_factor: String(data.scale_factor ?? '1.0'),
        rotation: String(Number(data.rotation || 0)),
        max_markers: data.max_markers === null || data.max_markers === undefined ? '' : String(data.max_markers),
        marker_cooldown: String(Number(data.marker_cooldown || 0)),
        finish_radius_meters: String(Number(data.finish_radius_meters || 25)),
      })
    } catch (err) {
      setError(err.message || t('blindhike.load_failed', {}, 'Failed to load Blind Hike config'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [auth.token, gameId])

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSuccess('')

    const payload = {
      target_lat: config.target_lat === '' ? null : Number(config.target_lat),
      target_lon: config.target_lon === '' ? null : Number(config.target_lon),
      horizontal_flip: Boolean(config.horizontal_flip),
      vertical_flip: Boolean(config.vertical_flip),
      scale_factor: Number(config.scale_factor || 1),
      rotation: Number(config.rotation || 0),
      max_markers: config.max_markers === '' ? null : Number(config.max_markers),
      marker_cooldown: Number(config.marker_cooldown || 0),
      finish_radius_meters: Number(config.finish_radius_meters || 25),
    }

    if (payload.target_lat !== null && !Number.isFinite(payload.target_lat)) {
      setError(t('blindhike.target_lat_invalid', {}, 'Target latitude is invalid'))
      return
    }

    if (payload.target_lon !== null && !Number.isFinite(payload.target_lon)) {
      setError(t('blindhike.target_lon_invalid', {}, 'Target longitude is invalid'))
      return
    }

    if (!Number.isFinite(payload.finish_radius_meters) || payload.finish_radius_meters < 1) {
      setError(t('blindhike.finish_radius_invalid', {}, 'Finish radius must be at least 1 meter'))
      return
    }

    try {
      const next = await moduleApi.updateBlindHikeConfig(auth.token, gameId, payload)
      const data = next?.config || {}
      setConfig({
        target_lat: data.target_lat === null || data.target_lat === undefined ? '' : String(data.target_lat),
        target_lon: data.target_lon === null || data.target_lon === undefined ? '' : String(data.target_lon),
        horizontal_flip: Boolean(data.horizontal_flip),
        vertical_flip: Boolean(data.vertical_flip),
        scale_factor: String(data.scale_factor ?? '1.0'),
        rotation: String(Number(data.rotation || 0)),
        max_markers: data.max_markers === null || data.max_markers === undefined ? '' : String(data.max_markers),
        marker_cooldown: String(Number(data.marker_cooldown || 0)),
        finish_radius_meters: String(Number(data.finish_radius_meters || 25)),
      })
      setSuccess(t('blindhike.saved', {}, 'Saved'))
    } catch (err) {
      setError(err.message || t('blindhike.save_failed', {}, 'Failed to save Blind Hike config'))
    }
  }

  return (
    <main className="page-shell">
      <section className="overview-header">
        <div>
          <p className="overview-kicker">{t('blindhike.configure', {}, 'Configure Blind Hike')}</p>
          <h1>{game?.name || '-'}</h1>
        </div>
        <div className="overview-actions">
          <Link className="btn btn-ghost" to={`/admin/games/${gameId}`}>
            {t('blindhike.back', {}, 'Back')}
          </Link>
        </div>
      </section>

      {error ? <div className="flash flash-error">{error}</div> : null}
      {success ? <div className="flash flash-success">{success}</div> : null}
      {loading ? <p>{t('gamesPage.loading', {}, 'Loading…')}</p> : null}

      <section className="overview-panel">
        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <h2>{t('blindhike.target_location', {}, 'Target location')}</h2>
            <p className="muted">{t('blindhike.target_location_help', {}, 'Set the finish target teams must estimate and reach.')}</p>
            <p className="muted">{t('blindhike.map_pick_hint', {}, 'Click on the map to set the target marker.')}</p>
            <GeoLocationPicker
              latitude={config.target_lat}
              longitude={config.target_lon}
              onChange={handleMapPick}
              ariaLabel={t('blindhike.target_location', {}, 'Target location')}
            />
          </div>

          <div className="form-section">
            <h2>{t('blindhike.obstacles', {}, 'Obstacles')}</h2>
            <p className="muted">{t('blindhike.obstacles_help', {}, 'Apply map distortions that make orientation harder for teams.')}</p>
            <label className="blindhike-toggle-row" htmlFor="horizontal-flip-toggle">
              <span className="blindhike-toggle-label">
                {t('blindhike.horizontal_flip', {}, 'Horizontal flip')}
              </span>
              <span className="game-type-switch">
                <input
                  id="horizontal-flip-toggle"
                  type="checkbox"
                  checked={config.horizontal_flip}
                  onChange={(event) => setConfig((current) => ({ ...current, horizontal_flip: event.target.checked }))}
                />
                <span className="game-type-switch-track" aria-hidden="true" />
              </span>
            </label>
            <p className="muted">{t('blindhike.horizontal_flip_help', {}, 'Mirror the map left-to-right for all teams.')}</p>
            <label className="blindhike-toggle-row" htmlFor="vertical-flip-toggle">
              <span className="blindhike-toggle-label">
                {t('blindhike.vertical_flip', {}, 'Vertical flip')}
              </span>
              <span className="game-type-switch">
                <input
                  id="vertical-flip-toggle"
                  type="checkbox"
                  checked={config.vertical_flip}
                  onChange={(event) => setConfig((current) => ({ ...current, vertical_flip: event.target.checked }))}
                />
                <span className="game-type-switch-track" aria-hidden="true" />
              </span>
            </label>
            <p className="muted">{t('blindhike.vertical_flip_help', {}, 'Mirror the map top-to-bottom for all teams.')}</p>

            <div className="form-row">
              <label htmlFor="scale-factor">{t('blindhike.scale_factor', {}, 'Scale factor')}</label>
              <p className="muted">{t('blindhike.scale_factor_help', {}, 'Scales perceived distance: 1.0 = normal, higher = farther, lower = closer.')}</p>
              <input
                id="scale-factor"
                type="number"
                step="0.1"
                min="0.1"
                max="10"
                value={config.scale_factor}
                onChange={(event) => setConfig((current) => ({ ...current, scale_factor: event.target.value }))}
              />
            </div>

            <div className="form-row">
              <label htmlFor="rotation">{t('blindhike.rotation', {}, 'Rotation')}</label>
              <p className="muted">{t('blindhike.rotation_help', {}, 'Rotate the map view by degrees (0-360) for all teams.')}</p>
              <input
                id="rotation"
                type="number"
                min="0"
                max="360"
                value={config.rotation}
                onChange={(event) => setConfig((current) => ({ ...current, rotation: event.target.value }))}
              />
            </div>
          </div>

          <div className="form-section">
            <h2>{t('blindhike.constraints', {}, 'Constraints')}</h2>
            <p className="muted">{t('blindhike.constraints_help', {}, 'Limit marker usage so teams must place guesses strategically.')}</p>
            <div className="form-row">
              <label htmlFor="max-markers">{t('blindhike.max_markers', {}, 'Max markers')}</label>
              <p className="muted">{t('blindhike.max_markers_help', {}, 'Maximum number of markers each team can place (empty = no limit).')}</p>
              <input
                id="max-markers"
                type="number"
                min="1"
                value={config.max_markers}
                onChange={(event) => setConfig((current) => ({ ...current, max_markers: event.target.value }))}
              />
            </div>

            <div className="form-row">
              <label htmlFor="marker-cooldown">{t('blindhike.marker_cooldown', {}, 'Marker cooldown')}</label>
              <p className="muted">{t('blindhike.marker_cooldown_help', {}, 'Seconds a team must wait between marker placements.')}</p>
              <input
                id="marker-cooldown"
                type="number"
                min="0"
                value={config.marker_cooldown}
                onChange={(event) => setConfig((current) => ({ ...current, marker_cooldown: event.target.value }))}
              />
            </div>

            <div className="form-row">
              <label htmlFor="finish-radius-meters">{t('blindhike.finish_radius_meters', {}, 'Finish radius (meters)')}</label>
              <p className="muted">{t('blindhike.finish_radius_meters_help', {}, 'A team finishes when a marker is placed within this radius of the target.')}</p>
              <input
                id="finish-radius-meters"
                type="number"
                min="1"
                value={config.finish_radius_meters}
                onChange={(event) => setConfig((current) => ({ ...current, finish_radius_meters: event.target.value }))}
              />
            </div>
          </div>

          <div className="overview-actions" style={{ marginTop: '1rem' }}>
            <button className="btn btn-primary" type="submit">{t('blindhike.save', {}, 'Save')}</button>
            <Link className="btn btn-ghost" to={`/admin/games/${gameId}`}>
              {t('blindhike.cancel', {}, 'Cancel')}
            </Link>
          </div>
        </form>
      </section>
    </main>
  )
}
