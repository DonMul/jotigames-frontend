import { useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'

import GeoLocationPicker from '../../components/GeoLocationPicker'
import { gameApi, moduleApi } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { useI18n } from '../../lib/i18n'

function defaultForm() {
  return {
    id: '',
    title: '',
    latitude: '',
    longitude: '',
    radius_meters: '25',
    points: '5',
    marker_color: '#dc2626',
    is_active: true,
  }
}

export default function CheckpointHeistAdminPage() {
  const { gameId } = useParams()
  const { auth } = useAuth()
  const { t } = useI18n()

  const [game, setGame] = useState(null)
  const [checkpoints, setCheckpoints] = useState([])
  const [form, setForm] = useState(defaultForm)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const isEdit = Boolean(form.id)

  async function loadAll() {
    setLoading(true)
    setError('')
    try {
      const [gameRecord, checkpointsPayload] = await Promise.all([
        gameApi.getGame(auth.token, gameId),
        moduleApi.getCheckpointHeistCheckpoints(auth.token, gameId),
      ])
      setGame(gameRecord)
      setCheckpoints(Array.isArray(checkpointsPayload?.checkpoints) ? checkpointsPayload.checkpoints : [])
    } catch (err) {
      setError(err.message || 'Failed to load checkpoints')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadAll()
  }, [auth.token, gameId])

  function resetForm() {
    setForm(defaultForm())
  }

  function fillForm(checkpoint) {
    setForm({
      id: String(checkpoint?.id || ''),
      title: String(checkpoint?.title || ''),
      latitude: checkpoint?.latitude === null || checkpoint?.latitude === undefined ? '' : String(checkpoint.latitude),
      longitude: checkpoint?.longitude === null || checkpoint?.longitude === undefined ? '' : String(checkpoint.longitude),
      radius_meters: String(Number(checkpoint?.radius_meters || 25)),
      points: String(Number(checkpoint?.points || 5)),
      marker_color: String(checkpoint?.marker_color || '#dc2626'),
      is_active: Boolean(checkpoint?.is_active),
    })
  }

  async function handleDeleteCheckpoint(checkpoint) {
    if (!window.confirm(t('checkpoint_heist.admin.delete_confirm', {}, 'Delete checkpoint?'))) {
      return
    }

    setError('')
    setSuccess('')
    try {
      await moduleApi.deleteCheckpointHeistCheckpoint(auth.token, gameId, checkpoint.id)
      await loadAll()
      if (String(form.id) === String(checkpoint.id)) {
        resetForm()
      }
      setSuccess(t('moduleOverview.delete', {}, 'Deleted'))
    } catch (err) {
      setError(err.message || 'Failed to delete checkpoint')
    }
  }

  async function handleSubmitCheckpoint(event) {
    event.preventDefault()
    setError('')
    setSuccess('')

    const payload = {
      title: form.title.trim(),
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      radius_meters: Number(form.radius_meters || 25),
      points: Number(form.points || 5),
      marker_color: String(form.marker_color || '#dc2626').trim().toLowerCase(),
      is_active: Boolean(form.is_active),
    }

    if (!Number.isFinite(payload.latitude) || !Number.isFinite(payload.longitude)) {
      setError('Latitude and longitude are required')
      return
    }

    try {
      if (isEdit) {
        await moduleApi.updateCheckpointHeistCheckpoint(auth.token, gameId, form.id, payload)
      } else {
        await moduleApi.createCheckpointHeistCheckpoint(auth.token, gameId, payload)
      }
      await loadAll()
      resetForm()
      setSuccess(t('button.save', {}, 'Saved'))
    } catch (err) {
      setError(err.message || 'Failed to save checkpoint')
    }
  }

  async function handleMoveCheckpoint(index, direction) {
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= checkpoints.length) {
      return
    }

    const ordered = [...checkpoints]
    const [item] = ordered.splice(index, 1)
    ordered.splice(targetIndex, 0, item)

    try {
      const response = await moduleApi.reorderCheckpointHeistCheckpoints(
        auth.token,
        gameId,
        ordered.map((entry) => entry.id),
      )
      setCheckpoints(Array.isArray(response?.checkpoints) ? response.checkpoints : ordered)
    } catch (err) {
      setError(err.message || 'Failed to reorder checkpoints')
    }
  }

  return (
    <main className="page-shell">
      <section className="overview-header">
        <div>
          <p className="overview-kicker">{t('checkpoint_heist.admin.kicker', {}, 'Checkpoint Heist')}</p>
          <h1>{game?.name || '-'}</h1>
          <p className="overview-subtitle">{t('checkpoint_heist.admin.checkpoints_subtitle', {}, 'Manage checkpoints')}</p>
        </div>
        <div className="overview-actions">
          <Link className="btn btn-ghost" to={`/admin/games/${gameId}`}>
            {t('checkpoint_heist.admin.back', {}, 'Back')}
          </Link>
          <button className="btn btn-primary" type="button" onClick={resetForm}>
            {t('checkpoint_heist.admin.create_checkpoint', {}, 'Create checkpoint')}
          </button>
        </div>
      </section>

      {error ? <div className="flash flash-error">{error}</div> : null}
      {success ? <div className="flash flash-success">{success}</div> : null}
      {loading ? <p>{t('gamesPage.loading', {}, 'Loading…')}</p> : null}

      <div className="geo-layout">
        <section className="overview-panel">
          <h2>{t('checkpoint_heist.admin.checkpoints_list', {}, 'Checkpoints')}</h2>
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('checkpoint_heist.admin.table_sequence', {}, 'Order')}</th>
                <th>{t('checkpoint_heist.admin.table_title', {}, 'Title')}</th>
                <th>{t('common.lat', {}, 'Lat')}</th>
                <th>{t('common.lon', {}, 'Lon')}</th>
                <th>{t('checkpoint_heist.admin.table_radius', {}, 'Radius')}</th>
                <th>{t('checkpoint_heist.admin.table_points', {}, 'Points')}</th>
                <th>{t('checkpoint_heist.admin.table_actions', {}, 'Actions')}</th>
              </tr>
            </thead>
            <tbody>
              {checkpoints.map((checkpoint, index) => (
                <tr key={checkpoint.id}>
                  <td>{checkpoint.order_index}</td>
                  <td>{checkpoint.title}</td>
                  <td>{checkpoint.latitude}</td>
                  <td>{checkpoint.longitude}</td>
                  <td>{checkpoint.radius_meters}</td>
                  <td>{checkpoint.points}</td>
                  <td className="table-actions-inline">
                    <button className="btn btn-ghost btn-small" type="button" onClick={() => handleMoveCheckpoint(index, 'up')} disabled={index === 0}>↑</button>
                    <button className="btn btn-ghost btn-small" type="button" onClick={() => handleMoveCheckpoint(index, 'down')} disabled={index === checkpoints.length - 1}>↓</button>
                    <button className="btn btn-edit btn-small" type="button" onClick={() => fillForm(checkpoint)}>
                      {t('button.edit', {}, 'Edit')}
                    </button>
                    <button className="btn btn-remove btn-small" type="button" onClick={() => handleDeleteCheckpoint(checkpoint)}>
                      {t('button.delete', {}, 'Delete')}
                    </button>
                  </td>
                </tr>
              ))}
              {checkpoints.length === 0 ? (
                <tr>
                  <td colSpan={7} className="muted">{t('checkpoint_heist.admin.empty_checkpoints', {}, 'No checkpoints yet')}</td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </section>

        <section className="overview-panel">
          <h2>{isEdit ? t('button.edit', {}, 'Edit') : t('checkpoint_heist.admin.create_checkpoint', {}, 'Create checkpoint')}</h2>
          <form onSubmit={handleSubmitCheckpoint}>
            <div className="form-row">
              <label htmlFor="checkpoint-title">{t('checkpoint_heist.admin.table_title', {}, 'Title')}</label>
              <input
                id="checkpoint-title"
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                required
              />
            </div>
            <div className="form-row">
              <label htmlFor="checkpoint-points">{t('checkpoint_heist.admin.table_points', {}, 'Points')}</label>
              <input
                id="checkpoint-points"
                type="number"
                min="1"
                value={form.points}
                onChange={(event) => setForm((current) => ({ ...current, points: event.target.value }))}
                required
              />
            </div>
            <div className="form-row form-row-inline">
              <GeoLocationPicker
                latitude={form.latitude}
                longitude={form.longitude}
                onChange={(nextLat, nextLon) => setForm((current) => ({ ...current, latitude: nextLat, longitude: nextLon }))}
                ariaLabel={t('checkpoint_heist.admin.table_title', {}, 'Checkpoint location')}
              />
              <div>
                <label htmlFor="checkpoint-lat">{t('checkpoint_heist.admin.latitude', {}, 'Latitude')}</label>
                <input
                  id="checkpoint-lat"
                  type="number"
                  step="0.000001"
                  value={form.latitude}
                  onChange={(event) => setForm((current) => ({ ...current, latitude: event.target.value }))}
                  required
                />
              </div>
              <div>
                <label htmlFor="checkpoint-lon">{t('checkpoint_heist.admin.longitude', {}, 'Longitude')}</label>
                <input
                  id="checkpoint-lon"
                  type="number"
                  step="0.000001"
                  value={form.longitude}
                  onChange={(event) => setForm((current) => ({ ...current, longitude: event.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="form-row form-row-inline">
              <div>
                <label htmlFor="checkpoint-radius">{t('checkpoint_heist.admin.table_radius', {}, 'Radius')}</label>
                <input
                  id="checkpoint-radius"
                  type="number"
                  min="5"
                  value={form.radius_meters}
                  onChange={(event) => setForm((current) => ({ ...current, radius_meters: event.target.value }))}
                  required
                />
              </div>
              <div>
                <label htmlFor="checkpoint-color">{t('common.color', {}, 'Color')}</label>
                <input
                  id="checkpoint-color"
                  type="color"
                  value={form.marker_color}
                  onChange={(event) => setForm((current) => ({ ...current, marker_color: event.target.value }))}
                  required
                />
              </div>
            </div>
            <div className="form-row">
              <label>
                <input
                  type="checkbox"
                  checked={form.is_active}
                  onChange={(event) => setForm((current) => ({ ...current, is_active: event.target.checked }))}
                />{' '}
                {t('checkpoint_heist.admin.active', {}, 'Active')}
              </label>
            </div>
            <div className="overview-actions" style={{ marginTop: '1rem' }}>
              <button className="btn btn-primary" type="submit">{t('button.save', {}, 'Save')}</button>
              {isEdit ? (
                <button className="btn btn-ghost" type="button" onClick={resetForm}>
                  {t('button.cancel', {}, 'Cancel')}
                </button>
              ) : null}
            </div>
          </form>
        </section>
      </div>
    </main>
  )
}
