import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

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
      })
    } catch (err) {
      setError(err.message || 'Failed to load Blind Hike config')
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
    }

    if (payload.target_lat !== null && !Number.isFinite(payload.target_lat)) {
      setError('Target latitude is invalid')
      return
    }

    if (payload.target_lon !== null && !Number.isFinite(payload.target_lon)) {
      setError('Target longitude is invalid')
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
      })
      setSuccess(t('button.save', {}, 'Saved'))
    } catch (err) {
      setError(err.message || 'Failed to save Blind Hike config')
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
            {t('games.overview.back', {}, 'Back')}
          </Link>
        </div>
      </section>

      {error ? <div className="flash flash-error">{error}</div> : null}
      {success ? <div className="flash flash-success">{success}</div> : null}
      {loading ? <p>{t('gamesPage.loading', {}, 'Loading…')}</p> : null}

      <section className="geo-panel">
        <form onSubmit={handleSubmit}>
          <div className="form-section">
            <h2>{t('blindhike.target_location', {}, 'Target location')}</h2>
            <div className="form-row form-row-inline">
              <div>
                <label htmlFor="target-lat">{t('blindhike.target_latitude', {}, 'Target latitude')}</label>
                <input
                  id="target-lat"
                  type="number"
                  step="0.0000001"
                  value={config.target_lat}
                  onChange={(event) => setConfig((current) => ({ ...current, target_lat: event.target.value }))}
                />
              </div>
              <div>
                <label htmlFor="target-lon">{t('blindhike.target_longitude', {}, 'Target longitude')}</label>
                <input
                  id="target-lon"
                  type="number"
                  step="0.0000001"
                  value={config.target_lon}
                  onChange={(event) => setConfig((current) => ({ ...current, target_lon: event.target.value }))}
                />
              </div>
            </div>
          </div>

          <div className="form-section">
            <h2>{t('blindhike.obstacles', {}, 'Obstacles')}</h2>
            <label>
              <input
                type="checkbox"
                checked={config.horizontal_flip}
                onChange={(event) => setConfig((current) => ({ ...current, horizontal_flip: event.target.checked }))}
              />{' '}
              {t('blindhike.horizontal_flip', {}, 'Horizontal flip')}
            </label>
            <label>
              <input
                type="checkbox"
                checked={config.vertical_flip}
                onChange={(event) => setConfig((current) => ({ ...current, vertical_flip: event.target.checked }))}
              />{' '}
              {t('blindhike.vertical_flip', {}, 'Vertical flip')}
            </label>

            <div className="form-row">
              <label htmlFor="scale-factor">{t('blindhike.scale_factor', {}, 'Scale factor')}</label>
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
            <div className="form-row">
              <label htmlFor="max-markers">{t('blindhike.max_markers', {}, 'Max markers')}</label>
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
              <input
                id="marker-cooldown"
                type="number"
                min="0"
                value={config.marker_cooldown}
                onChange={(event) => setConfig((current) => ({ ...current, marker_cooldown: event.target.value }))}
              />
            </div>
          </div>

          <div className="overview-actions" style={{ marginTop: '1rem' }}>
            <button className="btn btn-primary" type="submit">{t('button.save', {}, 'Save')}</button>
            <Link className="btn btn-ghost" to={`/admin/games/${gameId}`}>
              {t('button.cancel', {}, 'Cancel')}
            </Link>
          </div>
        </form>
      </section>
    </main>
  )
}
