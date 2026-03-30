import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import GeoLocationPicker from '../../components/GeoLocationPicker'
import { gameApi, moduleApi } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { useI18n } from '../../lib/i18n'

function defaultTaskForm() {
  return {
    title: '',
    description: '',
    points: '1',
    latitude: '',
    longitude: '',
    radius_meters: '25',
  }
}

export default function Crazy88TaskFormPage() {
  const { gameId, taskId } = useParams()
  const navigate = useNavigate()
  const { auth } = useAuth()
  const { t } = useI18n()

  const [game, setGame] = useState(null)
  const [config, setConfig] = useState({ visibility_mode: 'all_visible' })
  const [taskForm, setTaskForm] = useState(defaultTaskForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const isEdit = Boolean(taskId)
  const isGeoLocked = config.visibility_mode === 'geo_locked'

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError('')
      try {
        const [gameRecord, configPayload, tasksPayload] = await Promise.all([
          gameApi.getGame(auth.token, gameId),
          moduleApi.getCrazy88Config(auth.token, gameId),
          moduleApi.getCrazy88Tasks(auth.token, gameId),
        ])
        if (cancelled) return
        setGame(gameRecord)
        setConfig(configPayload?.config || { visibility_mode: 'all_visible' })

        if (isEdit) {
          const tasks = Array.isArray(tasksPayload?.tasks) ? tasksPayload.tasks : []
          const task = tasks.find((t) => String(t.id) === String(taskId))
          if (!task) throw new Error(t('crazy88.admin.task_not_found', {}, 'Task not found'))
          setTaskForm({
            title: String(task.title || ''),
            description: String(task.description || ''),
            points: String(Number(task.points || 1)),
            latitude: task.latitude === null || task.latitude === undefined ? '' : String(task.latitude),
            longitude: task.longitude === null || task.longitude === undefined ? '' : String(task.longitude),
            radius_meters: String(Number(task.radius_meters || 25)),
          })
        }
      } catch (err) {
        if (!cancelled) setError(err.message || t('crazy88.admin.load_failed', {}, 'Failed to load data'))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [auth.token, gameId, taskId, isEdit])

  async function saveTask(event) {
    event.preventDefault()
    setError('')

    const payload = {
      title: taskForm.title.trim(),
      description: taskForm.description.trim() || null,
      points: Number(taskForm.points || 1),
      latitude: isGeoLocked ? (taskForm.latitude === '' ? null : Number(taskForm.latitude)) : null,
      longitude: isGeoLocked ? (taskForm.longitude === '' ? null : Number(taskForm.longitude)) : null,
      radius_meters: Number(taskForm.radius_meters || 25),
    }

    if (isGeoLocked) {
      if ((payload.latitude === null) !== (payload.longitude === null)) {
        setError(t('crazy88.admin.lat_lon_both', {}, 'Latitude and longitude must both be set for geo-locked mode'))
        return
      }
      if (payload.latitude !== null && (!Number.isFinite(payload.latitude) || !Number.isFinite(payload.longitude))) {
        setError(t('crazy88.admin.lat_lon_invalid', {}, 'Latitude/longitude must be valid numbers'))
        return
      }
    }

    setSaving(true)
    try {
      if (isEdit) {
        await moduleApi.updateCrazy88Task(auth.token, gameId, taskId, payload)
      } else {
        await moduleApi.createCrazy88Task(auth.token, gameId, payload)
      }
      navigate('/admin/crazy88/' + gameId + '/tasks', {
        state: { flashSuccess: t('crazy88.admin.task_saved', {}, 'Task saved') },
      })
    } catch (err) {
      setError(err.message || t('crazy88.admin.task_save_failed', {}, 'Failed to save task'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="page-shell">
      <div className="geo-header">
        <div>
          <p className="overview-kicker">{t('crazy88.admin.kicker', {}, 'Crazy 88')}</p>
          <h1>{isEdit ? t('crazy88.admin.task_edit', {}, 'Edit task') : t('crazy88.admin.task_add', {}, 'Add task')}</h1>
        </div>
        <div className="overview-actions">
          <Link className="btn btn-ghost" to={'/admin/crazy88/' + gameId + '/tasks'}>
            {t('crazy88.admin.back', {}, 'Back')}
          </Link>
        </div>
      </div>

      {error ? <div className="flash flash-error">{error}</div> : null}
      {loading ? <p>{t('gamesPage.loading', {}, 'Loading...')}</p> : null}

      {!loading ? (
        <section className="admin-block">
          <form onSubmit={saveTask}>
            <div className="form-row">
              <label htmlFor="crazy88-title">{t('crazy88.admin.table_title', {}, 'Title')}</label>
              <input id="crazy88-title" value={taskForm.title} onChange={(e) => setTaskForm((c) => ({ ...c, title: e.target.value }))} required />
            </div>
            <div className="form-row">
              <label htmlFor="crazy88-description">{t('crazy88.admin.description', {}, 'Description')}</label>
              <textarea id="crazy88-description" rows={3} value={taskForm.description} onChange={(e) => setTaskForm((c) => ({ ...c, description: e.target.value }))} />
            </div>
            <div className="form-row form-row-inline">
              <div>
                <label htmlFor="crazy88-points">{t('crazy88.admin.table_points', {}, 'Points')}</label>
                <input id="crazy88-points" type="number" min="1" value={taskForm.points} onChange={(e) => setTaskForm((c) => ({ ...c, points: e.target.value }))} required />
              </div>
            </div>

            {isGeoLocked ? (
              <>
                <div className="form-row">
                  <label>{t('crazy88.admin.form_location', {}, 'Location')}</label>
                  <p className="muted">{t('crazy88.admin.form_location_help', {}, 'Click on the map to place the task location.')}</p>
                  <GeoLocationPicker latitude={taskForm.latitude} longitude={taskForm.longitude} onChange={(lat, lon) => setTaskForm((c) => ({ ...c, latitude: lat, longitude: lon }))} ariaLabel={t('crazy88.admin.task_map_label', {}, 'Task location map')} />
                </div>
                <div className="form-row">
                  <label htmlFor="crazy88-radius">{t('crazy88.admin.form_radius', {}, 'Radius')}</label>
                  <input id="crazy88-radius" type="number" min="5" value={taskForm.radius_meters} onChange={(e) => setTaskForm((c) => ({ ...c, radius_meters: e.target.value }))} />
                </div>
              </>
            ) : null}

            <div className="overview-actions" style={{ marginTop: '1rem' }}>
              <button className="btn btn-primary" type="submit" disabled={saving}>{saving ? t('button.saving', {}, 'Saving\u2026') : t('button.save', {}, 'Save')}</button>
              <Link className="btn btn-ghost" to={'/admin/crazy88/' + gameId + '/tasks'}>{t('button.cancel', {}, 'Cancel')}</Link>
            </div>
          </form>
        </section>
      ) : null}
    </main>
  )
}
