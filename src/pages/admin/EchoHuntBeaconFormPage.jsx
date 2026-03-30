import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import GeoLocationPicker from '../../components/GeoLocationPicker'
import { gameApi, moduleApi } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { useI18n } from '../../lib/i18n'

function defaultForm() {
  return {
    id: '',
    title: '',
    hint: '',
    latitude: '51.05',
    longitude: '3.72',
    radius_meters: '25',
    signal_radius_meters: '0',
    points: '5',
    marker_color: '#7c3aed',
    is_active: true,
  }
}

export default function EchoHuntBeaconFormPage() {
  const { gameId, beaconId } = useParams()
  const navigate = useNavigate()
  const { auth } = useAuth()
  const { t } = useI18n()

  const [game, setGame] = useState(null)
  const [form, setForm] = useState(defaultForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const isEdit = Boolean(beaconId)

  useEffect(() => {
    let cancelled = false

    async function loadAll() {
      setLoading(true)
      setError('')
      try {
        const gameRecord = await gameApi.getGame(auth.token, gameId)
        if (cancelled) {
          return
        }
        setGame(gameRecord)

        if (!isEdit) {
          setForm(defaultForm())
          return
        }

        const beacon = await moduleApi.getEchoHuntBeacon(auth.token, gameId, beaconId)
        if (cancelled) {
          return
        }

        setForm({
          id: String(beacon?.id || ''),
          title: String(beacon?.title || ''),
          hint: String(beacon?.hint || ''),
          latitude: beacon?.latitude === null || beacon?.latitude === undefined ? '51.05' : String(beacon.latitude),
          longitude: beacon?.longitude === null || beacon?.longitude === undefined ? '3.72' : String(beacon.longitude),
          radius_meters: String(Number(beacon?.radius_meters || 25)),
          signal_radius_meters: String(Number(beacon?.signal_radius_meters || 0)),
          points: String(Number(beacon?.points || 5)),
          marker_color: String(beacon?.marker_color || '#7c3aed'),
          is_active: Boolean(beacon?.is_active),
        })
      } catch (err) {
        if (!cancelled) {
          setError(err.message || t('echo_hunt.admin.load_failed', {}, 'Failed to load beacon'))
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
  }, [auth.token, gameId, beaconId, isEdit, t])

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    const payload = {
      title: form.title.trim(),
      hint: form.hint.trim() || null,
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      radius_meters: Number(form.radius_meters || 25),
      signal_radius_meters: Number(form.signal_radius_meters || 0),
      points: Number(form.points || 5),
      marker_color: String(form.marker_color || '#7c3aed').trim().toLowerCase(),
      is_active: Boolean(form.is_active),
    }

    if (!Number.isFinite(payload.latitude) || !Number.isFinite(payload.longitude)) {
      setError(t('echo_hunt.admin.location_required', {}, 'Location is required'))
      return
    }

    setSaving(true)
    try {
      if (isEdit) {
        await moduleApi.updateEchoHuntBeacon(auth.token, gameId, beaconId, payload)
      } else {
        await moduleApi.createEchoHuntBeacon(auth.token, gameId, payload)
      }

      navigate(`/admin/echo-hunt/${gameId}/beacons`, {
        replace: true,
        state: {
          flashSuccess: t('echo_hunt.admin.beacon_saved', {}, 'Beacon has been saved'),
        },
      })
    } catch (err) {
      setError(err.message || t('echo_hunt.admin.save_failed', {}, 'Failed to save beacon'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="page-shell">
      <div className="geo-header">
        <div>
          <p className="overview-kicker">{t('echo_hunt.admin.kicker', {}, 'Echo Hunt')}</p>
          <h1>{isEdit ? t('echo_hunt.admin.edit_beacon', {}, 'Edit beacon') : t('echo_hunt.admin.create_beacon', {}, 'Create beacon')}</h1>
          <p className="overview-subtitle">{game?.name || '-'}</p>
        </div>
        <div className="overview-actions">
          <Link className="btn btn-ghost" to={`/admin/echo-hunt/${gameId}/beacons`}>
            {t('echo_hunt.admin.back', {}, 'Back')}
          </Link>
        </div>
      </div>

      {error ? <div className="flash flash-error">{error}</div> : null}
      {loading ? <p>{t('gamesPage.loading', {}, 'Loading…')}</p> : null}

      {!loading ? (
        <section className="admin-block">
          <form onSubmit={handleSubmit} className="form-grid">
            <div className="form-row">
              <label htmlFor="beacon-title">{t('echo_hunt.admin.table_title', {}, 'Title')}</label>
              <input
                id="beacon-title"
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                required
              />
            </div>
            <div className="form-row">
              <label htmlFor="beacon-hint">{t('echo_hunt.admin.table_hint', {}, 'Hint')}</label>
              <input
                id="beacon-hint"
                value={form.hint}
                onChange={(event) => setForm((current) => ({ ...current, hint: event.target.value }))}
              />
            </div>
            <div className="form-row">
              <label>{t('echo_hunt.admin.location', {}, 'Location')}</label>
              <GeoLocationPicker
                latitude={form.latitude}
                longitude={form.longitude}
                onChange={(nextLat, nextLon) => setForm((current) => ({ ...current, latitude: nextLat, longitude: nextLon }))}
                ariaLabel={t('echo_hunt.admin.map_label', {}, 'Beacon map')}
              />
              <p className="muted" style={{ marginTop: '0.5rem' }}>{t('common.map_select_hint', {}, 'Click on the map to set the location.')}</p>
            </div>
            <div className="form-row">
              <label htmlFor="beacon-radius">{t('echo_hunt.admin.table_radius', {}, 'Radius')}</label>
              <input
                id="beacon-radius"
                type="number"
                min="5"
                value={form.radius_meters}
                onChange={(event) => setForm((current) => ({ ...current, radius_meters: event.target.value }))}
                required
              />
            </div>
            <div className="form-row">
              <label htmlFor="beacon-signal-radius">{t('echo_hunt.admin.signal_radius', {}, 'Signal radius')}</label>
              <input
                id="beacon-signal-radius"
                type="number"
                min="0"
                value={form.signal_radius_meters}
                onChange={(event) => setForm((current) => ({ ...current, signal_radius_meters: event.target.value }))}
              />
            </div>
            <div className="form-row">
              <label htmlFor="beacon-points">{t('echo_hunt.admin.table_points', {}, 'Points')}</label>
              <input
                id="beacon-points"
                type="number"
                min="1"
                value={form.points}
                onChange={(event) => setForm((current) => ({ ...current, points: event.target.value }))}
                required
              />
            </div>
            <div className="form-row">
              <label htmlFor="beacon-color">{t('common.color', {}, 'Color')}</label>
              <input
                id="beacon-color"
                type="color"
                value={form.marker_color}
                onChange={(event) => setForm((current) => ({ ...current, marker_color: event.target.value }))}
                required
              />
            </div>
            <label className="blindhike-toggle-row" htmlFor="beacon-active">
              <span className="font-medium">{t('echo_hunt.admin.active', {}, 'Active')}</span>
              <button
                id="beacon-active"
                type="button"
                role="switch"
                aria-checked={form.is_active}
                className={`blindhike-toggle ${form.is_active ? 'is-on' : ''}`}
                onClick={() => setForm((current) => ({ ...current, is_active: !current.is_active }))}
              >
                <span className="blindhike-toggle-knob" />
              </button>
            </label>
            <div className="overview-actions" style={{ marginTop: '1rem' }}>
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? t('button.saving', {}, 'Saving…') : t('button.save', {}, 'Save')}
              </button>
              <Link className="btn btn-ghost" to={`/admin/echo-hunt/${gameId}/beacons`}>
                {t('button.cancel', {}, 'Cancel')}
              </Link>
            </div>
          </form>
        </section>
      ) : null}
    </main>
  )
}
