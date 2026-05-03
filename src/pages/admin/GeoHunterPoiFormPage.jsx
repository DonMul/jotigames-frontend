import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'

import GeoLocationPicker from '../../components/GeoLocationPicker'
import { gameApi, moduleApi } from '../../lib/api'
import { useAuth } from '../../lib/auth'
import { useI18n } from '../../lib/i18n'

function emptyChoice() {
  return { id: String(Math.random()).slice(2), label: '', correct: false }
}

function defaultForm() {
  return {
    id: '',
    title: '',
    type: 'text',
    points: '1',
    latitude: '',
    longitude: '',
    radius_meters: '20',
    content: '',
    question: '',
    expected_answers: '',
    choices: [emptyChoice()],
  }
}

export default function GeoHunterPoiFormPage() {
  const { gameId, poiId } = useParams()
  const navigate = useNavigate()
  const { auth } = useAuth()
  const { t } = useI18n()

  const [game, setGame] = useState(null)
  const [form, setForm] = useState(defaultForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const isEdit = Boolean(poiId)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError('')
      try {
        const [gameRecord, poisPayload] = await Promise.all([
          gameApi.getGame(auth.token, gameId),
          moduleApi.getGeoHunterPois(auth.token, gameId),
        ])
        if (cancelled) return
        setGame(gameRecord)

        if (isEdit) {
          const pois = Array.isArray(poisPayload?.pois) ? poisPayload.pois : []
          const poi = pois.find((p) => String(p.id) === String(poiId))
          if (!poi) {
            throw new Error(t('geohunter.admin.poi_not_found', {}))
          }
          setForm({
            id: String(poi.id || ''),
            title: String(poi.title || ''),
            type: String(poi.type || 'text'),
            points: String(Number(poi.points || 0)),
            latitude: poi.latitude === null || poi.latitude === undefined ? '' : String(poi.latitude),
            longitude: poi.longitude === null || poi.longitude === undefined ? '' : String(poi.longitude),
            radius_meters: String(Number(poi.radius_meters || 20)),
            content: String(poi.content || ''),
            question: String(poi.question || ''),
            expected_answers: Array.isArray(poi.expected_answers) ? poi.expected_answers.join('\n') : '',
            choices: Array.isArray(poi.choices) && poi.choices.length > 0
              ? poi.choices.map((choice) => ({
                id: String(choice?.id || String(Math.random()).slice(2)),
                label: String(choice?.label || ''),
                correct: Boolean(choice?.correct),
              }))
              : [emptyChoice()],
          })
        }
      } catch (err) {
        if (!cancelled) setError(err.message || t('error.loadFailed', {}))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [auth.token, gameId, poiId, isEdit, t])

  function updateChoice(index, next) {
    setForm((current) => ({
      ...current,
      choices: current.choices.map((choice, choiceIndex) => (choiceIndex === index ? { ...choice, ...next } : choice)),
    }))
  }

  function addChoice() {
    setForm((current) => ({
      ...current,
      choices: [...current.choices, emptyChoice()],
    }))
  }

  function removeChoice(index) {
    setForm((current) => {
      const nextChoices = current.choices.filter((_, choiceIndex) => choiceIndex !== index)
      return {
        ...current,
        choices: nextChoices.length > 0 ? nextChoices : [emptyChoice()],
      }
    })
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    const payload = {
      title: form.title.trim(),
      type: form.type,
      points: Number(form.points || 0),
      latitude: Number(form.latitude),
      longitude: Number(form.longitude),
      radius_meters: Number(form.radius_meters || 20),
      content: form.content.trim(),
      question: form.question.trim(),
      expected_answers: form.expected_answers
        .split(/\r?\n/)
        .map((value) => value.trim())
        .filter(Boolean),
      choices: form.choices
        .map((choice) => ({ label: String(choice.label || '').trim(), correct: Boolean(choice.correct) }))
        .filter((choice) => choice.label.length > 0),
    }

    if (!Number.isFinite(payload.latitude) || !Number.isFinite(payload.longitude)) {
      setError(t('validation.latLonRequired', {}))
      return
    }

    if (!Number.isFinite(payload.points) || payload.points < 0) {
      setError(t('geohunter.admin.points_required', {}))
      return
    }

    setSaving(true)
    try {
      if (isEdit) {
        await moduleApi.updateGeoHunterPoi(auth.token, gameId, poiId, payload)
      } else {
        await moduleApi.createGeoHunterPoi(auth.token, gameId, payload)
      }
      navigate(`/admin/geohunter/${gameId}/pois`, {
        state: { flashSuccess: t('status.saved', {}) },
      })
    } catch (err) {
      setError(
        err.message
          || t(
            isEdit ? 'error.saveFailed' : 'error.createFailed',
            {}),
      )
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="page-shell">
      <div className="geo-header">
        <div>
          <p className="overview-kicker">{t('gameCatalog.geohunter.name', {})} - {game?.name}</p>
          <h1>{isEdit ? t('geohunter.admin.poi_edit_heading', { title: form.title }) : t('geohunter.admin.poi_new_heading', { game: game?.name || '' })}</h1>
        </div>
        <div className="overview-actions">
          <Link className="btn btn-ghost" to={`/admin/geohunter/${gameId}/pois`}>
            {t('common.back', {})}
          </Link>
        </div>
      </div>

      {error ? <div className="flash flash-error">{error}</div> : null}
      {loading ? <p>{t('gamesPage.loading', {})}</p> : null}

      {!loading ? (
        <section className="admin-block">
          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <label htmlFor="poi-title">{t('object.poi.title', {})}</label>
              <input
                id="poi-title"
                value={form.title}
                onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))}
                required
              />
            </div>

            <div className="form-row">
              <label htmlFor="poi-type">{t('object.poi.type', {})}</label>
              <select
                id="poi-type"
                value={form.type}
                onChange={(event) => setForm((current) => ({ ...current, type: event.target.value }))}
                required
              >
                <option value="text">{t('geohunter.poi.type.text', {})}</option>
                <option value="multiple_choice">{t('geohunter.poi.type.multiple_choice', {})}</option>
                <option value="open_answer">{t('geohunter.poi.type.open_answer', {})}</option>
              </select>
            </div>

            <div className="form-row">
              <label htmlFor="poi-points">{t('object.poi.points', {})}</label>
              <input
                id="poi-points"
                type="number"
                min="0"
                value={form.points}
                onChange={(event) => setForm((current) => ({ ...current, points: event.target.value }))}
                required
              />
            </div>

            <div className="form-row">
              <label>{t('table.location', {})}</label>
              <p className="muted">{t('geohunter.admin.poi_map_help', {})}</p>
              <GeoLocationPicker
                latitude={form.latitude}
                longitude={form.longitude}
                onChange={(nextLat, nextLon) => setForm((current) => ({ ...current, latitude: nextLat, longitude: nextLon }))}
                ariaLabel={t('table.location', {})}
              />
            </div>

            <div className="form-row">
              <label htmlFor="poi-radius">{t('object.poi.radius', {})}</label>
              <input
                id="poi-radius"
                type="number"
                min="1"
                value={form.radius_meters}
                onChange={(event) => setForm((current) => ({ ...current, radius_meters: event.target.value }))}
                required
              />
            </div>

            {form.type === 'text' ? (
              <div className="form-row">
                <label htmlFor="poi-content">{t('object.poi.content', {})}</label>
                <textarea
                  id="poi-content"
                  rows={4}
                  value={form.content}
                  onChange={(event) => setForm((current) => ({ ...current, content: event.target.value }))}
                />
              </div>
            ) : null}

            {form.type !== 'text' ? (
              <div className="form-row">
                <label htmlFor="poi-question">{t('object.poi.question', {})}</label>
                <textarea
                  id="poi-question"
                  rows={3}
                  value={form.question}
                  onChange={(event) => setForm((current) => ({ ...current, question: event.target.value }))}
                />
              </div>
            ) : null}

            {form.type === 'open_answer' ? (
              <div className="form-row">
                <label htmlFor="poi-expected">{t('object.poi.answer', {})}</label>
                <textarea
                  id="poi-expected"
                  rows={3}
                  value={form.expected_answers}
                  onChange={(event) => setForm((current) => ({ ...current, expected_answers: event.target.value }))}
                />
              </div>
            ) : null}

            {form.type === 'multiple_choice' ? (
              <div className="form-row">
                <label>{t('object.poi.choices', {})}</label>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>{t('object.poi.answer', {})}</th>
                      <th>{t('geohunter.admin.poi_choice_correct', {})}</th>
                      <th>{t('button.label.delete', {})}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {form.choices.map((choice, index) => (
                      <tr key={choice.id}>
                        <td>
                          <input
                            type="text"
                            value={choice.label}
                            placeholder={t('object.poi.answer', {})}
                            onChange={(event) => updateChoice(index, { label: event.target.value })}
                            required
                          />
                        </td>
                        <td>
                          <label className="game-type-switch" htmlFor={`geo-choice-correct-${choice.id}`}>
                            <input
                              id={`geo-choice-correct-${choice.id}`}
                              type="checkbox"
                              checked={choice.correct}
                              onChange={(event) => updateChoice(index, { correct: event.target.checked })}
                            />
                            <span className="game-type-switch-track" aria-hidden="true" />
                          </label>
                        </td>
                        <td>
                          <button className="btn btn-remove btn-small" type="button" onClick={() => removeChoice(index)}>
                            {t('button.label.delete', {})}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <button className="btn btn-add btn-small" type="button" onClick={addChoice}>
                  {t('geohunter.admin.poi_choice_add', {})}
                </button>
              </div>
            ) : null}

            <div className="overview-actions" style={{ marginTop: '1rem' }}>
              <button className="btn btn-primary" type="submit" disabled={saving}>
                {saving ? t('button.state.saving', {}) : t('button.label.save', {})}
              </button>
              <Link className="btn btn-ghost" to={`/admin/geohunter/${gameId}/pois`}>
                {t('button.label.cancel', {})}
              </Link>
            </div>
          </form>
        </section>
      ) : null}
    </main>
  )
}
